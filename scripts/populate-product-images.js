#!/usr/bin/env node

/**
 * Populate Product Images Pipeline
 *
 * Three-tier image sourcing for HiFinder components:
 *   Tier 1: Scrape og:image / product images from manufacturer pages
 *   Tier 2: DuckDuckGo image search (no API key needed)
 *   Tier 3: Flag remaining products for manual curation
 *
 * Usage:
 *   node scripts/populate-product-images.js                    # Dry run
 *   node scripts/populate-product-images.js --execute          # Run all tiers
 *   node scripts/populate-product-images.js --execute --tier1-only
 *   node scripts/populate-product-images.js --execute --brand Sennheiser
 *   node scripts/populate-product-images.js --execute --limit 20
 *   node scripts/populate-product-images.js --execute --reprocess   # Re-fetch all at 800x800
 *
 * Environment:
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY — required
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ---------------------------------------------------------------------------
// Config & CLI args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const EXECUTE = args.includes('--execute');
const TIER1_ONLY = args.includes('--tier1-only');
const REPROCESS = args.includes('--reprocess');
const BRAND_FILTER = args.includes('--brand')
  ? args[args.indexOf('--brand') + 1]
  : null;
const LIMIT = args.includes('--limit')
  ? parseInt(args[args.indexOf('--limit') + 1], 10)
  : Infinity;
// DDG rate-limits after ~40 rapid queries; use 3s delay to stay under the threshold
const DDG_DELAY_MS = 3000;

const STATE_FILE = path.join(__dirname, '..', 'data', 'image-pipeline-state.json');
const MISSING_CSV = path.join(__dirname, '..', 'data', 'missing-images.csv');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

let sharp;
try {
  sharp = require('sharp');
} catch {
  console.error('sharp not found — install it or run from the project root');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// State management — allows resuming across days
// ---------------------------------------------------------------------------

function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    }
  } catch { /* start fresh */ }
  return { processed: {}, tier1Failures: [], cseQueriesUsedToday: 0, lastCseDate: null };
}

function saveState(state) {
  const dir = path.dirname(STATE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

function fetchUrl(url, options = {}) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const defaultHeaders = { 'User-Agent': 'HiFinder-ImageBot/1.0' };
    const { headers: customHeaders, ...restOptions } = options;
    const req = proto.get(url, { timeout: 15000, headers: { ...defaultHeaders, ...customHeaders }, ...restOptions }, (res) => {
      // Follow redirects (up to 3)
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        const redirectUrl = new URL(res.headers.location, url).href;
        if ((options._redirects || 0) >= 3) return reject(new Error('Too many redirects'));
        return fetchUrl(redirectUrl, { ...options, _redirects: (options._redirects || 0) + 1 })
          .then(resolve).catch(reject);
      }
      if (res.statusCode < 200 || res.statusCode >= 400) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), contentType: res.headers['content-type'] || '', url: res.url || url }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
  });
}

function fetchText(url) {
  return fetchUrl(url).then(({ buffer }) => buffer.toString('utf-8'));
}

// ---------------------------------------------------------------------------
// Image extraction from HTML (cheerio-free — use regex for og:image, fallback patterns)
// ---------------------------------------------------------------------------

function extractOgImage(html) {
  // Match og:image meta tag
  const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
  if (ogMatch) return ogMatch[1];

  // Try twitter:image as fallback
  const twMatch = html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
    || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
  if (twMatch) return twMatch[1];

  return null;
}

function extractProductImage(html, productName) {
  // Try to find an img tag with alt text matching the product name
  const nameLower = productName.toLowerCase();
  const imgRegex = /<img[^>]+src=["']([^"']+)["'][^>]+alt=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    const [, src, alt] = match;
    if (alt.toLowerCase().includes(nameLower) && isProductImageUrl(src)) {
      return src;
    }
  }

  // Also try alt before src
  const imgRegex2 = /<img[^>]+alt=["']([^"']+)["'][^>]+src=["']([^"']+)["'][^>]*>/gi;
  while ((match = imgRegex2.exec(html)) !== null) {
    const [, alt, src] = match;
    if (alt.toLowerCase().includes(nameLower) && isProductImageUrl(src)) {
      return src;
    }
  }

  return null;
}

