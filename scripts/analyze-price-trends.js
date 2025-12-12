/**
 * Price Trend Analysis Script
 *
 * Analyzes sold listings to calculate monthly pricing trends:
 * - Average/median asking prices for sold items
 * - Trend direction (up/down/stable)
 * - Confidence scores based on data volume
 *
 * Run: node scripts/analyze-price-trends.js [--months=6] [--dry-run]
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { supabase } = require('./shared/database');

// Configuration
const CONFIG = {
  defaultMonths: 6, // Analyze last 6 months by default
  minSoldForHighConfidence: 20,
  minSoldForMediumConfidence: 5,
  trendThresholdPercent: 5, // >5% change = trending, <5% = stable
};

/**
 * Calculate median from array of numbers
 */
function calculateMedian(numbers) {
  if (numbers.length === 0) return null;

  const sorted = numbers.slice().sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2;
  }
  return sorted[middle];
}

/**
 * Determine confidence score based on sample size
 */
function calculateConfidence(soldCount) {
  if (soldCount >= CONFIG.minSoldForHighConfidence) return 'high';
  if (soldCount >= CONFIG.minSoldForMediumConfidence) return 'medium';
  return 'low';
}

/**
 * Determine trend direction by comparing to previous period
 */
function calculateTrend(currentAvg, previousAvg) {
  if (!previousAvg) {
    return {
      direction: 'stable',
      percentage: 0,
      note: 'No previous period data',
    };
  }

  const percentChange = ((currentAvg - previousAvg) / previousAvg) * 100;

  let direction;
  if (Math.abs(percentChange) < CONFIG.trendThresholdPercent) {
    direction = 'stable';
  } else if (percentChange > 0) {
    direction = 'up';
  } else {
    direction = 'down';
  }

  return {
    direction,
    percentage: parseFloat(percentChange.toFixed(2)),
    note: `${Math.abs(percentChange).toFixed(1)}% ${percentChange > 0 ? 'increase' : 'decrease'} from previous period`,
  };
}

/**
 * Get sold listings grouped by component and month
 */
async function getSoldListingsByMonth(monthsBack) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - monthsBack);

  console.log(`📊 Fetching sold listings from ${startDate.toISOString().split('T')[0]}...`);

  const { data, error } = await supabase
    .from('used_listings')
    .select('component_id, price, date_sold, source')
    .eq('status', 'sold')
    .not('date_sold', 'is', null)
    .gte('date_sold', startDate.toISOString())
    .order('date_sold', { ascending: true });

  if (error) {
    console.error('❌ Error fetching sold listings:', error);
    throw error;
  }

  console.log(`✅ Found ${data.length} sold listings`);
  return data;
}

/**
 * Get current active listings for discount factor calculation
 */
async function getActiveListingsByComponent() {
  console.log('📊 Fetching active listings for discount factor calculation...');

  const { data, error } = await supabase
    .from('used_listings')
    .select('component_id, price')
    .eq('status', 'available');

  if (error) {
    console.error('❌ Error fetching active listings:', error);
    throw error;
  }

  // Group by component_id
  const grouped = {};
  data.forEach(listing => {
    if (!grouped[listing.component_id]) {
      grouped[listing.component_id] = [];
    }
    grouped[listing.component_id].push(listing.price);
  });

  console.log(`✅ Found active listings for ${Object.keys(grouped).length} components`);
  return grouped;
}

/**
 * Group sold listings by component and month
 */
function groupByComponentAndMonth(soldListings) {
  const grouped = {};

  soldListings.forEach(listing => {
    const date = new Date(listing.date_sold);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const componentId = listing.component_id;

    const key = `${componentId}:${monthKey}`;

    if (!grouped[key]) {
      grouped[key] = {
        component_id: componentId,
        month: monthKey,
        prices: [],
        sources: new Set(),
      };
    }

    grouped[key].prices.push(listing.price);
    grouped[key].sources.add(listing.source);
  });

  return Object.values(grouped);
}

/**
 * Calculate statistics for a group of prices
 */
function calculatePriceStats(prices) {
  if (prices.length === 0) {
    return null;
  }

  const validPrices = prices.filter(p => p > 0);
  if (validPrices.length === 0) {
    return null;
  }

  return {
    avg: parseFloat((validPrices.reduce((sum, p) => sum + p, 0) / validPrices.length).toFixed(2)),
    median: parseFloat(calculateMedian(validPrices).toFixed(2)),
    min: Math.min(...validPrices),
    max: Math.max(...validPrices),
    count: validPrices.length,
  };
}

/**
 * Get previous month's trend for a component
 */
