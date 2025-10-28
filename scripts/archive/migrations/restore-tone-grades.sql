-- Check if Supabase has point-in-time recovery available
-- This would restore the tone_grade column to before the deletion

-- Option 1: If you have a recent database backup
-- You can restore the tone_grade column from the backup

-- Option 2: Check Supabase dashboard for:
-- 1. Database Backups (usually under Settings > Database)
-- 2. Point-in-time Recovery (if on Pro plan)
-- 3. Activity logs that might show the previous values

-- Option 3: If you have the original import files
-- We can re-import just the tone_grade data

-- To check what data we still have:
SELECT
  name,
  brand,
  tone_grade,
  technical_grade,
  expert_grade_numeric,
  crinacle_comments
FROM components
WHERE expert_grade_numeric IS NOT NULL
  OR tone_grade IS NOT NULL
  OR technical_grade IS NOT NULL
LIMIT 20;

-- The lost data likely contained Crinacle's comments
-- These might be partially preserved in:
-- 1. crinacle_comments column
-- 2. why_recommended column
-- 3. The original CSV import files