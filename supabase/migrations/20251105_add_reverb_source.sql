-- Update source constraint to include all current and planned marketplace sources

-- First, drop the existing constraint
ALTER TABLE used_listings
  DROP CONSTRAINT IF EXISTS used_listings_source_check;

-- Add new constraint with all marketplace sources
ALTER TABLE used_listings
  ADD CONSTRAINT used_listings_source_check
  CHECK (source IN (
    'reddit_avexchange',  -- Reddit r/AVexchange (active)
    'reverb',             -- Reverb.com (active)
    'head_fi',            -- Head-Fi classifieds (planned)
    'ebay',               -- eBay affiliate links (planned)
    'audiogon',           -- Audiogon marketplace (potential future)
    'usaudiomart',        -- US Audio Mart (potential future)
    'other'               -- Catch-all for misc sources
  ));

COMMENT ON CONSTRAINT used_listings_source_check ON used_listings IS 'Ensures source is from a known marketplace. Add new sources here as they are integrated.';
