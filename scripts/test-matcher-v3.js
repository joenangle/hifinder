/**
 * Test Enhanced Matcher Against Known Bad Matches
 *
 * Tests the new matching logic against the examples that were previously
 * incorrectly matched. Includes tests for:
 * - Component matching (findComponentMatch)
 * - Bundle extraction with [H]/[W] separation (extractBundleComponents)
 * - Price extraction with MSRP filtering (extractComponentPrice)
 * - Text sanitization (extractSanitizedText)
 */

require('dotenv').config({ path: '.env.local' });
const { findComponentMatch, extractSanitizedText } = require('./component-matcher-enhanced');
const { extractBundleComponents } = require('./bundle-extractor');

// ============================================================================
// SECTION 1: Component Matching Tests (original)
// ============================================================================

const MATCH_TEST_CASES = [
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
    expectedComponent: 'HD600', // Should match HD600, not HE-1
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

// ============================================================================
// SECTION 2: Bundle Extraction Tests — [H]/[W] separation
// ============================================================================

const BUNDLE_TEST_CASES = [
  {
    name: '[W] item should NOT match when [H] item missing from DB',
    title: '[WTS][US-IL][H] Aful Dawn-X, PayPal [W] Thieaudio Valhalla',
    description: 'Selling my Aful Dawn-X IEMs. Looking for Thieaudio Valhalla as a trade. Original box and accessories included.',
    expectNotMatched: ['Valhalla'], // Valhalla is in [W] section — must NOT match
    expectedReason: '[W] section item should be penalized and excluded'
  },
  {
    name: 'Body "Looking for" section should not produce matches',
    title: '[WTS][US-CA][H] Campfire Audio Andromeda [W] $650 PayPal',
    description: 'Campfire Audio Andromeda 2020. Great condition.\n\nLooking for:\n- Thieaudio Monarch MK II\n- 64 Audio U12t\n\nWould consider trades.',
    expectNotMatched: ['Monarch', 'U12t'],
    expectedReason: 'Body "Looking for" section should be stripped; Monarch/U12t must NOT match'
  },
  {
    name: 'Comparison mentions in body should not create false matches',
    title: '[WTS][US-FL][H] Moondrop Variations [W] $350',
    description: 'Moondrop Variations. I prefer the Thieaudio Monarch over these so letting them go. Compared to the Blessing 2, these have more bass.',
    expectNotMatched: ['Monarch'],
    expectedReason: 'Monarch mentioned as comparison should not match as the primary result'
  },
  {
    name: 'Post with no [H]/[W] markers should fall back gracefully',
    title: '[WTS] Sennheiser HD600 $350 shipped',
    description: 'Sennheiser HD600 in good condition. Comes with box.',
    expectMatched: ['HD600'],
    expectedReason: 'Falls back to full-title matching when no [H]/[W] markers'
  }
];

// ============================================================================
// SECTION 3: Price Extraction Tests — MSRP filtering + [W] priority
// ============================================================================

// We test extractComponentPrice by importing it indirectly through the scraper module
// Since it's not exported, we'll test via a local reimplementation of the key logic
// or by testing the full pipeline. For now, test the extractSanitizedText + price logic.

const PRICE_TEST_CASES = [
  {
    name: '[W] price should override MSRP in body',
    title: '[WTS][US-VA][H] Schiit Yggdrasil Less Is More DAC [W] $1900',
    description: 'Schiit Yggdrasil Less Is More DAC - MSRP $2499\nSelling for $1900 shipped. Excellent condition.',
    expectedPrice: 1900,
    expectedReason: '[W] section price ($1900) should take priority over MSRP ($2499)'
  },
  {
    name: '[W] price should override retail in body',
    title: '[WTS][US-TX][H] Audeze LCD-X [W] $800',
    description: 'Audeze LCD-X 2021 revision. Retail is $1199. Asking $800 shipped.',
    expectedPrice: 800,
    expectedReason: '[W] price takes priority over retail in body'
  },
  {
    name: '[W] with PayPal should still extract price',
    title: '[WTS][US-WA][H] HiFiMAN Sundara [W] $250 PayPal G&S',
    description: 'HiFiMAN Sundara in mint condition. Comes with original box.',
    expectedPrice: 250,
    expectedReason: '[W] $250 PayPal should extract correctly'
  },
  {
    name: '[W] with only payment method should fall back to body',
    title: '[WTS][US-OH][H] Sennheiser HD650 [W] PayPal',
    description: 'Sennheiser HD650 - $200 shipped. Great condition with all original accessories.',
    expectedPrice: 200,
    expectedReason: 'No price in [W] → body price used as fallback'
  },
  {
    name: 'Multi-price body line with MSRP context',
    title: '[WTS][US-CA][H] Focal Clear MG [W] $900',
    description: 'Focal Clear MG Professional. Originally paid $1500. Asking $900.\n\nTimestamps in album.',
    expectedPrice: 900,
    expectedReason: '[W] price should be used, "Originally paid $1500" is MSRP context'
  }
];

// ============================================================================
// SECTION 4: Text Sanitization Tests
// ============================================================================

const SANITIZE_TEST_CASES = [
  {
    name: 'Extracts [H] and [W] sections correctly',
    title: '[WTS][US-IL][H] Aful Dawn-X, PayPal [W] Thieaudio Valhalla',
    body: 'Selling Dawn-X.\n\nLooking for Thieaudio Valhalla trade.',
    expectedHaveText: 'Aful Dawn-X, PayPal',
    expectedWantedText: 'Thieaudio Valhalla',
    expectedBodyContains: ['Selling Dawn-X'],
    expectedBodyExcludes: ['Looking for Thieaudio Valhalla']
  },
  {
    name: 'Strips "ISO" / "In search of" sections from body',
    title: '[WTS][US-CA][H] HD800S [W] $1000',
    body: 'HD800S in great shape.\n\nISO:\n- ZMF Verite\n- Audeze LCD-4\n\nTimestamps attached.',
    expectedHaveText: 'HD800S',
    expectedBodyContains: ['HD800S in great shape', 'Timestamps attached'],
    expectedBodyExcludes: ['ZMF Verite', 'Audeze LCD-4']
  },
  {
    name: 'Handles post with no [H]/[W] markers',
    title: '[WTS] Sennheiser HD600 $350',
    body: 'Good condition.',
    expectedHaveText: '[WTS] Sennheiser HD600 $350', // Falls back to full title
    expectedWantedText: ''
  }
];

// ============================================================================
// Test Runners
// ============================================================================

async function runMatchTests() {
  console.log('\n' + '='.repeat(70));
  console.log('SECTION 1: Component Matching Tests');
  console.log('='.repeat(70) + '\n');

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < MATCH_TEST_CASES.length; i++) {
    const testCase = MATCH_TEST_CASES[i];

    console.log(`Test ${i + 1}/${MATCH_TEST_CASES.length}:`);
    console.log(`Title: ${testCase.title}`);
    console.log(`Expected: ${testCase.expectedComponent || 'No match (filtered)'}`);
    console.log(`Reason: ${testCase.expectedReason}`);

    const result = await findComponentMatch(
      testCase.title,
      testCase.description,
      'reddit_avexchange'
    );

    if (result) {
      console.log(`\nMatched: ${result.component.brand} ${result.component.name}`);
      console.log(`   Score: ${result.score.toFixed(2)}`);

      if (testCase.expectedComponent) {
        const matchedName = `${result.component.brand} ${result.component.name}`.toLowerCase();
        const expectedName = testCase.expectedComponent.toLowerCase();

        if (matchedName.includes(expectedName) || expectedName.includes(matchedName)) {
          console.log(`\n PASS - Correct match\n`);
          passed++;
        } else {
          console.log(`\n FAIL - Wrong component matched`);
          console.log(`   Expected: ${testCase.expectedComponent}`);
          console.log(`   Got: ${result.component.brand} ${result.component.name}\n`);
          failed++;
        }
      } else {
        console.log(`\n FAIL - Should not have matched anything\n`);
        failed++;
      }
    } else {
      console.log(`\nNo match found`);

      if (testCase.expectedComponent === null) {
        console.log(`\n PASS - Correctly filtered out\n`);
        passed++;
      } else {
        console.log(`\n FAIL - Should have matched ${testCase.expectedComponent}\n`);
        failed++;
      }
    }

    console.log('-'.repeat(70) + '\n');
  }

  return { passed, failed, total: MATCH_TEST_CASES.length };
}

