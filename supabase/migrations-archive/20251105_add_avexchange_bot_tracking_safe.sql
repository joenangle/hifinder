-- Add AVExchangeBot confirmation tracking for verified sold listings
-- Safe version that checks for existing columns before adding

-- Add buyer_username if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'used_listings' AND column_name = 'buyer_username'
  ) THEN
    ALTER TABLE used_listings ADD COLUMN buyer_username TEXT;
  END IF;
END $$;

-- Add avexchange_bot_confirmed if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'used_listings' AND column_name = 'avexchange_bot_confirmed'
  ) THEN
    ALTER TABLE used_listings ADD COLUMN avexchange_bot_confirmed BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add avexchange_bot_comment_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'used_listings' AND column_name = 'avexchange_bot_comment_id'
  ) THEN
    ALTER TABLE used_listings ADD COLUMN avexchange_bot_comment_id TEXT;
  END IF;
END $$;

-- Add buyer_feedback_given if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'used_listings' AND column_name = 'buyer_feedback_given'
  ) THEN
    ALTER TABLE used_listings ADD COLUMN buyer_feedback_given BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Add seller_feedback_given if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'used_listings' AND column_name = 'seller_feedback_given'
  ) THEN
    ALTER TABLE used_listings ADD COLUMN seller_feedback_given BOOLEAN DEFAULT FALSE;
  END IF;
END $$;

-- Create index for querying bot-confirmed sales (drop first if exists)
DROP INDEX IF EXISTS idx_used_listings_bot_confirmed;
CREATE INDEX idx_used_listings_bot_confirmed ON used_listings(component_id, avexchange_bot_confirmed)
  WHERE avexchange_bot_confirmed = TRUE;

-- Add comments on columns
COMMENT ON COLUMN used_listings.buyer_username IS 'Reddit username of buyer (extracted from AVExchangeBot confirmation)';
COMMENT ON COLUMN used_listings.avexchange_bot_confirmed IS 'TRUE if transaction confirmed by AVExchangeBot';
COMMENT ON COLUMN used_listings.avexchange_bot_comment_id IS 'Reddit comment ID of AVExchangeBot confirmation for tracking';
COMMENT ON COLUMN used_listings.buyer_feedback_given IS 'TRUE if buyer replied to AVExchangeBot';
COMMENT ON COLUMN used_listings.seller_feedback_given IS 'TRUE if seller replied to AVExchangeBot';
