# Used Listings Scraper - Name Matching & Extraction Fixes: Implementation Plan

**Created:** 2026-01-28
**Status:** Ready for Implementation
**Priority:** HIGH - Critical user-reported bugs

## Executive Summary

The HiFinder used listings scraper (V3) has a sophisticated matching system but suffers from false positives where listings are incorrectly matched to components that aren't actually being sold.

### Confirmed Problems

1. **Generic Word Matches** - "Space Audio Space II" matched 3 listings, NONE actually selling this component:
   - "Xenns Top Pro, Fosi Audio K7" - matched on "Audio" + "space" in unrelated context
   - "Rega Planar 2 turntable" - matched on generic words
   - "Penon Fan3 w Space Cable" - "Space" in cable description

2. **Bundle Listings Only Match ONE Component** ⭐ CRITICAL - "HD600 + Focal Clear MG - $800" creates single listing:
   - Only HD600 matched, Focal Clear MG not discoverable
   - Price validation fails ($800 looks overpriced for single HD600)
   - ~20-30% of Reddit listings are bundles (significant data loss)

3. **Price Extraction Complete Failure** - 100% failure rate in tested sample (10/10 expensive listings had $0 price)

4. **No Post-Match Validation** - Severe mismatches (>300% price difference) go undetected

5. **Insufficient Test Coverage** - Only 5 test cases, missing critical edge cases

---

## Phase 1: Immediate Fixes (High Impact, Low Risk)

### 1.1 Generic Name Penalties ⭐ CRITICAL

**Problem:** Words like "space", "audio", "pro" are too common and match unrelated text.

**Solution:** Penalize components with generic brand/model names in scoring algorithm.

**Implementation:**

Add to [component-matcher-enhanced.js](scripts/component-matcher-enhanced.js):

```javascript
// After line 129
const GENERIC_WORDS = [
  'space', 'audio', 'pro', 'lite', 'plus', 'mini', 'max', 'ultra',
  'one', 'two', 'three', 'air', 'go', 'se', 'ex', 'dx'
];

function calculateGenericnessPenalty(brand, name) {
  let penalty = 0;

  const brandWords = brand.toLowerCase().split(/\s+/);
  const nameWords = name.toLowerCase().split(/\s+/);

  // -15% per generic word in brand
  for (const word of brandWords) {
    if (GENERIC_WORDS.includes(word) && word.length <= 5) {
      penalty += 0.15;
    }
  }

  // -10% per generic word in model
  for (const word of nameWords) {
    if (GENERIC_WORDS.includes(word) && word.length <= 5) {
      penalty += 0.10;
    }
  }

  // Extra -10% if BOTH brand and model are short
  if (brand.length <= 10 && name.length <= 10) {
    penalty += 0.10;
  }

  return Math.min(penalty, 0.4); // Cap at -40%
}

// Modify calculateMatchScore() to apply penalty after line 314
score = Math.max(0, score - calculateGenericnessPenalty(brand, name));
```

**Expected Impact:** "Space Audio Space II" score drops from 0.75 to 0.35, falling below 0.7 threshold - match rejected.

**Files Modified:**
- `scripts/component-matcher-enhanced.js` (add function after line 129, modify calculateMatchScore around line 314)

---

### 1.2 Context-Aware Position Scoring ⭐ CRITICAL

**Problem:** "Penon Fan3 w Space Cable" matches "Space Audio" because position in text is ignored.

**Solution:** Bonus for matches in title/[H] section, penalty for matches near "with", "w/", "cable".

**Implementation:**

Add to [component-matcher-enhanced.js](scripts/component-matcher-enhanced.js):

```javascript
function calculatePositionScore(text, brand, name, title) {
  const titleLower = title.toLowerCase();

  // +20% if brand AND model in title
  const brandInTitle = titleLower.includes(brand.toLowerCase());
  const nameInTitle = titleLower.includes(name.toLowerCase());

  if (brandInTitle && nameInTitle) return 0.2;
  if (brandInTitle || nameInTitle) return 0.1;

  // -30% if match is near accessory context
  const accessoryPattern = /\b(with|w\/|w\s|cable|case|comes with|includes)\s+/gi;
  const beforeMatchText = text.substring(
    Math.max(0, text.indexOf(brand.toLowerCase()) - 20),
    text.indexOf(brand.toLowerCase())
  );

  if (accessoryPattern.test(beforeMatchText)) {
    return -0.3; // Likely accessory mention
  }

  return 0;
}

// Modify calculateMatchScore() signature to accept title
function calculateMatchScore(text, component, source = '', title = '') {
  // ... existing scoring ...

  // Apply position bonus (add before final return)
  score = Math.max(0, Math.min(1.0, score + calculatePositionScore(text, brand, name, title)));

  return Math.min(score, 1.0);
}

// Update findComponentMatch() to pass title (line 264)
const score = calculateMatchScore(text, component, source, title);
```