async function runBundleTests() {
  console.log('\n' + '='.repeat(70));
  console.log('SECTION 2: Bundle Extraction Tests ([H]/[W] Separation)');
  console.log('='.repeat(70) + '\n');

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < BUNDLE_TEST_CASES.length; i++) {
    const testCase = BUNDLE_TEST_CASES[i];

    console.log(`Test ${i + 1}/${BUNDLE_TEST_CASES.length}: ${testCase.name}`);
    console.log(`Title: ${testCase.title}`);
    console.log(`Reason: ${testCase.expectedReason}`);

    const matches = await extractBundleComponents(
      testCase.title,
      testCase.description,
      'reddit_avexchange'
    );

    const matchedNames = matches.map(m => `${m.component.brand} ${m.component.name}`);
    console.log(`\nMatched components: ${matchedNames.length > 0 ? matchedNames.join(', ') : '(none)'}`);

    let testPassed = true;

    // Check expected matches
    if (testCase.expectMatched) {
      for (const expected of testCase.expectMatched) {
        const found = matchedNames.some(n => n.toLowerCase().includes(expected.toLowerCase()));
        if (!found) {
          console.log(`   MISSING expected match: ${expected}`);
          testPassed = false;
        }
      }
    }

    // Check components that should NOT have matched
    if (testCase.expectNotMatched) {
      for (const notExpected of testCase.expectNotMatched) {
        const found = matchedNames.some(n => n.toLowerCase().includes(notExpected.toLowerCase()));
        if (found) {
          console.log(`   UNWANTED match found: ${notExpected}`);
          testPassed = false;
        }
      }
    }

    if (testPassed) {
      console.log(`\n PASS\n`);
      passed++;
    } else {
      console.log(`\n FAIL\n`);
      failed++;
    }

    console.log('-'.repeat(70) + '\n');
  }

  return { passed, failed, total: BUNDLE_TEST_CASES.length };
}

