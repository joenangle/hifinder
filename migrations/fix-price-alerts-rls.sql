-- Fix RLS policies on price_alerts
-- Bug: OR user_id IS NOT NULL makes policies open to all authenticated users
-- Fix: Only allow access to own alerts via auth.uid()::TEXT = user_id

DROP POLICY IF EXISTS "Users can view own alerts" ON price_alerts;
DROP POLICY IF EXISTS "Users can update own alerts" ON price_alerts;
DROP POLICY IF EXISTS "Users can delete own alerts" ON price_alerts;
DROP POLICY IF EXISTS "Users can insert own alerts" ON price_alerts;

CREATE POLICY "Users can view own alerts" ON price_alerts
  FOR SELECT USING (auth.uid()::TEXT = user_id);

CREATE POLICY "Users can insert own alerts" ON price_alerts
  FOR INSERT WITH CHECK (auth.uid()::TEXT = user_id);

CREATE POLICY "Users can update own alerts" ON price_alerts
  FOR UPDATE USING (auth.uid()::TEXT = user_id);

CREATE POLICY "Users can delete own alerts" ON price_alerts
  FOR DELETE USING (auth.uid()::TEXT = user_id);
