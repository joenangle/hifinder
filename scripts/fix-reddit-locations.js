/**
 * Fix "Unknown" locations in existing Reddit listings
 *
 * This script re-parses the titles of Reddit listings to extract proper location data
 * that was missed by the previous location extraction logic.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Extract location from Reddit post title using improved regex
 * Standard format: [US-XX] where XX is state postal code
 */
function extractLocationFromTitle(title) {
  // Match patterns in priority order
  // Reddit standard: [US-CA], [CA-ON], etc.
  // Also handles: [USA-CA] (normalize to US-CA), [US CA] (space instead of hyphen)
  const locationPatterns = [
    // US formats (most common)
    /\[USA[\s-]([A-Z]{2})\]/i,      // [USA-CA] or [USA CA] → normalize to US-XX
    /\[US[\s-]([A-Z]{2})\]/i,       // [US-CA] or [US CA] → US-XX

    // Canada formats
    /\[CAN[\s-]([A-Z]{2})\]/i,      // [CAN-ON] or [CAN ON] → CA-XX
    /\[CA[\s-]([A-Z]{2})\]/i,       // [CA-ON] or [CA ON] → CA-XX

    // Other countries (single codes)
    /\[(UK|EU|AU|AUS|NZ|IND|KSA|AUS-[A-Z]{2,3})\]/i,  // [UK], [AUS-SYD], etc.

    // Generic fallback for any XX-YY pattern
    /\[([A-Z]{2,3})[\s-]([A-Z]{2,3})\]/i
  ];

  for (const pattern of locationPatterns) {
    const match = title.match(pattern);
    if (match) {
      const fullMatch = match[0];

      // Normalize USA-XX to US-XX
      if (fullMatch.includes('USA')) {
        const state = match[1];
        return `US-${state}`;
      }

      // Normalize CAN-XX to CA-XX
      if (fullMatch.includes('CAN')) {
        const province = match[1];
        return `CA-${province}`;
      }

      // For US-XX or CA-XX with space, normalize to hyphen
      if (fullMatch.match(/\[US\s/i)) {
        const state = match[1];
        return `US-${state}`;
      }

      if (fullMatch.match(/\[CA\s/i)) {
        const province = match[1];
        return `CA-${province}`;
      }

      // For other formats, return as-is without brackets
      return fullMatch.replace(/[\[\]]/g, '').replace(/\s+/g, '-');
    }
  }

  return null; // No location found
}

async function fixRedditLocations() {
  console.log('🔧 Fixing Reddit listing locations...\n');

  try {
    // Fetch all Reddit listings with "Unknown" location
    const { data: listings, error: fetchError } = await supabase
      .from('used_listings')
      .select('id, title, location')
      .eq('source', 'reddit_avexchange')
      .eq('location', 'Unknown');

    if (fetchError) {
      throw fetchError;
    }

    console.log(`📦 Found ${listings.length} listings with "Unknown" location\n`);

    let fixedCount = 0;
    let stillUnknownCount = 0;

    for (const listing of listings) {
      const extractedLocation = extractLocationFromTitle(listing.title);

      if (extractedLocation) {
        // Update the listing
        const { error: updateError } = await supabase
          .from('used_listings')
          .update({ location: extractedLocation })
          .eq('id', listing.id);

        if (updateError) {
          console.error(`❌ Error updating ${listing.id}:`, updateError.message);
        } else {
          fixedCount++;
          console.log(`✅ ${listing.title.substring(0, 50)}... → ${extractedLocation}`);
        }
      } else {
        stillUnknownCount++;
        console.log(`⚠️  Still no location: ${listing.title.substring(0, 60)}...`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('📊 Location Fix Summary');
    console.log('='.repeat(60));
    console.log(`Total listings processed: ${listings.length}`);
    console.log(`Locations fixed:          ${fixedCount}`);
    console.log(`Still unknown:            ${stillUnknownCount}`);
    console.log('='.repeat(60));

    console.log('\n✅ Location fix complete!');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  fixRedditLocations()
    .then(() => {
      console.log('✅ Done!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Failed:', error);
      process.exit(1);
    });
}

module.exports = { fixRedditLocations };
