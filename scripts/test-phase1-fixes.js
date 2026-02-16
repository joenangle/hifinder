#!/usr/bin/env node
/**
 * Test Phase 1 Fixes
 *
 * Tests:
 * 1. Generic name penalties (Space Audio, etc.)
 * 2. Context-aware position scoring (accessory mentions)
 * 3. Improved price extraction
 */

require('dotenv').config({ path: '.env.local' });
const { findComponentMatch } = require('./component-matcher-enhanced');

// Import extractPrice directly from scraper
const scraperPath = require('path').join(__dirname, 'reddit-avexchange-scraper-v3.js');
const fs = require('fs');
const scraperCode = fs.readFileSync(scraperPath, 'utf8');

// Extract the extractPrice function
const extractPriceMatch = scraperCode.match(/function extractPrice\(title, selftext = ''\) \{[\s\S]*?^}/m);
if (!extractPriceMatch) {
  throw new Error('Could not find extractPrice function in scraper');
}

// Create extractPrice function in global scope
eval(extractPriceMatch[0]);

// Test cases for Phase 1 fixes
const TEST_CASES = [
  // ========================================
  // TEST 1: Generic Name Penalties
  // ========================================
  {
    category: 'Generic Name Penalty',
    title: '[WTS] Penon Fan3 w Space Cable - $200',
    description: 'Includes space cable and tips',
    expectedToMatch: 'Penon Fan3', // Should match Penon Fan3, NOT Space Audio
    shouldNotMatch: 'Space Audio', // Should be rejected due to generic words + accessory context
    note: 'Space Audio should be penalized for generic "space" + "audio" words'
  },
  {
    category: 'Generic Name Penalty',
    title: '[WTS] Xenns Top Pro, Fosi Audio K7',
    description: 'Both in excellent condition',
    expectedToMatch: null, // Bundle - will match one or both
    shouldNotMatch: 'Space Audio',
    note: 'Space Audio should not match despite "Audio" in text'
  },

  // ========================================
  // TEST 2: Position Scoring
  // ========================================
  {
    category: 'Position Scoring - Title Match',
    title: '[WTS] Sennheiser HD600 - $250 shipped',
    description: 'Great condition',
    expectedToMatch: 'HD 600',
    note: 'HD600 in title should get +20% bonus'
  },
  {
    category: 'Position Scoring - Accessory Context',
    title: '[WTS] Custom cable compatible with HD600',
    description: 'Braided cable',
    expectedToMatch: null,
    shouldNotMatch: 'HD 600',
    note: 'HD600 mentioned with "with" should get -30% penalty, likely rejected'
  },

  // ========================================
  // TEST 3: Price Extraction
  // ========================================
  {
    category: 'Price Extraction',
    title: '[WTS] HD600 - $550 PayPal',
    description: '',
    expectedPrice: 550,
    note: 'Should extract $550 (Pattern 1: $XXX)'
  },
  {
    category: 'Price Extraction',
    title: '[WTS] Focal Clear MG - asking $1,200',
    description: '',
    expectedPrice: 1200,
    note: 'Should extract $1,200 (Pattern 2: asking $X,XXX)'
  },
  {
    category: 'Price Extraction',
    title: '[WTS] ZMF Verite - 800 shipped',
    description: '',
    expectedPrice: 800,
    note: 'Should extract 800 (Pattern 3: XXX shipped)'
  },
  {
    category: 'Price Extraction',
    title: '[WTS] Arya Stealth - 900 USD',
    description: '',
    expectedPrice: 900,
    note: 'Should extract 900 (Pattern 4: XXX USD)'
  },
  {
    category: 'Price Extraction',
    title: '[WTS] Audeze LCD-X',
    description: 'Asking price is $950 or best offer',
    expectedPrice: 950,
    note: 'Should extract $950 from description (Pattern 2)'
  }
];

// Price extraction test
function testPriceExtraction() {
  console.log('\n===========================================');
  console.log('PHASE 1.3: PRICE EXTRACTION TESTS');
  console.log('===========================================\n');

  let passed = 0;
  let failed = 0;

  const priceTests = TEST_CASES.filter(t => t.expectedPrice !== undefined);

  for (const test of priceTests) {
    const extractedPrice = extractPrice(test.title, test.description);

    if (extractedPrice === test.expectedPrice) {
      console.log(`✅ PASS: ${test.note}`);
      console.log(`   Title: "${test.title.substring(0, 60)}..."`);
      console.log(`   Expected: $${test.expectedPrice} | Got: $${extractedPrice}\n`);
      passed++;
    } else {
      console.log(`❌ FAIL: ${test.note}`);
      console.log(`   Title: "${test.title.substring(0, 60)}..."`);
      console.log(`   Expected: $${test.expectedPrice} | Got: $${extractedPrice}\n`);
      failed++;
    }
  }

  console.log(`Price Extraction Results: ${passed}/${priceTests.length} passed`);
  return { passed, failed, total: priceTests.length };
}

