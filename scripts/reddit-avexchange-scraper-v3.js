/**
 * Reddit r/AVExchange Scraper V3 - Complete Rewrite
 *
 * New Architecture:
 * 1. Fetch ALL recent [WTS] posts from r/AVexchange
 * 2. Parse each post to extract brand/model being sold
 * 3. Match to component database using enhanced fuzzy matching
 * 4. Filter out accessories and mismatches
 *
 * This eliminates the false positives from the old search-per-component approach
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { findComponentMatch, isAccessoryOnly, detectMultipleComponents } = require('./component-matcher-enhanced');
const { extractComponentCandidate } = require('./component-candidate-extractor');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Lock file to prevent concurrent runs
const LOCK_FILE = path.join(__dirname, '.reddit-scraper-v3.lock');

// Reddit API configuration
const REDDIT_CONFIG = {
  apiUrl: 'https://oauth.reddit.com',
  publicUrl: 'https://www.reddit.com',
  subreddit: 'AVExchange',

  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  userAgent: 'HiFinder-UsedListingAggregator/3.0 (by /u/hifinder)',

  searchParams: {
    limit: 100,
    sort: 'new',
    time: 'month', // Past month of posts
    restrict_sr: true
  },

  rateLimit: 3000, // 3 seconds between requests
  maxRetries: 3,
  retryBaseDelay: 10000
};

let accessToken = null;
let tokenExpiry = null;

// Statistics tracking
const stats = {
  postsProcessed: 0,
  sellPostsFound: 0,
  accessoriesFiltered: 0,
  componentsMatched: 0,
  noMatchFound: 0,
  newListings: 0,
  updatedListings: 0,
  candidatesCreated: 0,
  candidatesUpdated: 0
};

/**
 * Acquire lock
 */
function acquireLock() {
  if (fs.existsSync(LOCK_FILE)) {
    const lockData = JSON.parse(fs.readFileSync(LOCK_FILE, 'utf8'));
    const lockAge = Date.now() - lockData.timestamp;

    if (lockAge < 2 * 60 * 60 * 1000) {
      console.error(`❌ Another scraper is running (PID: ${lockData.pid})`);
      return false;
    }

    console.log(`⚠️  Stale lock found, removing...`);
    fs.unlinkSync(LOCK_FILE);
  }

  fs.writeFileSync(LOCK_FILE, JSON.stringify({
    pid: process.pid,
    timestamp: Date.now(),
    startedAt: new Date().toISOString()
  }));

  console.log(`🔒 Lock acquired`);
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
 * Get Reddit OAuth token
 */
async function getRedditAccessToken() {
  // Check if we have a valid cached token
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  const credentials = Buffer.from(
    `${REDDIT_CONFIG.clientId}:${REDDIT_CONFIG.clientSecret}`
  ).toString('base64');

  try {
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': REDDIT_CONFIG.userAgent
      },
      body: 'grant_type=client_credentials'
    });

    if (!response.ok) {
      throw new Error(`OAuth failed: ${response.status}`);
    }

    const data = await response.json();
    accessToken = data.access_token;
    tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 min early

    console.log(`✅ Reddit OAuth token acquired`);
    return accessToken;

  } catch (error) {
    console.error(`❌ OAuth error:`, error.message);
    return null;
  }
}

/**
 * Fetch with retry logic for rate limiting
 */
