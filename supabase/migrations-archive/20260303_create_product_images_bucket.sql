-- Create product-images storage bucket for component product photos
-- Note: Supabase Storage buckets are created via the API/dashboard.
-- This migration sets up the RLS policies for the bucket once it exists.

-- Allow public read access to product images
CREATE POLICY "Public read access for product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Allow service role to upload/manage images
CREATE POLICY "Service role can manage product images"
ON storage.objects FOR ALL
USING (bucket_id = 'product-images')
WITH CHECK (bucket_id = 'product-images');
