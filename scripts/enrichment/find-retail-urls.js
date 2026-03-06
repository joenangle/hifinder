#!/usr/bin/env node
/**
 * Retail URL Finder — searches DuckDuckGo for Amazon product URLs
 *
 * Usage:
 *   node scripts/enrichment/find-retail-urls.js                          # Dry run
 *   node scripts/enrichment/find-retail-urls.js --execute                # Search and generate SQL
 *   node scripts/enrichment/find-retail-urls.js --execute --category dac,amp
 *   node scripts/enrichment/find-retail-urls.js --execute --brand Schiit
 *   node scripts/enrichment/find-retail-urls.js --execute --limit 20
 */

const { execSync } = require('child_process');
const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
const { resolve, dirname } = require('path');
const https = require('https');

// ---------------------------------------------------------------------------
// DB connection (reuses gap-report.js pattern)
// ---------------------------------------------------------------------------

const envFile = resolve(__dirname, '..', '..', '.env.local');
const lines = readFileSync(envFile, 'utf8').split('\n');
const get = (key) => {
  const line = lines.find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1) : null;
};
const password = get('SUPABASE_DB_PASSWORD');
const dbUrl = get('DATABASE_URL');
if (!password || !dbUrl) {
  console.error('Missing SUPABASE_DB_PASSWORD or DATABASE_URL in .env.local');
  process.exit(1);
}

function runQuery(sql) {
  const result = execSync(
    `psql "${dbUrl}" -t -A -F '\t' -c '${sql.replace(/'/g, "'\"'\"'")}'`,
    { env: { ...process.env, PGPASSWORD: password }, encoding: 'utf8' }
  );
  return result.trim().split('\n').filter(Boolean).map(row => row.split('\t'));
}

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const BRAND_FILTER = args.includes('--brand')
  ? args[args.indexOf('--brand') + 1]
  : null;
const CATEGORY_FILTER = args.includes('--category')
  ? args[args.indexOf('--category') + 1]
  : null;
const LIMIT = args.includes('--limit')
  ? parseInt(args[args.indexOf('--limit') + 1], 10)
  : Infinity;

const DDG_DELAY_MS = 3000;
const STATE_FILE = resolve(__dirname, '..', '..', 'data', 'retail-url-state.json');
const OUTPUT_DIR = resolve(__dirname, 'output');
const OUTPUT_FILE = resolve(OUTPUT_DIR, 'retail-urls.sql');

// ---------------------------------------------------------------------------
// State management — allows resuming across runs
// ---------------------------------------------------------------------------

