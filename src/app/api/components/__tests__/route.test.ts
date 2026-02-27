import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Supabase mock ───────────────────────────────────────────────────────────

const mockChain = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  ilike: vi.fn().mockReturnThis(),
  contains: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
}

// Make the chain thenable (Supabase resolves via .then)
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

describe('GET /api/components', () => {
  it('returns components with no filters', async () => {
    const components = [{ id: '1', name: 'HD 600', brand: 'Sennheiser' }]
    mockResult = { data: components, error: null }

    const response = await GET(makeRequest('/api/components'))
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual(components)
    expect(mockChain.from).toHaveBeenCalledWith('components')
    expect(mockChain.select).toHaveBeenCalledWith('*')
  })

  it('filters by category', async () => {
    mockResult = { data: [], error: null }

    await GET(makeRequest('/api/components?category=cans'))

    expect(mockChain.eq).toHaveBeenCalledWith('category', 'cans')
  })

  it('filters by brand', async () => {
    mockResult = { data: [], error: null }

    await GET(makeRequest('/api/components?brand=Sennheiser'))

    expect(mockChain.eq).toHaveBeenCalledWith('brand', 'Sennheiser')
  })

  it('applies limit', async () => {
    mockResult = { data: [], error: null }

    await GET(makeRequest('/api/components?limit=5'))

    expect(mockChain.limit).toHaveBeenCalledWith(5)
  })

  it('returns unique brands when brands_only=true', async () => {
    mockResult = {
      data: [{ brand: 'Sennheiser' }, { brand: 'Sennheiser' }, { brand: 'HiFiMAN' }],
      error: null,
    }

    const response = await GET(makeRequest('/api/components?brands_only=true'))
    const body = await response.json()

    expect(body).toEqual(['Sennheiser', 'HiFiMAN'])
    expect(mockChain.select).toHaveBeenCalledWith('brand')
  })

  it('returns model names when models_only=true with brand', async () => {
    mockResult = {
      data: [{ name: 'HD 600' }, { name: 'HD 650' }],
      error: null,
    }

    const response = await GET(
      makeRequest('/api/components?models_only=true&brand=Sennheiser')
    )
    const body = await response.json()

    expect(body).toEqual(['HD 600', 'HD 650'])
    expect(mockChain.select).toHaveBeenCalledWith('name')
    expect(mockChain.eq).toHaveBeenCalledWith('brand', 'Sennheiser')
  })

  it('handles headphones_and_iems category', async () => {
    mockResult = { data: [], error: null }

    await GET(makeRequest('/api/components?brands_only=true&category=headphones_and_iems'))

    expect(mockChain.in).toHaveBeenCalledWith('category', ['headphones', 'iems'])
  })

  it('returns 500 on database error', async () => {
    mockResult = { data: null, error: { message: 'DB error' } }

    const response = await GET(makeRequest('/api/components?brands_only=true'))

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Database error')
  })

  it('returns empty array when no data', async () => {
    mockResult = { data: null, error: null }

    const response = await GET(makeRequest('/api/components'))
    const body = await response.json()

    expect(body).toEqual([])
  })
})
