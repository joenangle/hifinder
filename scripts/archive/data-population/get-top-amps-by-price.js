require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  // Get all amps with price data
  const { data: amps, error } = await supabase
    .from('components')
    .select('id, brand, name, price_new, price_used_min, price_used_max, asr_sinad, power_output, source')
    .eq('category', 'amp')
    .order('price_used_min', { ascending: true, nullsLast: true });

  if (error) {
    console.error('Error fetching amps:', error);
    return;
  }

  if (!amps || amps.length === 0) {
    console.log('No amps found');
    return;
  }

  console.error(`Found ${amps.length} amps`);

  // Group by $50 price buckets
  const priceRanges = [
    { min: 0, max: 50 },
    { min: 50, max: 100 },
    { min: 100, max: 150 },
    { min: 150, max: 200 },
    { min: 200, max: 250 },
    { min: 250, max: 300 },
    { min: 300, max: 350 },
    { min: 350, max: 400 },
    { min: 400, max: 450 },
    { min: 450, max: 500 },
    { min: 500, max: 600 },
    { min: 600, max: 700 },
    { min: 700, max: 800 },
    { min: 800, max: 1000 },
    { min: 1000, max: 1500 },
    { min: 1500, max: 2000 },
    { min: 2000, max: 5000 }
  ];

  console.log('Brand,Model,Price_Min,Price_Max,Price_New,SINAD,Power_Output,Input_Types,Output_Types,Why_Recommended');

  priceRanges.forEach(range => {
    const inRange = amps.filter(a => {
      const price = a.price_used_min || a.price_new || 0;
      return price >= range.min && price < range.max;
    });

    if (inRange.length === 0) return;

    // Sort by SINAD (if available), then by price
    const sorted = inRange.sort((a, b) => {
      if (a.asr_sinad && b.asr_sinad) return b.asr_sinad - a.asr_sinad;
      if (a.asr_sinad) return -1;
      if (b.asr_sinad) return 1;
      return (b.price_new || 0) - (a.price_new || 0);
    });

    const top = sorted[0];

    console.log(`${top.brand},"${top.name}",${top.price_used_min || ''},${top.price_used_max || ''},${top.price_new || ''},${top.asr_sinad || ''},"${top.power_output || ''}","","",""`);
  });
})();
