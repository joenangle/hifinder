#!/usr/bin/env node
/**
 * Test Phase 2: Bundle Handling
 *
 * Tests:
 * 1. Bundle segment splitting
 * 2. Multi-component extraction
 * 3. Deduplication logic
 * 4. Bundle group ID generation
 * 5. Price calculation
 */

require('dotenv').config({ path: '.env.local' });
const {
  splitBundleSegments,
  generateBundleGroupId,
  calculateBundlePrice,
  deduplicateMatches,
  extractBundleComponents
} = require('./bundle-extractor');

console.log('\n');
console.log('╔════════════════════════════════════════════╗');
console.log('║   PHASE 2 BUNDLE HANDLING TEST SUITE      ║');
console.log('║   Testing: Bundle Extraction & Matching   ║');
console.log('╚════════════════════════════════════════════╝');

// Test 1: Bundle Segment Splitting
function testBundleSplitting() {
  console.log('\n===========================================');
  console.log('TEST 1: BUNDLE SEGMENT SPLITTING');
  console.log('===========================================\n');

  const testCases = [
    {
      input: '[WTS] HD600 + Focal Clear MG - $800',
      expected: ['HD600', 'Focal Clear MG'],
      note: 'Plus separator'
    },
    {
      input: '[WTS] HD600, Focal Clear MG, Arya - $1500',
      expected: ['HD600', 'Focal Clear MG', 'Arya'],
      note: 'Comma separator (3 items)'
    },
    {
      input: '[WTS] HD600 and Focal Clear MG',
      expected: ['HD600', 'Focal Clear MG'],
      note: 'And separator'
    },
    {
      input: '[WTS] HD600 / Focal Clear MG',
      expected: ['HD600', 'Focal Clear MG'],
      note: 'Slash separator'
    },
    {
      input: '[WTS] HD600 & Focal Clear MG',
      expected: ['HD600', 'Focal Clear MG'],
      note: 'Ampersand separator'
    },
    {
      input: '[WTS][H] HD600 + Arya [W] PayPal',
      expected: ['HD600', 'Arya'],
      note: '[H] section extraction (ignores [W])'
    },
    {
      input: '[WTS] HD600 only',
      expected: ['HD600 only'],
      note: 'Single item (no bundle)'
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of testCases) {
    const result = splitBundleSegments(test.input);
    const matches = JSON.stringify(result) === JSON.stringify(test.expected);

    if (matches) {
      console.log(`✅ PASS: ${test.note}`);
      console.log(`   Input: "${test.input}"`);
      console.log(`   Segments: [${result.map(s => `"${s}"`).join(', ')}]\n`);
      passed++;
    } else {
      console.log(`❌ FAIL: ${test.note}`);
      console.log(`   Input: "${test.input}"`);
      console.log(`   Expected: [${test.expected.map(s => `"${s}"`).join(', ')}]`);
      console.log(`   Got: [${result.map(s => `"${s}"`).join(', ')}]\n`);
      failed++;
    }
  }

  console.log(`Result: ${passed}/${testCases.length} passed`);
  return { passed, failed, total: testCases.length };
}

// Test 2: Bundle Group ID Generation
function testBundleGroupId() {
  console.log('\n===========================================');
  console.log('TEST 2: BUNDLE GROUP ID GENERATION');
  console.log('===========================================\n');

  const id1 = generateBundleGroupId();
  const id2 = generateBundleGroupId();

  console.log(`Generated ID 1: ${id1}`);
  console.log(`Generated ID 2: ${id2}`);

  const hasCorrectFormat = /^bundle_\d+_[a-z0-9]+$/.test(id1);
  const areUnique = id1 !== id2;

  if (hasCorrectFormat && areUnique) {
    console.log('\n✅ PASS: IDs have correct format and are unique');
    return { passed: 1, failed: 0, total: 1 };
  } else {
    console.log('\n❌ FAIL: ID generation issue');
    if (!hasCorrectFormat) console.log('   - Invalid format');
    if (!areUnique) console.log('   - Not unique');
    return { passed: 0, failed: 1, total: 1 };
  }
}

// Test 3: Price Calculation
function testPriceCalculation() {
  console.log('\n===========================================');
  console.log('TEST 3: BUNDLE PRICE CALCULATION');
  console.log('===========================================\n');

  const testCases = [
    {
      totalPrice: 800,
      componentCount: 2,
      componentIndex: 0,
      expected: {
        individual_price: null,
        bundle_total_price: 800,
        bundle_component_count: 2
      },
      note: 'Bundle with 2 components'
    },
    {
      totalPrice: 1500,
      componentCount: 3,
      componentIndex: 1,
      expected: {
        individual_price: null,
        bundle_total_price: 1500,
        bundle_component_count: 3
      },
      note: 'Bundle with 3 components'
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of testCases) {
    const result = calculateBundlePrice(
      test.totalPrice,
      test.componentCount,
      test.componentIndex,
      { name: 'Test Component' }
    );

    const matches =
      result.individual_price === test.expected.individual_price &&
      result.bundle_total_price === test.expected.bundle_total_price &&
      result.bundle_component_count === test.expected.bundle_component_count;

    if (matches) {
      console.log(`✅ PASS: ${test.note}`);
      console.log(`   individual_price: ${result.individual_price}`);
      console.log(`   bundle_total_price: $${result.bundle_total_price}`);
      console.log(`   bundle_component_count: ${result.bundle_component_count}\n`);
      passed++;
    } else {
      console.log(`❌ FAIL: ${test.note}`);
      console.log(`   Expected: ${JSON.stringify(test.expected)}`);
      console.log(`   Got: ${JSON.stringify(result)}\n`);
      failed++;
    }
  }

  console.log(`Result: ${passed}/${testCases.length} passed`);
  return { passed, failed, total: testCases.length };
}

// Test 4: Deduplication
function testDeduplication() {
  console.log('\n===========================================');
  console.log('TEST 4: DEDUPLICATION LOGIC');
  console.log('===========================================\n');

  // Simulate duplicate matches (same component twice)
  const mockMatches = [
    { component: { id: 'hd600-id', name: 'HD 600' }, score: 0.9, segment: 'HD600' },
    { component: { id: 'hd600-id', name: 'HD 600' }, score: 0.85, segment: 'HD 600' },
    { component: { id: 'clear-mg-id', name: 'Clear MG' }, score: 0.88, segment: 'Clear MG' }
  ];

  const result = deduplicateMatches(mockMatches);

  const hasCorrectCount = result.length === 2;
  const hd600Entry = result.find(m => m.component.id === 'hd600-id');
  const hasQuantity = hd600Entry && hd600Entry.quantity === 2;
  const clearMgEntry = result.find(m => m.component.id === 'clear-mg-id');
  const clearMgNoQuantity = clearMgEntry && !clearMgEntry.quantity;

  if (hasCorrectCount && hasQuantity && clearMgNoQuantity) {
    console.log('✅ PASS: Deduplication works correctly');
    console.log(`   Input: 3 matches (2 HD600, 1 Clear MG)`);
    console.log(`   Output: 2 unique matches`);
    console.log(`   HD600 quantity: ${hd600Entry.quantity}`);
    console.log(`   Clear MG quantity: ${clearMgEntry.quantity || 1} (implicit)\n`);
    return { passed: 1, failed: 0, total: 1 };
  } else {
    console.log('❌ FAIL: Deduplication issue');
    if (!hasCorrectCount) console.log(`   - Expected 2 results, got ${result.length}`);
    if (!hasQuantity) console.log(`   - HD600 should have quantity: 2`);
    console.log('');
    return { passed: 0, failed: 1, total: 1 };
  }
}

// Test 5: Full Bundle Extraction (async)
async function testBundleExtraction() {
  console.log('\n===========================================');
  console.log('TEST 5: FULL BUNDLE EXTRACTION');
  console.log('===========================================\n');

  console.log('Testing against live database...\n');

  const testCases = [
    {
      title: '[WTS] Sennheiser HD600',
      description: 'Great condition',
      expectedCount: 1,
      note: 'Single item (no bundle)'
    },
    {
      title: '[WTS] Sennheiser HD600 + HD650',
      description: '',
      expectedMinCount: 1, // At least one should match
      expectedMaxCount: 2, // Both might match
      note: 'Bundle with 2 Sennheiser headphones'
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of testCases) {
    try {
      const matches = await extractBundleComponents(test.title, test.description, 'test');

      let testPassed = false;
      if (test.expectedCount !== undefined) {
        testPassed = matches.length === test.expectedCount;
      } else if (test.expectedMinCount !== undefined && test.expectedMaxCount !== undefined) {
        testPassed = matches.length >= test.expectedMinCount && matches.length <= test.expectedMaxCount;
      }

      if (testPassed) {
        console.log(`✅ PASS: ${test.note}`);
        console.log(`   Title: "${test.title}"`);
        console.log(`   Matches: ${matches.length}`);
        if (matches.length > 0) {
          matches.forEach((m, i) => {
            console.log(`     ${i + 1}. ${m.component.brand} ${m.component.name} (score: ${m.score.toFixed(2)})`);
          });
        }
        console.log('');
        passed++;
      } else {
        console.log(`❌ FAIL: ${test.note}`);
        console.log(`   Title: "${test.title}"`);
        if (test.expectedCount !== undefined) {
          console.log(`   Expected: ${test.expectedCount} matches`);
        } else {
          console.log(`   Expected: ${test.expectedMinCount}-${test.expectedMaxCount} matches`);
        }
        console.log(`   Got: ${matches.length} matches\n`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ FAIL: ${test.note}`);
      console.log(`   Error: ${error.message}\n`);
      failed++;
    }
  }

  console.log(`Result: ${passed}/${testCases.length} passed`);
  return { passed, failed, total: testCases.length };
}

// Run all tests
async function runTests() {
  const results = [];

  // Synchronous tests
  results.push(testBundleSplitting());
  results.push(testBundleGroupId());
  results.push(testPriceCalculation());
  results.push(testDeduplication());

  // Async test
  results.push(await testBundleExtraction());

  // Summary
  console.log('\n');
  console.log('╔════════════════════════════════════════════╗');
  console.log('║              TEST SUMMARY                  ║');
  console.log('╚════════════════════════════════════════════╝');
  console.log('');

  let totalPassed = 0;
  let totalTests = 0;

  results.forEach((result, i) => {
    const testNames = [
      'Bundle Splitting',
      'Group ID Generation',
      'Price Calculation',
      'Deduplication',
      'Full Extraction'
    ];
    console.log(`${testNames[i]}: ${result.passed}/${result.total} passed`);
    totalPassed += result.passed;
    totalTests += result.total;
  });

  console.log('');
  const successRate = ((totalPassed / totalTests) * 100).toFixed(1);
  console.log(`Total: ${totalPassed}/${totalTests} tests passed (${successRate}%)`);
  console.log('');

  if (totalPassed === totalTests) {
    console.log('🎉 ALL TESTS PASSED! Phase 2 is working correctly.');
    console.log('✅ Ready to apply database migration.');
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
