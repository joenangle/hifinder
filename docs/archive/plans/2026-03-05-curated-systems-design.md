# Curated Example Systems - Design Document

## Context
First-time visitors to HiFinder don't see what the recommendation engine produces until they go through the full flow. Adding pre-built example systems on the landing page serves three purposes:
1. **Social proof** — shows the quality of recommendations before users commit
2. **Quick start** — lets visitors jump straight to a well-matched system and customize from there
3. **Education** — teaches users what a "complete system" looks like (headphones + signal chain)

## Feature Summary
- 8 curated audio systems on the landing page (4 IEM + 4 over-ear) at $100/$250/$500/$1000
- Each system: headphones + DAC/amp/combo, with selection rationale
- Clicking a system pre-loads those components in `/recommendations`
- Systems stored in a `curated_systems` Supabase table for admin management
- Fix existing broken `?components=` URL param parsing in recommendations page

## Data Model

### New table: `curated_systems`
```sql
CREATE TABLE curated_systems (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,           -- one-line summary shown on card
  category VARCHAR(10) NOT NULL,       -- 'iems' or 'cans'
  budget_tier INTEGER NOT NULL,        -- 100, 250, 500, 1000
  component_ids UUID[] NOT NULL,       -- ordered array: [headphone, dac/amp/combo, ...]
  rationale TEXT NOT NULL,             -- longer explanation of pairing logic
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (category IN ('iems', 'cans')),
  CHECK (budget_tier IN (100, 250, 500, 1000))
);

CREATE INDEX idx_curated_systems_active ON curated_systems (is_active, category, display_order);
```

## Landing Page Section

### Placement
Between Feature Cards and "How it works" section in LandingPage.tsx.

### Layout
- Section label: "Popular systems" (accent, uppercase, matching existing section labels)
- Category toggle: "Over-ear headphones" / "In-ear monitors" (pill toggle, client component)
- 4 cards in a row (responsive: 2x2 on md, stack on mobile)
- Each card shows:
  - Budget badge top-left ($100 / $250 / $500 / $1000)
  - System name (heading font)
  - Component list: brand + model for each component, with category icon
  - Total system price
  - One-line description/rationale
  - "Try this setup" CTA link

### Card click behavior
Navigate to: `/recommendations?components=id1,id2,id3&budget=TIER`

## Recommendations URL Pre-loading

### Current state
- StackBuilderModal generates share URLs with `?components=id1,id2&budget=X`
- recommendations-content.tsx does NOT parse a `components` param
- Shared links land on an empty recommendations page

### Fix
In recommendations-content.tsx:
1. Read `components` param from URL (comma-separated UUIDs)
2. Fetch those components from Supabase by ID
3. Set them as pre-selected in the UI state (same state shape as manual selection)
4. Show the SelectedSystemSummary immediately with pre-loaded components
5. Read `budget` param and set it as the active budget

This also fixes the existing broken share URL feature.

## API

### GET /api/curated-systems
- Returns all active curated systems with their component data
- Joins component_ids against components table to get full component objects
- Cached with 1-hour revalidation (curated systems change rarely)
- No auth required (public)

## Recommended Component Selections

> Component IDs must be looked up at implementation time via:
> `SELECT id, brand, name, price_new FROM components WHERE brand = 'X' AND name = 'Y'`

### Over-ear Headphone Systems

**$100 — "Budget Desktop Starter"**
- Headphones: Koss KSC75 ($20, neutral, 60ohm, no amp needed, Crin Tone A)
- DAC/Amp: Apple USB-C Dongle ($9, SINAD 99) + Schiit Fulla E ($59)
- Rationale: The KSC75 punches absurdly above its price — Crinacle gives it an A for tone. Paired with a Fulla E, you get a proper desktop setup under $100 that sounds better than most $200 setups.
- Alt headphone: Philips SHP9500 ($79) if user wants over-ear comfort

**$250 — "The Sennheiser Classic"**
- Headphones: Sennheiser HD 6XX / HD650 ($220, warm, 300ohm, Crin Tone A+)
- DAC/Amp: Schiit Fulla 4 ($99) or Apple USB-C Dongle ($9)
- Rationale: The HD6XX is the most recommended headphone in audiophile history for good reason — smooth, natural tonality with Crinacle's A+ tone grade. The Fulla 4 provides clean power for the 300ohm impedance. Iconic pairing.

