import { describe, it, expect } from 'vitest'
import { resolveUserPreferences, DEFAULT_USER_PREFERENCES } from '../user-preferences'

describe('resolveUserPreferences', () => {
  it('defaults to email alerts enabled when no row exists', () => {
    expect(resolveUserPreferences(null)).toEqual(DEFAULT_USER_PREFERENCES)
    expect(resolveUserPreferences(undefined)).toEqual({ emailAlertsEnabled: true })
  })

  it('treats a null column as the enabled default', () => {
    expect(resolveUserPreferences({ email_alerts_enabled: null })).toEqual({ emailAlertsEnabled: true })
  })

  it('reflects an explicit opt-out', () => {
    expect(resolveUserPreferences({ email_alerts_enabled: false })).toEqual({ emailAlertsEnabled: false })
  })

  it('reflects an explicit opt-in', () => {
    expect(resolveUserPreferences({ email_alerts_enabled: true })).toEqual({ emailAlertsEnabled: true })
  })
})
