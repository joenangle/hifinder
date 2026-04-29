-- perf(listings): add is_sample column so get_active_listing_counts can drop
-- its four NOT ILIKE '%sample%|%demo%' filters (unindexable, 247ms / call).
--
-- After apply:
--   * used_listings.is_sample: BOOLEAN NOT NULL DEFAULT false
--   * partial index on (component_id, is_active) WHERE is_sample = false
--   * get_active_listing_counts uses AND NOT is_sample instead of ILIKE
--   * scraper writes will need to set is_sample = true when url/title
--     contains 'sample' or 'demo' (see scripts/reverb-integration.js
--     and scripts/reddit-avexchange-scraper-v3.js updates in the
--     matching PR).
--
-- Idempotent: safe to re-run. Only backfills rows that match the old
-- ILIKE pattern and haven't already been flagged.

BEGIN;

-- 1. Schema change
ALTER TABLE public.used_listings
  ADD COLUMN IF NOT EXISTS is_sample BOOLEAN NOT NULL DEFAULT false;

-- 2. Backfill existing rows (current data has ~14 rows matching, mostly
-- Reverb "Demo/Open Box" listings). Idempotent — only flips false→true.
UPDATE public.used_listings
SET is_sample = true
WHERE is_sample = false
  AND (
    url ILIKE '%sample%'
    OR url ILIKE '%demo%'
    OR title ILIKE '%sample%'
    OR title ILIKE '%demo%'
  );

-- 3. Partial index for the hot path (active, non-sample listings per component)
CREATE INDEX IF NOT EXISTS idx_used_listings_component_active_not_sample
  ON public.used_listings (component_id)
  WHERE is_active = true AND is_sample = false;

-- 4. Replace the RPC to drop the ILIKE filters
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
    AND ul.component_id = ANY(component_ids)
  GROUP BY ul.component_id;
END;
$function$;

COMMIT;

-- Verification queries (run these after apply):
-- 1) Column exists:
--    SELECT column_name, is_nullable, column_default FROM information_schema.columns
--    WHERE table_name = 'used_listings' AND column_name = 'is_sample';
-- 2) Backfill counts match prior ILIKE count:
--    SELECT COUNT(*) FROM used_listings WHERE is_sample = true;  -- expect ~14
-- 3) RPC still works:
--    SELECT * FROM get_active_listing_counts(ARRAY[(SELECT id FROM components LIMIT 1)]::uuid[]);
-- 4) EXPLAIN shows new index:
--    EXPLAIN ANALYZE
--    SELECT ul.component_id, COUNT(*)::bigint FROM used_listings ul
--    WHERE ul.is_active = true AND ul.is_sample = false
--      AND ul.component_id = ANY(ARRAY(SELECT id FROM components WHERE category IN ('cans','iems') LIMIT 100))
--    GROUP BY ul.component_id;
--    -- Target: <30ms (was 247ms)
