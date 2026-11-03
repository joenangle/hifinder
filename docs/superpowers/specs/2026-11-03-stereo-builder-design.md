# PRD: Stereo Builder (v1: saved system + power check)

Status: draft for review · 2026-11-03 · Joe Nangle (product), drafted with Claude

Labels used throughout: **[Joe]** = decided by Joe in the scoping interview.
**[Claude's call]** = a default Claude chose; Joe can overturn it. Anything unlabeled
is either a direct consequence of a [Joe] decision or a verified fact about the codebase.

---

## 1. Summary

HiFinder helps people plan headphone systems. The Stereo Builder extends that to
2.0 and 2.1 speaker systems, so people can plan, optimize and track them. v1 is
deliberately narrow. A **saved system profile** (room, listening position, gear)
feeds one honest calculation, the **power check**: "Does this amp get these speakers
to the loudness I want at my seat, and with how much to spare?" Every later feature
(deal checks, sub integration, vinyl calculators, lenses) builds on the profile and
calculation framework v1 establishes.

## 2. Why

**The problem [Joe].** Finding components that work well together takes a lot of
time for Joe and for many others. Forums answer case by case, threads never end,
and the advice mixes physics, preference and folklore without saying which is which.

**What the site can do that forums can't:**
- Separate what can be *calculated* (amp power vs. speaker sensitivity at a given
  distance) from what is *heard* (owner and reviewer impressions). Show both, and
  never blend them into one score.
- Remember the user's room and gear, so every answer is about *their* system.
- Give people a stopping point. A clear "you're done, upgrading here buys you less
  than X" makes HiFinder different from a thread that never ends.

**Evidence (directional only).** A Reddit scan of 2,500 posts from BudgetAudiophile,
audiophile, vinyl, StereoAdvice and HeadphoneAdvice (baseline). Full write-up: the
"Stereo Builder Demand Scan" artifact (https://claude.ai/artifact/TqqWXfDeGkLx14jsuTnEwf).
- BudgetAudiophile gets roughly 26.5 purchasing-flair posts a day, close to
  HeadphoneAdvice's roughly 32.5, so the audience exists.
- Of BudgetAudiophile help posts, 69% involve speakers, 45% amps, 28% subs and
  15% vinyl.
- Of the 1,409 stereo help posts: 27% start from gear the poster already owns, 29%
  involve used gear or deals, and 18% are vintage. Only 17% give budget, room and
  existing gear together, so the tool has to ask for this context.
- Across all 2,000 stereo posts: planning 33%, tinkering 13% (placement, adding a
  sub, EQ, weakest link), explicit second-guessing about 3%. After buying, people
  mostly ask "now make it work", not "did I do OK?"

## 3. Users and moments

**Primary user for v1: the planner [Joe].** Planners research before buying. They
usually own some gear or have a firm plan, and they want certainty before spending.
They will happily enter room size and listening distance because they know it
changes the answer. Impulse buyers are less likely to seek out a tool like this
[Joe]; v1 is not designed around them, but nothing in it shuts them out.

The product serves three moments, all anchored to the saved system:
1. **Planning:** "I have X and a room like Y. Will Z work?" (v1)
2. **Tinkering:** "What if I swapped the amp or sat closer?" (v1, by editing the system)
3. **Checking after purchase:** "I bought it; how do I make it work?" (later, through the deal and listing checks)

## 4. Product principles (the voice)

1. **Default lens: measured plus listened, kept separate [Joe].** Modeled on the
   method used by Erin's Audio Corner. The idea is to copy the *method*, not to
   imitate the person. Two columns: what the numbers say, and what listeners
   report. They are never merged into one score.
2. **Lead with a bottom line [Joe: people want reassurance].** A plain verdict
   comes first, with the working underneath for anyone who wants to check it.
   Reassurance must be true. The site never reassures falsely to make a sale
   (anti-goal, §5).
3. **Unknown means unknown.** A missing value is shown as "needs X" or "not
   measured", never as a neutral placeholder that looks like a verdict. This is
   the same rule as `calculateAmpAdequacy`'s `dataAvailable: false`.
4. **Room first.** Every result depends on the room and listening position, and
   says so.
5. **Cite, never invent.** The listening column links real published reviews.
   Nothing is ever written in a real reviewer's voice or attributed to them.
6. **Estimates look like estimates.** Results that depend on the room model are
   shown as ranges and labeled as modeled.

## 5. Goals, non-goals, anti-goals

**Goals (v1)**
- A planner can describe their room, seat and gear, and within a couple of minutes
  get a trustworthy power verdict with its working visible.
- Signed-in users can save that system and come back to edit it (tinkering).
- Missing specs never block the user. The tool asks for exactly the value a check
  needs and says where to find it.
- Speaker math lives in the shared calculation module and is unit-tested against
  worked examples.

**Non-goals (v1)**
- Home theater. Planned for much later [Joe]. Channel counts should be modeled
  generically so 5.1 can be added later [Claude's call], but v1 builds no HT features.
- Subwoofer integration math, the deal and listing check, used-market alerts,
  vinyl calculators, switching lenses, and AI-written explanations (all §13).
- Shared, user-submitted catalog values (§8.4).
- Recommending speakers or amps through the existing v2 recommendation engine.

**Anti-goals (failure even if it technically works)**
- **Feeding the overthinking.** Endless comparisons with no stopping point.
- **False reassurance.** Softening or inflating a verdict, especially near an
  affiliate link.
- **Fake precision.** A single confident watt figure when the inputs only support
  a range.
- **Snake oil by omission.** Presenting folklore as physics, or physics as taste.
- **Manual overhead for Joe [Joe: start simple].** Nothing in v1 requires a review
  queue. The existing candidates queue (789 pending, last reviewed 2026-03-15)
  shows what happens to queues that rely on manual review.

## 6. v1 user experience

### 6.1 The system profile

| Group | Field | Notes |
|---|---|---|
| Room | Size, as dimensions (L×W×H) or a preset (small bedroom / office / living room / large open plan) | Each preset stands for a default volume |
| Room | Acoustic character: lively / average / damped | Sets average absorption for the room model (§7.3) |
| Seat | Listening distance (m or ft) | Required for a real verdict, assumed in simple mode |
| Seat | Speakers near a wall? (yes/no) | v1 shows this as a note only; boundary gain isn't modeled yet |
| Loudness | A slider for any **peak** SPL at the seat, 60–110 dB in 1 dB steps, like the headphone budget slider, with a typed number and the five §7.4 presets as labeled ticks [Joe] | The tier name ("Loud") follows the value |
| Gear | Speakers (pair) | From the catalog, or entered by hand |
| Gear | Amplifier (integrated, power amp or receiver) | From the catalog, or entered by hand |
| Gear | Subwoofer (optional) | Stored and shown; no sub math in v1 |
| Meta | Name, notes | For example "Living room" |

### 6.2 The power check (output)

Order of the result page, top to bottom:
1. **Bottom line:** "Comfortable: about 8 dB to spare at your seat" / "Tight: about 1 dB
   to spare" / "Runs out: clean peaks top out around 97–101 dB, short of your
   105 dB target".
2. **The two reasons that matter most.** For example: "Your speakers are efficient
   (90 dB/W)" and "You sit close (2.5 m)".
3. **Assumption chips:** every assumed value, each one click away from becoming a
   real input (§6.4).
4. **Details (advanced):** required watts as a range, the amp's power at the
   speakers' impedance, the loudest clean peak at the seat, the formulas used,
   and a trust label for each input.
   The bottom line always ends with the amp-only caveat (§12): "This checks the
   amp. Small speakers may distort or compress before this level."
5. **Listening column:** links to published reviews of the speakers, the amp and,
   where one exists, the pairing. Thin in v1 and clearly labeled as such.

### 6.3 Missing data: checks declare their inputs

Every check declares the values it needs. Before running, the tool looks at which
of those it has for the gear involved:
- **All present:** run the check.
- **Something missing:** ask for that value only, with a hint about where to find
  it. For example: "Sensitivity is usually on the back plate or in the manual,
  as dB at 1W/1m or at 2.83V/1m. Which one does yours say?"
- **The user doesn't know:** that check shows "needs sensitivity", and the other
  checks still run. Nothing is ever filled in with a guess that looks like an answer.

The same declarations drive the prompts, the "needs X" labels and simple mode's
assumption chips. This is one mechanism, not three.

**Unit trap the prompts must handle.** Sensitivity quoted at 2.83V/1m reads about
3 dB higher for a 4Ω speaker than the same speaker's 1W/1m figure. The prompt has
to ask which reference the number uses (§7.1).

### 6.4 Simple mode is a view of advanced mode [Joe]

One engine, two presentations. Simple mode shows the bottom line and the two
reasons, and fills unknown inputs with **stated** defaults ("Assumed: average
living room, about 3 m from the speakers. Change this."). Advanced mode shows
everything. Build advanced first, because it defines what gets calculated; simple
mode is a filter over it. Defaults always appear as chips and are never applied
silently.

### 6.5 Anonymous vs signed in [Claude's call]

- The calculator works **without signing in**, which makes it an entry point to
  the site. Its state lives in the URL, so a link reproduces the result. The site
  already uses `nuqs` for this (`src/lib/url-params.ts`).
- Signing in lets the user **save** the system, keep several systems, and edit
  them later.

## 7. Calculation model

All of this goes in `src/lib/audio-calculations.ts` (or a sibling module it
re-exports), as pure tested functions. CLAUDE.md forbids reimplementing power
math elsewhere.

**Do not reuse `calculatePowerAtImpedance` for speakers.** It models headphone
amps: voltage-limited with a default current cap of about 500 mA. Speaker amps
behave differently, and their rated power at 8Ω and 4Ω comes from the spec sheet.

### 7.1 Normalize sensitivity to dB SPL at 1W/1m

- If the spec is given at 1W/1m, use it as is.
- If it's given at 2.83V/1m with nominal impedance Z, then
  `S_1W = S_2.83V − 10·log10(8 / Z)`. That subtracts 0 dB at 8Ω, about 1.25 dB
  at 6Ω and about 3.01 dB at 4Ω.
- If the reference is unknown, ask (§6.3). In advanced mode, if the user can't
  say, show both interpretations as a range.

### 7.2 Amplifier power available

- Use the rated power per channel at the speakers' **nominal** impedance.
- **Store how each rating was measured** (§8.2): continuous or peak, THD %,
  and channels driven. Ratings are not comparable as bare numbers. Budget
  class-D amps often quote peak power or power at 10% THD, vintage receivers
  quote FTC continuous with all channels driven, and modern receivers often
  quote 1–2 channels driven. The difference is easily 3–6 dB [Claude's call]:
  - **Preferred:** continuous at ≤ 1% THD. Use as is.
  - **10% THD or "peak/max/PMPO" rating:** derate by 3 dB, and label it
    "claimed (optimistic rating)". If a continuous rating exists, use that
    instead.
  - **Conditions unknown:** use as given, labeled "claimed (conditions not
    stated)". If the verdict is Tight or Comfortable by less than 3 dB, the
    bottom line mentions it.
  - The prompt that asks a user for amp power also asks "Does it say RMS /
    continuous, or peak?"
- If only an 8Ω rating exists and the speakers are 4–6Ω nominal, use the 8Ω
  figure and label it a conservative lower bound ("4Ω rating not known; many amps
  deliver more into 4Ω, but not all"). Never assume power doubles into 4Ω.
- If the speakers' **minimum** impedance is below about 3.2Ω and the amp has no
  4Ω rating, add a caution note: "low impedance dips; check the amp is rated
  for 4Ω loads". v1 doesn't model this beyond the note [Claude's call].

### 7.3 Sound level at the seat, per watt

Two models. The result is reported as the range between them [Claude's call]:
- **Free field (conservative bound):** `L(r) = S_1W − 20·log10(r)`.
- **In-room (Hopkins–Stryker direct + reverberant field):**
  `L(r) = Lw + 10·log10( Q/(4πr²) + 4/R )`, where
  `Lw = S_1W − 10·log10(Q) + 10.99`, `R = S·ᾱ / (1 − ᾱ)`, S is the room's surface
  area from its dimensions, ᾱ is average absorption from the acoustic-character
  preset, and Q is the speaker's directivity (default 2) [Claude's call].
- **Two speakers:** add +3 dB (incoherent sum) [Claude's call: the conservative
  choice; bass can sum higher].
- **Before shipping,** the builder checks these formulas and the default ᾱ and Q
  against a published acoustics reference, and records that reference in the
  module's doc comment. If the reference shows the diffuse-field term overstates
  levels in small furnished rooms (it is known to), the builder may change the
  in-room **model**, not only its constants. The change goes in the doc comment
  and the tests, and the in-room figure stays an estimate, not a bound
  [Claude's call].
- **How wide the range gets.** At 2–3 m, across small to large rooms with ᾱ
  0.15–0.4, the in-room figure sits 3–14 dB above free field. In a 5×4×2.5 m room
  at ᾱ 0.25 and 3 m the gap is 9.5 dB, so required power differs about 9×
  between the two ends. Free field is therefore a worst case, not a likely value.

### 7.4 Loudness targets (peak SPL at the seat) [tunable]

| Preset | Peak target | Feels like |
|---|---|---|
| Quiet | 65 dB | Late night, conversation easy over it |
| Background | 75 dB | Music while working or cooking |
| Normal | 85 dB | Focused listening at a comfortable level |
| Loud | 95 dB | Turned up for a favorite record |
| Club | 105 dB | Party or club level, rare at home |

The range runs from about 65 dB for quiet to 105 dB, with the top preset labeled
as club level rather than typical home listening [Joe]. The steps in between are
[Claude's call]. The default is Normal (85 dB).

Loudness isn't limited to these presets [Joe]. The control is a continuous
slider from 60 to 110 dB, modeled on `BudgetSlider`: a large editable number,
the tier name and the presets as ticks. The table only names the tiers and
places the ticks.

Peaks rather than averages, because clipping happens on peaks. Keep the values in one named, exported table so
they're easy to tune.

### 7.5 Verdict

- Required power `P_req = 10^((L_target − L_1W(r)) / 10)`, computed for both ends
  of the §7.3 range.
- Headroom `H = 10·log10(P_amp / P_req)`.
- **The bottom line uses the in-room estimate** (H_room). The free-field result
  (H_free) is the worst case. It's shown in Details, and it becomes a caveat in
  the bottom line only when it would change the verdict [Claude's call]. The
  "dB to spare" figure is always H_room.
- Verdict labels cover every case [Claude's call, tunable]:
  - **Comfortable:** H_room ≥ 3 dB, and H_free ≥ 0.
  - **Comfortable in most rooms:** H_room ≥ 3 dB, but H_free < 0. Caveat: "in a
    very large or very damped room this could run short".
  - **Tight:** 0 ≤ H_room < 3 dB.
  - **Runs out:** H_room < 0. Report the loudest clean peak
    `S_seat + 10·log10(P_amp)` as a range, from free field to in-room.
- **Rated power is continuous; the targets are peaks.** Using a continuous
  rating against peak targets is deliberately conservative. Amps can briefly
  deliver more than their continuous rating, and v1 gives no credit for that
  [Claude's call].
- **Worked example (unit-test fixture):** speakers rated 89 dB at 2.83V with 4Ω
  nominal → `S_1W ≈ 85.99`. At 3 m free field: 85.99 − 9.54 = 76.45 dB from one
  speaker at 1W, plus 3 dB for the pair = 79.45 dB. For a 100 dB peak target,
  `P_req = 10^(20.55/10) ≈ 113 W` at the conservative end. The in-room end
  needs less; the test computes it from the fixture room.

### 7.6 Trust labels on every input

`measured` (independent measurement) / `claimed` (manufacturer spec) / `user`
(typed in by this user) / `assumed` (simple-mode default). Show each input's
label in Details. If any input is `assumed`, the bottom line says so.

## 8. Data model

### 8.1 Categories

Add `speakers` and `speaker_amp` to `CATEGORY` in
`src/lib/component-categories.ts` [Claude's call on names].
- Keep `speaker_amp` **out of** `AMP_CATEGORIES`, which means headphone amps
  today. Otherwise speaker amps leak into headphone results, the same silent
  mismatch that module was created to fix.
- `speaker_amp` gets a subtype in specs: integrated / power / receiver.
- **This needs a DB migration as well as the code change.** The live
  `components` table has a `components_category_check` constraint that allows
  only `cans`, `iems`, `dac`, `amp`, `dac_amp` and `cable`.
- `subwoofer` can be added when a feature uses it.
- Check every consumer of `CATEGORY`, `HEADPHONE_CATEGORIES`, `AMP_CATEGORIES`,
  `DAC_CATEGORIES`, `SIGNAL_CATEGORIES` and `normalizeCategory` so the new values
  don't show up in headphone flows (recommendations, browse, admin).

### 8.2 Component specs

`components` already has `technical_specs: Json`. Store stereo specs there under
a typed schema per category, validated in code [Claude's call]. Don't reuse the
headphone columns: `sensitivity_db_v` means dB/V for headphones, a different
reference from speakers' 2.83V/1m.

```
speakers:    sensitivity_db, sensitivity_ref ('1W'|'2.83V'), nominal_impedance_ohms,
             min_impedance_ohms?, f3_hz?, directivity_q?
speaker_amp: subtype, power_w_8ohm, power_w_4ohm?,
             power_rating { kind: 'continuous'|'peak'|'unknown', thd_pct?, channels_driven? },
             outputs { sub_out, pre_out, phono, … }
all:         review_links?: [{ outlet, url, kind: 'measurement'|'listening'|'pairing' }]
```

Each value is stored as `{ value, trust: 'measured'|'claimed', source_url }`.
Catalog values always have a source.

`review_links` feeds the listening column. In v1 it's filled only where a
source turns one up while seeding, so the column will be empty for most gear
at launch and says so ("No linked reviews yet") [Claude's call].

### 8.3 Saved systems and private values

- Systems are per-user data. Under NextAuth, the browser's anonymous Supabase
  client can't read or write user tables (`auth.uid()` is null), so all reads
  and writes go through session-scoped API routes, as the existing
  `/api/stacks` routes do.
- **A stereo system is a stack [Joe].** It's a `user_stacks` row with a new
  purpose, `'stereo'`, so stereo systems sit next to headphone stacks.
  - **Purpose:** add `'stereo'` to `StackPurpose` (`src/types/gear.ts`) and to
    `purposeIcons` (`src/lib/stacks.ts`). `/api/stacks` validates purpose
    against `purposeIcons`.
  - **Profile:** a nullable `system_profile` jsonb on `user_stacks` holds the
    room, seat and loudness fields, typed and validated in code
    [Claude's call: one jsonb rather than many columns, since only stereo
    stacks use it].
  - **Items:** `stack_components` gains `spec_overrides` jsonb plus
    `custom_brand`, `custom_name` and `custom_category`. That covers the third
    kind of item: a hand-entered speaker or amp with neither `component_id` nor
    `user_gear_id`. Update the row check so exactly one of `component_id`,
    `user_gear_id` or `custom_name` identifies the item [Claude's call].
  - **Role:** a stereo item's role (speakers / amp / sub / source) is stored on
    the item, not inferred from `position`. The builder picks the column.
- **Stereo gear lives only inside systems in v1 [Joe].** The gear list,
  `useCollection`, the gear page and owned-headphone amp matching
  (`ownedHeadphoneIds`) stay as they are. Items point at catalog components
  or are hand-entered. In v1, `user_gear_id` is only used by headphone stacks.
- **Headphone code must ignore stereo stacks.** It all assumes headphone stacks
  today:
  - `checkStackCompatibility` (`src/lib/stacks.ts`) is headphone-only. Skip it
    for `purpose = 'stereo'`; stereo checks come from §7.
  - `StackBuilderModal`'s positions (`source | dac | amp | headphones`) are
    headphone-only. Stereo stacks get their own builder UI (§9).
  - `api/user/dashboard`, `api/admin/users` and `api/user/activity` read
    `user_stacks`. Count stereo stacks separately, or filter them out of
    headphone counts, and show them labeled as stereo.
  - Production has only 4 stacks, so the migration has nothing to backfill.
- **User-entered values stay private [Joe].** They're stored in the item's
  `spec_overrides`, labeled `user`, used immediately in that user's checks, and
  never written to `components`.

### 8.4 Catalog growth

- **v1 launches with a small seed plus hand entry** [Claude's call]: about
  30–50 of the most-discussed speakers and speaker amps, starting from the brands
  the demand scan surfaced (Klipsch, KEF, SVS, ELAC, Edifier, Wharfedale,
  Emotiva, Arendal, Yamaha, Fosi, WiiM, …). Hand entry covers everything else,
  so launch doesn't wait for ~200 items. That keeps the "no manual overhead"
  goal [Joe].
  - **Who sources it:** the automated review pipeline (rule checks, AI verifier,
    a mechanical check that each value appears on its cited page, and strict
    approval in code), being designed in a separate session to work for any
    category. If the pipeline isn't ready, a one-off script applies the same
    rules.
  - **Allowed sources:**
    - `measured`: independent measurements (ASR, Erin's Audio Corner,
      Stereophile, spinorama data).
    - `claimed`: manufacturer pages and manuals, including HiFi Engine for
      vintage gear.
    - Retailers only as a fallback, labeled `claimed`.
    - Every URL must come from a page actually fetched. None from memory
      (CLAUDE.md).
  - The seed grows to about 200 over time, through the same pipeline.
  - No submission queue in v1 [Joe: start simple].
- **Later:** user values become catalog candidates through the automated
  review pipeline now being designed in a separate session (rule checks, AI
  verifier, a mechanical check that each cited value appears on its page, and
  strict approval in code). That pipeline is meant to work for any category, so
  speakers and amps can use it unchanged.

## 9. Surfaces

- **New page:** the calculator and system view [Claude's call: a top-level
  `/systems` route, exact name for the builder to decide]. The same page works
  anonymously (URL state) and signed in (saved system).
- **Entry points:** a link from the gear and dashboard areas for signed-in
  users, and a "Speakers?" link from the landing and recommendations pages.
- **Inputs follow one numbered path [Joe]:** 1 Your gear → 2 Room and seat →
  3 How loud you listen, stacked in the left column. The result sits in a sticky
  right column, so the verdict stays visible while any step is edited. On
  phones the steps stack first and the result follows.
- **Gear is step 1 and the most prominent input [Joe].** Amplifier and speakers
  are large tiles in signal order (amp → speakers), each with its own Change
  button.
- **The room card is expanded by default [Joe]** and can be collapsed once filled
  in, to a one-line summary ("5 × 4 × 2.6 m · Average acoustics"). Listening
  distance stays visible and editable in both states, because it's the room
  input people actually adjust.
- **Gear entry is inline on the system page [Joe], not a separate page or a
  modal.** Each gear card (Speakers, Amplifier) has a Change button that expands
  catalog search and "Enter it yourself" inside the card. Choosing a catalog item
  recalculates the verdict immediately, so swapping parts is the tinkering
  loop. On phones the same content opens as a full-height sheet. A card that's
  missing a value opens with just that field showing.
- **Layout:** otherwise left to the builder. The content order in §6.2 is
  binding. The mockup canvas (https://claude.ai/artifact/DZEcsVMW2Tsg76VSNRKnD7)
  shows the desktop result page with inline gear entry and the loudness slider,
  plus the phone missing-value state.

## 10. Success criteria

- **Qualitative (primary):** Joe and a few planners run the check on their real
  systems and agree with the verdict, or learn something true from it.
- **Usage:** share of calculator sessions that reach a verdict; share of verdicts
  that rest only on `measured`/`claimed`/`user` inputs (not `assumed`); saved
  systems per signed-in user; systems edited again within 30 days (tinkering).
- **Accuracy guard:** zero shipped verdicts where a missing value was shown as
  a real answer. This can be tested and must be.

## 11. Testing and verification

- Unit tests for every §7 function, including the worked example, the 2.83V to
  1W conversion at 4, 6 and 8Ω, the "only an 8Ω rating" fallback, and both ends
  of the range.
- Contract tests for the declared-inputs mechanism: removing an input yields
  "needs X", never a number.
- Category isolation test: headphone recommendations and browse results never
  include `speakers` or `speaker_amp` rows.
- API routes tested locally before any push. CI runs lint, type-check,
  type-check:tests and test.

## 12. Resolved questions

- **Where systems live [Joe]:** as stacks. `user_stacks` gets
  `purpose = 'stereo'` (§8.3).
- **Gear list [Joe]:** stereo gear lives only inside systems in v1. The
  collection and gear page are untouched (§8.3).
- **Speaker limits [Joe]:** the check is amp-only, with an explicit caveat.
  Every power-check bottom line carries a short note: "This checks the amp.
  Small speakers may distort or compress before this level." Modeling the
  speakers' own limits (measured max SPL, compression, power handling) is a
  later phase (§13).
- **Affiliate links [Claude's call]:** none on the power check in v1. This is
  the safe default and easy to change later.

## 13. Later phases (ordered by Claude, not yet agreed)

1. **Speaker limits:** can the speakers themselves play this loud cleanly?
   Uses measured max SPL and compression where they exist, otherwise power
   handling. This replaces the amp-only caveat with a real check.
2. **Amp–speaker impedance interaction:** the calculable kind of "synergy".
   - **Output impedance × impedance curve:** an amp with high output impedance
     (tubes, especially SETs) driving a speaker whose impedance swings with
     frequency produces frequency-response deviations, often a dB or more. The
     check predicts that deviation per pairing: "with this amp, expect about
     +1.5 dB around 100 Hz and a slightly softer treble". Show it in the
     measured column. It explains, for example, why a Tannoy and a 300B SET are
     a known good pairing.
   - **Load difficulty:** use the impedance curve and phase (for example EPDR)
     instead of the nominal rating, so a "6Ω" speaker that dips to 3Ω in the
     bass is judged by its real load.
   - **Tube output taps:** recommend which tap (4/8/16Ω) suits the speaker's
     impedance curve.
   - **New data:** amp output impedance (or damping factor, converted) and
     speaker impedance curves, which Stereophile and Erin's Audio Corner
     publish. Both are stored with `measured` or `claimed` trust and a source.
     Where curves are missing, the check says "needs impedance curve", never a
     guess.
3. **2.1 sub integration:** crossover, connections (speaker-level vs line-level,
   pre-out, LFE), and a check for whether the amp has a sub out.
4. **Deal and listing check:** paste a listing (Facebook Marketplace or
   Craigslist text or link) to check fit with your system, features, price
   context and questions to ask the seller. This goes to where local deals
   happen, since those sites can't be scraped [Joe: that's where deals are].
5. **Feature filters plus used-market alerts:** the existing alert system,
   pointed at models that match the user's features and system.
6. **A fuller listening column:** owner consensus and pairing reports.
7. **Vinyl calculators:** cartridge resonance, phono gain and loading.
8. **Lens setting:** a measurement-first view (ASR style), a value view, and
   others alongside the default.
9. **AI-written explanations,** based strictly on computed facts.
10. **Shared catalog submissions** through the automated review pipeline.
11. **Home theater channels.**

## 14. Decisions log

**By Joe:** 2.0/2.1 first, with vintage and used gear first-class; home theater
much later. Planners are the v1 user. The default lens is measured plus listened,
kept separate. People want reassurance, so lead with a bottom line. The first
release is the saved system plus the power calculator. Simple mode is derived
from advanced. User-entered values stay private and must be verified before
reaching the catalog. Start simple with no manual overhead. Local listings
aren't scrapable, so the deal check (later) works from listings the user pastes in.
Stereo systems are stacks (`purpose = 'stereo'`). Stereo gear lives only inside
systems in v1. The power check is amp-only, with an explicit caveat.

**Claude's calls in this document:**
- **Product:** generic channel modeling; the anonymous calculator with URL
  state; no affiliate links on the power check in v1; a `/systems` route name;
  the order of later phases.
- **Calculation:** the Hopkins–Stryker in-room estimate drives the bottom line,
  with free field shown as the worst case; the builder may change the in-room
  model if the reference requires it; +3 dB for the pair; Q = 2; the loudness
  peak table; the verdict labels, including "Comfortable in most rooms".
- **Amp power:** continuous ratings used against peak targets, with no credit
  for short-term extra power; storing rating conditions, with a −3 dB derate
  for peak or 10% THD ratings; using the 8Ω rating as a lower bound when no 4Ω
  rating exists.
- **Data:** category names `speakers`/`speaker_amp`, plus the
  `components_category_check` migration; specs in `technical_specs` jsonb with
  per-value trust and `review_links`; `system_profile` jsonb on `user_stacks`;
  `spec_overrides` and custom-item columns on `stack_components`.
- **Catalog:** a small launch seed of 30–50 items plus hand entry, sourced
  through the automated review pipeline.
