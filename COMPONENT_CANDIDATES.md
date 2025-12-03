# Component Candidate System

Automated system for detecting, enriching, and reviewing unknown audio components found in used listings.

## Overview

When the Reddit scraper encounters a listing it can't match to an existing component, it automatically extracts the brand/model and saves it as a "component candidate" for manual review. This prevents losing data on new or rare models.

## Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│  1. DETECTION (Automatic - runs every 4 hours)                 │
│  Reddit scraper → No match found → Extract candidate           │
│  ✓ Brand/model parsed from title                               │
│  ✓ Category inferred from keywords                             │
│  ✓ Price observed from listings                                │
│  ✓ Quality score calculated (0-100%)                           │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  2. ENRICHMENT (Manual trigger - recommended daily)            │
│  Run: node scripts/enrich-component-candidates.js --execute    │
│  ✓ Search ASR for measurements                                 │
│  ✓ Check Crinacle data cache                                   │
│  ✓ Generate manufacturer URLs                                  │
│  ✓ Estimate MSRP from observed prices                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│  3. REVIEW (Manual - visit /admin)                             │
│  Admin UI → Component Candidates tab                           │
│  ✓ View pending candidates sorted by quality                   │
│  ✓ See auto-enriched data + triggering listings                │
│  ✓ Click "Approve" → inserts to components table               │
│  ✓ Click "Reject" → marks as rejected                          │
└─────────────────────────────────────────────────────────────────┘
```

## Files

### Core Scripts
- **`scripts/component-candidate-extractor.js`** - Extraction logic (used by scrapers)
- **`scripts/reddit-avexchange-scraper-v3.js`** - Modified to capture unknown models
- **`scripts/enrich-component-candidates.js`** - Auto-enrichment with manufacturer data

### API Endpoints
- **`GET /api/admin/component-candidates`** - List candidates with filtering
- **`GET /api/admin/component-candidates/[id]`** - Get candidate details
- **`PATCH /api/admin/component-candidates/[id]`** - Update candidate fields
- **`POST /api/admin/component-candidates/[id]/approve`** - Approve and insert
- **`DELETE /api/admin/component-candidates/[id]`** - Reject candidate

### UI
- **`src/app/admin/page.tsx`** - Admin dashboard with candidates tab

### Database
- **`supabase/migrations/20251112_create_component_candidates.sql`** - Table schema

## Usage

### 1. Run Reddit Scraper (Automatic via GitHub Actions)

```bash
node scripts/reddit-avexchange-scraper-v3.js
```

**Output:**
```
📊 Scraping Statistics
============================================================
Posts processed:        150
Sell posts found:       82
Components matched:     75
No match found:         7

🆕 Component Candidates:
  New candidates:       5
  Updated candidates:   2
============================================================
```

### 2. Enrich Candidates (Run Daily)

**Dry run** (preview changes):
```bash
node scripts/enrich-component-candidates.js --dry-run
```

**Execute** (apply changes):
```bash
node scripts/enrich-component-candidates.js --execute
```

**Filter by quality**:
```bash
node scripts/enrich-component-candidates.js --execute --min-quality=70
```

**Output:**
```
📊 Enrichment Statistics
============================================================
Candidates processed:     5
Fields enriched:          12
ASR data found:           1
Crinacle data found:      2
Manufacturer URLs found:  4
MSRP estimates created:   3
Quality scores improved:  4
Errors:                   0
============================================================
```

### 3. Review in Admin UI

1. Visit: `http://localhost:3000/admin`
2. Click **"Component Candidates"** tab
3. Browse pending candidates (sorted by quality score)
4. Click a candidate to see details:
   - Auto-enriched data (MSRP, specs, URLs)
   - Triggering listings (3-5 examples)
5. Click **"✓ Approve"** to add to components table
6. Click **"✗ Reject"** if it's an accessory or invalid

## Quality Score Breakdown

Component candidates are scored 0-100% based on data completeness:

- **Brand identified**: 20 pts
- **Model name clear**: 20 pts
- **Category inferred**: 15 pts
- **Observed price data**: 10 pts
- **MSRP estimate**: 15 pts
- **Technical specs** (impedance, driver): 10 pts
- **Expert data** (ASR/Crinacle): 10 pts

**Scoring thresholds:**
- **90%+**: High confidence - likely ready to approve
- **70-89%**: Good - may need minor edits
- **50-69%**: Moderate - needs research
- **<50%**: Low - likely accessory or parsing error

## Database Schema

```sql
CREATE TABLE new_component_candidates (
  id UUID PRIMARY KEY,

  -- Extracted from listings
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  category TEXT,  -- cans, iems, dac, amp, dac_amp, combo

  -- Pricing
  price_estimate_new NUMERIC,      -- MSRP (enriched or estimated)
  price_observed_min NUMERIC,       -- Lowest listing price seen
  price_observed_max NUMERIC,       -- Highest listing price seen
  price_used_min NUMERIC,           -- 60% of MSRP
  price_used_max NUMERIC,           -- 80% of MSRP

  -- Enriched data
  sound_signature TEXT,
  driver_type TEXT,
  impedance INTEGER,
  needs_amp BOOLEAN,
  manufacturer_url TEXT,

  -- Expert data
  asr_sinad NUMERIC,
  asr_review_url TEXT,
  crin_tone TEXT,
  crin_tech TEXT,
  crin_rank TEXT,
  crin_value NUMERIC,

  -- Metadata
  quality_score INTEGER DEFAULT 0,
  listing_count INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending',   -- pending, approved, rejected, needs_research
  trigger_listing_ids UUID[],       -- Links to used_listings

  -- Review tracking
  reviewed_at TIMESTAMP,
  reviewed_by TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

## Troubleshooting

### "No pending candidates found"
- Wait for next scraper run (every 4 hours via GitHub Actions)
- Check if scraper is running: `scripts/.reddit-scraper-v3.lock`
- Manually run scraper: `node scripts/reddit-avexchange-scraper-v3.js`

### "Enrichment finds no data"
- ASR search is basic (can be enhanced with actual API/scraping)
- Crinacle data only exists for ~400 components already in DB
- Manufacturer URLs only work for major brands with predictable URL patterns
- MSRP estimation is fallback when other methods fail

### "Candidate approved but not showing in recommendations"
- Check `/api/recommendations/v2` filters
- Verify component has required fields: category, price_new, price_used_min/max
- May need to match user's budget/filters to appear

## Future Enhancements

### Phase 1 (Current) ✓
- [x] Auto-detection from Reddit scraper
- [x] Basic enrichment (Crinacle cache, URL generation, MSRP estimation)
- [x] Admin UI for review/approval

### Phase 2 (Next)
- [ ] Enhanced ASR search (actual API/scraping instead of URL guessing)
- [ ] Web scraping for MSRP from manufacturer pages
- [ ] Bulk approve/reject actions in UI
- [ ] Inline editing in admin UI

### Phase 3 (Future)
- [ ] Schedule enrichment as daily cron job
- [ ] Slack/email notifications for high-quality candidates (90%+)
- [ ] Auto-approve very high confidence candidates (95%+)
- [ ] Track approval accuracy over time

## Related Documentation

- **Scraper Infrastructure**: `CLAUDE.md` → "Active Data Sources"
- **Matching System**: `scripts/component-matcher-enhanced.js`
- **Database Schema**: `supabase/migrations/`