**Expected Impact:** "w Space Cable" context detected, -30% penalty prevents false match.

**Files Modified:**
- `scripts/component-matcher-enhanced.js` (add calculatePositionScore function, modify calculateMatchScore signature and calls)

---

### 1.3 Fix Price Extraction ⭐ CRITICAL

**Problem:** 100% failure rate - regex doesn't handle "$550 PayPal", "200$ Shipped", "asking $1,200".

**Solution:** Multiple regex patterns with priority order, better format support.

**Implementation:**

Replace `extractPrice()` in [reddit-avexchange-scraper-v3.js](scripts/reddit-avexchange-scraper-v3.js) (around line 252):

```javascript
function extractPrice(title, selftext = '') {
  const combinedText = title + ' ' + (selftext || '');

  // Pattern 1: $X,XXX or $XXX (highest priority)
  const dollarPattern = /\$(\d{1,5}(?:,\d{3})*(?:\.\d{2})?)/g;

  // Pattern 2: asking/price/selling $XXX
  const askingPattern = /\b(?:asking|price:?|selling\s*(?:for|at)?)\s*\$?(\d{1,5}(?:,\d{3})*)/gi;

  // Pattern 3: XXX shipped / XXX obo
  const shippedPattern = /\b(\d{3,5})\s*(?:shipped|obo|or best offer|firm)\b/gi;

  // Pattern 4: XXX USD
  const currencyPattern = /\b(\d{3,5})\s*(?:usd|dollars?)\b/gi;

  const allPrices = [];

  // Extract with priority 1
  let match;
  while ((match = dollarPattern.exec(combinedText)) !== null) {
    const price = parseInt(match[1].replace(/,/g, ''), 10);
    if (price >= 10 && price <= 10000) {
      allPrices.push({ price, priority: 1 });
    }
  }

  // Extract with priority 2
  while ((match = askingPattern.exec(combinedText)) !== null) {
    const price = parseInt(match[1].replace(/,/g, ''), 10);
    if (price >= 10 && price <= 10000) {
      allPrices.push({ price, priority: 2 });
    }
  }

  // Extract with priority 3
  while ((match = shippedPattern.exec(combinedText)) !== null) {
    const price = parseInt(match[1], 10);
    if (price >= 10 && price <= 10000) {
      allPrices.push({ price, priority: 3 });
    }
  }

  // Extract with priority 4
  while ((match = currencyPattern.exec(combinedText)) !== null) {
    const price = parseInt(match[1], 10);
    if (price >= 10 && price <= 10000) {
      allPrices.push({ price, priority: 4 });
    }
  }

  if (allPrices.length === 0) return null;

  // Sort by priority, then lowest price
  allPrices.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.price - b.price;
  });

  return allPrices[0].price;
}
```

**Expected Impact:** Price extraction success rate >90% (from 0%).

**Files Modified:**
- `scripts/reddit-avexchange-scraper-v3.js` (replace extractPrice function around line 252)

---

## Phase 2: Multi-Component Bundle Handling ⭐ CRITICAL

### 2.1 Multi-Component Extraction Strategy

**Problem:** Bundles like "HD600 + Focal Clear MG - $800" only match ONE component, losing discoverability and causing price validation failures.

**Current Behavior:**
```javascript
// Input: "[WTS] HD600 + Focal Clear MG - $800"
// Output: ONE listing
{
  component_id: "HD600",      // Only first match
  is_bundle: true,
  component_count: 2,         // Knows it's a bundle...
  price: 800                  // But can't split price
}
// Result: Focal Clear MG not discoverable, price looks 200% overpriced
```

**Solution:** Extract multiple components and create linked listings with shared bundle context.

**Implementation:**

Create [bundle-extractor.js](scripts/bundle-extractor.js) (NEW FILE):

```javascript
const { findComponentMatch } = require('./component-matcher-enhanced');

/**
 * Splits bundle text into individual component segments
 */
function splitBundleSegments(text) {
  // Extract [H] section first
  const haveMatch = text.match(/\[H\]\s*(.+?)\s*\[W\]/i);
  const itemsText = haveMatch ? haveMatch[1] : text;

  // Split on common separators
  const separators = /,|,\s+|\s+\+\s+|\s+and\s+|\s+&\s+|\s+\/\s+|\/(?!\d)/g;
  const segments = itemsText
    .split(separators)
    .map(s => s.trim())
    .filter(s => s.length > 3); // Filter noise

  return segments;
}

/**
 * Matches each bundle segment to components in database
 */
async function extractBundleComponents(title, description, source) {
  const segments = splitBundleSegments(title);

  if (segments.length <= 1) {
    // Not a bundle, use single match
    const match = await findComponentMatch(title, description, source);
    return match ? [{ ...match, segment: title }] : [];
  }

  // Match each segment independently
  const matches = [];

  for (const segment of segments) {
    const match = await findComponentMatch(segment, description, source);

    if (match) {
      matches.push({
        ...match,
        segment,
        segmentIndex: segments.indexOf(segment)
      });
    }
  }

  return matches;
}

/**
 * Creates bundle group ID for linking related listings
 */
function generateBundleGroupId() {
  return `bundle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Handles price splitting for bundles
 */
