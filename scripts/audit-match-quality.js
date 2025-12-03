/**
 * Comprehensive Match Quality Audit
 *
 * Analyzes all used listing matches to identify:
 * - Price mismatches
 * - Brand mismatches
 * - Category confusions
 * - Match score distribution
 * - Problematic patterns
 *
 * Usage: node scripts/audit-match-quality.js [--export-csv]
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configuration
const PRICE_MISMATCH_THRESHOLD = 3.0; // 300% difference
const PRICE_ABS_THRESHOLD = 10000; // $10,000 absolute difference
const V3_LAUNCH_DATE = '2025-11-09'; // When enhanced matcher launched

const stats = {
  total: 0,
  matched: 0,
  unmatched: 0,
  bySource: {},
  priceMismatches: [],
  brandMismatches: [],
  categoryMismatches: [],
  scoreDistribution: { high: 0, medium: 0, low: 0 },
  staleMatches: [],
  problematicComponents: {}
};

/**
 * Main audit function
 */
async function runAudit() {
  console.log('🔍 Starting Comprehensive Match Quality Audit...\n');

  try {
    // 1. Overall Statistics
    await getOverallStats();

    // 2. Price Mismatches
    await findPriceMismatches();

    // 3. Brand Mismatches
    await findBrandMismatches();

    // 4. Category Mismatches
    await findCategoryMismatches();

    // 5. Stale Matches (pre-V3 created, post-V3 updated)
    await findStaleMatches();

    // 6. Problematic Component Patterns
    await findProblematicPatterns();

    // 7. Generate Report
    generateReport();

    // 8. Export if requested
    if (process.argv.includes('--export-csv')) {
      exportToCSV();
    }

    console.log('\n✅ Audit complete!');

  } catch (error) {
    console.error('❌ Audit failed:', error);
    process.exit(1);
  }
}

/**
 * Get overall statistics
 */
async function getOverallStats() {
  console.log('📊 Gathering overall statistics...');

  const { data: allListings, error } = await supabase
    .from('used_listings')
    .select('id, component_id, source, status, price, created_at, updated_at');

  if (error) throw error;

  stats.total = allListings.length;
  stats.matched = allListings.filter(l => l.component_id).length;
  stats.unmatched = stats.total - stats.matched;

  // Group by source
  allListings.forEach(listing => {
    const source = listing.source || 'unknown';
    if (!stats.bySource[source]) {
      stats.bySource[source] = { total: 0, matched: 0, unmatched: 0 };
    }
    stats.bySource[source].total++;
    if (listing.component_id) {
      stats.bySource[source].matched++;
    } else {
      stats.bySource[source].unmatched++;
    }
  });

  console.log(`  Total Listings: ${stats.total}`);
  console.log(`  Matched: ${stats.matched} (${(stats.matched/stats.total*100).toFixed(1)}%)`);
  console.log(`  Unmatched: ${stats.unmatched} (${(stats.unmatched/stats.total*100).toFixed(1)}%)`);
}

/**
 * Find price mismatches
 */