**$500 — "Planar Magnetic Desktop"**
- Headphones: Hifiman Sundara ($350, neutral, 37ohm, Crin Tone A+)
- DAC/Amp: JDS Labs Atom DAC+ ($109, SINAD 114) + JDS Labs Atom Amp+ ($99, SINAD 115)
- Rationale: The Sundara delivers planar magnetic speed and detail at a breakthrough price. The JDS Atom stack is the most transparent budget separates — SINAD 114/115 means the electronics won't be the bottleneck. Clean, detailed, reference-level for $500.

**$1000 — "Endgame Desktop"**
- Headphones: HiFiMAN Ananda ($699, neutral, 25ohm, Crin Tone S-)
- DAC: Schiit Modius ($249, SINAD 111)
- Amp: Schiit Asgard 3 ($199)
- Rationale: The Ananda earns an S- tone grade from Crinacle — approaching summit-fi for the price of a mid-fi headphone. The Schiit Modius/Asgard stack is a proven desktop separates combo with plenty of power and clean measurements. This is genuinely endgame for most listeners.

### IEM Systems

**$100 — "Pocket Reference"**
- IEMs: Truthear HEXA ($80, neutral, Crin Rank B+, Tone A+)
- DAC/Amp: Apple USB-C Dongle ($9, SINAD 99)
- Rationale: The HEXA is one of the best-tuned IEMs under $100 — Crinacle gives it B+ rank and A+ tone. IEMs are efficient enough that the Apple dongle (SINAD 99) drives them perfectly. No amp needed — plug into your phone and go.

**$250 — "Detail Seeker"**
- IEMs: 7Hz Timeless ($220, warm, Crin Rank A, Tone A)
- DAC/Amp: Moondrop Dawn Pro ($50)
- Rationale: The Timeless is a planar magnetic IEM with exceptional technical performance — Crinacle's A rank. The Dawn Pro is a high-quality dongle DAC that improves on the Apple dongle with better power delivery. Portable, detailed, and musical.

**$500 — "Tribrid Flagship"**
- IEMs: Thieaudio Oracle ($540, warm, Crin Rank A, Tone S)
- DAC/Amp: Apple USB-C Dongle ($9, SINAD 99)
- Rationale: The Oracle is a tribrid IEM (BA + dynamic + EST drivers) that earns an S tone grade from Crinacle. IEMs this efficient run beautifully from the Apple dongle — no need for expensive source gear. Put the money where it matters: the transducers.

**$1000 — "Summit Portable"**
- IEMs: Thieaudio Monarch Mk3 ($999, warm, Crin Rank S-, Tone S+)
- DAC/Amp: Qudelix 5K ($110, SINAD 82, Bluetooth)
- Rationale: The Monarch Mk3 is a summit-fi IEM with Crinacle's highest tone grade (S+) and near-summit ranking (S-). The Qudelix 5K adds parametric EQ, balanced output, and Bluetooth streaming — perfect for maximizing these IEMs on the go. This is portable endgame.

## Component Selection Criteria

For each budget tier, components were selected based on:
1. Expert ratings (Crinacle rank/tone, ASR SINAD measurements)
2. Technical pairing (amp drives headphone adequately, impedance matching)
3. Sound signature variety across tiers (neutral at entry, warm at mid, variety at top)
4. Availability (all currently in production or widely available used)
5. Community consensus (well-known, battle-tested recommendations)

## Files to Create/Modify

### New files:
- `supabase/migrations/20260305_create_curated_systems.sql` - table + seed data
- `src/app/api/curated-systems/route.ts` - public API endpoint
- `src/components/landing/CuratedSystems.tsx` - landing page section (client component for tab toggle)

### Modified files:
- `src/components/LandingPage.tsx` - add CuratedSystems section
- `src/app/recommendations/recommendations-content.tsx` - parse ?components= param, pre-load selections

## Verification
1. Landing page shows 8 systems across 2 tabs
2. Clicking a system navigates to /recommendations with components pre-selected
3. Pre-loaded components show in SelectedSystemSummary with correct total price
4. Share URLs from StackBuilderModal now work correctly (broken feature fix)
5. Dark mode renders correctly
6. Mobile layout stacks cards properly
7. Build passes with no TypeScript errors
