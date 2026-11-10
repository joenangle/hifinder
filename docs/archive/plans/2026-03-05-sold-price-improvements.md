# Sold Price Data Improvements — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Capture sold price data for headphones by extracting prices from Reddit sold posts, backfilling expired listings as estimated sales, and displaying both confirmed and estimated data on the price history chart.

**Architecture:** Three layers — scraper improvement (extract sold prices from Reddit post bodies), a one-time backfill script (convert expired listings to estimated sold), and frontend changes (API + chart to distinguish confirmed vs estimated data).

**Tech Stack:** Node.js scripts (Supabase client), Next.js API routes, Recharts ScatterChart, existing `price_is_estimated` boolean column.

---

### Task 1: Add `extractSoldPrice()` to Reddit Scraper

**Files:**
- Modify: `scripts/reddit-avexchange-scraper-v3.js` (add function after `isSoldPost` at line 277)

**Step 1: Add the `extractSoldPrice` function after `isSoldPost()` (line 277)**

Insert this function immediately after the closing brace of `isSoldPost` at line 277:

```javascript
/**
 * Extract the actual sold price from post body text.
 * Returns { price, isEstimated } — if no explicit sold price found,
 * falls back to askingPrice with isEstimated=true.
 */
function extractSoldPrice(selftext, askingPrice) {
  if (!selftext || !askingPrice) {
    return { price: askingPrice || null, isEstimated: true };
  }

  const text = selftext.toLowerCase();

  // Patterns for explicit sold prices (order: most specific first)
  const patterns = [
    /sold\s+(?:to\s+\/?u\/\S+\s+)?for\s+\$(\d{1,5}(?:,\d{3})*)/i,
    /sold\s+at\s+\$(\d{1,5}(?:,\d{3})*)/i,
    /accepted\s+\$(\d{1,5}(?:,\d{3})*)/i,
    /sold\s+\$(\d{1,5}(?:,\d{3})*)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const extracted = parseInt(match[1].replace(/,/g, ''), 10);
      // Validate: must be 50%-120% of asking price
      if (extracted >= askingPrice * 0.5 && extracted <= askingPrice * 1.2) {
        return { price: extracted, isEstimated: false };
      }
    }
  }

  // No explicit sold price found — use asking price as estimate
  return { price: askingPrice, isEstimated: true };
}
```

**Step 2: Update the re-check sold path (line 648-672)**

Replace the update block at lines 655-661 with:

```javascript
      // If post is sold, update any existing listings in DB and move on
      if (isSoldPost(post)) {
        const existing = existingByUrl.get(postUrl);
        const needsUpdate = existing?.filter(l => l.status !== 'sold') || [];

        if (needsUpdate.length > 0) {
          // Extract sold price for each listing that needs updating
          for (const listing of needsUpdate) {
            const { price: salePrice, isEstimated } = extractSoldPrice(
              post.selftext, listing.price
            );
            const { error: updateErr } = await supabase
              .from('used_listings')
              .update({
                status: 'sold',
                date_sold: new Date().toISOString(),
                sale_price: salePrice,
                price_is_estimated: isEstimated,
              })
              .eq('id', listing.id);

            if (updateErr) {
              console.error(`  Failed to update sold status:`, updateErr.message);
            }
          }
          stats.soldStatusUpdated += needsUpdate.length;
          console.log(`  Marked ${needsUpdate.length} listing(s) as sold: ${post.title.substring(0, 50)}...`);
        } else {
          stats.soldSkipped++;
        }
        continue;
      }
```

**Step 3: Update the initial creation path (lines 779-805)**

After `const listing = {` block, add `sale_price` and `date_sold` fields. Change lines 801-802 to:

```javascript
          // Sold data
          status: soldStatus ? 'sold' : 'available',
          ...(soldStatus ? (() => {
            const { price: salePrice, isEstimated } = extractSoldPrice(
              post.selftext, priceInfo.individual_price
            );
            return {
              sale_price: salePrice,
              date_sold: new Date(post.created_utc * 1000).toISOString(),
              price_is_estimated: isEstimated || priceInfo.price_is_estimated || false,
            };
          })() : {}),
```

**Step 4: Test manually**

