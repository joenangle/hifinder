#!/usr/bin/env node
/**
 * Reddit Social Review Scraper
 *
 * Collects product mentions, sentiment, and community recommendations
 * from audio discussion subreddits (r/headphones, r/headphoneadvice, etc.)
 *
 * Two-phase architecture:
 *   Phase 1 (every 4-6h): Scan post titles/selftext — 4 API calls
 *   Phase 2 (every 12h):  Fetch comments on high-signal posts — capped at 20 API calls
 *
 * Usage:
 *   node scripts/reddit-social-scraper.js [options]
 *
 * Options:
 *   --phase1-only       Run only Phase 1 (post discovery)
 *   --phase2-only       Run only Phase 2 (comment scanning)
 *   --subreddit=NAME    Scrape a single subreddit (for testing)
 *   --dry-run           Log what would be done without DB writes
 *   --verbose           Show detailed timing and matching info
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { findAllComponentMentions, getComponentsFromCache } = require('./component-matcher-enhanced');
const {
  getRedditAccessToken,
  fetchWithRetry,
  acquireLock,
  releaseLock,
  elapsed,
  msLabel,
  redditHeaders,
  rateLimitDelay,
  REDDIT_DEFAULTS,
} = require('./reddit-api');
const path = require('path');

// --- Configuration ---

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const LOCK_FILE = path.join(__dirname, '.reddit-social-scraper.lock');

const TARGET_SUBREDDITS = ['headphones', 'HeadphoneAdvice', 'audiophile', 'IEMs'];

// Phase 2: Only fetch comments for high-signal posts
const COMMENT_THRESHOLDS = {
  postScoreMin: 10,
  commentCountMin: 15,
  alwaysScanTypes: ['review', 'comparison'],
  maxPostsPerRun: 20,
};

// --- CLI args ---

const args = process.argv.slice(2);
const PHASE1_ONLY = args.includes('--phase1-only');
const PHASE2_ONLY = args.includes('--phase2-only');
const DRY_RUN = args.includes('--dry-run');
const VERBOSE = args.includes('--verbose') || process.env.SCRAPER_VERBOSE === '1';
const SINGLE_SUBREDDIT = args.find(a => a.startsWith('--subreddit='))?.split('=')[1];

// --- Stats ---

const stats = {
  postsScanned: 0,
  newPostsFound: 0,
  mentionsFromPosts: 0,
  postsWithMentions: 0,
  commentsScanned: 0,
  mentionsFromComments: 0,
  postsCommentScanned: 0,
  upsertErrors: 0,
};

const timings = {
  overall: { start: 0, end: 0 },
  phase1: { start: 0, end: 0 },
  phase2: { start: 0, end: 0 },
  rateLimit429Count: 0,
  rateLimitWaitMs: 0,
};

// --- Post type classification ---

/**
 * Classify a Reddit post type from flair and title heuristics.
 */
function classifyPostType(title, flair) {
  const t = title.toLowerCase();
  const f = (flair || '').toLowerCase();

  // Flair-based (most reliable)
  if (f.includes('review')) return 'review';
  if (f.includes('discussion')) return 'discussion';
  if (f.includes('purchase advice') || f.includes('help') || f.includes('requesting advice')) return 'recommendation_request';

  // Title-based heuristics
  if (/\breview\b|\bimpressions?\b|\bmy thoughts on\b/i.test(t)) return 'review';
  if (/\bvs\.?\b|\bversus\b|\bcompared?\b|\bcomparison\b/i.test(t)) return 'comparison';
  if (/\bbest\b.*\bfor\b|\brecommend|\badvice\b|\bhelp me\b|\bwhich\b.*\bshould\b|\bsuggestion/i.test(t)) return 'recommendation_request';

  return 'discussion';
}

// --- Phase 1: Post Discovery ---

/**
 * Fetch recent posts from a subreddit and scan titles/selftext for mentions.
 */