async function getPreviousTrend(componentId, currentMonth) {
  const [year, month] = currentMonth.split('-').map(Number);
  const previousDate = new Date(year, month - 2, 1); // month - 2 because months are 0-indexed
  const previousMonth = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, '0')}`;

  const { data, error } = await supabase
    .from('price_trends')
    .select('avg_asking_price')
    .eq('component_id', componentId)
    .gte('period_start', `${previousMonth}-01`)
    .lt('period_start', `${currentMonth}-01`)
    .order('period_start', { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return null;
  }

  return data[0].avg_asking_price;
}

/**
 * Calculate discount factor (how much below active listings do items sell?)
 */
function calculateDiscountFactor(soldAvg, activeListings) {
  if (!activeListings || activeListings.length === 0) {
    return null;
  }

  const activeAvg = activeListings.reduce((sum, p) => sum + p, 0) / activeListings.length;

  if (activeAvg === 0) {
    return null;
  }

  // Discount factor: sold_avg / active_avg
  // E.g., if items sell for $230 avg and are listed at $250 avg, factor = 0.92
  return parseFloat((soldAvg / activeAvg).toFixed(2));
}

/**
 * Save or update trend data in database
 */
async function saveTrendData(trendData, dryRun = false) {
  if (dryRun) {
    console.log('🔍 DRY RUN - Would save:', JSON.stringify(trendData, null, 2));
    return;
  }

  const { error } = await supabase
    .from('price_trends')
    .upsert(trendData, {
      onConflict: 'component_id,period_start',
    });

  if (error) {
    console.error('❌ Error saving trend data:', error);
    throw error;
  }
}

/**
 * Main analysis function
 */
async function analyzePriceTrends(options = {}) {
  const monthsBack = options.months || CONFIG.defaultMonths;
  const dryRun = options.dryRun || false;

  console.log('🚀 Starting Price Trend Analysis');
  console.log(`📅 Analyzing ${monthsBack} months of data`);
  console.log(`${dryRun ? '🔍 DRY RUN MODE' : '💾 LIVE MODE'}\n`);

  try {
    // Fetch data
    const soldListings = await getSoldListingsByMonth(monthsBack);
    const activeListings = await getActiveListingsByComponent();

    if (soldListings.length === 0) {
      console.log('⚠️  No sold listings found in date range');
      return;
    }

    // Group by component and month
    const grouped = groupByComponentAndMonth(soldListings);
    console.log(`\n📈 Analyzing ${grouped.length} component-month combinations...\n`);

    let savedCount = 0;
    let skippedCount = 0;

    for (const group of grouped) {
      const stats = calculatePriceStats(group.prices);

      if (!stats) {
        skippedCount++;
        continue;
      }

      // Get previous period for trend calculation
      const previousAvg = await getPreviousTrend(group.component_id, group.month);
      const trend = calculateTrend(stats.avg, previousAvg);

      // Calculate period dates
      const [year, month] = group.month.split('-').map(Number);
      const periodStart = new Date(year, month - 1, 1);
      const periodEnd = new Date(year, month, 0); // Last day of month

      // Calculate discount factor
      const discountFactor = calculateDiscountFactor(
        stats.avg,
        activeListings[group.component_id]
      );

      const trendData = {
        component_id: group.component_id,
        period_start: periodStart.toISOString().split('T')[0],
        period_end: periodEnd.toISOString().split('T')[0],
        avg_asking_price: stats.avg,
        median_asking_price: stats.median,
        min_asking_price: stats.min,
        max_asking_price: stats.max,
        sold_count: stats.count,
        active_count: activeListings[group.component_id]?.length || 0,
        trend_direction: trend.direction,
        trend_percentage: trend.percentage,
        discount_factor: discountFactor,
        confidence_score: calculateConfidence(stats.count),
        data_quality_notes: [
          `${stats.count} sold listings`,
          trend.note,
          discountFactor ? `Discount factor: ${(discountFactor * 100).toFixed(0)}% of active prices` : 'No active listings for comparison',
          `Sources: ${Array.from(group.sources).join(', ')}`,
        ].join('; '),
        updated_at: new Date().toISOString(),
      };

      console.log(`✅ Component ${group.component_id} (${group.month}):`, {
        sold: stats.count,
        avg: `$${stats.avg}`,
        median: `$${stats.median}`,
        trend: `${trend.direction} (${trend.percentage > 0 ? '+' : ''}${trend.percentage}%)`,
        confidence: calculateConfidence(stats.count),
        discount: discountFactor ? `${(discountFactor * 100).toFixed(0)}%` : 'N/A',
      });

      await saveTrendData(trendData, dryRun);
      savedCount++;
    }

    console.log(`\n✨ Analysis Complete!`);
    console.log(`✅ Saved: ${savedCount} trends`);
    console.log(`⏭️  Skipped: ${skippedCount} (no valid data)`);

    if (dryRun) {
      console.log('\n🔍 This was a DRY RUN - no data was saved');
      console.log('Run without --dry-run to save to database');
    }

  } catch (error) {
    console.error('❌ Analysis failed:', error);
    throw error;
  }
}

/**
 * Parse command line arguments
 */
function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    months: CONFIG.defaultMonths,
    dryRun: false,
  };

  args.forEach(arg => {
    if (arg.startsWith('--months=')) {
      options.months = parseInt(arg.split('=')[1]);
    }
    if (arg === '--dry-run') {
      options.dryRun = true;
    }
  });

  return options;
}

/**
 * Run the analysis
 */
if (require.main === module) {
  const options = parseArgs();

  analyzePriceTrends(options)
    .then(() => {
      console.log('\n✅ Price trend analysis completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Price trend analysis failed:', error);
      process.exit(1);
    });
}

module.exports = { analyzePriceTrends };
