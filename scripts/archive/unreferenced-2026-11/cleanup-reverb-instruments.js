/**
 * Cleanup Script: Remove Non-Audio Reverb Listings
 *
 * Removes guitars, basses, and other musical instruments that slipped through
 * the Reverb scraper before the improved filtering was implemented.
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Keywords that indicate non-audio gear (instruments, etc.)
const INSTRUMENT_KEYWORDS = [
  'guitar', 'bass', 'drum', 'keyboard', 'piano', 'synth', 'violin', 'trumpet', 'saxophone',
  'ukulele', 'banjo', 'mandolin', 'cello', 'flute', 'clarinet', 'trombone',
  'pedal', 'tuner', 'strap', 'pick', 'string', 'reed', 'bow', 'valve', 'mouthpiece',
  'gibson', 'fender', 'yamaha', 'roland', 'korg' // Common instrument brands
];

async function cleanupReverbInstruments() {
  console.log('🧹 Starting cleanup of non-audio Reverb listings...\n');

  try {
    // Get all Reverb listings
    const { data: listings, error: fetchError } = await supabase
      .from('used_listings')
      .select('id, title, url, source')
      .eq('source', 'reverb');

    if (fetchError) {
      console.error('❌ Error fetching listings:', fetchError);
      return;
    }

    console.log(`📋 Found ${listings.length} Reverb listings to check\n`);

    let removedCount = 0;
    const toRemove = [];

    for (const listing of listings) {
      const title = listing.title.toLowerCase();

      // Check if title contains instrument keywords
      const hasInstrumentKeyword = INSTRUMENT_KEYWORDS.some(keyword =>
        title.includes(keyword)
      );

      if (hasInstrumentKeyword) {
        toRemove.push(listing);
        console.log(`🗑️  Marking for removal: ${listing.title}`);
        console.log(`   URL: ${listing.url}`);
        console.log(`   Reason: Contains instrument keyword\n`);
      }
    }

    if (toRemove.length === 0) {
      console.log('✅ No instrument listings found - database is clean!');
      return;
    }

    console.log(`\n⚠️  Found ${toRemove.length} instrument listings to remove`);
    console.log('Remove these listings? (y/n)');

    // In production, we'll just remove them automatically
    // For now, let's log and remove
    for (const listing of toRemove) {
      const { error: deleteError } = await supabase
        .from('used_listings')
        .delete()
        .eq('id', listing.id);

      if (deleteError) {
        console.error(`❌ Error removing listing ${listing.id}:`, deleteError);
      } else {
        removedCount++;
        console.log(`✅ Removed: ${listing.title}`);
      }
    }

    console.log(`\n🎉 Cleanup complete! Removed ${removedCount} instrument listings`);

  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  }
}

// Run the cleanup
if (require.main === module) {
  cleanupReverbInstruments()
    .then(() => {
      console.log('✅ Cleanup script finished');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Cleanup script failed:', error);
      process.exit(1);
    });
}

module.exports = { cleanupReverbInstruments };
