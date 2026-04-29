-- Cleanup unused/deprecated columns from components table
-- Generated: 2025-10-10
-- Removes columns with 0% usage that are dead/deprecated

-- IMPORTANT: Review before executing!
-- This migration drops 6 unused columns:
--   - price (deprecated, use price_new)
--   - why (deprecated, use why_recommended)
--   - slug (never populated)
--   - tier (never populated)
--   - crinacle_tier (duplicate of crinacle_rank)
--   - sensitivity (deprecated, use sensitivity_db_mw/sensitivity_db_v)

-- Keeping these sparse fields for backfill:
--   - sensitivity_db_v (0%, planned backfill)
--   - image_url (0%, planned backfill)
--   - sensitivity_db_mw (1%, active work)
--   - amplification_difficulty (1%, new feature)
--   - power_required_mw (1%, new feature)
--   - voltage_required_v (1%, new feature)
--   - asr_sinad (4%, active ASR work)
--   - asr_review_url (4%, active ASR work)

BEGIN;

-- Backup check: Verify these columns are actually empty before dropping
DO $$
DECLARE
  price_count INTEGER;
  why_count INTEGER;
  slug_count INTEGER;
  tier_count INTEGER;
  crinacle_tier_count INTEGER;
  sensitivity_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO price_count FROM components WHERE price IS NOT NULL;
  SELECT COUNT(*) INTO why_count FROM components WHERE why IS NOT NULL;
  SELECT COUNT(*) INTO slug_count FROM components WHERE slug IS NOT NULL;
  SELECT COUNT(*) INTO tier_count FROM components WHERE tier IS NOT NULL;
  SELECT COUNT(*) INTO crinacle_tier_count FROM components WHERE crinacle_tier IS NOT NULL;
  SELECT COUNT(*) INTO sensitivity_count FROM components WHERE sensitivity IS NOT NULL;

  IF price_count > 0 OR why_count > 0 OR slug_count > 0 OR
     tier_count > 0 OR crinacle_tier_count > 0 OR sensitivity_count > 0 THEN
    RAISE EXCEPTION 'Safety check failed: One or more columns has data. Counts: price=%, why=%, slug=%, tier=%, crinacle_tier=%, sensitivity=%',
      price_count, why_count, slug_count, tier_count, crinacle_tier_count, sensitivity_count;
  END IF;

  RAISE NOTICE 'Safety check passed: All columns are empty';
END $$;

-- Drop the unused columns
ALTER TABLE components
  DROP COLUMN IF EXISTS price,
  DROP COLUMN IF EXISTS why,
  DROP COLUMN IF EXISTS slug,
  DROP COLUMN IF EXISTS tier,
  DROP COLUMN IF EXISTS crinacle_tier,
  DROP COLUMN IF EXISTS sensitivity;

COMMIT;

-- To verify the columns are gone, run this query:
-- SELECT column_name, data_type
-- FROM information_schema.columns
-- WHERE table_name = 'components'
-- ORDER BY column_name;
