# Low-Budget Portable-Combo Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** At low budgets, recommend a high-value cheap headphone/IEM paired with a portable `dac_amp` combo (power-matched to that headphone) instead of the empty-desktop-amp "No amplifiers in range" dead-end.

**Architecture:** A new pure resolver `resolveAmplificationStrategy` decides — from the amplification sub-budget — whether to keep amp/dac separate (desktop) or collapse them into one portable `dac_amp` combo. The v2 recommendations route computes the strategy once from the budget allocation, derives *effective wants* that drive both the component fetch and the results assembly, and returns the strategy to the client. The frontend re-gates the amp/dac/combo sections on that strategy so the combo shows and the empty dead-ends disappear. A data pass seeds the missing ultra-budget dongles.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React 19, TypeScript 5, Supabase (Postgres), Vitest, tsx, Playwright.

**Spec:** [docs/superpowers/specs/2026-07-30-low-budget-portable-combo-routing-design.md](../specs/2026-07-30-low-budget-portable-combo-routing-design.md)

## Global Constraints

- **No scoring/weight changes.** The v3.5 weights and `filterAndScoreComponents` math are untouched. `npm run eval:reco --baseline scripts/eval/baseline.json` MUST show no nDCG@5 / P@5 regression.
- **No `wantRecommendationsFor` schema change.** The collapse is server-side; the client reacts to the returned `amplificationStrategy`.
- **`PORTABLE_COMBO_CEILING = 150`** (USD), a named exported constant. The threshold lives only in the API; the client never re-derives it.
- **All seeded data specs (price, `power_output`) verified via WebSearch against manufacturer/retailer/measurement sources BEFORE import.** No value written from memory. Unverifiable rows are dropped, not guessed. (CLAUDE.md ASR-pipeline discipline.)
- **Never push without explicit approval.** Pre-commit hook runs `type-check && lint`; pre-push runs `build`.
- **Verify imports/signatures with Grep before use.**
- `npm run db "..."` single-quote-wraps SQL — literals containing `'` break it; use `npm run db -- -f file.sql` for anything with quotes.

## File Structure

- **Create** `src/lib/amplification-strategy.ts` — the pure resolver + `PORTABLE_COMBO_CEILING` + types. One responsibility: decide separate-vs-combo.
- **Create** `src/lib/__tests__/amplification-strategy.test.ts` — resolver unit tests.
- **Modify** `src/app/api/recommendations/v2/route.ts` — thread strategy → effective wants → fetch + assembly + response.
- **Create** `scripts/asr-crawler/output/import-budget-dongles.sql` — verified INSERTs for missing budget dongles.
- **Modify** `src/app/recommendations/recommendations-content.tsx` — `amplificationStrategy` state; re-gate amp/dac/combo sections; explanatory note.
- **Modify** `src/components/recommendations/FiltersSection.tsx` — (optional) picker hint keyed off the returned strategy.

## Task Order