function calculateBundlePrice(totalPrice, componentCount, componentIndex, component) {
  // Strategy: Price marked as null for individual components
  // Keep total price in bundle metadata
  return {
    individual_price: null,
    bundle_total_price: totalPrice,
    bundle_component_count: componentCount,
    price_note: `Part of ${componentCount}-item bundle ($${totalPrice} total)`
  };
}

module.exports = {
  splitBundleSegments,
  extractBundleComponents,
  generateBundleGroupId,
  calculateBundlePrice
};
```

---

### 2.2 Database Schema for Bundles

**Add columns to `used_listings` table:**

Create migration: [supabase/migrations/20260128_add_bundle_tracking.sql](supabase/migrations/20260128_add_bundle_tracking.sql)

```sql
-- Add bundle tracking columns
ALTER TABLE used_listings
  ADD COLUMN IF NOT EXISTS bundle_group_id TEXT,
  ADD COLUMN IF NOT EXISTS bundle_total_price INTEGER,
  ADD COLUMN IF NOT EXISTS bundle_component_count INTEGER,
  ADD COLUMN IF NOT EXISTS bundle_position INTEGER,
  ADD COLUMN IF NOT EXISTS matched_segment TEXT;

-- Add index for bundle group queries
CREATE INDEX IF NOT EXISTS idx_used_listings_bundle_group
  ON used_listings(bundle_group_id)
  WHERE bundle_group_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN used_listings.bundle_group_id IS 'Groups multiple listings from the same bundle post';
COMMENT ON COLUMN used_listings.bundle_total_price IS 'Total price for entire bundle (when individual prices unknown)';
COMMENT ON COLUMN used_listings.matched_segment IS 'Text segment that matched this component (for debugging)';
```

---

### 2.3 Integration with Scraper

**Modify [reddit-avexchange-scraper-v3.js](scripts/reddit-avexchange-scraper-v3.js):**

Replace single match logic (around line 429-470) with bundle-aware extraction:

```javascript
const { extractBundleComponents, generateBundleGroupId, calculateBundlePrice } = require('./bundle-extractor');

// OLD CODE (line 429):
// const matchResult = await findComponentMatch(post.title, post.selftext || '', 'reddit_avexchange');

// NEW CODE:
const bundleMatches = await extractBundleComponents(
  post.title,
  post.selftext || '',
  'reddit_avexchange'
);

if (bundleMatches.length === 0) {
  // No matches found, try component candidate extraction
  await extractComponentCandidate(post);
  continue;
}

// Generate bundle group ID if multiple matches
const bundleGroupId = bundleMatches.length > 1
  ? generateBundleGroupId()
  : null;

// Extract common data once
const commonData = {
  url: `https://reddit.com${post.permalink}`,
  source: 'reddit_avexchange',
  date_posted: new Date(post.created_utc * 1000).toISOString(),
  seller_username: post.author,
  location: extractLocation(post.title),
  images: extractImages(post),
  status: isSoldPost(post) ? 'sold' : 'available'
};

// Extract price once (for entire bundle)
const totalPrice = extractPrice(post.title, post.selftext);

// Create listing for EACH matched component
const listingsToCreate = [];

for (let i = 0; i < bundleMatches.length; i++) {
  const match = bundleMatches[i];

  // Calculate price for this component
  const priceInfo = bundleMatches.length > 1
    ? calculateBundlePrice(totalPrice, bundleMatches.length, i, match.component)
    : { individual_price: totalPrice, bundle_total_price: null };

  const listing = {
    component_id: match.component.id,
    title: post.title,
    price: priceInfo.individual_price,

    // Bundle metadata
    is_bundle: bundleMatches.length > 1,
    bundle_group_id: bundleGroupId,
    bundle_total_price: priceInfo.bundle_total_price,
    bundle_component_count: bundleMatches.length,
    bundle_position: bundleMatches.length > 1 ? i + 1 : null,
    matched_segment: match.segment,

    // Common data
    ...commonData
  };

  listingsToCreate.push(listing);
}

// Batch upsert all bundle components
console.log(`  📦 Creating ${listingsToCreate.length} listing(s) from bundle`);

