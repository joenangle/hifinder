-- Update components table to support new categories
-- Run this in Supabase SQL Editor

-- First, check current constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'components'::regclass 
AND contype = 'c';

-- Drop the existing check constraint on category
ALTER TABLE components 
DROP CONSTRAINT IF EXISTS components_category_check;

-- Add new check constraint with expanded categories
ALTER TABLE components 
ADD CONSTRAINT components_category_check 
CHECK (category IN ('cans', 'iems', 'dac', 'amp', 'dac_amp', 'cable'));

-- Optionally: Update existing 'headphones' entries to 'cans' if any exist
UPDATE components 
SET category = 'cans' 
WHERE category = 'headphones';

-- Verify the change
SELECT DISTINCT category, COUNT(*) 
FROM components 
GROUP BY category 
ORDER BY category;