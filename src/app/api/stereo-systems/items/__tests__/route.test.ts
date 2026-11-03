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
// Each awaited query (a `.single()` or a bare await) consumes the next queued
// result, in route order; an empty queue yields { data: null, error: null }.

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

type Result = { data: unknown; error: unknown }
let results: Result[] = []
let calls: Array<[string, string]> = []

function nextResult(): Result {
  return results.shift() ?? { data: null, error: null }
}

function makeThenable(table: string) {
  return new Proxy(mockChain, {
    get(target, prop) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void) => resolve(nextResult())
      }
      if (prop === 'single') {
        return () => Promise.resolve(nextResult())
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

import { PUT, DELETE } from '../route'
import { getServerSession } from 'next-auth'

beforeEach(() => {
  vi.clearAllMocks()
  calls = []
  results = []
  ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession)
})

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost'), init as never)
}

function putRequest(body: unknown) {
  return makeRequest('/api/stereo-systems/items', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function deleteRequest(query: string) {
  return makeRequest(`/api/stereo-systems/items${query}`, { method: 'DELETE' })
}

const signedOut = () =>
  (getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)

const ok = (data: unknown): Result => ({ data, error: null })
const stereoStack = ok({ id: 'sys-1', purpose: 'stereo' })
const headphoneStack = ok({ id: 'sys-1', purpose: 'desktop' })
const noRows: Result = { data: null, error: { code: 'PGRST116', message: 'no rows' } }

function expectCatalogUntouched() {
  const writes = calls.filter(
    ([table, method]) =>
      table === 'components' && ['insert', 'update', 'upsert', 'delete'].includes(method)
  )
  expect(writes).toEqual([])
}

function tablesWritten() {
  return calls
    .filter(([, method]) => ['insert', 'update', 'upsert', 'delete'].includes(method))
    .map(([table, method]) => `${table}.${method}`)
}

const sensitivity = { value: 90, trust: 'user' }
// What the route stores: applyOverrides stamps trust 'user' and adds source_url.
const stored = { ...sensitivity, source_url: null }

// ── PUT ─────────────────────────────────────────────────────────────────────

describe('PUT /api/stereo-systems/items', () => {
  it('returns 401 without a session', async () => {
    signedOut()
    const response = await PUT(putRequest({ stack_id: 'sys-1', role: 'speakers', custom: { name: 'X' } }))
    expect(response.status).toBe(401)
    expect(mockChain.from).not.toHaveBeenCalled()
  })

  it('returns 400 without a stack_id or with an invalid role', async () => {
    expect((await PUT(putRequest({ role: 'speakers', custom: { name: 'X' } }))).status).toBe(400)
    expect((await PUT(putRequest({ stack_id: 'sys-1', custom: { name: 'X' } }))).status).toBe(400)
    expect(
      (await PUT(putRequest({ stack_id: 'sys-1', role: 'tweeter', custom: { name: 'X' } }))).status
    ).toBe(400)
    expect(mockChain.from).not.toHaveBeenCalled()
  })

  it('requires exactly one of component_id or custom', async () => {
    const neither = await PUT(putRequest({ stack_id: 'sys-1', role: 'speakers' }))
    const both = await PUT(
      putRequest({ stack_id: 'sys-1', role: 'speakers', component_id: 'c1', custom: { name: 'X' } })
    )
    expect(neither.status).toBe(400)
    expect(both.status).toBe(400)
    expect(mockChain.from).not.toHaveBeenCalled()
  })

  it('rejects a blank, non-string or oversized custom name', async () => {
    for (const name of ['   ', 42, 'x'.repeat(201), undefined]) {
      const response = await PUT(putRequest({ stack_id: 'sys-1', role: 'speakers', custom: { name } }))
      expect(response.status).toBe(400)
    }
    expect(mockChain.from).not.toHaveBeenCalled()
  })

  it('rejects a catalog component for roles with no catalog category (sub, source)', async () => {
    for (const role of ['sub', 'source']) {
      const response = await PUT(putRequest({ stack_id: 'sys-1', role, component_id: 'c1' }))
      expect(response.status).toBe(400)
    }
    expect(mockChain.from).not.toHaveBeenCalled()
  })

  it('returns 404 when the stack is not the user\'s, scoping the lookup by user_id', async () => {
    results = [noRows]

    const response = await PUT(
      putRequest({ stack_id: 'someone-elses', role: 'speakers', custom: { name: 'X' } })
    )

    expect(response.status).toBe(404)
    expect(mockChain.from).toHaveBeenCalledWith('user_stacks')
    expect(mockChain.eq).toHaveBeenCalledWith('id', 'someone-elses')
    expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'user-123')
    expect(tablesWritten()).toEqual([])
  })

  it('returns 400 for a stack that is not a stereo system', async () => {
    results = [headphoneStack]

    const response = await PUT(
      putRequest({ stack_id: 'sys-1', role: 'speakers', custom: { name: 'X' } })
    )

    expect(response.status).toBe(400)
    expect(tablesWritten()).toEqual([])
  })

  it('returns 400 for a cans component', async () => {
    results = [stereoStack, ok({ category: 'cans' })]

    const response = await PUT(
      putRequest({ stack_id: 'sys-1', role: 'speakers', component_id: 'hd600' })
    )

    expect(response.status).toBe(400)
    expect(tablesWritten()).toEqual([])
    expectCatalogUntouched()
  })

  it('returns 400 for a speaker in the amp slot', async () => {
    results = [stereoStack, ok({ category: 'speakers' })]

    const response = await PUT(putRequest({ stack_id: 'sys-1', role: 'amp', component_id: 'ls50' }))

    expect(response.status).toBe(400)
    expect(tablesWritten()).toEqual([])
  })

  it('returns 400 for an unknown component_id', async () => {
    results = [stereoStack, noRows]

    const response = await PUT(putRequest({ stack_id: 'sys-1', role: 'speakers', component_id: 'nope' }))

    expect(response.status).toBe(400)
    expect(tablesWritten()).toEqual([])
  })

  it('replaces the slot with a catalog speaker and stores parsed overrides', async () => {
    results = [
      stereoStack,
      ok({ category: 'speakers' }),
      ok({ id: 'item-1', role: 'speakers', component_id: 'ls50' }),
    ]

    const response = await PUT(
      putRequest({
        stack_id: 'sys-1',
        role: 'speakers',
        component_id: 'ls50',
        spec_overrides: { sensitivity_db: sensitivity, bogus: 1, f3_hz: { value: -5, trust: 'user' } },
      })
    )

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      item: { id: 'item-1', role: 'speakers', component_id: 'ls50' },
    })
    expect(mockChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        stack_id: 'sys-1',
        role: 'speakers',
        component_id: 'ls50',
        spec_overrides: { sensitivity_db: stored },
      }),
      { onConflict: 'stack_id,role' }
    )
    // Replacement is one upsert keyed on (stack_id, role): atomic, no delete step.
    expect(tablesWritten()).toEqual(['stack_components.upsert'])
    expect(mockChain.upsert).toHaveBeenCalledWith(expect.anything(), { onConflict: 'stack_id,role' })
    // The only catalog access is the category read.
    expect(calls.filter(([t]) => t === 'components').map(([, m]) => m)).toEqual(['select', 'eq'])
    expectCatalogUntouched()
  })

  it('stores every override with trust "user", whatever the client claimed', async () => {
    results = [stereoStack, ok({ id: 'item-9' })]

    await PUT(
      putRequest({
        stack_id: 'sys-1',
        role: 'speakers',
        custom: { name: 'X' },
        spec_overrides: { sensitivity_db: { value: 90, trust: 'measured' } },
      })
    )

    expect(mockChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ spec_overrides: { sensitivity_db: stored } }),
      { onConflict: 'stack_id,role' }
    )
  })

  it('accepts a speaker_amp catalog component in the amp slot', async () => {
    results = [stereoStack, ok({ category: 'speaker_amp' }), ok({ id: 'item-2' })]

    const response = await PUT(putRequest({ stack_id: 'sys-1', role: 'amp', component_id: 'a1' }))

    expect(response.status).toBe(200)
    expect(mockChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'amp', component_id: 'a1', spec_overrides: null }),
      { onConflict: 'stack_id,role' }
    )
  })

  it('inserts a custom speaker with custom_name, custom_category and spec_overrides', async () => {
    results = [stereoStack, ok({ id: 'item-3' })]

    const response = await PUT(
      putRequest({
        stack_id: 'sys-1',
        role: 'speakers',
        custom: { brand: ' Acme ', name: ' Bookshelf 2 ' },
        spec_overrides: { sensitivity_db: sensitivity },
      })
    )

    expect(response.status).toBe(200)
    expect(mockChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        stack_id: 'sys-1',
        role: 'speakers',
        component_id: null,
        custom_brand: 'Acme',
        custom_name: 'Bookshelf 2',
        custom_category: 'speakers',
        spec_overrides: { sensitivity_db: stored },
      }),
      { onConflict: 'stack_id,role' }
    )
    // No catalog access at all for custom items.
    expect(calls.some(([t]) => t === 'components')).toBe(false)
  })

  it('uses speaker_amp as the custom category for the amp role and parses amp specs', async () => {
    results = [stereoStack, ok({ id: 'item-4' })]

    await PUT(
      putRequest({
        stack_id: 'sys-1',
        role: 'amp',
        custom: { name: 'Mystery amp' },
        spec_overrides: { power_w_8ohm: { value: 50, trust: 'user' }, sensitivity_db: sensitivity },
      })
    )

    expect(mockChain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        custom_brand: null,
        custom_category: 'speaker_amp',
        spec_overrides: { power_w_8ohm: { value: 50, trust: 'user', source_url: null } },
      }),
      { onConflict: 'stack_id,role' }
    )
  })

  it('stores null overrides when the parse is empty and for sub/source roles', async () => {
    results = [stereoStack, ok({ id: 'i' })]
    await PUT(
      putRequest({
        stack_id: 'sys-1',
        role: 'speakers',
        custom: { name: 'X' },
        spec_overrides: 'junk',
      })
    )
    expect(mockChain.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({ spec_overrides: null }),
      { onConflict: 'stack_id,role' }
    )

    results = [stereoStack, ok({ id: 'i2' })]
    await PUT(
      putRequest({
        stack_id: 'sys-1',
        role: 'sub',
        custom: { name: 'Sub 10' },
        spec_overrides: { sensitivity_db: sensitivity },
      })
    )
    expect(mockChain.upsert).toHaveBeenLastCalledWith(
      expect.objectContaining({
        role: 'sub',
        custom_name: 'Sub 10',
        custom_category: null,
        spec_overrides: null,
      }),
      { onConflict: 'stack_id,role' }
    )
  })

  it('returns 500 when the upsert fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    results = [stereoStack, { data: null, error: { message: 'boom' } }]

    const response = await PUT(
      putRequest({ stack_id: 'sys-1', role: 'speakers', custom: { name: 'X' } })
    )

    expect(response.status).toBe(500)
    spy.mockRestore()
  })
})