for (const listing of listingsToCreate) {
  const { error } = await supabase
    .from('used_listings')
    .upsert(listing, {
      onConflict: 'url,component_id', // Unique on URL + component combo
      ignoreDuplicates: false
    });

  if (error) {
    console.error(`  ❌ Failed to upsert ${listing.component_id}:`, error.message);
  } else {
    console.log(`  ✅ Matched: ${match.component.brand} ${match.component.name} (${match.score.toFixed(2)})`);
  }
}
```

**Expected Impact:**
- "HD600 + Focal Clear MG" → Creates 2 listings (both discoverable)
- Both listings share `bundle_group_id` for linking
- Price marked as null for individuals, $800 stored in `bundle_total_price`

---

### 2.4 Update Unique Constraint

**Problem:** Current unique constraint is `url` only, which prevents multiple components from same post.

**Solution:** Change to composite unique constraint on `(url, component_id)`.

Add to migration [20260128_add_bundle_tracking.sql](supabase/migrations/20260128_add_bundle_tracking.sql):

```sql
-- Drop old unique constraint on url
ALTER TABLE used_listings DROP CONSTRAINT IF EXISTS used_listings_url_key;

-- Add new composite unique constraint
ALTER TABLE used_listings
  ADD CONSTRAINT used_listings_url_component_unique
  UNIQUE (url, component_id);

-- Add index for URL lookups (since we removed unique constraint)
CREATE INDEX IF NOT EXISTS idx_used_listings_url ON used_listings(url);
```

---

### 2.5 Handle Edge Cases

**Edge Case 1: Partial Bundle Matches**
```
Input: "HD600 + mystery IEM + cable - $600"
Matches: HD600 only
Action: Create single listing, mark as is_bundle=true, component_count=3 (estimated)
```

**Edge Case 2: Accessories in Bundle**
```
Input: "HD600 + original cable + case - $250"
Matches: HD600 only (cable/case filtered by isAccessoryOnly)
Action: Create single listing for HD600
```

**Edge Case 3: Same Component Multiple Times**
```
Input: "2x HD600 (black and silver) - $400"
Matches: HD600 twice
Action: Create single listing, add note: "Quantity: 2"
```

**Implementation:**

Add to [bundle-extractor.js](scripts/bundle-extractor.js):

```javascript
function deduplicateMatches(matches) {
  const seen = new Set();
  const unique = [];

  for (const match of matches) {
    const key = match.component.id;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(match);
    } else {
      // Same component matched multiple times
      const existing = unique.find(m => m.component.id === key);
      if (existing) {
        existing.quantity = (existing.quantity || 1) + 1;
      }
    }
  }

  return unique;
}

// Modify extractBundleComponents to use deduplication
async function extractBundleComponents(title, description, source) {
  // ... existing logic ...

  const rawMatches = [];
  for (const segment of segments) {
    const match = await findComponentMatch(segment, description, source);
    if (match) rawMatches.push({ ...match, segment });
  }

  // Deduplicate before returning
  return deduplicateMatches(rawMatches);
}
```

---

### 2.6 Frontend Display Strategy

**Bundle listings should display differently in UI:**

```typescript
// For component detail page
interface BundleListingDisplay {
  component: Component;
  price: number | null;
  bundleInfo?: {
    totalPrice: number;
    componentCount: number;
    position: number;
    otherComponents: Component[]; // Fetched via bundle_group_id
  };
}
```

**Example display:**
```
HD 600 - Part of 2-item bundle
Price: $800 total (individual pricing not available)
Bundle includes:
  • Sennheiser HD 600
  • Focal Clear MG
[View on Reddit]
```

---

## Phase 3: Post-Match Validation Layer

### 3.1 Price Sanity Check (Updated for Bundles)

**Create:** [validators/listing-validator.js](scripts/validators/listing-validator.js) (NEW FILE)

```javascript
function validatePrice(listingPrice, componentPriceNew, isBundle = false, bundleTotalPrice = null) {
  // Skip validation for bundle components (individual prices unknown)
  if (isBundle && !listingPrice && bundleTotalPrice) {
    return {
      valid: true,
      action: 'accept',
      note: 'Bundle component - individual price not available'
    };
  }

  if (!listingPrice || listingPrice === 0) {
    return {
      valid: false,
      severity: 'warning',
      reason: 'Price extraction failed',
      action: 'flag_for_review'
    };
  }

  if (!componentPriceNew) {
    return { valid: true, action: 'accept' };
  }

  const ratio = (listingPrice / componentPriceNew) * 100;

  // Severe mismatch - reject
  if (ratio > 300) {
    return {
      valid: false,
      severity: 'error',
      reason: `Used price $${listingPrice} is ${ratio.toFixed(0)}% of new ($${componentPriceNew})`,
      action: 'reject'
    };
  }

  // Unreasonably high - flag
  if (ratio > 150) {
    return { valid: false, severity: 'warning', action: 'flag_for_review' };
  }

  // Unreasonably low - flag (possible accessory)
  if (ratio < 20) {
    return { valid: false, severity: 'warning', action: 'flag_for_review' };
  }

  return { valid: true, action: 'accept' };
}

