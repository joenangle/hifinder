#!/usr/bin/env node
/**
 * One-time cleanup: Fix existing $0 price listings in the database.
 *
 * 1. Bundle listings with bundle_total_price → estimate per-item price
 * 2. Non-bundle listings with price=0 → set price to NULL
 *
 * Usage:
 *   node scripts/fix-zero-prices.js          # Dry run (preview)
 *   node scripts/fix-zero-prices.js --execute # Apply changes
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY_RUN = !process.argv.includes('--execute');

async function fixZeroPrices() {
  console.log(`\n🔧 Fix $0 Prices — ${DRY_RUN ? 'DRY RUN' : 'EXECUTING'}\n`);

  // 1. Find all listings with price = 0
  const { data: zeroListings, error } = await supabase
    .from('used_listings')
    .select('id, title, price, bundle_total_price, component_count, is_bundle, source')
    .eq('price', 0);

  if (error) {
    console.error('Error fetching listings:', error);
    process.exit(1);
  }

  console.log(`Found ${zeroListings.length} listings with price = $0\n`);

  let bundleFixed = 0;
  let nullified = 0;

  for (const listing of zeroListings) {
    if (listing.bundle_total_price && listing.component_count > 0) {
      // Bundle: estimate per-item price
      const estimated = Math.round(listing.bundle_total_price / listing.component_count);
      console.log(`  📦 Bundle: "${listing.title.substring(0, 60)}..." → ~$${estimated} (from $${listing.bundle_total_price}/${listing.component_count} items)`);

      if (!DRY_RUN) {
        await supabase
          .from('used_listings')
          .update({ price: estimated, price_is_estimated: true })
          .eq('id', listing.id);
      }
      bundleFixed++;
    } else {
      // Non-bundle: set to NULL
      console.log(`  ❓ Unknown: "${listing.title.substring(0, 60)}..." [${listing.source}] → NULL`);

      if (!DRY_RUN) {
        await supabase
          .from('used_listings')
          .update({ price: null })
          .eq('id', listing.id);
      }
      nullified++;
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  Bundle estimates: ${bundleFixed}`);
  console.log(`  Set to NULL: ${nullified}`);
  console.log(`  Total fixed: ${bundleFixed + nullified}`);

  if (DRY_RUN) {
    console.log(`\n⚠️  Dry run — no changes made. Run with --execute to apply.`);
  } else {
    console.log(`\n✅ Changes applied successfully.`);
  }
}

fixZeroPrices().catch(console.error);
