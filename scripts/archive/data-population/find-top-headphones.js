require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  console.log('🎧 Top headphones by price tier (for data collection)...\n');

  const categories = {
    'Budget (<$200)': [0, 200],
    'Mid-Range ($200-$600)': [200, 600],
    'High-End ($600-$1500)': [600, 1500],
    'Summit-Fi (>$1500)': [1500, 99999]
  };

  const allSelected = [];

  for (const [tier, [min, max]] of Object.entries(categories)) {
    const { data } = await supabase
      .from('components')
      .select('brand, name, price_new, impedance, category')
      .in('category', ['cans', 'iems'])
      .gte('price_new', min)
      .lt('price_new', max)
      .not('price_new', 'is', null)
      .order('price_new', { ascending: true })
      .limit(15);

    console.log(`${tier}:`);
    data.forEach(h => {
      const imp = h.impedance ? `${h.impedance}Ω` : 'NO DATA';
      console.log(`  ${h.brand} ${h.name} ($${h.price_new}) [${imp}]`);
      allSelected.push(h);
    });
    console.log('');
  }

  console.log(`\n📊 Total selected: ${allSelected.length} headphones`);
  console.log(`Missing impedance: ${allSelected.filter(h => !h.impedance).length}`);
})();
