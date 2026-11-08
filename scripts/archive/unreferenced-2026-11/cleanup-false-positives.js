#!/usr/bin/env node
/**
 * Cleanup False Positives
 *
 * Deletes listings with severe mismatches:
 * - Price >500% of component MSRP (likely wrong component)
 * - Category keyword conflicts
 * - Generic name matches with no strong evidence
 *
 * SAFETY FEATURES:
 * - Dry-run mode by default (shows what would be deleted)
 * - --execute flag required for actual deletion
 * - Exports backup JSON before deletion
 *
 * Usage:
 *   node scripts/cleanup-false-positives.js              # Dry run
 *   node scripts/cleanup-false-positives.js --execute    # Actually delete
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const EXECUTE_MODE = process.argv.includes('--execute');

// Generic words that often cause false matches
const GENERIC_WORDS = [
  'space', 'audio', 'pro', 'lite', 'plus', 'mini', 'max', 'ultra'
];

/**
 * Check if component name is too generic
 */
function isTooGeneric(brand, name) {
  const brandWords = brand.toLowerCase().split(/\s+/);
  const nameWords = name.toLowerCase().split(/\s+/);

  const brandGenericCount = brandWords.filter(w => GENERIC_WORDS.includes(w)).length;
  const nameGenericCount = nameWords.filter(w => GENERIC_WORDS.includes(w)).length;

  // Very generic if 2+ generic words total
  return (brandGenericCount + nameGenericCount) >= 2;
}

/**
 * Check if listing has strong text evidence for match
 */
function hasStrongEvidence(title, brand, name) {
  const text = title.toLowerCase();
  const brandLower = brand.toLowerCase();
  const nameLower = name.toLowerCase();

  // Strong evidence: Both brand AND full model name in title
  return text.includes(brandLower) && text.includes(nameLower);
}

/**
 * Check for category conflicts
 */
function hasCategoryConflict(title, category) {
  const text = title.toLowerCase();

  const conflicts = {
    cans: ['\\biem\\b', '\\biems\\b'],
    iems: ['\\bheadphone\\b', '\\bheadphones\\b'],
    dacs: ['\\bamp\\b', '\\bamplifier\\b'],
    amps: ['\\bdac\\b']
  };

  const exceptions = ['dac/amp', 'dac amp', 'combo'];
  if (exceptions.some(exc => text.includes(exc))) return false;

  const conflictKeywords = conflicts[category] || [];
  for (const keyword of conflictKeywords) {
    if (new RegExp(keyword, 'i').test(text)) return true;
  }

  return false;
}

/**
 * Determine if listing should be deleted
 */
function shouldDelete(listing, component) {
  const reasons = [];

  // Rule 1: Severe price mismatch (>500% of MSRP)
  if (listing.price && component.price_new) {
    const priceRatio = listing.price / component.price_new;
    if (priceRatio > 5.0) {
      reasons.push(`Price ${(priceRatio * 100).toFixed(0)}% of MSRP ($${listing.price} vs $${component.price_new})`);
    }
  }

  // Rule 2: Category keyword conflict
  if (hasCategoryConflict(listing.title, component.category)) {
    reasons.push(`Category conflict (${component.category})`);
  }

  // Rule 3: Generic name + no strong evidence
  if (isTooGeneric(component.brand, component.name)) {
    if (!hasStrongEvidence(listing.title, component.brand, component.name)) {
      reasons.push(`Generic name without strong evidence`);
    }
  }

  return reasons;
}

/**
 * Main cleanup function
 */
async function cleanupFalsePositives() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   FALSE POSITIVE CLEANUP                   ║');
  console.log(EXECUTE_MODE ? '║   MODE: EXECUTE (will delete)              ║' : '║   MODE: DRY RUN (preview only)             ║');
  console.log('╚════════════════════════════════════════════╝\n');

  // Fetch all listings with component data
  const { data: listings, error } = await supabase
    .from('used_listings')
    .select(`
      *,
      component:components(*)
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching listings:', error.message);
    process.exit(1);
  }

  console.log(`📊 Analyzing ${listings.length} listings...\n`);

  const toDelete = [];

  for (const listing of listings) {
    const component = listing.component;
    if (!component) continue;

    const deleteReasons = shouldDelete(listing, component);

    if (deleteReasons.length > 0) {
      toDelete.push({
        listing_id: listing.id,
        url: listing.url,
        title: listing.title,
        component_name: `${component.brand} ${component.name}`,
        reasons: deleteReasons
      });
    }
  }

  // Show what would be deleted
  console.log('═'.repeat(60));
  console.log(`LISTINGS FLAGGED FOR DELETION: ${toDelete.length}`);
  console.log('═'.repeat(60) + '\n');

  if (toDelete.length === 0) {
    console.log('✅ No listings flagged for deletion.\n');
    return;
  }

  // Show first 10 examples
  console.log('Examples (showing first 10):');
  toDelete.slice(0, 10).forEach((item, i) => {
    console.log(`\n${i + 1}. ${item.component_name}`);
    console.log(`   Title: "${item.title.substring(0, 60)}..."`);
    console.log(`   Reasons:`);
    item.reasons.forEach(reason => console.log(`     • ${reason}`));
    console.log(`   URL: ${item.url}`);
  });

  if (toDelete.length > 10) {
    console.log(`\n   ... and ${toDelete.length - 10} more`);
  }

  console.log('\n' + '═'.repeat(60));

  if (!EXECUTE_MODE) {
    console.log('🔵 DRY RUN MODE - No changes made');
    console.log('   Run with --execute to actually delete these listings');
    console.log('═'.repeat(60) + '\n');
    return;
  }

  // Export backup before deletion
  console.log('\n📦 Creating backup before deletion...');
  const timestamp = new Date().toISOString().split('T')[0];
  const backupFilename = `backup-deleted-listings-${timestamp}.json`;

  fs.writeFileSync(backupFilename, JSON.stringify(toDelete, null, 2));
  console.log(`✅ Backup saved: ${backupFilename}\n`);

  // Execute deletion
  console.log('🔴 EXECUTING DELETION...\n');

  let deleted = 0;
  let failed = 0;

  for (const item of toDelete) {
    const { error: deleteError } = await supabase
      .from('used_listings')
      .delete()
      .eq('id', item.listing_id);

    if (deleteError) {
      console.error(`❌ Failed to delete ${item.listing_id}:`, deleteError.message);
      failed++;
    } else {
      deleted++;
      if (deleted % 10 === 0) {
        console.log(`   Deleted ${deleted}/${toDelete.length}...`);
      }
    }
  }

  console.log('\n' + '═'.repeat(60));
  console.log('CLEANUP COMPLETE');
  console.log('═'.repeat(60));
  console.log(`✅ Deleted: ${deleted}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📦 Backup: ${backupFilename}`);
  console.log('═'.repeat(60) + '\n');
}

// Run cleanup
cleanupFalsePositives().catch(error => {
  console.error('Cleanup failed:', error);
  process.exit(1);
});
