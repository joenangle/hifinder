# HiFinder Recommendation Algorithm Documentation

**Last Updated:** January 2025
**Version:** 3.1 (Enhanced Sound Signature Weight + Bonus Multiplier)

---

## Overview

HiFinder's V3 recommendation algorithm prioritizes **expert-validated performance quality** as the primary ranking factor, with sound signature matching and value-for-money as secondary considerations. This approach matches how experienced audiophiles make purchasing decisions: start with proven quality, then refine by preference and budget optimization.

---

## Core Philosophy

### V3.1 Improvements (January 2025)

**What Changed from V3.0:**
- **Sound signature weight increased:** 20% → 25% (more responsive to signature selection)
- **Performance weight adjusted:** 70% → 65% (still dominant, but allows more signature influence)
- **Signature bonus multiplier added:** 1.2x when signature match is strong (>0.35 score)
- **Impact:** Changing sound signature now produces more noticeable result changes while maintaining performance quality as primary factor

**What Changed from V2:**
- **Scoring priorities fixed:** 65-70% performance quality (was ~6%) → 20-25% sound signature (was 22.5%) → 10% value (was 45% price-proximity)
- **Budget control restored:** User-specified ranges now respected (were completely ignored)
- **Double-buffering eliminated:** Items no longer appear 20% over user's specified budget
- **Smooth tier transitions:** Removed hard boundaries at $150/$400/$1K that caused result discontinuities
- **High-end budget fixes:** Removed $2K DAC/amp caps that stranded money at $10K+ budgets

**HiFinder's V3.1 Approach:**
- **Performance quality determines ranking** (Crinacle grades, rank, value ratings, ASR measurements) - 65% weight
- **Sound signature matching** ensures recommendations fit user preferences (neutral/warm/bright/fun) - 25% weight + 1.2x bonus
- **Value scoring** provides slight preference to items at 70-100% of budget (same quality tier) - 10% weight
- **Budget is a ceiling**, not a target - but we don't recommend $220 items for $1000 budgets
- Result: S-tier item at $105 beats D-tier item at $145 for a $150 budget, but signature match now has more influence

---

## Algorithm Flow

### Step 1: Performance Tier Determination

Every budget level has an **expected performance tier** based on market standards:

```
Budget Range          → Expected Performance Tier
$0 - $150            → C+ tier (acceptable quality)
$150 - $400          → B+ tier (good quality)
$400 - $1000         → A tier (excellent quality)
$1000 - $3000        → A tier (high-end)
$3000+               → A+ tier (summit-fi)
```

### Step 2: Component Performance Grading

Each component's performance tier is calculated from expert data:

**For Headphones/IEMs (using Crinacle data):**
- Average of `tone_grade` and `technical_grade`
- A+ / A = Top tier
- B+ / B = Mid tier
- C+ / C = Entry tier
- Additional weight from `crinacle_rank` (lower rank = better)
- Bonus from `value_rating` (1-3 scale)

**For DACs/Amps/Combos (using ASR data):**
- Based on `asr_sinad` measurements (signal-to-noise ratio)
- Budget-aware scoring (120dB SINAD is exceptional at $200, expected at $2000)

**For components without expert data:**
- Assigned baseline tier based on category and price
- Can still compete on signature match and use case fit

### Step 3: Eligibility Filtering

A component is eligible for recommendation if:

```javascript
✅ Component price ≤ Budget × 1.1 (allow 10% stretch)
✅ Component performance tier ≥ Expected tier for budget
```

**Key insight:** There is **no minimum price**. If a $220 item meets the A-tier performance bar at a $1000 budget, it's eligible.

### Step 4: V3.1 Performance Scoring

Components are scored based on three factors with a signature bonus multiplier:

| Factor | Weight | Description |
|--------|--------|-------------|
| **Expert Performance Score** | 65% | Crinacle rank (30%), tone grade (30%), technical grade (20%), value rating (20%), or ASR measurements for signal gear |
| **Sound Signature Match** | 25% | User preference alignment (neutral/warm/bright/fun) with partial matching for close signatures |
| **Value-for-Money** | 10% | Linear scoring from 50-100% of budget (rewards using the budget tier without over-emphasizing price) |
| **Power Adequacy Bonus** | +5% | For amps only: rewards adequate power output for user's headphones |
| **Signature Bonus Multiplier** | 1.2x | Applied to total score when signature match is strong (>0.35) |

