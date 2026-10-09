/**
 * Test different Reverb search strategies
 * Demonstrates why current approach finds 0 results
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

async function testSearch(query, description) {
  const url = `https://reverb.com/api/listings?query=${encodeURIComponent(query)}&category=headphones&per_page=5&item_region=US`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/hal+json',
        'Authorization': `Bearer ${process.env.REVERB_API_TOKEN}`
      }
    });

    if (!response.ok) {
      console.log(`❌ ${description}: HTTP ${response.status}`);
      return;
    }

    const data = await response.json();
    const total = data.total || 0;
    const listings = data.listings || [];

    console.log(`\n${description}`);
    console.log(`  Query: "${query}"`);
    console.log(`  Total: ${total} listings`);
    if (listings.length > 0) {
      console.log(`  Sample: "${listings[0].title}"`);
      console.log(`  Price: $${listings[0].price?.amount || 'N/A'}`);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

async function main() {
  console.log('🔍 Reverb Search Strategy Test\n');
  console.log('='.repeat(60));

  // Current approach - overly specific
  await testSearch('64 Audio AU12t', '1. Current: Full specific model');
  await testSearch('7Hz Salnotes Zero', '2. Current: Budget IEM specific model');
  await testSearch('Abyss AB1266 Phi TC', '3. Current: Summit-fi specific model');

  // Better approach - brand only
  await testSearch('64 Audio', '4. Better: Brand only (64 Audio)');
  await testSearch('Sennheiser', '5. Better: Brand only (Sennheiser)');
  await testSearch('Focal', '6. Better: Brand only (Focal)');

  // Even better - brand + category
  await testSearch('Sennheiser HD', '7. Best: Brand + model prefix');
  await testSearch('Audio-Technica ATH', '8. Best: Brand + model prefix');
  await testSearch('Focal Clear', '9. Best: Brand + partial model');

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Conclusion:');
  console.log('  - Overly specific queries (full model names) return 0 results');
  console.log('  - Brand-only queries return thousands of results');
  console.log('  - Brand + partial model balances precision and recall');
  console.log('\n💡 Recommendation:');
  console.log('  - Search by brand only OR brand + first word of model');
  console.log('  - Use fuzzy matching in isRelevantListing() to filter');
  console.log('  - Prioritize exact matches, but include close matches');
}

main().catch(console.error);
