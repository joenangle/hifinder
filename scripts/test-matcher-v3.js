/**
 * Test Enhanced Matcher Against Known Bad Matches
 *
 * Tests the new matching logic against the examples that were previously
 * incorrectly matched
 */

require('dotenv').config({ path: '.env.local' });
const { findComponentMatch } = require('./component-matcher-enhanced');

// Test cases from production issues
const TEST_CASES = [
  {
    title: '[WTS][US-MS][H] TRN BT30Pro, eartips, Juzear Flare [W] PayPal GS',
    description: 'Selling TRN BT30 Pro adapter and some eartips',
    expectedComponent: null, // Should NOT match Final Audio D8000
    expectedReason: 'Accessory-only post or wrong model'
  },
  {
    title: '[WTS][US-AMS][H] Xenns Mangird Top Pro [W] PayPal GS $425',
    description: 'Xenns Mangird Top Pro in excellent condition',
    expectedComponent: 'Xenns Mangird Top Pro', // Should match THIS, not "XENNS UP"
    expectedReason: 'Correct model match'
  },
  {
    title: '[WTS][US-CA][H] Sennheiser HD600 [W] PayPal, Local Cash',
    description: 'Sennheiser HD600 in good condition',
    expectedComponent: 'HD 600', // Should match HD600, not HE-1
    expectedReason: 'Exact model number match'
  },
  {
    title: '[WTS][US-TX][H] Final Audio E3000 Eartips (10 pairs) [W] $20 PayPal',
    description: 'Selling eartips only, no IEMs',
    expectedComponent: null, // Should NOT match any Final Audio product
    expectedReason: 'Eartips only, filtered as accessory'
  },
  {
    title: '[WTS][US-NY][H] Moondrop Blessing 2 Dusk, stock cable [W] $280',
    description: 'Blessing 2 Dusk with original accessories',
    expectedComponent: 'Blessing 2', // Should match Blessing 2
    expectedReason: 'Correct model with variant'
  }
];

/**
 * Run tests
 */
async function runTests() {
  console.log('🧪 Testing Enhanced Matcher Against Known Cases\n');
  console.log('='.repeat(70) + '\n');

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < TEST_CASES.length; i++) {
    const testCase = TEST_CASES[i];

    console.log(`Test ${i + 1}/${TEST_CASES.length}:`);
    console.log(`Title: ${testCase.title}`);
    console.log(`Expected: ${testCase.expectedComponent || 'No match (filtered)'}`);
    console.log(`Reason: ${testCase.expectedReason}`);

    const result = await findComponentMatch(
      testCase.title,
      testCase.description,
      'reddit_avexchange'
    );

    if (result) {
      console.log(`\n✅ Matched: ${result.component.brand} ${result.component.name}`);
      console.log(`   Score: ${result.score.toFixed(2)}`);
      console.log(`   Details:`, result.matchDetails);

      // Check if match is what we expected
      if (testCase.expectedComponent) {
        const matchedName = `${result.component.brand} ${result.component.name}`.toLowerCase();
        const expectedName = testCase.expectedComponent.toLowerCase();

        if (matchedName.includes(expectedName) || expectedName.includes(matchedName)) {
          console.log(`\n✅ TEST PASSED - Correct match\n`);
          passed++;
        } else {
          console.log(`\n❌ TEST FAILED - Wrong component matched`);
          console.log(`   Expected: ${testCase.expectedComponent}`);
          console.log(`   Got: ${result.component.brand} ${result.component.name}\n`);
          failed++;
        }
      } else {
        console.log(`\n❌ TEST FAILED - Should not have matched anything\n`);
        failed++;
      }
    } else {
      console.log(`\n⚠️  No match found`);

      if (testCase.expectedComponent === null) {
        console.log(`\n✅ TEST PASSED - Correctly filtered out\n`);
        passed++;
      } else {
        console.log(`\n❌ TEST FAILED - Should have matched ${testCase.expectedComponent}\n`);
        failed++;
      }
    }

    console.log('='.repeat(70) + '\n');
  }

  console.log('\n📊 Test Results:');
  console.log(`   Passed: ${passed}/${TEST_CASES.length}`);
  console.log(`   Failed: ${failed}/${TEST_CASES.length}`);
  console.log(`   Success Rate: ${((passed / TEST_CASES.length) * 100).toFixed(1)}%\n`);

  if (failed === 0) {
    console.log('🎉 All tests passed!');
  } else {
    console.log('⚠️  Some tests failed - review matching logic');
  }
}

// Run tests
runTests().then(() => {
  console.log('\n✅ Testing complete');
  process.exit(0);
}).catch(error => {
  console.error('\n❌ Test failed:', error);
  process.exit(1);
});
