# Stereo Builder v1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a saved 2.0 stereo system (stored as a stack) plus an honest amp power check at `/stereo`. Gear, room and seat, and loudness go in; you get a verdict with its working and the trust label of every input.

**Architecture:** Pure, tested speaker math lives in `src/lib/stereo/`, re-exported from `src/lib/audio-calculations.ts`, which stays the single source of power math. A declared-inputs runner turns a system into either a verdict or a list of exactly which values are missing. Stereo systems are `user_stacks` rows with `purpose = 'stereo'`, read and written only through new session-scoped API routes. The `/stereo` page is one client component tree: numbered steps on the left, a sticky result on the right. Anonymous users' state lives in the URL (nuqs); signed-in users can save.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 5, Tailwind v4 + CSS variables from `src/styles/design-system-variables.css`, Supabase (`supabaseServer`), NextAuth (`getServerSession(authOptions)`), nuqs, Vitest + Testing Library.

**Spec:** `docs/superpowers/specs/2026-11-03-stereo-builder-design.md` (PRD). **Mockup:** https://claude.ai/artifact/DZEcsVMW2Tsg76VSNRKnD7. It shows the binding layout and copy. Its logic is a throwaway prototype of PRD §7.

## Global Constraints

- American English spellings in all copy, comments and docs (catalog, favorite, color).
- Power math lives only in `src/lib/stereo/power.ts`, re-exported from `src/lib/audio-calculations.ts`. Never reimplement it elsewhere (CLAUDE.md "Gear Synergy"). Never call `calculatePowerAtImpedance` for speakers.
- Unknown means unknown: a missing value yields a `needs` result naming that value, never a number or a neutral placeholder.
- Every input shown in the working carries one trust label: `measured` | `claimed` | `user` | `assumed`.
- User-entered values live only in `stack_components.spec_overrides` (or the URL when anonymous). Nothing in this plan writes to `components` except the seed script (Task 13).
- Exact copy:
  - Verdict labels: `Comfortable`, `Comfortable in most rooms`, `Tight`, `Runs out`.
  - Caveat, on every power-check result: `This checks the amp. Small speakers may distort or compress before this level.`
- Loudness: a slider from 60 to 110 dB in 1 dB steps, default 85. Ticks and tier names: Quiet 65, Background 75, Normal 85, Loud 95, Club 105.
- No affiliate links on the power check.
- Migrations go in the root `migrations/` folder and are applied with `npm run db -- -f migrations/<file>.sql`, then `npm run db:types`.
- Per-user data goes only through API routes that check `getServerSession(authOptions)`. The browser's anon Supabase client can't read user tables.
- Never push without Joe's explicit approval. Work on a feature branch (`stereo-builder-v1`), never on `main`.
- Verify every import and signature with Grep before using it. Test API routes locally before any push.

## Review Focus

1. **PostgREST `neq` drops NULLs.** Filtering headphone stacks with `.neq('purpose','stereo')` silently hides every stack whose purpose is NULL. Expected: headphone stacks with a NULL purpose still appear. Test in Task 6.
2. **Junk numeric input.** A distance of 0, a blank field, `"3,5"`, a negative wattage or `NaN` from a cleared `<input type="number">` must come out as "needs X", never as an `NaN`/`Infinity` verdict. Test in Task 5.
3. **An amp rated only at 4 Ω driving 8 Ω speakers.** The 8 Ω power can't be inferred (never halve the 4 Ω figure), so the result is `needs amp.power_w_8ohm`. Test in Task 4.
4. **Sensitivity reference "Not sure".** Compute both interpretations and widen the range. Never pick one silently. Test in Task 5.
5. **Ownership and catalog isolation.** User A can't read or change user B's stereo system, and no stereo API call writes to `components`. Tests in Task 7.

---

## File map

| File | Responsibility |
|---|---|
| `src/lib/component-categories.ts` (modify) | Add `speakers`, `speaker_amp`, `STEREO_CATEGORIES`, `HEADPHONE_SYSTEM_CATEGORIES` |
| `migrations/add-stereo-categories.sql` (create) | Widen `components_category_check` |
| `src/lib/stereo/specs.ts` (create) | Spec/profile types, tolerant parsers, override merge |
| `src/lib/stereo/power.ts` (create) | Sensitivity conversion, amp power resolution, SPL at seat, verdict |
| `src/lib/stereo/power-check.ts` (create) | Declared inputs, simple-mode defaults, `runPowerCheck` |
| `src/lib/audio-calculations.ts` (modify) | Re-export `./stereo/power` |
| `migrations/add-stereo-stacks.sql` (create) | `system_profile`, item columns, reference constraint |
| `src/types/gear.ts`, `src/lib/stacks.ts` (modify) | `'stereo'` purpose; headphone code skips stereo stacks |
| `src/app/api/stereo-systems/route.ts`, `.../items/route.ts` (create) | Saved stereo systems CRUD |
| `src/app/api/stereo-catalog/route.ts` (create) | Public catalog search for speakers / speaker amps |
| `src/lib/stereo/url-params.ts` (create) | nuqs schema for anonymous state |
| `src/components/stereo/*` (create) | Result panel, gear step + inline chooser, room step, loudness slider |
| `src/app/stereo/{layout,page}.tsx`, `src/components/stereo/StereoBuilder.tsx` (create) | Page wiring, load/save |
| `src/lib/stereo/seed.ts`, `scripts/seed-stereo-catalog.ts`, `scripts/stereo-seed/stereo-seed.json` (create) | Validated catalog seed |

---

### Task 1: Stereo categories

**Files:**
- Modify: `src/lib/component-categories.ts` (CATEGORY L14, aliases L45), `src/types/index.ts:13` (`Component.category` union)
- Create: `migrations/add-stereo-categories.sql`
- Test: `src/lib/__tests__/component-categories.test.ts`

**Interfaces:**
- Produces:
  - `CATEGORY.SPEAKERS = 'speakers'`, `CATEGORY.SPEAKER_AMP = 'speaker_amp'`
  - `STEREO_CATEGORIES: readonly string[] = ['speakers','speaker_amp']`
  - `HEADPHONE_SYSTEM_CATEGORIES: readonly string[] = ['cans','iems','dac','amp','dac_amp','cable']`
  - `ComponentCategory` now includes both new values

