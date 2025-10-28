-- SQL to fix Supabase security linter RLS errors
-- Copy and paste this into Supabase Dashboard > SQL Editor

-- ============================================
-- Fix: RLS Disabled in Public - Components Table  
-- ============================================
ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.components;
CREATE POLICY "Allow public read access" ON public.components 
  FOR SELECT USING (true);

-- ============================================
-- Fix: RLS Disabled in Public - Used Listings Table
-- ============================================
ALTER TABLE public.used_listings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.used_listings;
CREATE POLICY "Allow public read access" ON public.used_listings 
  FOR SELECT USING (true);

-- ============================================
-- Verification Queries (optional)
-- ============================================

-- Check RLS status
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('components', 'used_listings')
ORDER BY tablename;

-- Check policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('components', 'used_listings')
ORDER BY tablename, policyname;