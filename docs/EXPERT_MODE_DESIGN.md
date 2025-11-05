# Expert Mode Sound Signature Filters - Design Document

**Status:** Planned for Future Implementation
**Created:** November 4, 2025
**Priority:** Medium (Enhancement feature after critical bugs resolved)

---

## Overview

Add an expert mode toggle that allows power users to filter by detailed Crinacle sound signatures (25+ options) instead of the basic 4-category system (neutral, warm, bright, fun).

## Problem Statement

Currently, users can only filter by 4 basic sound signatures. However, the database stores detailed Crinacle signatures like "Bright U-shape", "Harman neutral", "Mild V-shape" in the `crin_signature` column. Power users and enthusiasts would benefit from granular control over signature matching.

## Dual-Layer Architecture (Already Implemented)

### Basic Layer - `sound_signature` column
- **Values:** `bright`, `fun`, `neutral`, `warm`
- **Purpose:** Beginner-friendly filtering, broad matching
- **Coverage:** All 579 components have this field
- **Database constraint:** Only these 4 values allowed

### Detailed Layer - `crin_signature` column
- **Values:** 25+ detailed signatures ("Bright U-shape", "Harman neutral", etc.)
- **Purpose:** Expert-level precision filtering
- **Coverage:** ~390 components with Crinacle data
- **No constraint:** Free-form text from Crinacle's taxonomy

### Mapping (Completed in Part 1)
File: `scripts/merge-crinacle-cans.js:206-250`

All 25 CSV signatures now correctly map to the 4 basic categories:
- Neutral family: 10 signatures
- Warm family: 5 signatures
- Bright family: 2 signatures
- Fun family: 8 signatures

---

## Feature Design

### UI Components

#### 1. Mode Toggle Button
**Location:** Above sound signature filters in FiltersSection

```tsx
<div className="flex items-center gap-2 mb-2">
  <button
    onClick={() => setExpertMode(false)}
    className={!expertMode ? 'mode-toggle-active' : 'mode-toggle-inactive'}
  >
    Basic
  </button>
  <button
    onClick={() => setExpertMode(true)}
    className={expertMode ? 'mode-toggle-active' : 'mode-toggle-inactive'}
  >
    Expert Mode
  </button>
  <Tooltip content="Expert mode shows detailed Crinacle sound signatures for precise filtering">
    <span className="text-text-tertiary">ℹ️</span>
  </Tooltip>
</div>
```

#### 2. Basic Mode Filters (Current Implementation)
**Rows:** 1
**Columns:** 4 buttons (Neutral, Warm, Bright, Fun)
**Counts:** From `sound_signature` aggregation

```
⚖️ Neutral (127)  🔥 Warm (89)  ✨ Bright (45)  🎉 V-Shaped (98)
```

#### 3. Expert Mode Filters (New Implementation)
**Rows:** ~6 (responsive grid wrapping)
**Columns:** Variable (auto-grid)
**Counts:** From `crin_signature` aggregation
**Filter:** Only show signatures present in current filtered result set

```tsx
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
  {detailedSignatures.map(sig => (
    <FilterButton
      key={sig.name}
      active={selectedSignatures.includes(sig.name)}
      onClick={() => onDetailedSignatureChange(sig.name)}
      label={sig.name}
      count={sig.count}
      activeClass="active-expert"
    />
  ))}
</div>
```

**Example Layout:**
```
☐ Bright U-shape (12)      ☐ Harman neutral (23)      ☐ Neutral (45)
☐ Bright V-shape (8)       ☐ Mild V-shape (34)        ☐ Neutral with bass boost (18)
☐ Bright neutral (45)      ☐ U-shaped (31)            ☐ V-shaped (28)
☐ Dark (7)                 ☐ Warm (42)                ☐ Warm V-shape (15)
☐ Dark neutral (12)        ☐ Warm neutral (31)        ☐ W-shaped (3)
... (only signatures in current results)
```

---

## Technical Implementation

### 1. State Management

#### Local State (FiltersSection.tsx)
```tsx
const [expertMode, setExpertMode] = useState(false)
const [selectedDetailedSignatures, setSelectedDetailedSignatures] = useState<string[]>([])

// Persist mode preference
useEffect(() => {
  const saved = localStorage.getItem('soundSignatureMode')
  if (saved) setExpertMode(saved === 'expert')
}, [])

useEffect(() => {
  localStorage.setItem('soundSignatureMode', expertMode ? 'expert' : 'basic')
}, [expertMode])
```

