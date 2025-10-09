-- Add ASR review URL column to components table
-- Run this in Supabase SQL Editor

ALTER TABLE components
ADD COLUMN IF NOT EXISTS asr_review_url TEXT;

-- Add comment
COMMENT ON COLUMN components.asr_review_url IS 'Link to Audio Science Review forum thread';

-- Verify the column was added
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'components' AND column_name = 'asr_review_url';
