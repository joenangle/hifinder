/**
 * Component Candidate Cleanup Script
 *
 * Cleans existing component candidates in the database by:
 * 1. Identifying contaminated data (payment methods, shipping terms, etc.)
 * 2. Attempting to fix using improved extraction logic
 * 3. Updating fixable candidates or deleting unfixable ones
 *
 * Usage:
 *   node scripts/cleanup-component-candidates.js --dry-run    # Preview changes
 *   node scripts/cleanup-component-candidates.js --execute    # Apply changes
 *   node scripts/cleanup-component-candidates.js --execute --status=rejected  # Only rejected
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const {
  extractBrand,
  extractModel,
  extractRedditHaveSection,
  inferCategory,
  calculateQualityScore
} = require('./component-candidate-extractor');

// Connect to database
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Check if text contains payment method contamination
 */
function hasPaymentContamination(text) {
  if (!text) return false;
  const paymentPattern = /\b(paypal|venmo|zelle|g&s|g&amp;s|cashapp|cash app|f&f|f&amp;f)\b/i;
  return paymentPattern.test(text);
}

/**
 * Check if text contains shipping term contamination
 */
function hasShippingContamination(text) {
  if (!text) return false;
  const shippingPattern = /\b(shipped|shipping|usps|ups|fedex|priority|conus)\b/i;
  return shippingPattern.test(text);
}

/**
 * Check if text contains location code contamination
 */
function hasLocationContamination(text) {
  if (!text) return false;
  const locationPattern = /\b(USA?-[A-Z]{2})\b/i;
  return locationPattern.test(text);
}

/**
 * Check if brand/model extraction is clean
 */
function isCleanExtraction(brand, model) {
  if (!brand || !model) return false;

  const brandClean = !hasPaymentContamination(brand) &&
                     !hasShippingContamination(brand) &&
                     !hasLocationContamination(brand);

  const modelClean = !hasPaymentContamination(model) &&
                     !hasShippingContamination(model) &&
                     !hasLocationContamination(model);

  return brandClean && modelClean;
}

/**
 * Attempt to fix a contaminated candidate
 */
async function attemptFix(candidate) {
  // Try to get original listing title from trigger_listing_ids
  let originalTitle = null;

  if (candidate.trigger_listing_ids && candidate.trigger_listing_ids.length > 0) {
    const { data: listing } = await supabase
      .from('used_listings')
      .select('title')
      .eq('id', candidate.trigger_listing_ids[0])
      .single();

    if (listing) {
      originalTitle = listing.title;
    }
  }

  // If we have the original title, re-extract from scratch
  if (originalTitle) {
    const newBrand = extractBrand(originalTitle);
    const newModel = newBrand ? extractModel(originalTitle, newBrand) : null;

    if (newBrand && newModel && isCleanExtraction(newBrand, newModel)) {
      return {
        brand: newBrand,
        model: newModel,
        category: inferCategory(originalTitle),
        quality_score: calculateQualityScore({
          ...candidate,
          brand: newBrand,
          model: newModel,
          category: inferCategory(originalTitle)
        })
      };
    }
  }

  // Fallback: Try to clean the existing model field
  const cleanModel = extractModel(candidate.model || '', candidate.brand);

  if (cleanModel && isCleanExtraction(candidate.brand, cleanModel)) {
    return {
      brand: candidate.brand,
      model: cleanModel,
      category: candidate.category,
      quality_score: calculateQualityScore({
        ...candidate,
        model: cleanModel
      })
    };
  }

  // Unfixable
  return null;
}

/**
 * Main cleanup function
 */
