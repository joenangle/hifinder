/**
 * AVExchangeBot Confirmation Monitor for HiFinder
 *
 * Monitors r/AVExchange posts for AVExchangeBot confirmation comments
 * Updates listings with verified sale data (date_sold, buyer, confirmation status)
 *
 * How AVExchangeBot works:
 * 1. Seller posts item for sale
 * 2. After transaction, seller comments "purchased [item] from u/buyer" (or similar)
 * 3. AVExchangeBot replies to track the transaction
 * 4. Buyer replies to bot comment to confirm
 * 5. Bot updates both users' trade counts
 *
 * This script:
 * - Monitors recent AVExchange posts in our database
 * - Checks for AVExchangeBot comment threads
 * - Extracts confirmed transaction data
 * - Updates listing status to 'sold' with verified date and buyer info
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
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  userAgent: 'HiFinder-AVExchangeMonitor/1.0 (by /u/hifinder)',
  rateLimit: 2000, // 2 seconds between requests
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
    throw new Error('Reddit credentials not configured');
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
    throw error;
  }
}

/**
 * Extract Reddit post ID from URL
 */
function extractPostIdFromUrl(url) {
  // URL format: https://www.reddit.com/r/AVexchange/comments/{post_id}/{title}/
  const match = url.match(/\/comments\/([a-z0-9]+)\//i);
  return match ? match[1] : null;
}

/**
 * Fetch comments for a Reddit post
 */
async function fetchPostComments(postId) {
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
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Reddit returns [post_data, comments_data]
    if (!data || !Array.isArray(data) || data.length < 2) {
      return [];
    }

    // Extract comment tree
    const commentsData = data[1];
    if (!commentsData?.data?.children) {
      return [];
    }

    return commentsData.data.children;

  } catch (error) {
    console.error(`❌ Error fetching comments for post ${postId}:`, error.message);
    return [];
  }
}

/**
 * Find AVExchangeBot confirmation comments in comment tree
 */
function findAVExchangeBotConfirmations(comments) {
  const confirmations = [];

  function traverseComments(commentNodes) {
    for (const node of commentNodes) {
      if (node.kind !== 't1') continue; // Only process comments

      const comment = node.data;

      // Check if this is an AVExchangeBot comment
      if (comment.author === 'AVexchangeBot') {
        // Parse bot comment to extract transaction details
        const confirmation = parseAVExchangeBotComment(comment);
        if (confirmation) {
          confirmations.push(confirmation);
        }
      }

      // Recurse into replies
      if (comment.replies && comment.replies.data && comment.replies.data.children) {
        traverseComments(comment.replies.data.children);
      }
    }
  }

  traverseComments(comments);
  return confirmations;
}

/**
 * Parse AVExchangeBot comment to extract transaction details
 *
 * Bot comment format:
 * "Hello, u/seller. Added
 *  • u/seller -> 2 Trades
 *  • u/buyer -> 4 Trades"
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
      return null; // Need at least 2 users (seller and buyer)
    }

    const [seller, buyer] = matches.map(m => m[1]);

    // Check if both parties have replied (feedback given)
    const replies = comment.replies?.data?.children || [];
    const replyAuthors = new Set(
      replies
        .filter(r => r.kind === 't1')
        .map(r => r.data.author?.toLowerCase())
    );

    const sellerFeedbackGiven = replyAuthors.has(seller.toLowerCase());
    const buyerFeedbackGiven = replyAuthors.has(buyer.toLowerCase());

    // Only consider it confirmed if both parties replied
    const isFullyConfirmed = sellerFeedbackGiven && buyerFeedbackGiven;

    return {
      commentId: comment.id,
      dateSold: new Date(created * 1000).toISOString(),
      sellerUsername: seller,
      buyerUsername: buyer,
      sellerFeedbackGiven,
      buyerFeedbackGiven,
      isFullyConfirmed,
      botCommentBody: body
    };

  } catch (error) {
    console.error('Error parsing AVExchangeBot comment:', error.message);
    return null;
  }
}

/**
 * Update listing with AVExchangeBot confirmation data
 */
async function updateListingWithConfirmation(listingId, confirmation) {
  try {
    const updateData = {
      status: 'sold',
      date_sold: confirmation.dateSold,
      buyer_username: confirmation.buyerUsername,
      avexchange_bot_confirmed: true,
      avexchange_bot_comment_id: confirmation.commentId,
      seller_feedback_given: confirmation.sellerFeedbackGiven,
      buyer_feedback_given: confirmation.buyerFeedbackGiven,
      is_active: false
    };

    const { error } = await supabase
      .from('used_listings')
      .update(updateData)
      .eq('id', listingId);

    if (error) {
      console.error(`❌ Error updating listing ${listingId}:`, error.message);
      return false;
    }

    return true;

  } catch (error) {
    console.error(`❌ Exception updating listing ${listingId}:`, error.message);
    return false;
  }
}

/**
 * Process a single listing to check for AVExchangeBot confirmations
 */
