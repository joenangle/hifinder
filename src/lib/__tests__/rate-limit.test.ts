import { describe, it, expect, vi, beforeEach } from 'vitest'

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('../supabase-server', () => ({ supabaseServer: { rpc } }))

import { isWithinRateLimit, getClientIp, tooManyRequests } from '../rate-limit'

const rule = { name: 'subscribe:ip', windowSeconds: 3600, max: 10 }

beforeEach(() => vi.clearAllMocks())

describe('isWithinRateLimit', () => {
  it('records the hit under a namespaced key', async () => {
    rpc.mockResolvedValue({ data: true, error: null })

    expect(await isWithinRateLimit(rule, '203.0.113.7')).toBe(true)
    expect(rpc).toHaveBeenCalledWith('rate_limit_hit', {
      p_key: 'subscribe:ip:203.0.113.7',
      p_window_seconds: 3600,
      p_max: 10,
    })
  })

  it('reports when the limit is exceeded', async () => {
    rpc.mockResolvedValue({ data: false, error: null })

    expect(await isWithinRateLimit(rule, '203.0.113.7')).toBe(false)
  })

  it('fails open when the check itself errors', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    rpc.mockResolvedValue({ data: null, error: { message: 'function does not exist' } })

    expect(await isWithinRateLimit(rule, '203.0.113.7')).toBe(true)
    expect(log).toHaveBeenCalled()
  })
})

describe('getClientIp', () => {
  it('takes the first x-forwarded-for entry', () => {
    const req = new Request('http://x', { headers: { 'x-forwarded-for': '203.0.113.7, 10.0.0.1' } })
    expect(getClientIp(req)).toBe('203.0.113.7')
  })

  it('falls back to x-real-ip, then null', () => {
    expect(getClientIp(new Request('http://x', { headers: { 'x-real-ip': '198.51.100.2' } }))).toBe('198.51.100.2')
    expect(getClientIp(new Request('http://x'))).toBeNull()
  })
})

describe('tooManyRequests', () => {
  it('is a 429 with Retry-After', () => {
    const res = tooManyRequests(600)
    expect(res.status).toBe(429)
    expect(res.headers.get('Retry-After')).toBe('600')
  })
})