- [ ] **Step 1: Write failing tests** in `component-categories.test.ts`:
  - `AMP_CATEGORIES` does not contain `'speaker_amp'`.
  - `HEADPHONE_CATEGORIES` does not contain `'speakers'`.
  - `normalizeCategory('Speakers')` and `normalizeCategory('speaker')` both return `'speakers'`.
  - `normalizeCategory('speaker_amp')` returns `'speaker_amp'`.
  - `normalizeCategory('amplifier')` still returns `'amp'`. The headphone meaning is unchanged.
  - `isCategoryIn('speaker_amp', HEADPHONE_SYSTEM_CATEGORIES)` is `false`.
- [ ] **Step 2: Run** `npx vitest run src/lib/__tests__/component-categories.test.ts`. Expected: FAIL, since `STEREO_CATEGORIES` and friends are undefined.
- [ ] **Step 3: Implement.** Add the two `CATEGORY` keys, the two exported arrays, and aliases `speaker`/`speakers` → `speakers` and `speaker_amp` → `speaker_amp`. Don't map `integrated` or `receiver`. Extend the `Component.category` union in `src/types/index.ts`. Update the header comment so it lists 8 values.
- [ ] **Step 4: Run** the test file, then `npm run type-check`. Expected: PASS. If type-check finds an exhaustive `switch`/`Record<ComponentCategory,…>` that breaks, give `speakers`/`speaker_amp` explicit no-op entries. Don't widen to `string`.
- [ ] **Step 5: Write the migration.**
  - First run `npm run db "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'components'::regclass AND contype = 'c'"` and copy the live constraint name. If the CLI strips the quotes (see the db-cli quoting memory), put the query in a `.sql` file and run it with `-f`.
  - `migrations/add-stereo-categories.sql`: `ALTER TABLE components DROP CONSTRAINT IF EXISTS <live name>;` then `ADD CONSTRAINT components_category_check CHECK (category IN ('cans','iems','dac','amp','dac_amp','cable','speakers','speaker_amp'));`.
- [ ] **Step 6: Apply and verify.** Run `npm run db -- -f migrations/add-stereo-categories.sql`, then re-run the Step 5 query. Expected: the new definition lists 8 values.
- [ ] **Step 7: Commit** `feat(categories): add speakers and speaker_amp, kept out of headphone groups`

### Task 2: Keep stereo rows out of headphone flows

**Files (list/search queries with no explicit category set, from a grep of `from('components')`):**
- Modify: `src/app/api/components/route.ts`, `src/app/api/components/search/route.ts`, `src/app/api/components/browse/route.ts`, `src/app/api/filters/counts/route.ts`, `src/app/api/components/[id]/pairings/route.ts`, `src/app/sitemap.ts`, `src/app/recommendations/page.tsx`, `src/components/landing/LandingPage.tsx`, `src/components/gear/GearImportModal.tsx`, `src/app/gear/page.tsx`, `src/lib/gear.ts`
- Exempt (lookups by id or admin): `components/[id]/page.tsx`, `api/admin/**`, `stacks/from-recommendations`, `AlertsTab.tsx`
- Test: `src/app/api/components/__tests__/route.test.ts`, `src/app/api/components/search/__tests__/route.test.ts`

**Interfaces:**
- Consumes: `HEADPHONE_SYSTEM_CATEGORIES` (Task 1)

- [ ] **Step 1: Write failing tests.** In both route test files, assert the Supabase mock chain received `.in('category', HEADPHONE_SYSTEM_CATEGORIES)` when the request has no `category` param. Each file's existing `mockChain` already records calls, so assert on `mockChain.in`.
- [ ] **Step 2: Run** both files. Expected: FAIL.
- [ ] **Step 3: Implement.** In each listed file, wherever a `components` query doesn't already restrict category to headphone-era values, add `.in('category', HEADPHONE_SYSTEM_CATEGORIES)`. Where a query already filters by category from user input, check that input with `isCategoryIn(x, HEADPHONE_SYSTEM_CATEGORIES)` and ignore it otherwise.
- [ ] **Step 4: Run** `npm test` and `npm run eval:reco -- --baseline scripts/eval/baseline.json`. Expected: tests PASS. nDCG@5 and P@5 are unchanged from the current main run (record both numbers in the commit body).
- [ ] **Step 5: Commit** `fix(components): exclude stereo categories from headphone listings and search`

### Task 3: Stereo spec types and tolerant parsers

**Files:**
- Create: `src/lib/stereo/specs.ts`
- Test: `src/lib/__tests__/stereo-specs.test.ts`

**Interfaces — Produces:**
```ts
export type Trust = 'measured' | 'claimed' | 'user' | 'assumed'
export interface SpecValue<T> { value: T; trust: Trust; source_url?: string | null }
export type SensitivityRef = '1W' | '2.83V' | 'unknown'
export interface ReviewLink { outlet: string; url: string; kind: 'measurement' | 'listening' | 'pairing' }
export interface SpeakerSpecs {
  sensitivity_db?: SpecValue<number>; sensitivity_ref?: SpecValue<SensitivityRef>
  nominal_impedance_ohms?: SpecValue<number>; min_impedance_ohms?: SpecValue<number>
  f3_hz?: SpecValue<number>; directivity_q?: SpecValue<number>; review_links?: ReviewLink[]
}
export type PowerRatingKind = 'continuous' | 'peak' | 'unknown'
export interface SpeakerAmpSpecs {
  subtype?: 'integrated' | 'power' | 'receiver'
  power_w_8ohm?: SpecValue<number>; power_w_4ohm?: SpecValue<number>
  power_rating?: { kind: PowerRatingKind; thd_pct?: number; channels_driven?: 'all' | 'two' | 'one' | 'unknown' }
  outputs?: { sub_out?: boolean; pre_out?: boolean; phono?: boolean }; review_links?: ReviewLink[]
}
export type Acoustics = 'lively' | 'average' | 'damped'
export type RoomPresetId = 'small_bedroom' | 'office' | 'living_room' | 'large_open_plan'
export interface SystemProfile {
  room: { length_m: number; width_m: number; height_m: number } | null
  room_preset: RoomPresetId | null; acoustics: Acoustics | null
  distance_m: number | null; near_wall: boolean | null; target_peak_db: number
}
export function parseSpeakerSpecs(json: unknown): SpeakerSpecs
export function parseSpeakerAmpSpecs(json: unknown): SpeakerAmpSpecs
export function parseSystemProfile(json: unknown): SystemProfile
export function applyOverrides<T extends object>(catalog: T, overrides: unknown, parse: (j: unknown) => T): T
```

