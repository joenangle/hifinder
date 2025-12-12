-- Create price_trends table for tracking used pricing trends over time
-- This enables dynamic pricing in recommendations based on real market data

CREATE TABLE IF NOT EXISTS price_trends (
  id SERIAL PRIMARY KEY,
  component_id UUID REFERENCES components(id) ON DELETE CASCADE,

  -- Time period for this trend data
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  -- Asking price statistics (from sold listings)
  avg_asking_price NUMERIC(10,2),
  median_asking_price NUMERIC(10,2),
  min_asking_price NUMERIC(10,2),
  max_asking_price NUMERIC(10,2),

  -- Volume metrics
  sold_count INTEGER DEFAULT 0,
  active_count INTEGER DEFAULT 0,

  -- Trend indicators
  trend_direction VARCHAR(10), -- 'up', 'down', 'stable'
  trend_percentage NUMERIC(5,2), -- +/- % vs previous period
  discount_factor NUMERIC(5,2), -- sold_avg / active_avg (how much below asking items sell)

  -- Data quality and confidence
  confidence_score VARCHAR(10), -- 'high', 'medium', 'low'
  data_quality_notes TEXT,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one record per component per period
  UNIQUE(component_id, period_start)
);

-- Indexes for efficient queries
CREATE INDEX idx_price_trends_component ON price_trends(component_id);
CREATE INDEX idx_price_trends_period ON price_trends(period_start DESC);
CREATE INDEX idx_price_trends_confidence ON price_trends(confidence_score);
CREATE INDEX idx_price_trends_component_recent ON price_trends(component_id, period_start DESC);

-- Comments for documentation
COMMENT ON TABLE price_trends IS 'Tracks historical pricing trends for used components based on actual marketplace listings';
COMMENT ON COLUMN price_trends.avg_asking_price IS 'Average asking price for sold items in this period';
COMMENT ON COLUMN price_trends.discount_factor IS 'Ratio of sold asking price to active listing price (e.g., 0.92 = sold for 92% of asking)';
COMMENT ON COLUMN price_trends.confidence_score IS 'Data quality: high (20+ sales), medium (5-19), low (<5)';
