# Data Enrichment Session Guide

Structured workflow for Claude Code sessions to fill data gaps that require judgment (SINAD verification, power spec extraction). For automated tasks (images, retail URLs), use the scripts in `scripts/enrichment/`.

## Before Starting

Run the gap report to see current state:
```bash
node scripts/enrichment/gap-report.js
```

## Session 1: SINAD Measurements

**Goal:** Find SINAD values for DACs/amps from Audio Science Review (ASR).

**Batch size:** 10-15 components per session.

### Step 1 — Get target list

```bash
npm run db "SELECT brand, name, category FROM components WHERE asr_sinad IS NULL AND category IN ('dac','amp','dac_amp') ORDER BY category, brand, name"
```

### Step 2 — For each component

1. **Search:** `WebSearch` for `"Brand Model" site:audiosciencereview.com review`
2. **Verify exact model match:**
   - Check that the ASR review is for the EXACT model in our database
   - Version mismatches (V281 vs V280, Bifrost vs Bifrost 2) = URL only, NO SINAD
   - Different editions (SE vs standard, MK2 vs MK1) = URL only, NO SINAD
3. **If exact match:** `WebFetch` the review page, find the SINAD value (usually stated in text near the dashboard image, e.g., "SINAD of 113.5 dB")
4. **If no ASR review exists:** Skip, note as "No ASR review found"

### Step 3 — Generate SQL

For exact matches with SINAD:
```sql
UPDATE components SET asr_sinad = 113.5, asr_review_url = 'https://www.audiosciencereview.com/...'
WHERE brand = 'Topping' AND name = 'D90SE' AND category = 'dac' AND asr_sinad IS NULL;
```

For version mismatches (URL only):
```sql
UPDATE components SET asr_review_url = 'https://www.audiosciencereview.com/...'
WHERE brand = 'Schiit' AND name = 'Bifrost 2' AND category = 'dac' AND asr_review_url IS NULL;
```

### Step 4 — Review and import

Save SQL to `scripts/enrichment/output/import-sinad-YYYY-MM-DD.sql` and run:
```bash
npm run db -- -f scripts/enrichment/output/import-sinad-YYYY-MM-DD.sql
```

### Critical Rules

- **NEVER fabricate ASR URLs** — always verify via WebSearch
- **NEVER guess SINAD values** — only use values explicitly stated in reviews
- **Only exact model matches** get SINAD values
- Use the `AND asr_sinad IS NULL` guard in WHERE clauses to prevent overwrites

---

## Session 2: Power Output Specs

**Goal:** Find structured power output specs (mW at 32 ohm and/or 300 ohm) for amps and DAC/amps.

**Batch size:** 15-20 components per session.

### Step 1 — Get target list

```bash
npm run db "SELECT brand, name, category, power_output FROM components WHERE power_output_mw_32 IS NULL AND category IN ('amp','dac_amp') ORDER BY brand, name"
```

This includes components that already have string `power_output` — the goal is to add structured numeric values.

### Step 2 — For each component

1. **If string power_output exists:** Parse it directly:
   - `"500mW @ 32 ohm"` → power_output_mw_32 = 500
   - `"2W @ 32 ohm"` → power_output_mw_32 = 2000
   - `"6.079W @ 32 ohm, 0.8717W @ 300 ohm"` → power_output_mw_32 = 6079, power_output_mw_300 = 872
   - Ambiguous strings → search manufacturer page
2. **If no power_output string:** Search manufacturer spec page:
   - `WebSearch` for `"Brand Model" specifications power output`
   - Look for power at 32 ohm and 300 ohm loads
   - Some specs list voltage output (Vrms) instead — convert: P = V^2 / R * 1000 (for mW)

### Step 3 — Generate SQL

```sql
UPDATE components SET power_output_mw_32 = 500, power_output_mw_300 = 72
WHERE brand = 'Schiit' AND name = 'Magni+' AND category = 'amp';

-- If only one impedance known:
UPDATE components SET power_output_mw_32 = 2000
WHERE brand = 'JDS Labs' AND name = 'Atom Amp+' AND category = 'amp';
```

### Step 4 — Review and import

Save to `scripts/enrichment/output/import-power-YYYY-MM-DD.sql` and run.

### Notes

- Balanced output specs are typically higher than single-ended — prefer single-ended (SE) specs for consistency, or note which output type in a comment
- If specs only list one impedance, that's fine — one column is better than none
- Round to nearest integer mW

---

## Session 3: Retail Availability

**Goal:** Find Amazon and manufacturer URLs for components missing both.

For automated finding, use:
```bash
node scripts/enrichment/find-retail-urls.js --execute
```

For manual follow-up on remaining gaps:
1. Search for the product on Amazon, B&H Photo, manufacturer site
2. Generate SQL updates for `amazon_url` and/or `manufacturer_url`

---

## Session 4: Product Images

**Goal:** Fill ~136 missing electronics images.

Run the existing automated pipeline first:
```bash
node scripts/populate-product-images.js --execute --category dac,amp,dac_amp
```

For remaining gaps after automation:
1. Check manufacturer website for product images
2. Search press kits or retailer CDNs
3. Update via SQL: `UPDATE components SET image_url = '...' WHERE id = '...';`

---

## Tracking Progress

After each session, re-run the gap report to see progress:
```bash
node scripts/enrichment/gap-report.js
```

Compare counts to previous runs. Keep a log of sessions in `scripts/enrichment/output/session-log.md`.
