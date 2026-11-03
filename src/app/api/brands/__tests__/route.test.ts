import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Supabase mock ───────────────────────────────────────────────────────────

const mockChain = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
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
import { HEADPHONE_SYSTEM_CATEGORIES } from '@/lib/component-categories'

beforeEach(() => {
  vi.clearAllMocks()
  mockResult = { data: [], error: null }
})

describe('GET /api/brands', () => {
  it('queries only headphone-system categories so stereo brands stay out', async () => {
    await GET()

    expect(mockChain.from).toHaveBeenCalledWith('components')
    expect(mockChain.select).toHaveBeenCalledWith('brand')
    expect(mockChain.in).toHaveBeenCalledWith('category', HEADPHONE_SYSTEM_CATEGORIES)
  })

  it('returns brands deduped and sorted case-insensitively as a JSON array of strings', async () => {
    mockResult = {
      data: [
        { brand: 'sennheiser' },
        { brand: 'Audeze' },
        { brand: 'Sennheiser' },
        { brand: 'Audeze' },
        { brand: 'Beyerdynamic' },
        { brand: null },
        { brand: '' },
      ],
      error: null,
    }

    const response = await GET()
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body).toEqual(['Audeze', 'Beyerdynamic', 'sennheiser', 'Sennheiser'])
  })

  it('returns 500 with the existing error shape when the query fails', async () => {
    mockResult = { data: null, error: { message: 'boom' } }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})

    const response = await GET()

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: 'Failed to fetch brands' })
    spy.mockRestore()
  })
})
