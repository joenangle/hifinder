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
const { extractBundleComponents, generateBundleGroupId, calculateBundlePrice } = require('./bundle-extractor');
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
  candidatesUpdated: 0,
  soldStatusUpdated: 0,
  soldSkipped: 0
};

const VERBOSE = process.env.SCRAPER_VERBOSE === '1' || process.argv.includes('--verbose');

// Timing tracking
const timings = {
  overall: { start: 0, end: 0 },
  oauthToken: { start: 0, end: 0 },
  fetchPosts: { start: 0, end: 0 },
  processing: { start: 0, end: 0 },
  perPost: [],          // Array of { title, totalMs, matchMs, upsertMs, candidateMs }
  totalMatchMs: 0,
  totalUpsertMs: 0,
  totalCandidateMs: 0,
  totalDelayMs: 0,
  rateLimit429Count: 0,
  rateLimitWaitMs: 0,
};

function elapsed(timing) {
  return ((timing.end - timing.start) / 1000).toFixed(2);
}

function msLabel(ms) {
  if (ms >= 60000) return `${(ms / 60000).toFixed(1)}m`;
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

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
      timings.rateLimit429Count++;
      timings.rateLimitWaitMs += delay;
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
 * Extract price from post title and body
 * Searches both title and selftext for price information
 * Consolidated regex pattern fixes $1,200 -> $200 bug from pattern overlap
 */
function extractPrice(title, selftext = '') {
  const combinedText = title + ' ' + (selftext || '');
  return extractPricesFromText(combinedText);
}

/**
 * Extract the price associated with a specific component from a multi-item post body.
 * Handles formatted posts like:
 *   * Qudelix 5k - $75 - No box
 *   * Tanchjim Stargate 2 - $25
 *   Sennheiser HD600 $350 shipped
 *
 * Falls back to the global extractPrice() if no line-level match is found.
 *
 * @param {string} componentName - e.g. "Qudelix 5K"
 * @param {string} title - Post title
 * @param {string} selftext - Post body
 * @param {string} [matchedSegment] - The segment text that matched this component
 * @returns {number|null} - Price or null
 */
function extractComponentPrice(componentName, title, selftext = '', matchedSegment = '') {
  if (!selftext) return extractPrice(title, selftext);

  // Normalize for comparison: lowercase, strip hyphens/extra spaces
  const normalize = (s) => s.toLowerCase().replace(/[-–—]/g, ' ').replace(/\s+/g, ' ').trim();
  const normalizedName = normalize(componentName);

  // Build search terms from component name (e.g. "Qudelix 5K" → ["qudelix", "5k"])
  const nameTokens = normalizedName.split(' ').filter(t => t.length >= 2);

  // Split body into lines
  const lines = selftext.split(/\n/);

  for (const line of lines) {
    const normalizedLine = normalize(line);

    // Check if this line contains enough tokens from the component name
    const matchedTokens = nameTokens.filter(token => normalizedLine.includes(token));
    if (matchedTokens.length < Math.max(1, Math.ceil(nameTokens.length * 0.6))) {
      continue; // Not enough tokens matched on this line
    }

    // Found the line — extract price from THIS line only
    const linePrice = extractPricesFromText(line);
    if (linePrice) {
      return linePrice;
    }
  }

  // Fallback: try extracting from the title (for single-item posts or title-priced posts)
  return extractPricesFromText(title);
}

/**
 * Core price extraction from a text string.
 * Returns the highest-priority price, preferring bundle totals over per-item prices.
 */
function extractPricesFromText(text) {
  // Check if this is likely a bundle listing with multiple prices
  const hasBundleKeywords = /\b(all|bundle|total|together|both|for everything|combo|package)\b/i.test(text);

  // Priority 0 (HIGHEST): Price in [W] (Want) section - most reliable for total price
  const wantPattern = /\[W\][^\[]*?\$?(\d{1,5}(?:,\d{3})*)\b/gi;

  // Pattern 1: Bundle keywords + price (e.g., "asking $500 for all", "$300 total")
  const bundlePattern = /\b(?:asking|price:?|selling)\s*\$?(\d{1,5}(?:,\d{3})*)\s*(?:for\s+)?(?:all|total|together|both|everything|bundle)/gi;

  // Pattern 2: $X,XXX or $XXX (standard dollar signs)
  const dollarPattern = /\$(\d{1,5}(?:,\d{3})*(?:\.\d{2})?)/g;

  // Pattern 3: asking/price/selling $XXX (without bundle keywords)
  const askingPattern = /\b(?:asking|price:?|selling\s*(?:for|at)?)\s*\$?(\d{1,5}(?:,\d{3})*)/gi;

  // Pattern 4: XXX shipped / XXX obo
  const shippedPattern = /\b(\d{3,5})\s*(?:shipped|obo|or best offer|firm)\b/gi;

  // Pattern 5: XXX USD
  const currencyPattern = /\b(\d{3,5})\s*(?:usd|dollars?)\b/gi;

  const allPrices = [];

  // Extract Priority 0: [W] section prices
  let match;
  while ((match = wantPattern.exec(text)) !== null) {
    const price = parseInt(match[1].replace(/,/g, ''), 10);
    if (price >= 10 && price <= 10000) {
      allPrices.push({ price, priority: 0 });
    }
  }

  // Extract Priority 1: Bundle keyword + price
  while ((match = bundlePattern.exec(text)) !== null) {
    const price = parseInt(match[1].replace(/,/g, ''), 10);
    if (price >= 10 && price <= 10000) {
      allPrices.push({ price, priority: 1 });
    }
  }

  // Extract Priority 2: Standard dollar signs
  while ((match = dollarPattern.exec(text)) !== null) {
    const price = parseInt(match[1].replace(/,/g, ''), 10);
    if (price >= 10 && price <= 10000) {
      allPrices.push({ price, priority: 2 });
    }
  }

  // Extract Priority 3: Asking/price/selling
  while ((match = askingPattern.exec(text)) !== null) {
    const price = parseInt(match[1].replace(/,/g, ''), 10);
    if (price >= 10 && price <= 10000) {
      allPrices.push({ price, priority: 3 });
    }
  }

  // Extract Priority 4: Shipped/OBO
  while ((match = shippedPattern.exec(text)) !== null) {
    const price = parseInt(match[1], 10);
    if (price >= 10 && price <= 10000) {
      allPrices.push({ price, priority: 4 });
    }
  }

  // Extract Priority 5: USD/dollars
  while ((match = currencyPattern.exec(text)) !== null) {
    const price = parseInt(match[1], 10);
    if (price >= 10 && price <= 10000) {
      allPrices.push({ price, priority: 5 });
    }
  }

  if (allPrices.length === 0) return null;

  // Sort by priority first
  allPrices.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;

    // Within same priority: if bundle keywords exist, prefer HIGHEST price (likely the total)
    // Otherwise prefer LOWEST price (for single items)
    return hasBundleKeywords ? b.price - a.price : a.price - b.price;
  });

  return allPrices[0].price;
}

