-- Add image_url column to components table
ALTER TABLE components 
ADD COLUMN image_url TEXT;

-- Add comment to describe the column
COMMENT ON COLUMN components.image_url IS 'URL to product image';