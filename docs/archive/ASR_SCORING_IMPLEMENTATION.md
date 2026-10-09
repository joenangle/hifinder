# ASR Measurement Scoring Implementation

## Overview
Added ASR SINAD measurement-based quality scoring to DAC/amp/combo recommendations, implemented October 9, 2025.

## How It Works

### Scoring Algorithm
Components with ASR SINAD measurements now receive **budget-aware quality boosts** in the recommendation algorithm:

```typescript
// Layer 3: ASR measurement quality boost (DAC/amp/combo only)
if (comp.asr_sinad && ['dac', 'amp', 'dac_amp'].includes(comp.category)) {
  const asrBoost = calculateASRQualityBoost(comp.asr_sinad, comp.price_new);
  score += asrBoost;
}
```

### Budget-Aware Scoring Matrix

| SINAD Range | Budget (<$200) | Mid ($200-$600) | High-End ($600-$1500) | Summit-Fi (>$1500) |
|-------------|----------------|-----------------|----------------------|-------------------|
| **≥120 dB** | +0.10 | +0.15 | +0.12 | +0.08 |
| **110-120 dB** | +0.08 | +0.10 | +0.08 | +0.05 |
| **100-110 dB** | +0.05 | +0.05 | +0.03 | -0.05 |
| **<100 dB** | 0.00 | 0.00 | -0.10 | -0.10 |

### Rationale

**Why budget-aware?**
- **Budget gear** (<$200): SINAD less critical; other factors (build quality, features) matter more
- **Mid-range** ($200-$600): SINAD becomes important differentiator; exceptional measurements = great value
- **High-end** ($600-$1500): SINAD expected to be good; exceptional = strong boost, poor = penalty
- **Summit-Fi** (>$1500): Excellent measurements expected; poor performance heavily penalized

**Why these thresholds?**
- **120 dB+**: State-of-the-art transparency (SMSL D400 Pro: 132 dB, Luxsin X9: 128 dB)
- **110-120 dB**: Excellent performance (most modern gear: Topping A70 Pro: 121 dB)
- **100-110 dB**: Adequate but not exceptional
- **<100 dB**: Concerning for expensive gear (Chord Alto: 73 dB at $4,320 - likely colored/tube sound)

## Impact on Recommendations

### Before ASR Scoring
Components ranked primarily by:
1. Sound signature match (40%)
2. Crinacle expert data (20%)
3. Use case match (10%)
4. Price proximity to budget (30%)

### After ASR Scoring
Same as above, plus:
- **ASR quality boost**: 0-15% additional score for measured components
- **Value discovery**: Mid-range gear with exceptional measurements now rank higher
- **Quality filtering**: Poor-measuring expensive gear automatically de-prioritized

## Example Scenarios

### Scenario 1: $500 DAC Budget
**Before:**
1. Brand X DAC - $480 (no SINAD data)
2. SMSL D400 Pro - $619 (132 dB SINAD)

**After:**
1. SMSL D400 Pro - $619 (132 dB SINAD) ⬆️ **+12% boost for exceptional value**
2. Brand X DAC - $480 (no data)

### Scenario 2: $300 Amp Budget
**Before:**
1. Amp A - $280 (no SINAD)
2. Schiit Midgard - $219 (118 dB SINAD)

**After:**
1. Schiit Midgard - $219 (118 dB SINAD) ⬆️ **+10% boost + $61 savings**
2. Amp A - $280

### Scenario 3: $2000 Summit-Fi Amp
**Before:**
1. Expensive Tube Amp - $2200 (85 dB SINAD)
2. Topping A90 Discrete - $599 (119 dB SINAD)

**After:**
1. Topping A90 Discrete - $599 ⬆️ **Tube amp penalized -10% for poor measurements**
2. Expensive Tube Amp - $2200 ⬇️ **Only if user wants colored sound**

## Current Data Coverage

As of October 9, 2025:
- **DACs**: 32% have SINAD data (6/19)
- **Amps**: 50% have SINAD data (12/24)
- **Combos**: 17% have SINAD data (5/29)
- **SINAD range**: 73-132 dB
- **Top performers**: SMSL D400 Pro (132 dB), Luxsin X9 (128 dB), Sabaj A20d (123 dB)

## Future Enhancements

**Phase 2 (planned):**
- [ ] Update `why_recommended` field for ASR-reviewed components
- [ ] Add "ASR Verified" badge in UI
- [ ] Link to ASR review from component cards
- [ ] User preference: "Prioritize measurements" toggle

**Phase 3 (future):**
- [ ] Extract power output data from ASR reviews
- [ ] Match DAC+Amp pairs by measurement compatibility
- [ ] Show SINAD chart from review
- [ ] "What is SINAD?" educational tooltip

## Files Modified

- `src/app/api/recommendations/route.ts` - Added `calculateASRQualityBoost()` function
- Database: Added `asr_sinad` and `asr_review_url` columns to components table

## Testing

Build status: ✅ Passed
Type checking: ✅ No errors
Deployment: Ready for staging

## Rollback Plan

If ASR scoring causes issues:
1. Set all boost values to 0 in `calculateASRQualityBoost()`
2. Or comment out lines 137-141 in route.ts
3. No database changes required - column addition is non-breaking
