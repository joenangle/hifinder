/**
 * Reddit r/AVExchange Scraper for HiFinder Used Listings
 * 
 * Scrapes Reddit's r/AVExchange subreddit for headphone listings
 * Uses Reddit API for better reliability and rate limiting
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Reddit API configuration
const REDDIT_CONFIG = {
  apiUrl: 'https://oauth.reddit.com',
  publicUrl: 'https://www.reddit.com',
  subreddit: 'AVExchange',
  
  // OAuth configuration for Reddit API
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  userAgent: 'HiFinder-UsedListingAggregator/1.0 (by /u/hifinder)',
  
  // Search parameters
  searchParams: {
    limit: 100, // Max posts per request
    sort: 'new', // Get newest posts
    time: 'week', // Posts from past week
    restrict_sr: true // Restrict to AVExchange subreddit only
  },
  
  rateLimit: 2000, // 2 seconds between requests per Reddit API guidelines
  maxPages: 3
};

let accessToken = null;
let tokenExpiry = null;

/**
 * Get Reddit OAuth access token
 */
async function getRedditAccessToken() {
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }
  
  if (!REDDIT_CONFIG.clientId || !REDDIT_CONFIG.clientSecret) {
    console.log('⚠️ Reddit credentials not set - using public JSON API');
    return null;
  }
  
  try {
    const auth = Buffer.from(`${REDDIT_CONFIG.clientId}:${REDDIT_CONFIG.clientSecret}`).toString('base64');
    
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'User-Agent': REDDIT_CONFIG.userAgent,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    accessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Expire 1 min early
    
    console.log('✅ Reddit API authentication successful');
    return accessToken;
    
  } catch (error) {
    console.error('❌ Reddit API authentication failed:', error.message);
    console.log('⚠️ Falling back to public JSON API');
    return null;
  }
}

/**
 * Search r/AVExchange for headphone listings
 */