async function fetchWithRetry(url, options, retries = 0) {
  try {
    const response = await fetch(url, options);

    if (response.status === 429 && retries < REDDIT_CONFIG.maxRetries) {
      const delay = REDDIT_CONFIG.retryBaseDelay * Math.pow(2, retries);
      console.log(`⚠️  Rate limited, waiting ${delay/1000}s... (retry ${retries + 1}/${REDDIT_CONFIG.maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries + 1);
    }

    return response;

  } catch (error) {
    if (retries < REDDIT_CONFIG.maxRetries) {
      const delay = REDDIT_CONFIG.retryBaseDelay;
      console.log(`⚠️  Fetch error, retrying in ${delay/1000}s...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return fetchWithRetry(url, options, retries + 1);
    }
    throw error;
  }
}

/**
 * Fetch ALL recent posts from r/AVexchange
 */
async function fetchAllRecentPosts() {
  console.log('📡 Fetching all recent [WTS] posts from r/AVexchange...\n');

  const token = await getRedditAccessToken();
  if (!token) {
    throw new Error('Failed to get Reddit OAuth token');
  }

  const url = `${REDDIT_CONFIG.apiUrl}/r/${REDDIT_CONFIG.subreddit}/new`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    'User-Agent': REDDIT_CONFIG.userAgent
  };

  const params = new URLSearchParams({
    limit: REDDIT_CONFIG.searchParams.limit,
    t: REDDIT_CONFIG.searchParams.time,
    restrict_sr: REDDIT_CONFIG.searchParams.restrict_sr
  });

  const response = await fetchWithRetry(`${url}?${params}`, { headers });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }

  const data = await response.json();
  const posts = data.data?.children || [];

  console.log(`📦 Fetched ${posts.length} recent posts\n`);
  return posts.map(p => p.data);
}

/**
 * Check if post is a selling post
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
 * Check if post has been marked as sold
 */
function isSoldPost(postData) {
  const title = postData.title.toLowerCase();
  const flair = (postData.link_flair_text || '').toLowerCase();
  const selftext = (postData.selftext || '').toLowerCase();

  // Check flair first (most reliable)
  if (flair.includes('closed') || flair.includes('sold') || flair.includes('complete')) {
    return true;
  }

  // Check title
  if (title.includes('[sold]') || title.includes('(sold)') || title.includes('sold to') || title.includes(' spf')) {
    return true;
  }

  // Check post body
  if (selftext.includes('sold to') || selftext.includes('**sold**') || selftext.includes('~~sold~~')) {
    return true;
  }

  return false;
}

/**
 * Extract price from post title
 */
function extractPrice(title) {
  const patterns = [
    /\$(\d{1,5}(?:,\d{3})*)/g,
    /asking\s*\$?(\d{1,5})/gi,
    /price:?\s*\$?(\d{1,5})/gi,
    /(\d{1,5})\s*(?:usd|dollars?)/gi
  ];

  for (const pattern of patterns) {
    const matches = [...title.matchAll(pattern)];
    if (matches.length > 0) {
      const prices = matches.map(m => parseInt(m[1].replace(/,/g, '')));
      return Math.min(...prices); // Return lowest price (most conservative)
    }
  }

  return null;
}

/**
 * Transform Reddit post into listing object
 */
function transformRedditPost(postData, matchResult) {
  const component = matchResult.component;
  const price = extractPrice(postData.title);

  // Extract location from title (common pattern: [WTS][US-CA] or [US-TX])
  const locationMatch = postData.title.match(/\[([A-Z]{2}(?:-[A-Z]{2})?)\]/);
  const location = locationMatch ? locationMatch[1] : 'Unknown';

  // Detect if this is a bundle listing
  const bundleInfo = detectMultipleComponents(postData.title);

  return {
    component_id: component.id,
    title: postData.title,
    price: price || 0,
    url: `https://www.reddit.com${postData.permalink}`,
    source: 'reddit_avexchange',
    location: location,
    date_posted: new Date(postData.created_utc * 1000).toISOString(),
    seller_username: postData.author,
    condition: 'good', // Default, Reddit doesn't standardize this
    status: isSoldPost(postData) ? 'sold' : 'available',
    images: extractImages(postData),
    seller_confirmed_trades: null, // Will be populated by separate bot check if needed
    price_warning: price ? null : 'Price not found in title',
    is_bundle: bundleInfo.isBundle,
    component_count: bundleInfo.componentCount
  };
}

/**
 * Extract images from Reddit post
 */
