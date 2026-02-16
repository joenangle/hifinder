# RLS Implementation Guide

## Overview

This guide walks through applying RLS policies to `new_component_candidates` and `price_trends` tables to address Supabase security warnings.

**Migration File:** [supabase/migrations/20260113_enable_rls_candidates_trends.sql](supabase/migrations/20260113_enable_rls_candidates_trends.sql)

**Estimated Time:** 15-30 minutes

---

## Step 1: Apply Migration via Supabase Dashboard

### Option A: SQL Editor (Recommended)

1. Open Supabase Dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT_ID
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New query**
4. Copy the contents of `supabase/migrations/20260113_enable_rls_candidates_trends.sql`
5. Paste into the SQL editor
6. Click **Run** (or press Cmd/Ctrl + Enter)
7. Verify success message appears

### Option B: Supabase CLI (if installed)

```bash
# Make sure you're in the project root
cd /Users/joe/hifinder

# Login to Supabase (if not already)
supabase login

# Link to your project (if not already linked)
supabase link --project-ref YOUR_PROJECT_REF

# Apply migration
supabase db push
```

### Option C: Direct psql (if DATABASE_URL is configured)

```bash
psql $DATABASE_URL -f supabase/migrations/20260113_enable_rls_candidates_trends.sql
```

---

## Step 2: Verify RLS Policies

### 2.1 Check RLS is Enabled

Run this query in Supabase SQL Editor:

```sql
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('new_component_candidates', 'price_trends')
ORDER BY tablename;
```

**Expected Result:**
```
tablename                    | rls_enabled
-----------------------------+------------
new_component_candidates     | t
price_trends                 | t
```

### 2.2 List All Policies

```sql
SELECT
  tablename,
  policyname,
  cmd as operation,
  permissive,
  CASE
    WHEN cmd = 'SELECT' THEN 'Read'
    WHEN cmd = 'INSERT' THEN 'Create'
    WHEN cmd = 'UPDATE' THEN 'Update'
    WHEN cmd = 'DELETE' THEN 'Delete'
    WHEN cmd = '*' THEN 'All operations'
    ELSE cmd
  END as description
FROM pg_policies
WHERE tablename IN ('new_component_candidates', 'price_trends')
ORDER BY tablename, cmd;
```

**Expected Result (6 policies total):**

| tablename | policyname | operation | permissive | description |
|-----------|-----------|-----------|------------|-------------|
| new_component_candidates | Admin can delete component candidates | DELETE | PERMISSIVE | Delete |
| new_component_candidates | Admin can create component candidates | INSERT | PERMISSIVE | Create |
| new_component_candidates | Admin can view all component candidates | SELECT | PERMISSIVE | Read |
| new_component_candidates | Admin can update component candidates | UPDATE | PERMISSIVE | Update |
| price_trends | Admin can manage price trends | * | PERMISSIVE | All operations |
| price_trends | Anyone can view price trends | SELECT | PERMISSIVE | Read |

### 2.3 Check Supabase Dashboard Warnings

1. Go to **Database** → **Tables** in Supabase Dashboard
2. Look for `new_component_candidates` and `price_trends`
3. Check if the RLS warning icon/badge is gone
4. Both tables should show "RLS enabled" status

---

## Step 3: Test Access Patterns

### 3.1 Test Server-Side Scripts (Should Still Work)

The service role key bypasses RLS, so all server-side operations should work unchanged:

```bash
# Test component candidates enrichment
node scripts/enrich-component-candidates.js

# Test price trends analysis
node scripts/analyze-price-trends.js

# Test Reddit scraper (creates candidates)
node scripts/reddit-avexchange-scraper-v3.js
```

**Expected:** All scripts run without errors, no permission issues.

### 3.2 Test Admin API Routes

You'll need to be logged in as the admin user for these tests.

**Option A: Via Browser (easiest)**

1. Open https://hifinder.app/admin in your browser
2. Log in with `joenangle@gmail.com`
3. Navigate to **Component Candidates** tab
4. Verify the list loads and you can view/edit/approve candidates

**Expected:** Admin dashboard works normally, all CRUD operations succeed.

**Option B: Via curl (if you have session token)**

```bash
# Get your session token from browser cookies (next-auth.session-token)
# Then test the API:

curl https://hifinder.app/api/admin/component-candidates \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN_HERE"
```

**Expected:** Returns 200 with candidate data (not 401/403).

### 3.3 Test Client-Side Blocking (Should Fail)

This test confirms RLS is protecting against accidental client-side access.

1. Open https://hifinder.app in your browser
2. Open **Developer Console** (F12 or Cmd+Option+I)
3. Paste this code (even when logged in as admin):

```javascript
// Import the client-side Supabase instance
const { createClient } = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm')

// Create client with anon key (simulating client-side access)
const supabase = createClient(
  'YOUR_SUPABASE_URL',
  'YOUR_SUPABASE_ANON_KEY'
)

// Try to read component candidates (should fail)
const { data, error } = await supabase
  .from('new_component_candidates')
  .select('*')

console.log('Data:', data)
console.log('Error:', error)
```

**Expected Error:**
```javascript
{
  code: "42501",
  message: "new row violates row-level security policy for table \"new_component_candidates\"",
  details: null,
  hint: null
}
```

**Alternative Test (simpler):**

If you have a "use client" component that tries to access these tables directly, it should fail with RLS error. This is the desired behavior.

