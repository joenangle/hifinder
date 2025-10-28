// Add comprehensive sample listings for all our new components
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Comprehensive sample listings covering all our newly added components
const sampleListings = [
  // HIGH-END IEMs
  {
    component_name: 'U12t',
    component_brand: '64 Audio',
    title: '[WTS][USA-NY][H] 64 Audio U12t - Mint Condition [W] $1500 PayPal',
    price: 1500,
    condition: 'excellent',
    location: 'USA-NY',
    source: 'reddit_avexchange',
    url: 'https://reddit.com/r/AVexchange/comments/u12t_mint',
    seller_username: 'audiophile_nyc',
    seller_confirmed_trades: 28,
    description: 'Pristine condition U12t, barely used. Comes with all original accessories and custom cable.'
  },
  {
    component_name: 'Monarch MK4',
    component_brand: 'Thieaudio',
    title: '[WTS][USA-CA][H] Thieaudio Monarch MK4 + Case [W] $980 PayPal',
    price: 980,
    condition: 'excellent',
    location: 'USA-CA',
    source: 'reddit_avexchange',
    url: 'https://reddit.com/r/AVexchange/comments/mk4_sale',
    seller_username: 'westcoast_audio',
    seller_confirmed_trades: 15,
    description: 'Excellent condition Monarch MK4. Great all-rounder IEM. Includes original packaging.'
  },
  {
    component_name: 'RSV',
    component_brand: 'Softears',
    title: '[WTS][USA-TX][H] Softears RSV - Amazing vocals! [W] $680 PayPal',
    price: 680,
    condition: 'very_good',
    location: 'USA-TX',
    source: 'reddit_avexchange',
    url: 'https://reddit.com/r/AVexchange/comments/rsv_vocals',
    seller_username: 'texas_iem_fan',
    seller_confirmed_trades: 12,
    description: 'Very good condition RSV. The vocals on these are incredible for male artists.'
  },

  // MID-TIER IEMs
  {
    component_name: 'Arcanis',
    component_brand: 'ZIIGAAT',
    title: '[WTS][USA-FL][H] ZIIGAAT Arcanis - Best vocals under $500 [W] $380 PayPal',
    price: 380,
    condition: 'excellent',
    location: 'USA-FL',
    source: 'reddit_avexchange',
    url: 'https://reddit.com/r/AVexchange/comments/arcanis_vocals',
    seller_username: 'florida_hifi',
    seller_confirmed_trades: 9,
    description: 'Excellent condition Arcanis. These have the best female vocals under $500. Comes with all tips.'
  },
  {
    component_name: 'Studio 4',
    component_brand: 'Softears',
    title: '[WTS][USA-WA][H] Softears Studio 4 - Perfect all-rounder [W] $390 PayPal',
    price: 390,
    condition: 'very_good',
    location: 'USA-WA',
    source: 'reddit_avexchange',
    url: 'https://reddit.com/r/AVexchange/comments/studio4_perfect',
    seller_username: 'seattle_sound',
    seller_confirmed_trades: 18,
    description: 'Very good condition Studio 4. Best all-rounder under $500, perfect neutral tuning.'
  },
  {
    component_name: 'HYPE 4',
    component_brand: 'Thieaudio',
    title: '[WTS][USA-IL][H] Thieaudio HYPE 4 + Extra Cable [W] $370 PayPal',
    price: 370,
    condition: 'excellent',
    location: 'USA-IL',
    source: 'reddit_avexchange',
    url: 'https://reddit.com/r/AVexchange/comments/hype4_extra',
    seller_username: 'chicago_beats',
    seller_confirmed_trades: 7,
    description: 'Excellent HYPE 4 with extra cable. V-shaped Harman tuning, great bass texture.'
  },

  // BUDGET IEMs
  {
    component_name: 'Astral',
    component_brand: 'Kiwi Ears',
    title: '[WTS][USA-OH][H] Kiwi Ears Astral - Great all-rounder [W] $280 PayPal',
    price: 280,
    condition: 'excellent',
    location: 'USA-OH',
    source: 'reddit_avexchange',
    url: 'https://reddit.com/r/AVexchange/comments/astral_allround',
    seller_username: 'ohio_audio',
    seller_confirmed_trades: 5,
    description: 'Excellent condition Astral. Great all-rounder, slightly airy with good sub-bass.'
  },
  {
    component_name: 'SUPERMIX4',
    component_brand: 'SIMGOT',
    title: '[WTS][USA-NC][H] SIMGOT SUPERMIX4 - Endgame Harman [W] $140 PayPal',
    price: 140,
    condition: 'very_good',
    location: 'USA-NC',
    source: 'reddit_avexchange',
    url: 'https://reddit.com/r/AVexchange/comments/sm4_harman',
    seller_username: 'carolina_hifi',
    seller_confirmed_trades: 3,
    description: 'Very good SUPERMIX4. One of the smoothest IEMs, endgame Harman tuning.'
  },
  {
    component_name: 'HEXA',
    component_brand: 'Truthear',
    title: '[WTS][USA-AZ][H] Truthear HEXA + Foam Tips [W] $75 PayPal',
    price: 75,
    condition: 'good',
    location: 'USA-AZ',
    source: 'reddit_avexchange',
    url: 'https://reddit.com/r/AVexchange/comments/hexa_foam',
    seller_username: 'desert_sound',
    seller_confirmed_trades: 2,
    description: 'Good condition HEXA with foam tips. Amazing detail for the price, new benchmark under $100.'
  },

  // HIGH-END HEADPHONES
  {
    component_name: 'HD800S',
    component_brand: 'Sennheiser',
    title: '[WTS][USA-MA][H] Sennheiser HD800S - Summit-fi performance [W] $1350 PayPal',
    price: 1350,
    condition: 'excellent',
    location: 'USA-MA',
    source: 'reddit_avexchange',
    url: 'https://reddit.com/r/AVexchange/comments/hd800s_summit',
    seller_username: 'boston_audiophile',
    seller_confirmed_trades: 22,
    description: 'Excellent HD800S with original packaging. Crinacle Grade S, summit-fi performance.'
  },
  {
    component_name: 'Utopia',
    component_brand: 'Focal',
    title: '[WTS][USA-CA][H] Focal Utopia - Flagship Dynamic [W] $3200 PayPal',
    price: 3200,
    condition: 'very_good',
    location: 'USA-CA',
    source: 'reddit_avexchange',
    url: 'https://reddit.com/r/AVexchange/comments/utopia_flagship',
    seller_username: 'focal_fan_ca',
    seller_confirmed_trades: 35,
    description: 'Very good condition Focal Utopia. Exceptional sound quality, Crinacle Grade S.'
  },
  {
    component_name: 'Susvara',
    component_brand: 'HiFiMAN',
    title: '[WTS][USA-TX][H] HiFiMAN Susvara - TOTL Planar [W] $4200 PayPal',
    price: 4200,
    condition: 'excellent',
    location: 'USA-TX',
    source: 'reddit_avexchange',
    url: 'https://reddit.com/r/AVexchange/comments/susvara_totl',
    seller_username: 'planar_king',
    seller_confirmed_trades: 41,
    description: 'Excellent Susvara with original packaging. Summit-fi performance, needs good amplification.'
  },

  // MID-TIER HEADPHONES
  {
    component_name: 'HD650',
    component_brand: 'Sennheiser',
    title: '[WTS][USA-NY][H] Sennheiser HD650 - Classic Warm Sound [W] $280 PayPal',
    price: 280,
    condition: 'very_good',
    location: 'USA-NY',
    source: 'reddit_avexchange',
    url: 'https://reddit.com/r/AVexchange/comments/hd650_warm',
    seller_username: 'classic_sound_ny',
    seller_confirmed_trades: 13,
    description: 'Very good HD650. Crinacle Grade A with ★★★ value rating. Classic warm signature.'
  },
  {
    component_name: 'HD600',
    component_brand: 'Sennheiser',
    title: '[WTS][USA-WA][H] Sennheiser HD600 - Reference Standard [W] $290 PayPal',
    price: 290,
    condition: 'excellent',
    location: 'USA-WA',
    source: 'reddit_avexchange',
    url: 'https://reddit.com/r/AVexchange/comments/hd600_reference',
    seller_username: 'reference_head',
    seller_confirmed_trades: 16,
    description: 'Excellent HD600. Reference standard, Crinacle Grade A with ★★★ value rating.'
  },
  {
    component_name: 'Sundara (2020)',
    component_brand: 'HiFiMAN',
    title: '[WTS][USA-FL][H] HiFiMAN Sundara 2020 - Best Planar Value [W] $260 PayPal',
    price: 260,
    condition: 'excellent',
    location: 'USA-FL',
    source: 'reddit_avexchange',
    url: 'https://reddit.com/r/AVexchange/comments/sundara_value',
    seller_username: 'planar_florida',
    seller_confirmed_trades: 8,
    description: 'Excellent 2020 Sundara. Crinacle Grade A with ★★★ value rating. Best planar under $300.'
  },
  {
    component_name: 'Edition XS',
    component_brand: 'HiFiMAN',
    title: '[WTS][USA-OR][H] HiFiMAN Edition XS - Incredible Value [W] $280 PayPal',
    price: 280,
    condition: 'very_good',
    location: 'USA-OR',
    source: 'reddit_avexchange',
    url: 'https://reddit.com/r/AVexchange/comments/xs_value',
    seller_username: 'oregon_planar',
    seller_confirmed_trades: 6,
    description: 'Very good Edition XS. Crinacle Grade A+ with ★★★ value rating. Amazing price/performance.'
  },

  // ENTRY-LEVEL HEADPHONES
  {
    component_name: 'SHP9500',
    component_brand: 'Philips',
    title: '[WTS][USA-GA][H] Philips SHP9500 - Best Budget Open-Back [W] $55 PayPal',
    price: 55,
    condition: 'good',
    location: 'USA-GA',
    source: 'reddit_avexchange',
    url: 'https://reddit.com/r/AVexchange/comments/shp9500_budget',
    seller_username: 'budget_atlanta',
    seller_confirmed_trades: 4,
    description: 'Good condition SHP9500. Crinacle Grade B+ with ★★★ value rating. Great entry-level open-back.'
  },
  {
    component_name: 'HD58X',
    component_brand: 'Sennheiser',
    title: '[WTS][USA-MI][H] Sennheiser HD58X - Warm & Musical [W] $130 PayPal',
    price: 130,
    condition: 'very_good',
    location: 'USA-MI',
    source: 'reddit_avexchange',
    url: 'https://reddit.com/r/AVexchange/comments/hd58x_musical',
    seller_username: 'michigan_music',
    seller_confirmed_trades: 7,
    description: 'Very good HD58X. Crinacle Grade B+ with ★★ value rating. Warm and musical presentation.'
  },
  {
    component_name: 'ATH-M40x',
    component_brand: 'Audio-Technica',
    title: '[WTS][USA-CO][H] Audio-Technica ATH-M40x - Studio Monitor [W] $75 PayPal',
    price: 75,
    condition: 'excellent',
    location: 'USA-CO',
    source: 'reddit_avexchange',
    url: 'https://reddit.com/r/AVexchange/comments/m40x_studio',
    seller_username: 'colorado_studio',
    seller_confirmed_trades: 3,
    description: 'Excellent M40x. Crinacle Grade B with ★★ value rating. Great closed-back studio monitors.'
  }
]

