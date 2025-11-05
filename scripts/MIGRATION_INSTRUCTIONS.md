# Crinacle Column Migration Instructions

## Phase 1: Database Migration (Manual Step Required)

Since this project uses Supabase, ALTER TABLE commands need to be run through the Supabase SQL Editor.

### Steps:

1. **Open Supabase Dashboard:**
   - Go to https://supabase.com/dashboard
   - Select your HiFinder project
   - Navigate to "SQL Editor"

2. **Run this SQL:**

```sql
-- Migration: Rename Crinacle columns to use 'crin_' prefix
-- Date: 2025-11-04

BEGIN;

-- Rename columns
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

-- Show sample
SELECT id, brand, name, crin_tone, crin_tech, crin_rank
FROM components
WHERE crin_tone IS NOT NULL
LIMIT 3;

COMMIT;
```

3. **Verify Success:**
   - You should see 6 columns listed: crin_comments, crin_rank, crin_signature, crin_tech, crin_tone, crin_value
   - Sample components should display with new column names

### Rollback (if needed):

If anything goes wrong, run this to revert:

```sql
BEGIN;

ALTER TABLE components RENAME COLUMN crin_tone TO tone_grade;
ALTER TABLE components RENAME COLUMN crin_rank TO crinacle_rank;
ALTER TABLE components RENAME COLUMN crin_tech TO technical_grade;
ALTER TABLE components RENAME COLUMN crin_value TO value_rating;
ALTER TABLE components RENAME COLUMN crin_signature TO crinacle_sound_signature;
ALTER TABLE components RENAME COLUMN crin_comments TO crinacle_comments;

COMMIT;
```

## Next Steps

After running the migration:
1. Tell Claude "migration complete"
2. Claude will verify by querying the new columns
3. Then proceed to Phase 2 (codebase updates)
