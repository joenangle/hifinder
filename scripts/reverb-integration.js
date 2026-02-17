/**
 * Reverb API Integration for HiFinder Used Listings
 *
 * Uses Reverb API to search for headphone listings and populate our database
 * Reverb is primarily for musical instruments but has a growing pro audio section
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

// Shared utilities
const { mapCondition } = require('./shared/condition-mapper');
const { parseReverbPrice, validatePriceReasonable } = require('./shared/price-extractor');
const { saveListing, supabase } = require('./shared/database');

// Reverb API configuration
const REVERB_CONFIG = {
  apiUrl: 'https://reverb.com/api',
  
  // Authentication - Reverb requires API key
  headers: {
    'Accept': 'application/hal+json',
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.REVERB_API_TOKEN}`, // Set in environment
    'User-Agent': 'HiFinder-UsedListingAggregator/1.0'
  },
  
  // Search parameters optimized for headphones/audio gear
  searchParams: {
    per_page: 50, // Max results per request
    page: 1,
    item_region: 'US', // Focus on US listings
    condition: ['mint', 'excellent', 'very-good', 'good', 'fair'], 
    category: 'pro-audio-equipment', // Main category for headphones on Reverb
    subcategory: 'headphones', // More specific
    price_min: 25, // Filter out obvious junk
    price_max: 5000, // Reasonable headphone ceiling
    handmade: false, // Focus on commercial products
    sort: 'created_at' // Newest first
  },
  
  maxPages: 2, // Limit API calls
  rateLimit: 1000 // 1 second between calls
};

/**
 * Build better Reverb search query
 * Strategy: Brand + first significant word of model (balances precision/recall)
 */
function buildSearchQuery(component) {
  const brand = component.brand;
  const modelWords = component.name.split(/[\s\-\/]+/).filter(word => {
    // Filter out parentheticals, years, and short words
    return word.length > 2 && !/^\(.*\)$/.test(word) && !/^\d{4}$/.test(word);
  });

  // Use brand + first significant model word for best balance
  const firstModelWord = modelWords[0] || '';
  const query = `${brand} ${firstModelWord}`.trim();

  return query;
}

/**
 * Search Reverb for a specific headphone component
 */