```bash
node -e "
// Inline test of extractSoldPrice
function extractSoldPrice(selftext, askingPrice) {
  if (!selftext || !askingPrice) return { price: askingPrice || null, isEstimated: true };
  const text = selftext.toLowerCase();
  const patterns = [
    /sold\s+(?:to\s+\/?u\/\S+\s+)?for\s+\\$(\d{1,5}(?:,\d{3})*)/i,
    /sold\s+at\s+\\$(\d{1,5}(?:,\d{3})*)/i,
    /accepted\s+\\$(\d{1,5}(?:,\d{3})*)/i,
    /sold\s+\\$(\d{1,5}(?:,\d{3})*)/i,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const extracted = parseInt(match[1].replace(/,/g, ''), 10);
      if (extracted >= askingPrice * 0.5 && extracted <= askingPrice * 1.2) {
        return { price: extracted, isEstimated: false };
      }
    }
  }
  return { price: askingPrice, isEstimated: true };
}

// Tests
console.log(extractSoldPrice('sold to u/buyer for \$220', 250));  // { price: 220, isEstimated: false }
console.log(extractSoldPrice('**sold**', 250));                   // { price: 250, isEstimated: true }
console.log(extractSoldPrice('sold for \$10', 250));              // { price: 250, isEstimated: true } (too low)
console.log(extractSoldPrice('accepted \$240', 250));             // { price: 240, isEstimated: false }
console.log(extractSoldPrice(null, 250));                         // { price: 250, isEstimated: true }
console.log(extractSoldPrice('sold \$200 shipped', 220));         // { price: 200, isEstimated: false }
"
```

Expected: all 6 tests pass with correct outputs as shown in comments.

**Step 5: Commit**

```bash
git add scripts/reddit-avexchange-scraper-v3.js
git commit -m "feat: extract sold prices from Reddit post bodies

Adds extractSoldPrice() that parses 'sold for $X', 'sold to u/... for $X',
'accepted $X' patterns from post text. Falls back to asking price with
price_is_estimated=true when no explicit sold price found.

Applied to both re-check path (existing listings marked sold) and
initial creation path (posts already sold when first scraped)."
```

---

### Task 2: Create Backfill Script

**Files:**
- Create: `scripts/backfill-estimated-sold-prices.js`

**Step 1: Write the backfill script**

```javascript
#!/usr/bin/env node

/**
 * Backfill estimated sold prices from expired Reddit listings.
 *
 * Heuristic: expired listings that were active 3+ days with prices
 * in a reasonable range likely represent completed sales.
 *
 * Usage:
 *   node scripts/backfill-estimated-sold-prices.js              # Dry run
 *   node scripts/backfill-estimated-sold-prices.js --execute     # Apply
 */

const { supabase } = require('./shared/database');

const DRY_RUN = !process.argv.includes('--execute');
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

async function backfill() {
  console.log(`=== Backfill Estimated Sold Prices ${DRY_RUN ? '(DRY RUN)' : '(EXECUTING)'} ===\n`);

  // 1. Fetch expired Reddit listings without sold data
  const { data: expired, error: fetchErr } = await supabase
    .from('used_listings')
    .select('id, component_id, price, date_posted, price_is_estimated, title')
    .eq('status', 'expired')
    .eq('source', 'reddit_avexchange')
    .is('date_sold', null)
    .gt('price', 0)
    .order('date_posted', { ascending: false });

  if (fetchErr) {
    console.error('Error fetching expired listings:', fetchErr.message);
    return;
  }

  console.log(`Found ${expired.length} expired Reddit listings without sold data\n`);

  // 2. Fetch component price ranges for validation
  const componentIds = [...new Set(expired.map(l => l.component_id))];
  const { data: components } = await supabase
    .from('components')
    .select('id, name, brand, price_used_min, price_used_max')
    .in('id', componentIds);

  const componentMap = new Map(components?.map(c => [c.id, c]) || []);

  // 3. Apply heuristics
  const qualified = [];
  const rejected = { tooShort: 0, priceOutOfRange: 0, alreadyEstimated: 0, noComponent: 0 };

  for (const listing of expired) {
    const component = componentMap.get(listing.component_id);
    if (!component) {
      rejected.noComponent++;
      continue;
    }

    // Skip bundle-estimated prices (already flagged)
    if (listing.price_is_estimated) {
      rejected.alreadyEstimated++;
      continue;
    }

    // Check listing was active 3+ days
    const postedAt = new Date(listing.date_posted).getTime();
    const age = Date.now() - postedAt;
    if (age < THREE_DAYS_MS) {
      rejected.tooShort++;
      continue;
    }

    // Check price is within 50%-150% of component used price range
    const minPrice = (component.price_used_min || 0) * 0.5;
    const maxPrice = (component.price_used_max || Infinity) * 1.5;
    if (listing.price < minPrice || listing.price > maxPrice) {
      rejected.priceOutOfRange++;
      continue;
    }

    qualified.push({
      ...listing,
      component,
      estimatedSoldDate: new Date(postedAt + SEVEN_DAYS_MS).toISOString(),
    });
  }

  console.log(`Qualified: ${qualified.length}`);
  console.log(`Rejected: ${JSON.stringify(rejected)}\n`);

  // 4. Group by component for reporting
  const byComponent = new Map();
  for (const q of qualified) {
    const key = `${q.component.brand} ${q.component.name}`;
    if (!byComponent.has(key)) byComponent.set(key, []);
    byComponent.get(key).push(q);
  }

  for (const [name, listings] of byComponent) {
    const prices = listings.map(l => l.price);
    console.log(`  ${name}: ${listings.length} listings, $${Math.min(...prices)}-$${Math.max(...prices)}`);
  }

  // 5. Apply updates
  if (!DRY_RUN && qualified.length > 0) {
    console.log(`\nUpdating ${qualified.length} listings...`);
    let updated = 0;
    let errors = 0;

    for (const q of qualified) {
      const { error } = await supabase
        .from('used_listings')
        .update({
          status: 'sold',
          sale_price: q.price,
          date_sold: q.estimatedSoldDate,
          price_is_estimated: true,
        })
        .eq('id', q.id);

      if (error) {
        errors++;
        console.error(`  Error updating ${q.id}:`, error.message);
      } else {
        updated++;
      }
    }

    console.log(`\nUpdated: ${updated}, Errors: ${errors}`);
  }

  if (DRY_RUN) {
    console.log('\n--- DRY RUN complete. Run with --execute to apply. ---');
  }
}

backfill().catch(console.error);
```

