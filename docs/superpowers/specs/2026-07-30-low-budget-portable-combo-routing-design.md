# Design: Realistic low-budget systems via portable-combo routing

- **Date:** 2026-07-30
- **Status:** Approved (design); implementation plan pending
- **Area:** `src/app/api/recommendations/v2/route.ts`, new `src/lib/amplification-strategy.ts`, `src/app/recommendations/recommendations-content.tsx`, `src/components/recommendations/FiltersSection.tsx`, catalogue data

## Problem

At low budgets the recommender produces broken systems. Reproduced at
`b=200`, `want=headphones,amp`:

- Budget allocation splits the total by price ratio (headphones 0.5, amp 0.2),
  so the amp slot gets **~$57** and searches the `amp` category in `$20–$63`.
- The **`amp` category is desktop-skewed**: min $64, **median $389**, only 10 of
  58 rows under $120. The `$20–$63` window is essentially empty → the UI shows
  the **"No amplifiers in range"** dead-end.
- Every realistic budget-fi amplification option lives in the **`dac_amp`**
  category, which the amp path never searches: Apple USB-C Dongle $9, Moondrop
  Dawn Pro $35, Moondrop Dawn 4.4 $46, iFi GO Link Max $51, TempoTec Sonata BHD
  Pro $52, Hidizs S9 Pro $77, FiiO KA17 $98, iFi Zen DAC V2 $116, FiiO K7 $122.

**Root cause (categorical):** the engine treats "amp" as strictly the desktop
`amp` table, but budget-tier amplification is a portable `dac_amp` dongle/combo.
The two never meet, so low budgets fall into a hole.

**Secondary facts:**
- `usage` (portable vs desktop) is parsed but deliberately unused, so **budget is
  the only reliable signal** that a recommendation should be a portable combo.
- **JCally is absent from the catalogue** entirely; the ultra-budget dongle tier
  is a genuine data gap even though Moondrop/iFi/TempoTec/Apple/Hidizs cover
  $9–$120.

## Goals

1. At low budgets, recommend a high-value cheap headphone/IEM **paired with a
   portable `dac_amp` combo**, power-matched to that headphone.
2. Eliminate the "No amplifiers in range" / "No DACs in range" dead-ends when the
   realistic answer is a combo.