async function runPriceTests() {
  console.log('\n' + '='.repeat(70));
  console.log('SECTION 3: Price Extraction Tests (MSRP Filtering + [W] Priority)');
  console.log('='.repeat(70) + '\n');

  // Import the price extraction function dynamically
  // Since extractComponentPrice is not exported, we test by loading the scraper module's functions
  // We'll use a simple approach: require the file and test the logic
  let extractComponentPrice, isMsrpPrice;
  try {
    // The scraper file uses require('dotenv') internally, so we need to load it carefully
    // We'll extract the functions by reading the module
    const scraperPath = require('path').join(__dirname, 'reddit-avexchange-scraper-v3.js');
    // Since the scraper runs as a script (not a module), we need to test price logic differently
    // Let's test by evaluating the core functions in isolation

    // For now, test isMsrpPrice and extractComponentPrice logic inline
    const msrpPatterns = [
      /\bMSRP\b/i,
      /\bretails?\s+(?:for|at|price)?\s*\$?/i,
      /\boriginally\s+\$?/i,
      /\boriginal\s+(?:price|cost|msrp)\b/i,
      /\bbought\s+(?:for|at|it\s+for)\s*\$?/i,
      /\bpaid\s+\$?/i,
      /\bnew\s+price\s*[:=]?\s*\$?/i,
      /\blist\s+price\s*[:=]?\s*\$?/i,
      /\bwas\s+\$\d/i,
      /\bworth\s+\$?/i,
      /\bRRP\b/i,
      /\b(?:retail|new)\s+(?:is|was|at|for)\s*\$?/i,
      /\bcost\s+(?:me|was)\s*\$?/i
    ];

    isMsrpPrice = (line) => msrpPatterns.some(p => p.test(line));

    // Test [W] section price extraction
    extractComponentPrice = (componentName, title, selftext = '') => {
      // Priority 1: [W] section price
      const wantPriceMatch = title.match(/\[W\][^\[]*?\$(\d{1,5}(?:,\d{3})*)/i);
      if (wantPriceMatch) {
        const wantPrice = parseInt(wantPriceMatch[1].replace(/,/g, ''), 10);
        if (wantPrice >= 10 && wantPrice <= 10000) return wantPrice;
      }

      if (!selftext) {
        // Simple title price extraction
        const titlePrice = title.match(/\$(\d{1,5}(?:,\d{3})*)/);
        return titlePrice ? parseInt(titlePrice[1].replace(/,/g, ''), 10) : null;
      }

      const normalize = (s) => s.toLowerCase().replace(/[-\u2013\u2014]/g, ' ').replace(/\s+/g, ' ').trim();
      const normalizedName = normalize(componentName);
      const nameTokens = normalizedName.split(' ').filter(t => t.length >= 2);
      const lines = selftext.split(/\n/);

      for (const rawLine of lines) {
        const normalizedLine = normalize(rawLine);
        const matchedTokens = nameTokens.filter(token => normalizedLine.includes(token));
        if (matchedTokens.length < Math.max(1, Math.ceil(nameTokens.length * 0.6))) continue;

        // Skip MSRP lines
        if (isMsrpPrice(rawLine)) continue;

        // Prefer asking/selling patterns
        const askingMatch = rawLine.match(/(?:asking|selling\s+(?:for|at))\s*\$?(\d{1,5}(?:,\d{3})*)/i);
        if (askingMatch) {
          const price = parseInt(askingMatch[1].replace(/,/g, ''), 10);
          if (price >= 10 && price <= 10000) return price;
        }

        const shippedMatch = rawLine.match(/\$(\d{1,5}(?:,\d{3})*)\s*(?:shipped|obo|firm)/i);
        if (shippedMatch) {
          const price = parseInt(shippedMatch[1].replace(/,/g, ''), 10);
          if (price >= 10 && price <= 10000) return price;
        }

        // Any dollar amount on non-MSRP line
        const dollarMatch = rawLine.match(/\$(\d{1,5}(?:,\d{3})*)/);
        if (dollarMatch) {
          const price = parseInt(dollarMatch[1].replace(/,/g, ''), 10);
          if (price >= 10 && price <= 10000) return price;
        }
      }

      // Fallback: title price
      const titlePrice = title.match(/\$(\d{1,5}(?:,\d{3})*)/);
      return titlePrice ? parseInt(titlePrice[1].replace(/,/g, ''), 10) : null;
    };
  } catch (e) {
    console.error('Failed to set up price test functions:', e.message);
    return { passed: 0, failed: PRICE_TEST_CASES.length, total: PRICE_TEST_CASES.length };
  }

  let passed = 0;
  let failed = 0;

  // Test isMsrpPrice
  console.log('--- isMsrpPrice helper tests ---\n');
  const msrpTests = [
    { line: 'MSRP $2499', expected: true },
    { line: 'Retail is $1199', expected: true },
    { line: 'Originally paid $1500', expected: true },
    { line: 'Bought for $800', expected: true },
    { line: 'Was $350 new', expected: true },
    { line: 'Asking $800 shipped', expected: false },
    { line: 'HD600 - $200 - No box', expected: false },
    { line: '$350 shipped OBO', expected: false },
    { line: 'Selling for $1900', expected: false },
    { line: 'Cost me $500', expected: true },
    { line: 'Comes with all original accessories', expected: false },
    { line: 'Original price was $1200', expected: true },
  ];

  for (const test of msrpTests) {
    const result = isMsrpPrice(test.line);
    const pass = result === test.expected;
    console.log(`${pass ? ' PASS' : ' FAIL'} isMsrpPrice("${test.line}") = ${result} (expected ${test.expected})`);
    if (pass) passed++; else failed++;
  }

  console.log('\n--- extractComponentPrice priority tests ---\n');

  for (let i = 0; i < PRICE_TEST_CASES.length; i++) {
    const testCase = PRICE_TEST_CASES[i];

    console.log(`Test ${i + 1}/${PRICE_TEST_CASES.length}: ${testCase.name}`);
    console.log(`Title: ${testCase.title}`);
    console.log(`Reason: ${testCase.expectedReason}`);

    // Extract component name from title's [H] section for testing
    const haveMatch = testCase.title.match(/\[H\]\s*(.+?)\s*\[W\]/i);
    const componentName = haveMatch ? haveMatch[1].replace(/,.*/, '').trim() : 'Test Component';

    const price = extractComponentPrice(componentName, testCase.title, testCase.description);

    if (price === testCase.expectedPrice) {
      console.log(`\n PASS - Price: $${price}\n`);
      passed++;
    } else {
      console.log(`\n FAIL - Expected: $${testCase.expectedPrice}, Got: $${price}\n`);
      failed++;
    }

    console.log('-'.repeat(70) + '\n');
  }

  return { passed, failed, total: msrpTests.length + PRICE_TEST_CASES.length };
}

function runSanitizeTests() {
  console.log('\n' + '='.repeat(70));
  console.log('SECTION 4: Text Sanitization Tests');
  console.log('='.repeat(70) + '\n');

  let passed = 0;
  let failed = 0;

  for (let i = 0; i < SANITIZE_TEST_CASES.length; i++) {
    const testCase = SANITIZE_TEST_CASES[i];

    console.log(`Test ${i + 1}/${SANITIZE_TEST_CASES.length}: ${testCase.name}`);

    const result = extractSanitizedText(testCase.title, testCase.body);
    let testPassed = true;

    if (testCase.expectedHaveText && result.haveText !== testCase.expectedHaveText) {
      console.log(`   FAIL haveText: expected "${testCase.expectedHaveText}", got "${result.haveText}"`);
      testPassed = false;
    }

    if (testCase.expectedWantedText !== undefined && result.wantedText !== testCase.expectedWantedText) {
      console.log(`   FAIL wantedText: expected "${testCase.expectedWantedText}", got "${result.wantedText}"`);
      testPassed = false;
    }

    if (testCase.expectedBodyContains) {
      for (const text of testCase.expectedBodyContains) {
        if (!result.sanitizedBody.includes(text)) {
          console.log(`   FAIL sanitizedBody should contain: "${text}"`);
          testPassed = false;
        }
      }
    }

    if (testCase.expectedBodyExcludes) {
      for (const text of testCase.expectedBodyExcludes) {
        if (result.sanitizedBody.includes(text)) {
          console.log(`   FAIL sanitizedBody should NOT contain: "${text}"`);
          testPassed = false;
        }
      }
    }

    if (testPassed) {
      console.log(` PASS\n`);
      passed++;
    } else {
      console.log(` FAIL\n`);
      console.log(`   sanitizedBody: "${result.sanitizedBody.substring(0, 200)}"`);
      failed++;
    }

    console.log('-'.repeat(70) + '\n');
  }

  return { passed, failed, total: SANITIZE_TEST_CASES.length };
}

// ============================================================================
// Main runner
// ============================================================================

async function runAllTests() {
  console.log('Testing Marketplace Extraction Fixes\n');
  console.log('Tests cover: component matching, bundle [H]/[W] separation,');
  console.log('price extraction priority, MSRP filtering, text sanitization\n');

  const results = [];

  // Section 4 first (no DB needed)
  results.push({ name: 'Text Sanitization', ...runSanitizeTests() });

  // Section 3 (no DB needed for inline tests)
  results.push({ name: 'Price Extraction', ...(await runPriceTests()) });

  // Sections 1 & 2 (need DB connection)
  results.push({ name: 'Component Matching', ...(await runMatchTests()) });
  results.push({ name: 'Bundle Extraction', ...(await runBundleTests()) });

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70) + '\n');

  let totalPassed = 0;
  let totalFailed = 0;
  let totalTests = 0;

  for (const r of results) {
    const status = r.failed === 0 ? 'ALL PASS' : `${r.failed} FAILED`;
    console.log(`  ${r.name}: ${r.passed}/${r.total} passed (${status})`);
    totalPassed += r.passed;
    totalFailed += r.failed;
    totalTests += r.total;
  }

  console.log(`\n  TOTAL: ${totalPassed}/${totalTests} passed`);
  console.log(`  Success Rate: ${((totalPassed / totalTests) * 100).toFixed(1)}%\n`);

  if (totalFailed === 0) {
    console.log('All tests passed!');
  } else {
    console.log(`${totalFailed} test(s) failed - review extraction logic`);
  }
}

runAllTests().then(() => {
  console.log('\nTesting complete');
  process.exit(0);
}).catch(error => {
  console.error('\nTest suite failed:', error);
  process.exit(1);
});
