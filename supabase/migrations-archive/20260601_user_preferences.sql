-- =============================================================
-- User notification preferences
-- Adds a global email opt-out so users can silence alert emails
-- regardless of per-alert settings. Accessed server-side via the
-- service-role client + NextAuth session (RLS-bypassing), matching
-- the rest of the app; no public policies are granted.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.user_preferences (
  -- Matches the TEXT user id convention used by users.id / price_alerts.user_id.
  user_id TEXT PRIMARY KEY,

  -- Global kill switch for transactional alert emails (default on).
  email_alerts_enabled BOOLEAN NOT NULL DEFAULT true,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- No public policies: only the service role (server routes) reads/writes,
-- gated by the authenticated NextAuth session in /api/user/preferences.
