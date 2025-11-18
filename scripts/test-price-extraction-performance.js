/**
 * Performance and Reliability Test Suite for Price Extraction Regex
 *
 * Tests the 6 regex patterns in reddit-avexchange-scraper-v3.js for:
 * 1. Catastrophic backtracking vulnerabilities
 * 2. Pattern overlap and redundancy
 * 3. Edge case handling
 * 4. Memory usage with large inputs
 * 5. Execution time benchmarks
 */

const { performance } = require('perf_hooks');

// Copy of the extractPrice function from scraper
function extractPrice(title, selftext = '') {
  const combinedText = title + ' ' + (selftext || '');

  const patterns = [
    /\$(\d{1,5}(?:,\d{3})*)/g,                    // $500 or $1,200
    /asking\s*\$?(\d{1,5})/gi,                    // asking $500
    /price:?\s*\$?(\d{1,5})/gi,                   // price: $500
    /selling\s*(?:for|at)?\s*\$?(\d{1,5})/gi,     // selling for $500
    /(\d{3,5})\s*shipped/gi,                      // 700 shipped
    /(\d{1,5})\s*(?:usd|dollars?)/gi              // 500 USD
  ];

  const allPrices = [];

  for (const pattern of patterns) {
    const matches = [...combinedText.matchAll(pattern)];
    if (matches.length > 0) {
      const prices = matches.map(m => parseInt(m[1].replace(/,/g, '')));
      allPrices.push(...prices);
    }
  }

  if (allPrices.length === 0) return null;

  const validPrices = allPrices.filter(p => p >= 10 && p <= 10000);
  if (validPrices.length === 0) return null;

  return Math.min(...validPrices);
}

// Test individual pattern performance
function testPatternPerformance(pattern, testString, description) {
  const iterations = 1000;
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    [...testString.matchAll(pattern)];
  }

  const end = performance.now();
  const avgTime = (end - start) / iterations;

  return {
    description,
    pattern: pattern.toString(),
    avgTimeMs: avgTime.toFixed(4),
    totalTimeMs: (end - start).toFixed(2)
  };
}

// Test for catastrophic backtracking
function testCatastrophicBacktracking() {
  console.log('\n🔍 CATASTROPHIC BACKTRACKING ANALYSIS\n');
  console.log('='.repeat(80));

  const patterns = [
    { regex: /\$(\d{1,5}(?:,\d{3})*)/g, desc: 'Basic price ($500)' },
    { regex: /asking\s*\$?(\d{1,5})/gi, desc: 'Asking price' },
    { regex: /price:?\s*\$?(\d{1,5})/gi, desc: 'Price label' },
    { regex: /selling\s*(?:for|at)?\s*\$?(\d{1,5})/gi, desc: 'Selling price' },
    { regex: /(\d{3,5})\s*shipped/gi, desc: 'Shipped price' },
    { regex: /(\d{1,5})\s*(?:usd|dollars?)/gi, desc: 'USD/dollars' }
  ];

  const vulnerableInputs = [
    // Repetitive whitespace
    'asking' + ' '.repeat(10000) + '$500',
    // Many dollar signs
    '$'.repeat(10000),
    // Repeating "selling for" without price
    'selling for '.repeat(1000),
    // Mixed repetitive patterns
    'price: '.repeat(500) + ' asking '.repeat(500) + '$500'
  ];

  const results = [];

  patterns.forEach(({ regex, desc }) => {
    const patternResults = {
      pattern: desc,
      regex: regex.toString(),
      vulnerabilities: []
    };

    vulnerableInputs.forEach((input, idx) => {
      const timeout = 1000; // 1 second timeout
      const start = performance.now();

      try {
        const timeoutId = setTimeout(() => {
          throw new Error('TIMEOUT');
        }, timeout);

        const matches = [...input.matchAll(regex)];
        clearTimeout(timeoutId);

        const duration = performance.now() - start;

        if (duration > 100) {
          patternResults.vulnerabilities.push({
            inputType: `Vulnerable input ${idx + 1}`,
            inputLength: input.length,
            duration: duration.toFixed(2) + 'ms',
            severity: duration > 500 ? 'HIGH' : 'MEDIUM'
          });
        }
      } catch (error) {
        if (error.message === 'TIMEOUT') {
          patternResults.vulnerabilities.push({
            inputType: `Vulnerable input ${idx + 1}`,
            inputLength: input.length,
            duration: 'TIMEOUT (>1000ms)',
            severity: 'CRITICAL'
          });
        }
      }
    });

    results.push(patternResults);
  });

  // Print results
  results.forEach(result => {
    console.log(`\n${result.pattern}`);
    console.log(`Regex: ${result.regex}`);

    if (result.vulnerabilities.length === 0) {
      console.log('✅ No catastrophic backtracking detected');
    } else {
      console.log('⚠️  Potential vulnerabilities found:');
      result.vulnerabilities.forEach(vuln => {
        console.log(`  [${vuln.severity}] ${vuln.inputType}: ${vuln.duration} (${vuln.inputLength} chars)`);
      });
    }
  });

  return results;
}

