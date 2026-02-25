/**
 * Component Candidate Extractor
 *
 * Extracts brand, model, and metadata from listing titles
 * for audio components that don't exist in the database yet.
 *
 * Shared by all scrapers (Reddit, Reverb, etc.)
 */

const { createClient } = require('@supabase/supabase-js');
const { getComponentsFromCache } = require('./component-matcher-enhanced');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Candidate cache - loaded once per run to avoid per-post DB queries
let _candidateCache = null;

async function getCandidateCache() {
  if (_candidateCache) return _candidateCache;

  const { data, error } = await supabase
    .from('new_component_candidates')
    .select('*');

  if (error) {
    console.error('Error loading candidate cache:', error.message);
    _candidateCache = new Map();
    return _candidateCache;
  }

  _candidateCache = new Map();
  for (const candidate of (data || [])) {
    _candidateCache.set(`${candidate.brand}::${candidate.model}`, candidate);
  }
  console.log(`📦 Candidate cache loaded: ${_candidateCache.size} candidates`);
  return _candidateCache;
}

// Known audio brands (reused from component-matcher-enhanced.js)
const KNOWN_BRANDS = [
  'sennheiser', 'audio-technica', 'beyerdynamic', 'akg', 'sony', 'bose', 'shure',
  'hifiman', 'audeze', 'focal', 'dan clark audio', 'dca', 'zmf', 'meze', 'grado',
  'campfire audio', 'empire ears', 'noble audio', '64 audio', 'unique melody',
  'qdc', 'dunu', 'moondrop', 'fiio', 'thieaudio', 'letshuoer', 'truthear', '7hz',
  'kz', 'cca', 'tin hifi', 'blon', 'tripowin', 'smsl', 'topping', 'schiit',
  'jds labs', 'geshelli', 'drop', 'monoprice', 'magni', 'modi', 'atom'
];

// Multi-word brands that need special handling
const MULTI_WORD_BRANDS = [
  'audio-technica', 'audio technica', 'dan clark audio', 'campfire audio',
  'empire ears', 'noble audio', '64 audio', 'unique melody', 'tin hifi',
  'jds labs', 'zmf headphones'
];

// Category keywords for inference
const CATEGORY_KEYWORDS = {
  cans: ['headphone', 'over-ear', 'on-ear', 'closed-back', 'open-back', 'planar', 'over ear', 'on ear'],
  iems: ['iem', 'in-ear', 'earphone', 'earbud', 'in ear'],
  dac: ['dac', 'digital analog converter', 'decoder'],
  amp: ['amp', 'amplifier', 'headphone amp'],
  dac_amp: ['dac/amp', 'dac amp', 'combo', 'all-in-one']
};

// Accessories to exclude (NOT audio gear)
const ACCESSORY_KEYWORDS = [
  'cable', 'case', 'tip', 'tips', 'ear tip', 'foam', 'pad', 'pads', 'cushion',
  'stand', 'hanger', 'hook', 'bag', 'pouch', 'box', 'adapter', 'converter',
  'splitter', 'extension', 'wire', 'cord', 'bluetooth', 'dongle', 'jack'
];

/**
 * Extract brand from listing title
 */