- [ ] **Step 1: Write failing tests:**
  - `parseSpeakerSpecs({ sensitivity_db: { value: 87, trust: 'claimed', source_url: 'https://x' } })` keeps the value.
  - Out-of-range values are dropped:
    - sensitivity outside 70–110
    - impedance outside 1–32 Ω
    - power outside 0.1–5000 W
    - distance outside 0.3–20 m
    - room dimensions outside 1.5–50 m
  - Non-numbers (`"87"`, `NaN`, `null`) and an unknown `trust` are dropped. No call throws.
  - `parseSystemProfile({})` returns `target_peak_db: 85`, and `null` for every other field. `target_peak_db` is clamped to 60–110 and rounded.
  - `applyOverrides(catalogSpecs, { sensitivity_db: { value: 90 } }, parseSpeakerSpecs)` returns sensitivity 90 with `trust: 'user'`, whatever trust the override claims. Catalog fields that aren't overridden keep their trust.
- [ ] **Step 2: Run** `npx vitest run src/lib/__tests__/stereo-specs.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the types and parsers in `src/lib/stereo/specs.ts`. Parsers are total: unknown input becomes an empty object. The ranges above are named, exported constants (`SPEC_RANGES`).
- [ ] **Step 4: Run** the test. Expected: PASS.
- [ ] **Step 5: Commit** `feat(stereo): spec and profile types with tolerant parsers`

### Task 4: Power math

**Files:**
- Create: `src/lib/stereo/power.ts`
- Modify: `src/lib/audio-calculations.ts` (append `export * from './stereo/power'` and a one-line comment)
- Test: `src/lib/__tests__/stereo-power.test.ts`

**Interfaces:**
- Consumes: `SpeakerAmpSpecs`, `Acoustics` (Task 3)
- Produces:
```ts
export const DEFAULT_DIRECTIVITY_Q = 2
export const PAIR_GAIN_DB = 3
export const ABSORPTION: Record<Acoustics, number> = { lively: 0.15, average: 0.25, damped: 0.4 }
export const PEAK_RATING_DERATE_DB = 3
export const LOW_IMPEDANCE_CAUTION_OHMS = 3.2
export const COMFORTABLE_MARGIN_DB = 3
export function sensitivityPerWatt(sensitivityDb: number, ref: '1W' | '2.83V', nominalOhms: number): number
export type AmpPowerBasis = 'rated' | 'eight_ohm_lower_bound'
export interface ResolvedAmpPower { watts: number; ratedWatts: number; basis: AmpPowerBasis; derated: boolean; conditionsUnknown: boolean; lowImpedanceCaution: boolean }
export function resolveAmpPower(amp: SpeakerAmpSpecs, speakerNominalOhms: number, speakerMinOhms?: number): ResolvedAmpPower | null
export interface SeatLevel { inRoom: number; freeField: number }
export function levelAtSeatPerWatt(sens1W: number, distanceM: number, room: { length_m: number; width_m: number; height_m: number }, acoustics: Acoustics, opts?: { q?: number; speakers?: 1 | 2 }): SeatLevel
export type VerdictKind = 'comfortable' | 'comfortable_most_rooms' | 'tight' | 'runs_out'
export const VERDICT_LABELS: Record<VerdictKind, string>
export interface PowerVerdict { kind: VerdictKind; label: string; headroomInRoomDb: number; headroomFreeFieldDb: number; requiredWattsInRoom: number; requiredWattsFreeField: number; maxCleanPeakDb: { low: number; high: number } }
export function powerVerdict(targetPeakDb: number, level: SeatLevel, ampWatts: number): PowerVerdict
```

- [ ] **Step 1: Write failing tests:**
  - `sensitivityPerWatt(89,'2.83V',4)` ≈ 85.99. Corrections: 0 dB at 8 Ω, −1.25 dB at 6 Ω (both 2 dp), −3.01 dB at 4 Ω. `sensitivityPerWatt(91,'1W',8)` = 91.
  - **Worked example (PRD §7.5):** `levelAtSeatPerWatt(85.99, 3, room5x4x2_6, 'average').freeField` ≈ 79.45 (1 dp). Then `powerVerdict(100, …, x).requiredWattsFreeField` ≈ 113.5 (0 dp).
  - **Mockup fixture:**
    - Inputs: sens 83.99 (87 dB @ 2.83 V, 4 Ω), room 5×4×2.6 m, `'average'`, 3 m.
    - `inRoom` ≈ 86.90 and `freeField` ≈ 77.45 (1 dp).
    - At 95 dB with 80 W: kind `comfortable`, `headroomInRoomDb` ≈ 10.9, `headroomFreeFieldDb` ≈ 1.5.
  - **`resolveAmpPower`:**

    | Amp ratings | Speaker nominal | Expected |
    |---|---|---|
    | `{p8:50, p4:80, continuous}` | 4 Ω | 80 W, basis `rated` |
    | same | 8 Ω | 50 W |
    | same | 6 Ω | 50 W, basis `eight_ohm_lower_bound` |
    | `{p8:50, p4:100, peak}` | 4 Ω | 50 W, `derated: true`, `ratedWatts: 100` |
    | `{p8:35, continuous}` | 4 Ω | 35 W, basis `eight_ohm_lower_bound` |
    | `{p4:100}` only | 8 Ω | `null` (Review Focus 3) |
    | `{p8:35}` | 4 Ω, minimum 3.0 Ω | `lowImpedanceCaution: true` |
    | rating kind `'unknown'` | any | `conditionsUnknown: true`, not derated |

  - **Verdict branches:**
    - The fixture at 95 dB with 50 W gives `comfortable_most_rooms` (in-room ≈ 8.9, free-field < 0).
    - With 50 W at 110 dB it gives `runs_out`, `maxCleanPeakDb` ≈ { low: 94.4, high: 103.9 }.
    - The fixture with 80 W at 104 dB gives `tight` (in-room headroom ≈ 1.9).
  - `VERDICT_LABELS` equals the exact Global Constraints copy.
- [ ] **Step 2: Run** `npx vitest run src/lib/__tests__/stereo-power.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** in `src/lib/stereo/power.ts`. Formulas (PRD §7.1–7.5):

    | Quantity | Formula |
    |---|---|
    | Sensitivity per watt | `S_1W = S − 10·log10(8/Z)` for 2.83 V ratings |
    | Free field | `L = S_1W − 20·log10(r) + pair` |
    | In-room | `L = Lw + 10·log10(Q/(4πr²) + 4/R) + pair`, where `Lw = S_1W − 10·log10(Q) + 10.99`, `R = S·ᾱ/(1−ᾱ)`, `S = 2(LW+LH+WH)` |
    | Required watts | `P = 10^((target − L_1W)/10)` |
    | Headroom | `H = 10·log10(P_amp/P_req)` |

    Verdict kinds:
    - `comfortable`: H_room ≥ 3 and H_free ≥ 0
    - `comfortable_most_rooms`: H_room ≥ 3 only
    - `tight`: 0 ≤ H_room < 3
    - `runs_out`: otherwise

    Power resolution: use the 4 Ω rating when nominal ≤ 4 and it exists. Otherwise use the 8 Ω rating, labeled `eight_ohm_lower_bound` when nominal < 8. A peak rating loses 3 dB (×0.5). The doc comment cites the acoustics reference used (PRD §7.3 requires it). If the reference forces a model change, change it here and update the fixtures in the same commit.
