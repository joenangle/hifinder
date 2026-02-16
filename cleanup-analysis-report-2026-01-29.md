# Used Listings Cleanup Analysis Report

**Generated:** 2026-01-29
**Scope:** Retroactive cleanup of existing used listings
**Target:** 1,000 used listings (908 available, 92 sold)

---

## Executive Summary

**Critical Findings:**
- **72% issue rate** - 722 out of 1,000 listings have problems
- **649 bundle opportunities** - could expand to 519-973 new component listings
- **0 listings with bundle tracking** - bundle_group_id not populated
- **108 price extraction failures** - need re-extraction
- **12 severe false positives** - >300% price mismatches

**Recommendation:** Proceed with full 6-phase cleanup plan. Impact will be substantial.

---

## Phase 1 Analysis Results

### 1.1 Mismatch Detection Scan

**Script:** `scripts/detect-listing-mismatches.js --export`
**Output:** `mismatch-report-2026-01-29.json`

#### Issue Breakdown

| Issue Category | Count | Severity | % of Total |
|----------------|-------|----------|------------|
| **Severe Overpricing (>300%)** | 12 | 🔴 HIGH | 1.2% |
| **Severely Underpriced (<20%)** | 182 | 🟡 MEDIUM | 18.2% |
| **Category Conflicts** | 15 | 🔴 HIGH | 1.5% |
| **Generic Name Matches** | 23 | 🟡 MEDIUM | 2.3% |
| **Price Extraction Failures** | 108 | 🔵 LOW | 10.8% |
| **Bundle Issues** | 382 | 🟡 MEDIUM | 38.2% |
| **Total Issues** | **722** | — | **72.2%** |

#### Top False Positives (Severe Overpricing)

1. **Koss KSC75** - Listed at $120 vs MSRP $20 (600%)
   - URL: https://www.reddit.com/r/AVexchange/comments/1plhog7/...
   - **Action:** DELETE (clear false match)

2. **Tin HiFi T3 Plus** - Listed at $490 vs MSRP $70 (700%)
   - URL: https://www.reddit.com/r/AVexchange/comments/1pbyty5/...
   - **Action:** DELETE

3. **Tin HiFi T3 Plus** - Listed at $1,000 vs MSRP $70 (1429%)
   - URL: https://www.reddit.com/r/AVexchange/comments/1p8r6z3/...
   - **Action:** DELETE (listing selling different item)

4. **iFi Zen CAN** - Listed at $700 vs MSRP $160 (438%)
   - URL: https://www.reddit.com/r/AVexchange/comments/1oz6f3v/...
   - **Action:** DELETE

5. **Tin HiFi T3 Plus** - Listed at $520 vs MSRP $70 (743%)
   - URL: https://www.reddit.com/r/AVexchange/comments/1p09mzm/...
   - **Action:** DELETE

**Pattern:** "Tin HiFi T3 Plus" appears 3 times in top 5 - likely generic name matching wrong listings.

---

### 1.2 Unknown Status Analysis

**Script:** `scripts/analyze-unknown-status.js`

**Result:** ✅ **0 listings with NULL status**

All listings have status values populated. This simplifies cleanup - no need for Phase 2.3 (handle unknown status).

---

### 1.3 Bundle Opportunities Analysis

**Script:** `scripts/analyze-bundle-opportunities.js`

#### Current State

| Metric | Count |
|--------|-------|
| Listings with bundle_group_id | 0 |
| Unique bundle groups | 0 |
| Old bundles (is_bundle=true, no group) | 327 |
| Potential bundles (title patterns) | 322 |
| **Total opportunities** | **649** |

#### Expected Expansion

- **Lower bound:** 519 new component listings (80% expansion rate)
- **Upper bound:** 973 new component listings (150% expansion rate)
- **Impact:** Near doubling of discoverable components from bundles alone

#### Sample Bundle Titles

```
[WTS][USA-CA][H]Kiwiears - Orchestra 2 II [W]paypal
[WTS] [US-NM] [H] Beyerdynamic DT990 Pro 250 Ohm and Slappa Hardcase [W] PayPal
[WTS][USA-GA][H] Schiit Jotunheim 2, Schiit Modius [W] PayPal
[WTS] [USA-CA] [H] Mid-Fi and OG Goodness - Elysian Pilgrim, Softears Volume S, ...
[WTS][CAN-BC][H] 7hz Timeless OG with EPZ TP20, CX31993 [W] Paypal 115 FOR ALL
```

**Observation:** Many high-value bundles with multiple components only showing 1 match currently.

---

## Prioritization Matrix

### P0 - Delete Immediately (HIGH SEVERITY)

**Criteria:**
- Price >500% of component MSRP
- Category conflicts with match_confidence <0.5
- Generic names with zero text evidence

**Estimated Count:** 20-40 listings (2-4%)

**Scripts:**
```bash
node scripts/cleanup-false-positives.js --execute --severity=high
```

---

### P1 - Fix & Backfill (MEDIUM PRIORITY)

**Criteria:**
- Bundle expansion opportunities (649 listings)
- Price extraction failures (108 listings)
- Generic name matches needing review (23 listings)
- Re-validation for match_confidence (all 1,000 listings)

**Estimated Work:** 10-15 hours