// Test pattern overlap
function testPatternOverlap() {
  console.log('\n\n🔄 PATTERN OVERLAP ANALYSIS\n');
  console.log('='.repeat(80));

  const testCases = [
    { input: 'asking $500', expected: 500 },
    { input: 'price: $600', expected: 600 },
    { input: 'selling for $700', expected: 700 },
    { input: '$800', expected: 800 },
    { input: '900 shipped', expected: 900 },
    { input: '1000 USD', expected: 1000 },
    { input: 'asking price: $1,200 shipped', expected: 1200 }
  ];

  const patterns = [
    /\$(\d{1,5}(?:,\d{3})*)/g,
    /asking\s*\$?(\d{1,5})/gi,
    /price:?\s*\$?(\d{1,5})/gi,
    /selling\s*(?:for|at)?\s*\$?(\d{1,5})/gi,
    /(\d{3,5})\s*shipped/gi,
    /(\d{1,5})\s*(?:usd|dollars?)/gi
  ];

  console.log('Testing which patterns match each input:\n');

  testCases.forEach(({ input, expected }) => {
    console.log(`Input: "${input}"`);
    const matches = [];

    patterns.forEach((pattern, idx) => {
      const result = [...input.matchAll(pattern)];
      if (result.length > 0) {
        const prices = result.map(m => parseInt(m[1].replace(/,/g, '')));
        matches.push({
          patternIdx: idx + 1,
          prices
        });
      }
    });

    if (matches.length > 1) {
      console.log(`  ⚠️  Multiple patterns matched:`);
      matches.forEach(m => {
        console.log(`    Pattern ${m.patternIdx}: [${m.prices.join(', ')}]`);
      });
    } else if (matches.length === 1) {
      console.log(`  ✅ Pattern ${matches[0].patternIdx} matched: [${matches[0].prices.join(', ')}]`);
    } else {
      console.log(`  ❌ No patterns matched`);
    }
    console.log('');
  });
}

// Test edge cases
function testEdgeCases() {
  console.log('\n\n🧪 EDGE CASE TESTING\n');
  console.log('='.repeat(80));

  const edgeCases = [
    {
      title: 'Very long string (10,000 chars)',
      input: 'lorem ipsum '.repeat(833) + '$500',
      expectedPrice: 500
    },
    {
      title: 'Many dollar signs',
      input: '$ $ $ $ $ $500 $ $ $',
      expectedPrice: 500
    },
    {
      title: 'Unicode and emojis',
      input: '🎧 Selling for $500 💰',
      expectedPrice: 500
    },
    {
      title: 'Nested price mentions',
      input: 'Bought for $800, asking $500, was $1000',
      expectedPrice: 500
    },
    {
      title: 'Model numbers that look like prices',
      input: '[WTS] HD600 and M50x for $500',
      expectedPrice: 500
    },
    {
      title: 'Price at very start',
      input: '$500 HD600',
      expectedPrice: 500
    },
    {
      title: 'Price at very end',
      input: 'HD600 $500',
      expectedPrice: 500
    },
    {
      title: 'Multiple valid prices',
      input: '$500 or $600 OBO',
      expectedPrice: 500
    },
    {
      title: 'Invalid price (too low)',
      input: '$5 HD600',
      expectedPrice: null
    },
    {
      title: 'Invalid price (too high)',
      input: '$50000 HD600',
      expectedPrice: null
    },
    {
      title: 'Model number with price-like pattern',
      input: 'HD6XX $250',
      expectedPrice: 250
    },
    {
      title: 'Comma-formatted price',
      input: 'asking $1,500',
      expectedPrice: 1500
    },
    {
      title: 'No spaces around dollar sign',
      input: 'HD600$500',
      expectedPrice: 500
    },
    {
      title: 'Spelled out dollar',
      input: '500 dollars',
      expectedPrice: 500
    },
    {
      title: 'Mixed case keywords',
      input: 'AsKiNg $500',
      expectedPrice: 500
    },
    {
      title: 'Special characters',
      input: '[WTS][US-CA] HD600 - $500 (OBO)',
      expectedPrice: 500
    },
    {
      title: 'Newlines in text',
      input: 'HD600\n$500\nshipped',
      expectedPrice: 500
    },
    {
      title: 'Tabs in text',
      input: 'HD600\t$500\tshipped',
      expectedPrice: 500
    }
  ];

  const results = {
    passed: 0,
    failed: 0,
    failures: []
  };

  edgeCases.forEach(testCase => {
    const start = performance.now();
    const result = extractPrice(testCase.input, '');
    const duration = performance.now() - start;

    const passed = result === testCase.expectedPrice;

    if (passed) {
      results.passed++;
      console.log(`✅ ${testCase.title}`);
      console.log(`   Input: "${testCase.input.substring(0, 50)}${testCase.input.length > 50 ? '...' : ''}"`);
      console.log(`   Expected: ${testCase.expectedPrice}, Got: ${result} (${duration.toFixed(2)}ms)`);
    } else {
      results.failed++;
      results.failures.push(testCase);
      console.log(`❌ ${testCase.title}`);
      console.log(`   Input: "${testCase.input.substring(0, 50)}${testCase.input.length > 50 ? '...' : ''}"`);
      console.log(`   Expected: ${testCase.expectedPrice}, Got: ${result} (${duration.toFixed(2)}ms)`);
    }
    console.log('');
  });

  console.log('\n' + '='.repeat(80));
  console.log(`Results: ${results.passed} passed, ${results.failed} failed`);

  return results;
}

