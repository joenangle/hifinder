-- Migration: Add Validation Tracking Columns
-- Created: 2026-01-28
-- Purpose: Track validation status and warnings for listings

-- Add validation tracking columns
ALTER TABLE used_listings
  ADD COLUMN IF NOT EXISTS requires_manual_review BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS validation_warnings JSONB,
  ADD COLUMN IF NOT EXISTS match_confidence FLOAT,
  ADD COLUMN IF NOT EXISTS is_ambiguous BOOLEAN DEFAULT FALSE;

-- Add index for filtering listings requiring review
CREATE INDEX IF NOT EXISTS idx_used_listings_manual_review
  ON used_listings(requires_manual_review)
  WHERE requires_manual_review = TRUE;

-- Add index for ambiguous matches
CREATE INDEX IF NOT EXISTS idx_used_listings_ambiguous
  ON used_listings(is_ambiguous)
  WHERE is_ambiguous = TRUE;

-- Add column comments
COMMENT ON COLUMN used_listings.requires_manual_review IS 'Flag for listings that need manual verification';
COMMENT ON COLUMN used_listings.validation_warnings IS 'Array of validation warning messages (e.g., price concerns, category conflicts)';
COMMENT ON COLUMN used_listings.match_confidence IS 'Confidence score from component matching (0.0-1.0)';
COMMENT ON COLUMN used_listings.is_ambiguous IS 'True if match was ambiguous (multiple components scored similarly)';

-- Migration complete
-- Note: Existing listings will have default values (FALSE for booleans, NULL for JSONB/FLOAT)
