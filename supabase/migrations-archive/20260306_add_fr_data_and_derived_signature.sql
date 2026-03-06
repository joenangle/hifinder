-- Add frequency response data and FR-derived sound signature columns
-- Part of Crinacle FR data migration

-- FR data storage (averaged L/R, full 480 points for future visualization)
ALTER TABLE components ADD COLUMN IF NOT EXISTS fr_data JSONB;
COMMENT ON COLUMN components.fr_data IS 'Frequency response data: {points: [[freq_hz, spl_db], ...], source: "crinacle", channels: N}';

-- FR-derived sound signature (separate from expert crin_signature)
ALTER TABLE components ADD COLUMN IF NOT EXISTS derived_signature TEXT;
COMMENT ON COLUMN components.derived_signature IS 'Sound signature derived from FR curve analysis (neutral/warm/bright/fun/v-shaped/dark)';

-- Detailed FR-derived descriptor
ALTER TABLE components ADD COLUMN IF NOT EXISTS derived_signature_detail TEXT;
COMMENT ON COLUMN components.derived_signature_detail IS 'Detailed FR-derived descriptor (e.g., "Warm V-shape, bass-boosted")';

-- Index for filtering by derived signature
CREATE INDEX IF NOT EXISTS idx_components_derived_signature
  ON components(derived_signature) WHERE derived_signature IS NOT NULL;