3. Make the collapse *legible* to the user ("one portable combo does the job of a
   separate DAC + amp at this budget").
4. Seed the missing ultra-budget dongles (JCally et al.) with **verified** specs.

## Non-goals

- No change to headphone/IEM scoring or the v3.5 weights. The eval harness must
  stay flat (`npm run eval:reco --baseline scripts/eval/baseline.json`).
- No new physics — reuse `calculateAmpAdequacy` / `ampMatchTarget` /
  `recommendedPairing`.
- No `wantRecommendationsFor` schema change; routing is server-side.
- No use of the `usage` signal (it remains deliberately unread).

## Central concept: an amplification-strategy resolver

A single isolated, pure, unit-testable function decides **how** to satisfy an
amplification request. New module `src/lib/amplification-strategy.ts` (no I/O):

```ts
export const PORTABLE_COMBO_CEILING = 150 // combined amp+dac sub-budget, USD

export type AmplificationStrategy =
  | { mode: 'separate' }                              // desktop: amp and/or dac as chosen
  | { mode: 'combo'; reason: 'explicit' | 'budget' }  // one portable dac_amp does both

export function resolveAmplificationStrategy(input: {
  wants: { dac: boolean; amp: boolean; combo: boolean }
  ampAllocation: number   // dollars allocated to the amp slot (0 if not wanted)
  dacAllocation: number   // dollars allocated to the dac slot (0 if not wanted)
}): AmplificationStrategy
```

**Rule (in order):**
1. `wants.combo === true` → `{ mode: 'combo', reason: 'explicit' }` (today's
   behavior, generalizing the collapse at `route.ts:433`).
2. `(wants.amp || wants.dac)` **and** `ampAllocation + dacAllocation <=
   PORTABLE_COMBO_CEILING` → `{ mode: 'combo', reason: 'budget' }`.
3. Otherwise → `{ mode: 'separate' }`.

**Why the sub-budget, not the total, and why $150:** the portable roster spans
$9–$140; pure amps only become viable above ~$150 (min $64, median $389, and a
bare amp still needs a separate DAC). Keying on the *amplification* allocation
means:

- `headphones+amp @ $600` → amp slot ~$171 → **separate** (Schiit Magni tier is real).
- `headphones+amp @ $200` → amp slot ~$57 → **combo/budget** (Moondrop/iFi tier).
- `headphones+dac+amp @ $300` → dac+amp ~$132 → **combo/budget** (one FiiO K7 / iFi Zen DAC).

`PORTABLE_COMBO_CEILING` is a named, exported, documented constant so it can be
tuned (e.g. raised toward ~$200 to reach the FiiO K7 / Schiit Hel tier as a
combo) and spot-checked against the eval harness. Default: **$150**.

Edge case: at a ≤$150 amplification budget the only real desktop amp is the
Schiit Magni ($70–99), and it still needs a separate DAC — so a combo strictly
dominates at this tier. Accepted.

## WS-A — Data seeding (build first)

Seed the missing ultra-budget dongles so the named brands actually appear, and so
the routing in WS-B has good targets. Inserts are trivial — only `brand`, `name`,
`category` are NOT NULL with no default; all spec columns are nullable.

- **Deliverable:** a reviewed `scripts/asr-crawler/output/import-budget-dongles.sql`.
- **Per-row fields:** `category='dac_amp'`, `price_new` / `price_used_min` /
  `price_used_max`, `power_output` (e.g. `"245mW @ 32Ω"`), `sound_signature`
  (usually `neutral`), `needs_amp=false`, `impedance=NULL`.
- **Target list (spec-verify each before writing the row):** JCally JM6, JCally
  JM20, Truthear SHIO, CX-Pro CX31993, plus any obvious sub-$60 gaps found during
  verification.
- **Verification discipline (CLAUDE.md):** every price and `power_output` value is
  confirmed via WebSearch against the manufacturer/retailer or a measurement site
  **before** it enters the SQL. No value is written from memory. Rows whose specs
  cannot be verified are dropped from the batch, not guessed.
- **Apply + confirm:** run via `npm run db -- -f`, then a `count(*)` and a
  `WHERE category='dac_amp' AND price <= 60` readback to confirm the new rows.

## WS-B — API wiring (core fix)

Thread the strategy through the request exactly once so allocation and
results-assembly agree.

1. After `allocateBudgetAcrossComponents` returns, compute `ampAllocation` /
   `dacAllocation` and call `resolveAmplificationStrategy`.
2. On `mode === 'combo'`, derive **effective wants**: `amp=false`, `dac=false`,
   `combo=true`, and set the combo budget to the summed amp+dac allocation. This
   generalizes the explicit-combo collapse already at
   [route.ts:433](../../../src/app/api/recommendations/v2/route.ts).
3. Results-assembly
   ([route.ts:1404-1473](../../../src/app/api/recommendations/v2/route.ts)) reads
   the **effective** wants → a combo section is produced; the empty amp/dac
   sections are not.
4. The existing `ampMatchTarget` and `recommendedPairing`
   ([route.ts:1478-1502](../../../src/app/api/recommendations/v2/route.ts)) already
   match the combo to the top recommended headphone — no new physics.
5. Add `amplificationStrategy: { mode, reason }` to the response payload so the UI
   can explain the collapse and suppress dead-end empty states.

**Interaction with caching:** `amplificationStrategy` is a pure function of
already-cache-keyed inputs (budget, wants), so it does not add a cache dimension.

**Gate:** headphone scoring is untouched, so
`npm run eval:reco --baseline scripts/eval/baseline.json` must show no
regression.

## WS-C — UX

Consumes `amplificationStrategy` from the API.

- **Kill the dead-ends:** when `amplificationStrategy.mode === 'combo'`, suppress
  the "No amplifiers in range" / "No DACs in range" empty states
  ([recommendations-content.tsx:1516,1579](../../../src/app/recommendations/recommendations-content.tsx))
  and render a single **"Portable DAC/Amp"** section.
- **Explain once:** an inline note near that section — *"At $200, a portable combo
  like the Moondrop Dawn Pro does the job of a separate DAC and amp."* — so the
  collapse reads as intentional.
- **Picker hint** ([FiltersSection.tsx](../../../src/components/recommendations/FiltersSection.tsx)):
  when the most recent response carried `amplificationStrategy.reason === 'budget'`,
  the Amp/DAC chips surface the same one-line hint. The threshold lives only in the
  API — the client reacts to `amplificationStrategy`, it does not re-derive $150.
  Chips are unchanged; routing does the work server-side.

## Testing & verification

- **WS-A:** `npm run db` count before/after; readback of new sub-$60 rows.
- **WS-B unit:** `resolveAmplificationStrategy` — boundary exactly at $150,
  explicit-combo, budget-combo, amp-only-high-budget stays separate, dac-only
  low-budget collapses, neither-wanted → separate.
- **WS-B integration:** hit the dev API at `b=200 want=headphones,amp` → assert a
  `dac_amp` combo appears, `recommendedPairing` is present and power-matched,
  `amplificationStrategy.mode==='combo'`, and no amp section is emitted.
- **WS-B no-regression:** `npm run eval:reco --baseline scripts/eval/baseline.json`
  flat on nDCG@5 / P@5.
- **WS-C:** Playwright render at a low budget (reuse the prior `_shot` pattern) —
  confirm the combo section + explanatory note render and "No amplifiers in
  range" is gone.
- **Full gate:** `npm run type-check && npm run lint && npm run build`.

## Build order

1. **WS-A Data** — verified dongle inserts (independent; gives WS-B good targets).
2. **WS-B API** — strategy resolver + threading (gated by eval).
3. **WS-C UX** — picker hint + empty-state removal + explanatory note.

## Resolved decisions

- **Threshold:** $150 on the combined amp+dac sub-budget, as a named exported
  constant `PORTABLE_COMBO_CEILING`, tunable. (Chosen over keying on total budget
  and over a hardcoded literal.)
- **Scope:** API routing fix + UX rework + a data-seeding pass (all three).
- **No `wantRecommendationsFor` schema change**; collapse is server-side and
  reflected to the UI via `amplificationStrategy`.
