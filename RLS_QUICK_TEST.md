# RLS Quick Testing Guide

Simple tests to verify the RLS policies are working correctly.

## Test 1: Verify RLS is Enabled (2 minutes)

Open Supabase Dashboard → SQL Editor and run this:

```sql
SELECT tablename, rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('new_component_candidates', 'price_trends');
```

**What you should see:**
```
tablename                    | rls_enabled
-----------------------------+------------
new_component_candidates     | t
price_trends                 | t
```

Both should show `t` (true). If you see `f` (false), the migration didn't apply.

---

## Test 2: Check Policies Were Created (2 minutes)

Run this in SQL Editor:

```sql
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN ('new_component_candidates', 'price_trends')
ORDER BY tablename, policyname;
```

**What you should see (6 policies):**
```
tablename                    | policyname
-----------------------------+--------------------------------------------
new_component_candidates     | Admin can create component candidates
new_component_candidates     | Admin can delete component candidates
new_component_candidates     | Admin can update component candidates
new_component_candidates     | Admin can view all component candidates
price_trends                 | Admin can manage price trends
price_trends                 | Anyone can view price trends
```

If you see all 6, the policies are installed correctly.

---

## Test 3: Admin Dashboard Still Works (1 minute)

This tests that your admin access still works:

1. Open https://hifinder.app/admin in your browser
2. Log in with your admin account (joenangle@gmail.com)
3. Click on the **Component Candidates** tab
4. You should see the list of candidates load normally

**Expected:** Everything works as before - you can view, edit, and approve candidates.

**If this fails:** The RLS policies might be blocking admin access. Check that you're logged in with `joenangle@gmail.com`.

---

## Test 4: Server Scripts Still Work (2 minutes)

Test that the backend scripts can still access the tables:

```bash
# Test the enrichment script
node scripts/enrich-component-candidates.js

# Test the price trends script
node scripts/analyze-price-trends.js
```

**Expected:** Scripts run normally without any permission errors.

**Why this works:** Scripts use the service role key which bypasses RLS.

---

## Test 5: Client-Side Access is Blocked (Optional, 3 minutes)

This verifies that RLS is actually protecting the tables from accidental client-side access.

### Simple Browser Test:

1. Open https://hifinder.app in your browser
2. Open Developer Console (press F12)
3. Go to the **Console** tab
4. Paste this code and press Enter:

```javascript
// Try to access component candidates from the browser
fetch('/api/admin/component-candidates')
  .then(r => r.json())
  .then(data => console.log('Result:', data))
  .catch(err => console.error('Error:', err))
```

**Expected result if NOT logged in as admin:**
```json
{
  "error": "Unauthorized"
}
```

**Expected result if logged in as admin:**
```json
{
  "candidates": [...],
  "total": 123
}
```

This confirms the API-level authentication is still working.

### Advanced Test (Direct Supabase Access):

If you want to test RLS directly, you'd need to use the anon key from the browser, but this is complex and not necessary for basic verification.

---

## Summary: What Success Looks Like

✅ **All tests pass if:**

1. Both tables show `rls_enabled = t`
2. All 6 policies exist
3. Admin dashboard loads and works normally
4. Server scripts run without errors
5. API returns "Unauthorized" when not logged in

**If any test fails:** Check the Troubleshooting section in [RLS_IMPLEMENTATION_GUIDE.md](RLS_IMPLEMENTATION_GUIDE.md) or let me know which test failed.

---

## Quick Rollback (If Needed)

If something broke and you need to revert immediately:

```sql
-- Run this in Supabase SQL Editor to disable RLS
ALTER TABLE new_component_candidates DISABLE ROW LEVEL SECURITY;
ALTER TABLE price_trends DISABLE ROW LEVEL SECURITY;
```

This will restore the original behavior (no RLS protection).

---

## What to Check in Supabase Dashboard

After running the migration, you should also check:

1. Go to **Database** → **Tables**
2. Click on `new_component_candidates`
3. Look for "RLS enabled" status (should show a green checkmark or "Enabled")
4. Click on `price_trends`
5. Same thing - should show RLS enabled

The warning badges about "RLS not enabled" should be gone.

---

## Most Important Test

**The simplest test is this:**

1. Does your admin dashboard still work? ✅
2. Do your scrapers still run? ✅

If yes to both, then the RLS is working correctly and hasn't broken anything. The service role key that your server-side code uses bypasses RLS, so everything should continue working exactly as before.

The RLS policies are there as a **safety net** to prevent accidental client-side exposure in the future.
