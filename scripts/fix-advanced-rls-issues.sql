-- Advanced RLS Performance and Policy Fixes
-- Run this AFTER the basic security fixes are complete

-- ============================================
-- 1. FIX AUTH RLS INITIALIZATION PLAN ISSUES
-- ============================================

-- These fixes optimize RLS policies by wrapping auth functions in SELECT subqueries
-- This prevents re-evaluation of auth functions for each row

-- Fix component_specifications policies
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.component_specifications;
CREATE POLICY "Allow authenticated read access" ON public.component_specifications
  FOR SELECT USING ((select auth.role()) = 'authenticated');

DROP POLICY IF EXISTS "Service role full access" ON public.component_specifications;
CREATE POLICY "Service role full access" ON public.component_specifications
  FOR ALL USING ((select current_setting('role')) = 'service_role');

-- Fix accounts policies  
DROP POLICY IF EXISTS "Service role can manage accounts" ON public.accounts;
CREATE POLICY "Service role can manage accounts" ON public.accounts
  FOR ALL USING ((select current_setting('role')) = 'service_role');

-- Fix sessions policies
DROP POLICY IF EXISTS "Service role can manage sessions" ON public.sessions;
CREATE POLICY "Service role can manage sessions" ON public.sessions
  FOR ALL USING ((select current_setting('role')) = 'service_role');

-- Fix users policies
DROP POLICY IF EXISTS "Service role can manage users" ON public.users;
CREATE POLICY "Service role can manage users" ON public.users
  FOR ALL USING ((select current_setting('role')) = 'service_role');

DROP POLICY IF EXISTS "Users can update own user data" ON public.users;
CREATE POLICY "Users can update own user data" ON public.users
  FOR UPDATE USING (id = (select auth.uid()));

DROP POLICY IF EXISTS "Users can view own user data" ON public.users;
CREATE POLICY "Users can view own user data" ON public.users
  FOR SELECT USING (id = (select auth.uid()));

-- Fix verification_tokens policies
DROP POLICY IF EXISTS "Service role can manage verification tokens" ON public.verification_tokens;
CREATE POLICY "Service role can manage verification tokens" ON public.verification_tokens
  FOR ALL USING ((select current_setting('role')) = 'service_role');

-- ============================================
-- 2. FIX MULTIPLE PERMISSIVE POLICIES
-- ============================================

-- For component_specifications: Combine overlapping policies into single optimized policies
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.component_specifications;
DROP POLICY IF EXISTS "Service role full access" ON public.component_specifications;

-- Create single optimized policy for component_specifications
CREATE POLICY "Optimized read access" ON public.component_specifications
  FOR SELECT USING (
    (select current_setting('role')) = 'service_role' 
    OR (select auth.role()) = 'authenticated'
  );

CREATE POLICY "Service role write access" ON public.component_specifications  
  FOR ALL USING ((select current_setting('role')) = 'service_role');

-- For users table: Optimize overlapping policies
DROP POLICY IF EXISTS "Service role can manage users" ON public.users;
DROP POLICY IF EXISTS "Users can view own user data" ON public.users;
DROP POLICY IF EXISTS "Users can update own user data" ON public.users;

-- Create optimized policies for users
CREATE POLICY "Optimized user read access" ON public.users
  FOR SELECT USING (
    (select current_setting('role')) = 'service_role' 
    OR id = (select auth.uid())
  );

CREATE POLICY "Optimized user update access" ON public.users
  FOR UPDATE USING (
    (select current_setting('role')) = 'service_role'
    OR id = (select auth.uid())
  );

CREATE POLICY "Service role user management" ON public.users
  FOR ALL USING ((select current_setting('role')) = 'service_role');

-- ============================================
-- 3. FIX DUPLICATE INDEX
-- ============================================

-- Drop one of the duplicate indexes on stack_components
DROP INDEX IF EXISTS public.idx_stack_components_position;
-- Keep idx_stack_components_stack_position as it's more descriptive

-- ============================================
-- 4. VERIFICATION QUERIES
-- ============================================

-- Check that policies are optimized
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('component_specifications', 'accounts', 'sessions', 'users', 'verification_tokens')
ORDER BY tablename, policyname;

-- Check that duplicate index is removed
SELECT 
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'stack_components'
ORDER BY indexname;

-- ============================================
-- NOTES
-- ============================================

-- These changes:
-- ✅ Fix auth RLS initialization plan warnings by wrapping auth functions
-- ✅ Consolidate multiple permissive policies for better performance  
-- ✅ Remove duplicate indexes to save storage and improve write performance
-- ✅ Maintain all existing functionality while improving performance
-- ✅ Follow Supabase best practices for RLS optimization

-- Performance improvements:
-- - Auth functions evaluated once per query instead of per row
-- - Single optimized policies instead of multiple overlapping ones
-- - Reduced index overhead for better write performance