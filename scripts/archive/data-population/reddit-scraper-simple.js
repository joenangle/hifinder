/**
 * Simplified Reddit r/AVExchange Scraper
 * Uses only the existing used_listings table schema
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
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  userAgent: 'HiFinder-UsedListingAggregator/1.0 (by /u/hifinder)',
  searchParams: {
    limit: 100,
    sort: 'new',
    time: 'week',
    restrict_sr: true
  },
  rateLimit: 2000,
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
    tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000;

    console.log('✅ Reddit API authentication successful');
    return accessToken;

  } catch (error) {
    console.error('❌ Reddit API authentication failed:', error.message);
    console.log('⚠️ Falling back to public JSON API');
    return null;
  }
}

/**
 * Search r/AVExchange for component listings
 */
async function searchRedditForComponent(component) {
  console.log(`🔍 Searching r/AVExchange for: ${component.brand} ${component.name}`);

  try {
    const token = await getRedditAccessToken();
    const query = `${component.brand} ${component.name}`.replace(/[^\w\s]/g, '');

    let url, headers;

    if (token) {
      url = `${REDDIT_CONFIG.apiUrl}/r/${REDDIT_CONFIG.subreddit}/search`;
      headers = {
        'Authorization': `Bearer ${token}`,
        'User-Agent': REDDIT_CONFIG.userAgent
      };
    } else {
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
 * Check if Reddit post is a selling post
 */
function isSellPost(title) {
  const sellIndicators = [
    '[wts]', '[w] [s]', 'wts:', 'want to sell', 'for sale', 'selling',
    'fs:', 'price drop', '$', 'shipped', 'obo'
  ];

  const titleLower = title.toLowerCase();
  return sellIndicators.some(indicator => titleLower.includes(indicator)) ||
         /\$\d+/.test(title);
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
 * Transform Reddit post data into our listing format (existing schema only)
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
 */
function extractPrice(title) {
  const patterns = [
    /\$([0-9,]+)/g,                           // $500
    /([0-9,]+)\s*dollars?/gi,                 // 500 dollars
    /([0-9,]+)\s*usd/gi,                      // 500 USD
    /price[:\s]+\$?([0-9,]+)/gi,              // Price: $500
    /asking[:\s]+\$?([0-9,]+)/gi,             // Asking: $500
    /\[w\]\s*\$?([0-9,]+)/gi,                 // [W] $500
    /\[w\]\s*paypal\s*\$?([0-9,]+)/gi,       // [W] PayPal $500
    /paypal\s*\$?([0-9,]+)/gi,                // PayPal $500
    /\$?([0-9,]+)\s*paypal/gi,                // $500 PayPal
    /\$?([0-9,]+)\s*shipped/gi,               // $500 shipped
    /\$?([0-9,]+)\s*obo/gi,                   // $500 OBO
    /\$?([0-9,]+)\s*&/gi                      // $500 & (for combo prices)
  ];

  for (const pattern of patterns) {
    const matches = [...title.matchAll(pattern)];
    if (matches.length > 0) {
      for (const match of matches) {
        const priceStr = match[1].replace(/,/g, '');
        const price = parseInt(priceStr);

        if (price >= 10 && price <= 50000) {
          return { price, raw: match[0] };
        }
      }
    }
  }

  return null;
}

/**
 * Extract condition from post title and content
 */
function extractCondition(title, content) {
  const text = `${title} ${content}`.toLowerCase();

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

  return 'good';
}

/**
 * Extract location from post title
 */
function extractLocation(title) {
  const locationMatch = title.match(/\[([A-Z]{2,3}-[A-Z]{2,3}?)\]/i);
  if (locationMatch) {
    return locationMatch[1].toUpperCase();
  }

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

  const variance = Math.round(((price - expectedAvg) / expectedAvg) * 100);

  if (price < expectedMin * 0.3) {
    return {
      valid: false,
      variance,
      warning: `Price significantly below market value`
    };
  }

  if (price > expectedMax * 2) {
    return {
      valid: false,
      variance,
      warning: `Price significantly above market value`
    };
  }

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

    for (const component of components.slice(0, 25)) { // Limit for testing
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
          } else {
            console.log(`⏭️ Skipping duplicate: ${listing.title}`);
          }

          totalListings++;
        } catch (error) {
          console.error(`❌ Error processing listing:`, error);
        }
      }

      // Rate limiting
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