-- Fix numeric field overflow in price_trends
-- Change NUMERIC(5,2) to NUMERIC(8,2) to handle larger percentages

-- Increase precision for trend_percentage (can now handle ±999,999.99%)
ALTER TABLE price_trends
  ALTER COLUMN trend_percentage TYPE NUMERIC(8,2);

-- Increase precision for discount_factor (can now handle factors up to 9999.99)
ALTER TABLE price_trends
  ALTER COLUMN discount_factor TYPE NUMERIC(8,2);

-- Update comments to reflect new limits
COMMENT ON COLUMN price_trends.trend_percentage IS '+/- % vs previous period (can handle large swings up to ±999,999%)';
COMMENT ON COLUMN price_trends.discount_factor IS 'Ratio of sold asking price to active listing price (e.g., 0.92 = sold for 92% of asking, handles up to 9999.99)';