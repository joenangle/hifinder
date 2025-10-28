-- Database schema updates for v2 recommendations API
-- Run these in your Supabase SQL editor

-- 1. Add expert_grade_numeric column for pre-computed numeric grades
ALTER TABLE components
ADD COLUMN IF NOT EXISTS expert_grade_numeric DECIMAL(3,2);

-- 2. Add power output column for amplifiers
ALTER TABLE components
ADD COLUMN IF NOT EXISTS power_output TEXT;

-- 3. Add ASR SINAD measurement column
ALTER TABLE components
ADD COLUMN IF NOT EXISTS asr_sinad DECIMAL(5,2);

-- 4. Add power requirements columns for headphones
ALTER TABLE components
ADD COLUMN IF NOT EXISTS power_required_mw DECIMAL(8,2);

ALTER TABLE components
ADD COLUMN IF NOT EXISTS voltage_required_v DECIMAL(5,2);

-- 5. Add sensitivity column for headphones
ALTER TABLE components
ADD COLUMN IF NOT EXISTS sensitivity DECIMAL(5,1);

-- 6. Create index on expert_grade_numeric for faster queries
CREATE INDEX IF NOT EXISTS idx_components_expert_grade_numeric
ON components(expert_grade_numeric);

-- 7. Create index on value_rating for faster queries
CREATE INDEX IF NOT EXISTS idx_components_value_rating
ON components(value_rating);

-- 8. Create index on category and price for budget allocation
CREATE INDEX IF NOT EXISTS idx_components_category_price
ON components(category, price_used_min, price_used_max);

-- 9. Update expert_grade_numeric from tone_grade (where valid)
UPDATE components
SET expert_grade_numeric =
  CASE
    WHEN tone_grade = 'S+' THEN 4.3
    WHEN tone_grade = 'S' THEN 4.0
    WHEN tone_grade = 'S-' THEN 3.7
    WHEN tone_grade = 'A+' THEN 4.0
    WHEN tone_grade = 'A' THEN 3.7
    WHEN tone_grade = 'A-' THEN 3.3
    WHEN tone_grade = 'B+' THEN 3.0
    WHEN tone_grade = 'B' THEN 2.7
    WHEN tone_grade = 'B-' THEN 2.3
    WHEN tone_grade = 'C+' THEN 2.0
    WHEN tone_grade = 'C' THEN 1.7
    WHEN tone_grade = 'C-' THEN 1.3
    WHEN tone_grade = 'D+' THEN 1.0
    WHEN tone_grade = 'D' THEN 0.7
    WHEN tone_grade = 'D-' THEN 0.3
    WHEN tone_grade = 'F' THEN 0
    ELSE NULL
  END
WHERE tone_grade IS NOT NULL
  AND tone_grade IN ('S+', 'S', 'S-', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F');

-- 10. Verify the updates
SELECT
  category,
  COUNT(*) as total,
  COUNT(expert_grade_numeric) as with_grades,
  AVG(expert_grade_numeric) as avg_grade
FROM components
GROUP BY category
ORDER BY category;