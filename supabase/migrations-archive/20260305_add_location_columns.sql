-- Add structured location columns to used_listings
-- Parsed from freeform location text for server-side filtering

ALTER TABLE used_listings
  ADD COLUMN IF NOT EXISTS location_state text,
  ADD COLUMN IF NOT EXISTS location_country text;

-- Index for filtering by state and country
CREATE INDEX IF NOT EXISTS idx_used_listings_location
  ON used_listings (location_country, location_state)
  WHERE status = 'available';

-- Also add to archive table for consistency
ALTER TABLE used_listings_archive
  ADD COLUMN IF NOT EXISTS location_state text,
  ADD COLUMN IF NOT EXISTS location_country text;
