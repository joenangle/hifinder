/**
 * Head-Fi Marketplace Scraper for HiFinder Used Listings
 * 
 * Scrapes Head-Fi marketplace for headphone listings and populates our database
 * Head-Fi doesn't have a public API, so this uses web scraping
 */

const { createClient } = require('@supabase/supabase-js');
const { JSDOM } = require('jsdom');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Head-Fi marketplace configuration
const HEADFI_CONFIG = {
  baseUrl: 'https://www.head-fi.org',
  marketplaceUrl: 'https://www.head-fi.org/forums/headphones-for-sale-trade.6/',
  searchUrl: 'https://www.head-fi.org/search/',
  
  // Request headers to appear like a real browser
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1'
  },
  
  maxPages: 3, // Limit scraping to first 3 pages
  delayBetweenRequests: 2000, // 2 second delay to be respectful
};

/**
 * Search Head-Fi marketplace for a specific component
 */
async function searchHeadFiForComponent(component) {
  console.log(`🔍 Searching Head-Fi for: ${component.brand} ${component.name}`);
  
  try {
    const searchQuery = `${component.brand} ${component.name}`.replace(/[^\w\s]/g, '');
    const searchParams = new URLSearchParams({
      'keywords': searchQuery,
      'c[node]': '6', // Headphones for Sale/Trade forum
      'o': 'date' // Sort by date
    });
    
    const searchUrl = `${HEADFI_CONFIG.searchUrl}?${searchParams}`;
    
    console.log(`📡 Fetching: ${searchUrl}`);
    
    const response = await fetch(searchUrl, {
      headers: HEADFI_CONFIG.headers,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const html = await response.text();
    const listings = parseHeadFiSearchResults(html, component);
    
    console.log(`📦 Found ${listings.length} Head-Fi listings for ${component.brand} ${component.name}`);
    
    return listings;
    
  } catch (error) {
    console.error(`❌ Error searching Head-Fi for ${component.brand} ${component.name}:`, error.message);
    return [];
  }
}

/**
 * Parse Head-Fi search results HTML
 */
function parseHeadFiSearchResults(html, component) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  const listings = [];
  
  // Head-Fi search results are in .block-row elements
  const searchResults = document.querySelectorAll('.block-row, .structItem-title');
  
  for (const result of searchResults) {
    try {
      const titleElement = result.querySelector('a[data-tp-primary="on"], .structItem-title a');
      const title = titleElement?.textContent?.trim();
      const url = titleElement?.href;
      
      if (!title || !url) continue;
      
      // Filter out non-sale posts (reviews, discussions, etc.)
      if (!isSaleListing(title)) continue;
      
      // Extract basic info from title
      const listingInfo = extractListingInfoFromTitle(title);
      
      // Get additional metadata if available
      const metaElement = result.querySelector('.structItem-minor, .listBlock-extra');
      const dateElement = metaElement?.querySelector('time, .DateTime');
      const authorElement = result.querySelector('.username, .structItem-minor a');
      
      const listing = {
        component_id: component.id,
        title: title,
        price: listingInfo.price || 0,
        condition: listingInfo.condition || 'good',
        location: listingInfo.location || 'Unknown',
        source: 'head_fi',
        url: url.startsWith('http') ? url : `${HEADFI_CONFIG.baseUrl}${url}`,
        date_posted: extractDate(dateElement?.textContent || dateElement?.getAttribute('datetime')) || new Date().toISOString(),
        seller_username: authorElement?.textContent?.trim() || 'Unknown',
        seller_confirmed_trades: 0, // Head-Fi doesn't show trade counts in search
        seller_feedback_score: 0,
        seller_feedback_percentage: 0,
        images: [],
        description: null,
        is_active: true,
        price_is_reasonable: validatePrice(listingInfo.price, component),
        price_variance_percentage: calculatePriceVariance(listingInfo.price, component),
        listing_type: listingInfo.isBundle ? 'bundle' : 'buy_it_now',
        accepts_offers: listingInfo.acceptsOffers
      };
      
      // Add price warning if needed
      if (Math.abs(listing.price_variance_percentage) > 30) {
        listing.price_warning = listing.price_variance_percentage > 0 
          ? `Price ${Math.round(listing.price_variance_percentage)}% above expected range`
          : `Price ${Math.round(Math.abs(listing.price_variance_percentage))}% below expected - verify condition`;
      }
      
      listings.push(listing);
      
    } catch (error) {
      console.warn('⚠️ Error parsing Head-Fi listing:', error.message);
      continue;
    }
  }
  
  return listings;
}

/**
 * Check if title indicates a sale listing (vs discussion/review)
 */
function isSaleListing(title) {
  const saleKeywords = [
    'fs:', 'for sale', 'selling', '$', 'price', 'shipped', 'obo', 'or best offer',
    'wts:', 'want to sell', 'sold', 'sale pending', 'mint', 'excellent', 'good condition'
  ];
  
  const titleLower = title.toLowerCase();
  
  return saleKeywords.some(keyword => titleLower.includes(keyword)) ||
         /\$\d+/.test(title) || // Contains price like $200
         /\d+\s*usd/.test(titleLower); // Contains "USD" pricing
}

/**
 * Extract price, condition, and other info from Head-Fi listing title
 */
function extractListingInfoFromTitle(title) {
  const info = {
    price: null,
    condition: 'good',
    location: null,
    isBundle: false,
    acceptsOffers: false
  };
  
  // Price extraction - various formats
  const pricePatterns = [
    /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g, // $500, $1,200.00
    /(\d+)\s*usd/gi, // 500 USD
    /price[:\s]*\$?(\d+)/gi, // Price: $500, Price 500
  ];
  
  for (const pattern of pricePatterns) {
    const match = title.match(pattern);
    if (match) {
      const price = parseFloat(match[1]?.replace(/,/g, '') || match[0]?.replace(/[^\d.]/g, ''));
      if (price > 0 && price < 10000) { // Reasonable headphone price range
        info.price = price;
        break;
      }
    }
  }
  
  // Condition extraction
  const conditionMap = {
    'mint': 'excellent',
    'excellent': 'excellent', 
    'very good': 'very_good',
    'good': 'good',
    'fair': 'fair',
    'parts': 'parts_only',
    'repair': 'parts_only'
  };
  
  for (const [keyword, condition] of Object.entries(conditionMap)) {
    if (title.toLowerCase().includes(keyword)) {
      info.condition = condition;
      break;
    }
  }
  
  // Check for bundle or multiple items
  info.isBundle = /bundle|lot|pair|set/i.test(title);
  
  // Check if accepts offers
  info.acceptsOffers = /obo|best offer|offers/i.test(title);
  
  return info;
}

/**
 * Extract and normalize date from Head-Fi date string
 */
function extractDate(dateStr) {
  if (!dateStr) return null;
  
  try {
    // Handle various Head-Fi date formats
    const cleanDate = dateStr.replace(/at\s+/i, '').trim();
    const date = new Date(cleanDate);
    
    if (isNaN(date.getTime())) {
      // Try relative dates like "2 hours ago", "Yesterday"
      const now = new Date();
      
      if (/yesterday/i.test(dateStr)) {
        return new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
      } else if (/(\d+)\s*hours?\s*ago/i.test(dateStr)) {
        const hours = parseInt(dateStr.match(/(\d+)\s*hours?\s*ago/i)[1]);
        return new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
      } else if (/(\d+)\s*days?\s*ago/i.test(dateStr)) {
        const days = parseInt(dateStr.match(/(\d+)\s*days?\s*ago/i)[1]);
        return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
      }
      
      return null;
    }
    
    return date.toISOString();
    
  } catch (error) {
    return null;
  }
}

/**
 * Validate if price is reasonable compared to expected range
 */
function validatePrice(price, component) {
  if (!price || price <= 0) return false;
  
  const expectedPrice = component.price_used_min && component.price_used_max 
    ? (component.price_used_min + component.price_used_max) / 2
    : component.price_used_min || component.price_used_max || 0;
  
  if (expectedPrice === 0) return true; // No price data to compare against
  
  const variance = Math.abs((price - expectedPrice) / expectedPrice) * 100;
  return variance <= 50; // Allow 50% variance for Head-Fi (more flexible than eBay)
}

/**
 * Calculate price variance percentage
 */
function calculatePriceVariance(price, component) {
  if (!price || price <= 0) return 0;
  
  const expectedPrice = component.price_used_min && component.price_used_max 
    ? (component.price_used_min + component.price_used_max) / 2
    : component.price_used_min || component.price_used_max || 0;
  
  if (expectedPrice === 0) return 0;
  
  return Math.round(((price - expectedPrice) / expectedPrice) * 100 * 10) / 10;
}

/**
 * Save Head-Fi listings to database
 */
async function saveHeadFiListings(listings) {
  if (listings.length === 0) return;
  
  console.log(`💾 Saving ${listings.length} Head-Fi listings to database...`);
  
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
        const price = listing.price > 0 ? `$${listing.price}` : 'No price';
        console.log(`✅ Saved: ${listing.title.substring(0, 60)}... - ${price}`);
      }
      
    } catch (err) {
      console.error(`❌ Exception saving listing:`, err.message);
    }
  }
}

/**
 * Process all headphone components for Head-Fi listings
 */
async function processAllComponents() {
  console.log('🚀 Starting Head-Fi scraper for all headphone components...\n');
  
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
      
      const headFiListings = await searchHeadFiForComponent(component);
      
      if (headFiListings.length > 0) {
        await saveHeadFiListings(headFiListings);
        totalListings += headFiListings.length;
      }
      
      // Rate limiting: wait 2 seconds between requests to be respectful
      await new Promise(resolve => setTimeout(resolve, HEADFI_CONFIG.delayBetweenRequests));
    }
    
    console.log(`\n🎉 Head-Fi scraping complete! Processed ${totalListings} listings total.`);
    
  } catch (error) {
    console.error('❌ Error in processAllComponents:', error);
  }
}

// Main execution
if (require.main === module) {
  processAllComponents();
}

module.exports = {
  searchHeadFiForComponent,
  parseHeadFiSearchResults,
  saveHeadFiListings,
  processAllComponents
};