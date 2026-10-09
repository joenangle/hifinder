import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { insert } = vi.hoisted(() => ({
  insert: vi.fn((row: Record<string, unknown>) => {
    void row
    return { select: () => ({ single: () => Promise.resolve({ data: { id: 'click-1' }, error: null }) }) }
  }),
}))

vi.mock('@/lib/supabase-server', () => ({
  supabaseServer: { from: () => ({ insert }) },
}))

import { POST } from '../route'

const COMPONENT_ID = '0081973e-226a-40aa-a485-1b8226fbed94'
const valid = {
  platform: 'ebay',
  component_id: COMPONENT_ID,
  tracking_id: `hf_used_listings_${COMPONENT_ID}_1791551829721`,
  source: 'used_listings',
  referrer_url: 'https://hifinder.app/marketplace',
}

function click(body: unknown, headers: Record<string, string> = {}) {
  return POST(
    new NextRequest('http://localhost/api/analytics/affiliate-click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    })
  )
}

beforeEach(() => vi.clearAllMocks())

describe('POST /api/analytics/affiliate-click', () => {
  it('records a valid click', async () => {
    const response = await click(valid, { 'user-agent': 'Mozilla/5.0', 'x-forwarded-for': '203.0.113.7, 10.0.0.1' })

    expect(response.status).toBe(200)
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ platform: 'ebay', source: 'used_listings', ip_address: '203.0.113.7' })
    )
  })

  it('truncates an oversized user agent instead of storing it whole', async () => {
    await click(valid, { 'user-agent': 'x'.repeat(5000) })

    const row = insert.mock.calls[0][0]
    expect((row.user_agent as string).length).toBeLessThanOrEqual(512)
  })

  it.each<[string, Record<string, unknown>]>([
    ['unknown platform', { ...valid, platform: 'craigslist' }],
    ['unknown source', { ...valid, source: 'x'.repeat(10) }],
    ['oversized tracking id', { ...valid, tracking_id: 'x'.repeat(500) }],
    ['missing tracking id', { ...valid, tracking_id: undefined }],
    ['malformed component id', { ...valid, component_id: 'not-a-uuid' }],
    ['oversized referrer', { ...valid, referrer_url: 'x'.repeat(5000) }],
  ])('rejects %s', async (_label, body) => {
    const response = await click(body)

    expect(response.status).toBe(400)
    expect(insert).not.toHaveBeenCalled()
  })

  it('does not echo internal error messages', async () => {
    const response = await POST(
      new NextRequest('http://localhost/api/analytics/affiliate-click', { method: 'POST', body: '{not json' })
    )
    const body = await response.json()

    // A fixed message, not the parser's (which quotes the input and position)
    expect(response.status).toBe(400)
    expect(body).toEqual({ error: 'Invalid JSON body' })
  })
})