async function phase1ScanSubreddit(subreddit, token) {
  console.log(`\n📡 Phase 1: Scanning r/${subreddit}...`);

  const url = `${REDDIT_DEFAULTS.apiUrl}/r/${subreddit}/new?limit=100`;
  const response = await fetchWithRetry(url, {
    headers: redditHeaders(token),
  }, { timings });

  if (!response.ok) {
    console.error(`  ❌ Failed to fetch r/${subreddit}: ${response.status}`);
    return;
  }

  const data = await response.json();
  const posts = (data.data?.children || []).map(p => p.data);
  console.log(`  📦 Fetched ${posts.length} posts`);

  // Load existing scraper state for this subreddit to skip already-seen posts
  const postIds = posts.map(p => `t3_${p.id}`);
  const { data: existingState } = await supabase
    .from('reddit_scraper_state')
    .select('reddit_post_id, post_score, comment_count')
    .in('reddit_post_id', postIds);

  const existingMap = new Map(
    (existingState || []).map(s => [s.reddit_post_id, s])
  );

  let newPosts = 0;
  let updatedPosts = 0;

  for (const post of posts) {
    const redditPostId = `t3_${post.id}`;
    const postUrl = `https://www.reddit.com${post.permalink}`;
    const postType = classifyPostType(post.title, post.link_flair_text);
    const existing = existingMap.get(redditPostId);

    stats.postsScanned++;

    if (existing) {
      // Update score/comment count for existing posts
      if (!DRY_RUN && (existing.post_score !== post.score || existing.comment_count !== post.num_comments)) {
        await supabase
          .from('reddit_scraper_state')
          .update({
            post_score: post.score,
            comment_count: post.num_comments,
            last_checked_at: new Date().toISOString(),
          })
          .eq('reddit_post_id', redditPostId);
        updatedPosts++;
      }
      continue;
    }

    // New post — scan title + selftext
    stats.newPostsFound++;
    newPosts++;

    const textToScan = `${post.title}\n${post.selftext || ''}`;
    const mentions = await findAllComponentMentions(textToScan);

    if (VERBOSE) {
      console.log(`  📝 [${postType}] ${post.title.substring(0, 60)}... → ${mentions.length} mention(s)`);
    }

    if (!DRY_RUN) {
      // Insert scraper state
      await supabase
        .from('reddit_scraper_state')
        .upsert({
          reddit_post_id: redditPostId,
          subreddit,
          post_created_utc: new Date(post.created_utc * 1000).toISOString(),
          post_score: post.score,
          comment_count: post.num_comments,
          post_type: postType,
          title_scanned: true,
          comments_scanned: false,
          last_checked_at: new Date().toISOString(),
        }, { onConflict: 'reddit_post_id' });

      // Insert mentions
      if (mentions.length > 0) {
        stats.postsWithMentions++;

        for (const mention of mentions) {
          const mentionLocation = post.title.toLowerCase().includes(
            mention.component.brand.toLowerCase()
          ) ? 'title' : 'selftext';

          const { error } = await supabase
            .from('reddit_mentions')
            .insert({
              component_id: mention.component.id,
              reddit_post_id: redditPostId,
              reddit_comment_id: null,
              subreddit,
              post_type: postType,
              mention_context: mention.context,
              mention_location: mentionLocation,
              post_title: post.title,
              post_url: postUrl,
              post_score: post.score,
              comment_score: null,
              author: post.author,
              post_created_utc: new Date(post.created_utc * 1000).toISOString(),
              match_confidence: mention.confidence,
            });

          if (error) {
            // Handle unique constraint via insert-or-skip
            if (!error.message.includes('duplicate') && !error.message.includes('unique')) {
              console.error(`  ❌ Upsert error: ${error.message}`);
              stats.upsertErrors++;
            }
          } else {
            stats.mentionsFromPosts++;
          }
        }
      }
    } else {
      if (mentions.length > 0) {
        stats.postsWithMentions++;
        stats.mentionsFromPosts += mentions.length;
        for (const m of mentions) {
          console.log(`    [DRY] ${m.component.brand} ${m.component.name} (${m.confidence.toFixed(2)})`);
        }
      }
    }
  }

  console.log(`  ✅ r/${subreddit}: ${newPosts} new, ${updatedPosts} updated`);
}

