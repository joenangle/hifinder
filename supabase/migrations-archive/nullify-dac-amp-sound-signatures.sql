-- Nullify sound_signature for DACs, amps, and combo units
-- Sound signature is only meaningful for headphones/IEMs
-- DACs/amps should be transparent and don't have inherent sound signatures

BEGIN;

-- Show what we're about to change
DO $$
DECLARE
  dac_count INTEGER;
  amp_count INTEGER;
  combo_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO dac_count FROM components
    WHERE category = 'dac' AND sound_signature IS NOT NULL;

  SELECT COUNT(*) INTO amp_count FROM components
    WHERE category = 'amp' AND sound_signature IS NOT NULL;

  SELECT COUNT(*) INTO combo_count FROM components
    WHERE category = 'dac_amp' AND sound_signature IS NOT NULL;

  RAISE NOTICE 'Will nullify sound_signature for:';
  RAISE NOTICE '  - % DACs', dac_count;
  RAISE NOTICE '  - % amps', amp_count;
  RAISE NOTICE '  - % combo units', combo_count;
  RAISE NOTICE '  - Total: % components', dac_count + amp_count + combo_count;
END $$;

-- Update sound_signature to NULL for DACs, amps, and combos
UPDATE components
SET sound_signature = NULL
WHERE category IN ('dac', 'amp', 'dac_amp')
  AND sound_signature IS NOT NULL;

-- Verify the update
DO $$
DECLARE
  remaining_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO remaining_count FROM components
    WHERE category IN ('dac', 'amp', 'dac_amp')
      AND sound_signature IS NOT NULL;

  IF remaining_count > 0 THEN
    RAISE EXCEPTION 'Update failed: % DAC/amp/combo components still have sound_signature', remaining_count;
  END IF;

  RAISE NOTICE 'Success: All DAC/amp/combo sound_signature values set to NULL';
END $$;

COMMIT;
