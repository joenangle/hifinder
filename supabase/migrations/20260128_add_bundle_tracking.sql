-- Migration: Add Bundle Tracking Support
-- Created: 2026-01-28
-- Purpose: Enable multi-component bundle listings with shared bundle_group_id

-- Add bundle tracking columns
ALTER TABLE used_listings
  ADD COLUMN IF NOT EXISTS bundle_group_id TEXT,
  ADD COLUMN IF NOT EXISTS bundle_total_price INTEGER,
  ADD COLUMN IF NOT EXISTS bundle_component_count INTEGER,
  ADD COLUMN IF NOT EXISTS bundle_position INTEGER,
  ADD COLUMN IF NOT EXISTS matched_segment TEXT;

-- Add index for bundle group queries (partial index for performance)
CREATE INDEX IF NOT EXISTS idx_used_listings_bundle_group
  ON used_listings(bundle_group_id)
  WHERE bundle_group_id IS NOT NULL;

-- Add column comments
COMMENT ON COLUMN used_listings.bundle_group_id IS 'Groups multiple listings from the same bundle post. Format: bundle_TIMESTAMP_RANDOMID';
COMMENT ON COLUMN used_listings.bundle_total_price IS 'Total price for entire bundle when individual prices are unknown';
COMMENT ON COLUMN used_listings.bundle_component_count IS 'Number of components in this bundle';
COMMENT ON COLUMN used_listings.bundle_position IS 'Position of this component in the bundle (1-indexed)';
COMMENT ON COLUMN used_listings.matched_segment IS 'Text segment that matched this component (for debugging)';

-- Drop old unique constraint on url only
ALTER TABLE used_listings DROP CONSTRAINT IF EXISTS used_listings_url_key;

-- Add new composite unique constraint on (url, component_id)
-- This allows multiple components from the same post
ALTER TABLE used_listings
  ADD CONSTRAINT used_listings_url_component_unique
  UNIQUE (url, component_id);

-- Add index for URL lookups (since we removed the unique constraint which was also an index)
CREATE INDEX IF NOT EXISTS idx_used_listings_url ON used_listings(url);

-- Migration complete
-- Note: Existing listings will have NULL values for new bundle columns, which is expected
-- Future scraper runs will populate these fields for new listings
