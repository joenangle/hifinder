/**
 * Reddit r/AVExchange Scraper V2 - Optimized for Speed
 *
 * PERFORMANCE REDESIGN:
 * - Fetches ALL recent r/AVExchange posts in 1-2 API calls (instead of 500+)
 * - Matches component names against posts using fuzzy matching
 * - Completes in <1 minute instead of 15+ minutes
 * - Eliminates timeout issues in GitHub Actions
 *
 * Strategy:
 * 1. Fetch recent [WTS] posts from r/AVExchange (100-200 posts)
 * 2. Load all components from database once
 * 3. For each post, check which components match
 * 4. Save matches to database
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const { analyzeBundlePrice } = require('./parse-bundle-listings');

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

  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  userAgent: 'HiFinder-UsedListingAggregator/2.0 (by /u/hifinder)',

  // Fetch more posts per page to get comprehensive coverage
  searchParams: {
    limit: 100,
    time: 'month' // Look at past month of posts
  },

  rateLimit: 2000, // 2 seconds between page fetches
  maxPages: 5, // Fetch 5 pages = 500 posts total (better price data coverage)
  maxRetries: 3,
  retryBaseDelay: 10000
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

    if (lockAge < 2 * 60 * 60 * 1000) {
      console.error(`❌ Another scraper instance is already running (PID: ${lockInfo.pid})`);
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
 * Fetch with retry logic and exponential backoff
 */
