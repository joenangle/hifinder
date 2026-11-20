#!/usr/bin/env node
/**
 * Re-process Bundle Listings
 *
 * Expands existing bundle listings into multiple component listings:
 * - Finds bundles with separators (+, comma, and, /, &)
 * - Uses bundle-extractor.js to parse components
 * - Creates new listings for additional components
 * - Links with bundle_group_id
 *
 * Safety: Only ADDS new listings, never deletes. Dry-run by default.
 *
 * Usage:
 *   node scripts/reprocess-bundles.js                # Dry run
 *   node scripts/reprocess-bundles.js --execute      # Actually create listings
 *   node scripts/reprocess-bundles.js --limit=10     # Test on 10 bundles
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { extractBundleComponents, generateBundleGroupId } = require('./bundle-extractor');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Parse command line arguments
const args = process.argv.slice(2);
const EXECUTE_MODE = args.includes('--execute');
const LIMIT = args.find(a => a.startsWith('--limit='))?.split('=')[1] || null;

/**
 * Check if listing is a bundle candidate
 */
function isBundleCandidate(title) {
  return (
    title.includes('+') ||
    title.match(/, /) ||
    title.match(/ and /) ||
    title.includes(' & ') ||
    title.includes('/')
  );
}

/**
 * Re-process a single bundle listing
 */
async function reprocessBundle(listing) {
  const result = {
    original_id: listing.id,
    title: listing.title,
    url: listing.url,
    components_found: 0,
    new_listings: [],
    error: null,
    bundle_group_id: null
  };

  try {
    // Extract bundle components using bundle-extractor
    const components = await extractBundleComponents(
      listing.title,
      listing.description || '',
      listing.source || 'unknown'
    );

    if (components.length <= 1) {
      // Not actually a bundle or only one component matched
      return result;
    }

    result.components_found = components.length;

    // Check which components already exist for this URL
    const { data: existing } = await supabase
      .from('used_listings')
      .select('component_id')
      .eq('url', listing.url);

    const existingIds = new Set(existing?.map(e => e.component_id) || []);

    // Filter to only new components
    const newComponents = components.filter(
      c => !existingIds.has(c.component.id)
    );

    if (newComponents.length === 0) {
      // All components already exist
      result.note = 'All components already extracted';
      return result;
    }

    // Generate bundle group ID
    const bundleGroupId = generateBundleGroupId();
    result.bundle_group_id = bundleGroupId;

    // Create new listing for each component
    for (let i = 0; i < components.length; i++) {
      const component = components[i];
      const isNew = !existingIds.has(component.component.id);

      const newListing = {
        component_id: component.component.id,
        title: listing.title,
        price: components.length > 1 ? null : listing.price, // Individual price unknown for bundles
        condition: listing.condition,
        source: listing.source,
        url: listing.url,
        date_posted: listing.date_posted,
        location: listing.location,
        seller_username: listing.seller_username,
        description: listing.description,
        images: listing.images,
        status: listing.status,
        // Bundle metadata
        is_bundle: true,
        bundle_group_id: bundleGroupId,
        bundle_total_price: listing.price,
        bundle_component_count: components.length,
        bundle_position: i + 1,
        matched_segment: component.segment
      };

      if (isNew) {
        result.new_listings.push(newListing);
      }
    }

    // Also update the original listing with bundle metadata (if it's one of the components)
    if (existingIds.has(listing.component_id)) {
      result.update_original = {
        id: listing.id,
        bundle_group_id: bundleGroupId,
        bundle_total_price: listing.price,
        bundle_component_count: components.length,
        bundle_position: components.findIndex(c => c.component.id === listing.component_id) + 1,
        is_bundle: true
      };
    }

  } catch (error) {
    result.error = error.message;
  }

  return result;
}

/**
 * Insert new bundle listings
 */
async function insertBundleListings(listings) {
  const results = {
    inserted: 0,
    failed: 0,
    updated: 0
  };

  for (const listing of listings) {
    try {
      const { error } = await supabase
        .from('used_listings')
        .upsert(listing, {
          onConflict: 'url,component_id'
        });

      if (error) {
        console.error(`  ❌ Failed to insert listing:`, error.message);
        results.failed++;
      } else {
        results.inserted++;
      }
    } catch (error) {
      console.error(`  ❌ Error inserting listing:`, error);
      results.failed++;
    }
  }

  return results;
}

/**
 * Update original listings with bundle metadata
 */
