#!/usr/bin/env node
/**
 * Re-validate Existing Listings
 *
 * Applies new matching and validation logic to existing listings:
 * - Re-calculates match_confidence using current matcher
 * - Applies validation checks (price, category, genericness)
 * - Detects ambiguity (close alternate matches)
 * - Re-extracts failed prices
 * - Populates metadata columns
 *
 * Safety: Dry-run mode by default, batch processing, progress tracking
 *
 * Usage:
 *   node scripts/revalidate-existing-listings.js                # Dry run
 *   node scripts/revalidate-existing-listings.js --execute      # Actually update
 *   node scripts/revalidate-existing-listings.js --limit=100    # Test on 100 listings
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { findComponentMatch } = require('./component-matcher-enhanced');
const { validateListing } = require('./validators/listing-validator');

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
const BATCH_SIZE = 100;

/**
 * Re-extract price from title/description using improved logic
 */
function extractPrice(title, selftext = '') {
  const combinedText = title + ' ' + (selftext || '');

  // Priority 1: Dollar sign patterns ($550, $1,200)
  const dollarPattern = /\$(\d{1,5}(?:,\d{3})*(?:\.\d{2})?)/g;
  const dollarMatches = Array.from(combinedText.matchAll(dollarPattern))
    .map(m => ({ price: parseFloat(m[1].replace(/,/g, '')), priority: 1 }));

  // Priority 2: Asking price patterns
  const askingPattern = /\b(?:asking|price:?|selling\s*(?:for|at)?)\s*\$?(\d{1,5}(?:,\d{3})*)/gi;
  const askingMatches = Array.from(combinedText.matchAll(askingPattern))
    .map(m => ({ price: parseFloat(m[1].replace(/,/g, '')), priority: 2 }));

  // Priority 3: Shipped/OBO patterns
  const shippedPattern = /\b(\d{3,5})\s*(?:shipped|obo|or best offer|firm)\b/gi;
  const shippedMatches = Array.from(combinedText.matchAll(shippedPattern))
    .map(m => ({ price: parseFloat(m[1]), priority: 3 }));

  // Priority 4: Currency patterns (USD, dollars)
  const currencyPattern = /\b(\d{3,5})\s*(?:usd|dollars?)\b/gi;
  const currencyMatches = Array.from(combinedText.matchAll(currencyPattern))
    .map(m => ({ price: parseFloat(m[1]), priority: 4 }));

  // Combine all matches
  const allMatches = [...dollarMatches, ...askingMatches, ...shippedMatches, ...currencyMatches];

  if (allMatches.length === 0) return null;

  // Sort by priority, then by lowest price
  allMatches.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return a.price - b.price;
  });

  const price = allMatches[0].price;

  // Validate range ($10 - $10,000)
  if (price < 10 || price > 10000) return null;

  return Math.round(price);
}

/**
 * Check for ambiguous matches (top 2 candidates within 0.15)
 */
async function checkAmbiguity(title, description, currentComponentId) {
  try {
    const match = await findComponentMatch(title, description || '', 'retroactive');

    if (match && match.isAmbiguous) {
      return {
        isAmbiguous: true,
        alternatives: match.ambiguousOptions || []
      };
    }

    return { isAmbiguous: false };
  } catch (error) {
    console.error('  Error checking ambiguity:', error.message);
    return { isAmbiguous: false };
  }
}

/**
 * Re-validate a single listing
 */
async function revalidateListing(listing) {
  const result = {
    id: listing.id,
    match_confidence: null,
    requires_manual_review: false,
    validation_warnings: [],
    is_ambiguous: false,
    new_price: null
  };

  try {
    // 1. Re-calculate match score
    const match = await findComponentMatch(
      listing.title,
      listing.description || '',
      listing.source || 'unknown'
    );

    if (match) {
      result.match_confidence = match.score;
      result.is_ambiguous = match.isAmbiguous || false;
    } else {
      result.match_confidence = 0.0;
      result.validation_warnings.push('No match found with current logic');
      result.requires_manual_review = true;
    }

    // 2. Apply validation checks
    if (listing.component) {
      const validation = validateListing(listing, listing.component, result.match_confidence);

      if (validation.shouldFlag || validation.shouldReject) {
        result.requires_manual_review = true;
      }

      // Collect validation warnings
      Object.values(validation.validations).forEach(v => {
        if (v.reason) {
          result.validation_warnings.push(v.reason);
        }
      });
    }

    // 3. Re-extract price if missing
    if (!listing.price || listing.price === 0) {
      const newPrice = extractPrice(listing.title, listing.description);
      if (newPrice) {
        result.new_price = newPrice;
      }
    }

    // 4. Flag low confidence
    if (result.match_confidence < 0.5) {
      result.requires_manual_review = true;
      result.validation_warnings.push(`Low confidence: ${result.match_confidence.toFixed(2)}`);
    }

  } catch (error) {
    console.error(`  Error re-validating listing ${listing.id}:`, error.message);
    result.validation_warnings.push(`Processing error: ${error.message}`);
    result.requires_manual_review = true;
  }

  return result;
}

/**
 * Update database with re-validation results
 */