**Formula:**
```javascript
baseScore =
  (expertScore / 10) * 0.65 +        // Expert quality (0-10 scale → 65%)
  synergyScore * 0.25 +              // Signature match (0-0.5 range → 25%)
  valueScore * 0.10 +                // Value (0.5-1.0 range → 10%)
  powerBonus                         // Amps only (0-5%)

matchScore = baseScore * signatureBonus  // 1.0x or 1.2x multiplier
```

**Budget Range Calculation:**
- **User-controlled (priority):** If user provides custom percentages (e.g., ±20/10%), use exactly those ranges
- **Smooth progressive defaults:** If no user input, use exponential decay curves:
  - Max stretch: 20% at $0 → 5% at $2500+ (smooth, no hard boundaries)
  - Min search: 35% below at $0 → 10% below at $2500+
  - Eliminates tier discontinuities at $150/$400/$1K boundaries

### Step 5: Value Rating Annotation

After scoring, components are labeled by value proposition:

```javascript
Exceptional Value: Performs 50%+ above expected price point
Great Value:      Performs 30-50% above expected price point
Good Value:       Performs 10-30% above expected price point
Fair Value:       Performs at expected price point
```

---

## Example Scenarios

### Scenario 1: $300 Budget, Neutral Sound Preference

**Expected tier:** B+ (good quality)

**Filtering:**
- Budget ceiling: $330 (10% stretch)
- Performance floor: B+ tier
- Result: All B+ or better components under $330

**Top recommendations (sorted by performance score):**

1. **HD6XX - $220** ⭐ EXCEPTIONAL VALUE
   - Performance: A+ tier (tone: A+, technical: A, rank: 12)
   - Score breakdown: 0.95 (perf) + 1.0 (sig match) + 1.0 (use) = 0.97
   - Value: Performs at $400-600 level, save $80+

2. **ATH-R70x - $280**
   - Performance: A tier (tone: A, technical: A-, rank: 65)
   - Score breakdown: 0.85 (perf) + 1.0 (sig) + 0.95 (use) = 0.88
   - Value: Fair (performs at expected level)

