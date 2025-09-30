-- HiFinder Recommendation Engine v2 Schema Updates
-- ================================================
-- Run this in Supabase SQL Editor to add new columns

-- 1. Add power output columns for amplifiers
ALTER TABLE components
ADD COLUMN IF NOT EXISTS power_output_32ohm TEXT,
ADD COLUMN IF NOT EXISTS power_output_300ohm TEXT,
ADD COLUMN IF NOT EXISTS power_output_600ohm TEXT;

-- 2. Add expert grade numeric conversion column
ALTER TABLE components
ADD COLUMN IF NOT EXISTS expert_grade_numeric DECIMAL(3,2);

-- 3. Add ASR SINAD performance metric
ALTER TABLE components
ADD COLUMN IF NOT EXISTS asr_sinad INTEGER;

-- 4. Add sensitivity column for headphones/IEMs (if not exists)
ALTER TABLE components
ADD COLUMN IF NOT EXISTS sensitivity DECIMAL(5,2);

-- 5. Add data source tracking
ALTER TABLE components
ADD COLUMN IF NOT EXISTS data_source TEXT;

-- 6. Add scraped_at timestamp for tracking data freshness
ALTER TABLE components
ADD COLUMN IF NOT EXISTS scraped_at TIMESTAMP;

-- 7. Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_components_category ON components(category);
CREATE INDEX IF NOT EXISTS idx_components_price_range ON components(price_used_min, price_used_max);
CREATE INDEX IF NOT EXISTS idx_components_value_rating ON components(value_rating);
CREATE INDEX IF NOT EXISTS idx_components_expert_grades ON components(tone_grade, technical_grade);
CREATE INDEX IF NOT EXISTS idx_components_impedance ON components(impedance);

-- 8. Clean up corrupted tone_grade data
-- First, let's see what corrupted data looks like
SELECT id, name, brand, tone_grade
FROM components
WHERE tone_grade IS NOT NULL
  AND LENGTH(tone_grade) > 3
LIMIT 20;

-- Update corrupted tone_grade entries (text snippets) to NULL
-- We'll manually review and fix these later
UPDATE components
SET tone_grade = NULL
WHERE tone_grade IS NOT NULL
  AND LENGTH(tone_grade) > 3;

-- 9. Populate expert_grade_numeric from existing letter grades
UPDATE components
SET expert_grade_numeric = CASE
  WHEN technical_grade = 'S+' THEN 1.00
  WHEN technical_grade = 'S' THEN 0.95
  WHEN technical_grade = 'S-' THEN 0.90
  WHEN technical_grade = 'A+' THEN 0.85
  WHEN technical_grade = 'A' THEN 0.80
  WHEN technical_grade = 'A-' THEN 0.75
  WHEN technical_grade = 'B+' THEN 0.70
  WHEN technical_grade = 'B' THEN 0.65
  WHEN technical_grade = 'B-' THEN 0.60
  WHEN technical_grade = 'C+' THEN 0.55
  WHEN technical_grade = 'C' THEN 0.50
  WHEN technical_grade = 'C-' THEN 0.45
  WHEN technical_grade = 'D' THEN 0.40
  WHEN technical_grade = 'F' THEN 0.20
  ELSE NULL
END
WHERE technical_grade IS NOT NULL
  AND LENGTH(technical_grade) <= 3;

-- For components with both technical and tone grades, average them
UPDATE components
SET expert_grade_numeric = (
  CASE
    WHEN technical_grade = 'S+' THEN 1.00
    WHEN technical_grade = 'S' THEN 0.95
    WHEN technical_grade = 'S-' THEN 0.90
    WHEN technical_grade = 'A+' THEN 0.85
    WHEN technical_grade = 'A' THEN 0.80
    WHEN technical_grade = 'A-' THEN 0.75
    WHEN technical_grade = 'B+' THEN 0.70
    WHEN technical_grade = 'B' THEN 0.65
    WHEN technical_grade = 'B-' THEN 0.60
    WHEN technical_grade = 'C+' THEN 0.55
    WHEN technical_grade = 'C' THEN 0.50
    WHEN technical_grade = 'C-' THEN 0.45
    WHEN technical_grade = 'D' THEN 0.40
    WHEN technical_grade = 'F' THEN 0.20
    ELSE 0
  END +
  CASE
    WHEN tone_grade = 'S+' THEN 1.00
    WHEN tone_grade = 'S' THEN 0.95
    WHEN tone_grade = 'S-' THEN 0.90
    WHEN tone_grade = 'A+' THEN 0.85
    WHEN tone_grade = 'A' THEN 0.80
    WHEN tone_grade = 'A-' THEN 0.75
    WHEN tone_grade = 'B+' THEN 0.70
    WHEN tone_grade = 'B' THEN 0.65
    WHEN tone_grade = 'B-' THEN 0.60
    WHEN tone_grade = 'C+' THEN 0.55
    WHEN tone_grade = 'C' THEN 0.50
    WHEN tone_grade = 'C-' THEN 0.45
    WHEN tone_grade = 'D' THEN 0.40
    WHEN tone_grade = 'F' THEN 0.20
    ELSE 0
  END
) / 2
WHERE technical_grade IS NOT NULL
  AND tone_grade IS NOT NULL
  AND LENGTH(technical_grade) <= 3
  AND LENGTH(tone_grade) <= 3;

-- 10. Verify the updates
SELECT
  COUNT(*) as total_components,
  COUNT(power_output_32ohm) as amps_with_power_32,
  COUNT(power_output_300ohm) as amps_with_power_300,
  COUNT(expert_grade_numeric) as with_numeric_grade,
  COUNT(asr_sinad) as with_sinad,
  COUNT(sensitivity) as with_sensitivity
FROM components;

-- 11. Check value rating distribution
SELECT
  value_rating,
  COUNT(*) as count
FROM components
WHERE value_rating IS NOT NULL
GROUP BY value_rating
ORDER BY value_rating;

-- 12. Check categories and counts
SELECT
  category,
  COUNT(*) as count,
  AVG(price_used_min) as avg_min_price,
  AVG(price_used_max) as avg_max_price
FROM components
GROUP BY category
ORDER BY count DESC;