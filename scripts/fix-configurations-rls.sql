-- Fix RLS policy for public.configurations table
-- This table appears to be for application configuration data

-- ============================================
-- CONFIGURATIONS TABLE RLS POLICY
-- ============================================

-- First, let's understand what this table contains
-- (This is informational - you can run this separately to see the structure)
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'configurations' AND table_schema = 'public';

-- Create appropriate policy based on what configurations typically contain
-- Option A: If it's public configuration data (app settings, constants, etc.)
DROP POLICY IF EXISTS "Allow public read access" ON public.configurations;
CREATE POLICY "Allow public read access" ON public.configurations 
  FOR SELECT USING (true);

-- Option B: If it's admin-only configuration (uncomment if needed instead of Option A)
-- DROP POLICY IF EXISTS "Service role access only" ON public.configurations;
-- CREATE POLICY "Service role access only" ON public.configurations 
--   FOR ALL USING (current_user = 'service_role');

-- Option C: If it's user-specific configuration (uncomment if needed instead of Option A)  
-- DROP POLICY IF EXISTS "Users can access own config" ON public.configurations;
-- CREATE POLICY "Users can access own config" ON public.configurations
--   FOR ALL USING (auth.uid() = user_id);

-- ============================================
-- VERIFICATION
-- ============================================

-- Check the policy was created
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
  AND tablename = 'configurations';

-- ============================================
-- NOTES
-- ============================================

-- The default policy above (Option A) allows public read access
-- This is appropriate for:
-- - App configuration settings
-- - Public constants
-- - Feature flags
-- - Non-sensitive application data

-- If the configurations table contains sensitive data:
-- 1. Use Option B (service role only) for admin configs
-- 2. Use Option C for user-specific configs  
-- 3. Create custom policies based on specific needs