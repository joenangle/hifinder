/**
 * Reverb Price Guide Scraper for HiFinder
 *
 * Fetches actual sold transaction history from Reverb's Price Guide API.
 * Unlike the listing scraper (reverb-integration.js) which finds active listings,
 * this pulls historical sold data — dates, conditions, ask/final prices — and
 * Reverb's estimated market value range.
 *
 * Data flows into `used_listings` with status='sold' so PriceHistoryChart,
 * PriceHistoryBadge, and deal detection all auto-benefit.
 *
 * Usage:
 *   node scripts/reverb-priceguide-scraper.js              # Full run
 *   node scripts/reverb-priceguide-scraper.js --limit=10   # Test with 10 components
 *   node scripts/reverb-priceguide-scraper.js --dry-run     # Search only, no DB writes
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

const { mapCondition } = require('./shared/condition-mapper');
const { supabase } = require('./shared/database');

// ── Config ──────────────────────────────────────────────────────────────────

const REVERB_API = 'https://reverb.com/api';
const HEADERS = {
  'Accept': 'application/hal+json',
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.REVERB_API_TOKEN}`,
  'User-Agent': 'HiFinder-PriceGuide/1.0',
};
const RATE_LIMIT_MS = 1000; // 1s between API calls

// Brand aliases for matching (shared with reverb-integration.js)
const BRAND_ALIASES = {
  'beyerdynamic': ['beyerdynamic', 'beyer'],
  'audio technica': ['audio technica', 'audio-technica', 'audiotechnica'],
  'campfire audio': ['campfire audio', 'campfire'],
};

// Exclude non-headphone products from price guide search results
const EXCLUDE_KEYWORDS = [
  'guitar', 'bass', 'drum', 'keyboard', 'piano', 'synth', 'violin',
  'trumpet', 'saxophone', 'ukulele', 'banjo', 'mandolin', 'cello',
  'flute', 'clarinet', 'trombone', 'pedal', 'microphone', 'speaker',
  'cable only', 'adapter', 'mixer', 'tuner', 'strap', 'pick', 'string',
  'ear pad', 'earpad', 'ear cushion', 'replacement pad', 'dekoni',
  'headband pad', 'carrying case', 'replacement cable',
];

// ── CLI args ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const limitArg = args.find(a => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1]) : null;
const DRY_RUN = args.includes('--dry-run');

// ── Helpers ─────────────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch from Reverb API with error handling and rate-limit awareness
 */
async function reverbFetch(path) {
  const url = `${REVERB_API}${path}`;
  const response = await fetch(url, { headers: HEADERS });

  if (!response.ok) {
    if (response.status === 429) {
      console.warn('  ⚠️ Rate limited — waiting 10s');
      await sleep(10000);
      // Retry once
      const retry = await fetch(url, { headers: HEADERS });
      if (!retry.ok) throw new Error(`HTTP ${retry.status} on retry: ${url}`);
      return retry.json();
    }
    throw new Error(`HTTP ${response.status}: ${url}`);
  }

  return response.json();
}

/**
 * Check if a price guide result is relevant to our component.
 * Adapted from reverb-integration.js isRelevantListing — but simpler
 * because price guide titles are already product names (not user listings).
 */
