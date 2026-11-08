# Stereo Builder: Advanced Mode and System Checks Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task by task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an Advanced mode to `/stereo` that shows every input and three new
checks next to the existing power check:

1. **Gain:** can the source actually drive the amp to its rated power?
2. **Tonal shift:** how much the amp's output impedance (damping factor) and the
   speaker cable shift the frequency response with these speakers.
3. **Hiss:** will the amp's noise be audible through these speakers at the seat?

Simple mode stays the default and stays quiet. It gains one line at most, and
only when a check finds a real problem.

**Spec:** `docs/superpowers/specs/2026-11-03-stereo-builder-design.md` (PRD).
**Mockup:** https://claude.ai/artifact/Y4sm6GuyL8YVUkT77jCCTV (Advanced on desktop, Simple on a phone, and every check and limit state). It sets the layout and copy.
This plan implements part of PRD §13 item 2 (impedance interaction) plus two
checks that §13 doesn't list yet (gain, hiss). Task 1 amends the PRD first.

**Architecture:** Each check is a pure, declared-inputs runner in
`src/lib/stereo/`, following the `runPowerCheck` pattern. Each returns `ok`
(with its own working, assumptions and notes), `needs` (the exact missing
inputs) or `not_applicable`. A new orchestrator, `runSystemChecks`, runs them
all. The checks are independent (PRD §6.3: "the other checks still run"), with
one deliberate coupling: the gain check can **cap** the watts the power check
uses, because a source that can't drive the amp to full power makes the power
verdict wrong. The UI renders the outcomes as they come and computes nothing.

**Tech Stack:** as in the v1 plan, plus Recharts (already a dependency) for the
tonal-shift chart.

## Global Constraints

Everything in the v1 plan's Global Constraints still applies. In addition:

- **Math lives in `src/lib/stereo/`.** New modules are re-exported from
  `src/lib/audio-calculations.ts`. Don't put speaker-amp interaction math in
  components or routes.
- **Unknown means unknown, with one stated exception.** For solid-state and
  class-D amps with no output impedance, simple mode may assume a typical value
  as an `assumed` chip (Task 5). For tube, hybrid or unknown topology the result
  is always `needs`, because a guess between 1 Ω and 4 Ω flips the verdict.
