-- Affiliate Click Tracking Table
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Tracking info
  platform text NOT NULL CHECK (platform IN ('ebay', 'amazon', 'other')),
  component_id uuid REFERENCES components(id) ON DELETE SET NULL,
  tracking_id text NOT NULL,

  -- Source context
  source text NOT NULL CHECK (source IN ('recommendations', 'component_detail', 'used_listings', 'homepage')),
  referrer_url text,
  user_agent text,

  -- Session data (optional for analytics)
  session_id text,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address inet,

  -- Timestamps
  clicked_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Affiliate Revenue Tracking Table
CREATE TABLE IF NOT EXISTS affiliate_revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Revenue details
  platform text NOT NULL CHECK (platform IN ('ebay', 'amazon', 'other')),
  tracking_id text,
  click_id uuid REFERENCES affiliate_clicks(id) ON DELETE SET NULL,

  -- Transaction info
  order_id text,
  sale_amount numeric(10, 2),
  commission_amount numeric(10, 2) NOT NULL,
  commission_rate numeric(5, 2), -- e.g., 7.5 for 7.5%

  -- Status
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'paid', 'cancelled')),

  -- Related component (if known)
  component_id uuid REFERENCES components(id) ON DELETE SET NULL,

  -- Timestamps
  transaction_date timestamptz NOT NULL,
  confirmed_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_platform ON affiliate_clicks(platform);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_component ON affiliate_clicks(component_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_clicked_at ON affiliate_clicks(clicked_at DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_tracking_id ON affiliate_clicks(tracking_id);

CREATE INDEX IF NOT EXISTS idx_affiliate_revenue_platform ON affiliate_revenue(platform);
CREATE INDEX IF NOT EXISTS idx_affiliate_revenue_status ON affiliate_revenue(status);
CREATE INDEX IF NOT EXISTS idx_affiliate_revenue_transaction_date ON affiliate_revenue(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_affiliate_revenue_tracking_id ON affiliate_revenue(tracking_id);

-- RLS Policies (admin only)
ALTER TABLE affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_revenue ENABLE ROW LEVEL SECURITY;

-- Allow inserts from API (service role)
CREATE POLICY "Allow service role to insert clicks" ON affiliate_clicks
  FOR INSERT TO service_role WITH CHECK (true);

-- Admin read access only
CREATE POLICY "Admin read access for clicks" ON affiliate_clicks
  FOR SELECT USING (
    auth.jwt() ->> 'email' = 'joe@example.com' -- Replace with your admin email
  );

CREATE POLICY "Admin full access for revenue" ON affiliate_revenue
  FOR ALL USING (
    auth.jwt() ->> 'email' = 'joe@example.com' -- Replace with your admin email
  );

-- Aggregate views for dashboard
CREATE OR REPLACE VIEW affiliate_stats_daily AS
SELECT
  DATE(clicked_at) as date,
  platform,
  source,
  COUNT(*) as total_clicks,
  COUNT(DISTINCT component_id) as unique_components,
  COUNT(DISTINCT session_id) as unique_sessions
FROM affiliate_clicks
GROUP BY DATE(clicked_at), platform, source
ORDER BY date DESC;

CREATE OR REPLACE VIEW affiliate_revenue_summary AS
SELECT
  DATE(transaction_date) as date,
  platform,
  status,
  COUNT(*) as transaction_count,
  SUM(sale_amount) as total_sales,
  SUM(commission_amount) as total_commission,
  AVG(commission_rate) as avg_commission_rate
FROM affiliate_revenue
GROUP BY DATE(transaction_date), platform, status
ORDER BY date DESC;

-- Top performing components view
CREATE OR REPLACE VIEW top_affiliate_components AS
SELECT
  c.id,
  c.name,
  c.brand,
  c.category,
  COUNT(ac.id) as total_clicks,
  COUNT(ar.id) as total_conversions,
  SUM(ar.commission_amount) as total_commission,
  ROUND(COUNT(ar.id)::numeric / NULLIF(COUNT(ac.id), 0) * 100, 2) as conversion_rate
FROM components c
LEFT JOIN affiliate_clicks ac ON c.id = ac.component_id
LEFT JOIN affiliate_revenue ar ON c.id = ar.component_id
WHERE ac.clicked_at >= NOW() - INTERVAL '30 days'
GROUP BY c.id, c.name, c.brand, c.category
HAVING COUNT(ac.id) > 0
ORDER BY total_commission DESC NULLS LAST
LIMIT 20;

COMMENT ON TABLE affiliate_clicks IS 'Tracks all affiliate link clicks for analytics';
COMMENT ON TABLE affiliate_revenue IS 'Tracks affiliate revenue and commissions';
COMMENT ON VIEW affiliate_stats_daily IS 'Daily aggregated click statistics';
COMMENT ON VIEW affiliate_revenue_summary IS 'Daily revenue summary by platform';
COMMENT ON VIEW top_affiliate_components IS 'Top 20 components by affiliate performance (30 day window)';
