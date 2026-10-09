const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BRAND_ALIASES = {
  'sennheiser': ['senn', 'hd'],
  'hifiman': ['he', 'hifi', 'hifi man']
};

// Check the components with HE in their name
(async () => {
  const { data: components } = await supabase
    .from('components')
    .select('*')
    .or('brand.ilike.%hifi%,name.ilike.%he%');
  
  console.log('Components with HE in name or HiFi brand:');
  components?.forEach(c => {
    console.log(`  ${c.brand} ${c.name} - Price: $${c.price_new}`);
  });
  
  console.log('\n\nTesting HD600 matching:');
  const text = '[wts] [usa-ca] [h] sennheiser hd600 [w] paypal, local cash';
  console.log('Text:', text);
  console.log('Contains "sennheiser":', text.includes('sennheiser'));
  console.log('Contains "hd":', text.includes('hd'));
  
  // Check if HE-1 would match via "hd" alias
  const he1 = components?.find(c => c.brand === 'Sennheiser' && c.name === 'HE-1');
  if (he1) {
    console.log('\nHE-1 details:', he1.brand, he1.name);
    console.log('Would match via sennheiser brand alias "hd"');
    console.log('HE-1 name lowercase:', he1.name.toLowerCase());
    console.log('Model numbers in "he-1":', he1.name.toLowerCase().match(/\b([a-z]{1,4})?(\d{2,4})([a-z]{0,3})?\b/gi));
  }
})();