- [ ] **Step 4: Run** the test, then `npx vitest run src/lib/__tests__/audio-calculations.test.ts`. Expected: both PASS, and the existing headphone tests are untouched.
- [ ] **Step 5: Commit** `feat(stereo): speaker power math (sensitivity, amp power, seat level, verdict)`

### Task 5: Declared inputs and the power-check runner

**Files:**
- Create: `src/lib/stereo/power-check.ts`
- Test: `src/lib/__tests__/stereo-power-check.test.ts`

**Interfaces:**
- Consumes: Tasks 3–4
- Produces:
```ts
export type InputId = 'speakers.sensitivity_db' | 'speakers.nominal_impedance_ohms' | 'amp.power_w_8ohm' | 'amp.power_w_4ohm' | 'seat.distance_m' | 'room.size' | 'room.acoustics'
export interface MissingInput { id: InputId; label: string; hint: string }
export interface WorkingRow { step: string; value: string; trust: Trust | 'modeled' }
export interface Assumption { id: InputId | 'speakers.placement' | 'speakers.directivity'; text: string }
export const LOUDNESS_TIERS: readonly { id: 'quiet'|'background'|'normal'|'loud'|'club'; label: string; peakDb: number; feel: string }[]
export function tierFor(peakDb: number): (typeof LOUDNESS_TIERS)[number]
export const ROOM_PRESETS: Record<RoomPresetId, { label: string; length_m: number; width_m: number; height_m: number }>
export const AMP_ONLY_CAVEAT = 'This checks the amp. Small speakers may distort or compress before this level.'
export type PowerCheckOutcome =
  | { status: 'ok'; verdict: PowerVerdict; ampPower: ResolvedAmpPower; working: WorkingRow[]; assumptions: Assumption[]; caveat: string; sensitivityRange: boolean }
  | { status: 'needs'; missing: MissingInput[]; caveat: string }
export interface PowerCheckInput { speakers: SpeakerSpecs | null; amp: SpeakerAmpSpecs | null; profile: SystemProfile; mode: 'simple' | 'advanced' }
export function runPowerCheck(input: PowerCheckInput): PowerCheckOutcome
```

- [ ] **Step 1: Write failing tests:**
  - **Fixture system → `ok`:** the Task 4 fixture as specs plus a profile gives `ok` with `comfortable`. Its `working` rows have the trust labels `claimed`, `claimed`, `modeled`, `modeled`, `modeled`.
  - **Missing sensitivity:** gives `needs` with `missing[0].id === 'speakers.sensitivity_db'` and no numeric verdict anywhere.
  - **Junk input (Review Focus 2):** `distance_m` of `0`, `NaN`, `-1` and `null` in advanced mode all give `needs` with `seat.distance_m`.
  - **Simple mode:** a `null` room or distance gives `ok`, with assumptions that include "medium living room" and "3 m". Each assumed value's working row has trust `assumed`.
  - **Sensitivity reference `'unknown'` (Review Focus 4):** gives `ok` with `sensitivityRange: true`. The headroom is the worse of the two interpretations, and the `maxCleanPeakDb` range spans both.
  - **8 Ω speakers with an amp rated only at 4 Ω:** gives `needs` with `amp.power_w_8ohm`.
  - **Caveat:** `caveat === AMP_ONLY_CAVEAT` in both branches.
  - **Tiers:** `tierFor(95).label === 'Loud'`, `tierFor(105).label === 'Club'`, and `tierFor(64).label === 'Quiet'`.
- [ ] **Step 2: Run** `npx vitest run src/lib/__tests__/stereo-power-check.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - **Declared inputs:** a table of each required input with its label and hint (copy from the mockup, e.g. "Usually on the back panel or in the manual, written like '87 dB (2.83 V/1 m)'"). It drives `missing`. Advanced mode never fills defaults.
  - **Simple-mode defaults:** room preset `living_room`, acoustics `average`, distance 3 m. Each one fills a value and records an `Assumption`.
  - **Preset values** [Claude's call, tunable]:
    - `small_bedroom` 3.5×3×2.4 m
    - `office` 3×3×2.4 m
    - `living_room` 5×4×2.6 m
    - `large_open_plan` 8×6×2.7 m
  - **Tier boundaries** match the mockup: below 70 Quiet, below 80 Background, below 90 Normal, below 100 Loud, otherwise Club.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(stereo): declared-input power check with simple-mode assumptions`

