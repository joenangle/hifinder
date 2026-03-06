-- Add price_is_estimated column to track bundle-estimated prices
ALTER TABLE used_listings
  ADD COLUMN IF NOT EXISTS price_is_estimated BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN used_listings.price_is_estimated IS 'True when price was estimated from bundle total divided by component count';