// Test memory usage
function testMemoryUsage() {
  console.log('\n\n💾 MEMORY USAGE ANALYSIS\n');
  console.log('='.repeat(80));

  const scenarios = [
    {
      title: 'Small input (100 chars)',
      title_input: 'HD600 for $500',
      selftext_input: 'Great condition, barely used'
    },
    {
      title: 'Medium input (1,000 chars)',
      title_input: 'HD600 for $500',
      selftext_input: 'lorem ipsum '.repeat(83)
    },
    {
      title: 'Large input (10,000 chars)',
      title_input: 'HD600 for $500',
      selftext_input: 'lorem ipsum '.repeat(833)
    },
    {
      title: 'Extra large input (100,000 chars)',
      title_input: 'HD600 for $500',
      selftext_input: 'lorem ipsum '.repeat(8333)
    }
  ];

  scenarios.forEach(scenario => {
    const totalSize = scenario.title_input.length + scenario.selftext_input.length;

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const memBefore = process.memoryUsage().heapUsed;
    const start = performance.now();

    // Run extraction 100 times to amplify memory usage
    const iterations = 100;
    for (let i = 0; i < iterations; i++) {
      extractPrice(scenario.title_input, scenario.selftext_input);
    }

    const duration = performance.now() - start;
    const memAfter = process.memoryUsage().heapUsed;
    const memDelta = (memAfter - memBefore) / 1024 / 1024; // Convert to MB

    console.log(`\n${scenario.title}`);
    console.log(`  Combined text size: ${totalSize.toLocaleString()} chars`);
    console.log(`  Iterations: ${iterations}`);
    console.log(`  Total time: ${duration.toFixed(2)}ms (${(duration/iterations).toFixed(2)}ms per iteration)`);
    console.log(`  Memory delta: ${memDelta >= 0 ? '+' : ''}${memDelta.toFixed(2)} MB`);

    if (memDelta > 10) {
      console.log(`  ⚠️  HIGH memory usage detected`);
    } else if (memDelta > 1) {
      console.log(`  ⚠️  Moderate memory usage`);
    } else {
      console.log(`  ✅ Low memory usage`);
    }
  });
}