async function processListing(listing) {
  try {
    // Skip if already bot-confirmed
    if (listing.avexchange_bot_confirmed) {
      return { skipped: true, reason: 'already_confirmed' };
    }

    // Only check listings that are already marked as sold
    // This avoids false positives from multi-item posts where we can't tell which item sold
    if (listing.status !== 'sold') {
      return { skipped: true, reason: 'not_sold_yet' };
    }

    // Extract post ID from URL
    const postId = extractPostIdFromUrl(listing.url);
    if (!postId) {
      return { skipped: true, reason: 'invalid_url' };
    }

    console.log(`🔍 Checking post ${postId} for confirmations...`);

    // Fetch comments
    const comments = await fetchPostComments(postId);
    if (comments.length === 0) {
      return { skipped: true, reason: 'no_comments' };
    }

    // Find AVExchangeBot confirmations
    const confirmations = findAVExchangeBotConfirmations(comments);

    if (confirmations.length === 0) {
      return { skipped: true, reason: 'no_bot_confirmation' };
    }

    // Use the first (usually only) confirmation
    const confirmation = confirmations[0];

    // Only update if both parties have confirmed (per requirements)
    if (!confirmation.isFullyConfirmed) {
      console.log(`⏳ Partial confirmation for listing ${listing.id} (waiting for both parties)`);
      return { skipped: true, reason: 'partial_confirmation' };
    }

    console.log(`✅ Found bot confirmation: ${confirmation.sellerUsername} → ${confirmation.buyerUsername}`);

    // Update listing
    const success = await updateListingWithConfirmation(listing.id, confirmation);

    if (success) {
      console.log(`✅ Updated listing ${listing.id} with confirmation data`);
      return { updated: true };
    } else {
      return { error: true };
    }

  } catch (error) {
    console.error(`❌ Error processing listing ${listing.id}:`, error.message);
    return { error: true };
  }
}

/**
 * Monitor recent listings for AVExchangeBot confirmations
 */
async function monitorRecentListings(options = {}) {
  const {
    daysBack = 7, // Check listings from past 7 days (default)
    limit = 200,  // Check more listings per run
    source = 'reddit_avexchange'
  } = options;

  console.log('🚀 Starting AVExchangeBot confirmation monitor...\n');
  console.log(`📅 Checking listings from past ${daysBack} days`);
  console.log(`🔢 Limit: ${limit} listings\n`);

  try {
    // Calculate date threshold
    const dateThreshold = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString();

    // Fetch recent listings that aren't bot-confirmed yet
    const { data: listings, error } = await supabase
      .from('used_listings')
      .select('id, url, title, status, avexchange_bot_confirmed, seller_username')
      .eq('source', source)
      .gte('date_posted', dateThreshold)
      .order('date_posted', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Error fetching listings:', error.message);
      return;
    }

    if (!listings || listings.length === 0) {
      console.log('ℹ️ No recent listings found to check');
      return;
    }

    console.log(`📋 Found ${listings.length} listings to check\n`);

    let stats = {
      total: listings.length,
      updated: 0,
      skipped: 0,
      errors: 0,
      skipReasons: {}
    };

    // Process each listing
    for (const listing of listings) {
      const result = await processListing(listing);

      if (result.updated) {
        stats.updated++;
      } else if (result.error) {
        stats.errors++;
      } else if (result.skipped) {
        stats.skipped++;
        stats.skipReasons[result.reason] = (stats.skipReasons[result.reason] || 0) + 1;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, REDDIT_CONFIG.rateLimit));
    }

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Monitoring Summary');
    console.log('='.repeat(50));
    console.log(`Total listings checked: ${stats.total}`);
    console.log(`✅ Updated with bot confirmation: ${stats.updated}`);
    console.log(`⏭️ Skipped: ${stats.skipped}`);
    if (Object.keys(stats.skipReasons).length > 0) {
      console.log('\nSkip reasons:');
      for (const [reason, count] of Object.entries(stats.skipReasons)) {
        console.log(`  • ${reason}: ${count}`);
      }
    }
    console.log(`❌ Errors: ${stats.errors}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('❌ Fatal error in monitor:', error.message);
  }
}

// CLI interface
if (require.main === module) {
  const args = process.argv.slice(2);

  const options = {
    daysBack: 7,
    limit: 200
  };

  // Parse command line arguments
  if (args.includes('--days')) {
    const idx = args.indexOf('--days');
    options.daysBack = parseInt(args[idx + 1]) || 7;
  }

  if (args.includes('--limit')) {
    const idx = args.indexOf('--limit');
    options.limit = parseInt(args[idx + 1]) || 200;
  }

  if (args.includes('--help')) {
    console.log(`
AVExchangeBot Confirmation Monitor

Usage: node monitor-avexchange-confirmations.js [options]

Options:
  --days N    Check listings from past N days (default: 7)
  --limit N   Maximum listings to process (default: 200)
  --help      Show this help message

Examples:
  node monitor-avexchange-confirmations.js
  node monitor-avexchange-confirmations.js --days 30 --limit 100
    `);
    process.exit(0);
  }

  monitorRecentListings(options)
    .then(() => {
      console.log('\n✅ Monitoring complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Monitoring failed:', error.message);
      process.exit(1);
    });
}

module.exports = {
  monitorRecentListings,
  fetchPostComments,
  findAVExchangeBotConfirmations,
  parseAVExchangeBotComment
};
