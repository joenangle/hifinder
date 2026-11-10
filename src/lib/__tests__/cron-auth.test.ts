import { describe, it, expect, afterEach } from 'vitest'
import { safeEqual } from '@/lib/safe-compare'
import { checkCronAuth } from '@/lib/cron-auth'

const req = (auth?: string) =>
  new Request('http://localhost/api/x', { headers: auth ? { authorization: auth } : {} })

describe('safeEqual', () => {
  it('matches identical strings', () => {
    expect(safeEqual('s3cret', 's3cret')).toBe(true)
  })
  it('rejects different strings of the same length', () => {
    expect(safeEqual('s3cret', 's3crex')).toBe(false)
  })
  it('rejects different lengths without throwing', () => {
    expect(safeEqual('short', 'much-longer-value')).toBe(false)
    expect(safeEqual('', 'x')).toBe(false)
  })
})

describe('checkCronAuth', () => {
  const original = process.env.CRON_SECRET
  afterEach(() => {
    if (original === undefined) delete process.env.CRON_SECRET
    else process.env.CRON_SECRET = original
  })

  it('returns 500 when CRON_SECRET is unset, even for "Bearer undefined"', () => {
    delete process.env.CRON_SECRET
    expect(checkCronAuth(req('Bearer undefined'))?.status).toBe(500)
  })

  it('returns 401 for a missing or wrong header', () => {
    process.env.CRON_SECRET = 'topsecret'
    expect(checkCronAuth(req())?.status).toBe(401)
    expect(checkCronAuth(req('Bearer nope'))?.status).toBe(401)
    expect(checkCronAuth(req('topsecret'))?.status).toBe(401)
  })

  it('returns null (allowed) for the right bearer token', () => {
    process.env.CRON_SECRET = 'topsecret'
    expect(checkCronAuth(req('Bearer topsecret'))).toBeNull()
  })
})