function validateCategory(listingText, componentCategory) {
  const conflicts = {
    'cans': ['iem', 'in-ear', 'earbud'],
    'iems': ['over-ear', 'on-ear', 'headphone'],
    'dac': ['amplifier', 'amp'],
    'amp': ['dac', 'decoder']
  };

  const textLower = listingText.toLowerCase();
  const conflictKeywords = conflicts[componentCategory] || [];

  for (const keyword of conflictKeywords) {
    if (textLower.includes(keyword)) {
      return {
        valid: false,
        severity: 'error',
        reason: `Category mismatch: ${componentCategory} vs "${keyword}" in text`,
        action: 'reject'
      };
    }
  }

  return { valid: true, action: 'accept' };
}

function validateListing(listing, component, matchScore) {
  const validations = {
    price: validatePrice(
      listing.price,
      component.price_new,
      listing.is_bundle,
      listing.bundle_total_price
    ),
    category: validateCategory(listing.title, component.category)
  };

  // Determine action
  const hasErrors = Object.values(validations).some(v => v.severity === 'error');
  const hasWarnings = Object.values(validations).some(v => v.severity === 'warning');

  return {
    shouldReject: hasErrors,
    shouldFlag: hasWarnings,
    validations
  };
}

module.exports = { validateListing, validatePrice, validateCategory };
```

**Integration:** Validation is now integrated into the bundle extraction loop in Phase 2.3.

For each listing in bundle:
```javascript
const validation = validateListing(listing, match.component, match.score);

if (validation.shouldReject) {
  console.log(`  ❌ Rejected: ${validation.validations.price?.reason || validation.validations.category?.reason}`);
  continue; // Skip this component in bundle
}

if (validation.shouldFlag) {
  listing.requires_manual_review = true;
  listing.validation_warnings = Object.values(validation.validations)
    .filter(v => v.severity === 'warning')
    .map(v => v.reason);
}
```

**Expected Impact:** Reject >300% price mismatches for single items, skip validation for bundle components with null price.

**Files Created:**
- `scripts/validators/listing-validator.js` (NEW)

**Files Modified:**
- `scripts/reddit-avexchange-scraper-v3.js` (add validation before upsert around line 461)

---

### 3.2 Ambiguity Detection

**Problem:** When HD600 and HE-600 both score 0.72, system blindly picks one.

**Solution:** Flag when top 2 matches are within 0.15 of each other.

**Implementation:**

Modify `findComponentMatch()` in [component-matcher-enhanced.js](scripts/component-matcher-enhanced.js) (around line 277):

```javascript
// After sorting candidates (around line 277)
if (candidates.length >= 2) {
  const best = candidates[0];
  const secondBest = candidates[1];
  const scoreDiff = best.score - secondBest.score;

  if (scoreDiff < 0.15) {
    console.log(`  ⚠️  Ambiguous: ${best.component.name} (${best.score.toFixed(2)}) vs ${secondBest.component.name} (${secondBest.score.toFixed(2)})`);

    best.isAmbiguous = true;
    best.requiresReview = true;
  }
}
```

**Expected Impact:** Catch ambiguous matches, flag for manual disambiguation.

**Files Modified:**
- `scripts/component-matcher-enhanced.js` (add ambiguity check after sorting candidates around line 277)

---

## Phase 4: Enhanced Scoring

### 4.1 [H] Section Parsing

**Problem:** "[WTS][H] HD600 [W] Arya" matches Arya because [W] section is included.

**Solution:** Extract [H] (have) section, heavily penalize matches outside it.

**Implementation:**

Add to [component-matcher-enhanced.js](scripts/component-matcher-enhanced.js):

```javascript
function extractHaveSection(title) {
  // [H] items [W] payment
  const haveMatch = title.match(/\[H\]\s*(.+?)\s*\[W\]/i);
  if (haveMatch) return haveMatch[1];

  // Everything before [W]
  const beforeWant = title.match(/^(.+?)\s*\[W\]/i);
  if (beforeWant) return beforeWant[1];

  return title; // Fallback to full title
}