async function searchReverbForComponent(component) {
  if (!process.env.REVERB_API_TOKEN) {
    console.log('⚠️ REVERB_API_TOKEN not set - skipping Reverb integration');
    return [];
  }

  const searchQuery = buildSearchQuery(component);
  console.log(`🔍 Searching Reverb for: ${component.brand} ${component.name} (query: "${searchQuery}")`);

  try {
    const params = new URLSearchParams({
      query: searchQuery,
      per_page: REVERB_CONFIG.searchParams.per_page,
      page: REVERB_CONFIG.searchParams.page,
      item_region: REVERB_CONFIG.searchParams.item_region,
      'condition[]': REVERB_CONFIG.searchParams.condition.join(','),
      category: REVERB_CONFIG.searchParams.category,
      subcategory: REVERB_CONFIG.searchParams.subcategory, // ADDED: Filter to headphones only
      price_min: REVERB_CONFIG.searchParams.price_min,
      price_max: REVERB_CONFIG.searchParams.price_max,
      sort: REVERB_CONFIG.searchParams.sort
    });
    
    const url = `${REVERB_CONFIG.apiUrl}/listings?${params}`;
    
    console.log(`📡 Fetching: ${url}`);
    
    const response = await fetch(url, {
      headers: REVERB_CONFIG.headers
    });
    
    if (!response.ok) {
      if (response.status === 401) {
        console.error('❌ Unauthorized - check REVERB_API_TOKEN');
        return [];
      } else if (response.status === 429) {
        console.warn('⚠️ Rate limited by Reverb API - waiting...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        return [];
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data.listings || !Array.isArray(data.listings)) {
      console.warn('⚠️ Unexpected Reverb API response format');
      return [];
    }
    
    const listings = data.listings
      .filter(listing => isRelevantListing(listing, component))
      .map(listing => transformReverbListing(listing, component))
      .filter(listing => {
        if (!listing.price || listing.price < 20) {
          console.log(`⚠️ Skipping Reverb listing "${listing.title}" — no valid price (got ${listing.price})`);
          return false;
        }
        return true;
      });

    console.log(`📦 Found ${listings.length} relevant Reverb listings for ${component.brand} ${component.name}`);
    
    return listings;
    
  } catch (error) {
    console.error(`❌ Error searching Reverb for ${component.brand} ${component.name}:`, error.message);
    return [];
  }
}

/**
 * Simple Levenshtein distance for fuzzy matching
 */
function levenshteinDistance(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  const matrix = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Calculate similarity between two strings (0-1 scale)
 */
function stringSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const distance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
  return (longer.length - distance) / longer.length;
}

/**
 * Check if Reverb listing is relevant to our component
 * Uses fuzzy matching for better recall
 */
function isRelevantListing(listing, component) {
  const title = listing.title?.toLowerCase() || '';
  const description = listing.description?.toLowerCase() || '';
  const brand = component.brand.toLowerCase();
  const name = component.name.toLowerCase();

  // Must contain brand name (with fuzzy matching for typos)
  const brandInTitle = title.includes(brand);
  const brandInDesc = description.includes(brand);

  if (!brandInTitle && !brandInDesc) {
    return false;
  }

  // Filter out obvious non-headphone/IEM items first
  const audioKeywords = ['headphone', 'headset', 'earphone', 'iem', 'in-ear', 'monitor', 'earbud', 'amplifier', 'amp', 'dac', 'preamp'];
  const hasAudioKeyword = audioKeywords.some(keyword =>
    title.includes(keyword) || description.includes(keyword)
  );

  // Exclude instruments, accessories, and non-audio gear (keep amps, DACs, combos)
  const excludeKeywords = [
    // Musical instruments
    'guitar', 'bass', 'drum', 'keyboard', 'piano', 'synth', 'violin', 'trumpet', 'saxophone',
    'ukulele', 'banjo', 'mandolin', 'cello', 'flute', 'clarinet', 'trombone', 'pedal',
    // Accessories and non-audio gear
    'microphone', 'mic', 'speaker', 'cable', 'adapter', 'stand', 'case', 'mixer', 'tuner',
    'strap', 'pick', 'string', 'reed', 'bow', 'valve', 'mouthpiece'
  ];
  const hasExcludeKeyword = excludeKeywords.some(keyword => title.includes(keyword));

  if (!hasAudioKeyword || hasExcludeKeyword) {
    return false;
  }

  // CRITICAL: Require model-specific validation, never allow brand-only matches
  // This prevents "Sennheiser HD 650" from matching "Sennheiser Momentum"

  // Check for exact model name match first (most reliable)
  const modelVariations = [
    name,
    name.replace(/\s+/g, ''),
    name.replace(/-/g, ' '),
    name.replace(/\s+/g, '-'),
  ];

  const hasExactModelMatch = modelVariations.some(variation =>
    title.includes(variation.toLowerCase()) || description.includes(variation.toLowerCase())
  );

  if (hasExactModelMatch) return true;

  // Fuzzy matching: Calculate similarity between full model name and title
  const MIN_SIMILARITY = 0.80; // Require 80%+ similarity to prevent false matches

  // Extract potential model names from title (alphanumeric patterns)
  const titleWords = title.split(/\s+/);
  for (const titleWord of titleWords) {
    for (const modelVariation of modelVariations) {
      const similarity = stringSimilarity(titleWord, modelVariation);
      if (similarity >= MIN_SIMILARITY) {
        return true;
      }
    }
  }

  // Word-based matching: Require majority of model words to match
  const modelWords = name.split(/[\s\-\/]+/).filter(word => word.length > 2 && !/^\d{4}$/.test(word));

  // If no significant model words, reject to prevent brand-only matches
  if (modelWords.length === 0) return false;

  const matchedWords = modelWords.filter(word => {
    // Exact substring match
    if (title.includes(word.toLowerCase())) return true;

    // Fuzzy match against title words
    const titleWords = title.split(/\s+/);
    return titleWords.some(titleWord => stringSimilarity(word.toLowerCase(), titleWord) > 0.80);
  });

  // Require at least 50% of model words to match for multi-word models
  // Or all words for single/two-word models
  const requiredMatches = modelWords.length <= 2 ? modelWords.length : Math.ceil(modelWords.length * 0.5);

  return matchedWords.length >= requiredMatches;
}

/**
 * Transform Reverb listing data to our UsedListing format
 */
function transformReverbListing(listing, component) {
  // Use shared price parser
  const price = parseReverbPrice(listing.price);

  // Use shared condition mapper
  const condition = mapCondition(listing.condition?.slug || listing.condition || 'good', 'reverb');

  // Use shared price validator
  const priceValidation = validatePriceReasonable(
    price,
    component.price_used_min,
    component.price_used_max
  );
  
  // Extract location from seller info
  let location = 'Unknown';
  if (listing.seller?.location?.region && listing.seller?.location?.country_code) {
    location = `${listing.seller.location.region}, ${listing.seller.location.country_code}`;
  }
  
  return {
    component_id: component.id,
    title: listing.title || 'Reverb Listing',
    price: price,
    condition: condition,
    location: location,
    source: 'reverb',
    url: listing._links?.web?.href || `https://reverb.com/item/${listing.id}`,
    date_posted: listing.created_at || new Date().toISOString(),
    seller_username: listing.seller?.username || 'Unknown',
    seller_confirmed_trades: 0, // Reverb doesn't expose trade counts in API
    seller_feedback_score: parseInt(listing.seller?.feedback_count || 0),
    seller_feedback_percentage: parseFloat(listing.seller?.feedback_positive_percentage || 0),
    images: listing.photos ? listing.photos.slice(0, 5).map(photo => photo._links?.large?.href).filter(Boolean) : [],
    description: listing.description || null,
    is_active: listing.state?.slug === 'live',
    status: listing.state?.slug === 'live' ? 'available' :
            listing.state?.slug === 'sold' ? 'sold' :
            listing.state?.slug === 'ended' ? 'expired' : 'removed',
    price_is_reasonable: priceValidation.isReasonable,
    price_variance_percentage: priceValidation.variance,
    price_warning: priceValidation.warning,
    // Reverb-specific fields (useful for users)
    shipping_cost: parseFloat(listing.shipping?.initial || 0),
    accepts_offers: listing.offers_enabled === true,
    listing_type: 'buy_it_now' // Reverb is primarily fixed-price
  };
}

/**
 * Map Reverb condition slugs to our standard conditions
 */
function mapReverbCondition(reverbCondition) {
  const conditionMap = {
    'mint': 'excellent',
    'excellent': 'excellent',
    'very-good': 'very_good',
    'good': 'good',
    'fair': 'fair',
    'poor': 'parts_only',
    'non-functioning': 'parts_only'
  };
  
  return conditionMap[reverbCondition] || 'good';
}

/**
 * Save Reverb listings to database
 * @param {Array} listings - Listings to save
 * @param {Set} processedUrls - Set of already processed URLs (for tracking in memory)
 * @returns {number} - Number of new listings saved
 */
async function saveReverbListings(listings, processedUrls) {
  if (listings.length === 0) return 0;

  let newListingsSaved = 0;
  let skippedInMemory = 0;
  let skippedInDatabase = 0;

  for (const listing of listings) {
    try {
      // First check in-memory cache (fast)
      if (processedUrls.has(listing.url)) {
        skippedInMemory++;
        continue;
      }

      // Check if this exact listing already exists in database (by URL)
      const { data: existing } = await supabase
        .from('used_listings')
        .select('id')
        .eq('url', listing.url)
        .single();

      if (existing) {
        // Mark as processed to avoid future database checks
        processedUrls.add(listing.url);
        skippedInDatabase++;
        continue;
      }

      // Insert new listing
      const { error } = await supabase
        .from('used_listings')
        .insert([listing]);

      if (error) {
        console.error(`❌ Error saving listing "${listing.title}":`, error.message);
      } else {
        console.log(`✅ Saved: ${listing.title.substring(0, 60)}... - $${listing.price}`);
        processedUrls.add(listing.url);
        newListingsSaved++;
      }

    } catch (err) {
      console.error(`❌ Exception saving listing:`, err.message);
    }
  }

  // Log summary if we skipped any
  if (skippedInMemory > 0 || skippedInDatabase > 0) {
    console.log(`⏭️  Skipped ${skippedInMemory + skippedInDatabase} duplicates (${skippedInMemory} cached, ${skippedInDatabase} in DB)`);
  }

  return newListingsSaved;
}

/**
 * Process all components for Reverb listings (headphones, IEMs, DACs, amps, combos)
 */
async function processAllComponents() {
  console.log('🚀 Starting Reverb integration for all audio components...\n');

  try {
    // Get all audio components (headphones, IEMs, DACs, amps, combos)
    const { data: components, error } = await supabase
      .from('components')
      .select('id, name, brand, category, price_used_min, price_used_max')
      .in('category', ['cans', 'iems', 'dac', 'amp', 'combo'])
      .order('brand, name');

    if (error) {
      console.error('❌ Error fetching components:', error);
      return;
    }

    console.log(`📋 Processing ${components.length} audio components (headphones, IEMs, DACs, amps, combos)...\n`);

    // Track processed URLs in memory to avoid redundant database checks
    const processedUrls = new Set();
    let totalListingsFound = 0;
    let totalListingsSaved = 0;

    for (const [index, component] of components.entries()) {
      console.log(`\n--- Processing ${index + 1}/${components.length}: ${component.brand} ${component.name} ---`);

      const reverbListings = await searchReverbForComponent(component);
      totalListingsFound += reverbListings.length;

      if (reverbListings.length > 0) {
        const savedCount = await saveReverbListings(reverbListings, processedUrls);
        totalListingsSaved += savedCount;
      }

      // Rate limiting: respect Reverb API limits
      await new Promise(resolve => setTimeout(resolve, REVERB_CONFIG.rateLimit));
    }

    console.log(`\n🎉 Reverb integration complete!`);
    console.log(`   📊 Found ${totalListingsFound} total listings`);
    console.log(`   ✅ Saved ${totalListingsSaved} new listings`);
    console.log(`   ⏭️  Skipped ${totalListingsFound - totalListingsSaved} duplicates`);
    console.log(`   🗂️  Cached ${processedUrls.size} unique URLs in memory`);

  } catch (error) {
    console.error('❌ Error in processAllComponents:', error);
  }
}

/**
 * Get Reverb API status and rate limit info
 */
async function getReverbApiStatus() {
  if (!process.env.REVERB_API_TOKEN) {
    console.log('⚠️ REVERB_API_TOKEN not set');
    return;
  }
  
  try {
    const response = await fetch(`${REVERB_CONFIG.apiUrl}/my/account`, {
      headers: REVERB_CONFIG.headers
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('✅ Reverb API connection successful');
      console.log(`User: ${data.display_name || 'Unknown'}`);
      
      // Check rate limits from headers
      const remaining = response.headers.get('X-RateLimit-Remaining');
      const limit = response.headers.get('X-RateLimit-Limit');
      if (remaining && limit) {
        console.log(`Rate limit: ${remaining}/${limit} remaining`);
      }
    } else {
      console.error(`❌ Reverb API error: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.error('❌ Error checking Reverb API status:', error.message);
  }
}

// Main execution
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'status') {
    getReverbApiStatus();
  } else {
    processAllComponents();
  }
}

module.exports = {
  searchReverbForComponent,
  transformReverbListing,
  saveReverbListings,
  processAllComponents,
  getReverbApiStatus
};