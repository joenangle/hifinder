-- Implement Secure RLS Policies for Service-Role-Only Pattern
-- This script locks down all tables to prevent direct access via anon key
-- All database operations must go through API routes using service role key

-- ============================================
-- 1. USER_GEAR TABLE
-- ============================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Users can view own gear" ON public.user_gear;
DROP POLICY IF EXISTS "Users can insert own gear" ON public.user_gear;
DROP POLICY IF EXISTS "Users can update own gear" ON public.user_gear;
DROP POLICY IF EXISTS "Users can delete own gear" ON public.user_gear;
DROP POLICY IF EXISTS "Allow authenticated reads" ON public.user_gear;
DROP POLICY IF EXISTS "Allow authenticated inserts" ON public.user_gear;
DROP POLICY IF EXISTS "Allow authenticated updates" ON public.user_gear;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON public.user_gear;

-- Create restrictive policy that blocks all anon access
-- Service role key bypasses RLS, so API routes will still work
CREATE POLICY "Block all anon access" ON public.user_gear
  FOR ALL USING (false);

-- ============================================
-- 2. USER_STACKS TABLE
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own stacks" ON public.user_stacks;
DROP POLICY IF EXISTS "Users can insert own stacks" ON public.user_stacks;
DROP POLICY IF EXISTS "Users can update own stacks" ON public.user_stacks;
DROP POLICY IF EXISTS "Users can delete own stacks" ON public.user_stacks;

-- Create restrictive policy
CREATE POLICY "Block all anon access" ON public.user_stacks
  FOR ALL USING (false);

-- ============================================
-- 3. STACK_COMPONENTS TABLE
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view stack components they own" ON public.stack_components;
DROP POLICY IF EXISTS "Users can insert stack components they own" ON public.stack_components;
DROP POLICY IF EXISTS "Users can update stack components they own" ON public.stack_components;
DROP POLICY IF EXISTS "Users can delete stack components they own" ON public.stack_components;

-- Create restrictive policy
CREATE POLICY "Block all anon access" ON public.stack_components
  FOR ALL USING (false);

-- ============================================
-- 4. WISHLISTS TABLE
-- ============================================

-- Check if table exists and has RLS enabled
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wishlists') THEN
    -- Drop any existing policies
    DROP POLICY IF EXISTS "Users can view own wishlist" ON public.wishlists;
    DROP POLICY IF EXISTS "Users can insert own wishlist" ON public.wishlists;
    DROP POLICY IF EXISTS "Users can update own wishlist" ON public.wishlists;
    DROP POLICY IF EXISTS "Users can delete own wishlist" ON public.wishlists;
    
    -- Enable RLS if not already enabled
    ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
    
    -- Create restrictive policy
    CREATE POLICY "Block all anon access" ON public.wishlists
      FOR ALL USING (false);
  END IF;
END $$;

-- ============================================
-- 5. PRICE_ALERTS TABLE
-- ============================================

-- Check if table exists and has RLS enabled
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'price_alerts') THEN
    -- Drop any existing policies
    DROP POLICY IF EXISTS "Users can view own alerts" ON public.price_alerts;
    DROP POLICY IF EXISTS "Users can insert own alerts" ON public.price_alerts;
    DROP POLICY IF EXISTS "Users can update own alerts" ON public.price_alerts;
    DROP POLICY IF EXISTS "Users can delete own alerts" ON public.price_alerts;
    
    -- Enable RLS if not already enabled
    ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
    
    -- Create restrictive policy
    CREATE POLICY "Block all anon access" ON public.price_alerts
      FOR ALL USING (false);
  END IF;
END $$;

-- ============================================
-- 6. ALERT_HISTORY TABLE
-- ============================================

-- Check if table exists and has RLS enabled
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alert_history') THEN
    -- Drop any existing policies
    DROP POLICY IF EXISTS "Users can view own alert history" ON public.alert_history;
    
    -- Enable RLS if not already enabled
    ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;
    
    -- Create restrictive policy
    CREATE POLICY "Block all anon access" ON public.alert_history
      FOR ALL USING (false);
  END IF;
END $$;

-- ============================================
-- 7. PUBLIC READ-ONLY TABLES
-- ============================================

-- These tables should remain publicly readable
-- components, used_listings, etc. are reference data

-- Ensure components table is publicly readable
ALTER TABLE public.components DISABLE ROW LEVEL SECURITY;

-- Ensure used_listings table is publicly readable
ALTER TABLE public.used_listings DISABLE ROW LEVEL SECURITY;

-- ============================================
-- 8. VERIFICATION QUERIES
-- ============================================

-- Check RLS status for all user-specific tables
SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename IN ('user_gear', 'user_stacks', 'stack_components', 'wishlists', 'price_alerts', 'alert_history')
ORDER BY tablename;

-- List all policies on user tables
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
  AND tablename IN ('user_gear', 'user_stacks', 'stack_components', 'wishlists', 'price_alerts', 'alert_history')
ORDER BY tablename, policyname;

-- Test that anon access is blocked (this should return an error when run with anon key)
-- SELECT * FROM user_gear LIMIT 1;

-- ============================================
-- IMPORTANT NOTES
-- ============================================

-- After running this script:
-- 1. All user-specific tables will block anon key access
-- 2. Service role key (used in API routes) will continue to work
-- 3. Frontend must use API routes for all database operations
-- 4. Components and used_listings remain publicly readable
-- 
-- To rollback these changes, run: scripts/rollback-rls-policies.sql