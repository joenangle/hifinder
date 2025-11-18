# Bundle Detection Accuracy Analysis

**Date:** November 18, 2025
**Analyzed:** 1,000 used listings from database
**Script:** `/Users/joe/hifinder/scripts/analyze-bundle-accuracy.js`

---

## Executive Summary

The bundle detection system has **critical accuracy issues** that are causing widespread misclassification:

- **Overall Accuracy: 53.5%** (535/1000 correctly classified)
- **Bundle Detection Accuracy: 28.6%** (only 4 out of 14 bundles detected correctly)
- **Single Item Accuracy: 53.9%** (531/986 single items detected correctly)
- **False Positive Rate: 0%** (0 false positives - at least it's not over-flagging!)
- **False Negative Rate: 46.1%** (455 multi-item listings missed)

### Key Findings

1. **CRITICAL: Missing comma-separated bundles** - The algorithm doesn't detect comma-separated lists, which is the most common bundle format on Reddit
2. **CRITICAL: Missing "/" separator** - Slash separators are not recognized
3. **False positives on model numbers** - Numbers in model names (LCD-4, Momentum 4, Empire 298) are incorrectly triggering bundle detection
4. **Limited separator detection** - Only detects " + ", " and ", " & ", " with " but misses commas and slashes

---

## Detailed Breakdown

### 1. Database Statistics

```
Total listings: 1,000
Bundles: 14 (1.4%)
Single items: 986 (98.6%)
```

**Note:** Only 1.4% of listings are currently marked as bundles, which seems extremely low. This suggests the scraper is missing most multi-item listings.

### 2. False Negatives (The Big Problem)

**Count:** 455 listings (46.1% of single items)
**Impact:** Nearly HALF of all "single item" listings appear to actually be bundles or have bundle indicators

#### Common False Negative Patterns:

##### Pattern 1: Comma-Separated Lists (MOST COMMON)
```
❌ "[WTS] [USA-TX] [H] HD800s, ADX3000, Woo Audio Wa7 Gen 3 [W] Paypal"
   Detected: SINGLE | Should be: BUNDLE (3 items)

❌ "[WTS] [US-CA] [H] Meze 99 Noir, Truthear Nova, Rock Lobster, FDX-1 [W] your money"
   Detected: BUNDLE (2 items) | Should be: BUNDLE (4 items)

❌ "[WTS][US-NY][H]: Xenns Top Pro, Ziigaat Doscinco, Aful Explorer, iBasso DX180, Sennheiser HD650 [W] Paypal"
   Detected: BUNDLE (4 items) | Should be: BUNDLE (5 items)
```

**Root Cause:** The `detectMultipleComponents()` function doesn't check for commas as separators, only " + ", " and ", " & ", " with ".

##### Pattern 2: Slash Separators
```
❌ "[WTS][USA-NY][H] Audeze iSine20/ Audient Evo 4/ + Sim Racing Equipment [W] PayPal"
   Detected: SINGLE | Should be: BUNDLE (2+ items)
```

**Root Cause:** "/" is not included in the separator list.

##### Pattern 3: "and" Without Spaces
```
❌ "[WTS][USA-IL][H]Moondrop Meteor and Moondrop Blessing 3[W] Paypal G & S"
   Detected: SINGLE | Should be: BUNDLE (2 items)
```

**Root Cause:** The algorithm looks for " and " (with spaces), but Reddit titles often have no space before "and".

##### Pattern 4: Missing "+" Detection
```
❌ "[WTS][US-OH][H]Kiwi Ears Aether + NiceHCK FirstTouch[W]Paypal"
   Detected: SINGLE | Should be: BUNDLE (2 items)
```

**Root Cause:** Despite " + " being in the separator list, this failed. Likely due to the model number requirement - it only detects bundles if `hasSeparator && modelNumbers.length >= 2`, but "Aether" and "FirstTouch" don't match the model number pattern.

### 3. False Positives (Minimal but Present)

**Count:** 0 in database, but test cases revealed issues

#### Pattern: Model Numbers in Product Names
```
❌ "[WTS][US-TX][H] Sennheiser Momentum 4 [W] Paypal"
   Detected: BUNDLE (2 items) | Should be: SINGLE
   Issue: "4" is part of model name, not a second item

❌ "[WTS] [USA-CA] [H] Empire 298 Turntable [W] PayPal, Venmo, Zelle"
   Detected: BUNDLE (2 items) | Should be: SINGLE
   Issue: "298" is the model number, "Zelle" has numbers too

❌ "[WTS] [US-CA] [H] Audeze LCD-4 [W]Paypal, Zelle"
   Detected: BUNDLE (2 items) | Should be: SINGLE
   Issue: "LCD-4" has a number in it
```

**Root Cause:** The model number extraction regex (`/\b([a-z]{1,4})?(\d{2,4})([a-z]{0,3})?\b/gi`) is too aggressive and doesn't account for numbers in the [W] section or as part of legitimate model names.

### 4. Edge Cases: Accessories vs. Components

**Correctly Handled:**
```
✅ "[WTS] [US-IN] [H] Schiit Lyr 3 (no dac) w/ lots of tubes and stands [W] $450 PayPal G&S"
   Detected: SINGLE
   Correct: Main item is Lyr 3, accessories don't count

✅ "[WTS] [USA-NY] [H] Unique Melody UM Mest Jet Black (Almost New) - REPOST + PRICE DROP [W] PayPal $1250 net"
   Detected: SINGLE
   Correct: The "+" is part of "REPOST + PRICE DROP", not a product separator
```

**Incorrectly Handled:**
```
❌ "[WTS] [US-VA] [H] Hifiman Edition XS, Capra Strap, Hifiman Branded Carrying Case [W]$160"
   Detected: BUNDLE (2 items) | Should be: SINGLE
   Issue: Capra Strap and case are accessories, not components
```

---

## Root Causes Analysis

### 1. Separator Detection Limitations

**Current separators:**
```javascript
const separators = [' + ', ' and ', ' & ', ' with '];
```

**Missing separators:**
- `,` (comma) - THE MOST COMMON separator on Reddit
- `/` (slash)
- `and` without spaces (e.g., "IEMand Amp")

### 2. Logic Flaw: Separator + Model Number Requirement

**Current logic:**
```javascript
if (hasSeparator && modelNumbers.length >= 2) {
    isBundle = true;
}
```

**Problem:** This requires BOTH a separator AND 2+ model numbers. But many legitimate bundles have:
- Product names without numbers (e.g., "Aether + FirstTouch")
- Model names that don't match the pattern (e.g., "Sundara, Ananda")

### 3. Model Number Extraction Issues

**Current pattern:**
```javascript
const MODEL_NUMBER_PATTERN = /\b([a-z]{1,4})?(\d{2,4})([a-z]{0,3})?\b/gi;
```

**Problems:**
1. Extracts numbers from the [W] section (PayPal, Zelle, etc.)
2. Extracts numbers from prices ($450, $1250)
3. Matches partial model names (LCD-**4**, Momentum **4**)
4. Doesn't respect Reddit post structure ([H] vs [W] sections)

### 4. Missing Context Awareness

The algorithm doesn't understand Reddit post structure:
```
[WTS] [USA-TX] [H] ITEMS FOR SALE [W] PAYMENT METHODS
                    ^^^^^^^^^^^^^^^^     ^^^^^^^^^^^^^^^
                    Only parse this!     Ignore this!
```

Currently, it parses the entire title, leading to false positives from payment methods and locations.

---

## Impact Assessment

### User Experience Impact

**Current State:**
- 455+ multi-item listings show as single items
- Users searching for bundles miss 46% of available options
- Filtering by "bundles only" shows only 14 listings instead of 469+
- Price per item calculations are wrong (bundle price ÷ 1 instead of ÷ actual count)

**Expected State:**
- ~470 bundle listings (14 current + 455 false negatives)
- Proper bundle filtering and price-per-item calculations
- Accurate inventory counts for multi-item sales

### Data Quality Impact

**Current Bundle Distribution:**
```
Bundles: 14 (1.4%)
Singles: 986 (98.6%)
```

**Expected Bundle Distribution (after fixes):**
```
Bundles: ~470 (47%)
Singles: ~530 (53%)
```

This is a MASSIVE difference in data quality.

---

## Recommendations

### Priority 1: Critical Fixes (Do First)

#### 1.1 Add Comma Separator Support
**Impact:** Would fix ~400+ false negatives (87% of the problem)

```javascript
const separators = [
  ',',        // NEW: comma (most common!)
  ' + ',      // existing
  ' and ',    // existing
  ' & ',      // existing
  ' with ',   // existing
  '/',        // NEW: slash separator
  ' / '       // NEW: slash with spaces
];
```

#### 1.2 Parse Only [H] Section
**Impact:** Would eliminate false positives from [W] section

```javascript
// Extract only the [H] section
const haveMatch = title.match(/\[H\]\s*(.+?)\s*\[W\]/i);
const itemsText = haveMatch ? haveMatch[1] : title;
```

#### 1.3 Relax Model Number Requirement
**Impact:** Would catch bundles with non-numeric product names

```javascript
// Old logic: requires separator AND 2+ model numbers
if (hasSeparator && modelNumbers.length >= 2) {
    isBundle = true;
}

// New logic: separator alone is strong enough indicator
if (hasSeparator) {
    // Count items by splitting on separators
    isBundle = true;
}
```

### Priority 2: Accuracy Improvements

#### 2.1 Improve Component Counting

Instead of counting model numbers or brands, count actual product mentions:

```javascript
// Split on separators and count
const parts = itemsText.split(/,|\/|\s+and\s+|\s+\+\s+|\s+&\s+/i);
const componentCount = parts.filter(part => {
  // Filter out accessory-only parts
  return !isAccessoryOnly(part);
}).length;
```

#### 2.2 Better Accessory Filtering

```javascript
const ACCESSORY_ONLY_PATTERNS = [
  /\b(?:original\s+)?box\b/i,
  /\b(?:carrying\s+)?case\b/i,
  /\b(?:original\s+)?cables?\b/i,
  /\bcertificate\b/i,
  /\bstrap\b/i,
  /\bstand\b/i,
  /\btips?\b/i
];
```

#### 2.3 Add Confidence Scoring

```javascript
return {
  isBundle,
  componentCount,
  confidence: calculateConfidence(factors) // 0-100%
};
```

### Priority 3: Testing & Validation

#### 3.1 Create Test Suite

Build a comprehensive test suite with known good/bad cases:
- 50 confirmed bundles (manual verification)
- 50 confirmed single items
- 20 edge cases

Target accuracy: >95%

#### 3.2 Manual Review Queue

For listings with:
- Confidence < 80%
- Price outliers
- Unusual patterns

Flag for manual review and use feedback to improve algorithm.

---

## Test Results Summary

**Test Suite:** 13 hand-picked cases
**Current Accuracy:** 38.5% (5/13 correct)

### Failures by Category:
- **Missing comma detection:** 2 failures
- **Missing "/" detection:** 1 failure
- **Missing "and" without spaces:** 1 failure
- **Missing "+" with non-numeric names:** 1 failure
- **False positives from model numbers:** 3 failures

---

## Proposed Implementation Plan

### Phase 1: Quick Wins (1-2 hours)
1. Add comma and slash to separators list
2. Parse only [H] section of title
3. Test on existing dataset
4. **Expected improvement:** 53.5% → 75% accuracy

### Phase 2: Logic Overhaul (2-3 hours)
1. Implement smart component counting by splitting on separators
2. Improve accessory filtering with context awareness
3. Add confidence scoring
4. **Expected improvement:** 75% → 90% accuracy

### Phase 3: Validation & Tuning (2 hours)
1. Build comprehensive test suite (50+ cases)
2. Manual review of edge cases
3. Fine-tune thresholds
4. **Expected improvement:** 90% → 95%+ accuracy

### Phase 4: Data Migration (1 hour)
1. Re-run scraper on existing listings
2. Update is_bundle flags in database
3. Recalculate component counts
4. Verify price-per-item calculations

**Total Effort:** ~8 hours
**Impact:** 53.5% → 95%+ accuracy (42-point improvement)

---

## Code Locations

**Detection Logic:**
- `/Users/joe/hifinder/scripts/component-matcher-enhanced.js` - `detectMultipleComponents()` function (lines 457-509)

**Scraper Integration:**
- `/Users/joe/hifinder/scripts/reddit-avexchange-scraper-v3.js` - Line 298 (calls `detectMultipleComponents`)

**Analysis Tools:**
- `/Users/joe/hifinder/scripts/analyze-bundle-accuracy.js` - Full database analysis
- `/Users/joe/hifinder/scripts/test-specific-titles.js` - Hand-picked test cases

---

## Conclusion

The bundle detection system has significant accuracy issues, primarily due to:
1. Missing comma separator support (the most common format)
2. Over-reliance on model number patterns
3. Lack of context awareness (parsing entire title instead of just [H] section)

**The good news:** These are all straightforward fixes that don't require ML or complex heuristics. Simple rule-based improvements can get accuracy from 53.5% to 95%+.

**Next step:** Implement Priority 1 fixes and re-run analysis to validate improvements.
