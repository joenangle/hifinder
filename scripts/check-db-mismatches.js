require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  // Find the HD600 listing and see what it's actually matched to
  const { data: hd600Listing } = await supabase
    .from('used_listings')
    .select('*, components (brand, name, price_new)')
    .ilike('title', '%HD600%')
    .order('date_posted', { ascending: false })
    .limit(1)
    .single();
    
  console.log('HD600 LISTING:');
  console.log('Title:', hd600Listing?.title);
  console.log('Price:', hd600Listing?.price);
  console.log('Component ID:', hd600Listing?.component_id);
  console.log('Matched to:', hd600Listing?.components?.brand, hd600Listing?.components?.name);
  console.log('Component Price:', hd600Listing?.components?.price_new);
  
  // Check when this was last updated
  console.log('\nDate Posted:', hd600Listing?.date_posted);
  console.log('Updated At:', hd600Listing?.updated_at);
  
  // Get the actual HD600 component ID
  const { data: correctHD600 } = await supabase
    .from('components')
    .select('id, name, brand')
    .eq('name', 'HD600')
    .eq('brand', 'Sennheiser')
    .single();
    
  console.log('\nCORRECT HD600 COMPONENT:');
  console.log('ID:', correctHD600?.id);
  console.log('Name:', correctHD600?.brand, correctHD600?.name);
  
  // Get HE-1 component ID
  const { data: he1 } = await supabase
    .from('components')
    .select('id, name, brand')
    .eq('name', 'HE-1')
    .eq('brand', 'Sennheiser')
    .single();
    
  console.log('\nHE-1 COMPONENT (WRONG MATCH):');
  console.log('ID:', he1?.id);
  console.log('Name:', he1?.brand, he1?.name);
  
  console.log('\nDoes listing match HE-1?', hd600Listing?.component_id === he1?.id);
  console.log('Does listing match HD600?', hd600Listing?.component_id === correctHD600?.id);
})();