async function searchRedditForComponent(component) {
  console.log(`🔍 Searching r/AVExchange for: ${component.brand} ${component.name}`);
  
  try {
    const token = await getRedditAccessToken();
    const query = `${component.brand} ${component.name}`.replace(/[^\w\s]/g, '');
    
    let url, headers;
    
    if (token) {
      // Use OAuth API
      url = `${REDDIT_CONFIG.apiUrl}/r/${REDDIT_CONFIG.subreddit}/search`;
      headers = {
        'Authorization': `Bearer ${token}`,
        'User-Agent': REDDIT_CONFIG.userAgent
      };
    } else {
      // Use public JSON API
      url = `${REDDIT_CONFIG.publicUrl}/r/${REDDIT_CONFIG.subreddit}/search.json`;
      headers = {
        'User-Agent': REDDIT_CONFIG.userAgent
      };
    }
    
    const params = new URLSearchParams({
      q: query,
      limit: REDDIT_CONFIG.searchParams.limit,
      sort: REDDIT_CONFIG.searchParams.sort,
      t: REDDIT_CONFIG.searchParams.time,
      restrict_sr: REDDIT_CONFIG.searchParams.restrict_sr,
      type: 'link'
    });
    
    console.log(`📡 Fetching: ${url}?${params}`);
    
    const response = await fetch(`${url}?${params}`, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    const posts = data.data?.children || [];
    const listings = [];
    
    for (const post of posts) {
      const postData = post.data;
      
      // Filter for selling posts only
      if (!isSellPost(postData.title)) continue;
      
      // Check if post is relevant to our component
      if (!isRelevantPost(postData, component)) continue;
      
      const listing = transformRedditPost(postData, component);
      if (listing) {
        listings.push(listing);
      }
    }
    
    console.log(`📦 Found ${listings.length} relevant r/AVExchange listings for ${component.brand} ${component.name}`);
    
    return listings;
    
  } catch (error) {
    console.error(`❌ Error searching Reddit for ${component.brand} ${component.name}:`, error.message);
    return [];
  }
}

/**
 * Check if Reddit post is a selling post (vs buying/trading)
 */
function isSellPost(title) {
  const sellIndicators = [
    '[wts]', '[w] [s]', 'wts:', 'want to sell', 'for sale', 'selling',
    'fs:', 'price drop', '$', 'shipped', 'obo'
  ];
  
  const titleLower = title.toLowerCase();
  
  return sellIndicators.some(indicator => titleLower.includes(indicator)) ||
         /\$\d+/.test(title); // Contains price
}

/**
 * Check if Reddit post is relevant to our component
 */
function isRelevantPost(postData, component) {
  const title = postData.title.toLowerCase();
  const selftext = (postData.selftext || '').toLowerCase();
  const brand = component.brand.toLowerCase();
  const name = component.name.toLowerCase();
  
  // Must contain brand name
  if (!title.includes(brand) && !selftext.includes(brand)) {
    return false;
  }
  
  // For specific models, check for model match
  const modelWords = name.split(' ').filter(word => word.length > 2);
  if (modelWords.length > 0) {
    const hasModelMatch = modelWords.some(word => 
      title.includes(word.toLowerCase()) || selftext.includes(word.toLowerCase())
    );
    if (!hasModelMatch) return false;
  }
  
  return true;
}

/**
 * Transform Reddit post data to our UsedListing format
 */
function transformRedditPost(postData, component) {
  try {
    const title = postData.title;
    const description = postData.selftext || null;
    const url = `https://www.reddit.com${postData.permalink}`;
    
    // Extract listing info from title
    const listingInfo = extractListingInfoFromTitle(title, description);
    
    if (!listingInfo.price || listingInfo.price <= 0) {
      // Skip listings without clear pricing
      return null;
    }
    
    // Calculate price metrics
    const expectedPrice = component.price_used_min && component.price_used_max 
      ? (component.price_used_min + component.price_used_max) / 2
      : component.price_used_min || component.price_used_max || 0;
    
    const priceVariance = expectedPrice > 0 ? ((listingInfo.price - expectedPrice) / expectedPrice) * 100 : 0;
    const isPriceReasonable = Math.abs(priceVariance) <= 35; // Reddit tends to have fair prices
    
    let priceWarning = null;
    if (priceVariance > 35) {
      priceWarning = `Price ${Math.round(priceVariance)}% above expected range`;
    } else if (priceVariance < -35) {
      priceWarning = `Price ${Math.round(Math.abs(priceVariance))}% below expected - verify condition`;
    }
    
    // Get seller confirmed trades from flair
    const confirmedTrades = extractTradeCountFromFlair(postData.author_flair_text);
    
    return {
      component_id: component.id,
      title: title,
      price: listingInfo.price,
      condition: listingInfo.condition,
      location: listingInfo.location || 'Unknown',
      source: 'reddit_avexchange',
      url: url,
      date_posted: new Date(postData.created_utc * 1000).toISOString(),
      seller_username: postData.author,
      seller_confirmed_trades: confirmedTrades,
      seller_feedback_score: 0, // Reddit doesn't have traditional feedback scores
      seller_feedback_percentage: 0,
      images: [], // Would need to parse post content for images
      description: description,
      is_active: !postData.archived && !postData.locked,
      price_is_reasonable: isPriceReasonable,
      price_variance_percentage: Math.round(priceVariance * 10) / 10,
      price_warning: priceWarning,
      listing_type: listingInfo.isBundle ? 'bundle' : 'buy_it_now',
      accepts_offers: listingInfo.acceptsOffers
    };
    
  } catch (error) {
    console.warn('⚠️ Error transforming Reddit post:', error.message);
    return null;
  }
}

/**
 * Extract price, condition, and other info from Reddit post title/text
 */
function extractListingInfoFromTitle(title, text) {
  const info = {
    price: null,
    condition: 'good',
    location: null,
    isBundle: false,
    acceptsOffers: false
  };
  
  const fullText = `${title} ${text || ''}`;
  
  // Price extraction - Reddit format is usually [WTS] Item $price
  const pricePatterns = [
    /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g, // $500, $1,200.00
    /(\d+)\s*(?:dollars?|usd|shipped)/gi, // 500 shipped, 300 USD
    /asking[:\s]*\$?(\d+)/gi, // Asking $500
    /price[:\s]*\$?(\d+)/gi, // Price: 500
  ];
  
  for (const pattern of pricePatterns) {
    const matches = fullText.match(pattern);
    if (matches) {
      for (const match of matches) {
        const price = parseFloat(match.replace(/[^\d.]/g, ''));
        if (price > 25 && price < 5000) { // Reasonable headphone price range
          info.price = price;
          break;
        }
      }
      if (info.price) break;
    }
  }
  
  // Condition extraction
  const conditionMap = {
    'bnib': 'excellent', // Brand New In Box
    'new': 'excellent',
    'mint': 'excellent',
    'excellent': 'excellent',
    'very good': 'very_good',
    'good': 'good',
    'fair': 'fair',
    'parts': 'parts_only',
    'repair': 'parts_only'
  };
  
  for (const [keyword, condition] of Object.entries(conditionMap)) {
    if (fullText.toLowerCase().includes(keyword)) {
      info.condition = condition;
      break;
    }
  }
  
  // Location extraction - often in parentheses or after location indicators
  const locationMatch = fullText.match(/\(([A-Z]{2,3}(?:[-,\s][A-Z]{2,3})?)\)/i) || // (CA-USA), (NYC)
                       fullText.match(/(?:from|in|location)[:\s]*([A-Z]{2,3}(?:[-,\s][A-Z]{2,3})?)/i);
  if (locationMatch) {
    info.location = locationMatch[1].toUpperCase();
  }
  
  // Bundle detection
  info.isBundle = /bundle|lot|pair|set|combo/i.test(fullText);
  
  // OBO detection
  info.acceptsOffers = /obo|best offer|negotiable/i.test(fullText);
  
  return info;
}

/**
 * Extract confirmed trade count from Reddit flair
 */
function extractTradeCountFromFlair(flairText) {
  if (!flairText) return 0;
  
  // AVExchange uses flair like "5 Trades" or "Trade Count: 15"
  const tradeMatch = flairText.match(/(\d+)\s*(?:trade|transaction)/i);
  if (tradeMatch) {
    return parseInt(tradeMatch[1]);
  }
  
  return 0;
}

/**
 * Save Reddit listings to database
 */
async function saveRedditListings(listings) {
  if (listings.length === 0) return;
  
  console.log(`💾 Saving ${listings.length} Reddit listings to database...`);
  
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
 * Process all headphone components for Reddit listings
 */
async function processAllComponents() {
  console.log('🚀 Starting Reddit r/AVExchange scraper for all headphone components...\n');
  
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
      
      const redditListings = await searchRedditForComponent(component);
      
      if (redditListings.length > 0) {
        await saveRedditListings(redditListings);
        totalListings += redditListings.length;
      }
      
      // Rate limiting: respect Reddit API guidelines
      await new Promise(resolve => setTimeout(resolve, REDDIT_CONFIG.rateLimit));
    }
    
    console.log(`\n🎉 Reddit scraping complete! Processed ${totalListings} listings total.`);
    
  } catch (error) {
    console.error('❌ Error in processAllComponents:', error);
  }
}

