-- Add unique constraint to url column for upsert operations
-- This allows the scraper to update existing listings when status changes

-- First, check if there are any duplicate URLs and clean them up
-- Keep the most recent entry for each URL
DO $$
DECLARE
  dup_url TEXT;
  keep_id UUID;
BEGIN
  FOR dup_url IN
    SELECT url
    FROM used_listings
    GROUP BY url
    HAVING COUNT(*) > 1
  LOOP
    -- Keep the most recently updated/created entry
    SELECT id INTO keep_id
    FROM used_listings
    WHERE url = dup_url
    ORDER BY updated_at DESC NULLS LAST, created_at DESC
    LIMIT 1;

    -- Delete all other duplicates
    DELETE FROM used_listings
    WHERE url = dup_url AND id != keep_id;

    RAISE NOTICE 'Cleaned up duplicates for URL: %', dup_url;
  END LOOP;
END $$;

-- Add unique constraint if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'used_listings_url_key'
  ) THEN
    ALTER TABLE used_listings ADD CONSTRAINT used_listings_url_key UNIQUE (url);
    RAISE NOTICE 'Added unique constraint to url column';
  ELSE
    RAISE NOTICE 'Unique constraint already exists on url column';
  END IF;
END $$;

-- Add index for faster lookups by URL (if not exists)
CREATE INDEX IF NOT EXISTS idx_used_listings_url ON used_listings(url);

COMMENT ON CONSTRAINT used_listings_url_key ON used_listings IS 'Ensures each Reddit/eBay listing URL is unique, allowing upsert operations to update status when listings change';