// Enhance calculatePositionScore() to use [H] section
function calculatePositionScore(text, brand, name, title) {
  const haveSection = extractHaveSection(title);
  const brandInHave = haveSection.toLowerCase().includes(brand.toLowerCase());
  const nameInHave = haveSection.toLowerCase().includes(name.toLowerCase());

  if (brandInHave && nameInHave) {
    return 0.25; // +25% for [H] section
  }

  // Check if in title but NOT in [H] - probably in [W]
  const brandInTitle = title.toLowerCase().includes(brand.toLowerCase());
  const nameInTitle = title.toLowerCase().includes(name.toLowerCase());

  if ((brandInTitle || nameInTitle) && (!brandInHave && !nameInHave)) {
    return -0.4; // -40% for [W] section
  }

  return 0;
}
```

**Expected Impact:** [W] section matches rejected, [H] section matches boosted.

**Files Modified:**
- `scripts/component-matcher-enhanced.js` (add extractHaveSection, enhance calculatePositionScore)

---

### 4.2 Exclusivity Scoring

**Problem:** When 10+ components all score 0.7+, text is too generic.

**Solution:** Penalize when many candidates pass threshold.

**Implementation:**

Add to `findComponentMatch()` in [component-matcher-enhanced.js](scripts/component-matcher-enhanced.js) after collecting candidates:

```javascript
// After collecting all candidates with score >= 0.7
if (candidates.length >= 5) {
  const penalty = Math.min(0.2, (candidates.length - 4) * 0.05);
  const best = candidates[0];
  best.score = Math.max(0, best.score - penalty);

  console.log(`  ⚠️  Low exclusivity: ${candidates.length} matches, -${(penalty*100).toFixed(0)}% penalty`);

  if (best.score < 0.7) {
    console.log(`  ❌ Best match fell below threshold after exclusivity penalty`);
    return null; // Rejected
  }
}
```

**Expected Impact:** Generic text with many matches gets rejected.

**Files Modified:**
- `scripts/component-matcher-enhanced.js` (add exclusivity penalty after candidate collection)

---

## Phase 5: Testing & Monitoring

### 5.1 Expand Test Suite

**Create:** [tests/matcher-comprehensive-tests.js](scripts/tests/matcher-comprehensive-tests.js) (NEW FILE)

**Test categories:**
1. **Generic names** - Space Audio, FiiO Q7, etc. (10 cases)
2. **Third-party mentions** - "compatible with HD600" (5 cases)
3. **Section parsing** - [H] vs [W] (5 cases)
4. **Price extraction** - Various formats (10 cases)
5. **Category mismatches** - IEM with headphone brand (5 cases)
6. **Bundle detection** - REPOST + PRICE DROP (10 cases)

**Total: 45+ test cases**

Structure:
```javascript
const testCases = [
  {
    category: 'generic_names',
    title: '[WTS] Space Audio Space II Amp',
    description: '',
    expectedMatch: null,
    reason: 'Generic brand name should be penalized'
  },
  {
    category: 'third_party_mentions',
    title: '[WTS] Custom cable compatible with HD600',
    description: '',
    expectedMatch: null,
    reason: 'HD600 is accessory mention, not product being sold'
  },
  // ... 43 more cases
];
```

**Success criteria:** >90% accuracy

**Files Created:**
- `scripts/tests/matcher-comprehensive-tests.js` (NEW)

---

### 5.2 Mismatch Detection Script

**Create:** [detect-listing-mismatches.js](scripts/detect-listing-mismatches.js) (NEW FILE)

**Scans for:**
- Severe price mismatches (>300% or <20%)
- Category keyword conflicts
- Generic name matches
- Price extraction failures ($0)

**Output:** JSON report with flagged listings

**Usage:**
```bash
node scripts/detect-listing-mismatches.js
# Outputs: mismatch-report-2026-01-28.json
```

**Structure:**
```javascript
const { createClient } = require('@supabase/supabase-js');
const { validateListing } = require('./validators/listing-validator');

