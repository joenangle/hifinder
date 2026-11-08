#!/usr/bin/env node
/**
 * Mismatch Detection Script
 *
 * Scans existing used_listings for potential false positives:
 * - Severe price mismatches (>300% or <20% of component MSRP)
 * - Category keyword conflicts
 * - Generic name matches
 * - Price extraction failures ($0 price)
 *
 * Usage:
 *   node scripts/detect-listing-mismatches.js
 *   node scripts/detect-listing-mismatches.js --export
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

// Generic words that often cause false matches
const GENERIC_WORDS = [
  'space', 'audio', 'pro', 'lite', 'plus', 'mini', 'max', 'ultra',
  'one', 'two', 'three', 'air', 'go', 'se', 'ex', 'dx'
];

/**
 * Check if component name has generic words
 */
function hasGenericName(brand, name) {
  const brandWords = brand.toLowerCase().split(/\s+/);
  const nameWords = name.toLowerCase().split(/\s+/);

  const brandGenericCount = brandWords.filter(w => GENERIC_WORDS.includes(w)).length;
  const nameGenericCount = nameWords.filter(w => GENERIC_WORDS.includes(w)).length;

  return brandGenericCount >= 1 || nameGenericCount >= 2;
}

/**
 * Check for category keyword conflicts
 */
function hasCategoryConflict(title, category) {
  const text = title.toLowerCase();

  const conflicts = {
    cans: ['\\biem\\b', '\\biems\\b', 'in-ear', 'in ear'],
    iems: ['\\bheadphone\\b', '\\bheadphones\\b', 'over-ear', 'over ear'],
    dacs: ['\\bamp\\b', '\\bamplifier\\b'],
    amps: ['\\bdac\\b']
  };

  const exceptions = ['dac/amp', 'dac amp', 'combo'];
  const hasException = exceptions.some(exc => text.includes(exc));

  if (hasException) return false;

  const conflictKeywords = conflicts[category] || [];
  for (const keyword of conflictKeywords) {
    const regex = new RegExp(keyword, 'i');
    if (regex.test(text)) {
      return true;
    }
  }

  return false;
}

/**
 * Main detection function
 */