function extractImages(postData) {
  const images = [];

  // Check for image post
  if (postData.post_hint === 'image' && postData.url) {
    images.push(postData.url);
  }

  // Check for gallery
  if (postData.is_gallery && postData.gallery_data) {
    for (const item of postData.gallery_data.items) {
      const mediaId = item.media_id;
      const media = postData.media_metadata[mediaId];
      if (media && media.s && media.s.u) {
        // Decode HTML entities in URL
        const imageUrl = media.s.u.replace(/&amp;/g, '&');
        images.push(imageUrl);
      }
    }
  }

  return images.length > 0 ? images : null;
}

/**
 * Main scraping function
 */
async function scrapeReddit() {
  console.log('🚀 Starting Reddit r/AVExchange Scraper V3\n');
  console.log('Architecture: Fetch-all → Parse → Match\n');

  try {
    // Fetch all recent posts
    const posts = await fetchAllRecentPosts();
    stats.postsProcessed = posts.length;

    console.log('🔍 Processing posts...\n');

    for (const post of posts) {
      // Filter for selling posts only
      if (!isSellPost(post.title)) {
        continue;
      }

      stats.sellPostsFound++;

      // Skip if already sold
      if (isSoldPost(post)) {
        console.log(`⏭️  Skipping sold post: ${post.title.substring(0, 50)}...`);
        continue;
      }

      console.log(`\n📝 Processing: ${post.title.substring(0, 70)}...`);

      // Attempt to match to component database
      const matchResult = await findComponentMatch(
        post.title,
        post.selftext || '',
        'reddit_avexchange'
      );

      if (!matchResult) {
        stats.noMatchFound++;

        // Extract as component candidate for review
        console.log(`  ⚠️  No match found, extracting as candidate...`);
        const candidate = await extractComponentCandidate({
          title: post.title,
          price: extractPrice(post.title),
          id: null, // Will be created as candidate, not listing
          url: `https://www.reddit.com${post.permalink}`
        });

        if (candidate) {
          if (candidate.listing_count === 1) {
            stats.candidatesCreated++;
          } else {
            stats.candidatesUpdated++;
          }
        }

        continue;
      }

      stats.componentsMatched++;

      // Transform into listing object
      const listing = transformRedditPost(post, matchResult);

      // Upsert to database
      const { data, error } = await supabase
        .from('used_listings')
        .upsert(listing, {
          onConflict: 'url',
          ignoreDuplicates: false
        })
        .select('id');

      if (error) {
        console.error(`❌ Error upserting:`, error.message);
      } else {
        stats.newListings++;
        console.log(`💾 Saved listing for ${matchResult.component.brand} ${matchResult.component.name}`);
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Print statistics
    console.log('\n' + '='.repeat(60));
    console.log('📊 Scraping Statistics');
    console.log('='.repeat(60));
    console.log(`Posts processed:        ${stats.postsProcessed}`);
    console.log(`Sell posts found:       ${stats.sellPostsFound}`);
    console.log(`Accessories filtered:   ${stats.accessoriesFiltered}`);
    console.log(`Components matched:     ${stats.componentsMatched}`);
    console.log(`No match found:         ${stats.noMatchFound}`);
    console.log(`Listings saved/updated: ${stats.newListings}`);
    console.log(`\n🆕 Component Candidates:`);
    console.log(`  New candidates:       ${stats.candidatesCreated}`);
    console.log(`  Updated candidates:   ${stats.candidatesUpdated}`);
    console.log('='.repeat(60));

    console.log('\n✅ Scraping complete!');

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    throw error;
  }
}

/**
 * Main execution
 */
async function main() {
  if (!acquireLock()) {
    process.exit(1);
  }

  try {
    await scrapeReddit();
  } catch (error) {
    console.error('Scraper failed:', error);
    process.exit(1);
  } finally {
    releaseLock();
  }
}

// Run if called directly
if (require.main === module) {
  main().then(() => {
    console.log('✅ Done!');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
}

module.exports = { scrapeReddit };
