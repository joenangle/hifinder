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

import { GET, POST, DELETE } from '../route'
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

describe('GET /api/wishlist', () => {
  it('returns 401 when not authenticated', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const response = await GET(makeRequest('/api/wishlist'))

    expect(response.status).toBe(401)
  })

  it('returns wishlist items for authenticated user', async () => {
    const items = [
      { id: 'w1', component_id: 'c1', components: { id: 'c1', name: 'HD 600' } },
    ]
    mockResult = { data: items, error: null }

    const response = await GET(makeRequest('/api/wishlist'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual(items)
    expect(mockChain.from).toHaveBeenCalledWith('wishlists')
    expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'user-123')
  })

  it('returns 500 on database error', async () => {
    mockResult = { data: null, error: { message: 'DB error' } }

    const response = await GET(makeRequest('/api/wishlist'))

    expect(response.status).toBe(500)
  })
})

// ── POST tests ──────────────────────────────────────────────────────────────

describe('POST /api/wishlist', () => {
  it('returns 401 when not authenticated', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const response = await POST(
      makeRequest('/api/wishlist', {
        method: 'POST',
        body: JSON.stringify({ componentId: 'c1' }),
      })
    )

    expect(response.status).toBe(401)
  })

  it('returns 400 when componentId is missing', async () => {
    const response = await POST(
      makeRequest('/api/wishlist', {
        method: 'POST',
        body: JSON.stringify({}),
      })
    )

    expect(response.status).toBe(400)
  })

  it('adds component to wishlist', async () => {
    const item = { id: 'w1', component_id: 'c1', user_id: 'user-123' }
    mockResult = { data: item, error: null }

    const response = await POST(
      makeRequest('/api/wishlist', {
        method: 'POST',
        body: JSON.stringify({ componentId: 'c1' }),
      })
    )

    expect(response.status).toBe(201)
    expect(mockChain.insert).toHaveBeenCalledWith({
      user_id: 'user-123',
      component_id: 'c1',
    })
  })

  it('returns 500 on insert error', async () => {
    mockResult = { data: null, error: { message: 'Duplicate' } }

    const response = await POST(
      makeRequest('/api/wishlist', {
        method: 'POST',
        body: JSON.stringify({ componentId: 'c1' }),
      })
    )

    expect(response.status).toBe(500)
  })
})

// ── DELETE tests ─────────────────────────────────────────────────────────────

describe('DELETE /api/wishlist', () => {
  it('returns 401 when not authenticated', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const response = await DELETE(makeRequest('/api/wishlist?componentId=c1'))

    expect(response.status).toBe(401)
  })

  it('returns 400 when componentId is missing', async () => {
    const response = await DELETE(makeRequest('/api/wishlist'))

    expect(response.status).toBe(400)
  })

  it('removes component from wishlist', async () => {
    mockResult = { data: null, error: null }

    const response = await DELETE(makeRequest('/api/wishlist?componentId=c1'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual({ success: true })
    expect(mockChain.from).toHaveBeenCalledWith('wishlists')
    expect(mockChain.delete).toHaveBeenCalled()
    expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'user-123')
    expect(mockChain.eq).toHaveBeenCalledWith('component_id', 'c1')
  })

  it('returns 500 on delete error', async () => {
    mockResult = { data: null, error: { message: 'Delete failed' } }

    const response = await DELETE(makeRequest('/api/wishlist?componentId=c1'))

    expect(response.status).toBe(500)
  })
})