/**
 * Get general r/AVExchange posts for broader listing discovery
 */
async function getGeneralAVExchangeListings() {
  console.log('🔍 Fetching general r/AVExchange selling posts...');
  
  try {
    const token = await getRedditAccessToken();
    let url, headers;
    
    if (token) {
      url = `${REDDIT_CONFIG.apiUrl}/r/${REDDIT_CONFIG.subreddit}/hot`;
      headers = {
        'Authorization': `Bearer ${token}`,
        'User-Agent': REDDIT_CONFIG.userAgent
      };
    } else {
      url = `${REDDIT_CONFIG.publicUrl}/r/${REDDIT_CONFIG.subreddit}/hot.json`;
      headers = {
        'User-Agent': REDDIT_CONFIG.userAgent
      };
    }
    
    const params = new URLSearchParams({
      limit: 50
    });
    
    const response = await fetch(`${url}?${params}`, { headers });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    const posts = data.data?.children || [];
    
    const sellPosts = posts
      .filter(post => isSellPost(post.data.title))
      .map(post => ({
        title: post.data.title,
        author: post.data.author,
        url: `https://www.reddit.com${post.data.permalink}`,
        created: new Date(post.data.created_utc * 1000).toISOString(),
        upvotes: post.data.ups,
        comments: post.data.num_comments
      }));
    
    console.log(`📦 Found ${sellPosts.length} selling posts in r/AVExchange`);
    
    return sellPosts;
    
  } catch (error) {
    console.error('❌ Error fetching general AVExchange listings:', error.message);
    return [];
  }
}

// Main execution
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'general') {
    getGeneralAVExchangeListings().then(console.log);
  } else {
    processAllComponents();
  }
}

module.exports = {
  searchRedditForComponent,
  transformRedditPost,
  saveRedditListings,
  processAllComponents,
  getGeneralAVExchangeListings
};