#!/usr/bin/env node
/**
 * Analyze Bundle Opportunities
 *
 * Finds listings that could be expanded into multiple component listings
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function analyzeBundleOpportunities() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   BUNDLE OPPORTUNITIES ANALYSIS            ║');
  console.log('╚════════════════════════════════════════════╝\n');

  // Query 1: Old bundles (is_bundle=true but no bundle_group_id)
  const { data: oldBundles } = await supabase
    .from('used_listings')
    .select('*')
    .eq('status', 'available')
    .eq('is_bundle', true)
    .is('bundle_group_id', null);

  console.log('OLD BUNDLES (is_bundle=true, no bundle_group_id):');
  console.log(`  Count: ${oldBundles?.length || 0}`);
  if (oldBundles && oldBundles.length > 0) {
    console.log('  Sample titles:');
    oldBundles.slice(0, 5).forEach(l => {
      console.log(`    - ${l.title.substring(0, 80)}...`);
    });
  }
  console.log('');

  // Query 2: Potential bundles (title contains separators)
  const { data: allListings } = await supabase
    .from('used_listings')
    .select('*')
    .eq('status', 'available');

  const potentialBundles = allListings?.filter(l =>
    l.title.includes('+') ||
    l.title.match(/, /) ||
    l.title.match(/ and /)
  ) || [];

  const unbundled = potentialBundles.filter(l => !l.bundle_group_id);

  console.log('POTENTIAL BUNDLES (title patterns):');
  console.log(`  Total with separators: ${potentialBundles.length}`);
  console.log(`  Without bundle_group_id: ${unbundled.length}`);
  if (unbundled.length > 0) {
    console.log('  Sample titles:');
    unbundled.slice(0, 5).forEach(l => {
      console.log(`    - ${l.title.substring(0, 80)}...`);
    });
  }
  console.log('');

  // Query 3: Current bundle statistics
  const { data: withBundleId } = await supabase
    .from('used_listings')
    .select('bundle_group_id')
    .eq('status', 'available')
    .not('bundle_group_id', 'is', null);

  const uniqueBundleGroups = new Set(withBundleId?.map(l => l.bundle_group_id) || []).size;

  console.log('CURRENT BUNDLE STATISTICS:');
  console.log(`  Listings with bundle_group_id: ${withBundleId?.length || 0}`);
  console.log(`  Unique bundle groups: ${uniqueBundleGroups}`);
  if (uniqueBundleGroups > 0) {
    console.log(`  Avg components per bundle: ${(withBundleId.length / uniqueBundleGroups).toFixed(1)}`);
  }
  console.log('');

  // Summary
  console.log('═'.repeat(60));
  console.log('SUMMARY');
  console.log('═'.repeat(60));
  console.log('');

  const totalOpportunities = (oldBundles?.length || 0) + unbundled.length;
  console.log('Estimated bundle expansion opportunities:');
  console.log(`  ${totalOpportunities} listings could be re-processed`);
  console.log(`  Expected new components: ${Math.floor(totalOpportunities * 0.8)}-${Math.floor(totalOpportunities * 1.5)}`);
  console.log('  (Assuming 80-150% expansion rate)\n');
}

analyzeBundleOpportunities().catch(error => {
  console.error('Analysis failed:', error);
  process.exit(1);
});
