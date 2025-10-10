-- Add sensitivity and driver type columns for amplification calculations
-- Run this in Supabase SQL Editor

ALTER TABLE components
ADD COLUMN IF NOT EXISTS sensitivity_db_mw DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS sensitivity_db_v DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS driver_type TEXT;

-- Add comments
COMMENT ON COLUMN components.sensitivity_db_mw IS 'Sensitivity in dB/mW (IEM standard, used with impedance to calculate power)';
COMMENT ON COLUMN components.sensitivity_db_v IS 'Sensitivity in dB/V (headphone standard, used with impedance to calculate power)';
COMMENT ON COLUMN components.driver_type IS 'Driver technology: Dynamic, Planar, BA (Balanced Armature), Hybrid, Electrostatic, AMT';

-- Verify the columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'components'
  AND column_name IN ('sensitivity_db_mw', 'sensitivity_db_v', 'driver_type', 'impedance');
