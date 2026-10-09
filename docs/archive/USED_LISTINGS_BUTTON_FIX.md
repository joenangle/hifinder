# Fix "Find Used Listings" Button - Implementation Plan

**Status:** Ready to Implement
**Created:** November 4, 2025
**Priority:** Medium (UX improvement)

---

## Problem

Currently, the "Find Used Listings" button appears on all component cards if the `onFindUsed` prop is provided. This is misleading because many components don't have any active used listings in the database.

**Current Behavior:**
- Button shows on every card
- Clicking might show "No listings found" message
- Poor UX - sets false expectations

**Desired Behavior:**
- Button only appears when component has active listings
- Shows listing count: "View 3 Used Listings"
- Better UX - clear what's available

---

## Database Structure

### used_listings Table
```typescript
interface UsedListing {
  id: string
  component_id: string  // Foreign key to components.id
  title: string
  price: number
  condition: string
  is_active: boolean    // Filter by this
  // ... other fields
}
```

**Current Data:**
- 361 total active listings (`is_active = true`)
- Linked to components via `component_id`

---

## Solution Design

### Option 1: Include Listing Count in Component Data (Recommended)

**Pros:**
- Single query, efficient
- No additional API calls
- Count available immediately

**Implementation:**

#### A. Update API Query
File: `src/app/api/recommendations/v2/route.ts` (or wherever components are fetched)

```typescript
// Add LEFT JOIN to count used listings
const { data: components } = await supabase
  .from('components')
  .select(`
    *,
    used_listings_count:used_listings(count)
  `)
  .eq('used_listings.is_active', true)
  // ... other filters

// OR use a subquery approach:
const { data: components } = await supabase
  .from('components')
  .select(`
    *,
    used_listings!inner(id)
  `)
  .eq('used_listings.is_active', true)

// Process to add count
const componentsWithListingCount = components.map(comp => ({
  ...comp,
  usedListingsCount: comp.used_listings?.length || 0
}))
```

#### B. Update TypeScript Interfaces
```typescript
interface AudioComponent {
  // ... existing fields
  usedListingsCount?: number  // NEW
}
```

#### C. Update HeadphoneCard Component
File: `src/components/recommendations/HeadphoneCard.tsx:156-167`

```tsx
{/* Find Used Button - Only show if listings exist */}
{onFindUsed && headphone.usedListingsCount && headphone.usedListingsCount > 0 && (
  <button
    onClick={(e) => {
      e.stopPropagation()
      onFindUsed(headphone.id, `${headphone.brand} ${headphone.name}`)
    }}
    className="mt-3 w-full px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-2"
  >
    <span>🔍</span>
    <span>
      View {headphone.usedListingsCount} Used Listing{headphone.usedListingsCount !== 1 ? 's' : ''}
    </span>
  </button>
)}
```

#### D. Update SignalGearCard Component
File: `src/components/recommendations/SignalGearCard.tsx`

Same pattern as HeadphoneCard.

---

### Option 2: Lazy Load Listing Counts (Alternative)

**Pros:**
- Doesn't bloat initial component query
- Only fetches when needed

**Cons:**
- Additional API call per component
- Potential N+1 query problem
- Loading states needed

**Implementation:** (Skip this unless Option 1 has performance issues)

---

## Detailed Implementation Steps

### Step 1: Update API to Include Listing Counts

```typescript
// Example implementation for v2 recommendations API
const query = supabase
  .from('components')
  .select(`
    *,
    active_listings:used_listings!component_id(
      count
    )
  `, { count: 'exact' })
  .eq('used_listings.is_active', true)
  .in('category', selectedCategories)
  // ... other filters

const { data: rawComponents } = await query

// Transform to include count
const components = rawComponents.map(comp => ({
  ...comp,
  usedListingsCount: comp.active_listings?.[0]?.count || 0,
  active_listings: undefined  // Remove temporary join data
}))
```

### Step 2: Update Interfaces

```typescript
// src/components/recommendations/HeadphoneCard.tsx
interface AudioComponent {
  id: string
  brand: string
  name: string
  // ... existing fields
  usedListingsCount?: number  // Add this
}
```

### Step 3: Update Card Components

**HeadphoneCard.tsx:**
```tsx
{/* Updated button with conditional rendering and count */}
{onFindUsed && headphone.usedListingsCount && headphone.usedListingsCount > 0 && (
  <button
    onClick={(e) => {
      e.stopPropagation()
      onFindUsed(headphone.id, `${headphone.brand} ${headphone.name}`)
    }}
    className="mt-3 w-full px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-2"
  >
    <span>🔍</span>
    <span>View {headphone.usedListingsCount} Used Listing{headphone.usedListingsCount !== 1 ? 's' : ''}</span>
  </button>
)}
```

**SignalGearCard.tsx:**
Apply same pattern.

---

## Enhanced UX Improvements (Optional)

### Show Lowest Price
```tsx
<span>
  View {count} Listings from ${lowestPrice}
</span>
```

### Show Best Deal Badge
```tsx
{hasBelowMarketListing && (
  <span className="ml-2 px-1.5 py-0.5 bg-green-100 text-green-700 text-xs rounded">
    Deal!
  </span>
)}
```

### Listing Quality Indicators
```tsx
<span className="text-xs text-text-tertiary mt-1">
  {excellentConditionCount} excellent · {goodConditionCount} good
</span>
```

---

## Testing Checklist

- [ ] API returns `usedListingsCount` correctly
- [ ] Button hidden when count is 0 or undefined
- [ ] Button shows when count > 0
- [ ] Correct pluralization ("1 Listing" vs "3 Listings")
- [ ] Click behavior unchanged (opens listings modal/page)
- [ ] No performance regression on page load
- [ ] Works for both HeadphoneCard and SignalGearCard
- [ ] TypeScript types updated with no errors

---

## Performance Considerations

### Query Optimization
```sql
-- Ensure index exists for fast counting
CREATE INDEX IF NOT EXISTS idx_used_listings_component_active
ON used_listings(component_id, is_active)
WHERE is_active = true;
```

### Caching Strategy
- Cache listing counts for 15 minutes
- Invalidate when new listings added
- Use API route caching for recommendations

---

## Migration Path

1. **Phase 1:** Update API to include counts (no UI changes yet)
2. **Phase 2:** Test API returns correct counts
3. **Phase 3:** Update card components to use counts
4. **Phase 4:** Deploy and monitor

**Rollback:** Simply remove conditional check, button will show for all components again.

---

## Estimated Effort

- **API query update:** 30 minutes
- **Interface updates:** 15 minutes
- **Card component updates:** 30 minutes
- **Testing:** 30 minutes
- **Total:** ~2 hours

---

## Related Features

- **Used Listings Page:** Separate page showing all listings
- **Price Alerts:** Notify users of good deals
- **Listing Quality Score:** Rank listings by seller reputation + price
- **Direct Purchase Links:** One-click to listing source

---

## Notes

- This improves trust (users see real availability)
- Reduces confusion (no empty states)
- Sets accurate expectations
- Easy to implement (just add count to existing query)
- No breaking changes
