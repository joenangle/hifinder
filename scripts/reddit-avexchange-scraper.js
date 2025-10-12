/**
 * Reddit r/AVExchange Scraper for HiFinder Used Listings
 *
 * Scrapes Reddit's r/AVExchange subreddit for headphone listings
 * Uses Reddit API for better reliability and rate limiting
 *
 * OPTIMIZED VERSION:
 * - Improved fuzzy matching for component names
 * - Better price extraction patterns
 * - Enhanced error handling and logging
 * - Configurable search time window
 */

require('dotenv').config({ path: '.env.local' });
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
    time: 'month', // Posts from past month (changed from week for more results)
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
 * Enhanced with fuzzy matching for better accuracy
 */
function isRelevantPost(postData, component) {
  const title = postData.title.toLowerCase();
  const selftext = (postData.selftext || '').toLowerCase();
  const brand = component.brand.toLowerCase();
  const name = component.name.toLowerCase();
  const fullText = `${title} ${selftext}`;

  // Must contain brand name (with fuzzy matching for common variations)
  const brandVariations = [
    brand,
    brand.replace(/\s+/g, ''), // Remove spaces (e.g., "audiotechnica")
    brand.replace(/-/g, ' '),   // Replace hyphens with spaces
  ];

  const hasBrand = brandVariations.some(variation => fullText.includes(variation));
  if (!hasBrand) return false;

  // For specific models, check for model match with word boundaries
  const modelWords = name.split(/[\s\-]+/).filter(word => word.length > 2);
  if (modelWords.length > 0) {
    const hasModelMatch = modelWords.some(word => {
      // Use word boundary regex for more accurate matching
      const regex = new RegExp(`\\b${word.toLowerCase()}\\b`, 'i');
      return regex.test(fullText);
    });
    if (!hasModelMatch) return false;
  }

  // Additional check: if component name is very specific, require exact match
  if (name.length > 10 && modelWords.length >= 2) {
    const exactMatch = modelWords.every(word => {
      const regex = new RegExp(`\\b${word.toLowerCase()}\\b`, 'i');
      return regex.test(fullText);
    });
    return exactMatch;
  }

  return true;
}

/**
 * Transform Reddit post data into our listing format
 */