function loadState() {
  try {
    if (existsSync(STATE_FILE)) {
      return JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch { /* start fresh */ }
  return { processed: {} };
}

function saveState(state) {
  const dir = dirname(STATE_FILE);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ---------------------------------------------------------------------------
// HTTP helper (https module, follows redirects)
// ---------------------------------------------------------------------------

function fetchHtml(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
      },
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        if (redirects >= 5) return reject(new Error('Too many redirects'));
        const next = new URL(res.headers.location, url).href;
        res.resume();
        return fetchHtml(next, redirects + 1).then(resolve).catch(reject);
      }
      if (res.statusCode < 200 || res.statusCode >= 400) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

// ---------------------------------------------------------------------------
// DuckDuckGo HTML search + Amazon URL extraction
// ---------------------------------------------------------------------------

const CATEGORY_SEARCH_TERM = {
  cans: 'headphones',
  headphones: 'headphones',
  iems: 'earbuds',
  dac: 'audio',
  amp: 'audio',
  dac_amp: 'audio',
};

/**
 * Extract Amazon /dp/ URLs from DuckDuckGo HTML search results.
 * DDG HTML results contain links in <a> tags with class "result__a".
 * The actual URLs are often encoded in the href as uddg= query params.
 */
function extractAmazonUrls(html) {
  const urls = [];

  // DuckDuckGo HTML results embed actual URLs in uddg= parameter
  const uddgRegex = /uddg=([^&"']+)/g;
  let match;
  while ((match = uddgRegex.exec(html)) !== null) {
    try {
      const decoded = decodeURIComponent(match[1]);
      if (isAmazonProductUrl(decoded)) {
        urls.push(cleanAmazonUrl(decoded));
      }
    } catch { /* skip malformed */ }
  }

  // Also try direct href matches
  const hrefRegex = /href=["']([^"']*amazon\.com[^"']*\/dp\/[^"']*)/g;
  while ((match = hrefRegex.exec(html)) !== null) {
    try {
      const decoded = decodeURIComponent(match[1]);
      if (isAmazonProductUrl(decoded)) {
        urls.push(cleanAmazonUrl(decoded));
      }
    } catch { /* skip */ }
  }

  // Deduplicate
  return [...new Set(urls)];
}

function isAmazonProductUrl(url) {
  return url.includes('amazon.com') && url.includes('/dp/');
}

/**
 * Clean Amazon URL to canonical form: https://www.amazon.com/dp/ASIN
 */
function cleanAmazonUrl(url) {
  const dpMatch = url.match(/amazon\.com.*?\/dp\/([A-Z0-9]{10})/);
  if (dpMatch) {
    return `https://www.amazon.com/dp/${dpMatch[1]}`;
  }
  return url;
}

async function searchAmazonUrl(brand, name, category) {
  const searchTerm = CATEGORY_SEARCH_TERM[category] || 'audio';
  const query = `site:amazon.com "${brand} ${name}" ${searchTerm}`;
  const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  const html = await fetchHtml(searchUrl);
  const amazonUrls = extractAmazonUrls(html);

  if (amazonUrls.length > 0) {
    return amazonUrls[0];
  }

  return null;
}

// ---------------------------------------------------------------------------
// SQL generation
// ---------------------------------------------------------------------------

function generateSqlLine(id, amazonUrl) {
  // Escape single quotes in URL (unlikely but safe)
  const safeUrl = amazonUrl.replace(/'/g, "''");
  return `UPDATE components SET amazon_url = '${safeUrl}' WHERE id = '${id}';`;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  console.log('='.repeat(70));
  console.log('HiFinder Retail URL Finder');
  console.log('='.repeat(70));
  console.log(`Mode: ${EXECUTE ? 'EXECUTE' : 'DRY RUN'}`);
  if (BRAND_FILTER) console.log(`Brand filter: ${BRAND_FILTER}`);
  if (CATEGORY_FILTER) console.log(`Category filter: ${CATEGORY_FILTER}`);
  if (LIMIT < Infinity) console.log(`Limit: ${LIMIT}`);
  console.log('');

  // Build query with optional filters
  let sql = `SELECT id, brand, name, category FROM components WHERE amazon_url IS NULL`;
  if (CATEGORY_FILTER) {
    const cats = CATEGORY_FILTER.split(',').map(c => `'${c}'`).join(',');
    sql += ` AND category IN (${cats})`;
  }
  if (BRAND_FILTER) {
    sql += ` AND brand ILIKE '${BRAND_FILTER}'`;
  }
  sql += ` ORDER BY category, brand, name`;

  const rows = runQuery(sql);
  const components = rows.map(([id, brand, name, category]) => ({ id, brand, name, category }));
  const toProcess = components.slice(0, LIMIT);

  console.log(`Components missing amazon_url: ${components.length}`);
  console.log(`Processing this run: ${toProcess.length}`);
  console.log('');

  if (!EXECUTE) {
    console.log('Components that would be searched:');
    console.log('');
    for (const c of toProcess) {
      console.log(`  ${c.brand} ${c.name} [${c.category}]`);
    }
    console.log('');
    console.log('This was a DRY RUN. Use --execute to search DuckDuckGo and generate SQL.');
    return;
  }

  // Load resumable state
  const state = loadState();

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) mkdirSync(OUTPUT_DIR, { recursive: true });

  const sqlLines = [];
  const results = { found: 0, notFound: 0, skipped: 0, errors: 0 };

  for (let i = 0; i < toProcess.length; i++) {
    const component = toProcess[i];
    const label = `${component.brand} ${component.name}`;

    // Skip if already processed in a previous run
    if (state.processed[component.id]) {
      console.log(`[${i + 1}/${toProcess.length}] ${label} — skipped (already processed)`);
      results.skipped++;
      // Re-add to SQL output if it was found previously
      if (state.processed[component.id].url) {
        sqlLines.push(generateSqlLine(component.id, state.processed[component.id].url));
      }
      continue;
    }

    console.log(`[${i + 1}/${toProcess.length}] ${label} [${component.category}]`);

    try {
      const amazonUrl = await searchAmazonUrl(component.brand, component.name, component.category);

      if (amazonUrl) {
        console.log(`  Found: ${amazonUrl}`);
        sqlLines.push(generateSqlLine(component.id, amazonUrl));
        state.processed[component.id] = { url: amazonUrl, foundAt: new Date().toISOString() };
        results.found++;
      } else {
        console.log('  No Amazon URL found');
        state.processed[component.id] = { url: null, foundAt: new Date().toISOString() };
        results.notFound++;
      }
    } catch (err) {
      console.log(`  Error: ${err.message}`);
      state.processed[component.id] = { url: null, error: err.message, foundAt: new Date().toISOString() };
      results.errors++;
    }

    // Save state periodically
    if (i % 10 === 0) saveState(state);

    // Rate limit between requests
    if (i < toProcess.length - 1) {
      await new Promise(r => setTimeout(r, DDG_DELAY_MS));
    }
  }

  // Final state save
  saveState(state);

  // Write SQL file
  if (sqlLines.length > 0) {
    const sqlContent = [
      '-- Retail URL updates generated by find-retail-urls.js',
      `-- Generated: ${new Date().toISOString()}`,
      `-- Found: ${sqlLines.length} Amazon URLs`,
      '',
      'BEGIN;',
      '',
      ...sqlLines,
      '',
      'COMMIT;',
      '',
    ].join('\n');

    writeFileSync(OUTPUT_FILE, sqlContent);
    console.log(`\nSQL file written to: ${OUTPUT_FILE}`);
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Found:     ${results.found}`);
  console.log(`Not found: ${results.notFound}`);
  console.log(`Errors:    ${results.errors}`);
  console.log(`Skipped:   ${results.skipped}`);
  console.log(`Total:     ${toProcess.length}`);
  console.log('');

  if (sqlLines.length > 0) {
    console.log(`Run the SQL file with: npm run db -- -f ${OUTPUT_FILE}`);
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