async function fetchWithRetry(url, options = {}, retryCount = 0) {
  try {
    const response = await fetch(url, options);

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
 * Fetch all recent [WTS] posts from r/AVExchange
 * This replaces 500+ individual component searches with 1-2 API calls
 */
async function fetchAllRecentPosts() {
  console.log('🔍 Fetching recent selling posts from r/AVExchange...\n');

  const allPosts = [];
  let after = null;

  try {
    const token = await getRedditAccessToken();

    for (let page = 0; page < REDDIT_CONFIG.maxPages; page++) {
      console.log(`📄 Fetching page ${page + 1}/${REDDIT_CONFIG.maxPages} (gathering comprehensive price data)...`);

      let url, headers;

      if (token) {
        url = `${REDDIT_CONFIG.apiUrl}/r/${REDDIT_CONFIG.subreddit}/new`;
        headers = {
          'Authorization': `Bearer ${token}`,
          'User-Agent': REDDIT_CONFIG.userAgent
        };
      } else {
        url = `${REDDIT_CONFIG.publicUrl}/r/${REDDIT_CONFIG.subreddit}/new.json`;
        headers = {
          'User-Agent': REDDIT_CONFIG.userAgent
        };
      }

      const params = new URLSearchParams({
        limit: REDDIT_CONFIG.searchParams.limit,
        t: REDDIT_CONFIG.searchParams.time
      });

      if (after) {
        params.set('after', after);
      }

      const response = await fetchWithRetry(`${url}?${params}`, { headers });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const posts = data.data?.children || [];

      if (posts.length === 0) {
        console.log('   No more posts found');
        break;
      }

      // Filter for selling posts only
      const sellPosts = posts.filter(post => isSellPost(post.data.title));
      allPosts.push(...sellPosts.map(p => p.data));

      console.log(`   ✅ Found ${sellPosts.length} selling posts (${posts.length} total posts)`);

      after = data.data?.after;
      if (!after) break;

      // Rate limiting between pages
      if (page < REDDIT_CONFIG.maxPages - 1) {
        await new Promise(resolve => setTimeout(resolve, REDDIT_CONFIG.rateLimit));
      }
    }

    console.log(`\n📦 Total selling posts fetched: ${allPosts.length}\n`);
    return allPosts;

  } catch (error) {
    console.error('❌ Error fetching posts:', error.message);
    return allPosts; // Return what we have so far
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
 * Calculate Levenshtein distance between two strings
 * Used for fuzzy model name matching
 */
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = Array(len2 + 1).fill(null).map(() => Array(len1 + 1).fill(null));

  for (let i = 0; i <= len1; i++) matrix[0][i] = i;
  for (let j = 0; j <= len2; j++) matrix[j][0] = j;

  for (let j = 1; j <= len2; j++) {
    for (let i = 1; i <= len1; i++) {
      const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + indicator
      );
    }
  }

  return matrix[len2][len1];
}

/**
 * Calculate similarity percentage between two strings
 * Returns 0-100 where 100 is exact match
 */
function calculateSimilarity(str1, str2) {
  const distance = levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 100;
  return ((maxLen - distance) / maxLen) * 100;
}

/**
 * Check if post mentions a specific component
 * Uses fuzzy matching to handle variations in naming
 *
 * CRITICAL: Requires 80%+ model name similarity to prevent false matches
 * (e.g., "HD 650" should NOT match "Momentum" even though both are Sennheiser)
 */
function postMatchesComponent(postData, component) {
  const title = postData.title.toLowerCase();
  const selftext = (postData.selftext || '').toLowerCase();
  const fullText = `${title} ${selftext}`;

  const brand = component.brand.toLowerCase();
  const name = component.name.toLowerCase();

  // Brand variations
  const brandVariations = [
    brand,
    brand.replace(/\s+/g, ''),
    brand.replace(/-/g, ' '),
  ];

  const hasBrand = brandVariations.some(variation => fullText.includes(variation));
  if (!hasBrand) return false;

  // CRITICAL: Never allow brand-only matches
  // Must have model-specific validation

  // Extract model name variations (normalized)
  const modelVariations = [
    name,
    name.replace(/\s+/g, ''),
    name.replace(/-/g, ' '),
    name.replace(/\s+/g, '-'),
  ];

  // Check for exact model name match (best case)
  const hasExactModelMatch = modelVariations.some(variation =>
    fullText.includes(variation.toLowerCase())
  );

  if (hasExactModelMatch) return true;

  // Fuzzy model matching: Extract potential model names from post
  // Look for alphanumeric patterns that might be model numbers/names
  const modelPattern = /\b([a-z0-9]+(?:[\s\-][a-z0-9]+){0,3})\b/gi;
  const potentialModels = fullText.match(modelPattern) || [];

  // Check each potential model against component name
  // Require 80%+ similarity to prevent false matches
  const MIN_SIMILARITY = 80;

  for (const potentialModel of potentialModels) {
    for (const modelVariation of modelVariations) {
      const similarity = calculateSimilarity(potentialModel, modelVariation);

      if (similarity >= MIN_SIMILARITY) {
        return true;
      }
    }
  }

  // Model name word matching (require majority of words to match)
  const modelWords = name.split(/[\s\-]+/).filter(word => word.length > 2);

  // If no significant model words, reject (prevents brand-only matches)
  if (modelWords.length === 0) return false;

  const matchedWords = modelWords.filter(word => {
    // Escape special regex characters to avoid syntax errors
    const escapedWord = word.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escapedWord}\\b`, 'i');
    return regex.test(fullText);
  });

  // Require at least 50% of model words to match for multi-word models
  // Or all words for single/two-word models
  const requiredMatches = modelWords.length <= 2 ? modelWords.length : Math.ceil(modelWords.length * 0.5);

  return matchedWords.length >= requiredMatches;
}

/**
 * Detect if post has been marked as sold
 */
function isSoldPost(postData) {
  const title = (postData.title || '').toLowerCase();
  const selftext = (postData.selftext || '').toLowerCase();
  const flair = (postData.link_flair_text || '').toLowerCase();

  const soldFlairPatterns = ['closed', 'sold', 'complete', 'pending'];
  if (soldFlairPatterns.some(pattern => flair.includes(pattern))) {
    return true;
  }

  const soldTitlePatterns = [
    '[sold]', '(sold)', 'sold:', 'sold to',
    'sold!', 'spf', 'sale pending'
  ];
  if (soldTitlePatterns.some(pattern => title.includes(pattern))) {
    return true;
  }

  if (selftext.includes('sold to') || selftext.includes('sale pending')) {
    return true;
  }

  return false;
}

/**
 * Extract listing info from post
 */
function extractListingInfoFromTitle(title, text) {
  const info = {
    price: null,
    condition: 'good',
    location: null
  };

  const fullText = `${title} ${text || ''}`;

  // Price extraction
  const pricePatterns = [
    /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g,
    /(\d+)\s*(?:dollars?|usd|shipped)/gi,
    /asking[:\s]*\$?(\d+)/gi,
    /price[:\s]*\$?(\d+)/gi,
  ];

  for (const pattern of pricePatterns) {
    const matches = fullText.match(pattern);
    if (matches) {
      for (const match of matches) {
        const price = parseFloat(match.replace(/[^\d.]/g, ''));
        if (price > 25 && price < 5000) {
          info.price = price;
          break;
        }
      }
      if (info.price) break;
    }
  }

  // Condition extraction
  const conditionMap = {
    'bnib': 'excellent',
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

  // Location extraction
  const locationMatch = fullText.match(/\[([A-Z]{2,3}-[A-Z]{2,3}?)\]/i);
  if (locationMatch) {
    info.location = locationMatch[1].toUpperCase();
  }

  return info;
}

/**
 * Extract confirmed trade count from flair
 */
function extractTradeCountFromFlair(flairText) {
  if (!flairText) return 0;

  const tradeMatch = flairText.match(/(\d+)\s*(?:trade|transaction)/i);
  if (tradeMatch) {
    return parseInt(tradeMatch[1]);
  }

  return 0;
}

/**
 * Transform Reddit post to listing format
 */
function transformPostToListing(postData, component) {
  try {
    const title = postData.title;
    const description = postData.selftext || null;
    const url = `https://www.reddit.com${postData.permalink}`;

    const listingInfo = extractListingInfoFromTitle(title, description);

    if (!listingInfo.price || listingInfo.price <= 0) {
      return null;
    }

    // Analyze if this is a bundle listing
    const bundleAnalysis = analyzeBundlePrice(title, description, listingInfo.price);

    // Use adjusted price for bundle analysis if available
    const effectivePrice = bundleAnalysis.isBundle && bundleAnalysis.adjustedPrice
      ? bundleAnalysis.adjustedPrice
      : listingInfo.price;

    const expectedPrice = component.price_used_min && component.price_used_max
      ? (component.price_used_min + component.price_used_max) / 2
      : component.price_used_min || component.price_used_max || 0;

    const priceVariance = expectedPrice > 0 ? ((effectivePrice - expectedPrice) / expectedPrice) * 100 : 0;
    const isPriceReasonable = Math.abs(priceVariance) <= 35;

    let priceWarning = null;
    if (bundleAnalysis.isBundle && bundleAnalysis.bundleNote) {
      // Add bundle note to price warning
      priceWarning = bundleAnalysis.bundleNote;
    } else if (priceVariance > 35) {
      priceWarning = `Price ${Math.round(priceVariance)}% above expected range`;
    } else if (priceVariance < -35) {
      priceWarning = `Price ${Math.round(Math.abs(priceVariance))}% below expected - verify condition`;
    }

    const confirmedTrades = extractTradeCountFromFlair(postData.author_flair_text);
    const hasSoldIndicators = isSoldPost(postData);

    const finalStatus = hasSoldIndicators ? 'sold' : 'available';
    const dateSold = hasSoldIndicators ? new Date().toISOString() : null;

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
      seller_feedback_score: 0,
      seller_feedback_percentage: 0,
      description: description,
      is_active: finalStatus === 'available',
      status: finalStatus,
      date_sold: dateSold,
      buyer_username: null,
      avexchange_bot_confirmed: false,
      avexchange_bot_comment_id: null,
      seller_feedback_given: false,
      buyer_feedback_given: false,
      price_is_reasonable: isPriceReasonable,
      price_variance_percentage: Math.round(priceVariance * 10) / 10,
      price_warning: priceWarning
    };

  } catch (error) {
    console.warn('⚠️ Error transforming post:', error.message);
    return null;
  }
}

/**
 * Main scraper function - optimized approach
 */
async function scrapeReddit() {
  if (!acquireLock()) {
    console.error('❌ Cannot start scraper - another instance is already running');
    process.exit(1);
  }

  process.on('exit', releaseLock);
  process.on('SIGINT', () => {
    console.log('\n⚠️  Scraper interrupted');
    releaseLock();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    console.log('\n⚠️  Scraper terminated');
    releaseLock();
    process.exit(143);
  });

  console.log('🚀 Starting Reddit r/AVExchange scraper V2 (optimized)\n');

  try {
    // Step 1: Fetch all recent posts (1-2 API calls)
    const posts = await fetchAllRecentPosts();

    if (posts.length === 0) {
      console.log('⚠️ No posts found. Exiting.');
      releaseLock();
      return;
    }

    // Step 2: Load all components from database (1 query)
    console.log('📋 Loading components from database...');
    const { data: components, error } = await supabase
      .from('components')
      .select('id, name, brand, category, price_used_min, price_used_max')
      .in('category', ['cans', 'iems'])
      .order('brand, name');

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    console.log(`   ✅ Loaded ${components.length} components\n`);

    // Step 3: Match posts to components
    console.log('🔗 Matching posts to components...\n');

    let totalListings = 0;
    let newListings = 0;
    let soldListings = 0;

    for (const post of posts) {
      const postTitle = post.title.substring(0, 80);

      // Find all components that match this post
      const matchingComponents = components.filter(comp =>
        postMatchesComponent(post, comp)
      );

      if (matchingComponents.length === 0) {
        continue;
      }

      console.log(`\n📌 "${postTitle}..."`);
      console.log(`   Matches: ${matchingComponents.map(c => `${c.brand} ${c.name}`).join(', ')}`);

      // Create listing for each matching component
      for (const component of matchingComponents) {
        const listing = transformPostToListing(post, component);

        if (!listing) continue;

        // Save to database
        try {
          const { error: upsertError } = await supabase
            .from('used_listings')
            .upsert(listing, {
              onConflict: 'url',
              ignoreDuplicates: false
            });

          if (upsertError) {
            console.error(`   ❌ Error saving: ${upsertError.message}`);
          } else {
            totalListings++;
            newListings++;
            if (listing.status === 'sold') soldListings++;

            const priceStr = listing.price > 0 ? `$${listing.price}` : 'No price';
            const statusEmoji = listing.status === 'sold' ? '🔴' : '✅';
            console.log(`   ${statusEmoji} Saved: ${component.brand} ${component.name} - ${priceStr}`);
          }
        } catch (error) {
          console.error(`   ❌ Exception: ${error.message}`);
        }
      }
    }

    console.log(`\n\n🎉 Reddit scraping complete!`);
    console.log(`📊 Statistics:`);
    console.log(`   Total posts fetched: ${posts.length}`);
    console.log(`   Total listings saved: ${totalListings}`);
    console.log(`   Available: ${totalListings - soldListings}`);
    console.log(`   Sold: ${soldListings}`);

    // Invalidate recommendation cache since used listings data changed
    if (totalListings > 0) {
      console.log(`\n🔄 Invalidating recommendation cache...`);
      try {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        const response = await fetch(`${baseUrl}/api/cache/invalidate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag: 'recommendations' })
        });

        if (response.ok) {
          const result = await response.json();
          console.log(`   ✅ Cache invalidated successfully`);
        } else {
          console.log(`   ⚠️  Cache invalidation failed (status ${response.status})`);
        }
      } catch (error) {
        console.log(`   ⚠️  Cache invalidation error: ${error.message}`);
        console.log(`   (This is non-critical - cache will auto-expire in 10 minutes)`);
      }
    }

    releaseLock();

  } catch (error) {
    console.error('❌ Fatal error:', error);
    releaseLock();
    process.exit(1);
  }
}

// Main execution
if (require.main === module) {
  scrapeReddit();
}

module.exports = {
  scrapeReddit
};
