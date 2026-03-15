/**
 * Shared Reddit API Utilities
 *
 * Common infrastructure for Reddit scrapers:
 * - OAuth token acquisition + caching
 * - Fetch with retry/backoff for rate limiting
 * - Lock file management for concurrency protection
 * - Timing/stats helpers
 */

const fs = require('fs');
const path = require('path');

// Reddit API configuration (shared defaults)
const REDDIT_DEFAULTS = {
  apiUrl: 'https://oauth.reddit.com',
  publicUrl: 'https://www.reddit.com',
  clientId: process.env.REDDIT_CLIENT_ID,
  clientSecret: process.env.REDDIT_CLIENT_SECRET,
  userAgent: 'HiFinder-UsedListingAggregator/3.0 (by /u/hifinder)',
  rateLimit: 3000, // 3 seconds between requests
  maxRetries: 3,
  retryBaseDelay: 10000,
};

// Token cache (shared across calls within a process)
let _accessToken = null;
let _tokenExpiry = null;

/**
 * Get Reddit OAuth token (client credentials flow)
 * Caches token and refreshes 1 minute before expiry.
 */
async function getRedditAccessToken(config = {}) {
  const clientId = config.clientId || REDDIT_DEFAULTS.clientId;
  const clientSecret = config.clientSecret || REDDIT_DEFAULTS.clientSecret;
  const userAgent = config.userAgent || REDDIT_DEFAULTS.userAgent;

  // Check cached token
  if (_accessToken && _tokenExpiry && Date.now() < _tokenExpiry) {
    return _accessToken;
  }

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const response = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new Error(`OAuth failed: ${response.status}`);
    }

    const data = await response.json();
    _accessToken = data.access_token;
    _tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Refresh 1 min early

    console.log(`✅ Reddit OAuth token acquired`);
    return _accessToken;
  } catch (error) {
    console.error(`❌ OAuth error:`, error.message);
    return null;
  }
}

/**
 * Fetch with retry logic for rate limiting (429s) and network errors.
 * Tracks retry stats on the optional timings object.
 */
async function fetchWithRetry(url, options, { maxRetries, retryBaseDelay, timings } = {}) {
  maxRetries = maxRetries ?? REDDIT_DEFAULTS.maxRetries;
  retryBaseDelay = retryBaseDelay ?? REDDIT_DEFAULTS.retryBaseDelay;

  async function attempt(retries) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429 && retries < maxRetries) {
        const delay = retryBaseDelay * Math.pow(2, retries);
        if (timings) {
          timings.rateLimit429Count = (timings.rateLimit429Count || 0) + 1;
          timings.rateLimitWaitMs = (timings.rateLimitWaitMs || 0) + delay;
        }
        console.log(`⚠️  Rate limited, waiting ${delay / 1000}s... (retry ${retries + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return attempt(retries + 1);
      }

      if (response.status >= 500 && retries < maxRetries) {
        const delay = retryBaseDelay * Math.pow(2, retries);
        console.log(`⚠️  Server error ${response.status}, retrying in ${delay / 1000}s... (retry ${retries + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return attempt(retries + 1);
      }

      return response;
    } catch (error) {
      if (retries < maxRetries) {
        const delay = retryBaseDelay;
        console.log(`⚠️  Fetch error, retrying in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return attempt(retries + 1);
      }
      throw error;
    }
  }

  return attempt(0);
}

/**
 * Acquire a file-based lock to prevent concurrent runs.
 * Returns true if lock acquired, false if another process holds it.
 * Stale locks (>2 hours) are automatically removed.
 */
function acquireLock(lockFile) {
  if (fs.existsSync(lockFile)) {
    const lockData = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
    const lockAge = Date.now() - lockData.timestamp;

    if (lockAge < 2 * 60 * 60 * 1000) {
      console.error(`❌ Another scraper is running (PID: ${lockData.pid})`);
      return false;
    }

    console.log(`⚠️  Stale lock found, removing...`);
    fs.unlinkSync(lockFile);
  }

  fs.writeFileSync(lockFile, JSON.stringify({
    pid: process.pid,
    timestamp: Date.now(),
    startedAt: new Date().toISOString(),
  }));

  console.log(`🔒 Lock acquired`);
  return true;
}

/**
 * Release a file-based lock.
 */
function releaseLock(lockFile) {
  if (fs.existsSync(lockFile)) {
    fs.unlinkSync(lockFile);
    console.log(`🔓 Lock released`);
  }
}

/**
 * Format a timing pair { start, end } as "X.XXs"
 */
function elapsed(timing) {
  return ((timing.end - timing.start) / 1000).toFixed(2);
}

/**
 * Format milliseconds as human-readable label: "123ms", "1.2s", "2.1m"
 */
function msLabel(ms) {
  if (ms >= 60000) return `${(ms / 60000).toFixed(1)}m`;
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

/**
 * Build standard Reddit API request headers.
 */
function redditHeaders(token, userAgent) {
  return {
    'Authorization': `Bearer ${token}`,
    'User-Agent': userAgent || REDDIT_DEFAULTS.userAgent,
  };
}

/**
 * Sleep for the standard rate limit interval.
 */
function rateLimitDelay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms || REDDIT_DEFAULTS.rateLimit));
}

module.exports = {
  REDDIT_DEFAULTS,
  getRedditAccessToken,
  fetchWithRetry,
  acquireLock,
  releaseLock,
  elapsed,
  msLabel,
  redditHeaders,
  rateLimitDelay,
};
