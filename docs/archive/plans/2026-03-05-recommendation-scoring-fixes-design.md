# Recommendation Scoring Fixes

## Context
$250 and $300 budgets produce identical recommendations. Investigation revealed three scoring issues that compound to produce poor recommendations, especially at entry-level budgets.

## Fix 1: Additive Signature Bonus

**Problem:** The 1.2x multiplicative signature bonus applies to the entire score. A mediocre product with a matching sound signature beats a much better product without one (Bose SoundSport Free expert:5.67 beats 7Hz Timeless expert:8.4 when user selects neutral).

**Fix:** Replace multiplicative bonus with additive. `sigBonus = sig > 0.35 ? 0.05 : 0` added to raw score instead of multiplied.

**File:** `src/app/api/recommendations/v2/route.ts` lines 686-724

**Before:**
```typescript
const signatureBonus = signatureScore > 0.35 ? 1.2 : 1.0;
// ...
const rawScore = (expert*0.55 + sig*0.25 + val*0.10 + prox*0.10 + powerBonus) * signatureBonus;
```

**After:**
```typescript
const signatureBonus = signatureScore > 0.35 ? 0.05 : 0;
// ...
const rawScore = expert*0.55 + sig*0.25 + val*0.10 + prox*0.10 + powerBonus + signatureBonus;
```

## Fix 2: TWS Filtering

**Problem:** 8 TWS earbuds (AirPods, Galaxy Buds, SoundSport Free, etc.) compete with wired IEMs in recommendations despite being fundamentally different products.

**Fix:**
1. Add `is_tws BOOLEAN DEFAULT FALSE` column to `components` table
2. Set `is_tws = TRUE` for 8 known TWS products
3. Filter out TWS from IEM recommendations unless user selected wireless connectivity

**Files:**
- New Supabase migration
- `src/app/api/recommendations/v2/route.ts` — add filter in component processing

**TWS products to flag:**
- Bose SoundSport Free
- Apple AirPods Pro
- Apple AirPods Pro 2
- Samsung Galaxy Buds
- Samsung Galaxy Buds+
- Samsung Galaxy Buds Pro
- Samsung Galaxy Buds2 Pro
- JBL LIVE 300TWS

## Fix 3: Expert Confidence Penalty (Headphones/IEMs Only)

**Problem:** Products with partial Crinacle data get C-grade (5.0) defaults for missing fields, inflating scores. `calculateExpertConfidence()` in `src/lib/crinacle-scoring.ts` was built for this but never wired in.

**Fix:** Apply confidence multiplier to expert score for headphones/IEMs only (DACs/amps/combos all have zero Crinacle data, so penalizing them is pointless).

- 4/4 fields present: 1.0x (no penalty)
- 3/4 fields: 0.9x
- 2/4 fields: 0.75x
- 1/4 fields: 0.5x
- 0/4 fields: no penalty (already score low at expert 4.0)

**Files:**
- `src/app/api/recommendations/v2/route.ts` ~line 607 (expert score calculation)
- Uses existing `calculateExpertConfidence()` from `src/lib/crinacle-scoring.ts`

## Verification
1. `tsc --noEmit` — type check
2. `npm test` — existing tests
3. Compare API results at $250 and $300 budgets
4. Verify 7Hz Timeless beats SoundSport Free at $150 IEM budget with neutral preference
5. Verify high-end ($1000+) recommendations unchanged
6. Verify TWS excluded from IEM results (unless wireless selected)
