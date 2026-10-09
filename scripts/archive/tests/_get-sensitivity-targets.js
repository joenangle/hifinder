const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  // Get all cans missing sensitivity
  const { data: cans } = await supabase.from('components')
    .select('id, brand, name, category, impedance, sensitivity_db_mw, sensitivity_db_v, driver_type, price_new')
    .eq('category', 'cans')
    .is('sensitivity_db_mw', null)
    .is('sensitivity_db_v', null)
    .order('brand');

  // Get all IEMs missing sensitivity
  const { data: iems } = await supabase.from('components')
    .select('id, brand, name, category, impedance, sensitivity_db_mw, sensitivity_db_v, driver_type, price_new')
    .eq('category', 'iems')
    .is('sensitivity_db_mw', null)
    .is('sensitivity_db_v', null)
    .order('brand');

  // Tier 1: Major brands with easy-to-find specs
  const tier1Brands = [
    'Sennheiser', 'Beyerdynamic', 'Audio-Technica', 'Audio Technica',
    'Hifiman', 'HiFiMAN', 'HIFIMAN', 'Audeze', 'Focal', 'AKG',
    'Sony', 'Shure', 'Grado', 'ZMF', 'Dan Clark Audio',
    'Meze', 'Austrian Audio', 'Fostex', 'Denon',
    'Moondrop', 'FiiO', 'Shuoer', 'Letshuoer', 'LETSHUOER',
    'Truthear', 'KZ', 'CCA', 'Tin HiFi', 'Campfire Audio',
    'Westone', 'JVC', 'Final', 'Simgot', 'SIMGOT',
    '7Hz', 'Kiwi Ears', 'Thieaudio', 'ThieAudio',
    'Etymotic', 'Dunu', 'DUNU',
    'Samsung', 'Apple', 'Nothing', 'Jabra',
  ];

  const normalBrand = (b) => b.toLowerCase().replace(/[^a-z0-9]/g, '');
  const tier1Set = new Set(tier1Brands.map(normalBrand));

  const cansTier1 = cans.filter(d => tier1Set.has(normalBrand(d.brand)));
  const cansTier2 = cans.filter(d => !tier1Set.has(normalBrand(d.brand)));
  const iemsTier1 = iems.filter(d => tier1Set.has(normalBrand(d.brand)));
  const iemsTier2 = iems.filter(d => !tier1Set.has(normalBrand(d.brand)));

  console.log(JSON.stringify({
    summary: {
      totalCansMissing: cans.length,
      totalIemsMissing: iems.length,
      cansTier1: cansTier1.length,
      cansTier2: cansTier2.length,
      iemsTier1: iemsTier1.length,
      iemsTier2: iemsTier2.length,
    },
    cansTier1: cansTier1.map(d => ({ brand: d.brand, name: d.name, impedance: d.impedance, driver_type: d.driver_type, price: d.price_new })),
    cansTier2: cansTier2.map(d => ({ brand: d.brand, name: d.name, impedance: d.impedance, driver_type: d.driver_type, price: d.price_new })),
    iemsTier1: iemsTier1.map(d => ({ brand: d.brand, name: d.name, impedance: d.impedance, driver_type: d.driver_type, price: d.price_new })),
    iemsTier2: iemsTier2.map(d => ({ brand: d.brand, name: d.name, impedance: d.impedance, driver_type: d.driver_type, price: d.price_new })),
  }, null, 2));
}

run().catch(console.error);
