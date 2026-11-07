import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  requireAdmin: vi.fn(() => Promise.resolve({ user: { id: 'admin' } })),
}))

vi.mock('@/lib/cache-recommendations', () => ({
  invalidateRecommendationCache: vi.fn(),
}))

const updates: Array<Record<string, unknown>> = []

vi.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    from: () => {
      const query = {
        update: (row: Record<string, unknown>) => {
          updates.push(row)
          return query
        },
        eq: () => query,
        select: () => query,
        single: () =>
          Promise.resolve({ data: { brand: 'KEF', name: 'LS50' }, error: null }),
      }
      return query
    },
  },
}))

import { PUT } from '../route'

function put(body: Record<string, unknown>) {
  return PUT(
    new Request('http://localhost/api/admin/components?id=abc', {
      method: 'PUT',
      body: JSON.stringify(body),
    })
  )
}

const base = { brand: 'KEF', name: 'LS50', price_new: 1500 }

beforeEach(() => {
  updates.length = 0
})

describe('PUT /api/admin/components', () => {
  it.each(['speakers', 'speaker_amp'])('accepts the %s category', async (category) => {
    const res = await put({ ...base, category })

    expect(res.status).toBe(200)
    expect(updates[0].category).toBe(category)
  })

  it('still rejects a category the database would refuse', async () => {
    const res = await put({ ...base, category: 'headphones' })

    expect(res.status).toBe(400)
    expect(updates).toHaveLength(0)
  })

  it.each(['speakers', 'speaker_amp'])('saves %s without a price', async (category) => {
    const res = await put({ brand: 'KEF', name: 'LS50', category })

    expect(res.status).toBe(200)
  })

  it('still requires a price for headphone gear', async () => {
    const res = await put({ brand: 'HiFiMAN', name: 'Sundara', category: 'cans' })

    expect(res.status).toBe(400)
    expect(updates).toHaveLength(0)
  })

  it('keeps a letter-grade Crinacle rank', async () => {
    await put({ ...base, category: 'cans', crin_rank: 'A-' })

    expect(updates[0].crin_rank).toBe('A-')
  })
})
