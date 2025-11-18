/**
 * Bundle Detection Accuracy Analyzer
 *
 * Queries the database for bundle listings and analyzes accuracy:
 * - False positives: Single items marked as bundles
 * - False negatives: Multi-item listings not marked as bundles
 * - Component count accuracy
 * - Pricing analysis
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { detectMultipleComponents } = require('./component-matcher-enhanced');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Analysis categories
const analysis = {
  totalListings: 0,
  bundles: 0,
  singleItems: 0,

  // False positives: marked as bundle but appears to be single item
  falsePositives: [],

  // False negatives: not marked as bundle but appears to be multi-item
  falseNegatives: [],

  // Questionable: needs manual review
  questionable: [],

  // Accurate bundles: correctly identified
  accurateBundles: [],

  // Accurate singles: correctly identified as single items
  accurateSingles: []
};

/**
 * Heuristic analysis of whether a title indicates a true bundle
 */
function analyzeTitle(title) {
  const titleLower = title.toLowerCase();

  // Strong bundle indicators
  const bundleIndicators = [
    / \+ /,                    // " + " separator
    / and /,                   // " and " separator
    / & /,                     // " & " separator
    / with /,                  // " with " separator
    /\bstack\b/,              // "stack" often means bundle
    /\bcombo\b/,              // "combo" means bundle
    /\bbundle\b/,             // explicit "bundle"
    /\blot\b/,                // "lot" often means multiple items
  ];

  // Strong single-item indicators
  const singleIndicators = [
    /\bwith (?:cable|case|box|accessories|tips)\b/, // Accessories don't make it a bundle
    /\bincluding (?:cable|case|box|accessories|tips)\b/,
    /\bcomes with (?:cable|case|box|accessories|tips)\b/,
  ];

  // Check for single-item indicators first
  for (const pattern of singleIndicators) {
    if (pattern.test(titleLower)) {
      return {
        likelyBundle: false,
        reason: 'Accessories mentioned but likely single item',
        pattern: pattern.toString()
      };
    }
  }

  // Check for bundle indicators
  for (const pattern of bundleIndicators) {
    if (pattern.test(titleLower)) {
      return {
        likelyBundle: true,
        reason: 'Strong bundle indicator found',
        pattern: pattern.toString()
      };
    }
  }

  // Count model-like patterns (e.g., HD600, M50X, etc.)
  const modelPattern = /\b(?:[A-Z]{2,4}[-\s]?\d{2,4}[A-Za-z]*|\d{2,4}[A-Z]{2,4})\b/g;
  const models = title.match(modelPattern) || [];

  if (models.length >= 2) {
    return {
      likelyBundle: true,
      reason: `Multiple model numbers found (${models.length})`,
      models: models
    };
  }

  return {
    likelyBundle: false,
    reason: 'No strong bundle indicators',
    models: models
  };
}

/**
 * Main analysis function
 */
