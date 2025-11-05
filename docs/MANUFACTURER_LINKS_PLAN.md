# Manufacturer Product Page Links - Implementation Plan

**Status:** Requires Database Migration
**Created:** November 4, 2025
**Priority:** Medium (Enhancement after DB migration)

---

## Overview

Add clickable links next to component names that take users to the manufacturer's official product page for detailed specifications and purchasing information.

## Current State

Database has URL fields for:
- ✅ `amazon_url` - Affiliate links
- ✅ `asr_review_url` - ASR review links
- ✅ `image_url` - Product images
- ❌ `manufacturer_url` - **MISSING** (needs to be added)

---

## Required Database Migration

### Step 1: Add Column via Supabase SQL Editor

```sql
-- Add manufacturer_url column to components table
ALTER TABLE components
ADD COLUMN manufacturer_url TEXT;

-- Add index for faster queries (optional but recommended)
CREATE INDEX idx_components_manufacturer_url
ON components(manufacturer_url)
WHERE manufacturer_url IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN components.manufacturer_url IS
'Official manufacturer product page URL for detailed specifications';
```

### Step 2: Verify Migration

```sql
-- Check column was added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'components'
  AND column_name = 'manufacturer_url';

-- Check a few rows
SELECT id, brand, name, manufacturer_url
FROM components
LIMIT 5;
```

---

## Data Population Strategy

### Option 1: Manual Curation (High Quality, Time-Intensive)
Research and manually add manufacturer URLs for top components:
1. Start with components that have high view counts / popularity
2. Focus on brands with good product pages (Sennheiser, Hifiman, Moondrop, etc.)
3. Add ~50-100 most popular items first

### Option 2: Semi-Automated Script (Medium Quality, Faster)
Create script to generate likely URLs based on brand patterns:

```javascript
// scripts/generate-manufacturer-urls.js
const manufacturerPatterns = {
  'Sennheiser': (name) => `https://www.sennheiser.com/en-us/${name.toLowerCase().replace(/\s+/g, '-')}`,
  'Hifiman': (name) => `https://hifiman.com/products/detail/${name.toLowerCase().replace(/\s+/g, '-')}`,
  'Moondrop': (name) => `https://www.moondroplab.com/en/product/${name.toLowerCase()}`,
  'Audio-Technica': (name) => `https://www.audio-technica.com/en-us/headphones/${name.toLowerCase()}`,
  'Beyerdynamic': (name) => `https://www.beyerdynamic.com/products/${name.toLowerCase().replace(/\s+/g, '-')}`,
  // ... add more patterns
};

// Generate URLs, then manually verify with HEAD requests
```

### Option 3: Hybrid Approach (Recommended)
1. Use semi-automated script to generate candidates
2. Verify top 100 components manually
3. Add remaining via script with validation checks
4. Mark confidence level in a separate column if needed

---

## UI Implementation

### HeadphoneCard Component

Add external link icon next to component name:

```tsx
{/* Name (Brand + Model) and Price on same line */}
<div className="flex items-baseline justify-between mb-1">
  <div className="flex items-center gap-2">
    <h3 className="font-semibold text-lg text-text-primary dark:text-text-primary">
      {headphone.brand} {headphone.name}
    </h3>
    {headphone.manufacturer_url && (
      <a
        href={headphone.manufacturer_url}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()} // Prevent card selection
        className="text-text-tertiary hover:text-accent-primary transition-colors"
        title="View on manufacturer website"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
        </svg>
      </a>
    )}
  </div>
  {/* ... price display ... */}
</div>
```

### Visual Design
- **Icon:** External link icon (arrow pointing out of box)
- **Size:** Small (w-4 h-4, ~16px)
- **Color:** Subtle gray, becomes blue/orange on hover
- **Position:** Immediately after component name
- **Interaction:** Opens in new tab, doesn't trigger card selection

---

## Analytics Tracking (Optional)

Track clicks for popularity insights:

```typescript
onClick={(e) => {
  e.stopPropagation()

  // Track event
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'manufacturer_link_click', {
      component_id: headphone.id,
      component_name: `${headphone.brand} ${headphone.name}`,
      source: 'headphone_card'
    })
  }

  window.open(headphone.manufacturer_url, '_blank')
}}
```

---

## Testing Checklist

- [ ] Database column added successfully
- [ ] Can query manufacturer_url from API
- [ ] External link icon displays correctly
- [ ] Link opens in new tab
- [ ] Click doesn't trigger card selection
- [ ] Icon hidden when manufacturer_url is null
- [ ] Hover state works (color change)
- [ ] Accessible (proper aria-labels)
- [ ] Mobile responsive
- [ ] Works with dark mode

---

## Estimated Effort

- **Database migration:** 15 minutes
- **Data population (top 100):** 2-3 hours
- **UI implementation:** 1 hour
- **Testing & polish:** 30 minutes
- **Total:** ~4-5 hours

---

## Priority Brands for Initial Population

Based on popularity and data quality:

**Headphones:**
1. Sennheiser (HD600, HD650, HD800, HD560S, HD660S)
2. Hifiman (Sundara, Ananda, HE400i, Arya, Susvara)
3. Beyerdynamic (DT770, DT880, DT990, DT1990)
4. Audio-Technica (ATH-M50x, ATH-R70x, ATH-M40x)
5. AKG (K371, K702, K712 Pro)

**IEMs:**
1. Moondrop (Blessing 2, Aria, Chu, Variations, Kato)
2. 7Hz (Timeless, Salnotes Zero)
3. Thieaudio (Oracle, Monarch, Clairvoyance)
4. Etymotic (ER2XR, ER4XR)
5. Sennheiser (IE900, IE600, IE300)

---

## Future Enhancements

1. **Review Links:** Add links to professional reviews (ASR, Crinacle, etc.)
2. **Where to Buy:** Multiple retailer links (Amazon, Drop, Audio46)
3. **Price Tracking:** Show price history and alerts
4. **Comparison Tool:** "Compare on manufacturer site" button

---

## Dependencies

- ✅ Database migration completed
- ✅ URL data populated (at least for top components)
- ✅ TypeScript interfaces updated to include `manufacturer_url`
- ✅ API route returning new field

---

## Notes

- This feature enhances trust (official source for specs)
- Helps users make informed purchase decisions
- Low implementation complexity once data is populated
- Can be rolled out incrementally (start with popular items)
