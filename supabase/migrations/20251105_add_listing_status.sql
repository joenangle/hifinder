-- Add listing status tracking for historical pricing

ALTER TABLE used_listings
  ADD COLUMN status TEXT CHECK (status IN ('available', 'sold', 'expired', 'removed')) DEFAULT 'available',
  ADD COLUMN date_sold TIMESTAMPTZ,
  ADD COLUMN sale_price NUMERIC(10,2);

UPDATE used_listings
SET status = CASE WHEN is_active THEN 'available' ELSE 'expired' END;

CREATE INDEX idx_used_listings_component_sold ON used_listings(component_id, status) WHERE status = 'sold';
CREATE INDEX idx_used_listings_price_history ON used_listings(component_id, date_sold, price) WHERE date_sold IS NOT NULL;
