-- Migration: Add manufacturer_url column to components table
-- Date: 2025-11-04
-- Purpose: Store official manufacturer product page URLs for each component

BEGIN;

-- Add manufacturer_url column
ALTER TABLE components
ADD COLUMN IF NOT EXISTS manufacturer_url TEXT;

-- Add index for faster queries when filtering by presence of URL
CREATE INDEX IF NOT EXISTS idx_components_manufacturer_url
ON components(manufacturer_url)
WHERE manufacturer_url IS NOT NULL;

-- Add column comment for documentation
COMMENT ON COLUMN components.manufacturer_url IS
'Official manufacturer product page URL for detailed specifications and product information';

-- Verify the change
DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'components'
      AND column_name = 'manufacturer_url'
  ) INTO column_exists;

  IF column_exists THEN
    RAISE NOTICE 'SUCCESS: manufacturer_url column added to components table';
  ELSE
    RAISE EXCEPTION 'FAILED: manufacturer_url column was not added';
  END IF;
END $$;

COMMIT;

-- Sample query to verify (run separately after migration)
-- SELECT id, brand, name, manufacturer_url
-- FROM components
-- LIMIT 5;
