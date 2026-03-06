-- Add Reverb-specific fields to used_listings table
-- These fields provide additional marketplace information useful for buyers

-- Add shipping cost field (helps users calculate true total cost)
ALTER TABLE used_listings
  ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC DEFAULT 0;

-- Add accepts offers flag (indicates if price is negotiable)
ALTER TABLE used_listings
  ADD COLUMN IF NOT EXISTS accepts_offers BOOLEAN DEFAULT false;

-- Add listing type field (distinguishes marketplace formats)
ALTER TABLE used_listings
  ADD COLUMN IF NOT EXISTS listing_type TEXT DEFAULT 'buy_it_now';

-- Add check constraint for valid listing types
ALTER TABLE used_listings
  ADD CONSTRAINT valid_listing_type
  CHECK (listing_type IN ('buy_it_now', 'auction', 'make_offer', 'other'));

-- Add comment documentation
COMMENT ON COLUMN used_listings.shipping_cost IS 'Shipping cost in USD. 0 if free shipping or included in price.';
COMMENT ON COLUMN used_listings.accepts_offers IS 'True if seller accepts offers/negotiation (e.g., OBO on Reddit, offers enabled on Reverb).';
COMMENT ON COLUMN used_listings.listing_type IS 'Marketplace format: buy_it_now (fixed price), auction (bidding), make_offer (negotiation required), other.';
