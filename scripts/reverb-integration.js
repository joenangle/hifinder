/**
 * Reverb API Integration for HiFinder Used Listings
 * 
 * Uses Reverb API to search for headphone listings and populate our database
 * Reverb is primarily for musical instruments but has a growing pro audio section
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Reverb API configuration
const REVERB_CONFIG = {
  apiUrl: 'https://reverb.com/api',
  
  // Authentication - Reverb requires API key
  headers: {
    'Accept': 'application/hal+json',
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.REVERB_API_TOKEN}`, // Set in environment
    'User-Agent': 'HiFinder-UsedListingAggregator/1.0'
  },
  
  // Search parameters optimized for headphones/audio gear
  searchParams: {
    per_page: 50, // Max results per request
    page: 1,
    item_region: 'US', // Focus on US listings
    condition: ['mint', 'excellent', 'very-good', 'good', 'fair'], 
    category: 'pro-audio-equipment', // Main category for headphones on Reverb
    subcategory: 'headphones', // More specific
    price_min: 25, // Filter out obvious junk
    price_max: 5000, // Reasonable headphone ceiling
    handmade: false, // Focus on commercial products
    sort: 'created_at' // Newest first
  },
  
  maxPages: 2, // Limit API calls
  rateLimit: 1000 // 1 second between calls
};

/**
 * Search Reverb for a specific headphone component
 */
