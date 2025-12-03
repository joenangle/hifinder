/**
 * Cache Warming Script for HiFinder Recommendations
 *
 * Pre-populates the Vercel Data Cache with common query combinations
 * Run after deployments to ensure fast response times for users
 *
 * Warms 180 query combinations:
 * - 15 budget tiers
 * - 4 sound signatures
 * - 3 headphone types
 *
 * Usage:
 *   node scripts/warm-cache.js
 *   node scripts/warm-cache.js --production  # For production URL
 */

require('dotenv').config({ path: '.env.local' });

// Configuration
const BUDGETS = [50, 75, 100, 200, 250, 300, 400, 500, 600, 750, 1000, 2000, 2500, 3000, 5000];
const SOUND_SIGNATURES = ['neutral', 'warm', 'bright', 'fun'];
const HEADPHONE_TYPES = ['cans', 'iems', 'both'];

const CONCURRENT_REQUESTS = 5; // Process 5 requests at a time to avoid overwhelming server
const REQUEST_DELAY = 100; // 100ms delay between batches

/**
 * Get base URL from environment or arguments
 */
function getBaseUrl() {
  if (process.argv.includes('--production')) {
    return 'https://hifinder.app';
  }
  return process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
}

/**
 * Generate all query combinations
 */
function generateQueryCombinations() {
  const combinations = [];

  for (const budget of BUDGETS) {
    for (const signature of SOUND_SIGNATURES) {
      for (const type of HEADPHONE_TYPES) {
        combinations.push({
          budget,
          soundSignatures: [signature],
          headphoneType: type,
          wantRecommendationsFor: {
            headphones: type === 'cans' || type === 'both',
            iems: type === 'iems' || type === 'both',
            dac: false,
            amp: false,
            combo: false,
          },
        });
      }
    }
  }

  return combinations;
}

/**
 * Warm cache for a single query
 */
async function warmQuery(baseUrl, query, index, total) {
  const url = `${baseUrl}/api/recommendations/v2`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(query),
    });

    if (response.ok) {
      const data = await response.json();
      const resultCount = [
        data.headphones?.length || 0,
        data.iems?.length || 0,
        data.dac?.length || 0,
        data.amp?.length || 0,
        data.combo?.length || 0,
      ].reduce((a, b) => a + b, 0);

      console.log(
        `✅ [${index + 1}/${total}] $${query.budget} ${query.soundSignatures[0]} ${query.headphoneType} → ${resultCount} results`
      );
      return { success: true, query };
    } else {
      console.log(
        `⚠️  [${index + 1}/${total}] $${query.budget} ${query.soundSignatures[0]} ${query.headphoneType} → HTTP ${response.status}`
      );
      return { success: false, query, error: `HTTP ${response.status}` };
    }
  } catch (error) {
    console.log(
      `❌ [${index + 1}/${total}] $${query.budget} ${query.soundSignatures[0]} ${query.headphoneType} → ${error.message}`
    );
    return { success: false, query, error: error.message };
  }
}

/**
 * Process queries in batches with concurrency limit
 */
async function processBatch(baseUrl, queries, startIndex) {
  const batch = queries.slice(startIndex, startIndex + CONCURRENT_REQUESTS);
  const results = await Promise.all(
    batch.map((query, index) => warmQuery(baseUrl, query, startIndex + index, queries.length))
  );
  return results;
}

/**
 * Main cache warming function
 */
async function warmCache() {
  const baseUrl = getBaseUrl();
  console.log(`🔥 Cache Warming Started\n`);
  console.log(`Target: ${baseUrl}`);
  console.log(`Concurrency: ${CONCURRENT_REQUESTS} requests at a time`);
  console.log(`Delay: ${REQUEST_DELAY}ms between batches\n`);

  const queries = generateQueryCombinations();
  console.log(`📊 Total queries to warm: ${queries.length}\n`);

  const startTime = Date.now();
  const results = {
    success: 0,
    failed: 0,
    errors: [],
  };

  // Process queries in batches
  for (let i = 0; i < queries.length; i += CONCURRENT_REQUESTS) {
    const batchResults = await processBatch(baseUrl, queries, i);

    for (const result of batchResults) {
      if (result.success) {
        results.success++;
      } else {
        results.failed++;
        results.errors.push({
          query: result.query,
          error: result.error,
        });
      }
    }

    // Delay between batches to avoid overwhelming server
    if (i + CONCURRENT_REQUESTS < queries.length) {
      await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY));
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n\n🎉 Cache Warming Complete!\n`);
  console.log(`📊 Statistics:`);
  console.log(`   Total queries: ${queries.length}`);
  console.log(`   Successful: ${results.success}`);
  console.log(`   Failed: ${results.failed}`);
  console.log(`   Duration: ${duration}s`);
  console.log(`   Rate: ${(queries.length / duration).toFixed(1)} queries/sec`);

  if (results.errors.length > 0) {
    console.log(`\n⚠️  Failed Queries:`);
    results.errors.slice(0, 10).forEach((err) => {
      console.log(
        `   - $${err.query.budget} ${err.query.soundSignatures[0]} ${err.query.headphoneType}: ${err.error}`
      );
    });
    if (results.errors.length > 10) {
      console.log(`   ... and ${results.errors.length - 10} more`);
    }
  }

  console.log(`\n✅ Cache is now warm and ready for production traffic!`);
}

// Main execution
if (require.main === module) {
  warmCache().catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { warmCache };
