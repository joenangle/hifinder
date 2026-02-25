# DAC Database Updates Needed

**Date:** February 20, 2026
**Current Database:** 21 DAC models
**Researched Models:** 42 DAC models
**Net New Models to Add:** 21+

---

## Immediate Priority: Price Updates (6 models)

These DACs are already in the database but missing prices. Quick wins:

```sql
-- Update existing DACs with missing prices
UPDATE components SET price_new = 109 WHERE brand = 'JDS Labs' AND name = 'Atom DAC+';
UPDATE components SET price_new = 129 WHERE brand = 'Schiit' AND name = 'Modi+';
UPDATE components SET price_new = 119 WHERE brand = 'Schiit' AND name = 'Modi 3E';
UPDATE components SET price_new = 119 WHERE brand = 'Topping' AND name = 'D10s';
UPDATE components SET price_new = 1899 WHERE brand = 'Benchmark' AND name = 'DAC3 B'; -- Update from $1800
UPDATE components SET price_new = 1795 WHERE brand = 'Chord Electronics' AND name = 'Qutest'; -- Update from $1895
```

**Impact:** Improves 6 existing records immediately

---

## High Priority Additions (Most Popular Missing Models)

These are the most commonly recommended DACs NOT currently in your database:

### Budget Tier (Sub-$200)
1. **SMSL SU-1** - $89 (SINAD: 112) - Most popular DDC/converter
2. **SMSL D-6** - $189 (SINAD: 121) - Best budget balanced DAC
3. **iFi Zen DAC 3** - $199 - Popular entry desktop DAC
4. **Topping E30 II** - $139 (SINAD: 120) - Budget balanced option
5. **FiiO K11** - $109 - Newer FiiO desktop option

**Why these:** Fill critical gaps in budget tier, very popular on r/headphones

### Mid Tier ($200-$600)
1. **Schiit Bifrost 2** - $749 - Most popular R2R under $1000
2. **Topping D50s** - $279 (SINAD: 121) - "Measurement king" reference
3. **Denafrips Ares II** - $849 - Entry R2R from premium brand
4. **Gustard X16** - $549 (SINAD: 120) - Popular Gustard entry point
5. **SMSL DO200** - $339 (SINAD: 119) - Excellent value mid-tier
6. **SMSL SU-6** - $279 (SINAD: 115) - Advanced DDC functionality
7. **SMSL SU-9** - $399 (SINAD: 121) - Bluetooth + remote convenience
8. **Gustard A18** - $499 - AKM chip alternative
9. **Topping E70 Velvet** - $599 (SINAD: 123) - Premium features
10. **FiiO K9 Pro ESS** - $599 - All-in-one features

**Why these:** Address summit-fi gap identified in CLAUDE.md

### High Tier ($600-$1500)
1. **iFi NEO iDSD** - $649 - Tube mode option
2. **SMSL VMV D1se** - $799 - Premium VMV line
3. **Audio-GD R2R-11** - $799 - Budget R2R option
4. **Gustard X18** - $849 - Mid-tier Gustard

**Why these:** Expand high-tier coverage beyond current 6 models

### Summit Tier ($1500+)
1. **Holo Audio Spring 3 KTE** - $3999 - High-end R2R
2. **Holo Audio May KTE** - $5999 - Flagship R2R
3. **Denafrips Terminator II** - $4999 - Flagship Denafrips
4. **Weiss DAC502** - $8500 - Professional mastering grade
5. **MSB Technology Discrete DAC** - $9950 - American ultra high-end

**Why these:** Addresses summit-fi component data gaps (CLAUDE.md priority)

---

## Coverage Analysis

### Current Database (21 models):
- Budget ($50-$200): **1 model** (5%)
- Mid ($200-$600): **3 models** (14%)
- High ($600-$1500): **12 models** (57%)
- Summit ($1500+): **5 models** (24%)

### After Research (42 models):
- Budget ($50-$200): **9 models** (21%)
- Mid ($200-$600): **12 models** (29%)
- High ($600-$1500): **12 models** (29%)
- Summit ($1500+): **9 models** (21%)