function isProductImageUrl(url) {
  if (!url) return false;
  // Skip tiny icons, svgs, tracking pixels
  if (url.endsWith('.svg')) return false;
  if (url.includes('1x1') || url.includes('pixel') || url.includes('spacer')) return false;
  if (url.includes('logo') && !url.includes('product')) return false;
  // Must be an image
  return /\.(jpg|jpeg|png|webp|avif)/i.test(url) || url.includes('/image') || url.includes('cdn');
}

// ---------------------------------------------------------------------------
// Tier 1: Manufacturer page scraping
// ---------------------------------------------------------------------------

async function tier1Scrape(component) {
  const { manufacturer_url, name } = component;
  if (!manufacturer_url) return null;

  try {
    const html = await fetchText(manufacturer_url);

    // Priority 1: og:image
    let imageUrl = extractOgImage(html);

    // Priority 2: img matching product name
    if (!imageUrl) {
      imageUrl = extractProductImage(html, name);
    }

    if (imageUrl) {
      // Resolve relative URLs
      if (imageUrl.startsWith('//')) imageUrl = 'https:' + imageUrl;
      else if (imageUrl.startsWith('/')) imageUrl = new URL(imageUrl, manufacturer_url).href;

      return imageUrl;
    }
  } catch (err) {
    console.log(`    Tier 1 error: ${err.message}`);
  }

  return null;
}

// ---------------------------------------------------------------------------
// Tier 2: DuckDuckGo Image Search (no API key needed)
// ---------------------------------------------------------------------------

const CATEGORY_LABEL = {
  cans: 'headphones',
  iems: 'IEM earphones',
  dac: 'DAC',
  amp: 'amplifier',
  dac_amp: 'DAC amplifier',
};

const DDG_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
};

