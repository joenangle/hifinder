-- Add image_url column to components table
ALTER TABLE components ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Update Moondrop Variations with the image URL
UPDATE components 
SET image_url = 'https://moondroplab.com/cdn-cgi/image/format=avif,quality=90/https://cdn.prod.website-files.com/627128d862c9a44234848dda/643f7dabe8ef29848e3d7550_DM_20230419133519_045.JPEG'
WHERE brand = 'Moondrop' AND name ILIKE '%variations%';