**Step 2: Test with dry run**

```bash
node scripts/backfill-estimated-sold-prices.js
```

Expected: reports qualified expired listings with component names and price ranges.

**Step 3: Commit**

```bash
git add scripts/backfill-estimated-sold-prices.js
git commit -m "feat: add backfill script for estimated sold prices

Converts expired Reddit listings to sold status with estimated prices.
Heuristics: active 3+ days, price within 50%-150% of component used range,
not already a bundle estimate. Dry-run by default."
```

---

### Task 3: Update Price History API

**Files:**
- Modify: `src/app/api/components/[id]/price-history/route.ts`

**Step 1: Add `price_is_estimated` to the select and response**

In `route.ts`, update the select query (line 27) to include `price_is_estimated`:

```typescript
      .select('price, sale_price, condition, date_sold, source, url, price_is_estimated')
```

Update the sales mapping (lines 69-75) to include the estimated flag:

```typescript
      sales: sales.map(s => ({
        price: s.sale_price || s.price,
        condition: s.condition,
        date_sold: s.date_sold,
        source: s.source,
        url: s.url,
        is_estimated: s.price_is_estimated || false,
      }))
```

Update the `Sale` interface in `PriceHistoryChart.tsx` to add the field (will be done in Task 4).

**Step 2: Verify API locally**

```bash
# After backfill has run on a component with estimated data:
curl "http://localhost:3000/api/components/2c9584bb-8707-43a6-b3cd-db56cf6f6629/price-history?days=365" | jq '.sales[:3]'
```

Expected: sales array includes `is_estimated` boolean field on each entry.

**Step 3: Commit**

```bash
git add src/app/api/components/\[id\]/price-history/route.ts
git commit -m "feat: include is_estimated flag in price history API response"
```

---

### Task 4: Update Price History Chart

**Files:**
- Modify: `src/components/PriceHistoryChart.tsx`

**Step 1: Update the Sale interface (line 9-15)**

```typescript
interface Sale {
  price: number
  condition: string
  date_sold: string
  source: string
  url: string
  is_estimated?: boolean
}
```

**Step 2: Split chart data into confirmed and estimated (after line 142)**

Replace line 139-142:

```typescript
  const allChartData = data.sales.map(s => ({
    ...s,
    timestamp: new Date(s.date_sold).getTime(),
  }))
  const confirmedData = allChartData.filter(d => !d.is_estimated)
  const estimatedData = allChartData.filter(d => d.is_estimated)
```

Update references: change `chartData` to `allChartData` on lines 145-146 (the domain calculations), and in ticks generation (line 152-155).

**Step 3: Update tooltip to show "(estimated)" label**

Replace the `CustomTooltip` component (lines 68-83):