### Task 6: Stereo stacks schema; headphone code ignores them

**Files:**
- Create: `migrations/add-stereo-stacks.sql`
- Modify:
  - `src/types/gear.ts` (`StackPurpose` L58, `UserStack` L60, `StackComponent` L72)
  - `src/lib/stacks.ts` (`purposeIcons` L125, `checkStackCompatibility` L47)
  - `src/app/api/user/dashboard/route.ts:36-66`
  - `src/app/api/user/activity/route.ts:42`
  - `src/app/api/admin/users/route.ts:38,49`
  - `src/app/gear/page.tsx` (the stacks view list)
- Regenerate: `src/types/supabase.ts`
- Test: `src/lib/__tests__/stacks.test.ts` (create if absent), `src/app/api/stacks/__tests__/route.test.ts`

**Interfaces — Produces:**
- `StackPurpose` gains `'stereo'`, and `purposeIcons.stereo = '🔊'`. This follows the existing emoji map.
- `UserStack.system_profile?: unknown | null`
- `StackComponent` gains `role?: StackRole | null`, `spec_overrides?: unknown | null`, `custom_brand?`, `custom_name?`, `custom_category?: string | null`
- `export type StackRole = 'speakers' | 'amp' | 'sub' | 'source'`
- `export const isStereoStack = (s: Pick<UserStack,'purpose'>) => s.purpose === 'stereo'` (in `stacks.ts`)
- `HEADPHONE_STACK_FILTER = 'purpose.is.null,purpose.neq.stereo'` (exported from `stacks.ts`, for `.or(...)`)

- [ ] **Step 1: Check existing data.** Run `npm run db "SELECT count(*) FROM stack_components WHERE user_gear_id IS NOT NULL AND component_id IS NOT NULL"` and note the result in the migration header.
- [ ] **Step 2: Write the migration** `migrations/add-stereo-stacks.sql`:
  - `user_stacks`: `ADD COLUMN system_profile JSONB`
  - `stack_components`: `ADD COLUMN role TEXT CHECK (role IN ('speakers','amp','sub','source'))`, `spec_overrides JSONB`, `custom_brand TEXT`, `custom_name TEXT`, `custom_category TEXT`
  - `DROP CONSTRAINT stack_component_has_reference`, then add `CHECK (user_gear_id IS NOT NULL OR component_id IS NOT NULL OR custom_name IS NOT NULL)` and `ADD CONSTRAINT stack_component_custom_is_alone CHECK (custom_name IS NULL OR (user_gear_id IS NULL AND component_id IS NULL))`
  - `CREATE UNIQUE INDEX idx_stack_components_stack_role ON stack_components(stack_id, role) WHERE role IS NOT NULL`
  - **Deviation from the PRD's "exactly one":** existing rows may carry both `user_gear_id` and `component_id`, so only custom items are forced to be alone. Record this in the migration header.
- [ ] **Step 3: Apply and regenerate.** Run `npm run db -- -f migrations/add-stereo-stacks.sql`, then `npm run db:types`. Expected: `src/types/supabase.ts` shows the new columns on both Row types.
- [ ] **Step 4: Write failing tests:**
  - `checkStackCompatibility({ ...stereoStack, purpose: 'stereo' })` returns `[]`, even with speakers and no headphone amp.
  - `isStereoStack` works.
  - In the stacks route tests, a `POST` with `purpose: 'stereo'` is accepted.
  - A new dashboard test asserts the query uses `.or(HEADPHONE_STACK_FILTER)`, not `.neq` (Review Focus 1).
- [ ] **Step 5: Run.** Expected: FAIL.
- [ ] **Step 6: Implement** the type changes and the early return in `checkStackCompatibility`. Apply `.or(HEADPHONE_STACK_FILTER)` to the dashboard, activity and admin-count queries. Filter `isStereoStack` out of the `/gear` stacks view, adding a one-line link "Stereo systems live on the Stereo page".
- [ ] **Step 7: Run** `npm test && npm run type-check`. Expected: PASS.
- [ ] **Step 8: Commit** `feat(stacks): stereo purpose, profile and custom items; headphone views skip them`

### Task 7: Stereo systems API

**Files:**
- Create: `src/app/api/stereo-systems/route.ts`, `src/app/api/stereo-systems/items/route.ts`
- Test: `src/app/api/stereo-systems/__tests__/route.test.ts`, `src/app/api/stereo-systems/items/__tests__/route.test.ts` (copy the mock setup from `src/app/api/stacks/__tests__/route.test.ts`, and make the `from()` proxy record table names)

**Interfaces:**
- Consumes: `parseSystemProfile`, `parseSpeakerSpecs`, `parseSpeakerAmpSpecs` (Task 3), `StackRole` (Task 6)
- Produces (all routes require a session; 401 otherwise):
  - `GET /api/stereo-systems` → `{ systems: Array<UserStack & { stack_components: StackComponent[] }> }`, only `purpose = 'stereo'` for `session.user.id`. Items include `components(id, brand, name, category, technical_specs)` through `components!stack_components_component_id_fkey`.
  - `POST /api/stereo-systems` `{ name: string; system_profile?: unknown }` → 201 `{ system }`. The profile is stored as `parseSystemProfile(input)`, and `purpose` is forced to `'stereo'`.
  - `PATCH /api/stereo-systems` `{ id; name?; system_profile? }` → `{ system }`, scoped by `user_id`, 404 if not found.
  - `DELETE /api/stereo-systems?id=` → `{ ok: true }`, scoped by `user_id`.
  - `PUT /api/stereo-systems/items` `{ stack_id; role: StackRole; component_id?: string; custom?: { brand?: string; name: string }; spec_overrides?: unknown }` → `{ item }`. It verifies the stack belongs to the user and is stereo. When `component_id` is given, the component's category must be in `STEREO_CATEGORIES`. It replaces the existing item in that role (delete, then insert) and stores the parsed overrides.
  - `DELETE /api/stereo-systems/items?stack_id=&role=` → `{ ok: true }`