async function findPriceMismatches() {
  console.log('\n💰 Finding price mismatches...');

  const { data, error } = await supabase
    .from('used_listings')
    .select(`
      id,
      title,
      price,
      url,
      created_at,
      components (
        id,
        brand,
        name,
        price_new,
        price_used_min,
        price_used_max
      )
    `)
    .not('component_id', 'is', null)
    .not('price', 'is', null);

  if (error) throw error;

  data.forEach(listing => {
    if (!listing.components) return;

    const component = listing.components;
    const listingPrice = listing.price;
    const compUsedMin = component.price_used_min || component.price_new * 0.5;
    const compUsedMax = component.price_used_max || component.price_new * 0.8;

    if (!compUsedMin || !compUsedMax) return;

    // Calculate price difference
    let priceDiff = 0;
    let priceDiffPercent = 0;

    if (listingPrice < compUsedMin) {
      priceDiff = compUsedMin - listingPrice;
      priceDiffPercent = (priceDiff / compUsedMin) * 100;
    } else if (listingPrice > compUsedMax) {
      priceDiff = listingPrice - compUsedMax;
      priceDiffPercent = (priceDiff / compUsedMax) * 100;
    }

    // Check if mismatch
    const isRelativeMismatch = priceDiffPercent > (PRICE_MISMATCH_THRESHOLD * 100);
    const isAbsoluteMismatch = priceDiff > PRICE_ABS_THRESHOLD;

    if (isRelativeMismatch || isAbsoluteMismatch) {
      stats.priceMismatches.push({
        listingId: listing.id,
        title: listing.title,
        listingPrice,
        componentName: `${component.brand} ${component.name}`,
        componentId: component.id,
        compUsedMin,
        compUsedMax,
        compNew: component.price_new,
        priceDiff,
        priceDiffPercent: priceDiffPercent.toFixed(0),
        url: listing.url,
        createdAt: listing.created_at
      });
    }
  });

  // Sort by price difference percent
  stats.priceMismatches.sort((a, b) => parseFloat(b.priceDiffPercent) - parseFloat(a.priceDiffPercent));

  console.log(`  Found ${stats.priceMismatches.length} price mismatches`);
  if (stats.priceMismatches.length > 0) {
    console.log(`  Worst mismatch: ${stats.priceMismatches[0].priceDiffPercent}% difference`);
  }
}

/**
 * Find brand mismatches
 */
async function findBrandMismatches() {
  console.log('\n🏷️  Finding brand mismatches...');

  const { data, error } = await supabase
    .from('used_listings')
    .select(`
      id,
      title,
      url,
      created_at,
      components (
        id,
        brand,
        name
      )
    `)
    .not('component_id', 'is', null);

  if (error) throw error;

  data.forEach(listing => {
    if (!listing.components) return;

    const component = listing.components;
    const titleLower = listing.title.toLowerCase();
    const brandLower = component.brand.toLowerCase();

    // Check if brand appears in title
    if (!titleLower.includes(brandLower)) {
      // Check common aliases
      const aliases = getBrandAliases(component.brand);
      const hasAlias = aliases.some(alias => titleLower.includes(alias.toLowerCase()));

      if (!hasAlias) {
        stats.brandMismatches.push({
          listingId: listing.id,
          title: listing.title,
          componentBrand: component.brand,
          componentName: component.name,
          componentId: component.id,
          url: listing.url,
          createdAt: listing.created_at
        });
      }
    }
  });

  console.log(`  Found ${stats.brandMismatches.length} brand mismatches`);
}

/**
 * Find category mismatches
 */
async function findCategoryMismatches() {
  console.log('\n📂 Finding category mismatches...');

  const { data, error } = await supabase
    .from('used_listings')
    .select(`
      id,
      title,
      url,
      components (
        id,
        brand,
        name,
        category
      )
    `)
    .not('component_id', 'is', null);

  if (error) throw error;

  data.forEach(listing => {
    if (!listing.components) return;

    const component = listing.components;
    const titleLower = listing.title.toLowerCase();
    const category = component.category;

    // Check for obvious category mismatches
    let isMismatch = false;

    if (category === 'iems' && (titleLower.includes('headphone') || titleLower.includes('over-ear'))) {
      isMismatch = true;
    } else if (category === 'headphones' && titleLower.includes('iem')) {
      isMismatch = true;
    } else if ((category === 'dac' || category === 'amp' || category === 'combo') &&
               (titleLower.includes('iem') || titleLower.includes('headphone'))) {
      isMismatch = true;
    }

    if (isMismatch) {
      stats.categoryMismatches.push({
        listingId: listing.id,
        title: listing.title,
        componentCategory: category,
        componentName: `${component.brand} ${component.name}`,
        componentId: component.id,
        url: listing.url
      });
    }
  });

  console.log(`  Found ${stats.categoryMismatches.length} category mismatches`);
}

/**
 * Find stale matches (created pre-V3, updated post-V3)
 */
