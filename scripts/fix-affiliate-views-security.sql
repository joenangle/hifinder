-- Fix SECURITY DEFINER views to use SECURITY INVOKER
-- This addresses Supabase linter warnings about security definer views

-- Drop and recreate affiliate_stats_daily with SECURITY INVOKER
DROP VIEW IF EXISTS affiliate_stats_daily;
CREATE OR REPLACE VIEW affiliate_stats_daily
WITH (security_invoker = true)
AS
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

-- Drop and recreate affiliate_revenue_summary with SECURITY INVOKER
DROP VIEW IF EXISTS affiliate_revenue_summary;
CREATE OR REPLACE VIEW affiliate_revenue_summary
WITH (security_invoker = true)
AS
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

-- Drop and recreate top_affiliate_components with SECURITY INVOKER
DROP VIEW IF EXISTS top_affiliate_components;
CREATE OR REPLACE VIEW top_affiliate_components
WITH (security_invoker = true)
AS
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

-- Restore comments
COMMENT ON VIEW affiliate_stats_daily IS 'Daily aggregated click statistics (SECURITY INVOKER)';
COMMENT ON VIEW affiliate_revenue_summary IS 'Daily revenue summary by platform (SECURITY INVOKER)';
COMMENT ON VIEW top_affiliate_components IS 'Top 20 components by affiliate performance - 30 day window (SECURITY INVOKER)';

-- Note: These views now use SECURITY INVOKER, which means they respect the RLS policies
-- of the querying user. Since the admin API uses service_role, it will have full access.
-- Regular users will be subject to RLS policies on the underlying tables.