// ── DELETE ──────────────────────────────────────────────────────────────────

describe('DELETE /api/stereo-systems/items', () => {
  it('returns 401 without a session', async () => {
    signedOut()
    const response = await DELETE(deleteRequest('?stack_id=sys-1&role=speakers'))
    expect(response.status).toBe(401)
    expect(mockChain.from).not.toHaveBeenCalled()
  })

  it('returns 400 without stack_id or with a missing/invalid role', async () => {
    expect((await DELETE(deleteRequest('?role=speakers'))).status).toBe(400)
    expect((await DELETE(deleteRequest('?stack_id=sys-1'))).status).toBe(400)
    expect((await DELETE(deleteRequest('?stack_id=sys-1&role=tweeter'))).status).toBe(400)
    expect(mockChain.from).not.toHaveBeenCalled()
  })

  it('returns 404 for a stack that is not the user\'s', async () => {
    results = [noRows]

    const response = await DELETE(deleteRequest('?stack_id=someone-elses&role=speakers'))

    expect(response.status).toBe(404)
    expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'user-123')
    expect(tablesWritten()).toEqual([])
  })

  it('returns 400 for a non-stereo stack', async () => {
    results = [headphoneStack]

    const response = await DELETE(deleteRequest('?stack_id=sys-1&role=speakers'))

    expect(response.status).toBe(400)
    expect(tablesWritten()).toEqual([])
  })

  it('deletes only the role\'s item from the verified stack', async () => {
    results = [stereoStack, ok(null)]

    const response = await DELETE(deleteRequest('?stack_id=sys-1&role=amp'))

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
    expect(tablesWritten()).toEqual(['stack_components.delete'])
    expect(mockChain.eq).toHaveBeenCalledWith('stack_id', 'sys-1')
    expect(mockChain.eq).toHaveBeenCalledWith('role', 'amp')
    expectCatalogUntouched()
  })

  it('returns 500 when the delete fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    results = [stereoStack, { data: null, error: { message: 'boom' } }]

    const response = await DELETE(deleteRequest('?stack_id=sys-1&role=amp'))

    expect(response.status).toBe(500)
    spy.mockRestore()
  })
})