- [ ] **Step 1: Write failing tests:**
  - Each method returns 401 without a session.
  - GET filters `.eq('purpose','stereo')` and `.eq('user_id', 'user-123')`.
  - POST stores `purpose: 'stereo'` and a parsed profile. A junk profile becomes defaults, never a 500.
  - PATCH and DELETE on another user's id return 404 (Review Focus 5).
  - PUT on a non-stereo stack returns 400.
  - PUT with a `cans` component returns 400.
  - PUT with `custom` and no `component_id` inserts `custom_name` and `spec_overrides`.
  - Across all tests, the mock never sees `from('components')` followed by `insert`, `update` or `upsert` (Review Focus 5).
- [ ] **Step 2: Run** both test files. Expected: FAIL.
- [ ] **Step 3: Implement** following the `src/app/api/stacks/route.ts` pattern exactly: imports, the `getServerSession(authOptions)` guard, manual validation, try/catch with `console.error` and a 500.
- [ ] **Step 4: Run** the tests. Expected: PASS. Then `npm run dev` and use `curl` to check that each route returns 401 when signed out (CLAUDE.md: test endpoints locally).
- [ ] **Step 5: Commit** `feat(api): stereo systems and items routes`

### Task 8: Stereo catalog search API

**Files:**
- Create: `src/app/api/stereo-catalog/route.ts`
- Test: `src/app/api/stereo-catalog/__tests__/route.test.ts`

**Interfaces — Produces:**
- `GET /api/stereo-catalog?role=speakers|amp&q=<text>` → `{ items: StereoCatalogItem[] }` (public, read-only)
- `export interface StereoCatalogItem { id: string; brand: string; name: string; category: 'speakers' | 'speaker_amp'; specs: SpeakerSpecs | SpeakerAmpSpecs }`. Export the type from `src/lib/stereo/specs.ts`.

- [ ] **Step 1: Write failing tests:**
  - `role=speakers` queries `.eq('category','speakers')`, and `role=amp` queries `'speaker_amp'`.
  - Any other role returns 400.
  - `q` becomes `.or('brand.ilike.%q%,name.ilike.%q%')` with `%` and `,` stripped from `q`. Results are capped at 20.
  - `specs` passes through the matching parser.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** with `supabaseServer`, using the same shape as `src/app/api/components/search/route.ts`.
- [ ] **Step 4: Run** the tests, then `curl 'localhost:3000/api/stereo-catalog?role=speakers'` against the dev server. Expected: 200 with `items: []` before the seed.
- [ ] **Step 5: Commit** `feat(api): stereo catalog search`

### Task 9: URL state for anonymous systems

**Files:**
- Create: `src/lib/stereo/url-params.ts`
- Test: `src/lib/__tests__/stereo-url-params.test.ts`

**Interfaces — Produces:** `export const stereoParams` for `useQueryStates`, in the style of `src/lib/url-params.ts`, with `clearOnDefault: true`:

| Key | Meaning | Parser |
|---|---|---|
| `spk`, `amp` | catalog ids | `parseAsString` |
| `sx`, `ax` | hand-entered specs | `parseAsJson` through `parseSpeakerSpecs` / `parseSpeakerAmpSpecs` |
| `rp` | room preset id | |
| `l`, `w`, `h` | room dimensions | floats |
| `ac` | acoustics | |
| `d` | distance | float |
| `db` | target peak | int clamped to 60–110, default 85 |

It also exports `profileFromParams(p): SystemProfile`.

- [ ] **Step 1: Write failing tests:**
  - The `db` parser clamps `200` to 110, and `'abc'` gives the default.
  - `sx` with junk JSON gives `{}`.
  - `profileFromParams` maps the keys onto `SystemProfile`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** with `createParser`, `parseAsJson` and `parseAsString` from `'nuqs'`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(stereo): URL state for anonymous systems`

### Task 10: Result panel

**Files:**
- Create: `src/components/stereo/PowerResultPanel.tsx`
- Test: `src/components/stereo/__tests__/PowerResultPanel.test.tsx` (check that `vitest.config.ts` `include` covers `src/**/*.test.tsx`, which it does)

**Interfaces:**
- Consumes: `PowerCheckOutcome`, `tierFor` (Task 5)
- Produces: `export function PowerResultPanel(props: { outcome: PowerCheckOutcome; targetPeakDb: number; distanceM: number | null; onEditAssumption?: (id: Assumption['id']) => void }): JSX.Element`
- **Layout,** matching the mockup's "Result for this system" card, top to bottom:
  1. Eyebrow
  2. Verdict pill: green for both comfortable kinds, amber for tight and runs out
  3. Headline
  4. Meter: track 60–110 dB, a band for `maxCleanPeakDb`, a marker for the target
  5. Two reasons
  6. Caveat
  7. "We assumed" chips
  8. `<details open>` "Show the working" table: Step / Value / Source
  9. "What listeners report", with the empty state "No linked reviews for this pairing yet. Listening reports are kept separate from the numbers above and never change the verdict."
- **Headlines:**

  | Kind | Headline |
  |---|---|
  | `comfortable` | `About {round(H_room)} dB to spare at your seat.` |
  | `comfortable_most_rooms` | the same, plus ` It could run short if your room helps less than estimated.` |
  | `tight` | `Under 3 dB to spare. Peaks will push this amp to its limit.` |
  | `runs_out` | `About {max(1, round(-H_room))} dB short. Clean peaks top out around {low}–{high} dB at your seat.` |

- [ ] **Step 1: Write failing tests:**
  - An `ok` outcome renders its label text, the caveat, and the working rows with their trust labels.
  - A `needs` outcome renders "No verdict yet" and the missing label, and contains no text matching `/\d+ dB to spare/`.
  - The meter is `aria-hidden`, and the same numbers appear in the text.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** with Tailwind plus the CSS variables used on the gear page (`var(--background-primary)`, `var(--text-primary)`, `var(--text-secondary)`, `var(--border-subtle)`, `var(--accent-primary)`; the last is defined in `src/styles/design-system-variables.css`). For button backgrounds behind white text, use `--accent-hover` (`#b5431e`): `--accent-primary` gives only 4.48:1. Icons come from `lucide-react`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(stereo): power result panel`

