# Amplification Data Collection & Matching Strategy

## Current State Analysis (updated 2026-07-26)

### Data Coverage (live counts)

| Category | Total | Impedance | Sensitivity (dB/mW) | Power spec |
|----------|-------|-----------|---------------------|-----------|
| **cans** | 167 | 130 (78%) | 120 (72%) | — |
| **iems** | 376 | 99 (26%) | 83 (22%) | — |
| **amp** | 58 | — | — | 43 (74%) |
| **dac_amp** | 56 | — | — | 40 (71%) |
| **dac** | 54 | — | — | n/a |

The earlier "3% / 90% unknown" figures were stale. Over-ear headphone coverage is
now good (78% impedance, 72% sensitivity); IEMs remain the real gap (~1 in 4). The
recommender uses measured `sensitivity_db_mw` when present, converts `sensitivity_db_v`
when only that exists, and falls back to an impedance estimate otherwise
(`resolveSensitivityDbMw` in `src/lib/audio-calculations.ts`).

Amp power is parsed from the freeform `power_output` string via `parsePowerSpec`.
The structured `power_output_mw_32` / `power_output_mw_300` columns remain **0%
populated** and are no longer selected — either backfill them and add a read path,
or drop the columns. When an amp has no usable power spec, matching reports
`dataAvailable: false` rather than guessing.

### Result
- Over-ear amp matching now works on real data for most of the catalogue
- IEM impedance/sensitivity is the priority remaining gap
- DAC/amp power specs cover ~72% of signal gear

---

## What Data is Needed

### For Headphones/IEMs

#### Critical (Tier 1):
1. **Impedance** (Ω)
   - Example: 32Ω, 300Ω, 16Ω
   - Source: Every manufacturer spec sheet
   - Impact: Enables basic "easy/moderate/demanding" classification

2. **Sensitivity** (dB/mW or dB/V)
   - Example: 102 dB/mW, 115 dB/V
   - Source: ~70% of spec sheets
   - Impact: Enables precise power requirement calculations

#### Nice-to-Have (Tier 2):
3. **Driver Type** (Dynamic, Planar, BA, Hybrid, etc.)
   - Helps estimate power needs when sensitivity missing
   - Already in Crinacle data for some models

### For Amps/DAC+Amps

#### Critical (Tier 1):
1. **Power Output at Multiple Impedances**
   - Format: "500mW @ 32Ω, 250mW @ 300Ω"
   - Source: Manufacturer specs, ASR reviews
   - Impact: Enables accurate amp-to-headphone matching

#### Current Format in Database:
```
power_output: TEXT field
Examples:
- "1W @ 32Ω"
- "6.079W @ 32Ω, 0.8717W @ 300Ω"
- "3W @ 32Ω balanced, 920mW @ 300Ω balanced"
- "8.8W @ 32Ω balanced"
```

---

## How Matching Would Work

### Step 1: Calculate Headphone Power Requirements