function transformRedditPost(postData, component) {
  try {
    const listing = {
      component_id: component.id,
      title: postData.title.trim(),
      url: `https://www.reddit.com${postData.permalink}`,
      source: 'reddit_avexchange',
      date_posted: new Date(postData.created_utc * 1000).toISOString(),
      seller_username: postData.author,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Extract price from title
    const priceMatch = extractPrice(postData.title);
    if (priceMatch) {
      listing.price = priceMatch.price;
    } else {
      console.log(`⚠️ Could not extract price from: ${postData.title}`);
      return null;
    }

    // Extract condition
    listing.condition = extractCondition(postData.title, postData.selftext || '');

    // Extract location
    listing.location = extractLocation(postData.title) || 'Unknown';

    // Basic price validation
    const priceValidation = validatePrice(listing.price, component);
    listing.price_is_reasonable = priceValidation.valid;
    listing.price_variance_percentage = priceValidation.variance || 0;
    if (priceValidation.warning) {
      listing.price_warning = priceValidation.warning;
    }

    return listing;
  } catch (error) {
    console.error(`❌ Error transforming Reddit post:`, error);
    return null;
  }
}

/**
 * Extract price from Reddit post title
 * Enhanced with more patterns and better validation
 */
function extractPrice(title) {
  // Common Reddit price patterns (ordered by specificity)
  const patterns = [
    /\$(\d{1,5}(?:,\d{3})*)/g,           // $500 or $1,500
    /asking\s*\$?(\d{1,5})/gi,            // asking $500 or asking 500
    /price[:\s]+\$?(\d{1,5})/gi,          // price: $500
    /\[w\]\s*\$?(\d{1,5})/gi,             // [W] $500
    /\[h\].*?\[w\]\s*\$?(\d{1,5})/gi,     // [H] item [W] $500
    /(\d{1,5})\s*shipped/gi,              // 500 shipped
    /(\d{1,5})\s*(?:usd|dollars?)/gi,     // 500 USD or 500 dollars
    /obo.*?\$?(\d{1,5})/gi,               // $500 obo
    /\$?(\d{1,5})\s*obo/gi,               // 500 obo
  ];

  let foundPrices = [];

  for (const pattern of patterns) {
    const matches = [...title.matchAll(pattern)];
    for (const match of matches) {
      const priceStr = match[1].replace(/,/g, '');
      const price = parseInt(priceStr);

      // Sanity check: reasonable audio equipment price range
      if (price >= 20 && price <= 10000) {
        foundPrices.push({ price, raw: match[0], confidence: 1 });
      }
    }
  }

  // If multiple prices found, take the most likely one
  if (foundPrices.length > 0) {
    // Prefer prices that appear earlier in title (usually more accurate)
    return foundPrices[0];
  }

  return null;
}

/**
 * Extract condition from post title and content
 */
function extractCondition(title, content) {
  const text = `${title} ${content}`.toLowerCase();

  // Condition keywords in order of preference
  const conditionMap = {
    'excellent': ['excellent', 'mint', 'like new', 'brand new', 'pristine', 'perfect'],
    'very_good': ['very good', 'great condition', 'near mint', 'barely used'],
    'good': ['good condition', 'good', 'well maintained', 'gently used'],
    'fair': ['fair condition', 'fair', 'some wear', 'used condition', 'worn'],
    'parts_only': ['parts only', 'for parts', 'broken', 'not working', 'repair']
  };

  for (const [condition, keywords] of Object.entries(conditionMap)) {
    if (keywords.some(keyword => text.includes(keyword))) {
      return condition;
    }
  }

  // Default to 'good' if no condition specified
  return 'good';
}

/**
 * Extract location from post title
 */
function extractLocation(title) {
  // Reddit location patterns: [USA-NY], [US-CA], [CA-ON], etc.
  const locationMatch = title.match(/\[([A-Z]{2,3}-[A-Z]{2,3}?)\]/i);
  if (locationMatch) {
    return locationMatch[1].toUpperCase();
  }

  // Alternative patterns
  const altPatterns = [
    /\b(USA?-[A-Z]{2})\b/i,
    /\b(US-[A-Z]{2})\b/i,
    /\b(CA-[A-Z]{2})\b/i
  ];

  for (const pattern of altPatterns) {
    const match = title.match(pattern);
    if (match) {
      return match[1].toUpperCase();
    }
  }

  return null;
}

/**
 * Validate if price is reasonable for the component
 */
function validatePrice(price, component) {
  if (!price || !component.price_used_min || !component.price_used_max) {
    return { valid: true };
  }

  const expectedMin = component.price_used_min;
  const expectedMax = component.price_used_max;
  const expectedAvg = (expectedMin + expectedMax) / 2;

  // Calculate variance percentage
  const variance = Math.round(((price - expectedAvg) / expectedAvg) * 100);

  // Price validation rules
  if (price < expectedMin * 0.3) {
    return {
      valid: false,
      variance,
      warning: `Price significantly below market value (${Math.round((expectedMin - price) / expectedMin * 100)}% below expected minimum)`
    };
  }

  if (price > expectedMax * 2) {
    return {
      valid: false,
      variance,
      warning: `Price significantly above market value (${Math.round((price - expectedMax) / expectedMax * 100)}% above expected maximum)`
    };
  }

  // Flag deals and overpriced items
  let warning = null;
  if (variance < -30) {
    warning = 'Great deal - significantly below average price';
  } else if (variance > 50) {
    warning = 'Above average price - consider negotiating';
  }

  return {
    valid: true,
    variance,
    warning
  };
}

/**
 * Process all components and search Reddit for listings
 */
async function scrapeRedditListings() {
  console.log('🚀 Starting Reddit r/AVExchange scraping...');

  try {
    // Get all components from database
    const { data: components, error } = await supabase
      .from('components')
      .select('*')
      .in('category', ['cans', 'iems', 'dac', 'amp', 'dac_amp']);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    console.log(`📋 Processing ${components.length} components...`);

    let totalListings = 0;
    let newListings = 0;

    for (const component of components) {
      console.log(`\n🔍 Searching for ${component.brand} ${component.name}...`);

      const listings = await searchRedditForComponent(component);

      for (const listing of listings) {
        try {
          // Check if listing already exists (by URL)
          const { data: existing } = await supabase
            .from('used_listings')
            .select('id')
            .eq('url', listing.url)
            .single();

          if (!existing) {
            // Insert new listing
            const { error: insertError } = await supabase
              .from('used_listings')
              .insert(listing);

            if (insertError) {
              console.error(`❌ Error inserting listing:`, insertError);
            } else {
              newListings++;
              console.log(`✅ Added: ${listing.title}`);
            }
          }

          totalListings++;
        } catch (error) {
          console.error(`❌ Error processing listing:`, error);
        }
      }

      // Rate limiting - be respectful to Reddit
      await new Promise(resolve => setTimeout(resolve, REDDIT_CONFIG.rateLimit));
    }

    console.log(`\n🎉 Reddit scraping complete!`);
    console.log(`📊 Found ${totalListings} listings total, ${newListings} new`);

  } catch (error) {
    console.error('❌ Reddit scraping failed:', error);
  }
}

// Run the scraper if called directly
if (require.main === module) {
  scrapeRedditListings()
    .then(() => {
      console.log('✅ Reddit scraping finished');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Reddit scraping failed:', error);
      process.exit(1);
    });
}

module.exports = {
  scrapeRedditListings,
  searchRedditForComponent
};

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
      description: description,
      is_active: !postData.archived && !postData.locked,
      price_is_reasonable: isPriceReasonable,
      price_variance_percentage: Math.round(priceVariance * 10) / 10,
      price_warning: priceWarning
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