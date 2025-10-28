require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('Checking existing DAC/amp components with budget tiers...\n');

  const { data, error } = await supabase
    .from('components')
    .select('brand, name, category, budget_tier, price_new')
    .in('category', ['dac', 'amp', 'dac_amp'])
    .not('budget_tier', 'is', null)
    .limit(20);

  if (error) {
    console.error(error);
  } else {
    // Group by budget_tier to see patterns
    const byTier = {};
    data.forEach(c => {
      if (!byTier[c.budget_tier]) byTier[c.budget_tier] = [];
      byTier[c.budget_tier].push(`${c.category}: ${c.brand} ${c.name} ($${c.price_new})`);
    });

    console.log('Budget Tiers Found:');
    Object.keys(byTier).forEach(tier => {
      console.log(`\n${tier}:`);
      byTier[tier].forEach(item => console.log(`  - ${item}`));
    });
  }
})();
