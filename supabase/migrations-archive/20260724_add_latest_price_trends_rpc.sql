-- Performance: return only the latest price-trend row per component.
-- Created: 2026-07-24
-- Purpose: The recommendations route fetched every historical price_trends row
--   for every component and kept only the newest per component in JS. That
--   scan grows without bound as history accumulates. DISTINCT ON pushes the
--   per-component "latest row" selection into Postgres.
--
-- discount_factor is intentionally omitted — the route selected but never used it.

CREATE OR REPLACE FUNCTION get_latest_price_trends(component_ids uuid[])
RETURNS TABLE (
  component_id uuid,
  trend_direction character varying,
  trend_percentage numeric,
  confidence_score character varying,
  period_start date
) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT ON (pt.component_id)
    pt.component_id,
    pt.trend_direction,
    pt.trend_percentage,
    pt.confidence_score,
    pt.period_start
  FROM price_trends pt
  WHERE pt.component_id = ANY(component_ids)
  ORDER BY pt.component_id, pt.period_start DESC;
END;
$$ LANGUAGE plpgsql STABLE;

-- Match the grants on the sibling listing-count function.
GRANT EXECUTE ON FUNCTION get_latest_price_trends(uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION get_latest_price_trends(uuid[]) TO anon;
GRANT EXECUTE ON FUNCTION get_latest_price_trends(uuid[]) TO service_role;
