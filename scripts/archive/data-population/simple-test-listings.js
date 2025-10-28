/**
 * Simple test to add basic multi-source listings using existing schema
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Simple test listings using only existing schema fields
const testListings = [
  {
    title: 'Sennheiser HD 600 Professional Headphones - Excellent Condition',
    price: 285,
    condition: 'excellent',
    location: 'California, US',
    source: 'ebay',
    url: 'https://ebay.com/sample/hd600-test-1',
    date_posted: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    seller_username: 'audiogeek_ca',
    description: 'Barely used, adult owned, includes original box and cable.',
    is_active: true,
    price_is_reasonable: true,
    price_variance_percentage: -5.2
  },
  
  {
    title: 'FS: Sennheiser HD600 - Mint condition, $320 shipped',
    price: 320,
    condition: 'excellent',
    location: 'NY, USA',
    source: 'head_fi',
    url: 'https://head-fi.org/sample/hd600-test-sale',
    date_posted: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    seller_username: 'HeadFiUser123',
    description: 'Excellent condition HD600, used maybe 20 hours total.',
    is_active: true,
    price_is_reasonable: true,
    price_variance_percentage: 6.8
  },
  
  {
    title: 'Sennheiser HD 600 Reference Class Headphones',
    price: 349,
    condition: 'very_good',
    location: 'Texas, US',
    source: 'reverb',
    url: 'https://reverb.com/sample/hd600-test-reverb',
    date_posted: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    seller_username: 'AudioStudio_TX',
    description: 'Used in professional studio environment.',
    is_active: true,
    price_is_reasonable: false,
    price_variance_percentage: 16.3,
    price_warning: 'Price 16% above expected range'
  },
  
  {
    title: 'Beyerdynamic DT770 Pro Studio Headphones 250 ohm - Like New',
    price: 135,
    condition: 'excellent',
    location: 'Florida, US',
    source: 'ebay',
    url: 'https://ebay.com/sample/dt770-test-1',
    date_posted: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    seller_username: 'studio_gear_fl',
    description: 'Mint condition, adult owned, no smoking household.',
    is_active: true,
    price_is_reasonable: true,
    price_variance_percentage: 3.1
  },
  
  {
    title: '[WTS][US-WA][H] Focal Clear OG - Pristine [W] $850 PayPal',
    price: 850,
    condition: 'excellent', 
    location: 'WA, US',
    source: 'reddit_avexchange',
    url: 'https://reddit.com/r/avexchange/sample/focal-clear-test',
    date_posted: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    seller_username: 'audiophile_wa',
    description: 'Pristine condition, barely used. Original box and accessories.',
    is_active: true,
    price_is_reasonable: true,
    price_variance_percentage: -2.1
  }
];

async function addSimpleTestListings() {
  console.log('🧪 Adding simple test listings for multi-source display...\n');
  
  try {
    // Get actual component IDs
    const { data: components, error: componentsError } = await supabase
      .from('components')
      .select('id, name, brand')
      .in('category', ['cans', 'iems'])
      .limit(5);
    
    if (componentsError) {
      console.error('❌ Error fetching components:', componentsError);
      return;
    }
    
    console.log('📋 Available components for testing:');
    components.forEach((comp, i) => {
      console.log(`${i + 1}. ${comp.brand} ${comp.name}`);
    });
    
    let addedCount = 0;
    
    for (let i = 0; i < testListings.length; i++) {
      const listing = {
        ...testListings[i],
        component_id: components[i % components.length].id
      };
      
      // Check if listing already exists
      const { data: existing } = await supabase
        .from('used_listings')
        .select('id')
        .eq('url', listing.url)
        .single();
      
      if (existing) {
        console.log(`⏭️ Skipping existing: ${listing.title.substring(0, 50)}...`);
        continue;
      }
      
      // Insert listing
      const { error: insertError } = await supabase
        .from('used_listings')
        .insert([listing]);
      
      if (insertError) {
        console.error(`❌ Error inserting ${listing.title}:`, insertError.message);
      } else {
        console.log(`✅ Added [${listing.source}] ${listing.title.substring(0, 60)}... - $${listing.price}`);
        addedCount++;
      }
    }
    
    // Get final counts
    const { data: finalStats } = await supabase
      .from('used_listings')
      .select('source, is_active')
      .eq('is_active', true);
    
    if (finalStats) {
      const sourceStats = finalStats.reduce((acc, listing) => {
        const source = listing.source;
        acc[source] = (acc[source] || 0) + 1;
        return acc;
      }, {});
      
      console.log('\n📊 Final active listing counts:');
      Object.entries(sourceStats).forEach(([source, count]) => {
        console.log(`  ${source}: ${count} listings`);
      });
      
      console.log(`\nTotal active listings: ${finalStats.length}`);
    }
    
    console.log(`\n🎉 Added ${addedCount} new test listings!`);
    
  } catch (error) {
    console.error('❌ Error adding test listings:', error);
  }
}

if (require.main === module) {
  addSimpleTestListings();
}