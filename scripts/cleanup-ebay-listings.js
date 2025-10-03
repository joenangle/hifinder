/**
 * Clean up eBay listings from database
 * Run once to remove all eBay data after switching to affiliate model
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanupEbayListings() {
  console.log('🧹 Cleaning up eBay listings from database...\n');

  try {
    // First, count how many eBay listings we have
    const { count, error: countError } = await supabase
      .from('used_listings')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'ebay');

    if (countError) {
      throw new Error(`Error counting eBay listings: ${countError.message}`);
    }

    console.log(`📊 Found ${count || 0} eBay listings to remove`);

    if (count === 0) {
      console.log('✅ No eBay listings found. Database is clean.');
      return;
    }

    // Delete all eBay listings
    const { data, error } = await supabase
      .from('used_listings')
      .delete()
      .eq('source', 'ebay')
      .select('id');

    if (error) {
      throw new Error(`Error deleting eBay listings: ${error.message}`);
    }

    console.log(`✅ Successfully deleted ${data?.length || 0} eBay listings\n`);

    // Verify deletion
    const { count: remainingCount, error: verifyError } = await supabase
      .from('used_listings')
      .select('*', { count: 'exact', head: true })
      .eq('source', 'ebay');

    if (verifyError) {
      throw new Error(`Error verifying deletion: ${verifyError.message}`);
    }

    if (remainingCount === 0) {
      console.log('✅ Verification successful: All eBay listings removed');
    } else {
      console.warn(`⚠️ Warning: ${remainingCount} eBay listings still remain`);
    }

    // Show remaining listings by source
    const { data: sourceCounts, error: statsError } = await supabase
      .from('used_listings')
      .select('source')
      .eq('is_active', true);

    if (statsError) {
      console.warn('⚠️ Could not fetch source statistics');
    } else if (sourceCounts) {
      const counts = sourceCounts.reduce((acc, { source }) => {
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {});

      console.log('\n📈 Remaining active listings by source:');
      Object.entries(counts).forEach(([source, count]) => {
        console.log(`   ${source}: ${count}`);
      });
    }

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    process.exit(1);
  }
}

// Run cleanup
if (require.main === module) {
  cleanupEbayListings()
    .then(() => {
      console.log('\n🎉 Cleanup complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { cleanupEbayListings };
