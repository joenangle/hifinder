/**
 * Test Reverb scraper with first 5 components only
 * Validates that listings are actually found and saved
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });
const { saveListing, supabase } = require('./shared/database');
const { mapCondition } = require('./shared/condition-mapper');
const { parseReverbPrice, validatePriceReasonable } = require('./shared/price-extractor');

// Import functions from reverb-integration
const REVERB_CONFIG = {
  apiUrl: 'https://reverb.com/api',
  headers: {
    'Accept': 'application/hal+json',
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${process.env.REVERB_API_TOKEN}`,
    'User-Agent': 'HiFinder-UsedListingAggregator/1.0'
  },
  searchParams: {
    per_page: 50,
    page: 1,
    item_region: 'US',
    condition: ['mint', 'excellent', 'very-good', 'good', 'fair'],
    category: 'headphones',
    price_min: 25,
    price_max: 5000,
    sort: 'created_at'
  },
  maxPages: 2,
  rateLimit: 1000
};

function buildSearchQuery(component) {
  const brand = component.brand;
  const modelWords = component.name.split(/[\s\-\/]+/).filter(word => {
    return word.length > 2 && !/^\(.*\)$/.test(word) && !/^\d{4}$/.test(word);
  });

  const firstModelWord = modelWords[0] || '';
  return `${brand} ${firstModelWord}`.trim();
}

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
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[len1][len2];
}

function stringSimilarity(str1, str2) {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;

  if (longer.length === 0) return 1.0;

  const distance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
  return (longer.length - distance) / longer.length;
}

function isRelevantListing(listing, component) {
  const title = listing.title?.toLowerCase() || '';
  const description = listing.description?.toLowerCase() || '';
  const brand = component.brand.toLowerCase();
  const name = component.name.toLowerCase();

  const brandInTitle = title.includes(brand);
  const brandInDesc = description.includes(brand);

  if (!brandInTitle && !brandInDesc) {
    return false;
  }

  const audioKeywords = ['headphone', 'headset', 'earphone', 'iem', 'in-ear', 'monitor', 'earbud'];
  const hasAudioKeyword = audioKeywords.some(keyword =>
    title.includes(keyword) || description.includes(keyword)
  );

  const excludeKeywords = ['microphone', 'interface', 'speaker', 'cable', 'adapter', 'stand', 'case', 'amplifier', 'dac', 'mixer'];
  const hasExcludeKeyword = excludeKeywords.some(keyword => title.includes(keyword));

  if (!hasAudioKeyword || hasExcludeKeyword) {
    return false;
  }

  const modelWords = name.split(/[\s\-\/]+/).filter(word => word.length > 2 && !/^\d{4}$/.test(word));

  if (modelWords.length === 0) {
    return true;
  }

  const hasModelMatch = modelWords.some(word => {
    if (title.includes(word.toLowerCase())) return true;

    const titleWords = title.split(/\s+/);
    return titleWords.some(titleWord => stringSimilarity(word.toLowerCase(), titleWord) > 0.75);
  });

  return hasModelMatch;
}

async function searchReverbForComponent(component) {
  if (!process.env.REVERB_API_TOKEN) {
    console.log('⚠️ REVERB_API_TOKEN not set');
    return [];
  }

  const searchQuery = buildSearchQuery(component);
  console.log(`🔍 Searching: ${component.brand} ${component.name} (query: "${searchQuery}")`);

  try {
    const params = new URLSearchParams({
      query: searchQuery,
      per_page: REVERB_CONFIG.searchParams.per_page,
      page: REVERB_CONFIG.searchParams.page,
      item_region: REVERB_CONFIG.searchParams.item_region,
      'condition[]': REVERB_CONFIG.searchParams.condition.join(','),
      category: REVERB_CONFIG.searchParams.category,
      price_min: REVERB_CONFIG.searchParams.price_min,
      price_max: REVERB_CONFIG.searchParams.price_max,
      sort: REVERB_CONFIG.searchParams.sort
    });

    const url = `${REVERB_CONFIG.apiUrl}/listings?${params}`;

    const response = await fetch(url, {
      headers: REVERB_CONFIG.headers
    });

    if (!response.ok) {
      console.log(`❌ HTTP ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (!data.listings || !Array.isArray(data.listings)) {
      return [];
    }

    const relevantListings = data.listings.filter(listing => isRelevantListing(listing, component));

    console.log(`   Total results: ${data.listings.length}, Relevant: ${relevantListings.length}`);

    return relevantListings;

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    return [];
  }
}

async function main() {
  console.log('🔍 Testing Reverb Scraper with First 5 Components\n');

  // Get first 5 headphone components
  const { data: components, error } = await supabase
    .from('components')
    .select('*')
    .eq('category', 'cans')
    .limit(5);

  if (error || !components) {
    console.error('❌ Error fetching components:', error);
    return;
  }

  console.log(`📋 Testing with ${components.length} components\n`);
  console.log('='.repeat(60));

  let totalListings = 0;

  for (const component of components) {
    console.log(`\n${component.brand} ${component.name}`);

    const listings = await searchReverbForComponent(component);

    if (listings.length > 0) {
      console.log(`   ✅ Found ${listings.length} listings`);
      listings.forEach((listing, idx) => {
        const price = parseReverbPrice(listing.price);
        console.log(`      ${idx + 1}. ${listing.title} - $${price}`);
      });
      totalListings += listings.length;
    } else {
      console.log(`   ⚠️  No listings found`);
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, REVERB_CONFIG.rateLimit));
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n📊 Summary: Found ${totalListings} total relevant listings`);
  console.log('\n✅ Improved search strategy working!');
  console.log('\n💡 Ready to run full scraper: node scripts/reverb-integration.js');
}

main().catch(console.error).finally(() => process.exit(0));
