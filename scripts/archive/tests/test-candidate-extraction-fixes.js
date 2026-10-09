/**
 * Test script for component candidate extraction fixes
 *
 * Tests the new extraction logic to ensure:
 * 1. Payment methods are removed from model fields
 * 2. Shipping terms are removed
 * 3. Reddit [H]/[W] structure is properly parsed
 * 4. Location codes are removed
 * 5. Bundle listings are detected and skipped
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const {
  extractBrand,
  extractModel,
  extractRedditHaveSection,
  isBundleListing
} = require('./component-candidate-extractor');

// Test cases
const testCases = [
  {
    name: 'Payment method removal - PayPal G&S',
    title: '[WTS][US-TX][H] Schiit Lyr 3 [W] $350 PayPal G&S',
    expectedBrand: 'Schiit',
    expectedModel: 'Lyr 3',
    shouldContainPayment: false
  },
  {
    name: 'Payment method removal - Venmo',
    title: '[WTS][US-CA][H] HiFiMAN Sundara [W] $250 Venmo',
    expectedBrand: 'Hifiman',
    expectedModel: 'Sundara',
    shouldContainPayment: false
  },
  {
    name: 'Shipping term removal - USPS shipped',
    title: '[WTS][H] Audeze LCD-X [W] $900 shipped USPS',
    expectedBrand: 'Audeze',
    expectedModel: 'LCD-X',
    shouldContainShipping: false
  },
  {
    name: 'Location code removal - US-CA',
    title: '[WTS][US-CA][H] Focal Clear [W] PayPal',
    expectedBrand: 'Focal',
    expectedModel: 'Clear',
    shouldContainLocation: false
  },
  {
    name: 'Reddit structure - [H] section only',
    title: '[WTS][US-NY][H] Sennheiser HD 800 S [W] $1200 PayPal G&S shipped',
    expectedBrand: 'Sennheiser',
    expectedModel: 'HD 800 S',
    shouldContainPayment: false,
    shouldContainShipping: false
  },
  {
    name: 'Multiple payment methods',
    title: '[WTS][H] ZMF Auteur [W] $1400 Venmo, Zelle, or PayPal',
    expectedBrand: 'Zmf',
    expectedModel: 'Auteur',
    shouldContainPayment: false
  },
  {
    name: 'Complex listing with all issues',
    title: '[WTS][USA-TX][H] Audio-Technica ATH-ADX5000 [W] $1500 PayPal G&S CONUS shipped',
    expectedBrand: 'Audio-Technica',
    expectedModel: 'ATH-ADX5000',
    shouldContainPayment: false,
    shouldContainShipping: false,
    shouldContainLocation: false
  },
  {
    name: 'Bundle detection - Multiple brands',
    title: '[WTS][H] Sennheiser HD800s, Audio-Technica ADX3000, Woo Audio Wa7 [W] PayPal',
    expectedBundle: true
  },
  {
    name: 'Bundle detection - Comma-separated items',
    title: '[WTS][H] HD 6XX, LCD-2, Lyr 3 [W] $1500',
    expectedBundle: true
  },
  {
    name: 'Not a bundle - Single item with accessories',
    title: '[WTS][H] Focal Clear with case [W] $900',
    expectedBrand: 'Focal',
    expectedModel: 'Clear',
    expectedBundle: false
  }
];

// Helper functions
function containsPayment(text) {
  if (!text) return false;
  return /\b(paypal|venmo|zelle|g&s|cashapp)\b/i.test(text);
}

function containsShipping(text) {
  if (!text) return false;
  return /\b(shipped|shipping|usps|ups|fedex|conus)\b/i.test(text);
}

function containsLocation(text) {
  if (!text) return false;
  return /\b(USA?-[A-Z]{2})\b/i.test(text);
}

// Run tests
function runTests() {
  console.log('\n🧪 Testing Component Candidate Extraction Fixes\n');
  console.log('='.repeat(70));

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const { name, title, expectedBrand, expectedModel, expectedBundle } = testCase;

    console.log(`\n📝 ${name}`);
    console.log(`   Title: "${title}"`);

    // Test bundle detection if expected
    if (expectedBundle !== undefined) {
      const isBundle = isBundleListing(title);
      if (isBundle === expectedBundle) {
        console.log(`   ✅ Bundle detection: ${isBundle} (expected: ${expectedBundle})`);
        passed++;
      } else {
        console.log(`   ❌ Bundle detection: ${isBundle} (expected: ${expectedBundle})`);
        failed++;
      }

      if (expectedBundle) {
        // Skip brand/model extraction for bundles
        continue;
      }
    }

    // Test brand extraction
    const brand = extractBrand(title);
    if (brand === expectedBrand) {
      console.log(`   ✅ Brand: "${brand}"`);
      passed++;
    } else {
      console.log(`   ❌ Brand: "${brand}" (expected: "${expectedBrand}")`);
      failed++;
    }

    // Test model extraction
    const model = brand ? extractModel(title, brand) : null;
    if (model === expectedModel) {
      console.log(`   ✅ Model: "${model}"`);
      passed++;
    } else {
      console.log(`   ❌ Model: "${model}" (expected: "${expectedModel}")`);
      failed++;
    }

    // Test contamination checks
    if (testCase.shouldContainPayment === false) {
      const hasPayment = containsPayment(brand) || containsPayment(model);
      if (!hasPayment) {
        console.log(`   ✅ No payment methods found`);
        passed++;
      } else {
        console.log(`   ❌ Payment method found in output!`);
        failed++;
      }
    }

    if (testCase.shouldContainShipping === false) {
      const hasShipping = containsShipping(brand) || containsShipping(model);
      if (!hasShipping) {
        console.log(`   ✅ No shipping terms found`);
        passed++;
      } else {
        console.log(`   ❌ Shipping term found in output!`);
        failed++;
      }
    }

    if (testCase.shouldContainLocation === false) {
      const hasLocation = containsLocation(brand) || containsLocation(model);
      if (!hasLocation) {
        console.log(`   ✅ No location codes found`);
        passed++;
      } else {
        console.log(`   ❌ Location code found in output!`);
        failed++;
      }
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 Test Results Summary');
  console.log('='.repeat(70));
  console.log(`Total tests: ${passed + failed}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success rate: ${Math.round((passed / (passed + failed)) * 100)}%\n`);

  if (failed === 0) {
    console.log('🎉 All tests passed!\n');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Please review the extraction logic.\n');
    process.exit(1);
  }
}

// Run the tests
runTests();