async function cleanupCandidates(options = {}) {
  const { dryRun = true, status = 'all' } = options;

  console.log('\n🧹 Component Candidate Cleanup Script\n');
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (preview only)' : '⚠️  EXECUTE (will modify database)'}`);
  console.log(`Status filter: ${status}\n`);

  // Fetch candidates
  let query = supabase
    .from('new_component_candidates')
    .select('*');

  if (status !== 'all') {
    query = query.eq('status', status);
  } else {
    query = query.in('status', ['pending', 'rejected']);
  }

  const { data: candidates, error } = await query;

  if (error) {
    console.error('❌ Error fetching candidates:', error);
    return;
  }

  console.log(`Found ${candidates.length} candidates to review\n`);

  const stats = {
    total: candidates.length,
    fixed: 0,
    deleted: 0,
    unchanged: 0,
    errors: 0
  };

  const fixedCandidates = [];
  const deletedCandidates = [];

  // Process each candidate
  for (const candidate of candidates) {
    const { id, brand, model } = candidate;

    // Check if currently contaminated
    const currentlyClean = isCleanExtraction(brand, model);

    if (currentlyClean) {
      stats.unchanged++;
      console.log(`✅ ${brand} ${model} - Already clean`);
      continue;
    }

    // Attempt to fix
    const fixed = await attemptFix(candidate);

    if (fixed && isCleanExtraction(fixed.brand, fixed.model)) {
      // Success - can be fixed
      stats.fixed++;
      console.log(`🔧 ${brand} ${model} → ${fixed.brand} ${fixed.model}`);
      fixedCandidates.push({ id, ...fixed });

      if (!dryRun) {
        const { error: updateError } = await supabase
          .from('new_component_candidates')
          .update({
            brand: fixed.brand,
            model: fixed.model,
            category: fixed.category,
            quality_score: fixed.quality_score,
            updated_at: new Date().toISOString()
          })
          .eq('id', id);

        if (updateError) {
          console.error(`  ❌ Error updating candidate ${id}:`, updateError.message);
          stats.errors++;
        }
      }
    } else {
      // Unfixable - mark for deletion
      stats.deleted++;
      console.log(`❌ ${brand} ${model} - Unfixable, will delete`);
      deletedCandidates.push({ id, brand, model });

      if (!dryRun) {
        const { error: deleteError } = await supabase
          .from('new_component_candidates')
          .delete()
          .eq('id', id);

        if (deleteError) {
          console.error(`  ❌ Error deleting candidate ${id}:`, deleteError.message);
          stats.errors++;
        }
      }
    }
  }

  // Print summary
  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Cleanup Summary');
  console.log(`${'='.repeat(60)}`);
  console.log(`Total candidates reviewed: ${stats.total}`);
  console.log(`✅ Already clean (unchanged): ${stats.unchanged}`);
  console.log(`🔧 Fixed: ${stats.fixed}`);
  console.log(`❌ Deleted (unfixable): ${stats.deleted}`);
  if (stats.errors > 0) {
    console.log(`⚠️  Errors: ${stats.errors}`);
  }
  console.log(`${'='.repeat(60)}\n`);

  if (dryRun) {
    console.log('⚠️  DRY RUN - No changes were made to the database');
    console.log('Run with --execute to apply changes\n');

    // Show preview of changes
    if (fixedCandidates.length > 0) {
      console.log('\n📝 Preview of candidates that would be fixed:');
      fixedCandidates.slice(0, 10).forEach(c => {
        console.log(`  • ${c.brand} ${c.model}`);
      });
      if (fixedCandidates.length > 10) {
        console.log(`  ... and ${fixedCandidates.length - 10} more`);
      }
    }

    if (deletedCandidates.length > 0) {
      console.log('\n🗑️  Preview of candidates that would be deleted:');
      deletedCandidates.slice(0, 10).forEach(c => {
        console.log(`  • ${c.brand} ${c.model}`);
      });
      if (deletedCandidates.length > 10) {
        console.log(`  ... and ${deletedCandidates.length - 10} more`);
      }
    }
  } else {
    console.log('✅ Database updated successfully!\n');
  }

  return stats;
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');
const statusArg = args.find(arg => arg.startsWith('--status='));
const status = statusArg ? statusArg.split('=')[1] : 'all';

// Run cleanup
cleanupCandidates({ dryRun, status })
  .then(stats => {
    console.log('Done!');
    process.exit(0);
  })
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
