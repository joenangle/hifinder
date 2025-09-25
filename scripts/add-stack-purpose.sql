-- Add purpose and is_primary columns to user_stacks table
ALTER TABLE user_stacks
ADD COLUMN IF NOT EXISTS purpose VARCHAR(50),
ADD COLUMN IF NOT EXISTS is_primary BOOLEAN DEFAULT FALSE;

-- Add comment to explain purpose values
COMMENT ON COLUMN user_stacks.purpose IS 'Purpose of the stack: desktop, portable, studio, gaming, office, general';
COMMENT ON COLUMN user_stacks.is_primary IS 'Whether this is the primary stack for its purpose category';

-- Update existing stacks with inferred purpose based on name
UPDATE user_stacks
SET purpose = CASE
  WHEN LOWER(name) LIKE '%desktop%' OR LOWER(name) LIKE '%desk%' THEN 'desktop'
  WHEN LOWER(name) LIKE '%portable%' OR LOWER(name) LIKE '%mobile%' OR LOWER(name) LIKE '%travel%' THEN 'portable'
  WHEN LOWER(name) LIKE '%studio%' OR LOWER(name) LIKE '%production%' THEN 'studio'
  WHEN LOWER(name) LIKE '%gaming%' OR LOWER(name) LIKE '%game%' THEN 'gaming'
  WHEN LOWER(name) LIKE '%office%' OR LOWER(name) LIKE '%work%' THEN 'office'
  ELSE 'general'
END
WHERE purpose IS NULL;

-- Set primary stacks (first stack per purpose per user)
WITH ranked_stacks AS (
  SELECT
    id,
    user_id,
    purpose,
    ROW_NUMBER() OVER (PARTITION BY user_id, purpose ORDER BY created_at ASC) as rn
  FROM user_stacks
  WHERE purpose IS NOT NULL
)
UPDATE user_stacks
SET is_primary = TRUE
FROM ranked_stacks
WHERE user_stacks.id = ranked_stacks.id
  AND ranked_stacks.rn = 1;