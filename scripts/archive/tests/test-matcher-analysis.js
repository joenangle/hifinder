require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  const { data: listings } = await supabase
    .from('used_listings')
    .select('id, title, price, component_id, components (brand, name, price_new)')
    .order('date_posted', { ascending: false })
    .limit(30);
    
  console.log('SEVERE PRICE MISMATCHES:\n');
  
  listings?.forEach(l => {
    const comp = l.components;
    if (!comp || !comp.price_new || !l.price) return;
    
    const diff = Math.abs(l.price - comp.price_new);
    const pct = ((diff / comp.price_new) * 100).toFixed(0);
    
    if (parseFloat(pct) > 300 || diff > 10000) {
      console.log(`"${l.title.substring(0, 70)}"`);
      console.log(`  Price: $${l.price} | Matched: ${comp.brand} ${comp.name} ($${comp.price_new})`);
      console.log(`  Diff: $${diff} (${pct}%)\n`);
    }
  });
})();
