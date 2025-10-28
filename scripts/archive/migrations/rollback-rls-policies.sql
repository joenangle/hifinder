-- Rollback RLS Policies to Previous Permissive State
-- Use this if the secure RLS policies cause issues

-- ============================================
-- 1. USER_GEAR TABLE - Restore Permissive Policies
-- ============================================

-- Drop restrictive policy
DROP POLICY IF EXISTS "Block all anon access" ON public.user_gear;

-- Restore permissive policies (from fix-user-gear-rls.sql)
CREATE POLICY "Allow authenticated reads" ON public.user_gear
  FOR SELECT USING (true);

CREATE POLICY "Allow authenticated inserts" ON public.user_gear
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated updates" ON public.user_gear
  FOR UPDATE USING (true);

CREATE POLICY "Allow authenticated deletes" ON public.user_gear
  FOR DELETE USING (true);

-- ============================================
-- 2. USER_STACKS TABLE - Restore Original Policies
-- ============================================

-- Drop restrictive policy
DROP POLICY IF EXISTS "Block all anon access" ON public.user_stacks;

-- Restore original policies (checking auth.uid() even though it doesn't work with JWT)
CREATE POLICY "Users can view own stacks" ON public.user_stacks
  FOR SELECT USING (user_id = auth.uid() OR true);

CREATE POLICY "Users can insert own stacks" ON public.user_stacks
  FOR INSERT WITH CHECK (user_id = auth.uid() OR true);

CREATE POLICY "Users can update own stacks" ON public.user_stacks
  FOR UPDATE USING (user_id = auth.uid() OR true);

CREATE POLICY "Users can delete own stacks" ON public.user_stacks
  FOR DELETE USING (user_id = auth.uid() OR true);

-- ============================================
-- 3. STACK_COMPONENTS TABLE - Restore Original Policies
-- ============================================

-- Drop restrictive policy
DROP POLICY IF EXISTS "Block all anon access" ON public.stack_components;

-- Restore permissive policies
CREATE POLICY "Users can view stack components they own" ON public.stack_components
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_stacks 
      WHERE user_stacks.id = stack_components.stack_id 
      AND (user_stacks.user_id = auth.uid() OR true)
    )
  );

CREATE POLICY "Users can insert stack components they own" ON public.stack_components
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_stacks 
      WHERE user_stacks.id = stack_components.stack_id 
      AND (user_stacks.user_id = auth.uid() OR true)
    )
  );

CREATE POLICY "Users can update stack components they own" ON public.stack_components
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_stacks 
      WHERE user_stacks.id = stack_components.stack_id 
      AND (user_stacks.user_id = auth.uid() OR true)
    )
  );

CREATE POLICY "Users can delete stack components they own" ON public.stack_components
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_stacks 
      WHERE user_stacks.id = stack_components.stack_id 
      AND (user_stacks.user_id = auth.uid() OR true)
    )
  );

-- ============================================
-- 4. WISHLISTS TABLE
-- ============================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'wishlists') THEN
    -- Drop restrictive policy
    DROP POLICY IF EXISTS "Block all anon access" ON public.wishlists;
    
    -- Restore permissive policies
    CREATE POLICY "Allow authenticated access" ON public.wishlists
      FOR ALL USING (true);
  END IF;
END $$;

-- ============================================
-- 5. PRICE_ALERTS TABLE
-- ============================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'price_alerts') THEN
    -- Drop restrictive policy
    DROP POLICY IF EXISTS "Block all anon access" ON public.price_alerts;
    
    -- Restore permissive policies
    CREATE POLICY "Users can view own alerts" ON public.price_alerts
      FOR SELECT USING (auth.uid()::TEXT = user_id OR user_id IS NOT NULL);
    
    CREATE POLICY "Users can insert own alerts" ON public.price_alerts
      FOR INSERT WITH CHECK (auth.uid()::TEXT = user_id OR user_id IS NOT NULL);
    
    CREATE POLICY "Users can update own alerts" ON public.price_alerts
      FOR UPDATE USING (auth.uid()::TEXT = user_id OR user_id IS NOT NULL);
    
    CREATE POLICY "Users can delete own alerts" ON public.price_alerts
      FOR DELETE USING (auth.uid()::TEXT = user_id OR user_id IS NOT NULL);
  END IF;
END $$;

-- ============================================
-- 6. ALERT_HISTORY TABLE
-- ============================================

DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'alert_history') THEN
    -- Drop restrictive policy
    DROP POLICY IF EXISTS "Block all anon access" ON public.alert_history;
    
    -- Restore read-only policy
    CREATE POLICY "Users can view own alert history" ON public.alert_history
      FOR SELECT USING (auth.uid()::TEXT = user_id OR user_id IS NOT NULL);
  END IF;
END $$;

-- ============================================
-- VERIFICATION
-- ============================================

-- Check that policies are restored
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename IN ('user_gear', 'user_stacks', 'stack_components', 'wishlists', 'price_alerts', 'alert_history')
ORDER BY tablename, policyname;