#### URL Parameters
- **Basic mode:** `?sig=neutral,warm`
- **Expert mode:** `?crin_sig=Bright+U-shape,Harman+neutral`

### 2. API Changes

#### A. Filter Counts Query
File: `src/app/api/recommendations/v2/route.ts`

Add new query to aggregate `crin_signature` counts:

```typescript
// Existing basic signature counts
const { data: basicCounts } = await supabase
  .from('components')
  .select('sound_signature')
  .in('category', categories)
  // ... other filters

// NEW: Detailed signature counts (only in expert mode or pre-fetch)
const { data: detailedCounts } = await supabase
  .from('components')
  .select('crin_signature')
  .in('category', categories)
  .not('crin_signature', 'is', null)
  // ... other filters

// Aggregate counts
const signatureCounts = detailedCounts?.reduce((acc, item) => {
  if (item.crin_signature) {
    acc[item.crin_signature] = (acc[item.crin_signature] || 0) + 1
  }
  return acc
}, {} as Record<string, number>)
```

#### B. Filtering Logic
```typescript
// Basic mode (existing)
if (basicSignatures?.length > 0) {
  query = query.in('sound_signature', basicSignatures)
}

// Expert mode (new)
if (detailedSignatures?.length > 0) {
  query = query.in('crin_signature', detailedSignatures)
}
```

### 3. Interface Updates

#### FilterCounts Interface
```typescript
interface FilterCounts {
  sound: {
    // Basic mode
    neutral: number
    warm: number
    bright: number
    fun: number

    // Expert mode (new)
    detailed?: Record<string, number>  // Dynamic keys for all crin_signatures
  }
  equipment: { /* ... */ }
}
```

#### Props for FiltersSection
```typescript
interface FiltersSectionProps {
  // Existing props...
  soundFilters: string[]  // Basic signatures

  // New props
  expertMode?: boolean
  detailedSignatureFilters?: string[]  // Detailed signatures
  onExpertModeToggle?: (enabled: boolean) => void
  onDetailedSignatureChange?: (signature: string) => void
}
```

### 4. Parent Component Integration

File: `src/app/recommendations/page.tsx` (or wherever FiltersSection is used)

```typescript
const [expertMode, setExpertMode] = useState(false)
const [detailedSignatures, setDetailedSignatures] = useState<string[]>([])

// Update URL params based on mode
useEffect(() => {
  const params = new URLSearchParams(window.location.search)

  if (expertMode) {
    params.delete('sig')  // Remove basic
    if (detailedSignatures.length > 0) {
      params.set('crin_sig', detailedSignatures.join(','))
    }
  } else {
    params.delete('crin_sig')  // Remove expert
    if (soundFilters.length > 0) {
      params.set('sig', soundFilters.join(','))
    }
  }

  // Update URL without reload
  window.history.replaceState({}, '', `?${params.toString()}`)
}, [expertMode, detailedSignatures, soundFilters])
```

---

## Styling

### CSS Classes (add to `tailwind.config.js` or CSS file)

```css
/* Mode toggle buttons */
.mode-toggle-active {
  @apply px-3 py-1 bg-accent-primary text-white rounded-md font-medium;
}

.mode-toggle-inactive {
  @apply px-3 py-1 bg-surface-secondary text-text-secondary rounded-md hover:bg-surface-hover;
}

/* Expert mode filter button active state */
.active-expert {
  @apply bg-purple-500 dark:bg-purple-600 text-white;
}
```

---

## User Experience Flow

### Scenario 1: Beginner User (Default)
1. Opens recommendations page → Basic mode active (default)
2. Sees 4 simple signature options: Neutral, Warm, Bright, V-Shaped
3. Selects "V-Shaped" → Results filtered by `sound_signature = 'fun'`
4. Simple, unintimidating interface

