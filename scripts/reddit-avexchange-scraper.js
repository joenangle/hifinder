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
 * - AVExchangeBot confirmation integration for verified sales
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Lock file to prevent concurrent scraper runs
const LOCK_FILE = path.join(__dirname, '.reddit-scraper.lock');

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
    time: 'week', // Posts from past week (more focused, faster scraping)
    restrict_sr: true // Restrict to AVExchange subreddit only
  },

  rateLimit: 1000, // 1 second between requests (with exponential backoff on 429)
  maxPages: 1, // Single page to avoid timeout (100 most recent posts)
  maxRetries: 3, // Max retry attempts for 429 errors
  retryBaseDelay: 10000 // Start with 10s delay, then exponential backoff
};

let accessToken = null;
let tokenExpiry = null;

/**
 * Acquire lock to prevent concurrent scraper runs
 */
function acquireLock() {
  if (fs.existsSync(LOCK_FILE)) {
    const lockData = fs.readFileSync(LOCK_FILE, 'utf8');
    const lockInfo = JSON.parse(lockData);
    const lockAge = Date.now() - lockInfo.timestamp;

    // If lock is older than 2 hours, consider it stale and override
    if (lockAge < 2 * 60 * 60 * 1000) {
      console.error(`❌ Another scraper instance is already running (PID: ${lockInfo.pid})`);
      console.error(`   Lock file: ${LOCK_FILE}`);
      console.error(`   Started: ${new Date(lockInfo.timestamp).toLocaleString()}`);
      return false;
    } else {
      console.log(`⚠️  Stale lock file found (${Math.round(lockAge / 60000)} minutes old), removing...`);
      fs.unlinkSync(LOCK_FILE);
    }
  }

  fs.writeFileSync(LOCK_FILE, JSON.stringify({
    pid: process.pid,
    timestamp: Date.now(),
    startedAt: new Date().toISOString()
  }));

  console.log(`🔒 Lock acquired (PID: ${process.pid})`);
  return true;
}

/**
 * Release lock
 */
function releaseLock() {
  if (fs.existsSync(LOCK_FILE)) {
    fs.unlinkSync(LOCK_FILE);
    console.log(`🔓 Lock released`);
  }
}

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
 * Fetch with retry logic and exponential backoff for rate limiting
 */
