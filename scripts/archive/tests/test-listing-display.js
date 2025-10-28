/**
 * Test script to add sample listings from all sources for display testing
 * This creates realistic test data to validate our multi-source integration
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Sample test listings for different sources
const testListings = [
  // eBay listings
  {
    component_id: '550e8400-e29b-41d4-a716-446655440000', // HD 600 id (if exists)
    title: 'Sennheiser HD 600 Professional Headphones - Excellent Condition',
    price: 285,
    condition: 'excellent',
    location: 'California, US',
    source: 'ebay',
    url: 'https://ebay.com/sample/hd600-1',
    date_posted: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    seller_username: 'audiogeek_ca',
    seller_feedback_score: 1247,
    seller_feedback_percentage: 99.2,
    images: ['https://example.com/hd600-1.jpg'],
    description: 'Barely used, adult owned, includes original box and cable.',
    is_active: true,
    price_is_reasonable: true,
    price_variance_percentage: -5.2,
    listing_type: 'buy_it_now',
    shipping_cost: 12.99,
    accepts_offers: true,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
  },
  
  // Head-Fi listing
  {
    component_id: '550e8400-e29b-41d4-a716-446655440000', // HD 600
    title: 'FS: Sennheiser HD600 - Mint condition, $320 shipped',
    price: 320,
    condition: 'excellent',
    location: 'NY, USA',
    source: 'head_fi',
    url: 'https://head-fi.org/sample/hd600-sale',
    date_posted: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    seller_username: 'HeadFiUser123',
    seller_confirmed_trades: 15,
    seller_feedback_score: 0,
    seller_feedback_percentage: 0,
    images: [],
    description: 'Excellent condition HD600, used maybe 20 hours total. No pets, no smoking.',
    is_active: true,
    price_is_reasonable: true,
    price_variance_percentage: 6.8,
    listing_type: 'buy_it_now',
    accepts_offers: true
  },
  
  // Reverb listing
  {
    component_id: '550e8400-e29b-41d4-a716-446655440000', // HD 600
    title: 'Sennheiser HD 600 Reference Class Headphones',
    price: 349,
    condition: 'very_good',
    location: 'Texas, US',
    source: 'reverb',
    url: 'https://reverb.com/sample/hd600-reverb',
    date_posted: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    seller_username: 'AudioStudio_TX',
    seller_feedback_score: 432,
    seller_feedback_percentage: 98.8,
    images: ['https://example.com/reverb-hd600.jpg'],
    description: 'Used in professional studio environment. Some wear on headband.',
    is_active: true,
    price_is_reasonable: false,
    price_variance_percentage: 16.3,
    price_warning: 'Price 16% above expected range',
    listing_type: 'buy_it_now',
    shipping_cost: 15.00,
    accepts_offers: false
  },
  
  // Additional test listings for other popular headphones
  {
    component_id: '12345678-1234-1234-1234-123456789abc', // Placeholder for another headphone
    title: '[WTS][US-CA][H] Beyerdynamic DT 770 Pro 250Ω [W] $120 shipped',
    price: 120,
    condition: 'good',
    location: 'CA, US',
    source: 'reddit_avexchange',
    url: 'https://reddit.com/r/avexchange/sample/dt770',
    date_posted: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(), // 4 hours ago
    seller_username: 'redditor_ca',
    seller_confirmed_trades: 8,
    seller_feedback_score: 0,
    seller_feedback_percentage: 0,
    images: [],
    description: 'Good condition, used for gaming mostly. Light wear on headband.',
    is_active: true,
    price_is_reasonable: true,
    price_variance_percentage: -8.5,
    listing_type: 'buy_it_now',
    accepts_offers: true
  },
  
  {
    component_id: '12345678-1234-1234-1234-123456789abc',
    title: 'Beyerdynamic DT770 Pro Studio Headphones 250 ohm',
    price: 135,
    condition: 'excellent',
    location: 'Florida, US',
    source: 'ebay',
    url: 'https://ebay.com/sample/dt770-1',
    date_posted: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(), // 6 hours ago
    seller_username: 'studio_gear_fl',
    seller_feedback_score: 892,
    seller_feedback_percentage: 99.7,
    images: ['https://example.com/dt770-ebay.jpg'],
    description: 'Mint condition, adult owned, no smoking household.',
    is_active: true,
    price_is_reasonable: true,
    price_variance_percentage: 3.1,
    listing_type: 'buy_it_now',
    shipping_cost: 8.99,
    accepts_offers: false,
    expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
  }
];

async function addTestListings() {
  console.log('🧪 Adding test listings for multi-source display testing...\n');
  
  try {
    // First, get actual component IDs from the database
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
      console.log(`${i + 1}. ${comp.brand} ${comp.name} (${comp.id})`);
    });
    
    if (components.length === 0) {
      console.error('❌ No components found to attach listings to');
      return;
    }
    
    // Update test listings with real component IDs
    const updatedTestListings = testListings.map((listing, index) => ({
      ...listing,
      component_id: components[Math.min(index % components.length, components.length - 1)].id
    }));
    
    console.log(`\n💾 Inserting ${updatedTestListings.length} test listings...`);
    
    for (const listing of updatedTestListings) {
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
      
      console.log('\n📊 Final listing counts by source:');
      Object.entries(sourceStats).forEach(([source, count]) => {
        console.log(`  ${source}: ${count} active listings`);
      });
    }
    
    console.log('\n🎉 Test listings added successfully!');
    console.log('Visit http://localhost:3001/recommendations to test the multi-source display');
    
  } catch (error) {
    console.error('❌ Error adding test listings:', error);
  }
}

if (require.main === module) {
  addTestListings();
}

module.exports = { addTestListings };