async function detectMismatches() {
  console.log('\n╔════════════════════════════════════════════╗');
  console.log('║   MISMATCH DETECTION SCAN                  ║');
  console.log('╚════════════════════════════════════════════╝\n');

  // Fetch all used listings with component data
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

  console.log(`📊 Scanning ${listings.length} listings...\n`);

  const issues = {
    severePriceOverprice: [],
    severeUnderpriced: [],
    categoryConflicts: [],
    genericNames: [],
    priceExtractionFailures: [],
    bundleIssues: []
  };

  for (const listing of listings) {
    const component = listing.component;
    if (!component) continue; // Skip if component deleted

    // 1. Price mismatch detection
    if (listing.price && component.price_new) {
      const priceRatio = listing.price / component.price_new;

      // Severe overprice (>300%)
      if (priceRatio > 3.0) {
        issues.severePriceOverprice.push({
          listing_id: listing.id,
          url: listing.url,
          title: listing.title,
          component_name: `${component.brand} ${component.name}`,
          listing_price: listing.price,
          msrp: component.price_new,
          ratio: `${(priceRatio * 100).toFixed(0)}%`,
          severity: 'HIGH'
        });
      }

      // Severely underpriced (<20% - likely accessory)
      if (priceRatio < 0.2) {
        issues.severeUnderpriced.push({
          listing_id: listing.id,
          url: listing.url,
          title: listing.title,
          component_name: `${component.brand} ${component.name}`,
          listing_price: listing.price,
          msrp: component.price_new,
          ratio: `${(priceRatio * 100).toFixed(0)}%`,
          severity: 'MEDIUM'
        });
      }
    }

    // 2. Price extraction failures
    if (!listing.price || listing.price === 0) {
      // Skip bundle components (expected to have null price)
      if (!listing.is_bundle || !listing.bundle_total_price) {
        issues.priceExtractionFailures.push({
          listing_id: listing.id,
          url: listing.url,
          title: listing.title,
          component_name: `${component.brand} ${component.name}`,
          severity: 'LOW'
        });
      }
    }

    // 3. Category conflicts
    if (hasCategoryConflict(listing.title, component.category)) {
      issues.categoryConflicts.push({
        listing_id: listing.id,
        url: listing.url,
        title: listing.title,
        component_name: `${component.brand} ${component.name}`,
        category: component.category,
        severity: 'HIGH'
      });
    }

    // 4. Generic name matches
    if (hasGenericName(component.brand, component.name)) {
      issues.genericNames.push({
        listing_id: listing.id,
        url: listing.url,
        title: listing.title,
        component_name: `${component.brand} ${component.name}`,
        brand: component.brand,
        model: component.name,
        severity: 'MEDIUM'
      });
    }

    // 5. Bundle consistency checks
    if (listing.is_bundle) {
      // Check if bundle_group_id exists
      if (!listing.bundle_group_id) {
        issues.bundleIssues.push({
          listing_id: listing.id,
          url: listing.url,
          title: listing.title,
          issue: 'Missing bundle_group_id',
          severity: 'LOW'
        });
      }

      // Check if bundle has total price
      if (!listing.bundle_total_price && !listing.price) {
        issues.bundleIssues.push({
          listing_id: listing.id,
          url: listing.url,
          title: listing.title,
          issue: 'No price (individual or bundle total)',
          severity: 'MEDIUM'
        });
      }
    }
  }

  // Print summary
  console.log('═'.repeat(60));
  console.log('DETECTION SUMMARY');
  console.log('═'.repeat(60) + '\n');

  console.log(`🔴 Severe Overpricing (>300%): ${issues.severePriceOverprice.length}`);
  if (issues.severePriceOverprice.length > 0) {
    console.log('   Top 5 worst cases:');
    issues.severePriceOverprice.slice(0, 5).forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.component_name}: $${item.listing_price} vs MSRP $${item.msrp} (${item.ratio})`);
      console.log(`      ${item.url}`);
    });
    console.log('');
  }

  console.log(`🟡 Severely Underpriced (<20%): ${issues.severeUnderpriced.length}`);
  if (issues.severeUnderpriced.length > 0 && issues.severeUnderpriced.length <= 5) {
    issues.severeUnderpriced.forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.component_name}: $${item.listing_price} vs MSRP $${item.msrp} (${item.ratio})`);
    });
    console.log('');
  }

  console.log(`🔴 Category Conflicts: ${issues.categoryConflicts.length}`);
  if (issues.categoryConflicts.length > 0 && issues.categoryConflicts.length <= 5) {
    issues.categoryConflicts.forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.component_name} (${item.category}): "${item.title.substring(0, 60)}..."`);
    });
    console.log('');
  }

  console.log(`🟡 Generic Name Matches: ${issues.genericNames.length}`);
  if (issues.genericNames.length > 0) {
    console.log(`   (${issues.genericNames.length} listings with generic component names)`);
    console.log('');
  }

  console.log(`🔵 Price Extraction Failures: ${issues.priceExtractionFailures.length}`);
  console.log(`🔵 Bundle Issues: ${issues.bundleIssues.length}`);

  console.log('\n' + '═'.repeat(60));
  const totalIssues =
    issues.severePriceOverprice.length +
    issues.categoryConflicts.length +
    issues.severeUnderpriced.length +
    issues.genericNames.length +
    issues.priceExtractionFailures.length +
    issues.bundleIssues.length;

  console.log(`Total Issues Found: ${totalIssues}`);
  console.log('═'.repeat(60) + '\n');

  // Export if requested
  if (process.argv.includes('--export')) {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `mismatch-report-${timestamp}.json`;

    fs.writeFileSync(filename, JSON.stringify({
      generatedAt: new Date().toISOString(),
      totalListings: listings.length,
      totalIssues,
      issues
    }, null, 2));

    console.log(`✅ Report exported to: ${filename}\n`);
  }

  return issues;
}

// Run detection
detectMismatches().catch(error => {
  console.error('Detection failed:', error);
  process.exit(1);
});