async function findStaleMatches() {
  console.log('\n⏰ Finding stale matches...');

  const { data, error } = await supabase
    .from('used_listings')
    .select(`
      id,
      title,
      price,
      url,
      created_at,
      updated_at,
      components (
        id,
        brand,
        name,
        price_used_min,
        price_used_max
      )
    `)
    .not('component_id', 'is', null)
    .lt('created_at', V3_LAUNCH_DATE)
    .gte('updated_at', V3_LAUNCH_DATE);

  if (error) throw error;

  data.forEach(listing => {
    if (!listing.components) return;

    stats.staleMatches.push({
      listingId: listing.id,
      title: listing.title,
      componentName: `${listing.components.brand} ${listing.components.name}`,
      componentId: listing.components.id,
      createdAt: listing.created_at,
      updatedAt: listing.updated_at,
      url: listing.url
    });
  });

  console.log(`  Found ${stats.staleMatches.length} stale matches (pre-V3 creation, post-V3 update)`);
}

/**
 * Find problematic component patterns
 */
async function findProblematicPatterns() {
  console.log('\n🔴 Finding problematic component patterns...');

  // Components that have multiple listings with mismatches
  const componentCounts = {};

  [...stats.priceMismatches, ...stats.brandMismatches].forEach(mismatch => {
    const compId = mismatch.componentId;
    if (!componentCounts[compId]) {
      componentCounts[compId] = {
        componentName: mismatch.componentName || `${mismatch.componentBrand} ${mismatch.componentName}`,
        priceIssues: 0,
        brandIssues: 0,
        totalIssues: 0
      };
    }

    if (mismatch.priceDiff) componentCounts[compId].priceIssues++;
    if (mismatch.componentBrand) componentCounts[compId].brandIssues++;
    componentCounts[compId].totalIssues++;
  });

  // Find components with 3+ issues
  Object.entries(componentCounts).forEach(([compId, data]) => {
    if (data.totalIssues >= 3) {
      stats.problematicComponents[compId] = data;
    }
  });

  console.log(`  Found ${Object.keys(stats.problematicComponents).length} problematic components (3+ mismatches each)`);
}

/**
 * Generate comprehensive report
 */
