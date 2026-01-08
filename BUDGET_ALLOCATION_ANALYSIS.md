# Budget Allocation Analysis

## Current Allocation Logic

### Base Ratios (No Existing Gear)
```javascript
headphones: 0.5   (50%)
dac:        0.2   (20%)
amp:        0.2   (20%)
combo:      0.35  (35%)
```

### Budget Caps (Scales with Total Budget)
```javascript
headphones: 90% of total budget
dac:        40% of total budget
amp:        40% of total budget
combo:      60% of total budget
```

## Common Scenarios Analysis

### Scenario 1: $500 - IEMs + DAC (User's Issue)

**Initial Allocation (Before DB Check):**
- Total Ratio: 0.5 + 0.2 = 0.7
- IEMs: floor($500 × 0.5/0.7) = **$357** (71.4%)
- DAC: floor($500 × 0.2/0.7) = **$142** (28.6%)
- Unused: $1

**Database Availability Check:**
- DAC range: $142 ± 20%/+10% = **$113 - $156**
- ⚠️ **Problem**: Very few DACs exist in $113-$156 range
- Most budget DACs: $80-$110 (Apple dongle, Tempotec, etc.)
- Entry-level "good" DACs start at $150-200 (Modi, Atom DAC)

**After Redistribution (What User Sees):**
- IEMs: **$499** (99.8%)
- DAC: **$0** (0%)
- Reason: No DACs found in allocated price range → budget given to IEMs

---

### Scenario 2: $300 - Headphones Only

**Allocation:**
- Headphones: **$300** (100%)
- Clean, simple, works well

---

### Scenario 3: $1,000 - Headphones + DAC + Amp

**Initial Allocation:**
- Total Ratio: 0.5 + 0.2 + 0.2 = 0.9
- Headphones: floor($1,000 × 0.5/0.9) = **$555** (55.6%)
- DAC: floor($1,000 × 0.2/0.9) = **$222** (22.2%)
- Amp: floor($1,000 × 0.2/0.9) = **$222** (22.2%)
- Unused: $1

**Database Check:**
- Headphones: $555 ± 20%/+10% = $444 - $611 ✅ Many options
- DAC: $222 ± 20%/+10% = $178 - $244 ✅ Good range (Modi 3+, Atom DAC+)
- Amp: $222 ± 20%/+10% = $178 - $244 ✅ Good range (Atom Amp+, Magni)

**After Redistribution:**
- Likely no change, all components have options
- Final: **Headphones $555, DAC $222, Amp $222**

---

### Scenario 4: $2,000 - Headphones + DAC + Amp

**Initial Allocation:**
- Total Ratio: 0.5 + 0.2 + 0.2 = 0.9
- Headphones: floor($2,000 × 0.5/0.9) = **$1,111** (55.6%)
- DAC: floor($2,000 × 0.2/0.9) = **$444** (22.2%)
- Amp: floor($2,000 × 0.2/0.9) = **$444** (22.2%)
- Unused: $1

**After Caps:**
- Headphones: min($1,111, $1,800) = **$1,111** ✅ Under cap
- DAC: min($444, $800) = **$444** ✅ Under cap
- Amp: min($444, $800) = **$444** ✅ Under cap

**Final:** Works well, balanced allocation

---

### Scenario 5: $500 - Headphones + Combo

**Initial Allocation:**
- Total Ratio: 0.5 + 0.35 = 0.85
- Headphones: floor($500 × 0.5/0.85) = **$294** (58.8%)
- Combo: floor($500 × 0.35/0.85) = **$205** (41.2%)
- Unused: $1

**Database Check:**
- Headphones: $294 ± 20%/+10% = $235 - $323 ✅
- Combo: $205 ± 20%/+10% = $164 - $226 ⚠️ Limited options

**Likely Issue:**
- Few combos in $164-$226 range
- Most budget combos: Qudelix 5K ($110), FiiO BTR5 ($130)
- "Good" combos start at $250+ (FiiO K7, iFi Zen DAC)

---

### Scenario 6: $150 - IEMs Only (Entry-Level)

**Allocation:**
- IEMs: **$150** (100%)
- Sweet spot for IEMs (7Hz Salnotes Zero, Moondrop Chu, etc.)

---

### Scenario 7: $1,500 - Headphones + Combo