### Task 11: Input steps (gear with inline chooser, room and seat, loudness)

**Files:**
- Create: `src/components/stereo/GearStep.tsx`, `src/components/stereo/GearChooser.tsx`, `src/components/stereo/RoomStep.tsx`, `src/components/stereo/LoudnessSlider.tsx`
- Test: `src/components/stereo/__tests__/steps.test.tsx`

**Interfaces:**
- Consumes: `StereoCatalogItem` (Task 8), `SpeakerSpecs`/`SpeakerAmpSpecs`/`SystemProfile`/`ROOM_PRESETS`/`ABSORPTION`/`LOUDNESS_TIERS`/`tierFor` (Tasks 3–5)
- Produces:
  - `export type GearPick = { kind: 'catalog'; item: StereoCatalogItem } | { kind: 'custom'; brand: string; name: string; specs: SpeakerSpecs | SpeakerAmpSpecs }`
  - `GearStep(props: { speakers: GearPick | null; amp: GearPick | null; ampNote: string | null; missing: MissingInput[]; onChange: (role: 'speakers' | 'amp', pick: GearPick) => void })`. Numbered step 1, "Your gear". Two tiles in signal order (Amplifier → Speakers), each with a "Change amplifier" / "Change speakers" button that toggles `GearChooser` inline, full width under the tiles. Only one chooser is open at a time.
    - When `missing` contains a `speakers.*` or `amp.*` id, that tile shows an inline prompt with only that field, its hint, and the mockup's phone missing-value copy ("We need your speakers' sensitivity." / "It changes the answer by several dB, so we won't guess it.").
    - Submitting the prompt calls `onChange` with the tile's current pick plus that value, labeled `user`.
  - `GearChooser(props: { role: 'speakers' | 'amp'; current: GearPick | null; onPick: (p: GearPick) => void; onClose: () => void })`
    - Tabs: "Catalog" / "Enter it yourself".
    - Catalog fetches `/api/stereo-catalog?role=…&q=…`, debounced 250 ms.
    - **Manual fields, speakers:** brand and model, sensitivity, measured at (2.83 V / 1 W / Not sure), nominal impedance (4/6/8/16/Not sure).
    - **Manual fields, amp:** power into 8 Ω, power into 4 Ω if listed, "What kind of rating is it?" (RMS/continuous, Peak/max, Not stated).
    - Footer: `Leave anything blank you don't know. Saved to this system only, labeled "your entry".`
  - `RoomStep(props: { profile: SystemProfile; onChange: (p: SystemProfile) => void })`
    - Numbered step 2, "Room and seat". **Expanded by default** [Joe].
    - Fields: length/width/height, "How the room sounds" (Lively/Average/Damped with the mockup's descriptions), plus a Collapse button.
    - Collapsed: shows `{L} × {W} × {H} m · {Acoustics} acoustics` and "Edit room".
    - The listening-distance input is visible in both states.
  - `LoudnessSlider(props: { valueDb: number; onChange: (db: number) => void })`
    - Numbered step 3, "How loud you listen".
    - Large editable number with "dB", the tier name, and the tier's feel line.
    - `<input type="range" min=60 max=110 step=1>` with ticks 65/75/85/95/105, positioned at `(db−60)/50`.
    - Log note: `dB is a log scale: every +10 dB sounds about twice as loud, and takes 10× the amp power. Equal steps on this slider are not equal steps in watts.`

- [ ] **Step 1: Write failing tests:**
  - **GearStep:** clicking "Change amplifier" shows the chooser with the "Catalog" tab selected. Picking an item calls `onChange('amp', …)`.
  - **RoomStep:** expanded by default. After Collapse, the distance input is still in the document and the summary text appears.
  - **LoudnessSlider:** changing the range to 105 shows "Club". The range input has `min="60"`, `max="110"` and `step="1"`.
  - **GearChooser manual tab:** blank fields are allowed, and submitting calls `onPick` with only the filled fields.
  - **GearStep with `missing=[{ id: 'speakers.sensitivity_db', … }]`:** shows a single sensitivity input on the speakers tile. Submitting `87` calls `onChange('speakers', …)` with `sensitivity_db.value === 87` and `trust === 'user'`.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** to the mockup's layout, using real `<button>`, `<label>` and `<input>` elements, touch targets of at least 44 px, and `aria-expanded` on the toggles. Mock `fetch` in tests with `vi.stubGlobal('fetch', …)`.
- [ ] **Step 4: Run.** Expected: PASS.
- [ ] **Step 5: Commit** `feat(stereo): gear, room and loudness steps`

### Task 12: `/stereo` page, load/save and navigation

**Files:**
- Create: `src/app/stereo/layout.tsx` (metadata `title: 'Stereo power check | HiFinder'`), `src/app/stereo/page.tsx` (`<Suspense>` wrapper like `src/app/gear/page.tsx`), `src/components/stereo/StereoBuilder.tsx`
- Modify: `src/components/navigation/DesktopNav.tsx` (`publicNavItems` L7), `src/components/navigation/MobileMenu.tsx` (`publicNavItems` L9). Add `{ href: '/stereo', label: 'Stereo' }`.
- Test: `src/components/stereo/__tests__/StereoBuilder.test.tsx`

**Interfaces:**
- Consumes: everything above
- Produces: `export function StereoBuilder(): JSX.Element` (`'use client'`)
  - **Anonymous:** state comes from `useQueryStates(stereoParams)`. "Copy link" copies `location.href`. "Save system" sends the user to sign-in with a callback back to the current URL.
  - **Signed in** (`useSession()` from `'next-auth/react'`): `?system=<id>` loads through `GET /api/stereo-systems`. Edits save through `PATCH` (profile) and `PUT …/items` (gear), debounced 800 ms. "Save system" on an unsaved URL state does a `POST` and then the `PUT`s.
  - **Mode:** `simple` until the user changes any room or seat field, then `advanced` (PRD §6.4).
  - **Layout:** a flex-wrap row. Left column (`flex: 3 1 600px`) holds steps 1–3; right column (`flex: 2 1 420px`, `position: sticky; top: 24px`) holds `PowerResultPanel`. On phones they stack.
  - Route name `/stereo` [Claude's call]: it avoids colliding with the existing `curated_systems` feature (`src/lib/curated-systems.ts`).

- [ ] **Step 1: Write failing tests:**
  - With mocked catalog data for the fixture speaker and amp, the page shows "Comfortable" and "About 11 dB to spare at your seat." at db=95.
  - Removing the speaker's sensitivity shows "No verdict yet".
  - When signed out, "Save system" links to `/api/auth/signin` with a `callbackUrl`. Mock `useSession` and nuqs with its testing adapter if available in the installed version; otherwise wrap in `NuqsAdapter` from `'nuqs/adapters/next'`. Check the export with Grep first.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the page and the nav items.
  - Add the PRD §9 entry links: a "Speakers?" text link to `/stereo` on the landing page and on the recommendations page. Put them near the existing category controls; the builder picks the exact spot.
  - **Usage metrics (PRD §10):** grep for an existing client analytics helper (`@vercel/analytics` `track`, `gtag`, or a `src/lib/analytics*` module). If one exists, emit three events: `stereo_verdict_shown` with the verdict kind and whether any input was `assumed`, `stereo_system_saved`, and `stereo_system_edited`. If none exists, skip this and list it in the PR as a follow-up. Don't add a new analytics dependency.
- [ ] **Step 4: Run** `npm test`. Then start the dev server with preview_start, open `/stereo`, and check:
  - The fixture renders with these numbers, and the slider and amp swap change them.
  - The room collapse keeps the distance input.
  - At phone width (375) the steps come first, then the result.
  - The console shows no errors.
  Take a screenshot for the PR.
- [ ] **Step 5: Commit** `feat(stereo): /stereo page with save, URL state and nav link`

### Task 13: Catalog seed script with validation

**Files:**
- Create: `src/lib/stereo/seed.ts`, `scripts/seed-stereo-catalog.ts`, `scripts/stereo-seed/stereo-seed.json` (an empty `[]` for now)
- Modify: `package.json` (add `"seed:stereo": "tsx scripts/seed-stereo-catalog.ts"`)
- Test: `src/lib/__tests__/stereo-seed.test.ts`

**Interfaces — Produces:**
- `export interface SeedEntry { brand: string; name: string; category: 'speakers' | 'speaker_amp'; technical_specs: SpeakerSpecs | SpeakerAmpSpecs; price_new?: number | null; manufacturer_url?: string | null }`
- `export function validateSeedEntry(e: unknown): { ok: true; entry: SeedEntry } | { ok: false; errors: string[] }`

- [ ] **Step 1: Write failing tests.** These are rejected:
  - a missing brand or name
  - a category outside `STEREO_CATEGORIES`
  - any spec value without an `http(s)` `source_url`
  - a trust other than `measured` or `claimed`
  - speakers with no `sensitivity_db` and no `nominal_impedance_ohms`
  - an amp with neither power rating

  A valid entry passes and keeps its values unchanged.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement** the validator, then the script, following the `scripts/clean-driver-types.js` conventions:
  - `dotenv` loading `.env.local`, then `createClient(NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)`.
  - Dry run by default, `--execute` to write. Dry run prints `⚠️  DRY RUN MODE - No changes made / Run with --execute to apply changes`.
  - Match existing rows on case-insensitive `brand` + `name`. Insert new rows and update existing ones, with `source: 'stereo_seed'`.
  - Print a summary: valid, invalid with reasons, to insert, to update.
- [ ] **Step 4: Run** the tests, then `npm run seed:stereo`. Expected: tests PASS, and the dry run reports 0 entries.
- [ ] **Step 5: Commit** `feat(stereo): validated catalog seed script`

### Task 14: Seed data (30–50 speakers and speaker amps)

This is a research task with no code. It needs a fresh context.

**Files:** `scripts/stereo-seed/stereo-seed.json`

- [ ] **Step 1: Choose models** from the demand-scan brands (Klipsch, KEF, SVS, ELAC, Edifier, Wharfedale, Emotiva, Arendal, Yamaha, Fosi, WiiM), roughly 60% speakers and 40% amps, including at least 5 vintage models from HiFi Engine. If the automated candidate-review pipeline from the separate session has merged, run the entries through it. Otherwise apply its rules by hand:
  - Exact model match only.
  - Every URL comes from a page fetched in this session, never from memory (CLAUDE.md).
  - Every value appears on its cited page. Spot-check one value per entry by refetching.
  - `measured` only for ASR, Erin's Audio Corner, Stereophile or spinorama data. Manufacturer, manual and retailer values are `claimed`.
  - Amp ratings record `power_rating.kind`.
- [ ] **Step 2: Run** `npm run seed:stereo`. Expected: every entry valid, 0 invalid.
- [ ] **Step 3: Run** `npm run seed:stereo -- --execute`, then `npm run db "SELECT category, count(*) FROM components WHERE category IN ('speakers','speaker_amp') GROUP BY 1"`. Expected: counts match the file.
- [ ] **Step 4: Check** that `/stereo` catalog search finds a seeded model and that headphone search (`/api/components/search?q=<seeded brand>`) does not.
- [ ] **Step 5: Commit** `data(stereo): seed N speakers and M speaker amps with sources`

### Task 15: Whole-branch verification

- [ ] **Step 1: Run** `npm run lint && npm run type-check && npm run type-check:tests && npm test && npm run build`. Expected: all pass. Quote the counts in the PR body.
- [ ] **Step 2: Run** `npm run eval:reco -- --baseline scripts/eval/baseline.json`. Expected: identical to `main`. The stereo work must not move headphone rankings.
- [ ] **Step 3: Check the PRD's §10 accuracy guard:** grep the result panel and runner for any path that renders a number when `status === 'needs'` (expected: none), and confirm the test in Task 10 Step 1 covers it.
- [ ] **Step 4: Update** CLAUDE.md with a short "Stereo Builder" section: source-of-truth files, the `/stereo` route, the `HEADPHONE_STACK_FILTER` gotcha, and the seed command.
- [ ] **Step 5: Commit, then stop.** Ask Joe before any push. "Push to staging" means `git push origin staging`.