function generateReport() {
  console.log('\n' + '='.repeat(80));
  console.log('📋 COMPREHENSIVE MATCH QUALITY AUDIT REPORT');
  console.log('='.repeat(80));

  // Overall Stats
  console.log('\n📊 OVERALL STATISTICS:');
  console.log(`  Total Listings: ${stats.total}`);
  console.log(`  Matched: ${stats.matched} (${(stats.matched/stats.total*100).toFixed(1)}%)`);
  console.log(`  Unmatched: ${stats.unmatched} (${(stats.unmatched/stats.total*100).toFixed(1)}%)`);

  console.log('\n  By Source:');
  Object.entries(stats.bySource).forEach(([source, data]) => {
    const matchRate = (data.matched / data.total * 100).toFixed(1);
    console.log(`    ${source}: ${data.total} total, ${data.matched} matched (${matchRate}%)`);
  });

  // Price Mismatches
  console.log('\n💰 PRICE MISMATCHES:');
  console.log(`  Total: ${stats.priceMismatches.length}`);
  if (stats.priceMismatches.length > 0) {
    console.log('\n  Top 10 Worst Mismatches:');
    stats.priceMismatches.slice(0, 10).forEach((m, i) => {
      console.log(`  ${i + 1}. ${m.title.substring(0, 60)}...`);
      console.log(`     Listing: $${m.listingPrice} → Component: $${m.compUsedMin}-$${m.compUsedMax}`);
      console.log(`     Matched to: ${m.componentName} (ID: ${m.componentId})`);
      console.log(`     Difference: ${m.priceDiffPercent}% ($${m.priceDiff.toFixed(0)})`);
      console.log(`     Created: ${m.createdAt}`);
      console.log('');
    });
  }

  // Brand Mismatches
  console.log('\n🏷️  BRAND MISMATCHES:');
  console.log(`  Total: ${stats.brandMismatches.length}`);
  if (stats.brandMismatches.length > 0) {
    console.log('\n  Sample (first 10):');
    stats.brandMismatches.slice(0, 10).forEach((m, i) => {
      console.log(`  ${i + 1}. "${m.title.substring(0, 60)}..."`);
      console.log(`     Matched to: ${m.componentBrand} ${m.componentName} (ID: ${m.componentId})`);
      console.log('');
    });
  }

  // Category Mismatches
  console.log('\n📂 CATEGORY MISMATCHES:');
  console.log(`  Total: ${stats.categoryMismatches.length}`);
  if (stats.categoryMismatches.length > 0) {
    stats.categoryMismatches.forEach((m, i) => {
      console.log(`  ${i + 1}. "${m.title.substring(0, 60)}..."`);
      console.log(`     Matched to: ${m.componentName} (${m.componentCategory})`);
      console.log('');
    });
  }

  // Stale Matches
  console.log('\n⏰ STALE MATCHES (Pre-V3 creation, Post-V3 update):');
  console.log(`  Total: ${stats.staleMatches.length}`);
  console.log(`  Note: These matches were created before V3 matcher launch (${V3_LAUNCH_DATE})`);
  console.log(`        but have been updated since. They may have bad component_id values.`);

  // Problematic Components
  console.log('\n🔴 PROBLEMATIC COMPONENTS (3+ mismatches each):');
  console.log(`  Total: ${Object.keys(stats.problematicComponents).length}`);
  if (Object.keys(stats.problematicComponents).length > 0) {
    Object.entries(stats.problematicComponents).forEach(([compId, data]) => {
      console.log(`  - ${data.componentName} (ID: ${compId})`);
      console.log(`    Price issues: ${data.priceIssues}, Brand issues: ${data.brandIssues}, Total: ${data.totalIssues}`);
    });
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('📝 SUMMARY:');
  const totalIssues = stats.priceMismatches.length + stats.brandMismatches.length +
                      stats.categoryMismatches.length;
  const issueRate = (totalIssues / stats.matched * 100).toFixed(1);
  console.log(`  Total Issues Found: ${totalIssues}`);
  console.log(`  Issue Rate: ${issueRate}% of matched listings have problems`);
  console.log(`  Estimated Fix Impact: ${totalIssues} listings need re-matching`);
  console.log('='.repeat(80));
}

/**
 * Export results to CSV
 */
function exportToCSV() {
  console.log('\n📄 Exporting results to CSV...');

  const timestamp = new Date().toISOString().split('T')[0];
  const outputDir = path.join(__dirname, 'audit-results');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Export price mismatches
  if (stats.priceMismatches.length > 0) {
    const csvPath = path.join(outputDir, `price-mismatches-${timestamp}.csv`);
    const header = 'Listing ID,Title,Listing Price,Component,Component ID,Used Min,Used Max,New Price,Diff %,Diff $,Source URL,Created At\n';
    const rows = stats.priceMismatches.map(m =>
      `"${m.listingId}","${m.title}",${m.listingPrice},"${m.componentName}","${m.componentId}",${m.compUsedMin},${m.compUsedMax},${m.compNew},${m.priceDiffPercent},${m.priceDiff.toFixed(0)},"${m.url}","${m.createdAt}"`
    ).join('\n');
    fs.writeFileSync(csvPath, header + rows);
    console.log(`  Exported price mismatches to: ${csvPath}`);
  }

  // Export brand mismatches
  if (stats.brandMismatches.length > 0) {
    const csvPath = path.join(outputDir, `brand-mismatches-${timestamp}.csv`);
    const header = 'Listing ID,Title,Component Brand,Component Name,Component ID,Source URL,Created At\n';
    const rows = stats.brandMismatches.map(m =>
      `"${m.listingId}","${m.title}","${m.componentBrand}","${m.componentName}","${m.componentId}","${m.url}","${m.createdAt}"`
    ).join('\n');
    fs.writeFileSync(csvPath, header + rows);
    console.log(`  Exported brand mismatches to: ${csvPath}`);
  }

  console.log('  ✅ Export complete!');
}

/**
 * Helper: Get brand aliases
 */
function getBrandAliases(brand) {
  const aliases = {
    'sennheiser': ['senn'],
    'hifiman': ['hifi', 'hifi man'],
    'audio-technica': ['ath', 'audio technica'],
    'beyerdynamic': ['beyer', 'dt'],
    'shure': ['se'],
    'ultimate ears': ['ue'],
    'campfire audio': ['campfire', 'ca'],
    'fiio': ['fio'],
    'moondrop': ['moon', 'drop']
  };

  return aliases[brand.toLowerCase()] || [];
}

// Run audit
runAudit();