**Initial Allocation:**
- Total Ratio: 0.5 + 0.35 = 0.85
- Headphones: floor($1,500 × 0.5/0.85) = **$882** (58.8%)
- Combo: floor($1,500 × 0.35/0.85) = **$617** (41.2%)
- Unused: $1

**After Caps:**
- Headphones: min($882, $1,350) = **$882** ✅
- Combo: min($617, $900) = **$617** ✅

**Final:** Excellent allocation, balanced high-end setup

---

## Problems Identified

### 1. **Low-Budget Signal Gear Gap ($100-$200)**
The allocation often puts signal gear in the $100-$200 range where options are limited:
- Budget DACs: $80-$110 (dongles)
- Entry "good" DACs: $150-$200 (Modi, Atom)
- **Gap**: $110-$150 has few options

### 2. **Redistribution Creates Confusing UI**
When DAC gets $0 because no options found:
- User selected DAC checkbox
- Allocation shows 0% to DAC
- Looks like a bug, but it's "smart" behavior

### 3. **Entry-Level Combos Underallocated**
At $500 budget with combo:
- Gets allocated $205
- Range $164-$226
- But good combos like FiiO K7 ($250) are just outside range

### 4. **Percentage Display Math**
When redistribution happens:
- IEMs: $499 / $500 = 99.8% → rounds to 100%
- DAC: $0 / $500 = 0%
- Looks broken even though math is correct

---

## Recommendations

### Option A: Show Initial Allocation (Before DB Check)
**Pros:**
- User sees intended split
- Makes sense visually
- Predictable percentages

**Cons:**
- Doesn't reflect actual search behavior
- Filter counts won't match displayed allocation

### Option B: Show Warning for Zero Allocations
**Example:**
```
⚠️ DAC: $0 (No options found in $113-$156 range)
💡 Try increasing budget or removing DAC
```

**Pros:**
- Explains why allocation is $0
- Gives actionable feedback
- Transparent about the issue

**Cons:**
- More complex UI
- Might confuse beginners

### Option C: Adjust Ratios for Low Budgets
For budgets < $600 with signal gear:
- Increase signal gear ratio to push it into viable range
- Example: At $500, give DAC $180 instead of $142
- Ensures $180 ± range hits $150+ "good DAC" territory

**Pros:**
- Better real-world allocations
- Fewer zero-result scenarios
- More useful recommendations

**Cons:**
- Headphones get less budget
- Complex logic with budget thresholds

### Option D: Better Entry-Level Signal Gear Handling
Special case for total budget $300-$700:
```javascript
if (totalBudget <= 700 && includesSignalGear) {
  // Force minimum viable signal gear budget
  minDAC = 150   // Ensures Modi/Atom range
  minAmp = 150
  minCombo = 200 // Ensures FiiO K7 range
}
```

---

## ✅ Implemented Fix

**Solution: Search Lower for Signal Gear**

Instead of complex UI warnings or ratio adjustments, we fixed the root cause: the search range calculation.

### What Changed

For signal gear (DAC/Amp/Combo) with component budgets ≤ $250:
- **Old**: Search from $113 (missed $80-110 budget DACs)
- **New**: Search from $20 (catches dongles, Tempotec, Atom DAC, Modi)

For signal gear with component budgets > $250:
- Search from 30% below budget (catches good deals)

### Example: $500 Budget - IEMs + DAC

**Before Fix:**
- IEMs: $357, DAC: $142
- DAC search range: $113-$156 ❌ Missed Atom DAC 2 ($100), Modi 3E ($100)
- Result after redistribution: IEMs $499, DAC $0

**After Fix:**
- IEMs: $357, DAC: $142
- DAC search range: $20-$156 ✅ Includes all budget DACs
- Result: IEMs $357, DAC $142 (no redistribution needed)

### Benefits

✅ **Catches budget signal gear**: Atom DAC 2, Modi 3E, Tempotec, Apple dongle
✅ **No confusing UI**: Allocation stays as intended
✅ **Works at all budgets**: Scales from $300 to $2,000+
✅ **Synced APIs**: Both recommendations and filter counts use same logic

### Implementation

Updated both APIs with identical signal gear logic:
- `src/app/api/recommendations/v2/route.ts`: Lines 375-398
- `src/app/api/filters/counts/route.ts`: Lines 86-150

---

## Previous Recommendations (Not Implemented)

The following options were considered but not needed after fixing the root cause:
