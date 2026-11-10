# Sold Price Data Improvements

## Problem
Popular headphones like the HiFiMAN Sundara have zero sold price history despite 12+ scraped listings. Two root causes:
1. Reddit scraper never populates `sale_price` when marking listings as sold
2. Expired listings (likely sold) are never converted to sold status with price data

## Design

### 1. Scraper: Extract Sold Price from Post Body
Add `extractSoldPrice(postBody, askingPrice)` to `scripts/reddit-avexchange-scraper-v3.js`.

**Patterns to match:**
- `sold for $X`, `sold to u/... for $X`, `sold at $X`, `accepted $X`

**Validation:** extracted price must be 50%-120% of asking price.

**Fallback:** use asking price if no explicit sold price found.

**Apply at both sold-detection paths:**
- Re-check path (~line 655): existing listing updated when flair changes
- Initial creation (~line 794): new listings already marked sold

**Price estimation flag:**
| Scenario | status | sale_price | price_is_estimated |
|----------|--------|------------|-------------------|
| Confirmed sale + explicit "sold for $X" | sold | extracted | false |
| Confirmed sale + no explicit price | sold | asking | true |
| Backfilled expired listing | sold | asking | true |

### 2. Backfill Script
Create `scripts/backfill-estimated-sold-prices.js` (dry-run by default, `--execute` to apply).

**Target:** `status = 'expired'`, `source = 'reddit_avexchange'`, `date_sold IS NULL`

**Qualification heuristics:**
- Listing was active 3+ days (not spam/deleted)
- Price within 50%-150% of component's used price range
- Not already a bundle price estimate (`price_is_estimated != true`)

**Updates:** `status = 'sold'`, `sale_price = price`, `date_sold = date_posted + 7 days`, `price_is_estimated = true`

### 3. API: Return Estimated Flag
Update `src/app/api/components/[id]/price-history/route.ts`:
- Add `price_is_estimated` to select query and response
- Statistics computed from ALL sales (confirmed + estimated)
- Each sale includes `is_estimated: boolean`

### 4. Chart: Visual Distinction
Update `src/components/PriceHistoryChart.tsx`:
- Split data into confirmed and estimated series
- Confirmed: solid filled circles (current style)
- Estimated: hollow circles, dashed stroke, 40% opacity
- Tooltip shows "(estimated)" for estimated points
- Stats summary: "X confirmed + Y est."
- Legend: add "Estimated" entry

## Files to Modify
- `scripts/reddit-avexchange-scraper-v3.js` — add extractSoldPrice, update sold marking
- `scripts/backfill-estimated-sold-prices.js` — new backfill script
- `src/app/api/components/[id]/price-history/route.ts` — add is_estimated to response
- `src/components/PriceHistoryChart.tsx` — two scatter series, tooltip, legend

## Verification
1. Run scraper with `--dry-run` and verify sold price extraction
2. Run backfill with `--dry-run`, verify heuristics select reasonable listings
3. Run backfill with `--execute`, check Sundara has sold data
4. Check price history API returns both confirmed and estimated sales
5. Verify chart renders two visual styles correctly
