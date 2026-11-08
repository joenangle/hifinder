-- Add bundle detection columns to used_listings table
-- Migration: Add is_bundle and component_count columns

ALTER TABLE used_listings
  ADD COLUMN IF NOT EXISTS is_bundle BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS component_count INTEGER DEFAULT 1;

-- Add comment for documentation
COMMENT ON COLUMN used_listings.is_bundle IS 'Indicates if this listing contains multiple components (bundle)';
COMMENT ON COLUMN used_listings.component_count IS 'Number of components detected in this listing (1 for single item, 2+ for bundles)';

-- Create index for filtering bundle listings
CREATE INDEX IF NOT EXISTS idx_used_listings_bundle ON used_listings(is_bundle) WHERE is_bundle = true;
