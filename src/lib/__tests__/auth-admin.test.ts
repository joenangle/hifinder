import { describe, it, expect, afterEach, vi } from 'vitest'
import { isAdminEmail } from '../auth'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('isAdminEmail', () => {
  it('matches the configured admin email', () => {
    vi.stubEnv('ADMIN_EMAIL', 'admin@example.com')

    expect(isAdminEmail('admin@example.com')).toBe(true)
    expect(isAdminEmail('someone@example.com')).toBe(false)
  })

  it('never grants admin when ADMIN_EMAIL is unset', () => {
    vi.stubEnv('ADMIN_EMAIL', '')

    expect(isAdminEmail(undefined)).toBe(false)
    expect(isAdminEmail('')).toBe(false)
    expect(isAdminEmail('admin@example.com')).toBe(false)
  })

  it('rejects a missing email', () => {
    vi.stubEnv('ADMIN_EMAIL', 'admin@example.com')

    expect(isAdminEmail(undefined)).toBe(false)
    expect(isAdminEmail(null)).toBe(false)
  })
})

describe('authOptions.callbacks.jwt admin flag', () => {
  const signIn = async (email: string, emailVerified: boolean | undefined) => {
    const { authOptions } = await import('../auth')
    const jwt = authOptions.callbacks!.jwt!
    return jwt({
      token: {},
      user: { id: '107760000000000000001', email },
      account: { provider: 'google', type: 'oauth', providerAccountId: 'x', access_token: 'should-not-be-kept' },
      profile: { email, email_verified: emailVerified } as never,
      trigger: 'signIn',
    } as never)
  }

  it('grants admin only for a verified admin email', async () => {
    vi.stubEnv('ADMIN_EMAIL', 'admin@example.com')
    expect((await signIn('admin@example.com', true)).isAdmin).toBe(true)
    expect((await signIn('admin@example.com', false)).isAdmin).toBe(false)
    expect((await signIn('admin@example.com', undefined)).isAdmin).toBe(false)
    expect((await signIn('other@example.com', true)).isAdmin).toBe(false)
  })

  it('does not store the Google access token in the JWT', async () => {
    vi.stubEnv('ADMIN_EMAIL', 'admin@example.com')
    const token = await signIn('admin@example.com', true)
    expect(JSON.stringify(token)).not.toContain('should-not-be-kept')
  })
})