---

## Step 4: Monitor for Issues

### First 24 Hours After Deployment

Watch for:

1. **Server script failures** - Check GitHub Actions logs for scraper jobs
2. **Admin dashboard errors** - Test CRUD operations
3. **API route 403 errors** - Monitor Vercel logs
4. **Performance degradation** - RLS policies shouldn't impact performance (indexed fields)

### Monitoring Queries

```sql
-- Check RLS policy usage stats (PostgreSQL 13+)
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles
FROM pg_policies
WHERE tablename IN ('new_component_candidates', 'price_trends');

-- Check for any auth errors in logs
-- (Run in Supabase Dashboard → Logs → Postgres Logs)
```

---

## Rollback Plan (If Needed)

If you encounter unexpected issues, you can quickly disable RLS:

### Emergency Rollback

```sql
-- Disable RLS on both tables (reverts to pre-migration state)
ALTER TABLE new_component_candidates DISABLE ROW LEVEL SECURITY;
ALTER TABLE price_trends DISABLE ROW LEVEL SECURITY;
```

This will restore the original behavior while you investigate issues.

### Partial Rollback (Drop Specific Policies)

If only one policy is problematic:

```sql
-- List all policies
SELECT policyname, tablename FROM pg_policies
WHERE tablename IN ('new_component_candidates', 'price_trends');

-- Drop specific policy
DROP POLICY "Policy Name Here" ON table_name;

-- Example: Drop the admin candidates policy
DROP POLICY "Admin can view all component candidates" ON new_component_candidates;
```

### Full Migration Reversal

```sql
-- Drop all policies
DROP POLICY "Admin can view all component candidates" ON new_component_candidates;
DROP POLICY "Admin can create component candidates" ON new_component_candidates;
DROP POLICY "Admin can update component candidates" ON new_component_candidates;
DROP POLICY "Admin can delete component candidates" ON new_component_candidates;
DROP POLICY "Anyone can view price trends" ON price_trends;
DROP POLICY "Admin can manage price trends" ON price_trends;

-- Disable RLS
ALTER TABLE new_component_candidates DISABLE ROW LEVEL SECURITY;
ALTER TABLE price_trends DISABLE ROW LEVEL SECURITY;
```

---

## Troubleshooting

### Issue: "permission denied for table" errors in scripts

**Cause:** Scripts are using wrong Supabase client (anon key instead of service role key)

**Fix:** Verify all server-side scripts use:
```javascript
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // ← Must use service role key
)
```

### Issue: Admin API routes return 403 Forbidden

**Cause:** NextAuth session email doesn't match policy (`joenangle@gmail.com`)

**Fix:**
1. Check `auth.jwt() ->> 'email'` returns correct email
2. Verify you're logged in with the correct account
3. Run this query to debug:

```sql
SELECT auth.jwt() ->> 'email' as current_user_email;
```

### Issue: "row-level security policy violation" in admin dashboard

**Cause:** Admin dashboard is accidentally using client-side Supabase client

**Fix:** Ensure all admin API routes use `supabaseServer` from `@/lib/supabase-server`

```typescript
// ✅ Correct
import { supabaseServer } from '@/lib/supabase-server'

// ❌ Wrong (would trigger RLS)
import { supabase } from '@/lib/supabase-client'
```

### Issue: Can't view price trends in frontend

**Cause:** RLS policy blocks client-side reads (if using restrictive policy)

**Fix:** Change to public read policy:
```sql
DROP POLICY "Price trends server-side only" ON price_trends;

CREATE POLICY "Anyone can view price trends"
  ON price_trends FOR SELECT
  USING (true);
```

---

## Verification Checklist

After completing all steps, confirm:

- [ ] RLS enabled on `new_component_candidates` (verify via `pg_tables` query)
- [ ] RLS enabled on `price_trends` (verify via `pg_tables` query)
- [ ] 6 policies created (4 for candidates, 2 for trends)
- [ ] Supabase dashboard warnings cleared
- [ ] Admin API routes return 200 for authenticated requests (test via `/admin` page)
- [ ] Server-side scripts run without errors (test `enrich-component-candidates.js`)
- [ ] Client-side access blocked for `new_component_candidates` (test via browser console)
- [ ] Price trends accessible for public read (when recommendations API integration happens)
- [ ] No performance degradation observed

---

## Success Criteria

✅ **Implementation is successful when:**

1. Supabase no longer shows RLS warnings for these tables
2. All existing functionality works unchanged (admin dashboard, scrapers, scripts)
3. Accidental client-side access is blocked with clear error messages
4. Server-side code using service role key is unaffected

---

## Next Steps (Optional Enhancements)

After successful RLS implementation, consider:

1. **Centralize admin auth** - Create `is_admin()` function (see plan for details)
2. **Add role-based access** - Use NextAuth custom claims instead of hardcoded email
3. **Audit logging** - Track RLS policy violations for security monitoring
4. **Extend RLS to other tables** - Apply similar policies to `components`, `used_listings` if needed

---

## Questions or Issues?

If you encounter problems during implementation:

1. Check the rollback plan above for emergency fixes
2. Review the troubleshooting section
3. Check Supabase logs (Dashboard → Logs → Postgres Logs)
4. Verify environment variables are set correctly

**Remember:** Service role key access bypasses all RLS policies, so server-side code should continue working exactly as before.
