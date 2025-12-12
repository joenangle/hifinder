# Price Trends Setup Guide

## Quick Start

### 1. Apply Database Migration

The `price_trends` table needs to be created in your Supabase database.

**Via Supabase Dashboard:**
1. Go to https://supabase.com/dashboard
2. Select your project
3. Navigate to SQL Editor
4. Copy contents of `supabase/migrations/20251212_create_price_trends.sql`
5. Paste and run the SQL

**Via Supabase CLI (if installed):**
```bash
supabase db push
```

### 2. Run Price Trend Analysis

**Test in dry-run mode first:**
```bash
npm run analyze:prices:dry-run
# or manually:
node scripts/analyze-price-trends.js --dry-run --months=3
```

**Run for real (saves to database):**
```bash
npm run analyze:prices
# or manually:
node scripts/analyze-price-trends.js --months=6
```

**Options:**
- `--months=N` - Analyze last N months (default: 6)
- `--dry-run` - Preview results without saving to database

### 3. Schedule Automated Updates

**Recommended:** Run weekly via GitHub Actions or cron job

**GitHub Actions (recommended):**
Create `.github/workflows/price-trends.yml`:
```yaml
name: Update Price Trends
on:
  schedule:
    - cron: '0 2 * * 0' # Every Sunday at 2 AM
  workflow_dispatch: # Manual trigger

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run analyze:prices
        env:
          DATABASE_URL: \${{ secrets.DATABASE_URL }}
```

**Local cron (macOS/Linux):**
```bash
crontab -e
# Add line:
0 2 * * 0 cd /path/to/hifinder && npm run analyze:prices >> logs/price-trends.log 2>&1
```

## What Gets Analyzed

The script:
1. Fetches all sold listings from last N months
2. Groups by component and month
3. Calculates statistics:
   - Average/median/min/max asking prices
   - Number of sold items
   - Trend direction (up/down/stable)
   - Discount factor (sold vs active prices)
   - Confidence scores (based on sample size)

## Confidence Scores

- **High (20+ sales):** Reliable trend data
- **Medium (5-19 sales):** Moderate confidence
- **Low (<5 sales):** Use with caution, fall back to static pricing

## Example Output

```bash
✅ Component xyz (2025-11): {
  sold: 15,
  avg: '$280',
  median: '$275',
  trend: 'down (-8.2%)',
  confidence: 'medium',
  discount: '92%'
}
```

This means:
- 15 items sold in November 2025
- Average asking price: $280
- Trending down 8.2% from previous month
- Items typically sell for 92% of active listing prices

## Integration with Recommendations

### Phase 1 (Current): Manual Review
- Run analysis script
- Review trends in Supabase dashboard
- Manually adjust `price_used_min/max` in components table

### Phase 2 (Next): Automated Integration
- Recommendations API queries `price_trends` table
- Dynamic pricing: 70% static + 30% recent trends
- Shows confidence scores to users
- Falls back to static on low confidence

### Phase 3 (Future): ML Model
- Train on historical trends
- Predict future price movements
- Seasonal adjustment factors

## Troubleshooting

### "No sold listings found"
- Check that Reddit scraper has run recently
- Verify `date_sold` field is populated (run scraper with new code)
- Ensure sold status detection is working

### "Error saving trend data"
- Verify `price_trends` table exists (run migration)
- Check database permissions
- Review Supabase logs

### Discount factor >100% or <50%
- May indicate data quality issues
- Check if active listings are priced accurately
- Verify component matching is correct
- Normal range: 80-95% (items sell for slight discount)

## Data Quality Notes

**What we track:**
- ✅ Asking prices from sold listings
- ✅ Date items were marked as sold
- ✅ Active listing prices for comparison

**What we DON'T track:**
- ❌ Actual negotiated sale prices (not available from Reddit)
- ❌ Seller accepted offers below asking
- ❌ Private message negotiations

**This means:**
- Trends show asking price movement, not final sale prices
- Conservative approach: underestimate rather than overestimate
- More reliable for high-volume items (20+ sales/month)

## Next Steps

1. Apply migration (`supabase db push`)
2. Run dry-run test (`npm run analyze:prices:dry-run`)
3. Review output, verify it looks correct
4. Run for real (`npm run analyze:prices`)
5. Query results in Supabase dashboard
6. Set up weekly automation via GitHub Actions

## Querying Trends

**Get recent trends for a component:**
```sql
SELECT * FROM price_trends
WHERE component_id = 'your-component-id'
ORDER BY period_start DESC
LIMIT 6;
```

**Find trending-down deals:**
```sql
SELECT
  pt.*,
  c.brand,
  c.name
FROM price_trends pt
JOIN components c ON c.id = pt.component_id
WHERE
  pt.trend_direction = 'down'
  AND pt.confidence_score IN ('high', 'medium')
  AND pt.period_start >= NOW() - INTERVAL '3 months'
ORDER BY pt.trend_percentage ASC
LIMIT 20;
```

**Components with high sales volume:**
```sql
SELECT
  c.brand,
  c.name,
  SUM(pt.sold_count) as total_sold,
  AVG(pt.avg_asking_price) as avg_price,
  AVG(pt.discount_factor) as avg_discount
FROM price_trends pt
JOIN components c ON c.id = pt.component_id
WHERE pt.period_start >= NOW() - INTERVAL '6 months'
GROUP BY c.id, c.brand, c.name
HAVING SUM(pt.sold_count) >= 10
ORDER BY total_sold DESC;
```
