#!/usr/bin/env node

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  // Get headphones missing impedance data, ordered by importance
  const { data, error } = await supabase
    .from('components')
    .select('brand, name, category, impedance, sensitivity_db_mw, sensitivity_db_v, budget_tier')
    .in('category', ['cans'])
    .order('budget_tier', { ascending: false })
    .order('name');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const missing = data.filter(c => !c.impedance);
  const hasData = data.filter(c => c.impedance);

  console.log('📊 Headphones in database:');
  console.log(`   Total: ${data.length}`);
  console.log(`   Missing impedance: ${missing.length} (${((missing.length/data.length)*100).toFixed(1)}%)`);
  console.log(`   Has impedance: ${hasData.length}`);
  console.log('\nTop 50 headphones MISSING impedance data:');
  console.log('');
  missing.slice(0, 50).forEach(c => {
    console.log(`${c.brand},${c.name},,,,${c.budget_tier || 'unknown'}`);
  });
})();