Using formula from [audio-calculations.ts:30-36](../src/lib/audio-calculations.ts#L30-L36):

```typescript
// Given: Impedance = 300Ω, Sensitivity = 97 dB/mW, Target SPL = 110 dB
powerNeeded_mW = 10^((110 - 97) / 10) = 20 mW
voltageNeeded_V = sqrt(0.02 * 300) = 2.45V
```

**Example Results:**
- **HD600** (300Ω, 97 dB/mW): Needs 20mW, 2.45V → **Demanding**
- **Sundara** (37Ω, 94 dB/mW): Needs 40mW, 1.21V → **Moderate**
- **Blessing 2** (22Ω, 117 dB/mW): Needs 0.2mW, 0.06V → **Easy**

### Step 2: Match to Amp Capabilities

Parse amp power output and check if it can deliver required power at headphone impedance:

```typescript
// Example: Topping A90
// Power output: "500mW @ 32Ω, 7.8W @ 32Ω balanced"

// For HD600 (300Ω, needs 20mW):
// Estimate power at 300Ω using impedance scaling
// Result: A90 can deliver ~50mW @ 300Ω → ✅ Adequate (2.5x headroom)

// For Sundara (37Ω, needs 40mW):
// Result: A90 delivers 500mW @ 32Ω ≈ 470mW @ 37Ω → ✅ Excellent (11x headroom)
```

### Step 3: Volume Prediction

Calculate max SPL achievable:

```typescript
// Given: Amp delivers 500mW @ 32Ω, Headphone is 32Ω, 102 dB/mW sensitivity
maxSPL = sensitivity + 10 * log10(ampPower)
maxSPL = 102 + 10 * log10(500) = 102 + 27 = 129 dB

// Result: "Can reach 129 dB (dangerously loud, 19 dB headroom)"
```

---

## Data Sources & Collection Strategy

### Phase 1: Manual Entry for Top 50 Models (Quick Win)

**Target:** Most-recommended headphones (high impact)

**Sources:**
- Manufacturer websites
- Head-Fi database
- rtings.com measurements
- ASR reviews

**Models to prioritize:**
```
High-End Cans:
- Sennheiser HD600, HD650, HD660S, HD800S
- Hifiman Sundara, Edition XS, Arya, HE6SE
- Audeze LCD-2, LCD-X
- Focal Clear, Elex
- Beyerdynamic DT770, DT880, DT990 (all versions)

Popular IEMs:
- Moondrop Blessing 2/3, Aria, Kato, Variations
- Thieaudio Monarch series
- 7Hz Timeless
- Etymotic ER2XR, ER4XR
```

**CSV Format:**
```csv
brand,model,impedance,sensitivity_type,sensitivity_value,driver_type
Sennheiser,HD600,300,dB/mW,97,Dynamic
Hifiman,Sundara,37,dB/mW,94,Planar
Moondrop,Blessing 2,22,dB/mW,117,Hybrid
```

### Phase 2: Automated Import from ASR (Medium-term)

**Already have infrastructure** from ASR scoring implementation!

Modify `scripts/import-asr-json.js` to extract:
- Impedance from review text
- Sensitivity when mentioned
- Power output for amps (already partially done)

### Phase 3: Web Scraping (Long-term)

**Manufacturer sites to scrape:**
- Sennheiser, Hifiman, Audeze, Focal (headphones)
- Topping, Schiit, JDS Labs, SMSL (amps)

**Similar to ASR crawler architecture** - use AI to parse spec tables

---

## Database Schema Updates

### Current Schema (Sufficient):
```sql
-- components table already has these columns:
impedance: INTEGER
needs_amp: BOOLEAN
power_output: TEXT

-- Need to add:
sensitivity_db_mw: DECIMAL(5,2)  -- e.g., 97.50
sensitivity_db_v: DECIMAL(5,2)   -- e.g., 115.20
driver_type: TEXT                 -- 'Dynamic', 'Planar', 'BA', 'Hybrid', 'Electrostatic'
```

### Migration SQL:
```sql
ALTER TABLE components
ADD COLUMN IF NOT EXISTS sensitivity_db_mw DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS sensitivity_db_v DECIMAL(5,2),
ADD COLUMN IF NOT EXISTS driver_type TEXT;

COMMENT ON COLUMN components.sensitivity_db_mw IS 'Sensitivity in dB/mW (IEM standard)';
COMMENT ON COLUMN components.sensitivity_db_v IS 'Sensitivity in dB/V (headphone standard)';
COMMENT ON COLUMN components.driver_type IS 'Driver technology: Dynamic, Planar, BA, Hybrid, Electrostatic, AMT';
```

---

## Implementation Roadmap

### ✅ Completed
- [x] ASR scoring implementation (provides template for data import)
- [x] Amplification assessment algorithm (`audio-calculations.ts`)
- [x] Power requirement calculations
- [x] Data gap analysis

### 🚧 Phase 1: Quick Wins (2-3 hours)
1. **Manual data entry for top 50 headphones**
   - Create CSV with impedance + sensitivity
   - Build import script (similar to ASR import)
   - Run migration to add new columns
   - Import data

2. **Parse existing amp power_output strings**
   - Extract numerical values from text field
   - Store in structured format for matching algorithm

### 🔮 Phase 2: Enhanced Matching (4-5 hours)
1. **Implement amp-to-headphone matching**
   - Use power requirements + amp capabilities
   - Calculate headroom scores
   - Show "Can reach XXX dB" predictions

2. **Update recommendation UI**
   - Show amplification difficulty badges
   - Display volume predictions
   - Recommend compatible amps for selected headphones

### 🎯 Phase 3: Automation (Future)
1. **ASR review parsing for specs**
   - Extract impedance/sensitivity from reviews
   - Extract power output measurements
   - Auto-update database

2. **Manufacturer scraping**
   - Build scrapers for major brands
   - Scheduled updates for new models

---

## Expected Impact

### After Phase 1:
- ✅ **~50 top headphones** have accurate amplification assessment
- ✅ **~10 top amps** have accurate power specs
- ✅ Can show basic compatibility (✓ or ✗)

### After Phase 2:
- ✅ **~400 headphones** have full data
- ✅ **~50 amps** have parsed power curves
- ✅ Can predict max volume: "Can reach 125 dB (15 dB headroom)"
- ✅ Can recommend: "This amp pairs well with your HD600"

### After Phase 3:
- ✅ **Automated updates** for new models
- ✅ **Real-time data** from manufacturer sites
- ✅ **Comprehensive coverage** across all price tiers

---

## Next Steps

**Immediate (choose one):**

1. **Option A: Manual CSV import** (fastest user impact)
   - I create CSV template with top 50 models
   - You/I fill in specs from manufacturer sites
   - Build import script
   - See results in 2-3 hours

2. **Option B: Enhanced ASR scraping** (leverages existing work)
   - Extend ASR parser to extract impedance/sensitivity
   - Re-run on existing review URLs
   - More automated but less comprehensive

3. **Option C: Document for later** (defer to future)
   - Save this plan for future implementation
   - Focus on other priorities now

**Your call!** Which direction makes most sense?
