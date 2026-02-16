-- Migration: Add Review Tracking Columns
-- Created: 2026-01-29
-- Purpose: Track who reviewed flagged listings and when

-- Add review tracking columns
ALTER TABLE used_listings
  ADD COLUMN IF NOT EXISTS reviewed_by TEXT,
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS manual_review_notes TEXT;

-- Add index for admin queries (flagged listings with low confidence first)
CREATE INDEX IF NOT EXISTS idx_used_listings_flagged
  ON used_listings(requires_manual_review, match_confidence)
  WHERE requires_manual_review = TRUE;

-- Add column comments
COMMENT ON COLUMN used_listings.reviewed_by IS 'Email of admin who reviewed this listing';
COMMENT ON COLUMN used_listings.reviewed_at IS 'Timestamp when listing was reviewed';
COMMENT ON COLUMN used_listings.manual_review_notes IS 'Admin notes about approval/rejection/fix';

-- Migration complete
