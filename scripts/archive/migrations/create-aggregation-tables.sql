-- Create tables for listing aggregation, archiving, and monitoring

-- Archive table for long-term data retention
CREATE TABLE IF NOT EXISTS used_listings_archive (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID REFERENCES components(id),
  title TEXT NOT NULL,
  price INTEGER NOT NULL,
  condition TEXT NOT NULL CHECK (condition IN ('excellent', 'very_good', 'good', 'fair', 'parts_only')),
  location TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('reddit_avexchange', 'ebay', 'head_fi', 'usaudiomart', 'reverb', 'manual')),
  url TEXT NOT NULL,
  date_posted TIMESTAMP WITH TIME ZONE NOT NULL,
  seller_username TEXT NOT NULL,
  seller_confirmed_trades INTEGER,
  seller_feedback_score INTEGER,
  seller_feedback_percentage DECIMAL(5,2),
  images TEXT[],
  description TEXT,
  price_is_reasonable BOOLEAN DEFAULT true,
  price_variance_percentage INTEGER DEFAULT 0,
  price_warning TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  view_count INTEGER DEFAULT 0,
  listing_type TEXT CHECK (listing_type IN ('buy_it_now', 'auction', 'trade', 'bundle')),
  shipping_cost INTEGER,
  accepts_offers BOOLEAN DEFAULT false,

  -- Archive metadata
  archived_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  original_created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  original_updated_at TIMESTAMP WITH TIME ZONE NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Aggregation run statistics
CREATE TABLE IF NOT EXISTS aggregation_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_date TIMESTAMP WITH TIME ZONE NOT NULL,
  reddit_total INTEGER DEFAULT 0,
  reddit_new INTEGER DEFAULT 0,
  reddit_errors INTEGER DEFAULT 0,
  ebay_total INTEGER DEFAULT 0,
  ebay_new INTEGER DEFAULT 0,
  ebay_errors INTEGER DEFAULT 0,
  duplicates_removed INTEGER DEFAULT 0,
  listings_archived INTEGER DEFAULT 0,
  duration_ms INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Error logging for monitoring
CREATE TABLE IF NOT EXISTS aggregation_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  error_stack TEXT,
  context JSONB,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin override/moderation actions
CREATE TABLE IF NOT EXISTS listing_moderation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID REFERENCES used_listings(id),
  action TEXT NOT NULL CHECK (action IN ('approve', 'reject', 'flag', 'edit', 'archive')),
  reason TEXT,
  moderator_notes TEXT,
  automated BOOLEAN DEFAULT false,
  created_by UUID, -- Could reference users table if you have one
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Price history tracking for market analysis
CREATE TABLE IF NOT EXISTS price_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  component_id UUID REFERENCES components(id) NOT NULL,
  source TEXT NOT NULL,
  date_recorded DATE NOT NULL,
  price_min INTEGER,
  price_max INTEGER,
  price_avg INTEGER,
  listing_count INTEGER DEFAULT 0,
  excellent_condition_avg INTEGER,
  good_condition_avg INTEGER,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  UNIQUE(component_id, source, date_recorded)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_archive_component_date ON used_listings_archive(component_id, archived_at);
CREATE INDEX IF NOT EXISTS idx_archive_source ON used_listings_archive(source);
CREATE INDEX IF NOT EXISTS idx_aggregation_stats_date ON aggregation_stats(run_date);
CREATE INDEX IF NOT EXISTS idx_aggregation_errors_type ON aggregation_errors(error_type, created_at);
CREATE INDEX IF NOT EXISTS idx_price_history_component ON price_history(component_id, date_recorded);
CREATE INDEX IF NOT EXISTS idx_listing_moderation_listing ON listing_moderation(listing_id);

-- Functions for duplicate detection
CREATE OR REPLACE FUNCTION find_duplicate_listings_by_url()
RETURNS TABLE(url TEXT, count BIGINT, newest_created_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ul.url,
    COUNT(*) as count,
    MAX(ul.created_at) as newest_created_at
  FROM used_listings ul
  WHERE ul.is_active = true
  GROUP BY ul.url
  HAVING COUNT(*) > 1;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate daily price averages
CREATE OR REPLACE FUNCTION update_daily_price_history()
RETURNS void AS $$
BEGIN
  INSERT INTO price_history (
    component_id,
    source,
    date_recorded,
    price_min,
    price_max,
    price_avg,
    listing_count,
    excellent_condition_avg,
    good_condition_avg
  )
  SELECT
    ul.component_id,
    ul.source,
    CURRENT_DATE,
    MIN(ul.price),
    MAX(ul.price),
    AVG(ul.price)::INTEGER,
    COUNT(*),
    AVG(CASE WHEN ul.condition = 'excellent' THEN ul.price END)::INTEGER,
    AVG(CASE WHEN ul.condition IN ('good', 'very_good') THEN ul.price END)::INTEGER
  FROM used_listings ul
  WHERE ul.is_active = true
    AND ul.date_posted >= CURRENT_DATE - INTERVAL '1 day'
    AND ul.price_is_reasonable = true
    AND ul.component_id IS NOT NULL
  GROUP BY ul.component_id, ul.source
  ON CONFLICT (component_id, source, date_recorded)
  DO UPDATE SET
    price_min = EXCLUDED.price_min,
    price_max = EXCLUDED.price_max,
    price_avg = EXCLUDED.price_avg,
    listing_count = EXCLUDED.listing_count,
    excellent_condition_avg = EXCLUDED.excellent_condition_avg,
    good_condition_avg = EXCLUDED.good_condition_avg;
END;
$$ LANGUAGE plpgsql;

-- RLS Policies (if using RLS)
ALTER TABLE used_listings_archive ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregation_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE aggregation_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE listing_moderation ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_history ENABLE ROW LEVEL SECURITY;

-- Allow read access to archive data
CREATE POLICY "Allow read access to archive data" ON used_listings_archive
  FOR SELECT USING (true);

-- Allow read access to stats for monitoring
CREATE POLICY "Allow read access to aggregation stats" ON aggregation_stats
  FOR SELECT USING (true);

-- Allow read access to price history
CREATE POLICY "Allow read access to price history" ON price_history
  FOR SELECT USING (true);

-- Restrict write access to service role only
CREATE POLICY "Service role can manage all data" ON used_listings_archive
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all data" ON aggregation_stats
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all data" ON aggregation_errors
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all data" ON listing_moderation
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage all data" ON price_history
  FOR ALL USING (auth.role() = 'service_role');

-- Comments for documentation
COMMENT ON TABLE used_listings_archive IS 'Long-term storage for expired/old listings, preserving price history data';
COMMENT ON TABLE aggregation_stats IS 'Statistics from each scraping run for monitoring and optimization';
COMMENT ON TABLE aggregation_errors IS 'Error logging for debugging and monitoring scraper health';
COMMENT ON TABLE listing_moderation IS 'Manual moderation actions and admin overrides';
COMMENT ON TABLE price_history IS 'Daily price averages and market trends by component and source';