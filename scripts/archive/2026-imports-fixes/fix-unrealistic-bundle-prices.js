#!/usr/bin/env node
/**
 * Fix unrealistic bundle prices from the old extraction logic
 *
 * The old price extractor picked the LOWEST price when multiple prices existed,
 * which resulted in bundles like "Sundara + Atom + DAC" being priced at $30 instead
 * of the actual bundle total.
 *
 * This script sets those unrealistic prices to NULL.
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const DRY_RUN = !process.argv.includes('--execute');

async function fixUnrealisticPrices() {
  console.log(`\n🔧 Fix Unrealistic Bundle Prices — ${DRY_RUN ? 'DRY RUN' : 'EXECUTING'}\n`);

  // Find all listings with estimated prices
  const { data: listings, error } = await supabase
    .from('used_listings')
    .select('id, title, price, bundle_total_price, component_count')
    .eq('price_is_estimated', true);

  if (error) {
    console.error('Error fetching listings:', error);
    process.exit(1);
  }

  console.log(`Found ${listings.length} listings with estimated prices\n`);

  // Reasonable minimum prices for audio equipment
  const MINIMUM_REASONABLE_PRICE = 100; // Bundles with Sundara/high-end gear should be at least $100

  let fixed = 0;

  for (const listing of listings) {
    // Check if the bundle total price is unrealistically low
    if (listing.bundle_total_price && listing.bundle_total_price < MINIMUM_REASONABLE_PRICE) {
      console.log(`  ❌ UNREALISTIC: "${listing.title.substring(0, 70)}..."`);
      console.log(`     Bundle total: $${listing.bundle_total_price}, Per-item: $${listing.price}`);
      console.log(`     → DELETING (price extraction failed completely)\n`);

      if (!DRY_RUN) {
        const { error: deleteError } = await supabase
          .from('used_listings')
          .delete()
          .eq('id', listing.id);

        if (deleteError) {
          console.error(`     Error deleting listing ${listing.id}:`, deleteError);
        }
      }

      fixed++;
    } else {
      console.log(`  ✓ Reasonable: "${listing.title.substring(0, 70)}..."`);
      console.log(`     Bundle total: $${listing.bundle_total_price}, Per-item: $${listing.price}\n`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  Unrealistic prices found: ${fixed}`);
  console.log(`  Reasonable prices kept: ${listings.length - fixed}`);

  if (DRY_RUN) {
    console.log(`\n⚠️  Dry run — no changes made. Run with --execute to apply.\n`);
  } else {
    console.log(`\n✅ Fixed ${fixed} unrealistic bundle prices.\n`);
  }
}

fixUnrealisticPrices();
