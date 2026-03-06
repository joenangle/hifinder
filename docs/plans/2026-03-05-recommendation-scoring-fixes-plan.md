# Recommendation Scoring Fixes — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix three scoring issues that produce poor recommendations: overpowered signature bonus, TWS competing with wired IEMs, and inflated scores from missing expert data.

**Architecture:** All three fixes target `src/app/api/recommendations/v2/route.ts` scoring logic. Fix 2 also adds a DB migration and column. Fix 3 wires up an existing but unused function from `src/lib/crinacle-scoring.ts`.

**Tech Stack:** Next.js API route (TypeScript), Supabase (Postgres), existing `calculateExpertConfidence()` function.

**Design doc:** `docs/plans/2026-03-05-recommendation-scoring-fixes-design.md`

---

### Task 1: Fix Signature Bonus — Additive Instead of Multiplicative

**Files:**
- Modify: `src/app/api/recommendations/v2/route.ts:681-723`

**Step 1: Change signature bonus from multiplicative to additive**

In the scoring `.map()` block (~line 681-723), make two changes:

Change line 686 from:
```typescript
const signatureBonus = signatureScore > 0.35 ? 1.2 : 1.0;
```
to:
```typescript
const signatureBonus = signatureScore > 0.35 ? 0.05 : 0;
```

Change lines 715-723 from:
```typescript
// FINAL SCORE CALCULATION
// Expert: 55% + Signature: 25% + Value: 10% + Proximity: 10% + Power bonus: 0-5%
// Then apply signature bonus multiplier (1.0x or 1.2x)
const rawScore =
  (expertScore * 0.55 +
  signatureScore * 0.25 +
  valueScore * 0.10 +
  proximityScore * 0.10 +
  powerBonus) * signatureBonus;
```
to:
```typescript
// FINAL SCORE CALCULATION
// Expert: 55% + Signature: 25% + Value: 10% + Proximity: 10% + Power bonus: 0-5%
// Additive signature bonus: +5 points when signature matches well
const rawScore =
  expertScore * 0.55 +
  signatureScore * 0.25 +
  valueScore * 0.10 +
  proximityScore * 0.10 +
  powerBonus +
  signatureBonus;
```

Also update the algorithm comment at line 671-673 from:
```typescript
// V3.2 SCORING ALGORITHM
// Priority order: Performance (55%) > Sound Signature (25%) > Value (10%) > Budget Proximity (10%)
// Signature bonus multiplier: 1.2x when signature matches
```
to:
```typescript
// V3.3 SCORING ALGORITHM
// Priority order: Performance (55%) > Sound Signature (25%) > Value (10%) > Budget Proximity (10%)
// Additive signature bonus: +5pts when signature matches well (>0.35)
```

**Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: Clean (no errors)

**Step 3: Commit**

```bash
git add src/app/api/recommendations/v2/route.ts
git commit -m "fix: change signature bonus from multiplicative to additive"
```

---

### Task 2: Add `is_tws` Column and Seed Data

**Files:**
- Create: `supabase/migrations/20260305_add_is_tws_column.sql`

**Step 1: Create migration**

```sql
-- Add is_tws flag to distinguish TWS earbuds from wired IEMs
ALTER TABLE components ADD COLUMN IF NOT EXISTS is_tws BOOLEAN DEFAULT FALSE;

-- Flag known TWS products
UPDATE components SET is_tws = TRUE WHERE name IN (
  'SoundSport Free',
  'AirPods Pro',
  'AirPods Pro 2',
  'Galaxy Buds',
  'Galaxy Buds+',
  'Galaxy Buds Pro',
  'Galaxy Buds2 Pro',
  'LIVE 300TWS'
);
```

**Step 2: Run migration against Supabase**

Run: `npx supabase db push`
Expected: Migration applied successfully

**Step 3: Verify the 8 products were flagged**

Run: `npm run db -- "SELECT name, brand, is_tws FROM components WHERE is_tws = true"`
Expected: 8 rows returned matching the TWS products listed above

**Step 4: Regenerate types**

Run: `npm run db:types`
Expected: `src/types/supabase.ts` updated with `is_tws` column

**Step 5: Commit**

```bash
git add supabase/migrations/20260305_add_is_tws_column.sql src/types/supabase.ts
git commit -m "feat: add is_tws column and flag 8 TWS products"
```

---

### Task 3: Filter TWS from IEM Recommendations

**Files:**
- Modify: `src/app/api/recommendations/v2/route.ts`

**Step 1: Add TWS filter in the component processing pipeline**

In the `.filter()` chain that handles budget filtering (~line 650-669), add a TWS exclusion filter. Find this existing filter block:

```typescript
.filter((c) => {
  // Driver type filtering for enthusiasts
  if (driverType && driverType !== "any" && c.driver_type) {
```

Add a TWS check at the top of this filter body:

```typescript
.filter((c) => {
  // Exclude TWS from IEM results (TWS are a different product category)
  if (c.is_tws) return false;

  // Driver type filtering for enthusiasts
  if (driverType && driverType !== "any" && c.driver_type) {
```

Note: The `connectivity` param exists in the request interface but isn't actively used in the frontend yet. When wireless connectivity selection is added, the TWS filter can be updated to: `if (c.is_tws && !req.connectivity?.includes('wireless')) return false;`

**Step 2: Add `is_tws` to the RecommendationComponent interface**

At `src/app/api/recommendations/v2/route.ts:15-65`, add to the interface:

```typescript
is_tws?: boolean;
```

**Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: Clean

**Step 4: Commit**

```bash
git add src/app/api/recommendations/v2/route.ts
git commit -m "fix: filter TWS earbuds from IEM recommendations"
```

---

### Task 4: Wire Up Expert Confidence Penalty

**Files:**
- Modify: `src/app/api/recommendations/v2/route.ts:5-9` (import) and `~607-612` (score calculation)

**Step 1: Add `calculateExpertConfidence` to imports**

At line 5-9, change:
```typescript
import {
  calculateExpertScore,
  gradeToNumeric as gradeToNumeric10Scale,
  type ScoringComponent,
} from "@/lib/crinacle-scoring";
```
to:
```typescript
import {
  calculateExpertScore,
  calculateExpertConfidence,
  gradeToNumeric as gradeToNumeric10Scale,
  type ScoringComponent,
} from "@/lib/crinacle-scoring";
```

**Step 2: Apply confidence multiplier to expert score**

At ~line 606-612, change:
```typescript
// Calculate comprehensive expert score using new scoring system (0-10)
const expertScore = calculateExpertScore({
  crin_rank: component.crin_rank,
  crin_tone: component.crin_tone,
  crin_tech: component.crin_tech,
  crin_value: component.crin_value,
});
```
to:
```typescript
// Calculate comprehensive expert score using new scoring system (0-10)
const scoringData = {
  crin_rank: component.crin_rank,
  crin_tone: component.crin_tone,
  crin_tech: component.crin_tech,
  crin_value: component.crin_value,
};
const rawExpertScore = calculateExpertScore(scoringData);

// Apply confidence penalty for headphones/IEMs with partial data
// (DACs/amps/combos have no Crinacle data, so skip — they all score 4.0 already)
const isHeadphone = component.category === "cans" || component.category === "iems";
const confidence = calculateExpertConfidence(scoringData);
// Only penalize partial data (confidence 0.5-0.9), not zero data (confidence 0)
const expertScore = isHeadphone && confidence > 0
  ? rawExpertScore * confidence
  : rawExpertScore;
```

**Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: Clean

**Step 4: Commit**

```bash
git add src/app/api/recommendations/v2/route.ts
git commit -m "fix: apply expert confidence penalty for partial Crinacle data"
```

---

### Task 5: End-to-End Verification

**Step 1: Run tests**

Run: `npm test`
Expected: All existing tests pass

**Step 2: Start dev server and compare results**

Run: `npm run dev`

Then test these scenarios:

**A. Budget differentiation ($250 vs $300 cans):**
```bash
curl -s "localhost:3000/api/recommendations/v2?budget=250&headphoneType=cans" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); d.cans.slice(0,5).forEach((c,i)=>console.log((i+1)+'. '+c.brand+' '+c.name+' $'+c.avgPrice+' match:'+c.matchScore))"

curl -s "localhost:3000/api/recommendations/v2?budget=300&headphoneType=cans" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); d.cans.slice(0,5).forEach((c,i)=>console.log((i+1)+'. '+c.brand+' '+c.name+' $'+c.avgPrice+' match:'+c.matchScore))"
```
Expected: At least 3 of top 5 differ between the two budgets

**B. Signature bonus no longer overpowered ($150 IEMs, neutral pref):**
```bash
curl -s "localhost:3000/api/recommendations/v2?budget=150&headphoneType=iems" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); d.iems.slice(0,5).forEach((c,i)=>console.log((i+1)+'. '+c.brand+' '+c.name+' $'+c.avgPrice+' match:'+c.matchScore+' expert:'+c.expertScoreDisplay))"
```
Expected: 7Hz Timeless or another high-expert IEM ranks above any TWS product. SoundSport Free should NOT appear (filtered as TWS).

**C. High-end still quality-first ($1000 cans):**
```bash
curl -s "localhost:3000/api/recommendations/v2?budget=1000&headphoneType=cans" | node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8')); d.cans.slice(0,5).forEach((c,i)=>console.log((i+1)+'. '+c.brand+' '+c.name+' $'+c.avgPrice+' match:'+c.matchScore+' expert:'+c.expertScoreDisplay))"
```
Expected: HD800 or similar high-expert products at #1

**Step 3: Final commit (if any verification-driven fixes were needed)**

If all passes, no action needed. If tweaks were required, commit them.
