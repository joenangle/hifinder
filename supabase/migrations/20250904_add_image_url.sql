-- Add image_url column to components table if it doesn't exist
ALTER TABLE components ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add index for faster queries if we query by image_url
CREATE INDEX IF NOT EXISTS idx_components_image_url ON components(image_url) WHERE image_url IS NOT NULL;

-- Add comment to describe the column
COMMENT ON COLUMN components.image_url IS 'URL to product image for display in UI';