function extractBrand(title) {
  const titleLower = title.toLowerCase();

  // Check multi-word brands first (to avoid partial matches)
  for (const brand of MULTI_WORD_BRANDS) {
    if (titleLower.includes(brand.toLowerCase())) {
      // Return properly capitalized version
      return brand.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
  }

  // Check single-word brands
  for (const brand of KNOWN_BRANDS) {
    if (titleLower.includes(brand.toLowerCase())) {
      // Return properly capitalized version
      return brand.charAt(0).toUpperCase() + brand.slice(1);
    }
  }

  return null;
}

/**
 * Extract only the [H] (Have) section from Reddit titles
 * Prevents [W] (Want/Payment) section from contaminating model extraction
 */
function extractRedditHaveSection(title) {
  // Check if this is a Reddit-style title with [H] and [W] tags
  const haveMatch = title.match(/\[H\]\s*(.+?)\s*\[W\]/i);

  if (haveMatch) {
    return haveMatch[1].trim();
  }

  // If no [H]/[W] structure, return full title
  return title;
}

/**
 * Extract model name from listing title
 * Removes brand, price, condition, and common listing words
 */
function extractModel(title, brand) {
  if (!brand) return null;

  // Extract only [H] section for Reddit titles FIRST (before removing brackets)
  let model = extractRedditHaveSection(title);

  // Remove Reddit formatting tags FIRST (before removing brackets)
  model = model.replace(/\[WTS\]/gi, '');
  model = model.replace(/\[WTT\]/gi, '');
  model = model.replace(/\[WTB\]/gi, '');
  model = model.replace(/\[US-[A-Z]{2}\]/gi, ''); // State codes like [US-CA]
  model = model.replace(/\[H\]/gi, ''); // Have section
  model = model.replace(/\[W\]/gi, ''); // Want section
  model = model.replace(/\[USA-[A-Z]{2}\]/gi, ''); // Alternative state format

  // Remove brand name
  model = model.replace(new RegExp(brand, 'gi'), '');

  // Remove common listing words
  const removalPatterns = [
    // Condition words
    /\b(new|mint|excellent|good|fair|poor|condition|like new|lnib)\b/gi,
    /\b(with|includes|comes with|box|original|accessories)\b/gi,

    // Listing words
    /\b(for sale|fs|wts|wtt|trade|sell|selling)\b/gi,
    /\b(price drop|reduced|obo|or best offer)\b/gi,

    // Payment methods
    /\b(paypal|pp|venmo|zelle|cashapp|cash app|wire|wire transfer|bank transfer|local cash|cash only|money order)\b/gi,
    /\b(g&s|g&amp;s|g and s|goods and services)\b/gi,
    /\b(f&f|f&amp;f|friends and family)\b/gi,

    // Shipping terms
    /\b(shipped|shipping|usps|ups|fedex|priority)\b/gi,
    /\b(conus|international|local pickup|local only)\b/gi,

    // Reddit structure tags (prevents "US-CA H" in model)
    /\[(?:WTS|WTB|WTT|USA?|US|H|W)\]/gi,
    /\b(USA?-[A-Z]{2})\b/gi, // US-CA, USA-TX, etc.

    // Prices and scores
    /\$\d+/g, // Remove prices
    /\d+\/\d+/g, // Remove trade scores

    // Brackets (after Reddit structure extraction)
    /[\[\](){}]/g, // Remove brackets

    // Cleanup
    /\s+-\s+/g, // Remove dashes with spaces
    /\s+/g // Normalize whitespace
  ];

  for (const pattern of removalPatterns) {
    model = model.replace(pattern, ' ');
  }

  // Trim and clean
  model = model.trim().replace(/\s+/g, ' ');

  // If model is too short or too long, it's probably not valid
  if (model.length < 2 || model.length > 50) {
    return null;
  }

  return model;
}

/**
 * Detect if title contains multiple components
 * If bundle, skip candidate extraction (too ambiguous)
 */
function isBundleListing(title) {
  // Extract [H] section only
  const haveSection = extractRedditHaveSection(title);
  const haveLower = haveSection.toLowerCase();

  // Common separators for multiple items
  const separators = [',', ' + ', ' and ', ' & ', ' / ', ' with '];
  const hasSeparator = separators.some(sep => haveLower.includes(sep));

  if (!hasSeparator) return false;

  // Count potential brands mentioned
  let brandCount = 0;
  for (const brand of KNOWN_BRANDS) {
    if (haveLower.includes(brand.toLowerCase())) {
      brandCount++;
    }
  }

  // If 2+ brands, definitely bundle
  if (brandCount >= 2) return true;

  // If has separator + model number pattern, likely bundle
  if (hasSeparator && /\b[A-Z]{2,4}\d{2,4}\b/i.test(haveSection)) {
    return true;
  }

  return false;
}

/**
 * Infer category from title keywords
 */
function inferCategory(title) {
  const titleLower = title.toLowerCase();

  // Check each category's keywords
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (titleLower.includes(keyword)) {
        return category;
      }
    }
  }

  return null; // Unknown category
}

/**
 * Check if title is likely an accessory (not audio gear)
 */
function isAccessory(title) {
  const titleLower = title.toLowerCase();

  for (const keyword of ACCESSORY_KEYWORDS) {
    if (titleLower.includes(keyword)) {
      return true;
    }
  }

  return false;
}

/**
 * Calculate quality score (0-100) based on data completeness
 */
function calculateQualityScore(candidate) {
  let score = 0;

  // Brand and model (required)
  if (candidate.brand) score += 20;
  if (candidate.model && candidate.model.length >= 3) score += 20;

  // Category inference
  if (candidate.category) score += 15;

  // Price data
  if (candidate.price_observed_min) score += 15;
  if (candidate.price_estimate_new) score += 10;

  // Technical specs
  if (candidate.impedance) score += 5;
  if (candidate.driver_type) score += 5;

  // Expert data
  if (candidate.asr_sinad || candidate.crin_rank) score += 10;

  return Math.min(100, score);
}

/**
 * Check if candidate already exists in components table (fuzzy match)
 * Uses the shared component cache from component-matcher-enhanced.js
 */
async function checkExistingComponent(brand, model) {
  try {
    const components = await getComponentsFromCache();
    const brandLower = brand.toLowerCase();
    const modelLower = model.toLowerCase();

    const match = components.find(c =>
      c.brand.toLowerCase() === brandLower &&
      c.name.toLowerCase().includes(modelLower)
    );

    return match ? { id: match.id, brand: match.brand, name: match.name } : null;
  } catch (error) {
    console.error('Error in checkExistingComponent:', error.message);
    return null;
  }
}

