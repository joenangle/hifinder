import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Auth mock ───────────────────────────────────────────────────────────────

const mockSession = {
  user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
}

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(() => Promise.resolve(mockSession)),
}))

vi.mock('@/lib/auth', () => ({
  authOptions: {},
}))

// ── Supabase mock ───────────────────────────────────────────────────────────
// Records every (table, method) pair so tests can assert catalog isolation.

const mockChain = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn(),
}

let mockResult: { data: unknown; error: unknown } = { data: [], error: null }
let calls: Array<[string, string]> = []

function makeThenable(table: string) {
  return new Proxy(mockChain, {
    get(target, prop) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void) => resolve(mockResult)
      }
      if (prop === 'single') {
        return () => Promise.resolve(mockResult)
      }
      const val = target[prop as keyof typeof target]
      if (typeof val === 'function') {
        return (...args: unknown[]) => {
          calls.push([table, String(prop)])
          val(...args)
          return makeThenable(table)
        }
      }
      return val
    },
  })
}

vi.mock('@/lib/supabase-server', () => ({
  supabaseServer: new Proxy(
    {},
    {
      get(_, prop) {
        if (prop === 'from') {
          return (table: string) => {
            mockChain.from(table)
            return makeThenable(table)
          }
        }
        return undefined
      },
    }
  ),
}))

import { GET, POST, PATCH, DELETE } from '../route'
import { getServerSession } from 'next-auth'

beforeEach(() => {
  vi.clearAllMocks()
  calls = []
  mockResult = { data: null, error: null }
  ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession)
})

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost'), init as never)
}

function jsonRequest(method: string, body: unknown) {
  return makeRequest('/api/stereo-systems', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const signedOut = () =>
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)

function expectCatalogUntouched() {
  const writes = calls.filter(
    ([table, method]) =>
      table === 'components' && ['insert', 'update', 'upsert', 'delete'].includes(method)
  )
  expect(writes).toEqual([])
}

// ── GET ─────────────────────────────────────────────────────────────────────

describe('GET /api/stereo-systems', () => {
  it('returns 401 without a session', async () => {
    signedOut()
    const response = await GET()
    expect(response.status).toBe(401)
    expect(mockChain.from).not.toHaveBeenCalled()
  })

  it('lists only the session user\'s stereo stacks', async () => {
    mockResult = { data: [{ id: 's1', stack_components: [] }], error: null }

    const response = await GET()

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ systems: [{ id: 's1', stack_components: [] }] })
    expect(mockChain.from).toHaveBeenCalledWith('user_stacks')
    expect(mockChain.eq).toHaveBeenCalledWith('purpose', 'stereo')
    expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'user-123')
    expect(mockChain.select).toHaveBeenCalledWith(
      expect.stringContaining('components!stack_components_component_id_fkey')
    )
    expectCatalogUntouched()
  })

  it('returns 500 on a database error', async () => {
    mockResult = { data: null, error: { message: 'boom' } }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const response = await GET()
    expect(response.status).toBe(500)
    spy.mockRestore()
  })
})

// ── POST ────────────────────────────────────────────────────────────────────

describe('POST /api/stereo-systems', () => {
  it('returns 401 without a session', async () => {
    signedOut()
    const response = await POST(jsonRequest('POST', { name: 'Living room' }))
    expect(response.status).toBe(401)
    expect(mockChain.insert).not.toHaveBeenCalled()
  })

  it('returns 400 for a missing, blank, non-string or oversized name', async () => {
    expect((await POST(jsonRequest('POST', {}))).status).toBe(400)
    expect((await POST(jsonRequest('POST', { name: '   ' }))).status).toBe(400)
    expect((await POST(jsonRequest('POST', { name: 42 }))).status).toBe(400)
    expect((await POST(jsonRequest('POST', { name: 'x'.repeat(201) }))).status).toBe(400)
    expect(mockChain.insert).not.toHaveBeenCalled()
  })

  it('forces purpose stereo and stores a parsed profile', async () => {
    mockResult = { data: { id: 's1' }, error: null }

    const response = await POST(
      jsonRequest('POST', {
        name: ' Living room ',
        purpose: 'desktop',
        system_profile: { room_preset: 'office', target_peak_db: 90 },
      })
    )

    expect(response.status).toBe(201)
    expect(await response.json()).toEqual({ system: { id: 's1' } })
    expect(mockChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-123',
        name: 'Living room',
        purpose: 'stereo',
        system_profile: expect.objectContaining({ room_preset: 'office', target_peak_db: 90 }),
      })
    )
  })

  it('turns a junk profile into defaults instead of a 500', async () => {
    mockResult = { data: { id: 's1' }, error: null }

    const response = await POST(
      jsonRequest('POST', { name: 'Den', system_profile: 'drop table' })
    )

    expect(response.status).toBe(201)
    expect(mockChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        system_profile: expect.objectContaining({ room_preset: null, target_peak_db: 85 }),
      })
    )
  })

  it('stores the default profile when none is sent', async () => {
    mockResult = { data: { id: 's1' }, error: null }
    await POST(jsonRequest('POST', { name: 'Den' }))
    expect(mockChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ system_profile: expect.objectContaining({ target_peak_db: 85 }) })
    )
  })

  it('never writes the components catalog', async () => {
    mockResult = { data: { id: 's1' }, error: null }
    await POST(jsonRequest('POST', { name: 'Den' }))
    expectCatalogUntouched()
  })
})

