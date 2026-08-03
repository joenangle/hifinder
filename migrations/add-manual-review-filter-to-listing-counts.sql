-- fix(listings): exclude price-flagged/rejected listings from the rec engine.
--
-- A corrupt price (e.g. a $24 Thieaudio Valhalla) must not inflate a component's
-- used-market liquidity count or feed the price-trend pipeline. This migration
-- teaches get_active_listing_counts to skip rows that failed validation:
--   * requires_manual_review = true  → flagged or rejected at ingest/backfill
--   * price_is_reasonable    = false → price outside the plausible band
--
-- COALESCE semantics (legacy rows have NULL in these columns) are expressed as
-- IS NOT TRUE / IS NOT FALSE so the partial index predicate stays immutable and
-- matches the function's WHERE clause exactly.
--
-- Idempotent: safe to re-run.

BEGIN;

-- 1. Replace the hot-path partial index to also exclude flagged/unreasonable rows.
DROP INDEX IF EXISTS public.idx_used_listings_component_active_not_sample;

CREATE INDEX IF NOT EXISTS idx_used_listings_component_active_clean
  ON public.used_listings (component_id)
  WHERE is_active = true
    AND is_sample = false
    AND requires_manual_review IS NOT TRUE
    AND price_is_reasonable IS NOT FALSE;

-- 2. Replace the RPC to add the validation predicate.
CREATE OR REPLACE FUNCTION public.get_active_listing_counts(component_ids uuid[])
RETURNS TABLE(component_id uuid, listing_count bigint)
LANGUAGE plpgsql
STABLE
AS $function$
BEGIN
  RETURN QUERY
  SELECT
    ul.component_id,
    COUNT(*)::bigint AS listing_count
  FROM used_listings ul
  WHERE
    ul.is_active = true
    AND ul.is_sample = false
    AND ul.requires_manual_review IS NOT TRUE
    AND ul.price_is_reasonable IS NOT FALSE
    AND ul.component_id = ANY(component_ids)
  GROUP BY ul.component_id;
END;
$function$;

COMMIT;

-- Verification queries (run after apply):
-- 1) RPC still works and excludes flagged rows:
--    SELECT * FROM get_active_listing_counts(ARRAY[(SELECT id FROM components LIMIT 1)]::uuid[]);
-- 2) EXPLAIN shows the new partial index:
--    EXPLAIN ANALYZE
--    SELECT ul.component_id, COUNT(*)::bigint FROM used_listings ul
--    WHERE ul.is_active = true AND ul.is_sample = false
--      AND ul.requires_manual_review IS NOT TRUE AND ul.price_is_reasonable IS NOT FALSE
--      AND ul.component_id = ANY(ARRAY(SELECT id FROM components WHERE category IN ('cans','iems') LIMIT 100))
--    GROUP BY ul.component_id;
-- 3) Confirm a known-bad component's count dropped:
--    SELECT component_id, COUNT(*) FROM used_listings
--    WHERE requires_manual_review = true GROUP BY component_id ORDER BY 2 DESC LIMIT 10;
