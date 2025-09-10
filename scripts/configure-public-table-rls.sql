-- Configure RLS for public reference tables
-- This satisfies Supabase's security linter while keeping tables publicly readable

-- ============================================
-- 1. COMPONENTS TABLE - Public read access
-- ============================================

-- Enable RLS on components table
ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;

-- Create policy allowing public read access
CREATE POLICY "Allow public read access" ON public.components
  FOR SELECT USING (true);

-- ============================================
-- 2. USED_LISTINGS TABLE - Public read access
-- ============================================

-- Enable RLS on used_listings table
ALTER TABLE public.used_listings ENABLE ROW LEVEL SECURITY;

-- Create policy allowing public read access
CREATE POLICY "Allow public read access" ON public.used_listings
  FOR SELECT USING (true);

-- ============================================
-- 3. VERIFICATION QUERIES
-- ============================================

-- Verify RLS is enabled
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('components', 'used_listings')
ORDER BY tablename;

-- List policies on public tables
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('components', 'used_listings')
ORDER BY tablename, policyname;

-- ============================================
-- NOTES
-- ============================================

-- This configuration:
-- ✅ Enables RLS to satisfy Supabase linter
-- ✅ Allows public read access via permissive policies
-- ✅ Maintains backward compatibility
-- ✅ Keeps reference data publicly accessible
-- 
-- These tables contain non-sensitive reference data:
-- - components: Audio equipment specifications
-- - used_listings: Public marketplace listings
-- 
-- Both should remain publicly readable for the application to function.