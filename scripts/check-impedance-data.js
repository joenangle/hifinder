require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const { data } = await supabase
    .from('components')
    .select('id, brand, name, category, impedance, needs_amp')
    .in('category', ['cans', 'iems'])
    .limit(30);

  console.log('Sample headphone/IEM data:\n');
  data.forEach(c => {
    const status = !c.impedance ? '❌ No impedance' :
                   c.impedance ? `✅ ${c.impedance}Ω` : '❌ Missing';
    console.log(`${c.brand} ${c.name}: ${status}, needs_amp: ${c.needs_amp || 'null'}`);
  });

  const stats = {
    total: data.length,
    withImpedance: data.filter(c => c.impedance).length,
    withNeedsAmp: data.filter(c => c.needs_amp !== null).length,
    noData: data.filter(c => !c.impedance && c.needs_amp === null).length
  };

  console.log('\n📊 Stats:');
  console.log(`Total: ${stats.total}`);
  console.log(`With impedance: ${stats.withImpedance} (${Math.round(stats.withImpedance/stats.total*100)}%)`);
  console.log(`With needs_amp: ${stats.withNeedsAmp} (${Math.round(stats.withNeedsAmp/stats.total*100)}%)`);
  console.log(`No amp data: ${stats.noData} (${Math.round(stats.noData/stats.total*100)}%)`);
})();