// ── PATCH ───────────────────────────────────────────────────────────────────

describe('PATCH /api/stereo-systems', () => {
  it('returns 401 without a session', async () => {
    signedOut()
    const response = await PATCH(jsonRequest('PATCH', { id: 's1', name: 'New' }))
    expect(response.status).toBe(401)
    expect(mockChain.update).not.toHaveBeenCalled()
  })

  it('returns 400 without an id, with a blank name, or with nothing to update', async () => {
    expect((await PATCH(jsonRequest('PATCH', { name: 'New' }))).status).toBe(400)
    expect((await PATCH(jsonRequest('PATCH', { id: 's1', name: '  ' }))).status).toBe(400)
    expect((await PATCH(jsonRequest('PATCH', { id: 's1' }))).status).toBe(400)
    expect(mockChain.update).not.toHaveBeenCalled()
  })

  it('scopes the update to the session user\'s stereo stacks', async () => {
    mockResult = { data: { id: 's1', name: 'New' }, error: null }

    const response = await PATCH(
      jsonRequest('PATCH', {
        id: 's1',
        name: ' New ',
        system_profile: { acoustics: 'damped', distance_m: 'far' },
      })
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ system: { id: 's1', name: 'New' } })
    expect(mockChain.update).toHaveBeenCalledWith({
      name: 'New',
      system_profile: expect.objectContaining({ acoustics: 'damped', distance_m: null }),
    })
    expect(mockChain.eq).toHaveBeenCalledWith('id', 's1')
    expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'user-123')
    expect(mockChain.eq).toHaveBeenCalledWith('purpose', 'stereo')
  })

  it('returns 404 for another user\'s stack', async () => {
    mockResult = { data: null, error: { code: 'PGRST116', message: 'no rows' } }
    const response = await PATCH(jsonRequest('PATCH', { id: 'someone-elses', name: 'New' }))
    expect(response.status).toBe(404)
  })

  it('never writes the components catalog', async () => {
    mockResult = { data: { id: 's1' }, error: null }
    await PATCH(jsonRequest('PATCH', { id: 's1', name: 'New' }))
    expectCatalogUntouched()
  })
})

// ── DELETE ──────────────────────────────────────────────────────────────────

describe('DELETE /api/stereo-systems', () => {
  it('returns 401 without a session', async () => {
    signedOut()
    const response = await DELETE(makeRequest('/api/stereo-systems?id=s1', { method: 'DELETE' }))
    expect(response.status).toBe(401)
    expect(mockChain.delete).not.toHaveBeenCalled()
  })

  it('returns 400 without an id', async () => {
    const response = await DELETE(makeRequest('/api/stereo-systems', { method: 'DELETE' }))
    expect(response.status).toBe(400)
  })

  it('scopes the delete to the session user\'s stereo stacks', async () => {
    mockResult = { data: [{ id: 's1' }], error: null }

    const response = await DELETE(makeRequest('/api/stereo-systems?id=s1', { method: 'DELETE' }))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(mockChain.from).toHaveBeenCalledWith('user_stacks')
    expect(mockChain.eq).toHaveBeenCalledWith('id', 's1')
    expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'user-123')
    expect(mockChain.eq).toHaveBeenCalledWith('purpose', 'stereo')
  })

  it('returns 404 for another user\'s stack', async () => {
    mockResult = { data: [], error: null }
    const response = await DELETE(
      makeRequest('/api/stereo-systems?id=someone-elses', { method: 'DELETE' })
    )
    expect(response.status).toBe(404)
  })

  it('never writes the components catalog', async () => {
    mockResult = { data: [{ id: 's1' }], error: null }
    await DELETE(makeRequest('/api/stereo-systems?id=s1', { method: 'DELETE' }))
    expectCatalogUntouched()
  })
})