1. **Task 1 — Data seeding** (independent; gives Task 3 good targets).
2. **Task 2 — Resolver + unit tests** (pure, TDD).
3. **Task 3 — Route wiring** (consumes Task 2; integration-verified).
4. **Task 4 — Frontend re-gating + note** (consumes Task 3's response field).
5. **Task 5 — Picker hint** (optional polish).
6. **Task 6 — Full gate + docs/memory sync.**

---

### Task 1: Seed missing ultra-budget dongles (data)

**Files:**
- Create: `scripts/asr-crawler/output/import-budget-dongles.sql`

**Interfaces:**
- Produces: new `components` rows with `category='dac_amp'` that Task 3's combo routing can recommend. No code interface.

Only `brand`, `name`, `category` are NOT NULL (no default); every spec column is nullable. Template row shape (verified from the live DB — Moondrop Dawn Pro): `price_new=50, price_used_min=35, power_output='230mW @ 32Ω', sound_signature='neutral', needs_amp=false, impedance=NULL`.

- [ ] **Step 1: Verify each target's specs via WebSearch**

For each of: **JCally JM6, JCally JM20, Truthear SHIO, CX-Pro CX31993**, plus any sub-$60 gap found — WebSearch the manufacturer/retailer page (and a measurement source such as ASR/Audio Discourse if available) to confirm the current street `price_new`, a realistic `price_used_min`, and the rated `power_output` (e.g. `"245mW @ 32Ω"`). Record the source URL per value in a comment. **Do not proceed to Step 2 for any model whose price and power cannot both be confirmed — drop it from the batch.**

- [ ] **Step 2: Write the verified INSERT statements**

One row per confirmed model. Exact column list; example row uses the JM6 shape — replace every value with the WebSearch-confirmed number and keep the source comment:

```sql
-- scripts/asr-crawler/output/import-budget-dongles.sql
-- Budget portable DAC/amp dongles. Every price + power value verified via
-- WebSearch on 2026-07-30 (source URLs in per-row comments). No fabricated specs.

-- JCally JM6 — source: <verified-url>
INSERT INTO components (brand, name, category, price_new, price_used_min, price_used_max,
                        power_output, sound_signature, needs_amp, impedance)
VALUES ('JCally', 'JM6', 'dac_amp', 25, 18, 25, '<verified power_output>', 'neutral', false, NULL)
ON CONFLICT DO NOTHING;

-- ...one INSERT per verified model...
```

- [ ] **Step 3: Capture the pre-import count**

Run: `npm run db -- -f /dev/stdin <<'SQL'` is not supported; instead write a tiny count file and run it, or run inline (no quotes needed):
Run: `npm run db "SELECT count(*) FROM components WHERE category = 'dac_amp'"`
Expected: note the current number (e.g. 56).

- [ ] **Step 4: Apply the import**

Run: `npm run db -- -f scripts/asr-crawler/output/import-budget-dongles.sql`
Expected: `INSERT 0 N` lines, N = number of verified rows.

- [ ] **Step 5: Read back and confirm**

Run: `npm run db "SELECT brand, name, COALESCE(price_used_min, price_new) AS price, power_output FROM components WHERE category = 'dac_amp' AND COALESCE(price_used_min, price_new) <= 60 ORDER BY price"`
Expected: the newly-seeded dongles appear with the verified prices/power; the `dac_amp` count rose by N.

- [ ] **Step 6: Commit**

```bash
git add scripts/asr-crawler/output/import-budget-dongles.sql
git commit -m "data(catalogue): seed verified budget DAC/amp dongles (JCally et al.)"
```

---

### Task 2: `resolveAmplificationStrategy` pure resolver

**Files:**
- Create: `src/lib/amplification-strategy.ts`
- Test: `src/lib/__tests__/amplification-strategy.test.ts`

**Interfaces:**
- Produces (consumed by Task 3):
  - `PORTABLE_COMBO_CEILING: number` (= 150)
  - `type AmplificationStrategy = { mode: 'separate' } | { mode: 'combo'; reason: 'explicit' | 'budget' }`
  - `resolveAmplificationStrategy(input: { wants: { dac: boolean; amp: boolean; combo: boolean }; ampAllocation: number; dacAllocation: number }): AmplificationStrategy`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/__tests__/amplification-strategy.test.ts
import { describe, it, expect } from 'vitest'
import { resolveAmplificationStrategy, PORTABLE_COMBO_CEILING } from '../amplification-strategy'

const wants = (o: Partial<{ dac: boolean; amp: boolean; combo: boolean }>) =>
  ({ dac: false, amp: false, combo: false, ...o })

describe('resolveAmplificationStrategy', () => {
  it('exposes the ceiling as 150', () => {
    expect(PORTABLE_COMBO_CEILING).toBe(150)
  })

  it('explicit combo → combo/explicit regardless of budget', () => {
    expect(resolveAmplificationStrategy({ wants: wants({ combo: true }), ampAllocation: 9999, dacAllocation: 9999 }))
      .toEqual({ mode: 'combo', reason: 'explicit' })
  })

  it('amp-only under ceiling → combo/budget', () => {
    expect(resolveAmplificationStrategy({ wants: wants({ amp: true }), ampAllocation: 57, dacAllocation: 0 }))
      .toEqual({ mode: 'combo', reason: 'budget' })
  })

  it('amp-only over ceiling → separate', () => {
    expect(resolveAmplificationStrategy({ wants: wants({ amp: true }), ampAllocation: 171, dacAllocation: 0 }))
      .toEqual({ mode: 'separate' })
  })

  it('dac+amp summing to exactly the ceiling → combo/budget (inclusive)', () => {
    expect(resolveAmplificationStrategy({ wants: wants({ amp: true, dac: true }), ampAllocation: 75, dacAllocation: 75 }))
      .toEqual({ mode: 'combo', reason: 'budget' })
  })

  it('dac+amp one dollar over ceiling → separate', () => {
    expect(resolveAmplificationStrategy({ wants: wants({ amp: true, dac: true }), ampAllocation: 76, dacAllocation: 75 }))
      .toEqual({ mode: 'separate' })
  })

  it('dac-only under ceiling → combo/budget', () => {
    expect(resolveAmplificationStrategy({ wants: wants({ dac: true }), ampAllocation: 0, dacAllocation: 60 }))
      .toEqual({ mode: 'combo', reason: 'budget' })
  })

  it('a zeroed (redistributed-to-nothing) amp allocation still routes to combo', () => {
    // The exact bug scenario: amp budget redistributed to 0 because the desktop
    // amp category had nothing in range. 0 <= ceiling → combo, not a dead-end.
    expect(resolveAmplificationStrategy({ wants: wants({ amp: true }), ampAllocation: 0, dacAllocation: 0 }))
      .toEqual({ mode: 'combo', reason: 'budget' })
  })

  it('neither amp nor dac wanted → separate (nothing to route)', () => {
    expect(resolveAmplificationStrategy({ wants: wants({}), ampAllocation: 0, dacAllocation: 0 }))
      .toEqual({ mode: 'separate' })
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/__tests__/amplification-strategy.test.ts`
Expected: FAIL — `Cannot find module '../amplification-strategy'`.

- [ ] **Step 3: Write the minimal implementation**

```ts
// src/lib/amplification-strategy.ts

/**
 * Combined amp+dac sub-budget (USD) at or below which amplification is served
 * by a single portable dac_amp combo instead of separate desktop gear.
 *
 * Rationale: the portable dac_amp roster spans ~$9–$140; pure `amp` rows start
 * at $64 with a $389 median, and a bare amp still needs a separate DAC — so at
 * this tier a combo strictly dominates. Keyed on the amplification sub-budget
 * (not the total) so "headphones+amp @ $600" (amp ≈ $171) stays desktop while
 * "$300 headphones+dac+amp" (dac+amp ≈ $132) collapses to one combo.
 * Tunable: raise toward ~$200 to reach the FiiO K7 / Schiit Hel tier as a combo.
 */
export const PORTABLE_COMBO_CEILING = 150

export type AmplificationStrategy =
  | { mode: 'separate' }
  | { mode: 'combo'; reason: 'explicit' | 'budget' }

/**
 * Decide how to satisfy an amplification request. Pure — no I/O.
 * `ampAllocation`/`dacAllocation` are the dollars the budget allocator assigned
 * to those slots (0 when not requested or redistributed away).
 */
export function resolveAmplificationStrategy(input: {
  wants: { dac: boolean; amp: boolean; combo: boolean }
  ampAllocation: number
  dacAllocation: number
}): AmplificationStrategy {
  const { wants, ampAllocation, dacAllocation } = input

  if (wants.combo) return { mode: 'combo', reason: 'explicit' }
  if (!wants.amp && !wants.dac) return { mode: 'separate' }

  const amplificationBudget =
    (wants.amp ? ampAllocation : 0) + (wants.dac ? dacAllocation : 0)

  return amplificationBudget <= PORTABLE_COMBO_CEILING
    ? { mode: 'combo', reason: 'budget' }
    : { mode: 'separate' }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/__tests__/amplification-strategy.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/amplification-strategy.ts src/lib/__tests__/amplification-strategy.test.ts
git commit -m "feat(reco): add pure amplification-strategy resolver (portable-combo ceiling)"
```

---

### Task 3: Wire the strategy into the v2 route

**Files:**
- Modify: `src/app/api/recommendations/v2/route.ts`

**Interfaces:**
- Consumes: `resolveAmplificationStrategy`, `AmplificationStrategy`, `PORTABLE_COMBO_CEILING` from `@/lib/amplification-strategy` (Task 2).
- Produces (consumed by Task 4): a new response field `amplificationStrategy: AmplificationStrategy` on the JSON payload from `GET /api/recommendations/v2`.

Verify current anchors before editing (line numbers drift): the budget allocation block ends at the comment `// Use smart allocation with effective budget` around **route.ts:1135-1144**; the `results` type literal is **1146-1176**; the fetch-category `if` chain is **1181-1201**; `wantsAmpMatch` is **1250**; the assembly gates are **1348 (headphones), 1405 (dac), 1434 (amp), 1455 (combo)**.

- [ ] **Step 1: Add the import**

At the top of `route.ts`, alongside the existing `@/lib/...` imports (grep `from "@/lib/audio-calculations"` to find the cluster), add:

```ts
import {
  resolveAmplificationStrategy,
  type AmplificationStrategy,
} from "@/lib/amplification-strategy";
```

- [ ] **Step 2: Resolve the strategy + derive effective wants (after budgetAllocation is finalized, before the `results` object)**

Insert immediately after the `budgetAllocation` assignment closes (the `}` ending the `if (customBudgetAllocation) {...} else {...}` block, ~route.ts:1144) and before `const results: {`:

```ts
// Low-budget amplification: a portable dac_amp combo does the job of a separate
// DAC + amp when the amplification sub-budget is dongle-sized. Resolve once from
// the computed allocation; the *effective* wants below drive both the category
// fetch and the results assembly so they can't disagree. Skipped for custom
// allocations — a power user who hand-set amp/dac amounts gets exactly those.
const amplificationStrategy: AmplificationStrategy = customBudgetAllocation
  ? { mode: "separate" }
  : resolveAmplificationStrategy({
      wants: req.wantRecommendationsFor,
      ampAllocation: budgetAllocation.amp ?? 0,
      dacAllocation: budgetAllocation.dac ?? 0,
    });

const effectiveWants = { ...req.wantRecommendationsFor };
if (amplificationStrategy.mode === "combo" && amplificationStrategy.reason === "budget") {
  const combinedAmpBudget = (budgetAllocation.amp ?? 0) + (budgetAllocation.dac ?? 0);
  effectiveWants.amp = false;
  effectiveWants.dac = false;
  effectiveWants.combo = true;
  budgetAllocation.combo = combinedAmpBudget;
  delete budgetAllocation.amp;
  delete budgetAllocation.dac;
}
```

- [ ] **Step 3: Add `amplificationStrategy` to the `results` type + initializer**

In the `results` type literal (~1146-1168) add, next to `budgetAllocation: Record<string, number>;`:

```ts
        amplificationStrategy: AmplificationStrategy;
```

In the initializer object (~1168-1176) add, next to `budgetAllocation,`:

```ts
        amplificationStrategy,
```

- [ ] **Step 4: Switch the fetch-category chain to `effectiveWants`**

In the `requestedCategories` block (~1181-1201), replace the four `req.wantRecommendationsFor.X` gate reads with `effectiveWants.X` (headphones, dac, amp, combo). Example for the combo line:

```ts
      if (effectiveWants.combo && !categoriesWithSelections.has("combo")) {
        requestedCategories.push("dac_amp");
      }
```

- [ ] **Step 5: Widen `wantsAmpMatch` so owned-headphone matching still runs for a routed combo**

At ~route.ts:1250, change:

```ts
      const wantsAmpMatch = !!((effectiveWants.amp || effectiveWants.combo) && req.existingHeadphones);
```

(The combo path already threads `ampMatchTarget` → owned headphone; this just ensures the existing-headphone lookup fires when amp was routed to combo.)

- [ ] **Step 6: Switch the four assembly gates to `effectiveWants`**

Replace `req.wantRecommendationsFor.headphones` (~1348), `.dac` (~1405), `.amp` (~1434), `.combo` (~1455) with the `effectiveWants.` equivalents. Nothing else in those blocks changes — `ampMatchTarget`, `recommendedPairing`, and budgets already flow correctly.

- [ ] **Step 7: Type-check**

Run: `npm run type-check`
Expected: no errors. (If `effectiveWants` triggers a readonly complaint, confirm `req.wantRecommendationsFor` is a plain object — the spread copy is mutable.)

- [ ] **Step 8: Integration probe against a running dev server**

Start dev: `npm run dev` (note the port, e.g. 3000). Then:

Run:
```bash
curl -s "http://localhost:3000/api/recommendations/v2?budget=200&type=cans&wantRecommendationsFor=headphones,amp&soundSignatures=%5B%22warm%22%5D" \
  | npx tsx -e 'const j=JSON.parse(require("fs").readFileSync(0,"utf8")); console.log(JSON.stringify({mode:j.amplificationStrategy, amps:(j.amps||[]).length, combos:(j.combos||[]).map(c=>c.name), pairing:j.recommendedPairing?.amp?.name},null,2))'
```
Expected: `amplificationStrategy.mode === "combo"`, `reason === "budget"`; `amps` length 0; `combos` contains portable units (Moondrop/iFi/JCally-class); `recommendedPairing.amp.name` is one of those combos. (Confirm the exact query-param names the route reads — grep `searchParams.get(` in route.ts; the summary shows `budget`, and equipment may be `wantRecommendationsFor` or `equipment`. Use whichever the GET parser reads.)

- [ ] **Step 9: Confirm a high amplification budget still stays separate**

Run the same curl with `budget=800`. Expected: `amplificationStrategy.mode === "separate"`, and `amps` is non-empty (desktop amps still recommended). This proves the ceiling gates correctly.

- [ ] **Step 10: Eval no-regression**

Run: `npm run eval:reco -- --baseline scripts/eval/baseline.json`
Expected: nDCG@5 / P@5 deltas ≥ 0 (headphone scoring unchanged; any delta is noise, not a regression).

- [ ] **Step 11: Commit**

```bash
git add src/app/api/recommendations/v2/route.ts
git commit -m "feat(reco): route low-budget amplification to portable combos"
```

---

### Task 4: Frontend — re-gate sections on strategy + explanatory note

**Files:**
- Modify: `src/app/recommendations/recommendations-content.tsx`

**Interfaces:**
- Consumes: `amplificationStrategy: { mode: 'separate' | 'combo'; reason?: 'explicit' | 'budget' }` from the recommendations response (Task 3).

The section gates read the user's toggled `wantRecommendationsFor` (from the URL), not the API's effective wants — so without this task the amp section shows "No amplifiers in range" and the combo section never renders. Confirmed anchors: combo section gate is **recommendations-content.tsx:1587** (`wantRecommendationsFor.combo && (!isStackComplete || filteredDacAmps.length > 0)`); the amp empty-state `<h3>No amplifiers in range</h3>` is **:1579**; DAC empty state `<h3>No DACs in range</h3>` is **:1516**; the response is handled near the `setAmps(...)` call at **~:436**.

- [ ] **Step 1: Add strategy state and populate it from the response**

Near the other result state (grep `const [amps, setAmps]` / `setCombos`), add:

```ts
const [amplificationStrategy, setAmplificationStrategy] =
  useState<{ mode: 'separate' | 'combo'; reason?: 'explicit' | 'budget' } | null>(null)
```

In the response handler (near `setAmps(...)`, ~:436) add:

```ts
setAmplificationStrategy(recommendations.amplificationStrategy ?? null)
```

Add `amplificationStrategy` to the typed shape of `recommendations` if that response type is declared locally (grep the interface used for the fetch result and add the field).

- [ ] **Step 2: Derive a single boolean and use it to re-gate**

Near where `filteredAmps` / `filteredDacAmps` are computed, add:

```ts
// API collapsed a low amplification budget into a single portable combo.
const routedToCombo =
  amplificationStrategy?.mode === 'combo' && amplificationStrategy?.reason === 'budget'
```

- Change the **combo** section gate (:1587) so it also renders when routed:

```tsx
{(wantRecommendationsFor.combo || routedToCombo) && (!isStackComplete || filteredDacAmps.length > 0) && (
```

- Change the **amp** section gate (the `wantRecommendationsFor.amp && ...` wrapper above :1579) to suppress it when routed:

```tsx
{wantRecommendationsFor.amp && !routedToCombo && (
```

- Change the **DAC** section gate (the `wantRecommendationsFor.dac && ...` wrapper above :1516) the same way:

```tsx
{wantRecommendationsFor.dac && !routedToCombo && (
```

- [ ] **Step 3: Add the explanatory note above the combo list**

Inside the combo section, above the `DAC/Amp Combos` header (~:1591), render when `routedToCombo`:

```tsx
{routedToCombo && (
  <div className="px-4 py-2 text-xs text-tertiary border-b bg-surface-secondary/40">
    At this budget, a portable combo does the job of a separate DAC and amp.
  </div>
)}
```

- [ ] **Step 4: Type-check + lint**

Run: `npm run type-check && npm run lint`
Expected: no errors (lint warnings that predate this change are fine).

- [ ] **Step 5: Playwright render check at a low budget**

Reuse the prior screenshot pattern (a small `scripts/eval/_shot.mjs` using `playwright` from project `node_modules`; delete it after). Point it at `http://localhost:<port>/recommendations?b=200&type=cans&want=headphones,amp&soundSignatures=%5B%22warm%22%5D` (confirm the client param names in `src/lib/url-params.ts` — likely `b`, `type`, `want`). Assert programmatically that the page body contains `"does the job of a separate DAC and amp"` and does **not** contain `"No amplifiers in range"`, and that a combo card renders. Capture one screenshot for the review.

- [ ] **Step 6: Commit**

```bash
git add src/app/recommendations/recommendations-content.tsx
git commit -m "feat(reco): surface routed portable combo + drop empty amp/dac dead-ends"
```

---

### Task 5: (Optional) Picker hint in FiltersSection

**Files:**
- Modify: `src/components/recommendations/FiltersSection.tsx`

**Interfaces:**
- Consumes: the same `amplificationStrategy` (passed down as a prop from `recommendations-content.tsx`).

- [ ] **Step 1: Thread the prop**

Add `amplificationReason?: 'explicit' | 'budget' | null` to the `FiltersSection` props interface (grep the `interface`/`type` for its props, ~:20-40), and pass `amplificationStrategy?.reason ?? null` from the parent where `<FiltersSection ... />` is rendered.

- [ ] **Step 2: Render the hint under the Amps/DACs chips**

Below the equipment chip row (after the `Amps` chip block, ~:188-192), render:

```tsx
{amplificationReason === 'budget' && (wantRecommendationsFor.amp || wantRecommendationsFor.dac) && (
  <p className="mt-1 text-xs text-tertiary">
    At this budget we recommend a portable combo (e.g. Moondrop Dawn Pro) that does both.
  </p>
)}
```

- [ ] **Step 3: Type-check + lint, then commit**

Run: `npm run type-check && npm run lint`

```bash
git add src/components/recommendations/FiltersSection.tsx
git commit -m "feat(reco): hint that low budgets resolve to a portable combo"
```

---

### Task 6: Full gate + docs/memory sync

**Files:**
- Modify: `CLAUDE.md` (document the routing under a new note near "Gear Synergy / Amp Matching").
- Modify: `~/.claude/projects/-Users-joe-hifinder/memory/MEMORY.md` (one-line pointer).

- [ ] **Step 1: Run the full gate**

Run: `npm run type-check && npm run lint && npm run build`
Expected: all pass (pre-push runs `build`, so this must be green before any push).

- [ ] **Step 2: Re-run the eval delta one final time**

Run: `npm run eval:reco -- --baseline scripts/eval/baseline.json`
Expected: no regression.

- [ ] **Step 3: Document the routing in CLAUDE.md**

Add a short subsection under the amp-matching notes explaining `resolveAmplificationStrategy`, the `$150` `PORTABLE_COMBO_CEILING`, and that `want=amp`/`dac` at a low sub-budget resolves to a `dac_amp` combo (with `amplificationStrategy` in the response driving the UI).

- [ ] **Step 4: Update MEMORY.md pointer**

Add one line under the recommendation-engine bullet noting the low-budget portable-combo routing and the `$150` ceiling.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(reco): document low-budget portable-combo routing"
```

(MEMORY.md lives outside the repo; save it via the memory tooling, not this commit.)

- [ ] **Step 6: Stop for review before any push**

Do NOT push. Summarize what shipped and ask for approval to `git push origin feat/low-budget-portable-combo-routing` (or to merge/rebase onto staging).

---

## Self-Review

**Spec coverage:**
- Problem (empty amp dead-end) → Task 3 (routing) + Task 4 (UI suppression). ✓
- Central resolver + $150 ceiling → Task 2. ✓
- WS-A data seeding (JCally et al., verified) → Task 1. ✓
- WS-B API threading + response field → Task 3. ✓
- WS-C empty-state removal + explanatory note + picker hint → Tasks 4 & 5. ✓
- No scoring change / eval flat → Task 3 Step 10, Task 6 Step 2. ✓
- No `wantRecommendationsFor` schema change → strategy is server-side; client reads `amplificationStrategy`. ✓
- Threshold named/tunable, client never re-derives → Task 2 constant; Task 4 reads `reason`. ✓

**Placeholder scan:** The only intentional "fill from source" is Task 1's per-row spec values — mandated by the no-fabrication constraint, with an explicit verify-or-drop gate, not laziness. All code steps carry real code.

**Type consistency:** `AmplificationStrategy` shape (`{ mode; reason? }`) is identical across Task 2 (definition), Task 3 (import + response field), and Task 4/5 (client consumption). `resolveAmplificationStrategy` input `{ wants, ampAllocation, dacAllocation }` matches its Task 3 call site. `PORTABLE_COMBO_CEILING` used only inside the resolver module.

## Known risks / confirm-at-execution

- **Query-param names** for the integration curl (Task 3 Step 8) and Playwright URL (Task 4 Step 5) — confirm against `route.ts` `searchParams.get(...)` and `src/lib/url-params.ts` before running; the API and client param spellings differ (`budget`/`wantRecommendationsFor` server-side vs `b`/`want` client-side).
- **Line numbers** drift after Task 3's insertions — the plan anchors on unique comment/JSX strings; use those, not raw line numbers.
- **`customBudgetAllocation` path** is intentionally left on `separate` — verify no existing test asserts a combo collapse there.
