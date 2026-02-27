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
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
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

import { GET, POST, PUT, DELETE } from '../route'
import { getServerSession } from 'next-auth'

beforeEach(() => {
  vi.clearAllMocks()
  mockResult = { data: [], error: null }
  ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(mockSession)
})

function makeRequest(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, 'http://localhost'), init as never)
}

// ── GET tests ───────────────────────────────────────────────────────────────

describe('GET /api/gear', () => {
  it('returns 401 when not authenticated', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const response = await GET(makeRequest('/api/gear'))

    expect(response.status).toBe(401)
  })

  it('returns gear for authenticated user', async () => {
    const gear = [{ id: 'g1', component_id: 'c1' }]
    mockResult = { data: gear, error: null }

    const response = await GET(makeRequest('/api/gear'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual(gear)
    expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'user-123')
    expect(mockChain.eq).toHaveBeenCalledWith('is_active', true)
  })

  it('shows all gear when all=true', async () => {
    mockResult = { data: [], error: null }

    await GET(makeRequest('/api/gear?all=true'))

    // Should NOT filter by is_active
    const eqCalls = mockChain.eq.mock.calls
    expect(eqCalls.some((c: unknown[]) => c[0] === 'is_active')).toBe(false)
  })

  it('returns 500 on database error', async () => {
    mockResult = { data: null, error: { message: 'DB error' } }

    const response = await GET(makeRequest('/api/gear'))

    expect(response.status).toBe(500)
  })
})

// ── POST tests ──────────────────────────────────────────────────────────────

describe('POST /api/gear', () => {
  it('returns 401 when not authenticated', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const response = await POST(
      makeRequest('/api/gear', {
        method: 'POST',
        body: JSON.stringify({ component_id: 'c1' }),
      })
    )

    expect(response.status).toBe(401)
  })

  it('creates gear item with user_id forced', async () => {
    const newItem = { id: 'g1', component_id: 'c1', user_id: 'user-123' }
    mockResult = { data: newItem, error: null }

    const response = await POST(
      makeRequest('/api/gear', {
        method: 'POST',
        body: JSON.stringify({ component_id: 'c1' }),
      })
    )

    expect(response.status).toBe(201)
    expect(mockChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        component_id: 'c1',
        user_id: 'user-123',
        is_active: true,
        is_loaned: false,
      })
    )
  })
})

// ── PUT tests ───────────────────────────────────────────────────────────────

describe('PUT /api/gear', () => {
  it('returns 401 when not authenticated', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const response = await PUT(
      makeRequest('/api/gear?id=g1', {
        method: 'PUT',
        body: JSON.stringify({ notes: 'updated' }),
      })
    )

    expect(response.status).toBe(401)
  })

  it('returns 400 when no gear ID provided', async () => {
    const response = await PUT(
      makeRequest('/api/gear', {
        method: 'PUT',
        body: JSON.stringify({ notes: 'test' }),
      })
    )

    expect(response.status).toBe(400)
  })

  it('returns 404 when gear not found or unauthorized', async () => {
    // First call (ownership check) returns null
    mockResult = { data: null, error: { message: 'not found' } }

    const response = await PUT(
      makeRequest('/api/gear?id=g1', {
        method: 'PUT',
        body: JSON.stringify({ notes: 'test' }),
      })
    )

    expect(response.status).toBe(404)
  })
})

// ── DELETE tests ─────────────────────────────────────────────────────────────

describe('DELETE /api/gear', () => {
  it('returns 401 when not authenticated', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const response = await DELETE(makeRequest('/api/gear?id=g1'))

    expect(response.status).toBe(401)
  })

  it('returns 400 when no gear ID provided', async () => {
    const response = await DELETE(makeRequest('/api/gear'))

    expect(response.status).toBe(400)
  })

  it('deletes gear item successfully', async () => {
    mockResult = { data: null, error: null }

    const response = await DELETE(makeRequest('/api/gear?id=g1'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ success: true })
    expect(mockChain.delete).toHaveBeenCalled()
    expect(mockChain.eq).toHaveBeenCalledWith('id', 'g1')
    expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'user-123')
  })
})
