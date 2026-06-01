/**
 * User notification preferences — resolution with safe defaults.
 *
 * Stored in the user_preferences table (TEXT user_id, service-role access).
 * A missing row means "never customized" → all defaults (email alerts on).
 */

export interface UserPreferences {
  emailAlertsEnabled: boolean
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  emailAlertsEnabled: true,
}

export function resolveUserPreferences(
  row: { email_alerts_enabled?: boolean | null } | null | undefined
): UserPreferences {
  if (!row) return { ...DEFAULT_USER_PREFERENCES }
  return {
    // null column (legacy/unspecified) falls back to the enabled default.
    emailAlertsEnabled: row.email_alerts_enabled ?? DEFAULT_USER_PREFERENCES.emailAlertsEnabled,
  }
}
