-- =============================================================
-- Saved marketplace searches
-- Lets users name and re-run a set of marketplace filters. Stored as
-- the serialized query string so applying one is just navigating to
-- /marketplace?<query_string>. Service-role access via NextAuth session.
-- =============================================================

CREATE TABLE IF NOT EXISTS public.saved_searches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  -- Serialized marketplace filter params (e.g. "source=reverb&min_price=200").
  query_string TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user
  ON public.saved_searches(user_id, created_at DESC);

ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

-- No public policies: server routes (service role) read/write, gated by the
-- authenticated NextAuth session in /api/saved-searches.