async function detectMismatches() {
  const { data: listings } = await supabase
    .from('used_listings')
    .select('*, component:component_id(*)')
    .eq('status', 'available');

  const mismatches = {
    severe_price_mismatch: [],
    category_conflict: [],
    generic_name: [],
    price_extraction_failed: []
  };

  for (const listing of listings) {
    const validation = validateListing(listing, listing.component, 0.7);

    if (validation.shouldReject) {
      if (validation.validations.price?.severity === 'error') {
        mismatches.severe_price_mismatch.push({
          id: listing.id,
          url: listing.url,
          component: listing.component.name,
          issue: validation.validations.price.reason
        });
      }

      if (validation.validations.category?.severity === 'error') {
        mismatches.category_conflict.push({
          id: listing.id,
          url: listing.url,
          component: listing.component.name,
          issue: validation.validations.category.reason
        });
      }
    }

    // Check for generic names
    const hasGenericWords = ['space', 'audio', 'pro', 'lite'].some(word =>
      listing.component.brand.toLowerCase().includes(word) ||
      listing.component.name.toLowerCase().includes(word)
    );
    if (hasGenericWords) {
      mismatches.generic_name.push({
        id: listing.id,
        url: listing.url,
        component: listing.component.name
      });
    }

    if (!listing.price || listing.price === 0) {
      mismatches.price_extraction_failed.push({
        id: listing.id,
        url: listing.url,
        title: listing.title
      });
    }
  }

  return mismatches;
}
```

**Files Created:**
- `scripts/detect-listing-mismatches.js` (NEW)

---

## Phase 6: Cleanup

### 6.1 Delete False Positives

**Create:** [cleanup-false-positives.js](scripts/cleanup-false-positives.js) (NEW FILE)

**Deletes listings with:**
- Price >500% of component new price
- Category keyword conflicts
- Generic name + zero text evidence

**Safety:** Dry-run mode by default, `--execute` flag required

**Before cleanup:** Export backup:
```bash
node -e "
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
  const { data } = await supabase.from('used_listings').select('*');
  fs.writeFileSync('backup-used-listings-2026-01-28.json', JSON.stringify(data, null, 2));
  console.log('Backup saved');
})();
" > backup-used-listings-2026-01-28.json
```

**Files Created:**
- `scripts/cleanup-false-positives.js` (NEW)

---

### 6.2 Additional Validation Columns

**Add validation tracking columns to `used_listings` table:**

Create migration: [supabase/migrations/20260128_add_validation_columns.sql](supabase/migrations/20260128_add_validation_columns.sql)

```sql
-- Add validation tracking columns
ALTER TABLE used_listings
  ADD COLUMN IF NOT EXISTS requires_manual_review BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS validation_warnings JSONB,
  ADD COLUMN IF NOT EXISTS match_confidence FLOAT;

-- Add index for manual review queries
CREATE INDEX IF NOT EXISTS idx_used_listings_manual_review
  ON used_listings(requires_manual_review)
  WHERE requires_manual_review = TRUE;

-- Add index for confidence queries
CREATE INDEX IF NOT EXISTS idx_used_listings_confidence
  ON used_listings(match_confidence);