- **Damping factor is stored as the source states it.** That means
  `damping_factor` plus its reference load (and frequency when given). Output
  impedance is derived in code, and the working row says so ("converted from
  damping factor 50 at 8 Ω"). One stored fact, one derivation.
- **No folklore.** Copy never says a higher damping factor "tightens bass" or
  "controls the woofer" beyond what the divider and Qes math shows. The tonal
  check's explainer states that above about 20 to 50 the effect is inaudible.
- **Every threshold is a named, exported constant whose doc comment carries
  its source** from "Sources for constants" below. A figure taken from a
  secondary source, or derived by arithmetic rather than a listening test,
  says so in its comment. New figures are found by WebSearch, never from
  memory. This is the same rule as `MUSIC_PEAK_ALLOWANCE_DB`.
- **Secondary checks never block or nag.** Their `needs` show as "Add X to
  check this", never as the red "We need" treatment the power check uses.
- **No schema migration.** New specs go in `components.technical_specs` and
  `stack_components.spec_overrides`, new profile fields in
  `user_stacks.system_profile` (all JSONB). The `source` role is already
  allowed by `add-stereo-stacks.sql`.

## Decisions (settled by Joe, 2026-11-07)

| # | Decision |
|---|---|
| D1 | **Advanced mode keeps the room data.** Entered values are used as entered in both modes; unset ones stay `assumed` chips. Advanced only reveals more inputs and checks. Switching modes never changes a verdict. |
| D2 | The mode is remembered in the URL param `adv=1` plus a per-browser localStorage preference, not in the saved system. |
| D3 | Simple mode shows only the single worst secondary `problem`, as one line that links to Advanced. |
| D4 | §13 order: gain → tonal → hiss, with speaker limits (Tasks 10 to 12) folded into the power verdict. |

## Sources for constants

Each constant's doc comment carries its source. When the figure comes from a
secondary source, the comment says so and names the primary to check.

| Constant | Value | Basis |
|---|---|---|
| `TONAL_INAUDIBLE_DB` | 0.5 dB span | Half the lower end of the broad-resonance detection range below. It's a conservative "no change" line, not a measured threshold. |
| `TONAL_NOTE_DB`, `TONAL_CLEAR_DB` | 1 dB, 2 dB | Toole & Olive, "The Modification of Timbre by Resonances", JAES 36(3), 1988 ([AES e-lib 5163](https://www.aes.org/e-lib/browse.cfm?elib=5163)): broad, low-Q resonances are detectable at about 1–2 dB, and narrow ones need about 10 dB. That figure is secondhand, via [audioXpress, "Testing Loudspeakers: Which Measurements Matter, Part 1"](https://audioxpress.com/article/testing-loudspeakers-which-measurements-matter-part-1). An output-impedance divider over a speaker's impedance curve produces exactly these broad, low-Q shapes. Check the paper's figure before ship. Also cite Bücklein, "The Audibility of Frequency Response Irregularities", JAES 29(3), 1981 ([AES e-lib 10291](https://aes.org/publications/elibrary/elibrary-page/?id=10291)): peaks are more audible than dips. |
| Stereophile's simulated-load method | n/a | It's the evidence that the divider effect is real and measured. For example, PrimaLuna's 8 Ω tap shows ±3.1 dB into the simulated speaker ([measurements](https://stereophile.com/content/primaluna-prologue-premium-power-amplifier-measurements)), while Simaudio's Moon i-1 shows minimal change ([measurements](https://stereophile.com/content/simaudio-moon-i-1-integrated-amplifier-measurements)). Use these as worked-example tests: the model, fed Stereophile's measured Zout and its standard simulated load, should land near Stereophile's figure. |
| Copper resistance | derived | Don't use a table. AWG diameter is d = 0.127 mm × 92^((36−n)/39) ([UCSB physics handout](https://web.physics.ucsb.edu/~phys13BH/w2014/awg.pdf)). Annealed-copper resistivity is 1.7241×10⁻⁸ Ω·m at 20 °C (the IACS 100% definition). 16 AWG comes out at about 13.2 mΩ/m, matching [HyperPhysics' AWG table](https://hyperphysics.gsu.edu/hbase/Tables/wirega.html) (4.016 Ω/1000 ft, 13.2 Ω/km at 20 °C; verified 2026-11-07). Use that table as the test oracle for 12 to 18 AWG. The UCSB constant implies about 1.68×10⁻⁸; the 3% gap is inside the tolerance of real cable. Cite IACS as the basis. |
| `ROOM_BACKGROUND_DBA` | 30 dBA | Quiet homes are about 30–40 dBA. The 35–40 dBA figure is from Pearsons et al. 1977 (cited in an [auditory.org posting](https://auditory.org/mhonarc/2026/msg00010.html)), and [nonoise.org's table](https://nonoise.org/library/household/index.htm) lists "Quiet Room 28-33" and "Typical Living Room 40" dBA (verified 2026-11-07). 30 is the quiet end, which is the worst case for hiss. |
| `HISS_MASKED_MARGIN_DB` | 10 dB | Hiss 10 dB below the room's background adds 0.4 dB to it (power sum). This is arithmetic, not a listening test, so the doc comment must say so. Hiss is treble-heavy and room noise is bass-heavy, so the check is optimistic for an ear near a tweeter. `note` if hiss is above background − 10, `problem` if it's above background. |
| Speaker max SPL | see Task 10 | AES75-2022 (M-noise, level raised until compression or coherence fails; [AES announcement](https://aes2.org/?p=18749)). IEC 60268-21 SPLmax (100 h without damage, ignores distortion; per the [IOA 2022 paper](https://pub.ioa.org.uk/conference-proceeding/reproduced-sound-2022-vol44-pt3/j-hipperson-comparison-of-splmax-using-aes75-and-multitone-distortion--mtd--methods)). Erin's Audio Corner compression sweeps at 96 and 102 dB @ 1 m (e.g. [ELAC DB63](https://erinsaudiocorner.com/loudspeakers/elac_db63/)). |
| `SPEAKER_COMPRESSION_LIMIT_DB` | 3 dB | The AES75 revision draft's "3 dB compression anywhere" criterion, reported from the task group chair's talk ([AES Melbourne](https://aesmelbourne.org.au/?p=7481)). It's a draft, so label it that way. |
| Power-handling derates | program −3 dB, peak −6 dB | Relative to continuous, per [EAW, "Power Handling"](https://eaw.com/wp-content/uploads/2020/12/Power_Handling.pdf) (a 6 dB crest factor test signal) and the [Teufel support note](https://support.teufel.de/hc/en-us/articles/360007857679-How-should-the-different-power-specifications-of-loudspeakers-and-power-amplifiers-be-evaluated). |

## Review Focus

1. **Gain cap feeding the power verdict.** With a 2 V source into an amp rated
   100 W/8 Ω at 2.5 V input sensitivity, the power check must use about 64 W,
   not 100 W, and say why in the working. Test in Task 4.
2. **SNR with an unknown reference.** Treat it as referenced to rated power,
   which gives the highest noise voltage and so the worst case. Never treat it
   as 1 W silently. Test in Task 6.
3. **"DF > 200".** A lower-bound damping factor parses to an *upper bound* on
   output impedance, and the result says "at most". Test in Task 2.
4. **Tube amp, no output impedance.** The result is `needs`, never `assumed`,
   in both modes. Test in Task 5.
5. **Junk input.** A cable length of 0, a gauge of 0 or 50, a negative noise
   value, or a curve with one point or non-monotonic frequencies all parse to
   missing, never NaN. Tests in Tasks 2 and 3.
6. **No regressions in simple mode.** Existing `stereo-power-check` and
   `PowerResultPanel` tests pass unchanged. When no source is entered, the
   power result is byte-identical to before.


## Status (2026-11-07)

Built on `claude/affectionate-babbage-yyjfit`: Tasks 1 to 7 and 9 to 11, and
Task 12's UI (the speaker-limit fields and the "Limited by" line). Not yet done:
- **Task 8 and Task 12 step 3, the seed data.** Sourcing needs each review page
  read. Stereophile's pages return 403 to this environment (Cloudflare), so
  they need another route.
- **The Stereophile cross-check test in Task 3** needs Stereophile's
  simulated-load curve transcribed, which is blocked for the same reason.
- **The meter's second marker** for the speakers' ceiling (Task 12 step 1). The
  "Limited by" line and the working row carry it for now.

Deviations from the plan:
- The tonal chart is hand-drawn SVG, not Recharts. It's a fixed-scale line
  with one shaded band, and SVG keeps it light and themeable through CSS
  variables.
- The check cards show their working in a nested "How we worked this out",
  reusing the power card's table (`WorkingTable`).

---

## File map

| File | Responsibility |
|---|---|
| `docs/superpowers/specs/2026-11-03-stereo-builder-design.md` (modify) | Amend §6.4, §8.2 and §13 |
| `src/lib/stereo/specs.ts` (modify) | New speaker, amp and source fields; cable profile fields; parsers; `SPEC_RANGES` |
| `src/lib/stereo/interaction.ts` (create) | Output impedance, cable resistance, divider, deviation |
| `src/lib/stereo/gain.ts` (create) | Amp gain, reachable power from a source |
| `src/lib/stereo/noise.ts` (create) | Noise voltage from µV or SNR, hiss level at the seat |
| `src/lib/stereo/checks.ts` (create) | `CheckOutcome`, the gain/tonal/hiss runners, `runSystemChecks` |
| `src/lib/stereo/power-check.ts` (modify) | Optional `sourceLimit` cap; widen `InputId` |
| `src/lib/audio-calculations.ts` (modify) | Re-export the new modules |
| `src/lib/stereo/url-params.ts` (modify) | `adv`, `srx`, `cl`, `cg` |
| `src/components/stereo/ModeToggle.tsx` (create) | Simple / Advanced segmented control |
| `src/components/stereo/SourceTile.tsx` (create) | Source role, with presets |
| `src/components/stereo/SpecFields.tsx` (modify) | Advanced-only fields |
| `src/components/stereo/RoomStep.tsx` (modify) | Cable run (Advanced) |
| `src/components/stereo/SystemChecksPanel.tsx` (create) | One card per secondary check |
| `src/components/stereo/TonalShiftChart.tsx` (create) | Deviation vs frequency, with a table fallback |
| `src/components/stereo/PowerResultPanel.tsx` (modify) | Simple-mode problem line; gain-cap row |
| `src/components/stereo/StereoBuilder.tsx` (modify) | Mode state, `runSystemChecks`, source item persistence |
| `src/lib/stereo/seed.ts`, `scripts/stereo-seed/stereo-seed.json` (modify) | New sourced fields |
| `CLAUDE.md` (modify) | Stereo section: the new checks and their sources of truth |

---

### Task 1: Amend the PRD

**Files:** Modify `docs/superpowers/specs/2026-11-03-stereo-builder-design.md`

- [ ] **Step 1: §6.4.** Record the D1 to D3 decisions as Joe settles them.
- [ ] **Step 2: §8.2.** Add the fields from Task 2 to the spec schema block.
- [ ] **Step 3: §13.** Insert "Source gain matching" and "Amp hiss with
  efficient speakers" ahead of impedance interaction. Split item 2: *output
  impedance × impedance* (this plan) and *load difficulty / EPDR plus tube taps*
  (later). Move "Speaker limits" to just after this plan, and note that it
  matters for every amp, not just tubes.
- [ ] **Step 4: Decisions log.** Add the "DF stored as stated, Zout derived"
  and "secondary checks never block" calls.
- [ ] **Step 5: Commit** `docs(stereo): plan advanced mode and system checks in the PRD`

### Task 2: Spec fields and parsers

**Files:** Modify `src/lib/stereo/specs.ts`. Test: `src/lib/__tests__/stereo-specs.test.ts`

**Interfaces (produces):**
```ts
export type AmpTopology = 'solid_state' | 'class_d' | 'tube' | 'hybrid'
export interface ImpedancePoint { hz: number; ohms: number }

// SpeakerSpecs gains:
max_impedance_ohms?: SpecValue<number>          // the bass resonance peak, usually
impedance_curve?: SpecValue<ImpedancePoint[]>   // catalog only in this plan (measured)

// SpeakerAmpSpecs gains:
topology?: AmpTopology
output_impedance_ohms?: SpecValue<number>
damping_factor?: SpecValue<number> & { ref_ohms?: number; at_hz?: number; lower_bound?: boolean }
input_sensitivity_v?: SpecValue<number>         // input volts for rated output
gain_db?: SpecValue<number>                     // alternative to input sensitivity
output_noise_uv?: SpecValue<number>             // A-weighted when stated
snr_db?: SpecValue<number> & { ref?: 'rated' | '1W' | 'unknown' }

// New:
export type SourceKind = 'dac' | 'dac_balanced' | 'phono' | 'preamp' | 'other'
export interface SourceSpecs { kind?: SourceKind; output_v?: SpecValue<number>; has_volume?: boolean }
export function parseSourceSpecs(json: unknown): SourceSpecs

// SystemProfile gains:
cable: { length_m: number | null; awg: number | null } | null
```

`SPEC_RANGES` gains: `output_impedance_ohms [0.001, 20]`, `damping_factor [0.5, 10000]`,
`input_sensitivity_v [0.05, 10]`, `gain_db [0, 60]`, `output_noise_uv [1, 100000]`,
`snr_db [40, 140]`, `source_output_v [0.05, 20]`, `cable_length_m [0.3, 50]`, `awg [8, 24]`.

- [ ] **Step 1: Write failing tests.**
  - Each new field round-trips. Out-of-range values or the wrong type are dropped.
  - `damping_factor` keeps `ref_ohms` (default 8 when absent), `at_hz` and `lower_bound`.
  - `impedance_curve` needs at least 3 points, frequencies strictly increasing
    and within 10 Hz to 40 kHz, and ohms in `impedance_ohms` range. Anything else
    is dropped whole, not trimmed.
  - `parseSystemProfile` accepts `cable` and still parses a v1 profile with no
    `cable` key (it becomes `null`).
  - `applyOverrides` stamps `trust: 'user'` on the new fields, including the
    nested `damping_factor`.
- [ ] **Step 2: Run** `npx vitest run src/lib/__tests__/stereo-specs.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Follow the existing `numericSpec` and `parseSpecValue` helpers.
- [ ] **Step 4: Run** the tests and `npm run type-check`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(stereo): spec fields for gain, noise, output impedance and cable`

### Task 3: Pure math modules

**Files:** Create `src/lib/stereo/interaction.ts`, `gain.ts` and `noise.ts`; modify
`src/lib/audio-calculations.ts`. Tests: `src/lib/__tests__/stereo-interaction.test.ts`,
`stereo-gain.test.ts`, `stereo-noise.test.ts`

**Interfaces (produces):**
```ts
// interaction.ts
export function outputImpedanceFromDampingFactor(df: number, refOhms = 8): number    // refOhms / df
export function cableLoopResistanceOhms(lengthM: number, awg: number): number         // 2 × length × copper Ω/m
export function dividerDb(zSpeaker: number, zSource: number): number                  // 20·log10(Zs/(Zs+Zsrc))
export function responseDeviation(curve: ImpedancePoint[], zSource: number):
  { points: { hz: number; db: number }[]; spanDb: number }                            // normalized to the curve's mean dB
export function deviationSpanBound(nominal: number, min?: number, max?: number, zSource: number):
  { spanDb: number; isLowerBound: boolean }                                           // lower bound unless both min and max are known
export const TONAL_INAUDIBLE_DB = 0.5     // see Sources for constants
export const TONAL_NOTE_DB = 1
export const TONAL_CLEAR_DB = 2
export function awgDiameterMm(awg: number): number                                    // 0.127 × 92^((36−n)/39)
export const COPPER_RESISTIVITY_OHM_M = 1.7241e-8                                     // IACS 100%, 20 °C

// gain.ts
export function ampGainDb(ratedWatts8: number, inputSensitivityV: number): number     // 20·log10(√(8P)/Vin)
export function reachableWatts(sourceV: number, gainDb: number, ampWatts: number, loadOhms: number):
  { watts: number; limited: boolean }                                                 // min(ampWatts, (Vs·G)²/Z)

// noise.ts
export function noiseVoltsFromSnr(snrDb: number, refWatts: number, loadOhms = 8): number   // √(P·R)/10^(SNR/20)
export function hissAtSeatDb(sens1W: number, noiseV: number, nominalOhms: number,
  distanceM: number, room: RoomDims, acoustics: Acoustics): SeatLevel                 // reuses levelAtSeatPerWatt + 10·log10(Vn²/Z)
export const ROOM_BACKGROUND_DBA = 30     // see Sources for constants
export const HISS_MASKED_MARGIN_DB = 10
```

- [ ] **Step 1: Write failing tests from worked examples.** These go into the
  test files as tables:
  - Divider. An "8 Ω" speaker with min 3.2 Ω and max 30 Ω: Zsrc 0.05 gives a
    span of about 0.12 dB; Zsrc 1 gives about 2.1 dB; Zsrc 3 gives about 4.9 dB.
    The same speaker without `max` returns `isLowerBound: true`, and its span
    is never larger than the min-and-max result.
  - Cable. `awgDiameterMm(14)` is about 1.628 mm. 16 AWG copper is about
    13.2 mΩ/m, so 5 m comes to about 0.13 Ω loop resistance.
  - Stereophile cross-check. The PrimaLuna and Moon i-1 cases from "Sources
    for constants" land within ±0.5 dB of the published simulated-load
    deviation when fed the published Zout. Transcribe Stereophile's
    simulated-load curve once as a test fixture, with its source URL.
  - DF. 50 at 8 Ω gives 0.16 Ω; a stated ref of 4 Ω gives 0.08 Ω.
  - Gain. 100 W/8 Ω with 2.5 V sensitivity gives 21.1 dB. A 2 V source into
    8 Ω reaches 64 W (`limited: true`); a 4 V balanced source reaches the full
    100 W (`limited: false`).
  - Noise. 90 dB SNR re 100 W/8 Ω gives about 894 µV. A 100 dB/W speaker with
    1 mV of noise at 1 m free field and a single speaker gives about 31 dB. The
    in-room and pair figures go through `levelAtSeatPerWatt`, so they inherit
    its existing tests.
  - Junk. Zero or negative inputs throw, or return `NaN` guarded by the caller.
    Pick one and test it. The runners (Task 4) never pass junk because the
    parsers drop it first.
- [ ] **Step 2: Run** the tests. Expected: FAIL.
- [ ] **Step 3: Implement.** Each file starts with a header comment that has
  the formula and a reference, like `power.ts`. Re-export all three from
  `audio-calculations.ts`.
- [ ] **Step 4: Run** the tests. Expected: PASS.
- [ ] **Step 5: Commit** `feat(stereo): pure math for tonal shift, gain and hiss`

### Task 4: Check runners and the orchestrator

**Files:** Create `src/lib/stereo/checks.ts`; modify `src/lib/stereo/power-check.ts`.
Tests: `src/lib/__tests__/stereo-checks.test.ts`, plus additions to `stereo-power-check.test.ts`

**Interfaces (produces):**
```ts
export type CheckId = 'gain' | 'tonal' | 'hiss'
export type Severity = 'ok' | 'note' | 'problem'
export type CheckOutcome<D> =
  | { status: 'ok'; severity: Severity; headline: string; working: WorkingRow[];
      assumptions: Assumption[]; notes: string[]; detail: D }
  | { status: 'needs'; missing: MissingInput[] }          // always soft (Global Constraints)
  | { status: 'not_applicable'; reason: string }

export interface GainDetail { gainDb: number; sourceV: number; reachableWatts: number; ratedWatts: number; limited: boolean }
export interface TonalDetail { zSourceOhms: number; spanDb: number; isLowerBound: boolean; curve?: { hz: number; db: number }[]; impliedDf: number }
export interface HissDetail { hissDb: SeatLevel; noiseUv: number; fromSnr: boolean }

export interface SystemCheckInput {
  speakers: SpeakerSpecs | null; amp: SpeakerAmpSpecs | null; source: SourceSpecs | null
  profile: SystemProfile; mode: 'simple' | 'advanced'
}
export interface SystemChecks {
  power: PowerCheckOutcome
  gain: CheckOutcome<GainDetail>; tonal: CheckOutcome<TonalDetail>; hiss: CheckOutcome<HissDetail>
}
export function runSystemChecks(input: SystemCheckInput): SystemChecks

// power-check.ts: PowerCheckInput gains an optional
sourceLimit?: { watts: number; sourceV: number; trust: Trust }
```

The orchestrator runs gain first. If `limited`, it passes `sourceLimit` to
`runPowerCheck`, which uses `min(resolved.watts, sourceLimit.watts)`. It adds a
working row "Limited by source level: 2 V reaches 64 W of 100 W" and a note.
With no `sourceLimit`, the power output is unchanged.

**Rules per check:**
- **Gain.**
  - `not_applicable` when there's no source, or the amp is integrated and the
    source is `preamp`.
  - `needs` source output or amp sensitivity/gain, otherwise.
  - Severity is `problem` when `limited` costs 1 dB or more, `note` when it
    costs less, otherwise `ok`.
  - A note when gain is very high (> 35 dB) with a source that has no volume
    control: "Volume will sit low; small knob movements make big changes."
- **Tonal.**
  - Zsrc = Zout + cable loop resistance.
  - Zout comes from `output_impedance_ohms`, otherwise from `damping_factor`.
    A `lower_bound` DF gives an "at most" figure.
  - Otherwise, for `solid_state`, assume 0.05 Ω; for `class_d`, 0.1 Ω, with a
    note that some class-D amps' treble varies with the load. Both are
    `assumed` chips. For any other topology, `needs`.
  - The cable defaults to an assumed 3 m of 16 AWG, as a chip.
  - The result uses the curve when there is one, otherwise `deviationSpanBound`.
  - Severity: span below `TONAL_INAUDIBLE_DB` is `ok` ("No audible change"),
    up to `TONAL_CLEAR_DB` is `note`, above it is `problem`.
  - Copy describes a *change in tonal balance*, not damage, and with a curve it
    names the bands ("about +1.5 dB around 60 Hz").
- **Hiss.**
  - Uses `output_noise_uv` first, otherwise `snr_db`. An `unknown` SNR
    reference counts as rated power, the worst case, and the working says so.
  - It reuses the power check's resolved room, distance and sensitivity. Share
    one internal resolver; don't recompute differently.
  - Severity: in-room hiss at or below `ROOM_BACKGROUND_DBA −
    HISS_MASKED_MARGIN_DB` is `ok`, at or below `ROOM_BACKGROUND_DBA` is
    `note`, else `problem`. The headline compares hiss to the room ("about
    8 dB under a quiet room"), never a bare number.
  - A note for integrated amps: "Noise specs are often measured at a low volume
    setting; hiss can rise with the volume knob."

- [ ] **Step 1: Write failing tests.**
  - Each Review Focus case.
  - Each severity boundary.
  - Gain `not_applicable` and `needs` paths.
  - Power output deep-equal to the current result when the source is absent.
  - A `problem` from one check doesn't change the others.
- [ ] **Step 2: Run** the tests. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test`. Expected: PASS, with existing stereo tests unchanged.
- [ ] **Step 5: Commit** `feat(stereo): gain, tonal shift and hiss checks with source-limited power`

### Task 5: URL state and saved systems

**Files:** Modify `src/lib/stereo/url-params.ts` and `src/components/stereo/StereoBuilder.tsx`.
Tests: `src/lib/__tests__/stereo-url-params.test.ts` and `src/components/stereo/__tests__/StereoBuilder.test.tsx`

- [ ] **Step 1: Write failing tests.**
  - `adv` parses `1` as true and anything else as false. It clears on default.
  - `srx` goes through `applyOverrides`, so a crafted URL can't claim `measured` trust.
  - `cl` and `cg` are clamped through `SPEC_RANGES`, and out-of-range values become null.
  - A v1 URL with none of these params loads exactly as before.
  - The saved-system draft round-trips the source as a `role: 'source'` custom
    item (custom name defaults to "Source") with `spec_overrides`, and the cable
    as part of `system_profile`.
- [ ] **Step 2: Implement.**
  - Add the params.
  - `Draft` gains `source`.
  - `persist` writes the source slot with the existing upsert on
    `stack_id,role`.
  - The mode follows D2: the URL wins, then localStorage (read and written in
    try/catch), then simple.
- [ ] **Step 3: Test the items API locally** (`npm run dev` plus an
  authenticated request) to confirm a `source` custom item saves and reloads.
  CLAUDE.md requires this before any push.
- [ ] **Step 4: Commit** `feat(stereo): URL and saved-system state for source, cable and mode`

### Task 6: Advanced inputs

**Files:** Create `ModeToggle.tsx` and `SourceTile.tsx`; modify `SpecFields.tsx`,
`GearStep.tsx` and `RoomStep.tsx`. Test: `src/components/stereo/__tests__/steps.test.tsx`

**UI spec:**
- **Mode toggle.** A two-segment control ("Simple" / "Advanced") in the builder
  header, beside Save. It uses `role="radiogroup"` and has 44 px targets. The
  helper text under Advanced reads "Shows every input and three more checks."
- **Gear step, Advanced.** It shows a third tile, **Source**. Its presets are
  "DAC or streamer (2 V)", "Balanced DAC (4 V)", "Phono stage" and "Preamp".
  Picking "Phono stage" leaves the output voltage blank and asks for it, because
  phono output varies too much to preset. There's also a "Has volume control"
  checkbox. Simple mode hides the tile, but a source that's already entered is
  still used.
- **Speaker fields, Advanced.** Min impedance, max impedance ("the highest
  point on the impedance curve, usually in the bass") and the in-room
  sensitivity flag (read-only for catalog gear).
- **Amp fields, Advanced.**
  - Topology (radio).
  - Output impedance, with a unit switch: "Ω output impedance" or "damping
    factor (at 8 Ω)". The damping-factor entry stores `damping_factor`; Ω
    stores `output_impedance_ohms`.
  - Input sensitivity, with a switch between "V for full power" and "gain dB".
  - Noise, with a switch between "µV" and "SNR dB". SNR also asks for its
    reference: rated power, 1 W, or not stated.
  - Hints tell the user where to look: "Stereophile's measurements list output
    impedance and input sensitivity; manuals list damping factor and SNR."
- **Room step, Advanced.** A "Speaker cable" row with a length (m/ft, through
  `units.ts`) and a gauge select (12, 14, 16 and 18 AWG, plus "Not sure",
  which leaves it null so the chip shows).
- **Missing-value highlights.** The power check's `needs` keep the existing
  strong highlight. Secondary checks' `needs` get a muted dashed outline with
  "Add to check tonal shift" text. Pass them in as a separate
  `softMissing` prop, so the two can't be confused.
- [ ] **Step 1: Write failing tests.**
  - Toggling the mode shows and hides the fields.
  - The DF/Ω switch writes the right key.
  - The phono preset leaves voltage null.
  - Soft and hard highlights render differently, with distinct accessible
    descriptions.
  - Simple mode renders exactly the v1 field set.
- [ ] **Step 2: Implement.** Reuse `form-bits.tsx` classes and
  `SpecFields`'s `field`/`radioField`/`decimalInput`. Don't add a second form
  system.
- [ ] **Step 3: Run** the component tests and `npm run lint`. Expected: PASS.
- [ ] **Step 4: Commit** `feat(stereo): advanced inputs for source, amp, speakers and cable`

### Task 7: Results UI

**Files:** Create `SystemChecksPanel.tsx` and `TonalShiftChart.tsx`; modify
`PowerResultPanel.tsx` and `StereoBuilder.tsx`. Test: `src/components/stereo/__tests__/SystemChecksPanel.test.tsx`,
plus additions to `PowerResultPanel.test.tsx`

**UI spec:**
- The power result card stays the hero, unchanged in structure. When there's a
  `sourceLimit`, its working table shows the extra row. The reason list doesn't
  change, because there are still two reasons.
- **Simple mode** (D3). If any secondary check is a `problem`, one line goes
  under the notes, for example "Your DAC can't drive this amp to full power.
  See Advanced." Clicking it switches to Advanced and scrolls to that check's
  card. Only the single worst problem is shown, never a list.
- **Advanced mode:** a "System checks" section under the power card in the
  sticky column, with one card per check, ordered problem → note → needs → ok →
  not applicable.
  - **Header:** the check's name, a status pill (OK / Worth knowing / Problem /
    Needs info / Not checked) using the existing success/warning tokens, and the
    headline.
  - **Body**, collapsed by default except for problems: notes, the check's own
    assumption chips (reusing the chip button and `onEditAssumption`, with
    `InputId` widened), and its own working table with trust labels, using the
    same table markup as Summary Table. Factor that markup into a shared
    `WorkingTable`; don't copy it.
  - **Tonal:**
    - With a curve, a `TonalShiftChart`: a log-frequency x-axis from 20 Hz to
      20 kHz, a dB y-axis fixed at ±3 dB, never autoscaled, so a 0.3 dB wiggle can't look dramatic, and a
      shaded ±`TONAL_INAUDIBLE_DB` band labeled "Below audibility". There's a
      `<table>` fallback in a `<details>` for screen readers.
    - Without a curve, a single "at least X dB" span bar against the same band.
    - The explainer line reads: "Damping factor is 8 Ω ÷ the amp's output
      impedance. Above about 20 to 50, the effect on frequency response and bass
      is too small to hear; this system's effective damping factor is N,
      including cable." Here N = nominal ÷ Zsrc, which teaches that the cable
      counts.
  - **Gain:** a mini meter showing reachable watts against rated watts.
  - **Hiss:** a horizontal scale showing the hiss level at the seat next to a
    quiet room's 30 dBA, with the "masked" zone shaded below 20.
- On mobile the result column stacks after the steps, as now. The checks
  section goes after the power card, not between the steps.
- [ ] **Step 1: Write failing tests.**
  - Ordering by severity.
  - Simple mode shows the single worst problem and nothing for ok or note.
  - Clicking the simple-mode line switches mode.
  - The chart table fallback has the same data as the chart.
  - `not_applicable` renders the reason, not a pill-only card.
- [ ] **Step 2: Implement.**
- [ ] **Step 3: Visual check.** Use Playwright against `npm run dev` at 390 px
  and 1280 px, in light and dark, with four fixtures: SET plus horns (tonal
  problem, hiss problem), a DAC into a low-gain power amp (gain problem),
  solid-state plus bookshelf speakers (all OK), and a tube amp with no Zout
  (needs). Use `deviceScaleFactor: 1` for your own review and 2 for any
  screenshot shown to Joe.
- [ ] **Step 4: Commit** `feat(stereo): system checks panel and tonal shift chart`

### Task 8: Catalog data

**Files:** Modify `src/lib/stereo/seed.ts` and `scripts/stereo-seed/stereo-seed.json`.
Test: `src/lib/__tests__/stereo-seed.test.ts`

- [ ] **Step 1: Extend the seed validator** to the new fields. Every value still
  needs an http(s) `source_url`, and `impedance_curve` requires
  `trust: 'measured'`. Add failing tests first.
- [ ] **Step 2: Gather data for the existing seeded amps and speakers.** Get
  topology, output impedance or DF, input sensitivity, noise or SNR, and
  min/max impedance. Prefer the measurement sections of Stereophile reviews (for
  output impedance at several frequencies, input sensitivity and gain) and ASR
  reviews (noise, sometimes DF). Use the manufacturer's spec sheet as
  `claimed`. **Verify every URL by WebSearch and never write one from memory**,
  as CLAUDE.md's ASR rule requires. Exact model matches only: a review of a
  different version gets no values.
- [ ] **Step 3: Dry run** `npm run seed:stereo`, then `-- --execute` after Joe approves.
- [ ] **Step 4: Commit** `data(stereo): sourced gain, noise and output impedance specs`

### Task 9: Docs

- [ ] **Step 1: CLAUDE.md, Stereo Builder section.**
  - Sources of truth: `interaction.ts`, `gain.ts`, `noise.ts`, `checks.ts`
    (`runSystemChecks`).
  - The gain-cap coupling.
  - "DF stored as stated, Zout derived."
  - Secondary checks are soft.
  - Thresholds and their sources (the Sources for constants table).
  - Speaker limits feed the power verdict; the amp-only caveat shows only without limit data.
- [ ] **Step 2: Commit** `docs: stereo system checks in CLAUDE.md`

---

### Task 10: Speaker limits, data and math

PRD §13 item 1. This matters more than tonal shift for most buyers: today the
verdict can say "Comfortable" while the speakers compress. Unlike the other
checks, speaker limits feed **into the power verdict**, because "can this
system play this loud?" has one answer, and it's the lower of the amp limit
and the speaker limit.

**Files:** Modify `src/lib/stereo/specs.ts`; create `src/lib/stereo/limits.ts`.
Tests: `src/lib/__tests__/stereo-limits.test.ts`, plus `stereo-specs.test.ts`

**Interfaces (produces):**
```ts
// SpeakerSpecs gains:
max_spl_db?: SpecValue<number> & {
  method: 'aes75' | 'iec_splmax' | 'manufacturer' | 'unknown'
  kind: 'peak' | 'continuous' | 'unknown'                  // at 1 m, one speaker
}
compression?: SpecValue<{ level_db_1m: number; worst_db: number }[]>  // e.g. Erin's 96 and 102 dB sweeps
power_handling_w?: SpecValue<number> & { kind: 'continuous' | 'program' | 'peak' | 'unknown' }

// limits.ts
export const SPEAKER_COMPRESSION_LIMIT_DB = 3
export const POWER_HANDLING_DERATE_DB = { continuous: 0, program: 3, peak: 6, unknown: 6 }
export type LimitBasis = 'measured_max_spl' | 'compression_sweep' | 'rated_max_spl' | 'power_handling'
export interface SpeakerLimit {
  averageDb1m: { low: number; high: number }   // clean average output at 1 m, one speaker, as a range
  basis: LimitBasis
  trust: Trust
  bound: 'estimate' | 'at_least' | 'at_most'
}
export function resolveSpeakerLimit(s: SpeakerSpecs, sens1W: number): SpeakerLimit | null
```

**Resolution order** (best evidence first; the first one present wins, and the
working names it):
1. `max_spl_db` with method `aes75` or `iec_splmax` (`measured`). A `peak`
   kind converts to average by subtracting `MUSIC_PEAK_ALLOWANCE_DB`. That
   keeps one convention: peaks are the amp's problem, averages are the driver's
   heat problem.
2. `compression`: the highest tested level whose `worst_db` is at most
   `SPEAKER_COMPRESSION_LIMIT_DB` is a floor (`at_least`). The lowest level
   that exceeds it is a ceiling (`at_most`). Erin's levels are dense-signal
   averages, so no conversion.
3. `max_spl_db` from the manufacturer (`claimed`), with `kind: 'unknown'`
   treated as peak, which is the optimistic reading, so derate it.
4. `power_handling_w`: sens1W + 10·log10(P − derate), `claimed`, and the
   working always says "Power handling is a survival rating, not a clean-output
   rating". Program and peak derates come from Sources for constants.
5. Nothing: `null`. The power check keeps today's amp-only caveat word for word.

**Seat conversion.** The 1 m figure goes through `levelAtSeatPerWatt` (it is a
1 m level just like sensitivity), with pair gain. Reuse it; don't write a
second room model.

- [ ] **Step 1: Write failing tests.**
  - Each resolution tier, plus precedence when several are present.
  - Compression bracketing: 96 dB with 1.2 dB compression and 102 dB with
    4.1 dB gives at least 96 and at most 102.
  - A power-handling "peak 200 W" on an 87 dB/W speaker gives
    87 + 10·log10(200) − 6 ≈ 104 dB at 1 m.
  - Junk (`level_db_1m` out of 70 to 130, an empty array) is dropped by the parser.
- [ ] **Step 2: Implement**, with a header comment carrying the sources.
- [ ] **Step 3: Commit** `feat(stereo): speaker limit resolution from max SPL, compression or power handling`

### Task 11: Speaker limits in the power verdict

**Files:** Modify `src/lib/stereo/power.ts` and `power-check.ts`. Test: `stereo-power-check.test.ts`

- [ ] **Step 1: Write failing tests.**
  - With no limit data, the outcome is deep-equal to today's, caveat included.
  - When speakers limit before the amp, `limitedBy: 'speakers'`, the verdict
    is computed against the speaker's ceiling, and the headline names it.
  - When the amp limits first, the speaker limit appears as a working row and
    the caveat is dropped, since the speakers were checked.
  - An `at_least` speaker limit above the target is `ok`, and below the target
    it's "can't confirm" (a note, not a downgrade). An `at_most` limit below
    the target downgrades.
- [ ] **Step 2: Implement.**
  - `PowerCheckOutcome.ok` gains `limitedBy: 'amp' | 'speakers' | 'source'`
    and `speakerLimit: SpeakerLimit | null`.
  - `maxCleanPeakDb` becomes the minimum across amp, speaker and source.
  - The verdict labels stay the four from v1. Only the headline and reasons
    change: "Your speakers run out first: about 98 dB average at your seat".
  - The caveat appears only when `speakerLimit` is null. That changes PRD
    §6.2's "always" wording, so update the PRD in the same commit.
- [ ] **Step 3: Commit** `feat(stereo): power verdict accounts for speaker limits`

### Task 12: Speaker limits UI and data

- [ ] **Step 1: Result card.** A "Limited by" line under the max-volume figure
  (Amp / Speakers / Source), and a second marker on the meter, so amp and
  speaker ceilings show side by side.
- [ ] **Step 2: Advanced speaker fields.**
  - Max SPL, with a method select (AES75 / IEC / manufacturer / not sure) and
    a kind (peak / continuous / not sure).
  - Power handling, with a kind (continuous / program / peak / not sure).
  - Compression is catalog-only: there's no hand entry for sweeps.
- [ ] **Step 3: Seed.** Add `compression` from Erin's Audio Corner reviews and
  manufacturer max SPL and power handling for the seeded speakers. Every URL is
  verified by WebSearch, with exact model matches only.
- [ ] **Step 4: Commit** `feat(stereo): show speaker limits and seed limit data`

## Not in this plan (next, in order)

1. **Entering an impedance curve by hand:** paste a CSV, or pick points on a
   chart. This plan uses curves only from the catalog.
2. **Load difficulty (EPDR) and amp current delivery,** using phase as well as
   magnitude, and 2 Ω ratings.
3. **Tube output taps:** recommend the 4, 8 or 16 Ω tap from the curve.
4. **Boundary bass gain** from `near_wall`, which also adds to the tube bass
   lift the tonal check shows.
5. **Preamp in the chain:** preamp noise multiplied by power-amp gain, and
   preamp gain in the gain check.

## Verification before asking to push

- `npm run type-check`, `npm run type-check:tests`, `npm run lint`, `npm test`
- Every Review Focus item has a named test.
- A Playwright pass over the four Task 7 fixtures.
- `eval:reco` isn't needed: no headphone scoring code changes. Task 2 of the v1
  plan already keeps stereo rows out of headphone queries.