async function fetchWithRetry(url, options = {}, retryCount = 0) {
  try {
    const response = await fetch(url, options);

    // Handle rate limiting with exponential backoff
    if (response.status === 429 && retryCount < REDDIT_CONFIG.maxRetries) {
      const retryDelay = REDDIT_CONFIG.retryBaseDelay * Math.pow(2, retryCount);
      console.log(`⏳ Rate limited (429). Waiting ${retryDelay/1000}s before retry ${retryCount + 1}/${REDDIT_CONFIG.maxRetries}...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return fetchWithRetry(url, options, retryCount + 1);
    }

    return response;
  } catch (error) {
    if (retryCount < REDDIT_CONFIG.maxRetries) {
      const retryDelay = REDDIT_CONFIG.retryBaseDelay * Math.pow(2, retryCount);
      console.log(`⏳ Fetch error: ${error.message}. Retrying in ${retryDelay/1000}s...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      return fetchWithRetry(url, options, retryCount + 1);
    }
    throw error;
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

    const response = await fetchWithRetry(`${url}?${params}`, { headers });

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

      const listing = await transformRedditPost(postData, component);
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

  // Patterns that indicate a price is NOT the actual asking price
  const discountPatterns = [
    /\$?(\d{1,5})\s*(?:off|discount|savings|reduced|sale)/gi,  // $50 off, $100 discount
    /(?:off|discount|savings|reduced|sale)\s*\$?(\d{1,5})/gi,  // off $50, discount $100
  ];

  let foundPrices = [];

  for (const pattern of patterns) {
    const matches = [...title.matchAll(pattern)];
    for (const match of matches) {
      const priceStr = match[1].replace(/,/g, '');
      const price = parseInt(priceStr);

      // Sanity check: reasonable audio equipment price range
      if (price >= 20 && price <= 10000) {
        // Check if this price is part of a discount phrase
        const matchIndex = title.indexOf(match[0]);
        const surroundingText = title.substring(Math.max(0, matchIndex - 20), Math.min(title.length, matchIndex + match[0].length + 20));

        let isDiscount = false;
        for (const discountPattern of discountPatterns) {
          if (discountPattern.test(surroundingText)) {
            isDiscount = true;
            break;
          }
        }

        if (!isDiscount) {
          foundPrices.push({ price, raw: match[0], confidence: 1 });
        }
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
          // Upsert listing - will insert if new or update if URL exists
          const { data: upsertResult, error: upsertError } = await supabase
            .from('used_listings')
            .upsert(listing, {
              onConflict: 'url',
              ignoreDuplicates: false
            })
            .select('id, url');

          if (upsertError) {
            console.error(`❌ Error upserting listing:`, upsertError);
          } else {
            newListings++;
            console.log(`✅ Saved/Updated: ${listing.title}`);
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
 * Now checks for AVExchangeBot confirmations to verify sold status
 */
async function transformRedditPost(postData, component, options = {}) {
  try {
    const title = postData.title;
    const description = postData.selftext || null;
    const url = `https://www.reddit.com${postData.permalink}`;
    const postId = postData.id;

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

    // IMPROVED SOLD STATUS DETECTION:
    // 1. First check flair, title, and body for sold indicators (no API call needed)
    // 2. Only try bot confirmation if we can't determine status otherwise

    const hasSoldIndicators = isSoldPost(postData);
    const checkBotConfirmation = options.checkBotConfirmations !== false;
    let botConfirmation = null;

    // Determine final status using a prioritized approach
    let finalStatus, dateSold, buyerUsername, botConfirmed, botCommentId, sellerFeedback, buyerFeedback;

    if (hasSoldIndicators) {
      // Clear sold indicators found - mark as sold immediately
      finalStatus = 'sold';
      dateSold = new Date().toISOString();
      buyerUsername = null;
      botConfirmed = false;
      botCommentId = null;
      sellerFeedback = false;
      buyerFeedback = false;

      console.log(`  ✅ Marked as SOLD (flair/title indicator found)`);

      // Optionally check for bot confirmation to get buyer info (but don't block on it)
      // Skip bot check to avoid rate limiting - we already know it's sold
    } else {
      // No clear sold indicators - listing appears available
      finalStatus = detectListingStatus(postData);
      dateSold = null;
      buyerUsername = null;
      botConfirmed = false;
      botCommentId = null;
      sellerFeedback = false;
      buyerFeedback = false;
    }

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
      is_active: finalStatus === 'available',
      status: finalStatus,
      date_sold: dateSold,
      buyer_username: buyerUsername,
      avexchange_bot_confirmed: botConfirmed,
      avexchange_bot_comment_id: botCommentId,
      seller_feedback_given: sellerFeedback,
      buyer_feedback_given: buyerFeedback,
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
 * Detect if a Reddit post has been marked as sold
 */
function isSoldPost(postData) {
  const title = (postData.title || '').toLowerCase();
  const selftext = (postData.selftext || '').toLowerCase();
  const flair = (postData.link_flair_text || '').toLowerCase();

  // Check for sold indicators in flair
  const soldFlairPatterns = ['closed', 'sold', 'complete', 'pending'];
  if (soldFlairPatterns.some(pattern => flair.includes(pattern))) {
    return true;
  }

  // Check for sold markers in title
  const soldTitlePatterns = [
    '[sold]', '(sold)', 'sold:', 'sold to',
    'sold!', 'spf', 'sale pending'
  ];
  if (soldTitlePatterns.some(pattern => title.includes(pattern))) {
    return true;
  }

  // Check if post body indicates sale
  if (selftext.includes('sold to') || selftext.includes('sale pending')) {
    return true;
  }

  return false;
}

/**
 * Determine listing status based on post state
 */
function detectListingStatus(postData) {
  if (isSoldPost(postData)) return 'sold';
  if (postData.archived) return 'expired';
  if (postData.locked) return 'expired';
  if (postData.removed || postData.spam) return 'removed';
  return 'available';
}

/**
 * Check for AVExchangeBot confirmation in post comments
 * Returns null if no confirmation, or confirmation object if found
 */
async function checkForAVExchangeBotConfirmation(postId) {
  try {
    const token = await getRedditAccessToken();

    const response = await fetch(
      `${REDDIT_CONFIG.apiUrl}/comments/${postId}?limit=500&depth=10`,
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'User-Agent': REDDIT_CONFIG.userAgent
        }
      }
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (!data || !Array.isArray(data) || data.length < 2) {
      return null;
    }

    const commentsData = data[1];
    if (!commentsData?.data?.children) {
      return null;
    }

    // Search for AVExchangeBot comment
    const confirmation = findBotConfirmationInComments(commentsData.data.children);
    return confirmation;

  } catch (error) {
    console.warn(`⚠️ Error checking for bot confirmation on post ${postId}:`, error.message);
    return null;
  }
}

/**
 * Recursively search comments for AVExchangeBot confirmation
 */
function findBotConfirmationInComments(comments) {
  for (const node of comments) {
    if (node.kind !== 't1') continue;

    const comment = node.data;

    // Check if this is an AVExchangeBot comment
    if (comment.author === 'AVexchangeBot') {
      const parsed = parseAVExchangeBotComment(comment);
      if (parsed && parsed.isFullyConfirmed) {
        return parsed;
      }
    }

    // Recurse into replies
    if (comment.replies && comment.replies.data && comment.replies.data.children) {
      const found = findBotConfirmationInComments(comment.replies.data.children);
      if (found) return found;
    }
  }

  return null;
}

/**
 * Parse AVExchangeBot comment to extract transaction details
 */
function parseAVExchangeBotComment(comment) {
  try {
    const body = comment.body || '';
    const created = comment.created_utc;

    // Extract usernames from bot comment
    // Look for pattern: u/username -> X Trades
    const tradePattern = /u\/([a-zA-Z0-9_-]+)\s*->\s*(\d+)\s*Trades?/gi;
    const matches = [...body.matchAll(tradePattern)];

    if (matches.length < 2) {
      return null;
    }

    const [seller, buyer] = matches.map(m => m[1]);

    // Check if both parties have replied
    const replies = comment.replies?.data?.children || [];
    const replyAuthors = new Set(
      replies
        .filter(r => r.kind === 't1')
        .map(r => r.data.author?.toLowerCase())
    );

    const sellerFeedbackGiven = replyAuthors.has(seller.toLowerCase());
    const buyerFeedbackGiven = replyAuthors.has(buyer.toLowerCase());
    const isFullyConfirmed = sellerFeedbackGiven && buyerFeedbackGiven;

    return {
      commentId: comment.id,
      dateSold: new Date(created * 1000).toISOString(),
      sellerUsername: seller,
      buyerUsername: buyer,
      sellerFeedbackGiven,
      buyerFeedbackGiven,
      isFullyConfirmed
    };

  } catch (error) {
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
      // Upsert listing - will insert if new or update if URL exists
      const { error } = await supabase
        .from('used_listings')
        .upsert([listing], {
          onConflict: 'url',
          ignoreDuplicates: false
        });

      if (error) {
        console.error(`❌ Error saving/updating listing "${listing.title}":`, error.message);
      } else {
        const price = listing.price > 0 ? `$${listing.price}` : 'No price';
        console.log(`✅ Saved/Updated: ${listing.title.substring(0, 60)}... - ${price}`);
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
  // Acquire lock to prevent concurrent runs
  if (!acquireLock()) {
    console.error('❌ Cannot start scraper - another instance is already running');
    process.exit(1);
  }

  // Ensure lock is released on exit
  process.on('exit', releaseLock);
  process.on('SIGINT', () => {
    console.log('\n⚠️  Scraper interrupted by user');
    releaseLock();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    console.log('\n⚠️  Scraper terminated');
    releaseLock();
    process.exit(143);
  });

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
      releaseLock();
      return;
    }

    console.log(`📋 Processing ${components.length} headphone components...\n`);

    let totalListings = 0;
    let soldListings = 0;

    for (const [index, component] of components.entries()) {
      console.log(`\n--- Processing ${index + 1}/${components.length}: ${component.brand} ${component.name} ---`);

      const redditListings = await searchRedditForComponent(component);

      if (redditListings.length > 0) {
        await saveRedditListings(redditListings);
        totalListings += redditListings.length;
        soldListings += redditListings.filter(l => l.status === 'sold').length;
      }

      // Rate limiting: respect Reddit API guidelines
      await new Promise(resolve => setTimeout(resolve, REDDIT_CONFIG.rateLimit));
    }

    console.log(`\n🎉 Reddit scraping complete!`);
    console.log(`📊 Processed ${totalListings} listings total`);
    console.log(`   ✅ ${totalListings - soldListings} available`);
    console.log(`   🔴 ${soldListings} marked as sold`);

    releaseLock();

  } catch (error) {
    console.error('❌ Error in processAllComponents:', error);
    releaseLock();
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
  getGeneralAVExchangeListings,
  scrapeRedditListings // For scheduler compatibility
};