function isPriceGuideRelevant(priceGuideTitle, component) {
  const title = priceGuideTitle.toLowerCase();
  const brand = component.brand.toLowerCase();
  const name = component.name.toLowerCase();

  // Must contain brand
  const aliases = BRAND_ALIASES[brand] || [brand];
  if (!aliases.some(a => title.includes(a))) return false;

  // Must not be an excluded product type
  if (EXCLUDE_KEYWORDS.some(kw => title.includes(kw))) return false;

  // Check for model name match
  const modelVariations = [
    name,
    name.replace(/\s+/g, ''),           // "HD 650" → "HD650"
    name.replace(/-/g, ' '),            // "LCD-X" → "LCD X"
    name.replace(/\s+/g, '-'),          // "HD 650" → "HD-650"
    // Add space at letter→digit and digit→letter boundaries
    // "HD650" → "HD 650", "HD800S" → "HD 800 S"
    name.replace(/([a-z])(\d)/gi, '$1 $2').replace(/(\d)([a-z])/gi, '$1 $2'),
  ];

  // Exact model match with word boundaries
  for (const variation of modelVariations) {
    const escaped = variation.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[\\s\\-\\(\\[/])${escaped}(?:$|[\\s\\-\\)\\]/,;:.])`, 'i');
    if (regex.test(title)) return true;
  }

  // Word-based matching: require majority of model words
  // Don't filter out numeric model numbers (e.g. 1990, 650) — they're critical for disambiguation
  const modelWords = name.split(/[\s\-\/]+/).filter(w => w.length > 1);

  // Need at least 2 significant words for word-based matching to be reliable.
  // Single-word models (e.g. "LCD" from "LCD-4") are too ambiguous — only regex exact match works.
  if (modelWords.length < 2) return false;

  const matchedWords = modelWords.filter(word =>
    title.includes(word.toLowerCase())
  );
  // Require ALL words for short models, majority for longer ones
  const requiredMatches = modelWords.length <= 3 ? modelWords.length : Math.ceil(modelWords.length * 0.6);
  return matchedWords.length >= requiredMatches;
}

/**
 * Calculate match confidence based on title similarity
 */
function calculateConfidence(priceGuideTitle, component) {
  const title = priceGuideTitle.toLowerCase();
  const fullName = `${component.brand} ${component.name}`.toLowerCase();

  // Exact match = 1.0
  if (title === fullName) return 1.0;
  if (title.includes(fullName)) return 0.95;

  // Partial scoring based on word overlap
  const titleWords = new Set(title.split(/[\s\-\/]+/));
  const nameWords = fullName.split(/[\s\-\/]+/);
  const matched = nameWords.filter(w => titleWords.has(w)).length;
  return Math.min(0.9, matched / nameWords.length);
}

// ── Core logic ──────────────────────────────────────────────────────────────

/**
 * Search Reverb Price Guide for a component and return best match.
 * Tries multiple query variations to handle naming differences
 * (e.g., "HD650" in our DB vs "HD 650" on Reverb).
 */
async function findPriceGuide(component) {
  const baseName = component.name;
  // Add spaces at letter↔digit boundaries: "HD650" → "HD 650", "LCD4" → "LCD 4"
  const spacedName = baseName
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .replace(/(\d)([a-zA-Z])/g, '$1 $2');

  // Build unique query variations
  const queries = [...new Set([
    `${component.brand} ${baseName}`,
    `${component.brand} ${spacedName}`,
  ])];

  for (const query of queries) {
    const data = await reverbFetch(`/priceguide?query=${encodeURIComponent(query)}`);

    const guides = data.price_guides;
    if (!guides || !Array.isArray(guides) || guides.length === 0) {
      continue;
    }

    // Find best relevant match
    for (const result of guides) {
      if (isPriceGuideRelevant(result.title || '', component)) {
        return {
          id: result.id,
          title: result.title,
          confidence: calculateConfidence(result.title || '', component),
          estimated_value: result.estimated_value,
          number_of_sales: result.number_of_sales || 0,
        };
      }
    }

    await sleep(RATE_LIMIT_MS);
  }

  return null;
}

/**
 * Fetch transactions for a price guide entry.
 * Transactions come newest-first. On incremental runs, stop paginating
 * once we reach transactions older than `since` (last_synced_at).
 */
async function fetchTransactions(priceGuideId, since = null) {
  const transactions = [];
  let page = 1;
  const perPage = 50;
  let hitOldData = false;

  while (true) {
    const path = `/priceguide/${priceGuideId}/transactions?per_page=${perPage}&page=${page}`;
    const data = await reverbFetch(path);
    await sleep(RATE_LIMIT_MS);

    if (!data.transactions || data.transactions.length === 0) break;

    for (const tx of data.transactions) {
      // Incremental: skip transactions we've already seen
      if (since && tx.date) {
        const txDate = new Date(tx.date).toISOString();
        if (txDate <= since) {
          hitOldData = true;
          break;
        }
      }
      transactions.push(tx);
    }

    if (hitOldData) break;
    if (data.transactions.length < perPage) break;
    page++;
  }

  return transactions;
}

/**
 * Transform a Reverb transaction into a used_listings row
 */
function transformTransaction(transaction, component) {
  const orderId = transaction.order_id || transaction.id || Date.now();
  const finalPrice = transaction.price_final?.amount
    ? Math.round(parseFloat(transaction.price_final.amount))
    : null;
  const askPrice = transaction.price_ask?.amount
    ? Math.round(parseFloat(transaction.price_ask.amount))
    : null;
  const price = finalPrice || askPrice;

  if (!price || price < 20) return null;

  const condition = mapCondition(
    transaction.condition || 'good',
    'reverb'
  );

  // Transaction date — API returns "YYYY-MM-DD" string
  const dateStr = transaction.date
    ? new Date(transaction.date).toISOString()
    : new Date().toISOString();

  return {
    component_id: component.id,
    title: `${component.brand} ${component.name}`,
    price: askPrice || price,
    sale_price: finalPrice || price,
    condition: condition,
    location: 'Reverb',
    source: 'reverb',
    url: `reverb://priceguide/transaction/${orderId}`,
    date_posted: dateStr,
    date_sold: dateStr,
    seller_username: 'Reverb Price Guide',
    status: 'sold',
    is_active: false,
  };
}

