-- Add JSONB column for semi-structured technical specifications
-- Run this in Supabase SQL Editor

ALTER TABLE components
ADD COLUMN IF NOT EXISTS technical_specs JSONB DEFAULT '{}'::jsonb;

-- Add index for efficient JSONB queries (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_components_technical_specs ON components USING gin(technical_specs);

-- Add comment explaining the structure
COMMENT ON COLUMN components.technical_specs IS 'Semi-structured technical specifications. Example structure:
{
  "connector": "3.5mm TRS / 2.5mm balanced",
  "cable": "detachable",
  "cable_length_mm": 1200,
  "max_spl_db": 130,
  "thd_percent": 0.5,
  "frequency_response": "10Hz-40kHz",
  "weight_grams": 350,
  "isolation_db": -20,
  "bluetooth_version": "5.2",
  "codec_support": ["AAC", "LDAC", "aptX"],
  "battery_hours": 30,
  "anc_enabled": true
}';

-- Verify the column was added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'components'
  AND column_name = 'technical_specs';
