-- Fix Overlapping RLS Policies - Final Cleanup
-- This fixes the remaining multiple permissive policy warnings

-- ============================================
-- 1. FIX COMPONENT_SPECIFICATIONS OVERLAPPING POLICIES
-- ============================================

-- Remove all existing policies
DROP POLICY IF EXISTS "Optimized read access" ON public.component_specifications;
DROP POLICY IF EXISTS "Service role write access" ON public.component_specifications;

-- Create single comprehensive policy for component_specifications
CREATE POLICY "Complete access policy" ON public.component_specifications
  FOR ALL USING (
    (select current_setting('role')) = 'service_role' 
    OR (select auth.role()) = 'authenticated'
  );

-- ============================================
-- 2. FIX USERS TABLE OVERLAPPING POLICIES  
-- ============================================

-- Remove all existing policies
DROP POLICY IF EXISTS "Optimized user read access" ON public.users;
DROP POLICY IF EXISTS "Optimized user update access" ON public.users; 
DROP POLICY IF EXISTS "Service role user management" ON public.users;

-- Create separate non-overlapping policies for users table
CREATE POLICY "Service role full access" ON public.users
  FOR ALL USING ((select current_setting('role')) = 'service_role');

CREATE POLICY "User self access" ON public.users
  FOR SELECT USING (
    (select current_setting('role')) != 'service_role' 
    AND id = (select auth.uid())
  );

CREATE POLICY "User self update" ON public.users
  FOR UPDATE USING (
    (select current_setting('role')) != 'service_role'
    AND id = (select auth.uid())
  );

-- ============================================
-- 3. VERIFICATION QUERY
-- ============================================

-- Check that we now have clean, non-overlapping policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('component_specifications', 'users')
ORDER BY tablename, policyname;

-- ============================================
-- EXPLANATION
-- ============================================

-- The key fix here is using RESTRICTIVE conditions to prevent overlap:
-- 
-- For component_specifications:
-- - Single policy handles both service role and authenticated users
-- 
-- For users table:
-- - Service role gets full access
-- - Regular users get access ONLY when NOT service role AND they own the record
-- - This prevents the policies from overlapping for any given role

-- This should eliminate all "multiple permissive policies" warnings
-- while maintaining the same functional access patterns.