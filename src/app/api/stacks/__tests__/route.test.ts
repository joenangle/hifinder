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

const mockChain = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn(),
}

let mockResult: { data: unknown; error: unknown } = { data: [], error: null }

function makeThenable() {
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
          val(...args)
          return makeThenable()
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
          return (...args: unknown[]) => {
            mockChain.from(...args)
            return makeThenable()
          }
        }
        return undefined
      },
    }
  ),
}))

import { POST, PATCH, DELETE } from '../route'
import { getServerSession } from 'next-auth'

beforeEach(() => {
  vi.clearAllMocks()
  mockResult = { data: null, error: null }
  ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession)
})

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost'), init as never)
}

function jsonRequest(method: string, body: unknown) {
  return makeRequest('/api/stacks', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

// ── POST ────────────────────────────────────────────────────────────────────

describe('POST /api/stacks', () => {
  it('persists a valid purpose', async () => {
    mockResult = { data: { id: 's1' }, error: null }

    const response = await POST(jsonRequest('POST', { name: 'Desk', purpose: 'desktop' }))

    expect(response.status).toBe(201)
    expect(mockChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: 'user-123', name: 'Desk', purpose: 'desktop' })
    )
  })

  it('rejects an unknown purpose', async () => {
    const response = await POST(jsonRequest('POST', { name: 'Desk', purpose: 'spaceship' }))

    expect(response.status).toBe(400)
    expect(mockChain.insert).not.toHaveBeenCalled()
  })
})

// ── PATCH ───────────────────────────────────────────────────────────────────

describe('PATCH /api/stacks', () => {
  it('returns 401 when not authenticated', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const response = await PATCH(jsonRequest('PATCH', { id: 's1', name: 'New' }))

    expect(response.status).toBe(401)
  })

  it('returns 400 without an id', async () => {
    const response = await PATCH(jsonRequest('PATCH', { name: 'New' }))

    expect(response.status).toBe(400)
  })

  it('returns 400 for an empty name', async () => {
    const response = await PATCH(jsonRequest('PATCH', { id: 's1', name: '   ' }))

    expect(response.status).toBe(400)
    expect(mockChain.update).not.toHaveBeenCalled()
  })

  it('scopes the update to the session user', async () => {
    mockResult = { data: { id: 's1', name: 'New' }, error: null }

    const response = await PATCH(
      jsonRequest('PATCH', { id: 's1', name: ' New ', description: '', purpose: 'portable' })
    )

    expect(response.status).toBe(200)
    expect(mockChain.update).toHaveBeenCalledWith({ name: 'New', description: null, purpose: 'portable' })
    expect(mockChain.eq).toHaveBeenCalledWith('id', 's1')
    expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'user-123')
  })

  it('returns 404 when the stack is not the user\'s', async () => {
    mockResult = { data: null, error: { code: 'PGRST116', message: 'no rows' } }

    const response = await PATCH(jsonRequest('PATCH', { id: 'someone-elses', name: 'New' }))

    expect(response.status).toBe(404)
  })
})

// ── DELETE ──────────────────────────────────────────────────────────────────

describe('DELETE /api/stacks', () => {
  it('returns 401 when not authenticated', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const response = await DELETE(makeRequest('/api/stacks?id=s1', { method: 'DELETE' }))

    expect(response.status).toBe(401)
  })

  it('returns 400 without an id', async () => {
    const response = await DELETE(makeRequest('/api/stacks', { method: 'DELETE' }))

    expect(response.status).toBe(400)
  })

  it('scopes the delete to the session user', async () => {
    mockResult = { data: [{ id: 's1' }], error: null }

    const response = await DELETE(makeRequest('/api/stacks?id=s1', { method: 'DELETE' }))

    expect(response.status).toBe(200)
    expect(mockChain.from).toHaveBeenCalledWith('user_stacks')
    expect(mockChain.eq).toHaveBeenCalledWith('id', 's1')
    expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'user-123')
  })

  it('returns 404 when nothing matched', async () => {
    mockResult = { data: [], error: null }

    const response = await DELETE(makeRequest('/api/stacks?id=someone-elses', { method: 'DELETE' }))

    expect(response.status).toBe(404)
  })
})