async function searchReverbForComponent(component) {
  if (!process.env.REVERB_API_TOKEN) {
    console.log('⚠️ REVERB_API_TOKEN not set - skipping Reverb integration');
    return [];
  }
  
  console.log(`🔍 Searching Reverb for: ${component.brand} ${component.name}`);
  
  try {
    const query = `${component.brand} ${component.name}`.replace(/[^\w\s]/g, '');
    
    const params = new URLSearchParams({
      query: query,
      per_page: REVERB_CONFIG.searchParams.per_page,
      page: REVERB_CONFIG.searchParams.page,
      item_region: REVERB_CONFIG.searchParams.item_region,
      'condition[]': REVERB_CONFIG.searchParams.condition.join(','),
      category: REVERB_CONFIG.searchParams.category,
      price_min: REVERB_CONFIG.searchParams.price_min,
      price_max: REVERB_CONFIG.searchParams.price_max,
      sort: REVERB_CONFIG.searchParams.sort
    });
    
    const url = `${REVERB_CONFIG.apiUrl}/listings?${params}`;
    
    console.log(`📡 Fetching: ${url}`);
    
    const response = await fetch(url, {
      headers: REVERB_CONFIG.headers
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        console.error('❌ Unauthorized - check REVERB_API_TOKEN');
        return [];
      } else if (response.status === 429) {
        console.warn('⚠️ Rate limited by Reverb API - waiting...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        return [];
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.listings || !Array.isArray(data.listings)) {
      console.warn('⚠️ Unexpected Reverb API response format');
      return [];
    }
    
    const listings = data.listings
      .filter(listing => isRelevantListing(listing, component))
      .map(listing => transformReverbListing(listing, component));
    
    console.log(`📦 Found ${listings.length} relevant Reverb listings for ${component.brand} ${component.name}`);
    
    return listings;
    
  } catch (error) {
    console.error(`❌ Error searching Reverb for ${component.brand} ${component.name}:`, error.message);
    return [];
  }
}

/**
 * Check if Reverb listing is relevant to our component
 */
function isRelevantListing(listing, component) {
  const title = listing.title?.toLowerCase() || '';
  const description = listing.description?.toLowerCase() || '';
  const brand = component.brand.toLowerCase();
  const name = component.name.toLowerCase();
  
  // Must contain brand name
  if (!title.includes(brand) && !description.includes(brand)) {
    return false;
  }
  
  // For specific model names, be more strict
  const modelWords = name.split(' ').filter(word => word.length > 2);
  const hasModelMatch = modelWords.some(word => 
    title.includes(word.toLowerCase()) || description.includes(word.toLowerCase())
  );
  
  if (modelWords.length > 0 && !hasModelMatch) {
    return false;
  }
  
  // Filter out obvious non-headphone items
  const audioKeywords = ['headphone', 'headset', 'earphone', 'iem', 'monitor', 'driver'];
  const hasAudioKeyword = audioKeywords.some(keyword => 
    title.includes(keyword) || description.includes(keyword)
  );
  
  if (!hasAudioKeyword) {
    return false;
  }
  
  return true;
}

/**
 * Transform Reverb listing data to our UsedListing format
 */
function transformReverbListing(listing, component) {
  const price = parseFloat(listing.price?.amount || 0);
  const condition = mapReverbCondition(listing.condition?.slug || 'good');
  
  // Calculate price metrics
  const expectedPrice = component.price_used_min && component.price_used_max 
    ? (component.price_used_min + component.price_used_max) / 2
    : component.price_used_min || component.price_used_max || 0;
  
  const priceVariance = expectedPrice > 0 ? ((price - expectedPrice) / expectedPrice) * 100 : 0;
  const isPriceReasonable = Math.abs(priceVariance) <= 40; // Reverb tends to have higher prices
  
  let priceWarning = null;
  if (priceVariance > 40) {
    priceWarning = `Price ${Math.round(priceVariance)}% above expected range`;
  } else if (priceVariance < -40) {
    priceWarning = `Price ${Math.round(Math.abs(priceVariance))}% below expected - verify authenticity`;
  }
  
  // Extract location from seller info
  let location = 'Unknown';
  if (listing.seller?.location?.region && listing.seller?.location?.country_code) {
    location = `${listing.seller.location.region}, ${listing.seller.location.country_code}`;
  }
  
  return {
    component_id: component.id,
    title: listing.title || 'Reverb Listing',
    price: price,
    condition: condition,
    location: location,
    source: 'reverb',
    url: listing._links?.web?.href || `https://reverb.com/item/${listing.id}`,
    date_posted: listing.created_at || new Date().toISOString(),
    seller_username: listing.seller?.username || 'Unknown',
    seller_confirmed_trades: 0, // Reverb doesn't expose trade counts in API
    seller_feedback_score: parseInt(listing.seller?.feedback_count || 0),
    seller_feedback_percentage: parseFloat(listing.seller?.feedback_positive_percentage || 0),
    images: listing.photos ? listing.photos.slice(0, 5).map(photo => photo._links?.large?.href).filter(Boolean) : [],
    description: listing.description || null,
    is_active: listing.state === 'live',
    price_is_reasonable: isPriceReasonable,
    price_variance_percentage: Math.round(priceVariance * 10) / 10,
    price_warning: priceWarning,
    expires_at: null, // Reverb listings don't have explicit expiration
    listing_type: 'buy_it_now', // Reverb is primarily fixed-price
    shipping_cost: parseFloat(listing.shipping?.initial || 0),
    accepts_offers: listing.offers_enabled === true
  };
}

/**
 * Map Reverb condition slugs to our standard conditions
 */
function mapReverbCondition(reverbCondition) {
  const conditionMap = {
    'mint': 'excellent',
    'excellent': 'excellent',
    'very-good': 'very_good',
    'good': 'good',
    'fair': 'fair',
    'poor': 'parts_only',
    'non-functioning': 'parts_only'
  };
  
  return conditionMap[reverbCondition] || 'good';
}

/**
 * Save Reverb listings to database
 */
async function saveReverbListings(listings) {
  if (listings.length === 0) return;
  
  console.log(`💾 Saving ${listings.length} Reverb listings to database...`);
  
  for (const listing of listings) {
    try {
      // Check if this exact listing already exists (by URL)
      const { data: existing } = await supabase
        .from('used_listings')
        .select('id')
        .eq('url', listing.url)
        .single();
      
      if (existing) {
        console.log(`⏭️ Skipping duplicate listing: ${listing.title.substring(0, 50)}...`);
        continue;
      }
      
      // Insert new listing
      const { error } = await supabase
        .from('used_listings')
        .insert([listing]);
      
      if (error) {
        console.error(`❌ Error saving listing "${listing.title}":`, error.message);
      } else {
        console.log(`✅ Saved: ${listing.title.substring(0, 60)}... - $${listing.price}`);
      }
      
    } catch (err) {
      console.error(`❌ Exception saving listing:`, err.message);
    }
  }
}

/**
 * Process all headphone components for Reverb listings  
 */
async function processAllComponents() {
  console.log('🚀 Starting Reverb integration for all headphone components...\n');
  
  try {
    // Get all headphone components
    const { data: components, error } = await supabase
      .from('components')
      .select('id, name, brand, category, price_used_min, price_used_max')
      .in('category', ['cans', 'iems'])
      .order('brand, name');
    
    if (error) {
      console.error('❌ Error fetching components:', error);
      return;
    }
    
    console.log(`📋 Processing ${components.length} headphone components...\n`);
    
    let totalListings = 0;
    
    for (const [index, component] of components.entries()) {
      console.log(`\n--- Processing ${index + 1}/${components.length}: ${component.brand} ${component.name} ---`);
      
      const reverbListings = await searchReverbForComponent(component);
      
      if (reverbListings.length > 0) {
        await saveReverbListings(reverbListings);
        totalListings += reverbListings.length;
      }
      
      // Rate limiting: respect Reverb API limits
      await new Promise(resolve => setTimeout(resolve, REVERB_CONFIG.rateLimit));
    }
    
    console.log(`\n🎉 Reverb integration complete! Processed ${totalListings} listings total.`);
    
  } catch (error) {
    console.error('❌ Error in processAllComponents:', error);
  }
}

/**
 * Get Reverb API status and rate limit info
 */
async function getReverbApiStatus() {
  if (!process.env.REVERB_API_TOKEN) {
    console.log('⚠️ REVERB_API_TOKEN not set');
    return;
  }
  
  try {
    const response = await fetch(`${REVERB_CONFIG.apiUrl}/my/account`, {
      headers: REVERB_CONFIG.headers
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Reverb API connection successful');
      console.log(`User: ${data.display_name || 'Unknown'}`);
      
      // Check rate limits from headers
      const remaining = response.headers.get('X-RateLimit-Remaining');
      const limit = response.headers.get('X-RateLimit-Limit');
      if (remaining && limit) {
        console.log(`Rate limit: ${remaining}/${limit} remaining`);
      }
    } else {
      console.error(`❌ Reverb API error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('❌ Error checking Reverb API status:', error.message);
  }
}

// Main execution
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'status') {
    getReverbApiStatus();
  } else {
    processAllComponents();
  }
}

module.exports = {
  searchReverbForComponent,
  transformReverbListing,
  saveReverbListings,
  processAllComponents,
  getReverbApiStatus
};