// Component matching tests
async function testComponentMatching() {
  console.log('\n===========================================');
  console.log('PHASE 1.1 & 1.2: MATCHING TESTS');
  console.log('===========================================\n');

  let passed = 0;
  let failed = 0;

  const matchTests = TEST_CASES.filter(t => t.expectedToMatch !== undefined || t.shouldNotMatch !== undefined);

  for (const test of matchTests) {
    console.log(`\nTest: ${test.category}`);
    console.log(`Title: "${test.title}"`);
    console.log(`Note: ${test.note}\n`);

    const match = await findComponentMatch(test.title, test.description, 'test');

    // Check if it should NOT match a specific component
    if (test.shouldNotMatch) {
      const matchedName = match ? match.component.name : null;
      const shouldNotMatchName = test.shouldNotMatch;

      if (!matchedName || !matchedName.toLowerCase().includes(shouldNotMatchName.toLowerCase())) {
        console.log(`✅ PASS: Correctly avoided matching "${test.shouldNotMatch}"`);
        if (match) {
          console.log(`   Matched instead: ${match.component.brand} ${match.component.name} (score: ${match.score.toFixed(2)})`);
        } else {
          console.log(`   No match found (as expected)`);
        }
        passed++;
      } else {
        console.log(`❌ FAIL: Incorrectly matched "${test.shouldNotMatch}"`);
        console.log(`   Matched: ${match.component.brand} ${match.component.name} (score: ${match.score.toFixed(2)})`);
        failed++;
      }
    }

    // Check if it should match a specific component
    if (test.expectedToMatch) {
      const matchedName = match ? match.component.name : null;

      if (matchedName && matchedName.toLowerCase().includes(test.expectedToMatch.toLowerCase())) {
        console.log(`✅ PASS: Correctly matched "${test.expectedToMatch}"`);
        console.log(`   Matched: ${match.component.brand} ${match.component.name} (score: ${match.score.toFixed(2)})`);
        passed++;
      } else if (test.expectedToMatch === null && !match) {
        console.log(`✅ PASS: Correctly returned no match`);
        passed++;
      } else {
        console.log(`❌ FAIL: Expected to match "${test.expectedToMatch}"`);
        if (match) {
          console.log(`   Got instead: ${match.component.brand} ${match.component.name} (score: ${match.score.toFixed(2)})`);
        } else {
          console.log(`   Got: No match`);
        }
        failed++;
      }
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Component Matching Results: ${passed}/${matchTests.length} passed`);
  return { passed, failed, total: matchTests.length };
}

// Run all tests
async function runTests() {
  console.log('\n');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║   PHASE 1 IMPLEMENTATION TEST SUITE        ║');
  console.log('║   Testing: Generic Penalties, Position    ║');
  console.log('║            Scoring, Price Extraction       ║');
  console.log('╚════════════════════════════════════════════╝');

  // Test price extraction (sync)
  const priceResults = testPriceExtraction();

  // Test component matching (async)
  const matchResults = await testComponentMatching();

  // Summary
  console.log('\n');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║              TEST SUMMARY                  ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');
  console.log(`Price Extraction:     ${priceResults.passed}/${priceResults.total} passed`);
  console.log(`Component Matching:   ${matchResults.passed}/${matchResults.total} passed`);
  console.log('');

  const totalPassed = priceResults.passed + matchResults.passed;
  const totalTests = priceResults.total + matchResults.total;
  const successRate = ((totalPassed / totalTests) * 100).toFixed(1);

  console.log(`Total: ${totalPassed}/${totalTests} tests passed (${successRate}%)`);
  console.log('');

  if (totalPassed === totalTests) {
    console.log('🎉 ALL TESTS PASSED! Phase 1 is working correctly.');
    console.log('✅ Ready to proceed to Phase 2: Bundle Handling');
  } else {
    console.log(`⚠️  ${totalTests - totalPassed} test(s) failed. Review implementation.`);
  }

  console.log('');
  process.exit(totalPassed === totalTests ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  console.error('Test execution failed:', error);
  process.exit(1);
});