/**
 * Process a single component: find price guide, fetch transactions, save
 */
async function processComponent(component, stats) {
  // 1. Check cached mapping
  const { data: existingMapping } = await supabase
    .from('reverb_priceguide_mappings')
    .select('*')
    .eq('component_id', component.id)
    .single();

  let priceGuideId = existingMapping?.reverb_priceguide_id;
  let since = existingMapping?.last_synced_at;

  // 2. If no cached mapping, search for one
  if (!priceGuideId) {
    const match = await findPriceGuide(component);
    await sleep(RATE_LIMIT_MS);

    if (!match) {
      stats.noMatch++;
      return;
    }

    stats.matched++;
    console.log(`  ✅ Matched: "${match.title}" (confidence: ${match.confidence.toFixed(2)}, ${match.number_of_sales} sales)`);

    priceGuideId = match.id;

    if (!DRY_RUN) {
      // Parse estimated value
      const estLow = match.estimated_value?.price_low?.amount
        ? parseFloat(match.estimated_value.price_low.amount)
        : null;
      const estHigh = match.estimated_value?.price_high?.amount
        ? parseFloat(match.estimated_value.price_high.amount)
        : null;

      // Cache the mapping
      const { error: mapError } = await supabase
        .from('reverb_priceguide_mappings')
        .upsert({
          component_id: component.id,
          reverb_priceguide_id: priceGuideId,
          reverb_title: match.title,
          match_confidence: match.confidence,
          estimated_value_low: estLow,
          estimated_value_high: estHigh,
          transaction_count: match.number_of_sales,
        }, { onConflict: 'component_id' });

      if (mapError) {
        console.error(`  ❌ Error caching mapping: ${mapError.message}`);
      }

      // Update component price_used_min/max from estimated value if better
      if (estLow && estHigh) {
        const updates = {};
        if (!component.price_used_min || estLow < component.price_used_min) {
          updates.price_used_min = estLow;
        }
        if (!component.price_used_max || estHigh > component.price_used_max) {
          updates.price_used_max = estHigh;
        }
        if (Object.keys(updates).length > 0) {
          await supabase
            .from('components')
            .update(updates)
            .eq('id', component.id);
          console.log(`  📊 Updated price range: $${estLow} - $${estHigh}`);
        }
      }
    }
  } else {
    stats.cached++;
    console.log(`  📦 Cached mapping → Price Guide #${priceGuideId}`);
  }

  if (DRY_RUN) return;

  // 3. Fetch transactions (incremental)
  const transactions = await fetchTransactions(priceGuideId, since);

  if (transactions.length === 0) {
    console.log(`  ⏭️  No new transactions`);
    // Still update last_synced_at
    await supabase
      .from('reverb_priceguide_mappings')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('component_id', component.id);
    return;
  }

  console.log(`  📥 Fetched ${transactions.length} transactions`);

  // 4. Transform and save via shared saveListing (handles upsert + dedup)
  let saved = 0;
  let skipped = 0;

  for (const tx of transactions) {
    const listing = transformTransaction(tx, component);
    if (!listing) {
      skipped++;
      continue;
    }

    const { error } = await supabase
      .from('used_listings')
      .upsert(listing, { onConflict: 'url,component_id' });

    if (error) {
      if (error.code === '23505') {
        skipped++;
      } else {
        console.error(`  ❌ Error saving transaction: ${error.message}`);
      }
    } else {
      saved++;
    }
  }

  stats.transactionsSaved += saved;
  stats.transactionsSkipped += skipped;
  console.log(`  💾 Saved ${saved} new, skipped ${skipped} existing`);

  // 5. Update last_synced_at and transaction count
  await supabase
    .from('reverb_priceguide_mappings')
    .update({
      last_synced_at: new Date().toISOString(),
      transaction_count: (existingMapping?.transaction_count || 0) + saved,
    })
    .eq('component_id', component.id);
}

// ── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🎸 Reverb Price Guide Scraper');
  console.log(`   Mode: ${DRY_RUN ? 'DRY RUN (no DB writes)' : 'LIVE'}`);
  if (LIMIT) console.log(`   Limit: ${LIMIT} components`);
  console.log();

  if (!process.env.REVERB_API_TOKEN) {
    console.error('❌ REVERB_API_TOKEN not set');
    process.exit(1);
  }

  // Fetch all audio components
  let query = supabase
    .from('components')
    .select('id, name, brand, category, price_used_min, price_used_max')
    .in('category', ['cans', 'iems', 'dac', 'amp', 'combo'])
    .order('brand', { ascending: true })
    .order('name', { ascending: true });

  const { data: components, error } = await query;

  if (error) {
    console.error('❌ Error fetching components:', error.message);
    process.exit(1);
  }

  const toProcess = LIMIT ? components.slice(0, LIMIT) : components;
  console.log(`📋 Processing ${toProcess.length} of ${components.length} components\n`);

  const stats = {
    matched: 0,
    cached: 0,
    noMatch: 0,
    transactionsSaved: 0,
    transactionsSkipped: 0,
    errors: 0,
  };

  for (const [index, component] of toProcess.entries()) {
    console.log(`[${index + 1}/${toProcess.length}] ${component.brand} ${component.name}`);

    try {
      await processComponent(component, stats);
    } catch (err) {
      console.error(`  ❌ ${err.message}`);
      stats.errors++;
    }

    // Rate limit between components
    await sleep(RATE_LIMIT_MS);
  }

  // Summary
  console.log('\n' + '═'.repeat(50));
  console.log('📊 Summary');
  console.log('═'.repeat(50));
  console.log(`  Components processed: ${toProcess.length}`);
  console.log(`  New mappings found:   ${stats.matched}`);
  console.log(`  Cached mappings used: ${stats.cached}`);
  console.log(`  No match found:       ${stats.noMatch}`);
  console.log(`  Transactions saved:   ${stats.transactionsSaved}`);
  console.log(`  Transactions skipped: ${stats.transactionsSkipped}`);
  console.log(`  Errors:               ${stats.errors}`);
  console.log('═'.repeat(50));
}

main().catch(err => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
