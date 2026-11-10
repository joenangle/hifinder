-- Security audit follow-ups (2026-11-07). Safe to re-run.
-- Run: npm run db -- -f migrations/security-audit-2026-11.sql

BEGIN;

-- 1. Pin search_path on the functions the Supabase linter flags
--    (function_search_path_mutable). None is SECURITY DEFINER and every body
--    uses only public tables and pg_catalog built-ins, so pinning to public
--    keeps current behavior while blocking search_path shadowing.
ALTER FUNCTION public.get_active_listing_counts(uuid[])          SET search_path = public;
ALTER FUNCTION public.get_latest_price_trends(uuid[])            SET search_path = public;
ALTER FUNCTION public.get_unique_brands()                        SET search_path = public;
ALTER FUNCTION public.match_new_listing()                        SET search_path = public;
ALTER FUNCTION public.rate_limit_hit(text, integer, integer)     SET search_path = public;
ALTER FUNCTION public.update_component_candidates_updated_at()   SET search_path = public;

-- 2. Drop two placeholder policies that compare the JWT email to
--    'joe@example.com'. They match no one (deny-all in effect) and only
--    mislead readers; the affiliate tables are read via the service role,
--    which bypasses RLS. With them gone, RLS still denies anon/authenticated.
DROP POLICY IF EXISTS "Admin read access for clicks" ON public.affiliate_clicks;
DROP POLICY IF EXISTS "Admin full access for revenue" ON public.affiliate_revenue;

-- 3. Drop the empty table left by the deleted Figma Make edge function
--    (make-server-a5bfa774, removed 2026-11-08). Not HiFinder code. Fails if
--    rows have appeared, rather than silently deleting data.
DO $$
BEGIN
  IF to_regclass('public.kv_store_a5bfa774') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.kv_store_a5bfa774) THEN
      RAISE EXCEPTION 'kv_store_a5bfa774 is not empty; inspect before dropping';
    END IF;
    DROP TABLE public.kv_store_a5bfa774;
  END IF;
END $$;

COMMIT;
