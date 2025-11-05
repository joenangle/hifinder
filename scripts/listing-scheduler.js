/**
 * Automated Listing Aggregation Scheduler
 *
 * Coordinates scraping from Reddit, eBay, and other sources on a regular schedule
 * Handles data validation, duplicate detection, and long-term archiving
 */

const { createClient } = require('@supabase/supabase-js');
const { scrapeRedditListings } = require('./reddit-avexchange-scraper');
// NOTE: eBay integration removed - using affiliate-only strategy (see docs/EBAY_AFFILIATE_STRATEGY.md)
// const { scrapeEbayListings } = require('./ebay-integration');
const { findComponentMatch } = require('./component-matcher');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Main aggregation function - runs all scrapers and processes results
 */
async function runListingAggregation() {
  const startTime = Date.now();
  console.log('🚀 Starting automated listing aggregation...');

  const stats = {
    reddit: { total: 0, new: 0, errors: 0 },
    // ebay: { total: 0, new: 0, errors: 0 }, // Removed - affiliate-only
    duplicates: 0,
    archived: 0,
    startTime: new Date().toISOString()
  };

  try {
    // Phase 1: Scrape Reddit r/AVexchange
    console.log('\n📱 Phase 1: Reddit r/AVexchange scraping...');
    try {
      await scrapeRedditListings();
      console.log('✅ Reddit scraping completed');
    } catch (error) {
      console.error('❌ Reddit scraping failed:', error);
      stats.reddit.errors++;
    }

    // Phase 2: eBay (DEPRECATED - affiliate-only strategy)
    // NOTE: eBay listing scraping is prohibited by their TOS
    // We use affiliate links instead (see docs/EBAY_AFFILIATE_STRATEGY.md)
    /*
    console.log('\n🛒 Phase 2: eBay marketplace scraping...');
    try {
      await scrapeEbayListings();
      console.log('✅ eBay scraping completed');
    } catch (error) {
      console.error('❌ eBay scraping failed:', error);
      stats.ebay.errors++;
    }
    */

    // Phase 3: Data validation and cleanup
    console.log('\n🧹 Phase 3: Data validation and cleanup...');
    await validateAndCleanupListings();

    // Phase 4: Duplicate detection
    console.log('\n🔍 Phase 4: Duplicate detection...');
    stats.duplicates = await detectAndRemoveDuplicates();

    // Phase 5: Archive old listings
    console.log('\n📦 Phase 5: Archiving old listings...');
    stats.archived = await archiveOldListings();

    // Phase 6: Update statistics
    console.log('\n📊 Phase 6: Updating statistics...');
    await updateAggregationStats(stats);

    const duration = Date.now() - startTime;
    console.log(`\n🎉 Listing aggregation completed in ${duration}ms`);
    console.log(`📈 Summary: ${stats.reddit.new + stats.ebay.new} new listings, ${stats.duplicates} duplicates removed, ${stats.archived} archived`);

    return stats;

  } catch (error) {
    console.error('💥 Fatal error in listing aggregation:', error);
    await logError('AGGREGATION_FATAL', error, stats);
    throw error;
  }
}

/**
 * Validate and cleanup newly scraped listings
 */
