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
  range: vi.fn().mockReturnThis(),
}

const mockResult = { data: [], error: null, count: 0 }

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
})

function makeRequest(url: string) {
  return new NextRequest(new URL(url, 'http://localhost'))
}

// ── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/components/browse (stereo isolation)', () => {
  it('limits an unfiltered browse to the headphone-system categories', async () => {
    const response = await GET(makeRequest('/api/components/browse'))

    expect(response.status).toBe(200)
    expect(mockChain.in).toHaveBeenCalledWith('category', HEADPHONE_SYSTEM_CATEGORIES)
    expect(mockChain.eq).not.toHaveBeenCalled()
  })

  it.each(['speakers', 'speaker_amp'])('ignores the stereo category "%s"', async (category) => {
    const response = await GET(makeRequest(`/api/components/browse?category=${category}`))

    expect(response.status).toBe(200)
    // Falls back to the unfiltered headphone-system query instead of filtering to the stereo category.
    expect(mockChain.in).toHaveBeenCalledWith('category', HEADPHONE_SYSTEM_CATEGORIES)
    expect(mockChain.eq).not.toHaveBeenCalled()
  })

  it('still honors a headphone-era category', async () => {
    await GET(makeRequest('/api/components/browse?category=cans'))

    expect(mockChain.eq).toHaveBeenCalledWith('category', 'cans')
    expect(mockChain.in).not.toHaveBeenCalled()
  })
})