// Test benchmark performance
function benchmarkPerformance() {
  console.log('\n\n⚡ PERFORMANCE BENCHMARKS\n');
  console.log('='.repeat(80));

  const testStrings = [
    'HD600 for $500',
    '[WTS][US-CA] Sennheiser HD600 - $500 shipped OBO',
    'Selling my HD600 headphones, asking price: $500, bought for $800',
    'lorem ipsum '.repeat(100) + '$500'
  ];

  testStrings.forEach((str, idx) => {
    console.log(`\nTest ${idx + 1}: "${str.substring(0, 50)}${str.length > 50 ? '...' : ''}"`);
    console.log(`String length: ${str.length} chars`);

    const iterations = 10000;
    const start = performance.now();

    for (let i = 0; i < iterations; i++) {
      extractPrice(str, '');
    }

    const duration = performance.now() - start;
    const avgTime = duration / iterations;
    const opsPerSec = (iterations / duration) * 1000;

    console.log(`Iterations: ${iterations.toLocaleString()}`);
    console.log(`Total time: ${duration.toFixed(2)}ms`);
    console.log(`Avg time: ${avgTime.toFixed(4)}ms`);
    console.log(`Ops/sec: ${opsPerSec.toFixed(0).toLocaleString()}`);

    if (avgTime > 1) {
      console.log('⚠️  SLOW: Consider optimization');
    } else if (avgTime > 0.1) {
      console.log('⚠️  Moderate speed');
    } else {
      console.log('✅ Fast execution');
    }
  });
}

// Generate recommendations
function generateRecommendations(backtrackingResults, edgeCaseResults) {
  console.log('\n\n📋 RECOMMENDATIONS\n');
  console.log('='.repeat(80));

  const recommendations = [];

  // Check for backtracking issues
  const criticalVulns = backtrackingResults.filter(
    r => r.vulnerabilities.some(v => v.severity === 'CRITICAL')
  );

  if (criticalVulns.length > 0) {
    recommendations.push({
      priority: 'CRITICAL',
      issue: 'Catastrophic backtracking detected',
      patterns: criticalVulns.map(r => r.pattern),
      recommendation: 'Rewrite patterns to use atomic groups or possessive quantifiers',
      example: 'Replace \\s* with \\s*+ or use (?:\\s*) with careful quantifier limits'
    });
  }

  // Pattern overlap
  recommendations.push({
    priority: 'MEDIUM',
    issue: 'Multiple patterns match same input',
    patterns: ['Pattern 1 ($500)', 'Pattern 2 (asking $500)', 'Pattern 3 (price: $500)'],
    recommendation: 'Consider combining overlapping patterns or implementing early return',
    benefit: 'Reduce redundant regex operations by 30-50%'
  });

  // Edge case failures
  if (edgeCaseResults.failed > 0) {
    recommendations.push({
      priority: 'HIGH',
      issue: `${edgeCaseResults.failed} edge case(s) failing`,
      patterns: edgeCaseResults.failures.map(f => f.title),
      recommendation: 'Add special handling for identified edge cases',
      action: 'Review failed test cases and adjust patterns or validation logic'
    });
  }

  // Input size handling
  recommendations.push({
    priority: 'LOW',
    issue: 'Large combined text strings (title + selftext)',
    recommendation: 'Consider limiting selftext search to first 1000-2000 characters',
    benefit: 'Reduce memory usage and execution time for very long posts',
    tradeoff: 'May miss prices buried deep in post body (rare)'
  });

  // Print recommendations
  recommendations.forEach((rec, idx) => {
    console.log(`\n${idx + 1}. [${rec.priority}] ${rec.issue}`);
    if (rec.patterns) {
      console.log(`   Affected patterns: ${rec.patterns.slice(0, 3).join(', ')}${rec.patterns.length > 3 ? '...' : ''}`);
    }
    console.log(`   Recommendation: ${rec.recommendation}`);
    if (rec.benefit) {
      console.log(`   Benefit: ${rec.benefit}`);
    }
    if (rec.tradeoff) {
      console.log(`   Tradeoff: ${rec.tradeoff}`);
    }
    if (rec.example) {
      console.log(`   Example: ${rec.example}`);
    }
    if (rec.action) {
      console.log(`   Action: ${rec.action}`);
    }
  });
}

// Main execution
async function runTests() {
  console.log('🧪 Price Extraction Regex Performance Test Suite');
  console.log('='.repeat(80));
  console.log('Testing extractPrice() function from reddit-avexchange-scraper-v3.js\n');

  const backtrackingResults = testCatastrophicBacktracking();
  testPatternOverlap();
  const edgeCaseResults = testEdgeCases();
  testMemoryUsage();
  benchmarkPerformance();
  generateRecommendations(backtrackingResults, edgeCaseResults);

  console.log('\n\n✅ Test suite complete!\n');
}

// Run tests
if (require.main === module) {
  console.log('Note: Run with --expose-gc flag for accurate memory measurements:');
  console.log('  node --expose-gc scripts/test-price-extraction-performance.js\n');

  runTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = { extractPrice, runTests };
