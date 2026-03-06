-- Add structured numeric power output columns
-- These supplement the freeform power_output string with machine-readable values
-- parsePowerSpec() in audio-calculations.ts becomes a fallback when these are NULL

ALTER TABLE components ADD COLUMN IF NOT EXISTS power_output_mw_32 numeric;
ALTER TABLE components ADD COLUMN IF NOT EXISTS power_output_mw_300 numeric;

COMMENT ON COLUMN components.power_output_mw_32 IS 'Power output in milliwatts at 32 ohm load';
COMMENT ON COLUMN components.power_output_mw_300 IS 'Power output in milliwatts at 300 ohm load';
