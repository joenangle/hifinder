/**
 * eBay API Integration for HiFinder Used Listings
 * 
 * Uses eBay Finding API to search for headphone listings and populate our database
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// eBay Finding API configuration
const EBAY_CONFIG = {
  // eBay sandbox/production endpoints
  findingEndpoint: 'https://svcs.ebay.com/services/search/FindingService/v1',
  appId: process.env.EBAY_APP_ID, // Set in environment
  globalId: 'EBAY-US',
  responseFormat: 'JSON',
  
  // Search parameters
  categoryIds: [
    '293', // Consumer Electronics > Portable Audio & Headphones
    '48446', // Consumer Electronics > Portable Audio & Headphones > Headphones
    '15052' // Musical Instruments & Gear > Pro Audio Equipment > Monitors & Headphones
  ],
  
  // Quality filters
  minFeedbackScore: 10,
  topRatedSellerOnly: false,
  condition: ['1000', '1500', '2000', '2500', '3000'], // New, Refurb, Used, Very Good, Good
  
  maxResults: 100
};

/**
 * Search eBay for a specific headphone model
 */
async function searchEbayForComponent(component) {
  if (!process.env.EBAY_APP_ID) {
    console.log('⚠️ EBAY_APP_ID not set - skipping eBay integration');
    return [];
  }
  
  const keywords = `${component.brand} ${component.name} headphones`.replace(/[^\w\s]/g, '');
  
  const params = new URLSearchParams({
    'OPERATION-NAME': 'findItemsByKeywords',
    'SERVICE-VERSION': '1.0.0',
    'SECURITY-APPNAME': process.env.EBAY_APP_ID,
    'GLOBAL-ID': EBAY_CONFIG.globalId,
    'RESPONSE-DATA-FORMAT': EBAY_CONFIG.responseFormat,
    'REST-PAYLOAD': '',
    'keywords': keywords,
    'paginationInput.entriesPerPage': EBAY_CONFIG.maxResults,
    'itemFilter(0).name': 'Condition',
    'itemFilter(0).value(0)': '1000', // New
    'itemFilter(0).value(1)': '1500', // Refurbished  
    'itemFilter(0).value(2)': '2000', // Used
    'itemFilter(0).value(3)': '2500', // Very Good
    'itemFilter(0).value(4)': '3000', // Good
    'itemFilter(1).name': 'MinFeedbackScore',
    'itemFilter(1).value': EBAY_CONFIG.minFeedbackScore,
    'itemFilter(2).name': 'ListingType',
    'itemFilter(2).value(0)': 'FixedPrice',
    'itemFilter(2).value(1)': 'Auction',
    'sortOrder': 'EndTimeSoonest'
  });

  try {
    console.log(`🔍 Searching eBay for: ${keywords}`);
    
    const response = await fetch(`${EBAY_CONFIG.findingEndpoint}?${params}`);
    
    if (!response.ok) {
      throw new Error(`eBay API error: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (data.findItemsByKeywordsResponse?.[0]?.ack?.[0] !== 'Success') {
      const errors = data.findItemsByKeywordsResponse?.[0]?.errorMessage;
      console.error('eBay API returned error:', errors);
      return [];
    }
    
    const items = data.findItemsByKeywordsResponse?.[0]?.searchResult?.[0]?.item || [];
    
    console.log(`📦 Found ${items.length} eBay listings for ${component.brand} ${component.name}`);
    
    return items.map(item => transformEbayItem(item, component));
    
  } catch (error) {
    console.error(`❌ Error searching eBay for ${component.brand} ${component.name}:`, error.message);
    return [];
  }
}

/**
 * Transform eBay item data to our UsedListing format
 */
function transformEbayItem(item, component) {
  const condition = mapEbayCondition(item.condition?.[0]?.conditionDisplayName?.[0]);
  const price = parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || 0);
  const isAuction = item.listingInfo?.[0]?.listingType?.[0] === 'Auction';
  
  // Calculate expected price for comparison
  const expectedPrice = component.price_used_min && component.price_used_max 
    ? (component.price_used_min + component.price_used_max) / 2
    : component.price_used_min || component.price_used_max || 0;
  
  const priceVariance = expectedPrice > 0 ? ((price - expectedPrice) / expectedPrice) * 100 : 0;
  const isPriceReasonable = Math.abs(priceVariance) <= 30; // Within 30% of expected
  
  let priceWarning = null;
  if (priceVariance > 30) {
    priceWarning = `Price ${Math.round(priceVariance)}% above expected range`;
  } else if (priceVariance < -30) {
    priceWarning = `Price ${Math.round(Math.abs(priceVariance))}% below expected - verify condition and authenticity`;
  }
  
  return {
    component_id: component.id,
    title: item.title?.[0] || 'eBay Listing',
    price: price,
    condition: condition,
    location: item.location?.[0] || 'Unknown',
    source: 'ebay',
    url: item.viewItemURL?.[0] || '',
    date_posted: item.listingInfo?.[0]?.startTime?.[0] || new Date().toISOString(),
    seller_username: item.sellerInfo?.[0]?.sellerUserName?.[0] || 'Unknown',
    seller_feedback_score: parseInt(item.sellerInfo?.[0]?.feedbackScore?.[0] || 0),
    seller_feedback_percentage: parseFloat(item.sellerInfo?.[0]?.positiveFeedbackPercent?.[0] || 0),
    images: item.galleryURL ? [item.galleryURL[0]] : [],
    description: item.subtitle?.[0] || null,
    is_active: true,
    price_is_reasonable: isPriceReasonable,
    price_variance_percentage: Math.round(priceVariance * 10) / 10,
    price_warning: priceWarning,
    expires_at: item.listingInfo?.[0]?.endTime?.[0] || null,
    listing_type: isAuction ? 'auction' : 'buy_it_now',
    shipping_cost: parseFloat(item.shippingInfo?.[0]?.shippingServiceCost?.[0]?.__value__ || 0),
    accepts_offers: item.listingInfo?.[0]?.bestOfferEnabled?.[0] === 'true'
  };
}

/**
 * Map eBay condition names to our standard conditions
 */
function mapEbayCondition(ebayCondition) {
  if (!ebayCondition) return 'good';
  
  const condition = ebayCondition.toLowerCase();
  
  if (condition.includes('new') || condition.includes('mint')) return 'excellent';
  if (condition.includes('excellent') || condition.includes('like new')) return 'excellent';  
  if (condition.includes('very good') || condition.includes('very fine')) return 'very_good';
  if (condition.includes('good') || condition.includes('fine')) return 'good';
  if (condition.includes('fair') || condition.includes('acceptable')) return 'fair';
  if (condition.includes('parts') || condition.includes('repair')) return 'parts_only';
  
  return 'good'; // Default fallback
}

/**
 * Save listings to database, avoiding duplicates
 */
async function saveEbayListings(listings) {
  if (listings.length === 0) return;
  
  console.log(`💾 Saving ${listings.length} eBay listings to database...`);
  
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
 * Process all headphone components for eBay listings
 */
async function processAllComponents() {
  console.log('🚀 Starting eBay integration for all headphone components...\n');
  
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
      
      const ebayListings = await searchEbayForComponent(component);
      
      if (ebayListings.length > 0) {
        await saveEbayListings(ebayListings);
        totalListings += ebayListings.length;
      }
      
      // Rate limiting: wait 1 second between API calls
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log(`\n🎉 eBay integration complete! Processed ${totalListings} listings total.`);
    
  } catch (error) {
    console.error('❌ Error in processAllComponents:', error);
  }
}

/**
 * Clean up expired eBay listings
 */
async function cleanupExpiredListings() {
  console.log('🧹 Cleaning up expired eBay listings...');
  
  const { data, error } = await supabase
    .from('used_listings')
    .delete()
    .eq('source', 'ebay')
    .lt('expires_at', new Date().toISOString())
    .select('id');
  
  if (error) {
    console.error('❌ Error cleaning up expired listings:', error);
  } else {
    console.log(`✅ Removed ${data?.length || 0} expired eBay listings`);
  }
}

// Main execution
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'cleanup') {
    cleanupExpiredListings();
  } else {
    processAllComponents();
  }
}

module.exports = {
  searchEbayForComponent,
  transformEbayItem,
  saveEbayListings,
  processAllComponents,
  cleanupExpiredListings
};