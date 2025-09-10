-- Complete Security Fixes for Supabase Linter
-- Run this script AFTER Postgres upgrade completes
-- Copy and paste into Supabase Dashboard > SQL Editor

-- ============================================
-- 1. PUBLIC TABLE RLS POLICIES
-- ============================================

-- Fix: Components table RLS
ALTER TABLE public.components ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.components;
CREATE POLICY "Allow public read access" ON public.components 
  FOR SELECT USING (true);

-- Fix: Used listings table RLS  
ALTER TABLE public.used_listings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read access" ON public.used_listings;
CREATE POLICY "Allow public read access" ON public.used_listings 
  FOR SELECT USING (true);

-- ============================================
-- 2. CONFIGURATIONS TABLE RLS POLICY
-- ============================================

-- Fix: Configurations table missing policy
DROP POLICY IF EXISTS "Allow public read access" ON public.configurations;
CREATE POLICY "Allow public read access" ON public.configurations 
  FOR SELECT USING (true);

-- ============================================
-- 3. FUNCTION SEARCH PATH FIXES
-- ============================================

-- Fix: Function search path mutable warnings
ALTER FUNCTION public.calculate_power_requirements 
SET search_path = public, pg_temp;

ALTER FUNCTION public.update_user_gear_updated_at 
SET search_path = public, pg_temp;

ALTER FUNCTION public.update_component_power_on_spec_change 
SET search_path = public, pg_temp;

ALTER FUNCTION public.update_updated_at_column 
SET search_path = public, pg_temp;

-- ============================================
-- 4. VERIFICATION QUERIES
-- ============================================

-- Verify RLS is enabled on all public tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('components', 'used_listings', 'configurations')
ORDER BY tablename;

-- Verify policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('components', 'used_listings', 'configurations')
ORDER BY tablename, policyname;

-- Verify function search paths are set
SELECT 
  proname as function_name,
  proconfig as search_path_config
FROM pg_proc 
WHERE proname IN (
  'calculate_power_requirements',
  'update_user_gear_updated_at', 
  'update_component_power_on_spec_change',
  'update_updated_at_column'
)
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- ============================================
-- EXPECTED RESULTS AFTER RUNNING THIS SCRIPT
-- ============================================

-- ✅ All Supabase security linter errors should be resolved
-- ✅ Public tables remain accessible to anonymous users  
-- ✅ User tables remain secured with API-only access
-- ✅ Functions have secure search paths
-- ✅ Application functionality is preserved

-- This script addresses these specific linter warnings:
-- - rls_disabled_in_public (components & used_listings)
-- - rls_enabled_no_policy (configurations)
-- - function_search_path_mutable (4 functions)
-- - Plus the Postgres version upgrade that's currently in progress