/**
 * Extract location from Reddit post title
 * Handles: [US-XX], [USA-XX], [CAN-XX], [UK], etc.
 */
function extractLocation(title) {
  const locationPatterns = [
    // US formats (most common)
    /\[USA[\s-]([A-Z]{2})\]/i,      // [USA-CA] or [USA CA] → normalize to US-XX
    /\[US[\s-]([A-Z]{2})\]/i,       // [US-CA] or [US CA] → US-XX

    // Canada formats
    /\[CAN[\s-]([A-Z]{2})\]/i,      // [CAN-ON] or [CAN ON] → CA-XX
    /\[CA[\s-]([A-Z]{2})\]/i,       // [CA-ON] or [CA ON] → CA-XX

    // Other countries (single codes)
    /\[(UK|EU|AU|AUS|NZ|IND|KSA|AUS-[A-Z]{2,3})\]/i,  // [UK], [AUS-SYD], etc.

    // Generic fallback for any XX-YY pattern
    /\[([A-Z]{2,3})[\s-]([A-Z]{2,3})\]/i
  ];

  let location = 'Unknown';
  for (const pattern of locationPatterns) {
    const match = title.match(pattern);
    if (match) {
      const fullMatch = match[0];

      // Normalize USA-XX to US-XX
      if (fullMatch.includes('USA')) {
        const state = match[1];
        location = `US-${state}`;
      }
      // Normalize CAN-XX to CA-XX
      else if (fullMatch.includes('CAN')) {
        const province = match[1];
        location = `CA-${province}`;
      }
      // For US-XX or CA-XX with space, normalize to hyphen
      else if (fullMatch.match(/\[US\s/i)) {
        const state = match[1];
        location = `US-${state}`;
      }
      else if (fullMatch.match(/\[CA\s/i)) {
        const province = match[1];
        location = `CA-${province}`;
      }
      // For other formats, return as-is without brackets
      else {
        location = fullMatch.replace(/[\[\]]/g, '').replace(/\s+/g, '-');
      }
      break;
    }
  }

  return location;
}

/**
 * Transform Reddit post into listing object (DEPRECATED - kept for backward compatibility)
 * NOTE: Main scraper now uses bundle-aware extraction directly
 */
function transformRedditPost(postData, matchResult) {
  const component = matchResult.component;
  const price = extractPrice(postData.title, postData.selftext || '');
  const location = extractLocation(postData.title);
  const bundleInfo = detectMultipleComponents(postData.title);
  const soldStatus = isSoldPost(postData);

  return {
    component_id: component.id,
    title: postData.title,
    price: price || 0,
    url: `https://www.reddit.com${postData.permalink}`,
    source: 'reddit_avexchange',
    location: location,
    date_posted: new Date(postData.created_utc * 1000).toISOString(),
    seller_username: postData.author,
    condition: 'good',
    status: soldStatus ? 'sold' : 'available',
    date_sold: soldStatus ? new Date(postData.created_utc * 1000).toISOString() : null,
    images: extractImages(postData),
    seller_confirmed_trades: null,
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
  timings.overall.start = Date.now();

  try {
    // Fetch all recent posts
    timings.fetchPosts.start = Date.now();
    const posts = await fetchAllRecentPosts();
    timings.fetchPosts.end = Date.now();
    stats.postsProcessed = posts.length;

    // Pre-load existing listing URLs to skip already-processed posts
    console.log('📦 Loading existing listing URLs...');
    const { data: existingRows, error: existingErr } = await supabase
      .from('used_listings')
      .select('id, url, status')
      .eq('source', 'reddit_avexchange');

    // Map: url -> array of { id, status }
    const existingByUrl = new Map();
    if (!existingErr && existingRows) {
      for (const row of existingRows) {
        if (!existingByUrl.has(row.url)) {
          existingByUrl.set(row.url, []);
        }
        existingByUrl.get(row.url).push({ id: row.id, status: row.status });
      }
      console.log(`📦 Loaded ${existingByUrl.size} existing listing URLs\n`);
    }

    console.log('🔍 Processing posts...\n');
    timings.processing.start = Date.now();

    for (const post of posts) {
      // Filter for selling posts only
      if (!isSellPost(post.title)) {
        continue;
      }

      stats.sellPostsFound++;

      const postUrl = `https://www.reddit.com${post.permalink}`;

      // If post is sold, update any existing listings in DB and move on
      if (isSoldPost(post)) {
        const existing = existingByUrl.get(postUrl);
        const needsUpdate = existing?.filter(l => l.status !== 'sold') || [];

        if (needsUpdate.length > 0) {
          const ids = needsUpdate.map(l => l.id);
          const { error: updateErr } = await supabase
            .from('used_listings')
            .update({
              status: 'sold',
              date_sold: new Date().toISOString()
            })
            .in('id', ids);

          if (!updateErr) {
            stats.soldStatusUpdated += ids.length;
            console.log(`🏷️  Marked ${ids.length} listing(s) as sold: ${post.title.substring(0, 50)}...`);
          } else {
            console.error(`  ❌ Failed to update sold status:`, updateErr.message);
          }
        } else {
          stats.soldSkipped++;
        }
        continue;
      }

      // Skip posts already processed (URL exists in DB with active status)
      if (existingByUrl.has(postUrl)) {
        stats.skippedExisting = (stats.skippedExisting || 0) + 1;
        continue;
      }

      const postTiming = {
        title: post.title.substring(0, 60),
        totalStart: Date.now(),
        matchMs: 0,
        upsertMs: 0,
        candidateMs: 0,
        totalMs: 0,
      };

      console.log(`\n📝 Processing: ${post.title.substring(0, 70)}...`);

      // Attempt to match using bundle-aware extraction
      const matchStart = Date.now();
      const bundleMatches = await extractBundleComponents(
        post.title,
        post.selftext || '',
        'reddit_avexchange'
      );
      postTiming.matchMs = Date.now() - matchStart;
      timings.totalMatchMs += postTiming.matchMs;

      if (bundleMatches.length === 0) {
        stats.noMatchFound++;

        // Extract as component candidate for review
        console.log(`  ⚠️  No match found, extracting as candidate...`);
        const candidateStart = Date.now();
        const candidate = await extractComponentCandidate({
          title: post.title,
          price: extractPrice(post.title),
          id: null,
          url: `https://www.reddit.com${post.permalink}`
        });
        postTiming.candidateMs = Date.now() - candidateStart;
        timings.totalCandidateMs += postTiming.candidateMs;

        if (candidate) {
          if (candidate.listing_count === 1) {
            stats.candidatesCreated++;
          } else {
            stats.candidatesUpdated++;
          }
        }

        postTiming.totalMs = Date.now() - postTiming.totalStart;
        timings.perPost.push(postTiming);
        if (VERBOSE) console.log(`  ⏱️  Post took ${msLabel(postTiming.totalMs)} (match: ${msLabel(postTiming.matchMs)}, candidate: ${msLabel(postTiming.candidateMs)})`);
        continue;
      }

      stats.componentsMatched++;

      // Generate bundle group ID if multiple matches
      const bundleGroupId = bundleMatches.length > 1
        ? generateBundleGroupId()
        : null;

      // Extract common data once
      const totalPrice = extractPrice(post.title, post.selftext);
      const location = extractLocation(post.title);
      const images = extractImages(post);
      const soldStatus = isSoldPost(post);

      console.log(`  📦 Creating ${bundleMatches.length} listing(s) from ${bundleMatches.length > 1 ? 'bundle' : 'single item'}`);

      // Create listing for EACH matched component
      const upsertStart = Date.now();
      for (let i = 0; i < bundleMatches.length; i++) {
        const match = bundleMatches[i];

        // Extract per-component price from body text (handles multi-item posts with individual prices)
        const componentName = `${match.component.brand} ${match.component.name}`;
        const perComponentPrice = extractComponentPrice(
          componentName, post.title, post.selftext, match.segment
        );

        // Calculate price for this component
        let priceInfo;
        if (bundleMatches.length > 1) {
          if (perComponentPrice && perComponentPrice !== totalPrice) {
            // Found a per-item price in the body — use it directly
            priceInfo = {
              individual_price: perComponentPrice,
              bundle_total_price: totalPrice,
              bundle_component_count: bundleMatches.length
            };
            console.log(`    💰 Per-item price for ${match.component.name}: $${perComponentPrice}`);
          } else {
            priceInfo = calculateBundlePrice(totalPrice, bundleMatches.length, i, match.component);
          }
        } else {
          // Single item — try per-component price first (for when global extractPrice picks wrong price)
          priceInfo = { individual_price: perComponentPrice || totalPrice, bundle_total_price: null };
        }

        const listing = {
          component_id: match.component.id,
          title: post.title,
          price: priceInfo.individual_price || null,
          price_is_estimated: priceInfo.price_is_estimated || false,

          // Bundle metadata
          is_bundle: bundleMatches.length > 1,
          bundle_group_id: bundleGroupId,
          bundle_total_price: priceInfo.bundle_total_price,
          bundle_component_count: bundleMatches.length,
          bundle_position: bundleMatches.length > 1 ? i + 1 : null,
          matched_segment: match.segment,

          // Common data
          url: `https://www.reddit.com${post.permalink}`,
          source: 'reddit_avexchange',
          location: location,
          date_posted: new Date(post.created_utc * 1000).toISOString(),
          seller_username: post.author,
          condition: 'good', // Default
          images: images,
          status: soldStatus ? 'sold' : 'available',
          component_count: bundleMatches.length,
          seller_confirmed_trades: null,
          seller_feedback_score: null
        };

        // Upsert to database
        const { error } = await supabase
          .from('used_listings')
          .upsert(listing, {
            onConflict: 'url,component_id', // New composite unique constraint
            ignoreDuplicates: false
          })
          .select('id');

        if (error) {
          console.error(`  ❌ Failed to upsert ${match.component.brand} ${match.component.name}:`, error.message);
        } else {
          stats.newListings++;
          console.log(`  ✅ Saved: ${match.component.brand} ${match.component.name} (${match.score.toFixed(2)})`);
        }
      }
      postTiming.upsertMs = Date.now() - upsertStart;
      timings.totalUpsertMs += postTiming.upsertMs;

      // Note: No per-post delay needed — Reddit API is called once upfront.
      // The 500ms delay was originally for Reddit rate limiting but all API
      // calls happen in fetchAllRecentPosts(). Remaining work is DB-only.

      postTiming.totalMs = Date.now() - postTiming.totalStart;
      timings.perPost.push(postTiming);
      if (VERBOSE) console.log(`  ⏱️  Post took ${msLabel(postTiming.totalMs)} (match: ${msLabel(postTiming.matchMs)}, upsert: ${msLabel(postTiming.upsertMs)})`);
    }

    timings.processing.end = Date.now();

    // Expire stale listings (Reddit posts older than 30 days without a sale)
    console.log('\n🧹 Checking for stale listings...');
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: staleListings, error: staleErr } = await supabase
      .from('used_listings')
      .update({ status: 'expired' })
      .eq('source', 'reddit_avexchange')
      .eq('status', 'available')
      .lt('date_posted', thirtyDaysAgo)
      .select('id');

    if (!staleErr && staleListings) {
      console.log(`🧹 Expired ${staleListings.length} stale listing(s) (>30 days old)`);
      stats.expiredListings = staleListings.length;
    } else if (staleErr) {
      console.error('  ❌ Failed to expire stale listings:', staleErr.message);
    }

    timings.overall.end = Date.now();

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
    console.log(`Sold status updated:    ${stats.soldStatusUpdated}`);
    console.log(`Already processed:      ${stats.skippedExisting || 0}`);
    console.log(`Stale listings expired: ${stats.expiredListings || 0}`);
    console.log(`\n🆕 Component Candidates:`);
    console.log(`  New candidates:       ${stats.candidatesCreated}`);
    console.log(`  Updated candidates:   ${stats.candidatesUpdated}`);
    console.log('='.repeat(60));

    // Always show total execution time
    console.log(`\n⏱️  Total execution: ${elapsed(timings.overall)}s`);

    // Detailed timing report only with SCRAPER_VERBOSE=1 or --verbose
    if (VERBOSE) {
      console.log('\n' + '='.repeat(60));
      console.log('⏱️  Detailed Timing Report');
      console.log('='.repeat(60));
      console.log(`  Fetch posts:          ${elapsed(timings.fetchPosts)}s`);
      console.log(`  Processing:           ${elapsed(timings.processing)}s`);
      console.log(`    Component matching: ${msLabel(timings.totalMatchMs)}`);
      console.log(`    DB upserts:         ${msLabel(timings.totalUpsertMs)}`);
      console.log(`    Candidate extract:  ${msLabel(timings.totalCandidateMs)}`);
      console.log(`    Rate limit delays:  ${msLabel(timings.totalDelayMs)}`);
      console.log(`  Rate limit 429s:      ${timings.rateLimit429Count} (waited ${msLabel(timings.rateLimitWaitMs)})`);

      // Slowest posts
      const sortedPosts = [...timings.perPost].sort((a, b) => b.totalMs - a.totalMs);
      if (sortedPosts.length > 0) {
        console.log(`\n🐌 Top 5 Slowest Posts:`);
        for (const p of sortedPosts.slice(0, 5)) {
          console.log(`  ${msLabel(p.totalMs).padStart(6)} | match: ${msLabel(p.matchMs).padStart(6)} | upsert: ${msLabel(p.upsertMs).padStart(6)} | ${p.title}`);
        }

        const avgTotal = timings.perPost.reduce((s, p) => s + p.totalMs, 0) / timings.perPost.length;
        const avgMatch = timings.perPost.reduce((s, p) => s + p.matchMs, 0) / timings.perPost.length;
        console.log(`\n  Average per post:     ${msLabel(avgTotal)} (match: ${msLabel(avgMatch)})`);
      }

      console.log('='.repeat(60));
    }
    console.log('\n✅ Scraping complete!');

  } catch (error) {
    // Print partial timing on failure
    timings.overall.end = Date.now();
    console.error('\n❌ Fatal error:', error);
    console.log(`\n⏱️  Failed after ${elapsed(timings.overall)}s`);
    console.log(`  Posts processed so far: ${timings.perPost.length}`);
    console.log(`  Component matching:     ${msLabel(timings.totalMatchMs)}`);
    console.log(`  DB upserts:             ${msLabel(timings.totalUpsertMs)}`);
    console.log(`  Rate limit 429s:        ${timings.rateLimit429Count} (waited ${msLabel(timings.rateLimitWaitMs)})`);
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