```typescript
function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Sale & { timestamp: number } }> }) {
  if (!active || !payload?.length) return null
  const sale = payload[0].payload
  return (
    <div className="bg-surface-elevated border border-border rounded-lg p-3 shadow-lg text-sm">
      <div className="font-semibold text-foreground">
        {formatPrice(sale.price)}
        {sale.is_estimated && <span className="text-muted font-normal ml-1">(est.)</span>}
      </div>
      <div className="text-muted">
        {new Date(sale.date_sold).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric'
        })}
      </div>
      <div className="text-muted capitalize">{sale.condition?.replace('_', ' ') || 'Unknown'}</div>
      <div className="text-muted">{sourceLabel(sale.source)}</div>
    </div>
  )
}
```

**Step 4: Add second Scatter series for estimated data**

After the existing `<Scatter>` component (line 224-233), add a second scatter for estimated data:

```tsx
            <Scatter
              data={confirmedData}
              fill="#f59e0b"
              shape={(props: { cx?: number; cy?: number; payload?: Sale & { timestamp: number } }) => {
                const { cx, cy, payload } = props
                if (!cx || !cy || !payload) return null
                const color = CONDITION_COLORS[payload.condition] || '#f59e0b'
                return <circle cx={cx} cy={cy} r={5} fill={color} fillOpacity={0.8} stroke={color} strokeWidth={1} />
              }}
            />
            {estimatedData.length > 0 && (
              <Scatter
                data={estimatedData}
                fill="none"
                shape={(props: { cx?: number; cy?: number; payload?: Sale & { timestamp: number } }) => {
                  const { cx, cy, payload } = props
                  if (!cx || !cy || !payload) return null
                  const color = CONDITION_COLORS[payload.condition] || '#f59e0b'
                  return <circle cx={cx} cy={cy} r={5} fill="none" fillOpacity={0.4} stroke={color} strokeWidth={1.5} strokeDasharray="3 2" />
                }}
              />
            )}
```

**Step 5: Update stats summary (lines 239-256)**

Replace the Sales count stat:

```tsx
        <div className="p-2 bg-surface-secondary rounded">
          <div className="text-xs text-muted">Sales</div>
          <div className="text-sm font-semibold text-foreground">
            {confirmedData.length}
            {estimatedData.length > 0 && (
              <span className="text-muted font-normal text-xs"> +{estimatedData.length} est.</span>
            )}
          </div>
        </div>
```

**Step 6: Add "Estimated" entry to condition legend (lines 259-266)**

After the condition colors legend, add:

```tsx
      <div className="flex flex-wrap gap-3 text-xs text-muted">
        {Object.entries(CONDITION_COLORS).map(([condition, color]) => (
          <div key={condition} className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="capitalize">{condition.replace('_', ' ')}</span>
          </div>
        ))}
        <div className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full border border-muted" style={{ backgroundColor: 'transparent' }} />
          <span>Estimated</span>
        </div>
      </div>
```

**Step 7: Run build to verify**

```bash
npx tsc --noEmit && npx next build
```

Expected: no type errors, build succeeds.

**Step 8: Commit**

```bash
git add src/components/PriceHistoryChart.tsx
git commit -m "feat: distinguish estimated vs confirmed sales on price history chart

Confirmed sales render as solid filled circles (existing style).
Estimated sales render as hollow dashed circles at reduced opacity.
Tooltip shows '(est.)' label. Stats show 'X +Y est.' count.
Legend adds 'Estimated' entry."
```

---

### Task 5: Run Backfill and Verify End-to-End

**Step 1: Run backfill dry run**

```bash
node scripts/backfill-estimated-sold-prices.js
```

Expected: lists qualified expired listings by component with price ranges.

**Step 2: Execute backfill**

```bash
node scripts/backfill-estimated-sold-prices.js --execute
```

Expected: updates expired listings to sold with estimated prices.

**Step 3: Verify Sundara has sold data**

```bash
node scripts/diagnose-sundara.js
```

Expected: Sundara now shows sold listings with `date_sold` populated.

**Step 4: Verify API response**

```bash
curl "http://localhost:3000/api/components/2c9584bb-8707-43a6-b3cd-db56cf6f6629/price-history?days=365" | jq
```

Expected: `sales` array contains entries with `is_estimated: true`.

**Step 5: Visual verification**

Open the app, navigate to Sundara detail, verify:
- Price history chart shows estimated data points as hollow dashed circles
- Stats summary shows correct counts
- Tooltip displays "(est.)" on estimated points

**Step 6: Final commit**

```bash
git add -A
git commit -m "chore: run sold price backfill for expired Reddit listings"
```
