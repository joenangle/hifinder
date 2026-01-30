/**
 * Check MSRP and used price data coverage across all components
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkMSRPCoverage() {
  console.log('📊 Checking MSRP and used price data coverage...\n');

  // Get all components with pricing data
  const { data: components, error } = await supabase
    .from('components')
    .select('category, price_new, price_used_min, price_used_max, brand, name');

  if (error) {
    console.error('Error fetching components:', error);
    process.exit(1);
  }

  // Group by category
  const stats = {};

  components.forEach(comp => {
    const cat = comp.category;
    if (!stats[cat]) {
      stats[cat] = {
        total: 0,
        hasNew: 0,
        hasUsedMin: 0,
        hasUsedMax: 0,
        hasBoth: 0
      };
    }

    stats[cat].total++;
    if (comp.price_new !== null) stats[cat].hasNew++;
    if (comp.price_used_min !== null) stats[cat].hasUsedMin++;
    if (comp.price_used_max !== null) stats[cat].hasUsedMax++;
    if (comp.price_new !== null && comp.price_used_min !== null) stats[cat].hasBoth++;
  });

  // Print results
  console.log('Category Breakdown:\n');
  console.log('Category        | Total | New Price | Used Price | Both (MSRP+Used) |');
  console.log('----------------|-------|-----------|------------|------------------|');

  Object.entries(stats).forEach(([category, data]) => {
    const newPct = ((data.hasNew / data.total) * 100).toFixed(1);
    const usedPct = ((data.hasUsedMin / data.total) * 100).toFixed(1);
    const bothPct = ((data.hasBoth / data.total) * 100).toFixed(1);

    console.log(
      `${category.padEnd(15)} | ${String(data.total).padStart(5)} | ${newPct.padStart(8)}% | ${usedPct.padStart(9)}% | ${bothPct.padStart(15)}% |`
    );
  });

  // Calculate overall stats
  const totals = Object.values(stats).reduce((acc, curr) => ({
    total: acc.total + curr.total,
    hasNew: acc.hasNew + curr.hasNew,
    hasUsedMin: acc.hasUsedMin + curr.hasUsedMin,
    hasBoth: acc.hasBoth + curr.hasBoth
  }), { total: 0, hasNew: 0, hasUsedMin: 0, hasBoth: 0 });

  console.log('----------------|-------|-----------|------------|------------------|');
  const totalNewPct = ((totals.hasNew / totals.total) * 100).toFixed(1);
  const totalUsedPct = ((totals.hasUsedMin / totals.total) * 100).toFixed(1);
  const totalBothPct = ((totals.hasBoth / totals.total) * 100).toFixed(1);

  console.log(
    `${'TOTAL'.padEnd(15)} | ${String(totals.total).padStart(5)} | ${totalNewPct.padStart(8)}% | ${totalUsedPct.padStart(9)}% | ${totalBothPct.padStart(15)}% |\n`
  );

  // Identify gaps
  console.log('\n🔍 Data Quality Analysis:\n');

  // Components with used prices but no new price
  const usedNoNew = components.filter(c => c.price_used_min !== null && c.price_new === null);
  console.log(`⚠️  ${usedNoNew.length} components have used prices but NO new/MSRP data`);
  console.log(`   → Cannot calculate savings percentage for these items\n`);

  // Components with new price but no used prices
  const newNoUsed = components.filter(c => c.price_new !== null && c.price_used_min === null);
  console.log(`⚠️  ${newNoUsed.length} components have new/MSRP but NO used prices`);
  console.log(`   → Cannot show used market availability for these items\n`);

  // Components with both (ideal for savings calculation)
  console.log(`✅ ${totals.hasBoth} components have BOTH new price and used prices (${totalBothPct}%)`);
  console.log(`   → Can calculate savings: "Save $X (Y%) vs. new"\n`);

  // Sample savings calculations for components with both
  const withBoth = components.filter(c => c.price_new !== null && c.price_used_min !== null);
  if (withBoth.length > 0) {
    console.log('💰 Sample Savings Calculations (Top 10 by % savings):\n');

    // Sort by highest savings percentage
    const sorted = withBoth
      .map(c => ({
        brand: c.brand,
        name: c.name,
        category: c.category,
        newPrice: c.price_new,
        usedMin: c.price_used_min,
        savings: c.price_new - c.price_used_min,
        savingsPct: ((c.price_new - c.price_used_min) / c.price_new * 100)
      }))
      .filter(c => c.savings > 0)
      .sort((a, b) => b.savingsPct - a.savingsPct)
      .slice(0, 10);

    sorted.forEach((item, idx) => {
      console.log(`   ${(idx + 1).toString().padStart(2)}. ${item.brand} ${item.name.padEnd(25)} (${item.category})`);
      console.log(`       New: $${item.newPrice.toFixed(0).padStart(4)} → Used: $${item.usedMin.toFixed(0).padStart(4)} = Save $${item.savings.toFixed(0).padStart(3)} (${item.savingsPct.toFixed(1)}%)\n`);
    });
  }

  console.log('\n✨ Done!\n');
}

checkMSRPCoverage();
