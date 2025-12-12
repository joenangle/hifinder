# Deployment Quick Reference - Staging → Main

**Date Prepared:** 2025-12-03
**Status:** ✅ READY - No merge conflicts detected
**Estimated Time:** 35 minutes

---

## Pre-Flight Check ✅

- ✅ Staging branch: Clean, up-to-date with origin
- ✅ Main branch: Clean, ready for merge
- ✅ Merge test: No conflicts detected
- ✅ Migration scripts: All present
  - `scripts/create-wishlists-table.js` (4.9K)
  - `scripts/run-migration-component-candidates.js` (2.2K)
  - `supabase/migrations/20251112_create_component_candidates.sql` (3.7K)
- ✅ Build verified: Staging builds successfully

---

## Quick Command Reference

### Phase 1: Database Migrations (10 min)

```bash
# Execute in project root

# 1. Create wishlists table
node scripts/create-wishlists-table.js

# 2. Create component_candidates table
node scripts/run-migration-component-candidates.js

# 3. Verify tables exist (optional)
# Check in Supabase Dashboard > Database > Tables
```

**Expected Output:**
- "✅ Wishlists table created successfully" or "Table already exists"
- "✅ Component candidates table created successfully"

---

### Phase 2: Merge & Deploy (5 min)

```bash
# 1. Switch to main
git checkout main

# 2. Pull latest (already synced, but good practice)
git pull origin main

# 3. Merge staging
git merge staging --no-ff -m "Merge staging: Critical bug fixes + dashboard improvements"

# 4. Review merge commit
git log --oneline -3

# 5. Push to main
git push origin main
```

**Expected Output:**
- Merge commit created
- Push succeeds
- Vercel auto-deploys

---

### Phase 3: Monitor (5 min)

**Watch Vercel Deploy:**
- Dashboard: https://vercel.com/joenangles-projects/hifinder
- Look for "Building" → "Ready"
- Typical build time: 2-3 minutes

**Check Production:**
```bash
# Quick curl test
curl -I https://hifinder.app

# Should return: HTTP/2 200
```

---

## Critical Testing Checklist

### Must Test (5 min)

**1. Wishlist Flow:**
- [ ] Visit https://hifinder.app/recommendations
- [ ] Log in
- [ ] Click heart on any recommendation
- [ ] Heart should fill orange
- [ ] Visit https://hifinder.app/dashboard?tab=wishlist
- [ ] Wishlist item should appear

**2. Dashboard:**
- [ ] Visit https://hifinder.app/dashboard
- [ ] All tabs should load (Overview, Gear, Wishlist, Alerts, Stacks)
- [ ] No console errors

**3. Redirects:**
- [ ] /wishlist → /dashboard?tab=wishlist ✓
- [ ] /alerts → /dashboard?tab=alerts ✓

**4. Core Features:**
- [ ] /recommendations loads
- [ ] Budget slider works
- [ ] IEM/Cans filter toggles immediately

---

## Rollback Commands (If Needed)

### Quick Revert (Option 1 - Recommended)
```bash
git checkout main
git revert HEAD -m 1
git push origin main
```

### Hard Reset (Option 2 - Nuclear)
```bash
git checkout main
git reset --hard 615e703  # Day 4 Marketplace
git push --force origin main  # ⚠️ DESTRUCTIVE
```

---

## Key Changes Summary

**Critical Bug Fixes:**
- Wishlist RLS policy violation (broken → fixed)
- Component matching algorithm (90% false positives → fixed)
- IEM filter race condition (delayed → immediate)
- Used listings API (counts wrong → corrected)

**New Features:**
- Unified dashboard (/dashboard replaces /wishlist, /alerts, /dashboard-new)
- Component candidates system (admin review interface)
- Vercel Speed Insights integration

**Database Changes:**
- New table: `wishlists` (user wishlist storage)
- New table: `component_candidates` (auto-detected models)

---

## Environment Variables

**No new variables required** ✅

Existing variables still valid:
- `DATABASE_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- All NextAuth variables

---

## Success Indicators

✅ **Deployment Successful If:**
1. Production site loads without errors
2. Wishlist save/remove works
3. Dashboard tabs functional
4. No error spike in logs
5. Build completes in Vercel

🚨 **Rollback If:**
1. Build fails
2. 500 errors on homepage
3. Auth broken
4. Database errors in logs

---

## Post-Deployment Monitoring

**First Hour:**
- [ ] Check Vercel logs for errors
- [ ] Monitor error rate
- [ ] Watch for user reports

**First 24 Hours:**
- [ ] Monitor wishlist usage
- [ ] Check dashboard traffic
- [ ] Review database performance

---

## Contact & Resources

**Full Plan:** `/Users/joe/.claude/plans/parsed-coalescing-spring.md`

**Deployment Checklist:** This file

**Vercel Dashboard:** https://vercel.com/joenangles-projects/hifinder

**Supabase Dashboard:** Check your Supabase project

---

## Notes

- **Merge Conflicts:** None detected ✅
- **Breaking Changes:** None ✅
- **Backward Compatibility:** Maintained via redirects ✅
- **Database Migrations:** Required but safe (IF NOT EXISTS checks)

---

**Last Verified:** 2025-12-03 at deployment prep
**Confidence Level:** 85% - Ready to deploy
