/**
 * Test script to verify Reddit and eBay scrapers are working
 * Tests with a single popular component before running full scrape
 */

// Load environment variables from .env.local
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');
const redditScraper = require('./reddit-avexchange-scraper');
const ebayIntegration = require('./ebay-integration');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testScrapers() {
  console.log('🧪 Testing Reddit and eBay scrapers...\n');

  try {
    // Get a popular component to test with (Sennheiser HD 6XX is a popular model)
    const { data: components, error } = await supabase
      .from('components')
      .select('id, name, brand, category, price_used_min, price_used_max')
      .eq('brand', 'Sennheiser')
      .ilike('name', '%HD%6%')
      .limit(1);

    if (error) {
      console.error('❌ Error fetching test component:', error);
      return;
    }

    if (!components || components.length === 0) {
      console.log('⚠️ No Sennheiser HD 6XX found, using first available component...');
      const { data: fallbackComponents } = await supabase
        .from('components')
        .select('id, name, brand, category, price_used_min, price_used_max')
        .eq('category', 'cans')
        .limit(1);

      if (!fallbackComponents || fallbackComponents.length === 0) {
        console.error('❌ No components found in database');
        return;
      }

      components[0] = fallbackComponents[0];
    }

    const testComponent = components[0];
    console.log(`📋 Test component: ${testComponent.brand} ${testComponent.name}\n`);

    // Test Reddit scraper
    console.log('--- Testing Reddit r/AVExchange Scraper ---');
    try {
      const redditListings = await redditScraper.searchRedditForComponent(testComponent);
      console.log(`✅ Reddit: Found ${redditListings.length} listings`);

      if (redditListings.length > 0) {
        console.log(`   Sample: ${redditListings[0].title}`);
        console.log(`   Price: $${redditListings[0].price}`);
        console.log(`   Condition: ${redditListings[0].condition}`);
      }
    } catch (error) {
      console.error(`❌ Reddit scraper error:`, error.message);
    }

    console.log('\n');

    // Test eBay integration
    console.log('--- Testing eBay Integration ---');
    try {
      const ebayListings = await ebayIntegration.searchEbayForComponent(testComponent);
      console.log(`✅ eBay: Found ${ebayListings.length} listings`);

      if (ebayListings.length > 0) {
        console.log(`   Sample: ${ebayListings[0].title}`);
        console.log(`   Price: $${ebayListings[0].price}`);
        console.log(`   Condition: ${ebayListings[0].condition}`);
      }
    } catch (error) {
      console.error(`❌ eBay integration error:`, error.message);
    }

    console.log('\n🎉 Test complete!');
    console.log('\nℹ️  If both scrapers returned listings, you can proceed with full scraping.');
    console.log('   Run: node scripts/reddit-avexchange-scraper.js');
    console.log('   Run: node scripts/ebay-integration.js');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testScrapers()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