async function addComprehensiveSampleListings() {
  console.log('📝 Adding comprehensive sample listings...')
  
  try {
    const listingsWithIds = []
    let foundCount = 0
    let notFoundCount = 0
    
    for (const listing of sampleListings) {
      console.log(`Looking for: ${listing.component_name} by ${listing.component_brand}`)
      
      const { data: component, error } = await supabase
        .from('components')
        .select('id, price_used_min, price_used_max')
        .eq('name', listing.component_name)
        .eq('brand', listing.component_brand)
        .single()
      
      if (component) {
        foundCount++
        const expectedMin = component.price_used_min || 100
        const expectedMax = component.price_used_max || 500
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
          date_posted: new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000).toISOString(), // Random within last week
          seller_username: listing.seller_username,
          seller_confirmed_trades: listing.seller_confirmed_trades,
          description: listing.description,
          is_active: true,
          price_is_reasonable: Math.abs(variance) <= 30,
          price_variance_percentage: Math.round(variance * 100) / 100,
          price_warning: Math.abs(variance) > 30 ? 'Price significantly different from typical market value' : null
        })
        console.log(`  ✅ Found component: ${listing.component_name}`)
      } else {
        notFoundCount++
        console.log(`  ❌ Component not found: ${listing.component_name} by ${listing.component_brand}`)
      }
    }
    
    console.log(`\nSummary: Found ${foundCount} components, ${notFoundCount} not found`)
    
    if (listingsWithIds.length > 0) {
      // Try to insert the listings
      const { data, error } = await supabase
        .from('used_listings')
        .insert(listingsWithIds)
        .select()
      
      if (error) {
        console.error('❌ Insert error:', error)
        
        if (error.message?.includes('relation "used_listings" does not exist')) {
          console.log('\n📋 The used_listings table needs to be created first.')
          console.log('Please run this SQL in Supabase Dashboard > SQL Editor:')
          console.log('\n' + '='.repeat(80))
          console.log(`
CREATE TABLE used_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  component_id UUID REFERENCES components(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  price INTEGER NOT NULL,
  condition TEXT CHECK (condition IN ('excellent', 'very_good', 'good', 'fair', 'parts_only')),
  location TEXT,
  source TEXT CHECK (source IN ('reddit_avexchange', 'ebay', 'head_fi', 'usaudiomart', 'manual')),
  url TEXT NOT NULL,
  date_posted TIMESTAMPTZ NOT NULL,
  seller_username TEXT NOT NULL,
  seller_confirmed_trades INTEGER,
  seller_feedback_score INTEGER,
  seller_feedback_percentage INTEGER,
  images TEXT[],
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  price_is_reasonable BOOLEAN DEFAULT true,
  price_variance_percentage DECIMAL,
  price_warning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX used_listings_component_id_idx ON used_listings(component_id);
CREATE INDEX used_listings_is_active_idx ON used_listings(is_active);
CREATE INDEX used_listings_date_posted_idx ON used_listings(date_posted DESC);
CREATE INDEX used_listings_price_idx ON used_listings(price);`)
          console.log('='.repeat(80))
          console.log('\nThen run this script again to add sample data.')
        }
      } else {
        console.log(`\n✅ Successfully added ${data.length} comprehensive sample listings!`)
        data.forEach(listing => {
          console.log(`  ${listing.title.substring(0, 70)}... - $${listing.price}`)
        })
        
        console.log('\n🎉 Used market search should now show real listings!')
        console.log('💡 Visit your recommendations page to see the listings in action.')
      }
    } else {
      console.log('\n❌ No matching components found. Make sure you\'ve run the IEM and headphone import scripts first.')
    }
    
  } catch (err) {
    console.error('❌ Failed to add comprehensive sample listings:', err)
  }
}

if (require.main === module) {
  addComprehensiveSampleListings()
}

module.exports = { addComprehensiveSampleListings }