**Scripts:**
```bash
node scripts/revalidate-existing-listings.js --execute
node scripts/reprocess-bundles.js --execute
```

---

### P2 - Metadata Backfill (LOW PRIORITY)

**Criteria:**
- Populate match_confidence for all listings
- Add validation_warnings where applicable
- Flag ambiguous matches

**Estimated Count:** All 1,000 listings

**Scripts:**
```bash
node scripts/revalidate-existing-listings.js --dry-run  # preview first
```

---

### P3 - Re-matching (NICE TO HAVE)

**Criteria:**
- Low confidence listings (<0.5) that might have better matches
- Estimated count: 50-100 listings

**Decision:** Flag for review only, don't auto-change component_id

---

## Impact Projections

### Before Cleanup

| Metric | Current Value |
|--------|---------------|
| Total listings | 1,000 |
| Listings with match_confidence | 0 (all NULL) |
| Avg match confidence | N/A |
| False positive rate | ~10-15% (estimated) |
| Price extraction success | ~90% (108 failures) |
| Bundle coverage | ~34% (327/1000 bundles) |
| Bundle expansion | 0 (no bundle_group_id) |

### After Cleanup (Projected)

| Metric | Target Value | Improvement |
|--------|--------------|-------------|
| Total listings | 1,850-1,970 | +850-970 (bundle expansion) |
| Listings with match_confidence | 100% | +100% |
| Avg match confidence | >0.75 | N/A → 0.75+ |
| False positive rate | <3% | -7-12% |
| Price extraction success | >98% | +8% |
| Bundle coverage | >90% | +56% |
| Bundle groups | 320-350 | +320-350 |

### User-Facing Impact

- **Discoverability:** +850-970 components available from bundles
- **Accuracy:** -50 to -100 false positive listings removed
- **Confidence:** All listings show match quality score
- **Price data:** +90-100 listings with recovered prices

---

## Recommended Action Plan

### Phase 2: Re-validation & Backfill (Days 1-2)
1. Create `scripts/revalidate-existing-listings.js`
2. Run dry-run on all 1,000 listings
3. Review flagged listings manually (top 50)
4. Execute backfill for match_confidence, validation_warnings
5. Re-extract prices for 108 failed listings

**Expected Results:**
- All listings have match_confidence
- 50-150 flagged for manual review
- 90-100 prices recovered

---

### Phase 3: Bundle Expansion (Days 2-3)
1. Create `scripts/reprocess-bundles.js`
2. Test on 10 sample bundles first
3. Run on all 649 bundle opportunities
4. Verify bundle_group_id linking

**Expected Results:**
- 649 bundles re-processed
- 519-973 new component listings created
- Average 1.8-2.5 components per bundle

---

### Phase 4: Cleanup Execution (Day 4)
1. **CRITICAL:** Create full backup first
2. Review manual flags (50-150 listings)
3. Run staged cleanup:
   - Stage 1: High severity (20-40 deletions)
   - Stage 2: Medium severity (30-60 deletions)
4. Post-cleanup verification

**Expected Results:**
- 50-100 false positives deleted (5-10%)
- Remaining listings have >95% accuracy

---

### Phase 5: Monitoring Setup (Day 5)
1. Create `scripts/listing-quality-dashboard.sql`
2. Create `scripts/weekly-listing-quality-report.js`
3. Update documentation (CLAUDE.md, maintenance checklist)
4. Set up automated weekly reports

**Expected Results:**
- Ongoing quality monitoring in place
- Weekly trend tracking
- Documentation updated

---

## Risk Assessment

### High Risk

**Issue:** Over-deletion (removing valid listings)

**Mitigation:**
- Full backup before Phase 4
- Staged cleanup (high severity first)
- Conservative thresholds (500% not 300%)
- Manual review of first 20 deletions

### Medium Risk

**Issue:** Bundle expansion creates too many listings, overwhelms users

**Mitigation:**
- Test on 10 bundles first
- Monitor component count per bundle
- UI can filter bundles if needed

### Low Risk

**Issue:** Re-validation takes too long (1,000 listings)

**Mitigation:**
- Batch processing (100 at a time)
- Progress logging
- Run during off-peak hours

---

## Next Steps

1. **Review this report** - Identify concerns or adjustments
2. **User approval** - Confirm scope and approach
3. **Run Phase 2** - Start with re-validation script creation
4. **Daily check-ins** - Review progress after each phase
5. **Document results** - Update metrics when complete

---

## Appendix: Sample Data

### Sample Severe Overpricing Cases

```
ID: xxx, Title: [WTS][USACA]H LG V60 ThinQ 5G [W] $120
Component: Koss KSC75 ($20 MSRP)
Price Ratio: 600%
Reason: Generic "audio" keyword matched unrelated listing
```

### Sample Bundle Expansion Opportunities

```
Title: [WTS][USA-GA][H] Schiit Jotunheim 2, Schiit Modius [W] PayPal
Current: 1 listing (Schiit Jotunheim 2)
After expansion: 2 listings (Jotunheim 2 + Modius)
Bundle Group ID: bundle_TIMESTAMP_RANDOMID
```

### Sample Price Extraction Failures

```
Title: [WTS] HD600 excellent condition
Current price: $0 (extraction failed)
Re-extraction: $175 (from description)
```

---

**Report Complete** - Ready for Phase 2 implementation.
