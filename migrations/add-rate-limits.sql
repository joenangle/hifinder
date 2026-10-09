-- Fixed-window rate limiting backed by Postgres (no extra infrastructure).
--
-- In-memory counters don't work on serverless: each instance has its own
-- memory and instances come and go. A row per key in the database we already
-- run is shared by every instance and costs nothing extra at this scale.
--
-- Usage (server only, via the service role):
--   select rate_limit_hit('subscribe:ip:203.0.113.7', 3600, 10);  -- true = allowed
--
-- Apply: npm run db -- -f migrations/add-rate-limits.sql

BEGIN;

CREATE TABLE IF NOT EXISTS rate_limits (
  key          text PRIMARY KEY,
  window_start timestamptz NOT NULL DEFAULT now(),
  count        integer     NOT NULL DEFAULT 0
);

-- Service role only: RLS on with no policies blocks anon/authenticated access
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Record one hit against p_key and report whether it is within p_max hits per
-- p_window_seconds. The upsert is a single atomic statement, so concurrent
-- requests can't both slip under the limit.
CREATE OR REPLACE FUNCTION rate_limit_hit(p_key text, p_window_seconds integer, p_max integer)
RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
  v_count integer;
BEGIN
  INSERT INTO rate_limits AS r (key, window_start, count)
  VALUES (p_key, now(), 1)
  ON CONFLICT (key) DO UPDATE SET
    count = CASE
      WHEN r.window_start <= now() - make_interval(secs => p_window_seconds) THEN 1
      ELSE r.count + 1
    END,
    window_start = CASE
      WHEN r.window_start <= now() - make_interval(secs => p_window_seconds) THEN now()
      ELSE r.window_start
    END
  RETURNING count INTO v_count;

  -- Opportunistic cleanup (~1% of calls) so expired keys don't accumulate.
  -- Windows are at most a day, so anything older than that is dead.
  IF random() < 0.01 THEN
    DELETE FROM rate_limits WHERE window_start < now() - interval '1 day';
  END IF;

  RETURN v_count <= p_max;
END;
$$;

-- PostgREST exposes functions to anon/authenticated by default; this one must
-- only be callable by the server, or anyone could burn other users' quotas.
REVOKE ALL ON FUNCTION rate_limit_hit(text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION rate_limit_hit(text, integer, integer) TO service_role;

COMMIT;