async function analyzeBundleAccuracy() {
  console.log('🔍 Analyzing bundle detection accuracy...\n');

  // Fetch all listings
  const { data: listings, error } = await supabase
    .from('used_listings')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('❌ Error fetching listings:', error);
    return;
  }

  analysis.totalListings = listings.length;

  console.log(`📊 Analyzing ${listings.length} total listings...\n`);

  // Analyze each listing
  for (const listing of listings) {
    if (listing.is_bundle) {
      analysis.bundles++;

      // Re-run detection algorithm on title
      const detectionResult = detectMultipleComponents(listing.title);
      const titleAnalysis = analyzeTitle(listing.title);

      // Check if this is a false positive
      if (!titleAnalysis.likelyBundle && detectionResult.componentCount <= 1) {
        analysis.falsePositives.push({
          title: listing.title,
          price: listing.price,
          num_items: listing.num_items,
          source_url: listing.source_url,
          reason: titleAnalysis.reason,
          detectedCount: detectionResult.componentCount
        });
      }
      // Check if it's questionable
      else if (!titleAnalysis.likelyBundle && detectionResult.componentCount >= 2) {
        analysis.questionable.push({
          title: listing.title,
          price: listing.price,
          num_items: listing.num_items,
          source_url: listing.source_url,
          reason: `Algorithm says bundle (${detectionResult.componentCount} items) but title analysis uncertain`,
          titleReason: titleAnalysis.reason
        });
      }
      // Looks like an accurate bundle
      else {
        analysis.accurateBundles.push({
          title: listing.title,
          price: listing.price,
          num_items: listing.num_items,
          reason: titleAnalysis.reason
        });
      }
    } else {
      analysis.singleItems++;

      // Check for false negatives
      const detectionResult = detectMultipleComponents(listing.title);
      const titleAnalysis = analyzeTitle(listing.title);

      if (titleAnalysis.likelyBundle || detectionResult.componentCount >= 2) {
        analysis.falseNegatives.push({
          title: listing.title,
          price: listing.price,
          source_url: listing.source_url,
          reason: titleAnalysis.likelyBundle ? titleAnalysis.reason : `Algorithm detected ${detectionResult.componentCount} components`,
          pattern: titleAnalysis.pattern
        });
      } else {
        // Accurate single item (sample only first 20)
        if (analysis.accurateSingles.length < 20) {
          analysis.accurateSingles.push({
            title: listing.title,
            price: listing.price
          });
        }
      }
    }
  }

  // Calculate statistics
  const falsePositiveRate = (analysis.falsePositives.length / analysis.bundles * 100).toFixed(1);
  const falseNegativeRate = (analysis.falseNegatives.length / analysis.singleItems * 100).toFixed(1);
  const bundleAccuracy = (analysis.accurateBundles.length / analysis.bundles * 100).toFixed(1);
  const singleAccuracy = ((analysis.singleItems - analysis.falseNegatives.length) / analysis.singleItems * 100).toFixed(1);

  // Print results
  console.log('═══════════════════════════════════════════════════════');
  console.log('📈 BUNDLE DETECTION ACCURACY REPORT');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('📊 OVERALL STATISTICS:');
  console.log(`   Total listings: ${analysis.totalListings}`);
  console.log(`   Bundles: ${analysis.bundles} (${(analysis.bundles/analysis.totalListings*100).toFixed(1)}%)`);
  console.log(`   Single items: ${analysis.singleItems} (${(analysis.singleItems/analysis.totalListings*100).toFixed(1)}%)`);
  console.log('');

  console.log('✅ ACCURACY SCORES:');
  console.log(`   Bundle detection accuracy: ${bundleAccuracy}% (${analysis.accurateBundles.length}/${analysis.bundles} correct)`);
  console.log(`   Single item accuracy: ${singleAccuracy}% (${analysis.singleItems - analysis.falseNegatives.length}/${analysis.singleItems} correct)`);
  console.log('');

  console.log('❌ FALSE POSITIVES (marked as bundle, likely single item):');
  console.log(`   Count: ${analysis.falsePositives.length}`);
  console.log(`   Rate: ${falsePositiveRate}% of bundles`);
  if (analysis.falsePositives.length > 0) {
    console.log('\n   Examples:');
    analysis.falsePositives.slice(0, 10).forEach((fp, i) => {
      console.log(`   ${i+1}. "${fp.title}"`);
      console.log(`      Price: $${fp.price} | Items: ${fp.num_items} | Reason: ${fp.reason}`);
      console.log(`      URL: ${fp.source_url}`);
      console.log('');
    });
  }
  console.log('');

  console.log('❌ FALSE NEGATIVES (not marked as bundle, appears multi-item):');
  console.log(`   Count: ${analysis.falseNegatives.length}`);
  console.log(`   Rate: ${falseNegativeRate}% of single items`);
  if (analysis.falseNegatives.length > 0) {
    console.log('\n   Examples:');
    analysis.falseNegatives.slice(0, 10).forEach((fn, i) => {
      console.log(`   ${i+1}. "${fn.title}"`);
      console.log(`      Price: $${fn.price} | Reason: ${fn.reason}`);
      console.log(`      URL: ${fn.source_url}`);
      console.log('');
    });
  }
  console.log('');

  console.log('⚠️  QUESTIONABLE (needs manual review):');
  console.log(`   Count: ${analysis.questionable.length}`);
  if (analysis.questionable.length > 0) {
    console.log('\n   Examples:');
    analysis.questionable.slice(0, 5).forEach((q, i) => {
      console.log(`   ${i+1}. "${q.title}"`);
      console.log(`      Price: $${q.price} | Items: ${q.num_items} | Reason: ${q.reason}`);
      console.log('');
    });
  }
  console.log('');

  console.log('✅ SAMPLE ACCURATE BUNDLES:');
  if (analysis.accurateBundles.length > 0) {
    analysis.accurateBundles.slice(0, 5).forEach((ab, i) => {
      console.log(`   ${i+1}. "${ab.title}"`);
      console.log(`      Price: $${ab.price} | Items: ${ab.num_items} | Reason: ${ab.reason}`);
      console.log('');
    });
  }
  console.log('');

  console.log('✅ SAMPLE ACCURATE SINGLE ITEMS:');
  if (analysis.accurateSingles.length > 0) {
    analysis.accurateSingles.slice(0, 5).forEach((as, i) => {
      console.log(`   ${i+1}. "${as.title}"`);
      console.log(`      Price: $${as.price}`);
    });
  }
  console.log('');

  console.log('═══════════════════════════════════════════════════════');
  console.log('💡 RECOMMENDATIONS:');
  console.log('═══════════════════════════════════════════════════════\n');

  if (analysis.falsePositives.length > 0) {
    console.log('❌ FALSE POSITIVE FIXES:');
    console.log('   - Improve detection to exclude "with accessories" patterns');
    console.log('   - Strengthen single-item indicators (cable, case, box)');
    console.log('   - Add whitelist for common accessory phrases\n');
  }

  if (analysis.falseNegatives.length > 0) {
    console.log('❌ FALSE NEGATIVE FIXES:');
    console.log('   - Add detection for bundle keywords (stack, combo, lot)');
    console.log('   - Improve model number counting logic');
    console.log('   - Lower threshold for separator-based detection\n');
  }

  if (analysis.questionable.length > 5) {
    console.log('⚠️  HIGH QUESTIONABLE COUNT:');
    console.log('   - Manual review needed for edge cases');
    console.log('   - Consider adding confidence scores');
    console.log('   - May need additional training data\n');
  }

  // Overall score
  const overallAccuracy = (
    (analysis.accurateBundles.length + analysis.singleItems - analysis.falseNegatives.length) /
    analysis.totalListings * 100
  ).toFixed(1);

  console.log(`\n🎯 OVERALL ACCURACY: ${overallAccuracy}%`);
  console.log(`   (${analysis.accurateBundles.length + analysis.singleItems - analysis.falseNegatives.length}/${analysis.totalListings} correctly classified)\n`);
}

// Run analysis
analyzeBundleAccuracy().catch(console.error);