```

Run migration:
```bash
npx supabase db push
```

**Files Created:**
- `supabase/migrations/20260128_add_validation_columns.sql` (NEW)

---

## Implementation Sequence

### Sprint 1: Critical Fixes (Week 1)
**Goal:** Prevent new false positives from generic names

- [ ] **1.1** Generic name penalties in component-matcher-enhanced.js
- [ ] **1.2** Position scoring in component-matcher-enhanced.js
- [ ] **1.3** Fix price extraction in reddit-avexchange-scraper-v3.js
- [ ] **5.1** Create 20 initial test cases for basic matching
- [ ] **Test** Run scrapers, verify improvements

**Deliverables:**
- Modified `component-matcher-enhanced.js`
- Modified `reddit-avexchange-scraper-v3.js`
- New `tests/matcher-comprehensive-tests.js` (partial)

---

### Sprint 2: Bundle Handling (Week 2) ⭐ NEW
**Goal:** Extract multiple components from bundle listings

- [ ] **2.1** Create bundle-extractor.js with multi-component matching
- [ ] **2.2** Add database schema for bundle tracking
- [ ] **2.3** Integrate bundle extraction into scraper
- [ ] **2.4** Update unique constraint to (url, component_id)
- [ ] **2.5** Handle edge cases (partial matches, deduplication)
- [ ] **Test** Run on sample bundle listings, verify multiple components created

**Deliverables:**
- New `scripts/bundle-extractor.js`
- Database migration `20260128_add_bundle_tracking.sql`
- Modified `reddit-avexchange-scraper-v3.js` (bundle integration)
- Bundle test cases

---

### Sprint 3: Validation (Week 3)
**Goal:** Catch mismatches before saving, handle bundles properly

- [ ] **3.1** Create listing-validator.js with bundle-aware price validation
- [ ] **3.1** Integrate validator into bundle extraction loop
- [ ] **3.2** Add ambiguity detection
- [ ] **5.2** Create mismatch detection script
- [ ] **6.2** Database schema for validation tracking
- [ ] **Test** Run validator on existing listings, verify bundle handling

**Deliverables:**
- New `validators/listing-validator.js`
- New `detect-listing-mismatches.js`
- Database migration `20260128_add_validation_columns.sql`
- Validation test cases

---

### Sprint 4: Enhanced Scoring (Week 4)
**Goal:** Achieve >90% test accuracy with advanced scoring

- [ ] **4.1** [H] section parsing enhancement
- [ ] **4.2** Exclusivity scoring
- [ ] **5.1** Complete test suite (45+ cases including bundles)
- [ ] **Test** Run full test suite, achieve >90% accuracy
- [ ] **Test** Run scraper for 1 week, monitor results

**Deliverables:**
- Enhanced `component-matcher-enhanced.js`
- Complete test suite with bundle cases
- Test accuracy report

---

### Sprint 5: Cleanup & Monitoring (Week 5)
**Goal:** Clean existing data and establish monitoring

- [ ] **Run** Mismatch detection on full database
- [ ] **Review** Flagged listings manually
- [ ] **6.1** Create cleanup script for false positives
- [ ] **Backup** Export used_listings table
- [ ] **6.1** Run cleanup script with --execute
- [ ] **Verify** Spot-check cleaned data
- [ ] **Document** Results and metrics

**Deliverables:**
- Backup JSON file
- New `cleanup-false-positives.js`
- Cleanup report with before/after metrics
- Weekly monitoring cadence established

---

## Success Metrics

### Before Implementation

| Metric | Current Value | Evidence |
|--------|--------------|----------|
| False positive rate | >3 confirmed cases | User report: "Space Audio Space II" |
| Price extraction success | 0% (10/10 failed) | test-matcher-analysis.js results |
| Test coverage | 5 test cases | test-matcher-v3.js |
| Average match confidence | Unknown | No tracking |
| Manual review rate | 0% | No flagging system |

### After Implementation (Target)

| Metric | Target Value | How Measured |
|--------|-------------|--------------|
| False positive rate | <5% | Manual review of 100 random listings |
| Price extraction success | >90% | Run test suite on 100 listings |
| Test coverage | 45+ cases | matcher-comprehensive-tests.js |
| Average match confidence | >0.75 | Database query average |
| Manual review rate | <10% | Count requires_manual_review=true |

---

## Rollback Strategy

### If Issues Occur in Production:

1. **Git Revert:**
   ```bash
   git revert <commit-hash>
   git push origin staging
   ```

2. **Restore Database:**
   ```bash
   node -e "
   const { createClient } = require('@supabase/supabase-js');
   const fs = require('fs');
   const backup = JSON.parse(fs.readFileSync('backup-used-listings-2026-01-28.json'));
   const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

   (async () => {
     await supabase.from('used_listings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
     await supabase.from('used_listings').insert(backup);
     console.log('Restored from backup');
   })();
   "
   ```

3. **Disable Validation (Feature Flag):**
   ```javascript
   // In reddit-avexchange-scraper-v3.js
   const ENABLE_VALIDATION = process.env.ENABLE_VALIDATION !== 'false';

   if (ENABLE_VALIDATION) {
     const validation = validateListing(...);
     // ... validation logic
   }
   ```

### Monitoring During Rollout:

- **Week 1:** Daily check of new listings for obvious errors
- **Week 2:** Run mismatch detector every 2 days
- **Week 3:** Full test suite after each scraper run
- **Week 4:** Review 50 random listings manually

---

## Critical Files Summary

### Files to Modify:
1. **scripts/component-matcher-enhanced.js** - Core matching logic (Phases 1, 4)
2. **scripts/reddit-avexchange-scraper-v3.js** - Main scraper (Phases 1, 2, 3)

### Files to Create:
1. **scripts/bundle-extractor.js** - Multi-component extraction (Phase 2) ⭐ NEW
2. **scripts/validators/listing-validator.js** - Validation logic (Phase 3)
3. **scripts/tests/matcher-comprehensive-tests.js** - Test suite (Phase 5)
4. **scripts/detect-listing-mismatches.js** - Mismatch detector (Phase 5)
5. **scripts/cleanup-false-positives.js** - Cleanup script (Phase 6)
6. **supabase/migrations/20260128_add_bundle_tracking.sql** - Bundle schema (Phase 2) ⭐ NEW
7. **supabase/migrations/20260128_add_validation_columns.sql** - Validation schema (Phase 6)

---

## Known Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Over-aggressive penalties reject valid matches | Reduced listing volume | Medium | Tune penalties based on test results |
| Price validation too strict | Rejects legitimate deals | Low | Use 300% threshold (very conservative) |
| [H] section parsing breaks on edge cases | Missed listings | Low | Fallback to full title |
| Exclusivity scoring penalizes bundles | Bundle detection broken | Medium | Only apply when ≥5 matches |
| Database migration fails | Deployment blocked | Low | Test migration on staging first |

---

## Questions for User Review

1. **Threshold Tuning:** Is 0.7 confidence threshold still appropriate after penalties? Should we lower to 0.65?

2. **Price Validation:** Is 300% ratio too strict/lenient for used market? (e.g., rare items can sell above MSRP)

3. **Manual Review:** Should flagged listings be hidden from users or shown with warning badge?

4. **Cleanup Scope:** For Phase 5, should we delete bad matches or just flag them for manual review?

5. **Performance:** Is 500ms per-listing matching acceptable or should we optimize further?

---

## Next Steps

1. **Review this plan** - Identify any concerns or questions
2. **Prioritize phases** - Which phases to implement first?
3. **Set timeline** - When to start implementation?
4. **Assign testing** - Who will validate results?

**Ready to implement when approved.**
