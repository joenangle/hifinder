-- Performance Optimization: Database function to get used listing counts
-- Created: 2025-12-31
-- Purpose: Replace N+1 query pattern with single aggregated query

-- Function to get active used listing counts per component (excluding sample/demo)
CREATE OR REPLACE FUNCTION get_active_listing_counts(component_ids uuid[])
RETURNS TABLE (
  component_id uuid,
  listing_count bigint
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ul.component_id,
    COUNT(*)::bigint as listing_count
  FROM used_listings ul
  WHERE
    ul.status = 'available'
    AND ul.component_id = ANY(component_ids)
    -- Filter out sample/demo listings
    AND ul.url NOT ILIKE '%sample%'
    AND ul.url NOT ILIKE '%demo%'
    AND ul.title NOT ILIKE '%sample%'
    AND ul.title NOT ILIKE '%demo%'
  GROUP BY ul.component_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission (adjust role as needed)
-- GRANT EXECUTE ON FUNCTION get_active_listing_counts TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_active_listing_counts TO anon;

-- Example usage:
-- SELECT * FROM get_active_listing_counts(ARRAY['uuid1', 'uuid2']::uuid[]);