async function validateAndCleanupListings() {
  try {
    // Get recent listings that need validation
    const { data: listings, error } = await supabase
      .from('used_listings')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24 hours
      .eq('is_active', true);

    if (error) throw error;

    console.log(`🔍 Validating ${listings.length} recent listings...`);

    let validatedCount = 0;
    let invalidatedCount = 0;

    for (const listing of listings) {
      try {
        // Re-validate price if component info available
        if (listing.component_id) {
          const { data: component } = await supabase
            .from('components')
            .select('*')
            .eq('id', listing.component_id)
            .single();

          if (component) {
            const priceValidation = validateListingPrice(listing.price, component);

            if (priceValidation.needsUpdate) {
              await supabase
                .from('used_listings')
                .update({
                  price_is_reasonable: priceValidation.valid,
                  price_variance_percentage: priceValidation.variance,
                  price_warning: priceValidation.warning,
                  updated_at: new Date().toISOString()
                })
                .eq('id', listing.id);
            }
          }
        }

        // Validate URL accessibility (sample check)
        if (Math.random() < 0.1) { // Check 10% of listings
          const isAccessible = await checkUrlAccessibility(listing.url);
          if (!isAccessible) {
            await supabase
              .from('used_listings')
              .update({
                is_active: false,
                updated_at: new Date().toISOString()
              })
              .eq('id', listing.id);
            invalidatedCount++;
          }
        }

        validatedCount++;
      } catch (error) {
        console.error(`❌ Error validating listing ${listing.id}:`, error);
      }
    }

    console.log(`✅ Validated ${validatedCount} listings, deactivated ${invalidatedCount} inaccessible`);

  } catch (error) {
    console.error('❌ Validation failed:', error);
  }
}

/**
 * Detect and remove duplicate listings
 */
async function detectAndRemoveDuplicates() {
  try {
    // Find potential duplicates by URL
    const { data: urlDuplicates, error: urlError } = await supabase
      .rpc('find_duplicate_listings_by_url');

    if (urlError) throw urlError;

    let duplicatesRemoved = 0;

    // Remove URL duplicates (keep the newest)
    for (const duplicate of urlDuplicates || []) {
      if (duplicate.count > 1) {
        const { error: deleteError } = await supabase
          .from('used_listings')
          .delete()
          .eq('url', duplicate.url)
          .lt('created_at', duplicate.newest_created_at);

        if (!deleteError) {
          duplicatesRemoved += duplicate.count - 1;
        }
      }
    }

    // Find potential duplicates by similar content
    const { data: contentDuplicates, error: contentError } = await supabase
      .rpc('find_similar_listings');

    if (contentError) throw contentError;

    // Process content-based duplicates (more conservative)
    for (const similar of contentDuplicates || []) {
      const similarity = calculateListingSimilarity(similar.listing1, similar.listing2);

      if (similarity > 0.9) { // Very high similarity threshold
        // Keep the one with better seller reputation or newer date
        const keepListing = chooseBetterListing(similar.listing1, similar.listing2);
        const removeListing = keepListing.id === similar.listing1.id ? similar.listing2 : similar.listing1;

        await supabase
          .from('used_listings')
          .delete()
          .eq('id', removeListing.id);

        duplicatesRemoved++;
      }
    }

    console.log(`🗑️ Removed ${duplicatesRemoved} duplicate listings`);
    return duplicatesRemoved;

  } catch (error) {
    console.error('❌ Duplicate detection failed:', error);
    return 0;
  }
}

/**
 * Archive old listings for data retention
 */
async function archiveOldListings() {
  try {
    const archiveDate = new Date();
    archiveDate.setDate(archiveDate.getDate() - 30); // Archive listings older than 30 days

    // Move old listings to archive table
    const { data: oldListings, error: selectError } = await supabase
      .from('used_listings')
      .select('*')
      .lt('date_posted', archiveDate.toISOString())
      .eq('is_active', true);

    if (selectError) throw selectError;

    let archivedCount = 0;

    for (const listing of oldListings || []) {
      try {
        // Insert into archive table
        const { error: archiveError } = await supabase
          .from('used_listings_archive')
          .insert({
            ...listing,
            archived_at: new Date().toISOString()
          });

        if (!archiveError) {
          // Mark as inactive in main table
          await supabase
            .from('used_listings')
            .update({
              is_active: false,
              updated_at: new Date().toISOString()
            })
            .eq('id', listing.id);

          archivedCount++;
        }
      } catch (error) {
        console.error(`❌ Error archiving listing ${listing.id}:`, error);
      }
    }

    console.log(`📦 Archived ${archivedCount} old listings`);
    return archivedCount;

  } catch (error) {
    console.error('❌ Archiving failed:', error);
    return 0;
  }
}

/**
 * Update aggregation statistics
 */
