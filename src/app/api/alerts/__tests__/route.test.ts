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

import { GET, POST, PATCH, DELETE } from '../route'
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
  return makeRequest('/api/alerts', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('GET /api/alerts', () => {
  it('returns 401 when not authenticated', async () => {
    ;(getServerSession as ReturnType<typeof vi.fn>).mockResolvedValue(null)

    const response = await GET()

    expect(response.status).toBe(401)
  })

  it('reads only the session user\'s alerts', async () => {
    mockResult = { data: [{ id: 'a1' }], error: null }

    const response = await GET()

    expect(response.status).toBe(200)
    expect(mockChain.from).toHaveBeenCalledWith('price_alerts')
    expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'user-123')
  })
})

describe('POST /api/alerts', () => {
  it('ignores server-owned fields from the client', async () => {
    mockResult = { data: { id: 'a1' }, error: null }

    const response = await POST(
      jsonRequest('POST', {
        component_id: 'c1',
        target_price: 200,
        alert_type: 'below',
        user_id: 'attacker',
        trigger_count: 999,
      })
    )

    expect(response.status).toBe(201)
    expect(mockChain.insert).toHaveBeenCalledWith({
      component_id: 'c1',
      target_price: 200,
      alert_type: 'below',
      user_id: 'user-123',
      is_active: true,
      trigger_count: 0,
    })
  })

  it.each([
    [{ component_id: 'c1', target_price: -5 }, 'negative price'],
    [{ component_id: 'c1', target_price: '200' }, 'string price'],
    [{ component_id: 'c1', target_price: 200, alert_type: 'above' }, 'unknown alert_type'],
    [{ component_id: 'c1' }, 'missing price'],
    [{ target_price: 200 }, 'no component or custom search'],
  ])('rejects %o (%s)', async (body) => {
    const response = await POST(jsonRequest('POST', body))

    expect(response.status).toBe(400)
    expect(mockChain.insert).not.toHaveBeenCalled()
  })
})

describe('PATCH /api/alerts', () => {
  it('scopes the update to the session user', async () => {
    mockResult = { data: [{ id: 'a1' }], error: null }

    const response = await PATCH(jsonRequest('PATCH', { id: 'a1', is_active: false }))

    expect(response.status).toBe(200)
    expect(mockChain.update).toHaveBeenCalledWith({ is_active: false })
    expect(mockChain.eq).toHaveBeenCalledWith('id', 'a1')
    expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'user-123')
  })

  it('returns 404 when the alert is not the user\'s', async () => {
    mockResult = { data: [], error: null }

    const response = await PATCH(jsonRequest('PATCH', { id: 'someone-elses', is_active: false }))

    expect(response.status).toBe(404)
  })
})

describe('DELETE /api/alerts', () => {
  it('scopes the delete to the session user', async () => {
    mockResult = { data: [{ id: 'a1' }], error: null }

    const response = await DELETE(makeRequest('/api/alerts?id=a1', { method: 'DELETE' }))

    expect(response.status).toBe(200)
    expect(mockChain.eq).toHaveBeenCalledWith('user_id', 'user-123')
  })

  it('returns 400 without an id', async () => {
    const response = await DELETE(makeRequest('/api/alerts', { method: 'DELETE' }))

    expect(response.status).toBe(400)
  })
})
