import { describe, it, expect, afterEach, vi } from 'vitest'
import crypto from 'crypto'
import { generateUnsubscribeToken, verifyUnsubscribeToken } from '../alert-tokens'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('unsubscribe tokens', () => {
  it('round-trips an alert id', () => {
    vi.stubEnv('CRON_SECRET', 'test-secret')

    const token = generateUnsubscribeToken('alert-1')

    expect(verifyUnsubscribeToken(token)).toBe('alert-1')
  })

  it('rejects a token signed with a different secret', () => {
    vi.stubEnv('CRON_SECRET', 'secret-a')
    const token = generateUnsubscribeToken('alert-1')

    vi.stubEnv('CRON_SECRET', 'secret-b')

    expect(verifyUnsubscribeToken(token)).toBeNull()
  })

  it('refuses to issue tokens when CRON_SECRET is unset', () => {
    vi.stubEnv('CRON_SECRET', '')

    expect(() => generateUnsubscribeToken('alert-1')).toThrow(/CRON_SECRET/)
  })

  it('rejects an empty-key forgery when CRON_SECRET is unset', () => {
    vi.stubEnv('CRON_SECRET', '')
    const forgedSig = crypto.createHmac('sha256', '').update('alert-1').digest('hex')
    const forged = Buffer.from(`alert-1:${forgedSig}`).toString('base64url')

    expect(verifyUnsubscribeToken(forged)).toBeNull()
  })

  it('rejects malformed tokens', () => {
    vi.stubEnv('CRON_SECRET', 'test-secret')

    expect(verifyUnsubscribeToken('not-a-token')).toBeNull()
    expect(verifyUnsubscribeToken('')).toBeNull()
  })
})