async function updateAggregationStats(stats) {
  try {
    const statsRecord = {
      run_date: stats.startTime,
      reddit_total: stats.reddit.total,
      reddit_new: stats.reddit.new,
      reddit_errors: stats.reddit.errors,
      ebay_total: stats.ebay.total,
      ebay_new: stats.ebay.new,
      ebay_errors: stats.ebay.errors,
      duplicates_removed: stats.duplicates,
      listings_archived: stats.archived,
      duration_ms: Date.now() - new Date(stats.startTime).getTime(),
      created_at: new Date().toISOString()
    };

    const { error } = await supabase
      .from('aggregation_stats')
      .insert(statsRecord);

    if (error) throw error;

    console.log('📊 Statistics updated successfully');

  } catch (error) {
    console.error('❌ Failed to update statistics:', error);
  }
}

/**
 * Helper functions
 */

function validateListingPrice(price, component) {
  if (!component.price_used_min || !component.price_used_max) {
    return { valid: true, needsUpdate: false };
  }

  const expectedMin = component.price_used_min;
  const expectedMax = component.price_used_max;
  const expectedAvg = (expectedMin + expectedMax) / 2;
  const variance = Math.round(((price - expectedAvg) / expectedAvg) * 100);

  let valid = true;
  let warning = null;

  if (price < expectedMin * 0.2) {
    valid = false;
    warning = 'Price unusually low - verify authenticity';
  } else if (price > expectedMax * 3) {
    valid = false;
    warning = 'Price significantly above market value';
  } else if (variance < -50) {
    warning = 'Excellent deal - verify condition and seller';
  } else if (variance > 100) {
    warning = 'Above typical range - may include extras';
  }

  return {
    valid,
    variance,
    warning,
    needsUpdate: true
  };
}

async function checkUrlAccessibility(url) {
  try {
    // Skip demo URLs
    if (url.includes('/sample') || url.includes('example.com')) {
      return true;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}

function calculateListingSimilarity(listing1, listing2) {
  let similarity = 0;

  // Same component
  if (listing1.component_id === listing2.component_id) similarity += 0.3;

  // Similar price (within 10%)
  const priceDiff = Math.abs(listing1.price - listing2.price) / Math.max(listing1.price, listing2.price);
  if (priceDiff < 0.1) similarity += 0.2;

  // Same condition
  if (listing1.condition === listing2.condition) similarity += 0.1;

  // Same seller
  if (listing1.seller_username === listing2.seller_username) similarity += 0.2;

  // Similar title (basic check)
  const title1Words = listing1.title.toLowerCase().split(' ');
  const title2Words = listing2.title.toLowerCase().split(' ');
  const commonWords = title1Words.filter(word => title2Words.includes(word));
  const titleSimilarity = commonWords.length / Math.max(title1Words.length, title2Words.length);
  similarity += titleSimilarity * 0.2;

  return similarity;
}

function chooseBetterListing(listing1, listing2) {
  // Prefer listing with higher seller reputation
  const rep1 = listing1.seller_confirmed_trades || listing1.seller_feedback_score || 0;
  const rep2 = listing2.seller_confirmed_trades || listing2.seller_feedback_score || 0;

  if (rep1 !== rep2) {
    return rep1 > rep2 ? listing1 : listing2;
  }

  // Prefer newer listing
  return new Date(listing1.created_at) > new Date(listing2.created_at) ? listing1 : listing2;
}

async function logError(type, error, context = {}) {
  try {
    await supabase
      .from('aggregation_errors')
      .insert({
        error_type: type,
        error_message: error.message,
        error_stack: error.stack,
        context: JSON.stringify(context),
        created_at: new Date().toISOString()
      });
  } catch (logError) {
    console.error('Failed to log error:', logError);
  }
}

// Export for use in other modules
module.exports = {
  runListingAggregation
};

// Run immediately if called directly
if (require.main === module) {
  runListingAggregation()
    .then(() => {
      console.log('✅ Aggregation completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Aggregation failed:', error);
      process.exit(1);
    });
}