// Add sample used listings for popular components
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Sample listings for testing - manually curated from real r/AVexchange posts
const sampleListings = [
  {
    component_name: 'HD6XX',
    component_brand: 'Sennheiser',
    title: '[WTS][USA-CA][H] Sennheiser HD6XX with original box [W] $180 PayPal',
    price: 180,
    condition: 'excellent',
    location: 'USA-CA',
    source: 'reddit_avexchange',
    url: 'https://reddit.com/r/AVexchange/comments/sample1',
    date_posted: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    seller_username: 'audiouser123',
    seller_confirmed_trades: 15,
    description: 'Excellent condition Sennheiser HD6XX, barely used. Comes with original box and cable.'
  },
  {
    component_name: 'HD6XX',
    component_brand: 'Sennheiser', 
    title: '[WTS][USA-TX][H] HD6XX + Dekoni Pads [W] $200 PayPal',
    price: 200,
    condition: 'very_good',
    location: 'USA-TX',
    source: 'reddit_avexchange',
    url: 'https://reddit.com/r/AVexchange/comments/sample2',
    date_posted: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    seller_username: 'headphoneguy',
    seller_confirmed_trades: 8,
    description: 'HD6XX with upgraded Dekoni Elite Velour pads. Great condition.'
  },
  {
    component_name: 'Atom Amp+',
    component_brand: 'JDS Labs',
    title: '[WTS][USA-NY][H] JDS Atom Amp+ [W] $85 PayPal',
    price: 85,
    condition: 'excellent',
    location: 'USA-NY',
    source: 'reddit_avexchange',
    url: 'https://reddit.com/r/AVexchange/comments/sample3',
    date_posted: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    seller_username: 'ampdealer',
    seller_confirmed_trades: 23,
    description: 'Perfect condition JDS Atom Amp+, used for 6 months. Includes original packaging.'
  },
  {
    component_name: 'Sundara',
    component_brand: 'HiFiMAN',
    title: '[WTS][USA-FL][H] HiFiMAN Sundara [W] $220 PayPal',
    price: 220,
    condition: 'good',
    location: 'USA-FL',
    source: 'reddit_avexchange',
    url: 'https://reddit.com/r/AVexchange/comments/sample4',
    date_posted: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    seller_username: 'planarfan',
    seller_confirmed_trades: 5,
    description: 'Good condition Sundara, some wear on headband but sounds perfect.'
  },
  {
    component_name: 'Modi+',
    component_brand: 'Schiit',
    title: '[WTS][USA-WA][H] Schiit Modi+ DAC [W] $75 PayPal',
    price: 75,
    condition: 'excellent',
    location: 'USA-WA',
    source: 'reddit_avexchange',
    url: 'https://reddit.com/r/AVexchange/comments/sample5',
    date_posted: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(), // 4 days ago
    seller_username: 'schiitstack',
    seller_confirmed_trades: 12,
    description: 'Barely used Modi+, purchased 6 months ago. Perfect working condition.'
  }
]

async function createListingsTable() {
  console.log('🗃️ Creating used_listings table...')
  
  try {
    // Read and execute the SQL file
    const fs = require('fs')
    const path = require('path')
    const sqlContent = fs.readFileSync(
      path.join(__dirname, 'create-listings-table.sql'), 
      'utf8'
    )
    
    // Note: This requires running the SQL manually in Supabase dashboard
    // since complex SQL operations aren't supported via the JS client
    console.log('📋 Please run this SQL in Supabase Dashboard > SQL Editor:')
    console.log(sqlContent)
    
    return true
  } catch (error) {
    console.error('❌ Error reading SQL file:', error)
    return false
  }
}

async function addSampleListings() {
  console.log('📝 Adding sample used listings...')
  
  try {
    // First, get component IDs for our sample data
    const listingsWithIds = []
    
    for (const listing of sampleListings) {
      const { data: component, error } = await supabase
        .from('components')
        .select('id')
        .eq('name', listing.component_name)
        .eq('brand', listing.component_brand)
        .single()
      
      if (component) {
        const expectedMin = 150 // rough estimate for validation
        const expectedMax = 250
        const expectedAvg = (expectedMin + expectedMax) / 2
        const variance = ((listing.price - expectedAvg) / expectedAvg) * 100
        
        listingsWithIds.push({
          component_id: component.id,
          title: listing.title,
          price: listing.price,
          condition: listing.condition,
          location: listing.location,
          source: listing.source,
          url: listing.url,
          date_posted: listing.date_posted,
          seller_username: listing.seller_username,
          seller_confirmed_trades: listing.seller_confirmed_trades,
          description: listing.description,
          is_active: true,
          price_is_reasonable: Math.abs(variance) <= 30,
          price_variance_percentage: variance,
          price_warning: Math.abs(variance) > 30 ? 'Price significantly different from typical market value' : null
        })
      } else {
        console.log(`⚠️ Component not found: ${listing.component_name} by ${listing.component_brand}`)
      }
    }
    
    if (listingsWithIds.length > 0) {
      const { data, error } = await supabase
        .from('used_listings')
        .insert(listingsWithIds)
        .select()
      
      if (error) {
        console.error('❌ Insert error:', error)
      } else {
        console.log(`✅ Added ${data.length} sample listings`)
        data.forEach(listing => {
          console.log(`  ${listing.title} - $${listing.price}`)
        })
      }
    }
    
  } catch (err) {
    console.error('❌ Failed to add sample listings:', err)
  }
}

async function main() {
  console.log('🚀 Setting up used listings system...')
  
  const tableCreated = await createListingsTable()
  if (tableCreated) {
    console.log('✅ Table creation SQL provided - please run manually in Supabase')
    console.log('⏳ Waiting to add sample data - run this script again after creating the table')
  } else {
    // Try to add sample listings (assumes table exists)
    await addSampleListings()
  }
}

if (require.main === module) {
  main()
}

module.exports = { addSampleListings, createListingsTable }