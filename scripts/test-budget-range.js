const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testRange() {
  const budget = 250;
  const minBudget = Math.round(budget * (1 - 20/100)); // $200
  const maxBudget = Math.round(budget * (1 + 10/100)); // $275
  
  console.log(`Testing range: $${minBudget} - $${maxBudget}`);
  
  const { data: cans, error: cansError, count: cansCount } = await supabase
    .from('components')
    .select('*', { count: 'exact' })
    .eq('category', 'cans')
    .gte('price_used_min', minBudget)
    .lte('price_used_max', maxBudget);
    
  console.log('\nCans in range:', cansCount || 0);
  if (cans && cans.length > 0) {
    console.log('Sample:', cans[0].name, `$${cans[0].price_used_min}-$${cans[0].price_used_max}`);
  }
  
  const { data: iems, error: iemsError, count: iemsCount } = await supabase
    .from('components')
    .select('*', { count: 'exact' })
    .eq('category', 'iems')
    .gte('price_used_min', minBudget)
    .lte('price_used_max', maxBudget);
    
  console.log('\nIEMs in range:', iemsCount || 0);
  if (iems && iems.length > 0) {
    console.log('Sample:', iems[0].name, `$${iems[0].price_used_min}-$${iems[0].price_used_max}`);
  }
}

testRange();