// --- Phase 2: Selective Comment Scanning ---

/**
 * Fetch and scan comments for high-signal posts that haven't been comment-scanned yet.
 */
async function phase2ScanComments(token) {
  console.log('\n🔍 Phase 2: Scanning comments on high-signal posts...');

  // Find posts worth scanning comments on
  const { data: candidates, error } = await supabase
    .from('reddit_scraper_state')
    .select('*')
    .eq('comments_scanned', false)
    .or(
      `post_type.in.(${COMMENT_THRESHOLDS.alwaysScanTypes.map(t => `"${t}"`).join(',')}),` +
      `post_score.gte.${COMMENT_THRESHOLDS.postScoreMin},` +
      `comment_count.gte.${COMMENT_THRESHOLDS.commentCountMin}`
    )
    .order('post_score', { ascending: false })
    .limit(COMMENT_THRESHOLDS.maxPostsPerRun);

  if (error) {
    console.error('  ❌ Failed to query candidates:', error.message);
    return;
  }

  if (!candidates || candidates.length === 0) {
    console.log('  No posts qualify for comment scanning');
    return;
  }

  console.log(`  📋 ${candidates.length} post(s) qualify for comment scanning`);

  for (const post of candidates) {
    // Extract the Reddit post ID (strip t3_ prefix for URL)
    const shortId = post.reddit_post_id.replace('t3_', '');

    if (VERBOSE) {
      console.log(`\n  📖 Scanning comments: ${post.subreddit} / ${shortId} (score: ${post.post_score}, comments: ${post.comment_count})`);
    }

    await rateLimitDelay();

    const url = `${REDDIT_DEFAULTS.apiUrl}/r/${post.subreddit}/comments/${shortId}?limit=50&sort=top&depth=1`;
    const response = await fetchWithRetry(url, {
      headers: redditHeaders(token),
    }, { timings });

    if (!response.ok) {
      console.error(`  ❌ Failed to fetch comments for ${shortId}: ${response.status}`);
      continue;
    }

    const data = await response.json();

    // Reddit comment API returns [post, comments] array
    const commentListing = data[1]?.data?.children || [];
    const comments = commentListing
      .filter(c => c.kind === 't1')
      .map(c => c.data);

    stats.postsCommentScanned++;
    let postMentionCount = 0;

    // Also grab the post title from the first element for reference
    const postTitle = data[0]?.data?.children?.[0]?.data?.title || '';
    const postUrl = data[0]?.data?.children?.[0]?.data?.permalink
      ? `https://www.reddit.com${data[0].data.children[0].data.permalink}`
      : '';

    for (const comment of comments) {
      if (!comment.body || comment.body === '[deleted]' || comment.body === '[removed]') continue;

      stats.commentsScanned++;
      const mentions = await findAllComponentMentions(comment.body);

      for (const mention of mentions) {
        postMentionCount++;
        stats.mentionsFromComments++;

        if (!DRY_RUN) {
          const { error } = await supabase
            .from('reddit_mentions')
            .insert({
              component_id: mention.component.id,
              reddit_post_id: post.reddit_post_id,
              reddit_comment_id: `t1_${comment.id}`,
              subreddit: post.subreddit,
              post_type: post.post_type,
              mention_context: mention.context,
              mention_location: 'comment',
              post_title: postTitle,
              post_url: postUrl,
              post_score: post.post_score,
              comment_score: comment.score,
              author: comment.author,
              post_created_utc: post.post_created_utc,
              match_confidence: mention.confidence,
            });

          if (error && !error.message.includes('duplicate') && !error.message.includes('unique')) {
            console.error(`  ❌ Comment upsert error: ${error.message}`);
            stats.upsertErrors++;
          }
        } else {
          console.log(`    [DRY] Comment by ${comment.author}: ${mention.component.brand} ${mention.component.name} (${mention.confidence.toFixed(2)})`);
        }
      }
    }

    // Mark post as comment-scanned
    if (!DRY_RUN) {
      await supabase
        .from('reddit_scraper_state')
        .update({
          comments_scanned: true,
          last_checked_at: new Date().toISOString(),
        })
        .eq('reddit_post_id', post.reddit_post_id);
    }

    if (VERBOSE || postMentionCount > 0) {
      console.log(`  💬 ${shortId}: ${comments.length} comments → ${postMentionCount} mention(s)`);
    }
  }
}

