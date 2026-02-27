import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Supabase mock ───────────────────────────────────────────────────────────

const mockChain = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  or: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
}

let mockResult: { data: unknown; error: unknown } = { data: [], error: null }

function makeThenable() {
  return new Proxy(mockChain, {
    get(target, prop) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void) => resolve(mockResult)
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

import { GET } from '../route'

beforeEach(() => {
  vi.clearAllMocks()
  mockResult = { data: [], error: null }
})

function makeRequest(url: string) {
  return new NextRequest(new URL(url, 'http://localhost'))
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/components/search', () => {
  it('returns empty array when query is missing', async () => {
    const response = await GET(makeRequest('/api/components/search'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual([])
  })

  it('returns empty array when query is too short', async () => {
    const response = await GET(makeRequest('/api/components/search?q=a'))
    const body = await response.json()

    expect(body).toEqual([])
  })

  it('searches with multi-word query', async () => {
    const results = [{ id: '1', name: 'HD 600', brand: 'Sennheiser' }]
    mockResult = { data: results, error: null }

    const response = await GET(makeRequest('/api/components/search?q=sennheiser+hd'))
    const body = await response.json()

    expect(body).toEqual(results)
    // Should call .or for each word
    expect(mockChain.or).toHaveBeenCalledTimes(2)
    expect(mockChain.or).toHaveBeenCalledWith(expect.stringContaining('sennheiser'))
    expect(mockChain.or).toHaveBeenCalledWith(expect.stringContaining('hd'))
  })

  it('applies default limit of 8', async () => {
    mockResult = { data: [], error: null }

    await GET(makeRequest('/api/components/search?q=test'))

    expect(mockChain.limit).toHaveBeenCalledWith(8)
  })

  it('respects custom limit', async () => {
    mockResult = { data: [], error: null }

    await GET(makeRequest('/api/components/search?q=test&limit=20'))

    expect(mockChain.limit).toHaveBeenCalledWith(20)
  })

  it('maps headphones category to cans+iems', async () => {
    mockResult = { data: [], error: null }

    await GET(makeRequest('/api/components/search?q=test&category=headphones'))

    expect(mockChain.in).toHaveBeenCalledWith('category', ['cans', 'iems'])
  })

  it('passes other categories directly', async () => {
    mockResult = { data: [], error: null }

    await GET(makeRequest('/api/components/search?q=test&category=dac'))

    expect(mockChain.eq).toHaveBeenCalledWith('category', 'dac')
  })

  it('sets Cache-Control header', async () => {
    mockResult = { data: [], error: null }

    const response = await GET(makeRequest('/api/components/search?q=test'))

    expect(response.headers.get('Cache-Control')).toContain('max-age=3600')
  })

  it('returns 500 on database error', async () => {
    mockResult = { data: null, error: { message: 'Search failed' } }

    const response = await GET(makeRequest('/api/components/search?q=test'))

    expect(response.status).toBe(500)
  })
})
