-- Fix RLS policy on alert_history
-- Bug: OR user_id IS NOT NULL made every row readable with the public anon key
--      (same bug fix-price-alerts-rls.sql fixed for price_alerts).
-- Fix: Only allow access to own history via auth.uid()::TEXT = user_id.
-- App access goes through session-scoped API routes using the service role.
--
-- Apply: npm run db -- -f migrations/fix-alert-history-rls.sql

BEGIN;

DROP POLICY IF EXISTS "Users can view own alert history" ON alert_history;

CREATE POLICY "Users can view own alert history" ON alert_history
  FOR SELECT USING (auth.uid()::TEXT = user_id);

COMMIT;
