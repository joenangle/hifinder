require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('📊 Analyzing amp/DAC power output data...\n');

  const { data: amps } = await supabase
    .from('components')
    .select('brand, name, power_output, price_new')
    .in('category', ['amp', 'dac_amp'])
    .order('price_new', { ascending: false })
    .limit(30);

  console.log('Sample amp power_output data:\n');
  amps.forEach(a => {
    const status = a.power_output ? `✅ ${a.power_output}` : '❌ Missing';
    console.log(`${a.brand} ${a.name} ($${a.price_new}): ${status}`);
  });

  const stats = {
    total: amps.length,
    withPower: amps.filter(a => a.power_output).length,
    noPower: amps.filter(a => !a.power_output).length
  };

  console.log(`\n📈 Coverage: ${stats.withPower}/${stats.total} (${Math.round(stats.withPower/stats.total*100)}%)`);

  // Show examples of power output format
  console.log('\n📝 Power output format examples:');
  amps.filter(a => a.power_output).slice(0, 5).forEach(a => {
    console.log(`  "${a.power_output}"`);
  });
})();
