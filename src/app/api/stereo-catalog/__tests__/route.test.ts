import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockChain = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
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

describe('GET /api/stereo-catalog', () => {
  it('role=speakers queries the speakers category', async () => {
    const res = await GET(makeRequest('/api/stereo-catalog?role=speakers'))
    expect(res.status).toBe(200)
    expect(mockChain.from).toHaveBeenCalledWith('components')
    expect(mockChain.eq).toHaveBeenCalledWith('category', 'speakers')
    expect(await res.json()).toEqual({ items: [] })
  })

  it('role=amp queries the speaker_amp category', async () => {
    await GET(makeRequest('/api/stereo-catalog?role=amp'))
    expect(mockChain.eq).toHaveBeenCalledWith('category', 'speaker_amp')
  })

  it('returns 400 for any other role', async () => {
    for (const url of ['/api/stereo-catalog?role=sub', '/api/stereo-catalog']) {
      const res = await GET(makeRequest(url))
      expect(res.status).toBe(400)
    }
    expect(mockChain.from).not.toHaveBeenCalled()
  })

  it('applies no text filter when q is absent or empty', async () => {
    await GET(makeRequest('/api/stereo-catalog?role=speakers'))
    await GET(makeRequest('/api/stereo-catalog?role=speakers&q='))
    expect(mockChain.or).not.toHaveBeenCalled()
  })

  it('applies one .or per word so words are ANDed', async () => {
    await GET(makeRequest('/api/stereo-catalog?role=speakers&q=kef%20ls50'))
    expect(mockChain.or).toHaveBeenCalledTimes(2)
    expect(mockChain.or).toHaveBeenCalledWith('brand.ilike.%kef%,name.ilike.%kef%')
    expect(mockChain.or).toHaveBeenCalledWith('brand.ilike.%ls50%,name.ilike.%ls50%')
  })

  it('never puts %, comma, ( or ) from q into an .or() argument', async () => {
    await GET(makeRequest('/api/stereo-catalog?role=speakers&q=' + encodeURIComponent('a%b,c(d)e')))
    expect(mockChain.or).toHaveBeenCalled()
    for (const [arg] of mockChain.or.mock.calls as [string][]) {
      // Only the clause's own comma and ilike wildcards may remain.
      expect(arg).toMatch(/^brand\.ilike\.%[a-z0-9]+%,name\.ilike\.%[a-z0-9]+%$/)
      expect(arg).not.toMatch(/[()]/)
    }
  })

  it('caps results at 20 and orders by brand then name', async () => {
    await GET(makeRequest('/api/stereo-catalog?role=speakers'))
    expect(mockChain.limit).toHaveBeenCalledWith(20)
    expect(mockChain.order.mock.calls).toEqual([['brand'], ['name']])
  })

  it('passes technical_specs through the speaker parser', async () => {
    mockResult = {
      data: [
        {
          id: 's1',
          brand: 'KEF',
          name: 'LS50',
          category: 'speakers',
          technical_specs: {
            sensitivity_db: { value: 85, trust: 'measured' },
            nominal_impedance_ohms: { value: 999, trust: 'claimed' },
            junk: true,
          },
        },
      ],
      error: null,
    }
    const body = await (await GET(makeRequest('/api/stereo-catalog?role=speakers'))).json()
    expect(body.items).toEqual([
      {
        id: 's1',
        brand: 'KEF',
        name: 'LS50',
        category: 'speakers',
        specs: { sensitivity_db: { value: 85, trust: 'measured' } },
      },
    ])
  })

  it('passes technical_specs through the amp parser', async () => {
    mockResult = {
      data: [
        {
          id: 'a1',
          brand: 'Topping',
          name: 'PA5',
          category: 'speaker_amp',
          technical_specs: { subtype: 'power', power_w_8ohm: { value: 100, trust: 'claimed' }, bogus: 1 },
        },
      ],
      error: null,
    }
    const body = await (await GET(makeRequest('/api/stereo-catalog?role=amp'))).json()
    expect(body.items[0].specs).toEqual({
      subtype: 'power',
      power_w_8ohm: { value: 100, trust: 'claimed' },
    })
  })

  it('returns 500 on a database error', async () => {
    mockResult = { data: null, error: { message: 'boom' } }
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const res = await GET(makeRequest('/api/stereo-catalog?role=speakers'))
    expect(res.status).toBe(500)
    spy.mockRestore()
  })
})