// --- Main ---

async function main() {
  console.log('🚀 Reddit Social Review Scraper');
  console.log(`   Subreddits: ${SINGLE_SUBREDDIT || TARGET_SUBREDDITS.join(', ')}`);
  console.log(`   Mode: ${PHASE1_ONLY ? 'Phase 1 only' : PHASE2_ONLY ? 'Phase 2 only' : 'Both phases'}`);
  if (DRY_RUN) console.log('   ⚠️  DRY RUN — no database writes');
  console.log();

  if (!acquireLock(LOCK_FILE)) {
    process.exit(1);
  }

  timings.overall.start = Date.now();

  try {
    // Pre-warm component cache
    await getComponentsFromCache();

    const token = await getRedditAccessToken();
    if (!token) {
      throw new Error('Failed to get Reddit OAuth token');
    }

    const subreddits = SINGLE_SUBREDDIT ? [SINGLE_SUBREDDIT] : TARGET_SUBREDDITS;

    // Phase 1: Post Discovery
    if (!PHASE2_ONLY) {
      timings.phase1.start = Date.now();
      for (const sub of subreddits) {
        await phase1ScanSubreddit(sub, token);
        // Rate limit between subreddits
        if (subreddits.indexOf(sub) < subreddits.length - 1) {
          await rateLimitDelay();
        }
      }
      timings.phase1.end = Date.now();
    }

    // Phase 2: Comment Scanning
    if (!PHASE1_ONLY) {
      timings.phase2.start = Date.now();
      await phase2ScanComments(token);
      timings.phase2.end = Date.now();
    }

    timings.overall.end = Date.now();

    // Print statistics
    console.log('\n' + '='.repeat(60));
    console.log('📊 Social Scraper Statistics');
    console.log('='.repeat(60));
    if (!PHASE2_ONLY) {
      console.log(`Phase 1 — Post Discovery:`);
      console.log(`  Posts scanned:        ${stats.postsScanned}`);
      console.log(`  New posts found:      ${stats.newPostsFound}`);
      console.log(`  Posts with mentions:  ${stats.postsWithMentions}`);
      console.log(`  Mentions from posts:  ${stats.mentionsFromPosts}`);
    }
    if (!PHASE1_ONLY) {
      console.log(`Phase 2 — Comment Scanning:`);
      console.log(`  Posts comment-scanned: ${stats.postsCommentScanned}`);
      console.log(`  Comments scanned:     ${stats.commentsScanned}`);
      console.log(`  Mentions from comments: ${stats.mentionsFromComments}`);
    }
    if (stats.upsertErrors > 0) {
      console.log(`  ⚠️  Upsert errors:    ${stats.upsertErrors}`);
    }
    console.log('='.repeat(60));
    console.log(`⏱️  Total execution: ${elapsed(timings.overall)}s`);

    if (VERBOSE) {
      if (timings.phase1.start) console.log(`  Phase 1: ${elapsed(timings.phase1)}s`);
      if (timings.phase2.start) console.log(`  Phase 2: ${elapsed(timings.phase2)}s`);
      if (timings.rateLimit429Count) {
        console.log(`  Rate limit 429s: ${timings.rateLimit429Count} (waited ${msLabel(timings.rateLimitWaitMs)})`);
      }
    }

    console.log('\n✅ Social scraping complete!');
  } catch (error) {
    timings.overall.end = Date.now();
    console.error('\n❌ Fatal error:', error);
    console.log(`⏱️  Failed after ${elapsed(timings.overall)}s`);
    throw error;
  } finally {
    releaseLock(LOCK_FILE);
  }
}

if (require.main === module) {
  main().then(() => {
    process.exit(0);
  }).catch(error => {
    console.error('❌ Failed:', error);
    process.exit(1);
  });
}

module.exports = { main };
