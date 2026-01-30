# Bundle Handling - Phase 2 Summary

**Added to:** USED_LISTINGS_MATCHING_IMPROVEMENT_PLAN.md
**Date:** 2026-01-28
**Priority:** CRITICAL - Moved to Phase 2 (before validation)

## The Problem

Currently, bundle listings like `"[WTS] HD600 + Focal Clear MG - $800"` are handled poorly:

```javascript
// Current behavior
{
  component_id: "HD600",      // ❌ Only first match
  is_bundle: true,
  component_count: 2,         // System knows it's a bundle...
  price: 800                  // ...but can't split it properly
}
```

**Result:**
- ❌ Focal Clear MG not discoverable (users can't search for it)
- ❌ Price validation FAILS ($800 for HD600 looks 200% overpriced)
- ❌ ~20-30% of Reddit listings are bundles → significant data loss

## The Solution (Phase 2)

### Extract multiple components and create linked listings:

```javascript
// New behavior - creates 2 listings
Listing 1:
  component_id: HD600
  bundle_group_id: "bundle_abc123"
  bundle_total_price: 800
  price: null                  // Individual price unknown
  bundle_position: 1 of 2

Listing 2:
  component_id: Focal Clear MG
  bundle_group_id: "bundle_abc123"
  bundle_total_price: 800
  price: null
  bundle_position: 2 of 2
```

**Result:**
- ✅ Both components discoverable by search
- ✅ Price validation handles bundles (skips null individual prices)
- ✅ Users can see full bundle context via bundle_group_id

---

## Implementation Details

### 2.1 Multi-Component Extraction

**New file:** `scripts/bundle-extractor.js`

**Key functions:**
- `splitBundleSegments(text)` - Splits "HD600 + Clear MG" into ["HD600", "Clear MG"]
- `extractBundleComponents(title, description)` - Matches each segment independently
- `generateBundleGroupId()` - Creates unique ID for linking bundle listings
- `calculateBundlePrice(total, count)` - Returns { individual_price: null, bundle_total_price: 800 }

---

### 2.2 Database Schema Changes

**New migration:** `supabase/migrations/20260128_add_bundle_tracking.sql`

**New columns:**
```sql
bundle_group_id TEXT              -- Links related listings
bundle_total_price INTEGER        -- Total for entire bundle
bundle_component_count INTEGER    -- How many components in bundle
bundle_position INTEGER           -- This component's position (1 of 3)
matched_segment TEXT              -- Text that matched this component
```

**Critical constraint change:**
```sql
-- OLD: unique(url) - prevents multiple components per post
-- NEW: unique(url, component_id) - allows multiple components per post
```

---

### 2.3 Scraper Integration

**Modified:** `scripts/reddit-avexchange-scraper-v3.js` (line 429-470)

**Flow:**
```
1. Detect bundle: "HD600 + Clear MG"
2. Split into segments: ["HD600", "Clear MG"]
3. Match each segment:
   - findComponentMatch("HD600") → HD 600 (score 0.92)
   - findComponentMatch("Clear MG") → Focal Clear MG (score 0.85)
4. Generate bundle_group_id
5. Create 2 listings with shared bundle_group_id
6. Upsert with (url, component_id) as unique key
```

---

### 2.4 Edge Cases Handled

**Partial matches:**
```
"HD600 + mystery IEM + cable - $600"
→ Creates 1 listing for HD600, marks as bundle with estimated count=3
```

**Accessories in bundle:**
```
"HD600 + original cable + case - $250"
→ Cable/case filtered by isAccessoryOnly()
→ Creates 1 listing for HD600 only
```

**Duplicate components:**
```
"2x HD600 (black and silver) - $400"
→ Deduplicates, creates 1 listing with quantity: 2
```

---

## Why Phase 2 (Before Validation)?

**Validation (Phase 3) needs bundles to work properly:**

```javascript
// Phase 3: validatePrice()
if (isBundle && !price && bundleTotalPrice) {
  return { valid: true, note: 'Bundle - individual price unknown' };
}
```

Without Phase 2, validation would:
- ❌ Reject bundles as overpriced
- ❌ Flag legitimate listings for manual review
- ❌ Create noise in validation reports

**With Phase 2 → Phase 3 sequence:**
- ✅ Bundles extracted as multiple listings
- ✅ Validation handles null individual prices
- ✅ Price checks work for single items
- ✅ Bundle context preserved for display

---

## Expected Impact

### Before Phase 2:
- Bundle discoverability: 50% (only primary component found)
- Price validation accuracy: 60% (bundles look overpriced)
- Data completeness: ~70% (missing secondary components)

### After Phase 2:
- Bundle discoverability: 95% (all components searchable)
- Price validation accuracy: 90% (bundles handled properly)
- Data completeness: ~95% (multi-component extraction)

---

## Testing Strategy

**Test cases to add (Phase 5.1):**
1. Simple 2-component bundle: "HD600 + HD650"
2. Complex 3+ bundle: "HD600 + Clear MG + Arya"
3. Mixed brands: "Sennheiser HD600 + Focal Clear MG"
4. Partial match: "HD600 + unknown IEM"
5. Accessory bundle: "HD600 + cable + case"
6. Duplicate items: "2x HD600"
7. Ambiguous separator: "HD600 w/ Focal Clear MG"

**Success criteria:**
- 90%+ of bundle components correctly extracted
- No duplicate listings for same component in same post
- bundle_group_id correctly links related listings
- Price validation doesn't flag bundles

---

## Sprint 2 Deliverables (Week 2)

- [ ] `scripts/bundle-extractor.js` created
- [ ] `supabase/migrations/20260128_add_bundle_tracking.sql` applied
- [ ] `scripts/reddit-avexchange-scraper-v3.js` updated with bundle integration
- [ ] Unique constraint changed to (url, component_id)
- [ ] Edge case handling implemented
- [ ] Bundle test cases created
- [ ] Manual testing on 20+ sample bundle listings

---

## Frontend Display (Future)

**Component detail page:**
```
Sennheiser HD 600

Used Listings (3):
1. $250 - Single listing
2. Part of 2-item bundle - $800 total
   Bundle includes: HD 600 + Focal Clear MG
   [View on Reddit]
3. $300 - Single listing
```

**Filter/sort considerations:**
- Allow filtering: "Show bundles only" or "Exclude bundles"
- Sort by: Individual price (nulls last), Bundle total price
- Visual indicator: Bundle icon/badge

---

## Rollback Plan

If Phase 2 causes issues:

1. **Database rollback:**
   ```sql
   DROP INDEX IF EXISTS idx_used_listings_bundle_group;
   ALTER TABLE used_listings DROP CONSTRAINT used_listings_url_component_unique;
   ALTER TABLE used_listings ADD CONSTRAINT used_listings_url_key UNIQUE (url);
   ```

2. **Code rollback:**
   - Git revert bundle-extractor.js creation
   - Git revert scraper integration changes
   - Restore old single-match behavior

3. **Data cleanup:**
   - Delete duplicate listings where same URL appears multiple times
   - Keep listing with highest match confidence

---

## Success Metrics

| Metric | Before | After (Target) |
|--------|--------|----------------|
| Bundle component discovery | 50% | 95% |
| Price validation false positives | 40% | <5% |
| Listings per bundle post | 1 | 1.8 avg (multi-component) |
| User complaints about missing items | ~5/week | <1/week |

---

**Ready for implementation in Sprint 2 (Week 2)**