### Problem Areas:
- **Budget tier severely underrepresented** (1 vs 9 needed)
- Mid-tier needs expansion (3 vs 12 available)
- Summit tier actually okay (5 current, 9 total available)

---

## Import Strategy

### Phase 1: Critical Gaps (Week 1)
**Goal:** Fix budget tier immediately + top 5 most popular

```
Priority Order:
1. SMSL SU-1 ($89) - Most popular DDC
2. JDS Labs Atom DAC+ (price update to $109)
3. SMSL D-6 ($189) - Best budget balanced
4. Schiit Bifrost 2 ($749) - Most popular R2R
5. Topping D50s ($279) - Reference measurement DAC
6. iFi Zen DAC 3 ($199) - Entry desktop
```

**Impact:** Adds 5 critical models + fixes 1 price

### Phase 2: Expand Coverage (Week 2-3)
**Goal:** Balanced tier distribution

```
Add 10 more models across all tiers:
- Budget: E30 II, FiiO K11 (2 more)
- Mid: Ares II, X16, DO200, SU-6, SU-9 (5 more)
- High: VMV D1se, NEO iDSD, Audio-GD R2R-11 (3 more)
```

**Impact:** 16 total new models, balanced across tiers

### Phase 3: Summit-Fi Completion (Week 4)
**Goal:** Complete summit coverage per CLAUDE.md

```
Add remaining summit models:
- Holo Audio Spring 3 KTE ($3999)
- Holo Audio May KTE ($5999)
- Denafrips Terminator II ($4999)
- Weiss DAC502 ($8500)
- MSB Technology Discrete DAC ($9950)
```

**Impact:** Summit tier: 5 → 10 models

---

## Expected Results

### Before:
- Total DACs: 21 models
- Budget coverage: 5% (1 model)
- Mid coverage: 14% (3 models)
- Average price: ~$1500 (skewed high)
- R2R representation: Poor (1-2 models?)

### After:
- Total DACs: 42 models (+100%)
- Budget coverage: 21% (9 models) ✅
- Mid coverage: 29% (12 models) ✅
- Average price: ~$1200 (better distribution)
- R2R representation: Excellent (10+ models including Bifrost, Ares, Holo, Denafrips)

---

## Data Quality Checklist

For each import, verify:

- ✅ **Brand capitalization** (Schiit, not SCHIIT)
- ✅ **Model name accuracy** (Modi+, not Modi Plus)
- ✅ **Category = 'dac'** (NOT 'dac_amp')
- ✅ **Price is for NEW units** (retail, not used)
- ✅ **ASR SINAD if available** (20/42 models have measurements)
- ✅ **Sound signature accuracy** (R2R = warm, delta-sigma = neutral)
- ✅ **Check for existing duplicates** (use detect-all-duplicates.js)

---

## Files Created

1. **DAC_PRICING_RESEARCH_2025.md** - Full research document with all details
2. **data/dac-pricing-2025.json** - Clean JSON for easy import (42 models)
3. **scripts/research-dac-pricing.js** - Script to query existing + export JSON
4. **DAC_DATABASE_UPDATES_NEEDED.md** - This document (action plan)

---

## Next Steps

1. **Review research** - Verify any prices you want to double-check
2. **Run duplicate detector** - Ensure no conflicts with existing data
3. **Start Phase 1 imports** - Top 6 critical models first
4. **Update CLAUDE.md** - Mark summit-fi DAC gap as "in progress"
5. **Schedule Phases 2-3** - Spread imports over 2-3 weeks to avoid data quality issues

---

## Notes

- **Pricing volatility:** DAC prices fluctuate. Verify before import if >30 days old.
- **Discontinued models:** Some older models may be replaced (e.g., Modi 3+ → Modi+)
- **R2R measurement gap:** R2R DACs rarely have ASR SINAD measurements (by design, different tech)
- **Sound signature subjectivity:** Delta-sigma = neutral, R2R = warm is a generalization
- **Database constraint compliance:** All sound signatures must be null, 'neutral', 'warm', 'bright', or 'fun'
