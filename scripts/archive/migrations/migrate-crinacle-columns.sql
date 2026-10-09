-- Migration: Rename Crinacle columns to use 'crin_' prefix
-- Date: 2025-11-04
-- Purpose: Standardize data source identification for Crinacle expert data

BEGIN;

-- Rename columns in components table
ALTER TABLE components RENAME COLUMN tone_grade TO crin_tone;
ALTER TABLE components RENAME COLUMN crinacle_rank TO crin_rank;
ALTER TABLE components RENAME COLUMN technical_grade TO crin_tech;
ALTER TABLE components RENAME COLUMN value_rating TO crin_value;
ALTER TABLE components RENAME COLUMN crinacle_sound_signature TO crin_signature;
ALTER TABLE components RENAME COLUMN crinacle_comments TO crin_comments;

-- Verify the changes
SELECT
  column_name
FROM
  information_schema.columns
WHERE
  table_name = 'components'
  AND column_name LIKE 'crin_%'
ORDER BY
  column_name;

COMMIT;

-- Rollback script (run this if needed to revert):
-- BEGIN;
-- ALTER TABLE components RENAME COLUMN crin_tone TO tone_grade;
-- ALTER TABLE components RENAME COLUMN crin_rank TO crinacle_rank;
-- ALTER TABLE components RENAME COLUMN crin_tech TO technical_grade;
-- ALTER TABLE components RENAME COLUMN crin_value TO value_rating;
-- ALTER TABLE components RENAME COLUMN crin_signature TO crinacle_sound_signature;
-- ALTER TABLE components RENAME COLUMN crin_comments TO crinacle_comments;
-- COMMIT;