### Scenario 2: Enthusiast Discovers Expert Mode
1. Sees "Expert Mode" toggle with info tooltip
2. Clicks toggle → UI expands to show 25+ detailed signatures
3. Sees "Bright U-shape (12)" and "Mild V-shape (34)"
4. Selects multiple detailed signatures → Results filtered by `crin_signature IN (...)`
5. Gets precise control over signature matching
6. Mode preference saved in localStorage for next visit

### Scenario 3: Power User Returns
1. Opens recommendations page → Expert mode auto-enabled (from localStorage)
2. Immediately sees detailed signature grid
3. Applies complex filters like "Harman neutral OR Bright neutral"
4. URL reflects expert mode selections: `?crin_sig=Harman+neutral,Bright+neutral`
5. Can share URL with other experts

---

## Edge Cases & Considerations

### 1. Components Without Detailed Signatures
- **Problem:** 189 components don't have `crin_signature` data
- **Solution:** In expert mode, show "Unknown Signature" option that filters by `crin_signature IS NULL`

### 2. Mode Switching
- **Problem:** User toggles from expert → basic with selections
- **Solution:** Clear detailed selections, show suggestion: "Your expert filters have been converted to basic categories"

### 3. Mobile Responsiveness
- **Problem:** 25+ buttons might overflow on mobile
- **Solution:** Use responsive grid (1-2 cols on mobile, 3-4 on desktop), scrollable container

### 4. Filter Combination Logic
- **Basic mode:** OR logic (show items matching ANY selected signature)
- **Expert mode:** OR logic (show items matching ANY selected detailed signature)
- **Consistency:** Both modes use OR for intuitive "show me items like this OR like that" UX

### 5. Performance
- **Optimization:** Only fetch detailed counts when expert mode is activated (lazy load)
- **Caching:** Cache detailed counts for 5 minutes to avoid repeated queries

---

## Testing Checklist

- [ ] Toggle between basic and expert mode
- [ ] Verify localStorage persistence across sessions
- [ ] URL params update correctly in both modes
- [ ] Filter counts accurate in both modes
- [ ] Results correctly filtered by basic vs detailed signatures
- [ ] Mode switching clears incompatible selections
- [ ] Mobile layout responsive (1-2 cols)
- [ ] Desktop layout optimal (3-4 cols)
- [ ] Tooltip shows helpful info for expert mode
- [ ] "Unknown Signature" option works for components without crin_signature
- [ ] Verify no performance regression on basic mode

---

## Future Enhancements

1. **Signature Descriptions:** Hover tooltips explaining each detailed signature
2. **Signature Visualization:** Frequency response graphs for each signature
3. **Signature Comparison:** Side-by-side comparison of selected signatures
4. **Smart Suggestions:** "Users who liked 'Bright U-shape' also liked..."
5. **Custom Signatures:** Allow users to create custom signature combinations

---

## Files to Modify

1. **`src/components/recommendations/FiltersSection.tsx`**
   - Add mode toggle UI
   - Add expert mode filter grid
   - Handle state and localStorage

2. **`src/app/api/recommendations/v2/route.ts`**
   - Add `crin_signature` aggregation query
   - Add detailed signature filtering logic
   - Update response to include detailed counts

3. **`src/app/recommendations/page.tsx`** (parent component)
   - Add expert mode state management
   - Handle URL parameter updates
   - Pass new props to FiltersSection

4. **`src/lib/tooltips.ts`** (optional)
   - Add tooltip content for expert mode features

5. **CSS/Tailwind**
   - Add styling for mode toggle and expert buttons

---

## Estimated Effort

- **Design & Planning:** 1 hour ✅ (This document)
- **Backend API changes:** 2 hours
- **Frontend UI implementation:** 3 hours
- **State management & URL handling:** 1 hour
- **Testing & polish:** 2 hours
- **Total:** ~9 hours

---

## Related Work

- ✅ Part 1 completed: Comprehensive signature mapping (390 components, 0 errors)
- ✅ Dual-layer architecture in place (`sound_signature` + `crin_signature`)
- ✅ All 25 CSV signatures mapped to 4 basic categories
- 🔄 Part 2 pending: Expert mode UI implementation (this document)

---

## Notes

- This feature leverages existing database structure (no migrations needed)
- Backward compatible (basic mode remains default)
- Progressive enhancement pattern (advanced users opt-in)
- Data quality: 390/579 components (67%) have detailed signatures
- Zero performance impact on basic mode users
