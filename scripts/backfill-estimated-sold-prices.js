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
    .not('component_id', 'is', null)
    .gt('price', 0)
    .order('date_posted', { ascending: false });

  if (fetchErr) {
    console.error('Error fetching expired listings:', fetchErr.message);
    return;
  }

  console.log(`Found ${expired.length} expired Reddit listings without sold data\n`);

  // 2. Fetch component price ranges for validation
  const componentIds = [...new Set(expired.map(l => l.component_id).filter(Boolean))];

  // Batch component fetches to avoid Supabase .in() limit
  const BATCH_SIZE = 200;
  const componentMap = new Map();
  for (let i = 0; i < componentIds.length; i += BATCH_SIZE) {
    const batch = componentIds.slice(i, i + BATCH_SIZE);
    const { data: components } = await supabase
      .from('components')
      .select('id, name, brand, price_used_min, price_used_max')
      .in('id', batch);
    for (const c of components || []) {
      componentMap.set(c.id, c);
    }
  }

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