async function updateBatch(updates) {
  const results = {
    updated: 0,
    failed: 0
  };

  for (const update of updates) {
    try {
      const updateData = {
        match_confidence: update.match_confidence,
        requires_manual_review: update.requires_manual_review,
        validation_warnings: update.validation_warnings.length > 0 ? update.validation_warnings : null,
        is_ambiguous: update.is_ambiguous
      };

      // Add price if re-extracted
      if (update.new_price) {
        updateData.price = update.new_price;
      }

      const { error } = await supabase
        .from('used_listings')
        .update(updateData)
        .eq('id', update.id);

      if (error) {
        console.error(`  ❌ Failed to update ${update.id}:`, error.message);
        results.failed++;
      } else {
        results.updated++;
      }
    } catch (error) {
      console.error(`  ❌ Error updating ${update.id}:`, error);
      results.failed++;
    }
  }

  return results;
}

/**
 * Main re-validation function
 */
async function revalidateAllListings() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   RE-VALIDATE EXISTING LISTINGS            ║');
  console.log(EXECUTE_MODE ? '║   MODE: EXECUTE (will update database)     ║' : '║   MODE: DRY RUN (preview only)             ║');
  console.log('╚════════════════════════════════════════════╝\n');

  // Fetch all available listings
  let query = supabase
    .from('used_listings')
    .select(`
      *,
      component:components(*)
    `)
    .eq('status', 'available')
    .order('created_at', { ascending: false });

  if (LIMIT) {
    query = query.limit(parseInt(LIMIT));
    console.log(`⚠️  Testing mode: Processing only ${LIMIT} listings\n`);
  }

  const { data: listings, error } = await query;

  if (error) {
    console.error('❌ Error fetching listings:', error.message);
    process.exit(1);
  }

  console.log(`📊 Found ${listings.length} listings to re-validate\n`);
  console.log('Processing in batches of', BATCH_SIZE, '...\n');

  const stats = {
    total: listings.length,
    processed: 0,
    flagged: 0,
    ambiguous: 0,
    pricesRecovered: 0,
    lowConfidence: 0,
    avgConfidence: 0
  };

  const updates = [];
  let batchNumber = 1;

  for (let i = 0; i < listings.length; i++) {
    const listing = listings[i];

    // Progress indicator
    if (i > 0 && i % 10 === 0) {
      process.stdout.write(`\rProcessed ${i}/${listings.length} (${((i / listings.length) * 100).toFixed(1)}%)`);
    }

    const result = await revalidateListing(listing);
    updates.push(result);

    // Track stats
    stats.processed++;
    if (result.requires_manual_review) stats.flagged++;
    if (result.is_ambiguous) stats.ambiguous++;
    if (result.new_price) stats.pricesRecovered++;
    if (result.match_confidence < 0.5) stats.lowConfidence++;
    stats.avgConfidence += result.match_confidence || 0;

    // Process batch
    if (updates.length >= BATCH_SIZE || i === listings.length - 1) {
      console.log(`\n\nBatch ${batchNumber}: ${updates.length} listings`);

      if (EXECUTE_MODE) {
        const batchResults = await updateBatch(updates);
        console.log(`  Updated: ${batchResults.updated}, Failed: ${batchResults.failed}`);
      } else {
        console.log('  (Dry run - no database changes)');
        // Show sample
        if (batchNumber === 1) {
          console.log('\n  Sample results:');
          updates.slice(0, 3).forEach(u => {
            console.log(`    - Confidence: ${u.match_confidence?.toFixed(2) || 'N/A'}, ` +
                       `Flagged: ${u.requires_manual_review}, ` +
                       `Warnings: ${u.validation_warnings.length}`);
          });
        }
      }

      updates.length = 0;
      batchNumber++;
    }
  }

  // Calculate average confidence
  stats.avgConfidence = stats.total > 0 ? stats.avgConfidence / stats.total : 0;

  // Final summary
  console.log('\n\n' + '═'.repeat(60));
  console.log('RE-VALIDATION COMPLETE');
  console.log('═'.repeat(60));
  console.log('');
  console.log(`Total processed:       ${stats.total}`);
  console.log(`Average confidence:    ${stats.avgConfidence.toFixed(2)}`);
  console.log(`Flagged for review:    ${stats.flagged} (${((stats.flagged / stats.total) * 100).toFixed(1)}%)`);
  console.log(`Ambiguous matches:     ${stats.ambiguous} (${((stats.ambiguous / stats.total) * 100).toFixed(1)}%)`);
  console.log(`Low confidence (<0.5): ${stats.lowConfidence} (${((stats.lowConfidence / stats.total) * 100).toFixed(1)}%)`);
  console.log(`Prices recovered:      ${stats.pricesRecovered}`);
  console.log('');

  if (!EXECUTE_MODE) {
    console.log('🔵 DRY RUN MODE - No database changes made');
    console.log('   Run with --execute to apply updates');
  } else {
    console.log('✅ Database updated successfully');
  }

  console.log('');
}

// Run re-validation
revalidateAllListings().catch(error => {
  console.error('\nRe-validation failed:', error);
  process.exit(1);
});
