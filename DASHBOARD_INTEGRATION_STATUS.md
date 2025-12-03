# Dashboard Integration Status

## Overview

Created a unified dashboard that integrates Wishlist and Alerts features alongside the existing Gear collection management.

## What's Been Built ✅

### 1. New Unified Dashboard (`/dashboard-new`)
- **Tab-based navigation** with 5 tabs:
  - Overview - Summary stats and quick actions
  - My Gear - Collection management (placeholder, links to existing /gear page)
  - Wishlist - Fully integrated ✓
  - Price Alerts - (placeholder, links to existing /alerts page)
  - Stacks - (placeholder, links to existing /gear?view=stacks page)

### 2. Wishlist Tab Component (`/components/dashboard/WishlistTab.tsx`)
- **Fully functional** - Extracted from standalone wishlist page
- Shows wishlist items in grid layout
- "Find Used" and wishlist toggle buttons
- Empty state with CTAs
- Integrated seamlessly into dashboard

### 3. Overview Tab
- Quick stats cards (Collection, Wishlist, Alerts, Total Value)
- Quick actions (Find Recommendations, Browse Used Market, Create Alert)
- Recent activity section (placeholder)

## What Still Needs Work 🔨

### High Priority

1. **Alerts Tab Component**
   - Extract alerts content from `/app/alerts/page.tsx`
   - Create `/components/dashboard/AlertsTab.tsx`
   - Integrate into dashboard

2. **Gear Tab Integration**
   - Current `/dashboard` page is 1393 lines (very complex)
   - Options:
     - A) Extract gear management logic into reusable component
     - B) Keep /dashboard separate, use /dashboard-new for overview
     - C) Redirect /dashboard?tab=gear to /gear page

3. **API Endpoint for Overview Stats**
   - Extend `/api/user/dashboard` or create new endpoint
   - Return counts for:
     - Collection items count
     - Wishlist items count
     - Active alerts count
     - Total collection value
   - Wire up to Overview tab

### Medium Priority

4. **Navigation Updates**
   - Update UserMenu to show dashboard tabs instead of separate pages
   - Update DesktopNav to remove standalone Wishlist/Alerts links
   - Add badges showing counts (e.g., "3 new alerts")

5. **URL Routing**
   - Currently uses `/dashboard-new?tab=wishlist`
   - Should be `/dashboard?tab=wishlist`
   - Need to migrate or redirect old `/dashboard` to new structure

6. **Recent Activity Feed**
   - Show recent wishlist additions
   - Show recent alert triggers
   - Show recent gear additions
   - Combined chronological feed

### Low Priority

7. **Cross-Feature Insights**
   - "3 wishlist items available used" banner
   - Suggest creating alerts for wishlist items
   - Show depreciation trends
   - "Similar to your gear" recommendations

8. **Stacks Tab**
   - Extract stacks view from existing /dashboard
   - Create `/components/dashboard/StacksTab.tsx`

## Current File Structure

```
/src
  /app
    /dashboard/page.tsx          # OLD: Complex 1393-line gear management page
    /dashboard-new/page.tsx      # NEW: Unified dashboard with tabs
    /wishlist/page.tsx           # Standalone page (can deprecate)
    /alerts/page.tsx             # Standalone page (can deprecate)
    /gear/page.tsx               # Duplicate of /dashboard

  /components
    /dashboard
      /WishlistTab.tsx           # ✅ DONE
      /AlertsTab.tsx             # ❌ TODO
      /GearTab.tsx               # ❌ TODO
      /StacksTab.tsx             # ❌ TODO
      /OverviewTab.tsx           # Currently inline, could extract
```

## Migration Strategy

### Option A: Clean Slate (Recommended)
1. Finish building all tab components (Alerts, Gear, Stacks)
2. Replace `/dashboard/page.tsx` with new unified version
3. Redirect `/wishlist` → `/dashboard?tab=wishlist`
4. Redirect `/alerts` → `/dashboard?tab=alerts`
5. Update all navigation links
6. Keep standalone pages for backward compatibility (redirect internally)

**Pros:** Clean, modern, unified experience
**Cons:** More upfront work, potential breaking changes

### Option B: Gradual Migration
1. Keep `/dashboard-new` as experimental
2. Add link in UserMenu to "Try New Dashboard (Beta)"
3. Gradually move users over
4. Monitor feedback
5. Eventually replace old dashboard

**Pros:** Lower risk, gradual rollout
**Cons:** Maintains duplicate code, confusing for users

### Option C: Hybrid Approach
1. Use `/dashboard-new` for Overview tab only (lightweight landing page)
2. Keep existing `/dashboard` as "/gear" page
3. Keep existing `/wishlist` and `/alerts` pages
4. Update navigation to show all 4 as top-level items

**Pros:** Minimal changes, leverage existing work
**Cons:** Doesn't achieve unified dashboard goal

## Recommended Next Steps

1. **Create AlertsTab.tsx component** (1-2 hours)
   - Extract from `/app/alerts/page.tsx`
   - Handle create alert modal
   - Handle active/history sub-tabs

2. **Create API endpoint for overview stats** (30 min)
   - `/api/user/dashboard/stats`
   - Return counts and totals
   - Wire up to Overview tab

3. **Test unified dashboard** (30 min)
   - Verify all tabs work
   - Check authentication flow
   - Test on mobile

4. **Decision point:** Choose migration strategy
   - If Option A: Build remaining tabs
   - If Option B: Ship `/dashboard-new` as beta
   - If Option C: Pivot to lightweight overview only

5. **Update navigation** (1 hour)
   - UserMenu updates
   - DesktopNav updates
   - Add badges/indicators

## Key Benefits of Unified Dashboard

✅ Single source of truth for user data
✅ Reduced navigation clicks (everything in one place)
✅ Better mobile UX (fewer pages to navigate)
✅ Enables cross-feature insights (wishlist items on sale, alert suggestions, etc.)
✅ More cohesive user experience
✅ Professional dashboard UI pattern

## Testing Checklist

- [ ] Overview tab loads with correct stats
- [ ] Wishlist tab shows all wishlist items
- [ ] Alerts tab shows all alerts (once implemented)
- [ ] Gear tab shows collection (once implemented)
- [ ] Stacks tab shows stacks (once implemented)
- [ ] Tab switching works via URL params
- [ ] Tab switching works via button clicks
- [ ] Authentication gates all tabs properly
- [ ] Mobile responsive on all tabs
- [ ] All actions work (add wishlist, create alert, etc.)

## Known Issues

1. **Wishlist refresh after toggle**: WishlistButton needs `onToggle` callback to refresh list
2. **Overview stats are hardcoded to 0**: Need API endpoint
3. **Gear/Alerts/Stacks tabs are placeholders**: Link to old pages temporarily
4. **No recent activity data**: Need to aggregate from multiple tables

## Files to Review

- `/src/app/dashboard-new/page.tsx` - New unified dashboard
- `/src/components/dashboard/WishlistTab.tsx` - Working wishlist integration
- `/src/app/wishlist/page.tsx` - Source for wishlist logic
- `/src/app/alerts/page.tsx` - Source for alerts logic (needs extraction)
- `/src/app/dashboard/page.tsx` - Source for gear/stacks logic (complex, needs refactoring)