async function tier2DuckDuckGo(component, retries = 2) {
  const categoryLabel = CATEGORY_LABEL[component.category] || '';
  const query = `${component.brand} ${component.name} ${categoryLabel} product`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      // Step 1: Get vqd token from DuckDuckGo
      const page = await fetchUrl('https://duckduckgo.com/?q=' + encodeURIComponent(query), {
        headers: DDG_HEADERS,
      });
      const pageText = page.buffer.toString('utf-8');
      const vqdMatch = pageText.match(/vqd="([^"]+)"/);
      if (!vqdMatch) {
        if (attempt < retries) {
          const backoff = (attempt + 1) * 5000;
          console.log(`    Tier 2: Rate limited, waiting ${backoff / 1000}s...`);
          await new Promise(r => setTimeout(r, backoff));
          continue;
        }
        console.log('    Tier 2: Could not get search token after retries');
        return null;
      }

      // Step 2: Fetch image results
      const imgUrl = 'https://duckduckgo.com/i.js?l=us-en&o=json&q=' + encodeURIComponent(query)
        + '&vqd=' + vqdMatch[1] + '&f=,,,,,&p=1';
      const imgRes = await fetchUrl(imgUrl, {
        headers: { ...DDG_HEADERS, 'Referer': 'https://duckduckgo.com/' },
      });
      const results = JSON.parse(imgRes.buffer.toString('utf-8')).results || [];

      if (results.length === 0) return null;

      // Prefer larger images that look like product photos
      const candidates = results.slice(0, 10).filter(r => r.image && isProductImageUrl(r.image));
      if (candidates.length > 0) {
        // Sort by image dimensions (prefer larger)
        candidates.sort((a, b) => {
          const aSize = (a.width || 0) * (a.height || 0);
          const bSize = (b.width || 0) * (b.height || 0);
          return bSize - aSize;
        });
        return candidates[0].image;
      }
      // Fallback to first result
      return results[0].image || null;
    } catch (err) {
      if (attempt < retries) {
        const backoff = (attempt + 1) * 5000;
        console.log(`    Tier 2 error: ${err.message}, retrying in ${backoff / 1000}s...`);
        await new Promise(r => setTimeout(r, backoff));
        continue;
      }
      console.log(`    Tier 2 error: ${err.message}`);
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Image processing: download, resize, convert to WebP
// ---------------------------------------------------------------------------

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function processAndUpload(imageUrl, component) {
  const filename = `${slugify(component.brand)}-${slugify(component.name)}.webp`;

  // Download the image
  const { buffer } = await fetchUrl(imageUrl);

  // Validate minimum size
  const metadata = await sharp(buffer).metadata();
  if (!metadata.width || !metadata.height || metadata.width < 100 || metadata.height < 100) {
    throw new Error(`Image too small: ${metadata.width}x${metadata.height}`);
  }

  // Resize and convert to WebP
  const processed = await sharp(buffer)
    .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('product-images')
    .upload(filename, processed, {
      contentType: 'image/webp',
      upsert: true,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('product-images')
    .getPublicUrl(filename);

  return publicUrl;
}

// ---------------------------------------------------------------------------
// Priority sorting: highest-impact products first
// ---------------------------------------------------------------------------

function prioritySort(components) {
  // Assign price bucket for even distribution
  const withBucket = components.map(c => ({
    ...c,
    priceBucket: !c.price_new ? 4
      : c.price_new <= 100 ? 0
      : c.price_new <= 250 ? 1
      : c.price_new <= 500 ? 2
      : 3,
    hasCrinacle: c.crin_rank != null,
    grade: c.expert_grade_numeric ?? 0,
  }));

  // Sort: Crinacle data first, then by grade DESC, then distribute across price buckets
  withBucket.sort((a, b) => {
    // Crinacle-ranked products first
    if (a.hasCrinacle !== b.hasCrinacle) return a.hasCrinacle ? -1 : 1;
    // Higher grade first
    if (a.grade !== b.grade) return b.grade - a.grade;
    // Lower price bucket first (budget products seen more often)
    return a.priceBucket - b.priceBucket;
  });

  return withBucket;
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

async function main() {
  console.log('='.repeat(70));
  console.log('HiFinder Product Image Pipeline');
  console.log('='.repeat(70));
  console.log(`Mode: ${EXECUTE ? 'EXECUTE' : 'DRY RUN'}`);
  if (BRAND_FILTER) console.log(`Brand filter: ${BRAND_FILTER}`);
  if (LIMIT < Infinity) console.log(`Limit: ${LIMIT}`);
  if (!TIER1_ONLY) console.log('Tier 2: DuckDuckGo image search');
  if (REPROCESS) console.log('Reprocess mode: re-downloading all images at 800x800');
  console.log('');

  // Load state for resuming
  const state = loadState();

  // Ensure product-images bucket exists
  if (EXECUTE) {
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(b => b.name === 'product-images');
    if (!bucketExists) {
      console.log('Creating product-images storage bucket...');
      const { error } = await supabase.storage.createBucket('product-images', {
        public: true,
        fileSizeLimit: 1024 * 1024, // 1MB max per image
      });
      if (error) {
        console.error(`Failed to create bucket: ${error.message}`);
        process.exit(1);
      }
      console.log('Bucket created.\n');
    }
  }

  // Fetch components needing images (or all if reprocessing)
  let query = supabase
    .from('components')
    .select('id, brand, name, category, manufacturer_url, image_url, price_new, expert_grade_numeric, crin_rank');

  if (!REPROCESS) {
    query = query.is('image_url', null);
  }

  if (BRAND_FILTER) {
    query = query.ilike('brand', BRAND_FILTER);
  }

  const { data: components, error } = await query;
  if (error) {
    console.error('Error fetching components:', error);
    process.exit(1);
  }

  // Sort by priority
  const sorted = prioritySort(components);
  const toProcess = sorted.slice(0, LIMIT);

  console.log(`Components without images: ${components.length}`);
  console.log(`Processing this run: ${toProcess.length}`);
  console.log('');

  const results = { tier1Success: 0, tier2Success: 0, tier1Fail: 0, tier2Fail: 0, skipped: 0, errors: 0 };
  const missingProducts = [];

  for (let i = 0; i < toProcess.length; i++) {
    const component = toProcess[i];
    const label = `${component.brand} ${component.name}`;

    // Skip if already processed in a previous run
    if (state.processed[component.id]) {
      results.skipped++;
      continue;
    }

    console.log(`[${i + 1}/${toProcess.length}] ${label}`);
    console.log(`  Category: ${component.category} | Price: $${component.price_new ?? '?'} | Grade: ${component.expert_grade_numeric ?? '?'}`);

    // Tier 1: Manufacturer scraping
    let imageUrl = null;
    if (component.manufacturer_url) {
      console.log(`  Tier 1: Scraping ${component.manufacturer_url}`);
      imageUrl = await tier1Scrape(component);
      if (imageUrl) {
        console.log(`  Tier 1 found: ${imageUrl.substring(0, 80)}...`);
        results.tier1Success++;
      } else {
        console.log('  Tier 1: No image found');
        results.tier1Fail++;
      }
    } else {
      console.log('  Tier 1: No manufacturer URL');
      results.tier1Fail++;
    }

    // Tier 2: DuckDuckGo image search (if Tier 1 failed)
    if (!imageUrl && !TIER1_ONLY) {
      console.log('  Tier 2: Searching DuckDuckGo...');
      imageUrl = await tier2DuckDuckGo(component);
      if (imageUrl) {
        console.log(`  Tier 2 found: ${imageUrl.substring(0, 80)}...`);
        results.tier2Success++;
      } else {
        console.log('  Tier 2: No image found');
        results.tier2Fail++;
      }
    }

    // Process and upload
    if (imageUrl && EXECUTE) {
      try {
        const publicUrl = await processAndUpload(imageUrl, component);
        console.log(`  Uploaded: ${publicUrl}`);

        // Update database
        const { error: updateError } = await supabase
          .from('components')
          .update({ image_url: publicUrl })
          .eq('id', component.id);

        if (updateError) {
          console.log(`  DB update error: ${updateError.message}`);
          results.errors++;
        }

        state.processed[component.id] = { url: publicUrl, tier: imageUrl === publicUrl ? 'upload' : 'tier1-or-2' };
      } catch (err) {
        console.log(`  Processing error: ${err.message}`);
        results.errors++;
        missingProducts.push(component);
      }
    } else if (imageUrl && !EXECUTE) {
      console.log(`  [DRY RUN] Would download and upload: ${imageUrl.substring(0, 80)}...`);
      state.processed[component.id] = { url: imageUrl, tier: 'dry-run' };
    } else {
      // No image found from any tier
      missingProducts.push(component);
    }

    console.log('');

    // Rate limit between requests
    await new Promise(r => setTimeout(r, TIER1_ONLY ? 1000 : DDG_DELAY_MS));

    // Save state periodically
    if (i % 10 === 0) saveState(state);
  }

  // Final state save
  saveState(state);

  // Write missing products CSV
  if (missingProducts.length > 0) {
    const csvHeader = 'id,brand,name,category,manufacturer_url\n';
    const csvRows = missingProducts.map(c =>
      `${c.id},"${c.brand}","${c.name}",${c.category},${c.manufacturer_url || ''}`
    ).join('\n');
    const dir = path.dirname(MISSING_CSV);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(MISSING_CSV, csvHeader + csvRows);
    console.log(`Missing images CSV written to: ${MISSING_CSV}`);
  }

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));
  console.log(`Tier 1 success: ${results.tier1Success}`);
  console.log(`Tier 1 fail:    ${results.tier1Fail}`);
  if (!TIER1_ONLY) {
    console.log(`Tier 2 success: ${results.tier2Success}`);
    console.log(`Tier 2 fail:    ${results.tier2Fail}`);
    console.log(`DDG queries: ${results.tier2Success + results.tier2Fail}`);
  }
  console.log(`Errors:         ${results.errors}`);
  console.log(`Skipped (done): ${results.skipped}`);
  console.log(`Missing (Tier 3): ${missingProducts.length}`);
  console.log(`Remaining without images: ${components.length - Object.keys(state.processed).length}`);
  console.log('');

  if (!EXECUTE) {
    console.log('This was a DRY RUN. Use --execute to actually download, process, and upload images.');
  }
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
