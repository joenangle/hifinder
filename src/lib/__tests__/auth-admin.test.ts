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
