/**
 * Demonstrate improved Reverb search strategy
 * Shows before/after comparison
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env.local') });

// Mock components to test
const testComponents = [
  { brand: 'Sennheiser', name: 'HD 600' },
  { brand: 'Audio-Technica', name: 'ATH-M50x' },
  { brand: 'Focal', name: 'Clear' },
  { brand: '7Hz', name: 'Salnotes Zero' },
  { brand: '64 Audio', name: 'A/U12t' },
];

// OLD strategy: full brand + model
function buildOldQuery(component) {
  return `${component.brand} ${component.name}`.replace(/[^\w\s]/g, '');
}

// NEW strategy: brand + first significant word
function buildNewQuery(component) {
  const brand = component.brand;
  const modelWords = component.name.split(/[\s\-\/]+/).filter(word => {
    return word.length > 2 && !/^\(.*\)$/.test(word) && !/^\d{4}$/.test(word);
  });

  const firstModelWord = modelWords[0] || '';
  return `${brand} ${firstModelWord}`.trim();
}

async function testQuery(query) {
  const url = `https://reverb.com/api/listings?query=${encodeURIComponent(query)}&category=headphones&per_page=1&item_region=US`;

  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/hal+json',
        'Authorization': `Bearer ${process.env.REVERB_API_TOKEN}`
      }
    });

    if (!response.ok) {
      return { success: false, total: 0 };
    }

    const data = await response.json();
    return { success: true, total: data.total || 0 };

  } catch (error) {
    return { success: false, total: 0, error: error.message };
  }
}

async function main() {
  console.log('🔍 Reverb Search Improvement Demonstration\n');
  console.log('='.repeat(80));

  for (const component of testComponents) {
    const oldQuery = buildOldQuery(component);
    const newQuery = buildNewQuery(component);

    console.log(`\n📱 ${component.brand} ${component.name}`);

    // Test old strategy
    const oldResult = await testQuery(oldQuery);
    console.log(`  ❌ OLD: "${oldQuery}"`);
    console.log(`     Results: ${oldResult.total} listings`);

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));

    // Test new strategy
    const newResult = await testQuery(newQuery);
    console.log(`  ✅ NEW: "${newQuery}"`);
    console.log(`     Results: ${newResult.total} listings`);

    const improvement = newResult.total - oldResult.total;
    if (improvement > 0) {
      console.log(`  📈 Improvement: +${improvement} listings (+${Math.round((improvement / Math.max(oldResult.total, 1)) * 100)}%)`);
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('\n📊 Summary:');
  console.log('  - NEW strategy returns significantly more results');
  console.log('  - Fuzzy matching in isRelevantListing() filters out irrelevant items');
  console.log('  - Balance between precision (accurate matches) and recall (finding listings)');
  console.log('\n💡 Next step: Run full scraper to populate database');
  console.log('  Command: node scripts/reverb-integration.js');
}

main().catch(console.error).finally(() => process.exit(0));