3. **Generic Brand - $240**
   - Would be EXCLUDED (only C+ tier, doesn't meet B+ bar)

**Why this works:** HD6XX wins decisively because it meets the performance bar with exceptional quality. The generic brand is excluded even though it's "closer" to budget because it doesn't meet minimum quality standards.

---

### Scenario 2: $1000 Budget, Want Best Value

**Expected tier:** A (excellent quality)

**Filtering:**
- Budget ceiling: $1100
- Performance floor: A tier
- Result: All A or better components under $1100

**Top recommendations:**

1. **HD6XX - $220** ⭐ EXCEPTIONAL VALUE
   - Performance: A+ tier (rank 12, A+ tone, A technical)
   - Score: 0.97
   - Value: Performs at $600 level, save $780 for DAC/amp

2. **Sundara - $299** ⭐ EXCEPTIONAL VALUE
   - Performance: A tier (rank 28, A+ tone, A technical, value=3)
   - Score: 0.96
   - Value: Performs at $700 level, save $701

3. **Arya - $950**
   - Performance: A+ tier (rank 8, A+ tone, A+ technical)
   - Score: 0.99
   - Value: Fair (premium choice, slight under budget)

4. **Edition XS - $499** 💎 GREAT VALUE
   - Performance: A tier (rank 45, A tone, A- technical)
   - Score: 0.88
   - Value: Performs at $700 level, save $501

**Why this works:** User sees both premium options (Arya) and exceptional value plays (HD6XX, Sundara). The algorithm doesn't artificially exclude $220-$499 items just because budget is $1000.

---

### Scenario 3: $50 Budget, First IEMs

**Expected tier:** C+ (acceptable quality)

**Filtering:**
- Budget ceiling: $55
- Performance floor: C+ tier
- Result: All C+ or better components under $55

**Top recommendations:**

1. **Truthear Zero - $50** ⭐ EXCEPTIONAL VALUE
   - Performance: A tier (competes with $200+ IEMs)
   - Score: 0.92
   - Value: Performs 4x above price point

2. **Moondrop Chu - $20** ⭐ EXCEPTIONAL VALUE
   - Performance: B+ tier (competes with $100+ IEMs)
   - Score: 0.85
   - Value: Performs 5x above price point

3. **Budget IEM - $45**
   - Performance: C+ tier (meets minimum bar)
   - Score: 0.62
   - Value: Fair (performs at expected level)

**Why this works:** Super-value budget kings (Chu, Zero) dominate because they far exceed the C+ performance floor. Users at any budget see the absolute best options available.

---

## Handling Components Without Expert Data

**Challenge:** 161 headphones/IEMs lack Crinacle data (no grades, rank, or detailed signatures).

**Solution: Baseline Tiering by Price + Category**

Components without expert data are assigned baseline tiers:

```javascript
function getBaselinePerformanceTier(component) {
  const price = component.avgPrice

  if (component.category === 'cans' || component.category === 'iems') {
    if (price >= 1000) return 4  // Assume A tier
    if (price >= 400) return 3   // Assume B+ tier
    if (price >= 150) return 2   // Assume B tier
    return 1                      // Assume C+ tier
  }

  // DACs/amps without ASR data
  return 3  // Neutral baseline (B+ tier)
}
```

**Performance scoring for components without data:**

```javascript
performanceScore = 0.50  // Neutral baseline (50%)

// They can still score high on:
- Sound signature match (20%)
- Use case match (10%)

// Maximum score without expert data: 0.80 (80%)
// Components with expert data can score up to 1.00 (100%)
```

**Result:** Components without data can still be recommended if they:
1. Meet the performance tier for the budget (via baseline)
2. Strongly match user preferences (signature + use case)

But they will lose to components with expert validation at similar price points.

---

## Value Rating Calculation

```javascript
function calculateValueRating(component, budget) {
  // What performance tier does this component deliver?
  const actualTier = getComponentPerformanceTier(component)

  // What price would we expect for this performance tier?
  const expectedPrice = getExpectedPriceForTier(actualTier)
  // A+ tier → ~$1200
  // A tier → ~$700
  // B+ tier → ~$350
  // B tier → ~$150

  // How much are you saving vs. expected price?
  const savings = expectedPrice - component.avgPrice
  const savingsPercent = savings / expectedPrice

  if (savingsPercent >= 0.50) return 'exceptional'  // 50%+ savings
  if (savingsPercent >= 0.30) return 'great'        // 30-50% savings
  if (savingsPercent >= 0.10) return 'good'         // 10-30% savings
  return 'fair'                                      // Expected price
}
```

**Examples:**
- HD6XX ($220, A+ tier): Expected price ~$1200 → 82% savings → **Exceptional**
- Sundara ($299, A tier): Expected price ~$700 → 57% savings → **Exceptional**
- Arya ($950, A+ tier): Expected price ~$1200 → 21% savings → **Good**
- Mediocre ($300, B tier): Expected price ~$150 → -100% (overpriced) → **Fair**

---

## Algorithm Evolution History

### Version 1.0 (August-October 2024)
**Approach:** Price-fit scoring
- Scored components by proximity to budget target
- Formula: `priceFit = 1 - abs(budget - price) / budget`
- Problem: Penalized under-budget items equally with over-budget items
- Problem: $220 HD6XX scored lower than $240 generic at $250 budget
- Problem: Small price differences (±$20) outweighed large performance gaps

### Version 2.0 (October 2024)
**Approach:** Performance-tier filtering
- Budget is a ceiling, not a target
- Performance quality determines ranking, not price proximity
- Highlights super-value items that punch above their price
- Eliminates arbitrary price-fit penalties
- Result: HD6XX, Sundara, Chu, Zero correctly dominate recommendations

---

## User-Facing Explanation

**For "How It Works" page or tooltips:**

> ### How We Recommend Gear
>
> **Your budget is a ceiling, not a target.** We show you the best-performing audio gear that fits within your budget, ranked purely by quality.
>
> **Why you'll see items well under your budget:**
> Some legendary gear delivers $700 performance at $300 prices. We highlight these "exceptional value" options so you can save money for other components (DACs, amps, cables) or simply get more for less.
>
> **How we measure performance:**
> We use expert measurements from Crinacle (headphones/IEMs) and Audio Science Review (DACs/amps) to objectively score sound quality, technical capability, and value-for-money. A $220 headphone with A+ grades will rank above a $240 headphone with B grades—because it's simply better.
>
> **The result:**
> You see the absolute best options at your budget, whether that's a $950 flagship or a $220 legend that performs like a $600 headphone.

---

## Technical Implementation Notes

### Performance Scoring Formula

```javascript
// Headphones/IEMs with Crinacle data
performanceScore = (
  rankScore * 0.25 +           // Crinacle rank (1-400, lower is better)
  toneGradeScore * 0.35 +      // Tone grade (A+ = 1.0, F = 0.0)
  technicalGradeScore * 0.35 + // Technical grade (A+ = 1.0, F = 0.0)
  valueRatingScore * 0.05      // Value rating (3 = 0.05, 1 = 0.0)
)

// DACs/Amps with ASR data
performanceScore = calculateASRQualityBoost(sinad, price)
// Budget-aware: 120dB SINAD at $200 = exceptional, at $2000 = expected

// Components without data
performanceScore = 0.50  // Neutral baseline
```

### Grade Conversion Table

```javascript
const gradeToScore = {
  'A+': 1.00, 'A': 0.90, 'A-': 0.85,
  'B+': 0.75, 'B': 0.65, 'B-': 0.55,
  'C+': 0.45, 'C': 0.35, 'C-': 0.25,
  'D+': 0.15, 'D': 0.10, 'D-': 0.05,
  'F': 0.00
}
```

### Rank Scoring (Exponential Decay)

```javascript
function calculateRankScore(rank) {
  if (!rank) return 0.10  // Unknown rank = 10%
  if (rank <= 25) return 1.00   // Top 25: 100%
  if (rank <= 50) return 0.80   // Top 50: 80%
  if (rank <= 100) return 0.60  // Top 100: 60%
  if (rank <= 200) return 0.40  // Top 200: 40%
  if (rank <= 300) return 0.20  // Top 300: 20%
  return 0.10                    // Below 300: 10%
}
```

---

## Future Enhancements

### Potential Improvements

1. **Multi-tier display**
   - Premium tier: 80-110% of budget
   - Value tier: 40-80% of budget
   - Budget tier: <40% of budget

2. **Personalized tier expectations**
   - Beginners: Lower performance expectations (show more B+ items)
   - Enthusiasts: Higher performance expectations (only A/A+ items)

3. **Synergy scoring for stacks**
   - When recommending DAC+amp+headphones
   - Factor impedance matching, power requirements
   - Reward balanced system builds

4. **Community validation**
   - Incorporate user ratings/reviews
   - Weight recent feedback more heavily
   - Detect emerging super-value items

5. **Price trend awareness**
   - Flag if item is historically on sale
   - Show if "normal price" is higher (better value)
   - Highlight if price is trending up (buy now)

---

## FAQ for Developers

**Q: Why no minimum price constraint?**
A: If a $220 item meets the A-tier performance bar at $1000 budget, excluding it hurts the user. They should see the best options, period.

**Q: Won't users be confused seeing $220 items at $1000 budget?**
A: No, if we label them correctly. "⭐ EXCEPTIONAL VALUE - Save $780" makes the value clear. Many users prefer value options to maximize system quality.

**Q: What if a user WANTS to spend their full budget?**
A: They can sort by price (high to low) or filter to "premium tier." But default sorting should be performance-first.

**Q: How do we handle items without expert data?**
A: Baseline tiering by price + category. They compete on signature/use-case match but lose to expert-validated items at similar price.

**Q: What about used market pricing volatility?**
A: We use `(price_used_min + price_used_max) / 2` as `avgPrice`. If range is >50% of average, we flag for manual review.

---

## Change Log

**October 2024 - v2.0: Performance-Tier Filtering**
- Removed price-fit scoring entirely
- Implemented performance tier determination
- Added value rating annotations
- Result: HD6XX, Sundara, exceptional value items now rank correctly

**August-October 2024 - v1.0: Price-Fit Scoring**
- Initial algorithm with price proximity scoring
- Issues discovered with under-budget penalties
- Led to v2.0 redesign

---

## Conclusion

HiFinder's recommendation algorithm mirrors expert audio advice: **show the best-performing gear within budget, with special emphasis on exceptional value.** By treating budget as a ceiling rather than a target, we help users discover legendary super-value items like the HD6XX, Sundara, and Truthear Zero that might otherwise be hidden by traditional price-matching algorithms.