async function updateOriginalListings(updates) {
  const results = {
    updated: 0,
    failed: 0
  };

  for (const update of updates) {
    try {
      const { error } = await supabase
        .from('used_listings')
        .update({
          bundle_group_id: update.bundle_group_id,
          bundle_total_price: update.bundle_total_price,
          bundle_component_count: update.bundle_component_count,
          bundle_position: update.bundle_position,
          is_bundle: update.is_bundle
        })
        .eq('id', update.id);

      if (error) {
        console.error(`  ❌ Failed to update listing ${update.id}:`, error.message);
        results.failed++;
      } else {
        results.updated++;
      }
    } catch (error) {
      console.error(`  ❌ Error updating listing:`, error);
      results.failed++;
    }
  }

  return results;
}

/**
 * Main bundle reprocessing function
 */
async function reprocessAllBundles() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   RE-PROCESS BUNDLE LISTINGS               ║');
  console.log(EXECUTE_MODE ? '║   MODE: EXECUTE (will create listings)     ║' : '║   MODE: DRY RUN (preview only)             ║');
  console.log('╚════════════════════════════════════════════╝\n');

  // Fetch all available listings that might be bundles
  let query = supabase
    .from('used_listings')
    .select('*')
    .eq('status', 'available');

  if (LIMIT) {
    query = query.limit(parseInt(LIMIT));
    console.log(`⚠️  Testing mode: Processing only ${LIMIT} listings\n`);
  }

  const { data: listings, error } = await query;

  if (error) {
    console.error('❌ Error fetching listings:', error.message);
    process.exit(1);
  }

  // Filter to bundle candidates
  const bundleCandidates = listings.filter(l => isBundleCandidate(l.title));

  console.log(`📊 Found ${bundleCandidates.length} bundle candidates out of ${listings.length} total\n`);
  console.log('Processing...\n');

  const stats = {
    total: bundleCandidates.length,
    processed: 0,
    bundles_expanded: 0,
    components_added: 0,
    already_complete: 0,
    errors: 0
  };

  const allNewListings = [];
  const allUpdates = [];

  for (let i = 0; i < bundleCandidates.length; i++) {
    const listing = bundleCandidates[i];

    if (i > 0 && i % 10 === 0) {
      process.stdout.write(`\rProcessed ${i}/${bundleCandidates.length} (${((i / bundleCandidates.length) * 100).toFixed(1)}%)`);
    }

    const result = await reprocessBundle(listing);
    stats.processed++;

    if (result.error) {
      stats.errors++;
      continue;
    }

    if (result.components_found > 1) {
      stats.bundles_expanded++;
      stats.components_added += result.new_listings.length;

      allNewListings.push(...result.new_listings);

      if (result.update_original) {
        allUpdates.push(result.update_original);
      }
    } else if (result.components_found === 1) {
      stats.already_complete++;
    }
  }

  console.log('\n');

  // Insert new listings
  if (allNewListings.length > 0) {
    console.log(`\n📦 Creating ${allNewListings.length} new bundle component listings...`);

    if (EXECUTE_MODE) {
      const insertResults = await insertBundleListings(allNewListings);
      console.log(`  Inserted: ${insertResults.inserted}, Failed: ${insertResults.failed}`);
    } else {
      console.log('  (Dry run - no database changes)');
      console.log('\n  Sample new listings:');
      allNewListings.slice(0, 3).forEach(l => {
        console.log(`    - Component: ${l.component_id}, Position: ${l.bundle_position}/${l.bundle_component_count}`);
      });
    }
  }

  // Update original listings
  if (allUpdates.length > 0) {
    console.log(`\n🔄 Updating ${allUpdates.length} original listings with bundle metadata...`);

    if (EXECUTE_MODE) {
      const updateResults = await updateOriginalListings(allUpdates);
      console.log(`  Updated: ${updateResults.updated}, Failed: ${updateResults.failed}`);
    } else {
      console.log('  (Dry run - no database changes)');
    }
  }

  // Final summary
  console.log('\n' + '═'.repeat(60));
  console.log('BUNDLE REPROCESSING COMPLETE');
  console.log('═'.repeat(60));
  console.log('');
  console.log(`Total candidates:      ${stats.total}`);
  console.log(`Bundles expanded:      ${stats.bundles_expanded}`);
  console.log(`New components added:  ${stats.components_added}`);
  console.log(`Already complete:      ${stats.already_complete}`);
  console.log(`Errors:                ${stats.errors}`);
  console.log('');

  if (!EXECUTE_MODE) {
    console.log('🔵 DRY RUN MODE - No database changes made');
    console.log('   Run with --execute to create bundle listings');
  } else {
    console.log('✅ Bundle listings created successfully');
  }

  console.log('');
}

// Run bundle reprocessing
reprocessAllBundles().catch(error => {
  console.error('\nBundle reprocessing failed:', error);
  process.exit(1);
});
