-- Performance Optimization: Database function to get unique brands
-- Created: 2025-12-31
-- Purpose: Replace JavaScript deduplication with SQL DISTINCT

-- Function to get unique brands ordered alphabetically
CREATE OR REPLACE FUNCTION get_unique_brands()
RETURNS TABLE (brand text) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT c.brand
  FROM components c
  WHERE c.brand IS NOT NULL
  ORDER BY c.brand;
END;
$$ LANGUAGE plpgsql STABLE;

-- Grant execute permission
-- GRANT EXECUTE ON FUNCTION get_unique_brands TO authenticated;
-- GRANT EXECUTE ON FUNCTION get_unique_brands TO anon;

-- Example usage:
-- SELECT * FROM get_unique_brands();