/**
 * Check if candidate already exists in candidates table
 * Uses in-memory cache to avoid per-post DB queries
 */
async function checkExistingCandidate(brand, model) {
  try {
    const cache = await getCandidateCache();
    return cache.get(`${brand}::${model}`) || null;
  } catch (error) {
    console.error('Error in checkExistingCandidate:', error.message);
    return null;
  }
}

/**
 * Create or update component candidate
 */
async function saveComponentCandidate(candidateData, listingId) {
  try {
    const { brand, model, category, price, url } = candidateData;

    // Check if it's an accessory
    if (isAccessory(candidateData.title || '')) {
      console.log(`  ⏭️  Skipped: "${candidateData.title}" (accessory detected)`);
      return null;
    }

    // Check if brand/model were extracted
    if (!brand || !model) {
      console.log(`  ⏭️  Skipped: "${candidateData.title}" (could not extract brand/model)`);
      return null;
    }

    // Check if component already exists in main table
    const existingComponent = await checkExistingComponent(brand, model);
    if (existingComponent) {
      console.log(`  ℹ️  Component exists: ${brand} ${model} (id: ${existingComponent.id})`);
      return null; // Don't create candidate if component exists
    }

    // Check if candidate already exists
    const existingCandidate = await checkExistingCandidate(brand, model);

    if (existingCandidate) {
      // Update existing candidate (increment listing count, update prices)
      const updatedListingIds = existingCandidate.trigger_listing_ids || [];
      if (!updatedListingIds.includes(listingId)) {
        updatedListingIds.push(listingId);
      }

      const updatedData = {
        listing_count: existingCandidate.listing_count + 1,
        trigger_listing_ids: updatedListingIds,
        last_seen_at: new Date().toISOString(),
        // Update price range if current price is lower/higher
        price_observed_min: price && existingCandidate.price_observed_min
          ? Math.min(price, existingCandidate.price_observed_min)
          : price || existingCandidate.price_observed_min,
        price_observed_max: price && existingCandidate.price_observed_max
          ? Math.max(price, existingCandidate.price_observed_max)
          : price || existingCandidate.price_observed_max
      };

      const { data, error } = await supabase
        .from('new_component_candidates')
        .update(updatedData)
        .eq('id', existingCandidate.id)
        .select()
        .single();

      if (error) {
        console.error(`❌ Error updating candidate: ${error.message}`);
        return null;
      }

      // Update cache with fresh data
      _candidateCache.set(`${brand}::${model}`, data);
      console.log(`  ♻️  Updated candidate: ${brand} ${model} (${data.listing_count} listings)`);
      return data;
    }

    // Create new candidate
    const newCandidate = {
      brand,
      model,
      category,
      price_observed_min: price,
      price_observed_max: price,
      price_estimate_new: price ? Math.round(price / 0.7) : null, // Estimate MSRP as 140% of used
      price_used_min: price ? Math.round(price * 0.85) : null, // 60% of estimate
      price_used_max: price ? Math.round(price * 1.15) : null, // 80% of estimate
      trigger_listing_ids: [listingId],
      listing_count: 1,
      status: 'pending'
    };

    // Calculate quality score
    newCandidate.quality_score = calculateQualityScore(newCandidate);

    const { data, error } = await supabase
      .from('new_component_candidates')
      .insert(newCandidate)
      .select()
      .single();

    if (error) {
      console.error(`❌ Error creating candidate: ${error.message}`);
      return null;
    }

    // Add to cache for subsequent posts in this run
    _candidateCache.set(`${brand}::${model}`, data);
    console.log(`  ✨ New candidate: ${brand} ${model} (quality: ${data.quality_score}%)`);
    return data;
  } catch (error) {
    console.error('Error in saveComponentCandidate:', error.message);
    return null;
  }
}

/**
 * Main extraction function - called by scrapers when match fails
 */
async function extractComponentCandidate(listing) {
  try {
    const { title, price, id: listingId, url } = listing;

    console.log(`🔍 Extracting candidate from: "${title}"`);

    // Skip bundle listings (too ambiguous)
    if (isBundleListing(title)) {
      console.log(`  ⏭️  Skipped: Bundle listing detected`);
      return null;
    }

    // Extract brand and model
    const brand = extractBrand(title);
    const model = brand ? extractModel(title, brand) : null;
    const category = inferCategory(title);

    const candidateData = {
      title,
      brand,
      model,
      category,
      price,
      url
    };

    // Save candidate (or update existing)
    const candidate = await saveComponentCandidate(candidateData, listingId);

    return candidate;
  } catch (error) {
    console.error('Error in extractComponentCandidate:', error.message);
    return null;
  }
}

module.exports = {
  extractComponentCandidate,
  extractBrand,
  extractModel,
  inferCategory,
  isAccessory,
  calculateQualityScore,
  checkExistingComponent,
  checkExistingCandidate,
  // New functions for improved extraction
  extractRedditHaveSection,
  isBundleListing
};
