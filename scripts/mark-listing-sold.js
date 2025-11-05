/**
 * Manual Utility: Mark Specific Reddit Listings as Sold
 *
 * Usage: node scripts/mark-listing-sold.js <reddit_url>
 * Example: node scripts/mark-listing-sold.js https://www.reddit.com/r/AVexchange/comments/1odcbff/...
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function markListingAsSold(redditUrl) {
  console.log(`\n🔍 Searching for listing with URL: ${redditUrl}`);

  try {
    // Find the listing by URL
    const { data: listing, error: fetchError } = await supabase
      .from('used_listings')
      .select('*')
      .eq('url', redditUrl)
      .single();

    if (fetchError || !listing) {
      console.error(`❌ Listing not found for URL: ${redditUrl}`);
      return false;
    }

    console.log(`📦 Found listing: ${listing.title}`);
    console.log(`   Current status: ${listing.status}`);
    console.log(`   Is active: ${listing.is_active}`);

    if (listing.status === 'sold' && !listing.is_active) {
      console.log(`ℹ️  Listing is already marked as sold.`);
      return true;
    }

    // Update the listing to mark as sold
    const { error: updateError } = await supabase
      .from('used_listings')
      .update({
        status: 'sold',
        is_active: false,
        date_sold: new Date().toISOString(),
      })
      .eq('id', listing.id);

    if (updateError) {
      console.error(`❌ Error updating listing:`, updateError);
      return false;
    }

    console.log(`✅ Successfully marked listing as SOLD`);
    console.log(`   Title: ${listing.title}`);
    console.log(`   Price: $${listing.price}`);
    return true;

  } catch (error) {
    console.error(`❌ Error:`, error.message);
    return false;
  }
}

// Main execution
if (require.main === module) {
  const redditUrl = process.argv[2];

  if (!redditUrl) {
    console.error(`\n❌ Usage: node scripts/mark-listing-sold.js <reddit_url>`);
    console.error(`   Example: node scripts/mark-listing-sold.js https://www.reddit.com/r/AVexchange/comments/1odcbff/wts_usanc_h_schiit_magni_unity_with_dac_w_paypal/\n`);
    process.exit(1);
  }

  markListingAsSold(redditUrl)
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error(`❌ Fatal error:`, error);
      process.exit(1);
    });
}

module.exports = { markListingAsSold };
