/**
 * Test Reddit scraper with multiple popular components
 * Validates scraper is production-ready
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const redditScraper = require('./reddit-avexchange-scraper');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Test with a variety of popular components
const TEST_COMPONENTS = [
  { brand: 'Sennheiser', name: 'HD 600' },
  { brand: 'Sennheiser', name: 'HD 650' },
  { brand: 'Audio-Technica', name: 'ATH-M50X' },
  { brand: 'Beyerdynamic', name: 'DT 770 Pro' },
  { brand: 'Moondrop', name: 'Blessing 2' }
];

async function testRedditScraper() {
  console.log('🧪 Testing Reddit scraper with popular components...\n');

  const results = {
    totalListings: 0,
    componentResults: [],
    errors: []
  };

  for (const testComp of TEST_COMPONENTS) {
    console.log(`\n--- Testing: ${testComp.brand} ${testComp.name} ---`);

    try {
      // Find the component in database
      const { data: components, error } = await supabase
        .from('components')
        .select('id, name, brand, category, price_used_min, price_used_max')
        .eq('brand', testComp.brand)
        .ilike('name', `%${testComp.name}%`)
        .limit(1);

      if (error || !components || components.length === 0) {
        console.log(`⚠️  Component not found in database`);
        results.errors.push(`${testComp.brand} ${testComp.name}: Not in database`);
        continue;
      }

      const component = components[0];

      // Search Reddit
      const listings = await redditScraper.searchRedditForComponent(component);

      console.log(`✅ Found ${listings.length} listings`);

      if (listings.length > 0) {
        console.log(`   Sample: ${listings[0].title}`);
        console.log(`   Price: $${listings[0].price}`);
        console.log(`   Posted: ${new Date(listings[0].date_posted).toLocaleDateString()}`);
      }

      results.componentResults.push({
        component: `${testComp.brand} ${testComp.name}`,
        listingsFound: listings.length,
        success: true
      });

      results.totalListings += listings.length;

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 2500));

    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      results.errors.push(`${testComp.brand} ${testComp.name}: ${error.message}`);
      results.componentResults.push({
        component: `${testComp.brand} ${testComp.name}`,
        listingsFound: 0,
        success: false,
        error: error.message
      });
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total listings found: ${results.totalListings}`);
  console.log(`Components tested: ${TEST_COMPONENTS.length}`);
  console.log(`Successful: ${results.componentResults.filter(r => r.success).length}`);
  console.log(`Failed: ${results.componentResults.filter(r => !r.success).length}`);

  console.log('\n📋 Component Results:');
  results.componentResults.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`${status} ${result.component}: ${result.listingsFound} listings`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  });

  if (results.totalListings > 0) {
    console.log('\n✅ Reddit scraper is working! Ready for production use.');
    console.log('\nNext steps:');
    console.log('1. Run full scrape: node scripts/reddit-avexchange-scraper.js');
    console.log('2. Check used_listings table in Supabase');
    console.log('3. View listings on recommendations page');
  } else {
    console.log('\n⚠️  No listings found. Possible issues:');
    console.log('- Reddit API rate limiting');
    console.log('- No recent posts for these components');
    console.log('- Search time window too narrow (try expanding in config)');
  }

  return results;
}

// Run test
if (require.main === module) {
  testRedditScraper()
    .then(() => {
      console.log('\n🎉 Test complete!');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testRedditScraper };
