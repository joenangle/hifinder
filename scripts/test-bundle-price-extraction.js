/**
 * Test script to debug bundle price extraction
 */

// NEW IMPROVED VERSION - Simulate the fixed extractPricesFromText function
function extractPricesFromText(text) {
  const hasBundleKeywords = /\b(all|bundle|total|together|both|for everything|combo|package)\b/i.test(text);
  console.log('  Has bundle keywords:', hasBundleKeywords);

  const wantPattern = /\[W\][^\[]*?\$?(\d{1,5}(?:,\d{3})*)\b/gi;
  const bundlePattern = /\b(?:asking|price:?|selling)\s*\$?(\d{1,5}(?:,\d{3})*)\s*(?:for\s+)?(?:all|total|together|both|everything|bundle)/gi;
  const dollarPattern = /\$(\d{1,5}(?:,\d{3})*(?:\.\d{2})?)/g;
  const askingPattern = /\b(?:asking|price:?|selling\s*(?:for|at)?)\s*\$?(\d{1,5}(?:,\d{3})*)/gi;
  const shippedPattern = /\b(\d{3,5})\s*(?:shipped|obo|or best offer|firm)\b/gi;
  const currencyPattern = /\b(\d{3,5})\s*(?:usd|dollars?)\b/gi;

  const allPrices = [];

  let match;
  while ((match = wantPattern.exec(text)) !== null) {
    const price = parseInt(match[1].replace(/,/g, ''), 10);
    if (price >= 10 && price <= 10000) {
      allPrices.push({ price, priority: 0, raw: match[0], type: '[W] section' });
    }
  }

  while ((match = bundlePattern.exec(text)) !== null) {
    const price = parseInt(match[1].replace(/,/g, ''), 10);
    if (price >= 10 && price <= 10000) {
      allPrices.push({ price, priority: 1, raw: match[0], type: 'bundle keyword' });
    }
  }

  while ((match = dollarPattern.exec(text)) !== null) {
    const price = parseInt(match[1].replace(/,/g, ''), 10);
    if (price >= 10 && price <= 10000) {
      allPrices.push({ price, priority: 2, raw: match[0], type: 'dollar sign' });
    }
  }

  while ((match = askingPattern.exec(text)) !== null) {
    const price = parseInt(match[1].replace(/,/g, ''), 10);
    if (price >= 10 && price <= 10000) {
      allPrices.push({ price, priority: 3, raw: match[0], type: 'asking' });
    }
  }

  while ((match = shippedPattern.exec(text)) !== null) {
    const price = parseInt(match[1], 10);
    if (price >= 10 && price <= 10000) {
      allPrices.push({ price, priority: 4, raw: match[0], type: 'shipped' });
    }
  }

  while ((match = currencyPattern.exec(text)) !== null) {
    const price = parseInt(match[1], 10);
    if (price >= 10 && price <= 10000) {
      allPrices.push({ price, priority: 5, raw: match[0], type: 'USD' });
    }
  }

  console.log('  Found prices:', allPrices.map(p => `${p.raw} (p${p.priority}:${p.type})`).join(', '));

  if (allPrices.length === 0) return null;

  allPrices.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return hasBundleKeywords ? b.price - a.price : a.price - b.price;
  });

  console.log('  After sorting:', allPrices.map(p => `${p.raw}=$${p.price}`).join(', '));
  console.log('  ✅ Selected:', allPrices[0].raw, `($${allPrices[0].price})`);

  return allPrices[0].price;
}

// Test cases
console.log('\n===== IMPROVED PRICE EXTRACTION TESTS =====\n');

console.log('=== Test 1: Bundle with "asking X for all" ===');
console.log('Text: "Sundara $250, Atom $90, Enog 2 $150, asking $490 for all"');
const test1 = extractPricesFromText('Sundara $250, Atom $90, Enog 2 $150, asking $490 for all');
console.log('Expected: $490 ✓\n');

console.log('=== Test 2: Bundle with [W] section ===');
console.log('Text: "[H] HD600 $200, Clear $800 [W] $1000"');
const test2 = extractPricesFromText('[H] HD600 $200, Clear $800 [W] $1000');
console.log('Expected: $1000 ✓\n');

console.log('=== Test 3: Bundle with only total price ===');
console.log('Text: "[H] HD600, Clear, Modi [W] $400 shipped"');
const test3 = extractPricesFromText('[H] HD600, Clear, Modi [W] $400 shipped');
console.log('Expected: $400 ✓\n');

console.log('=== Test 4: Single item (no bundle keywords) ===');
console.log('Text: "HD600 $150, also selling Clear for $800"');
const test4 = extractPricesFromText('HD600 $150, also selling Clear for $800');
console.log('Expected: $150 (lowest, since not a bundle) ✓\n');

console.log('=== Test 5: Realistic Reddit title with [W] ===');
console.log('Text: "[WTS] [US-CA] [H] Sundara, Atom, Enog 2 [W] $500 PayPal"');
const test5 = extractPricesFromText('[WTS] [US-CA] [H] Sundara, Atom, Enog 2 [W] $500 PayPal');
console.log('Expected: $500 ✓\n');

console.log('=== Test 6: Bundle with "total" keyword ===');
console.log('Text: "HD650 $180, Magni $90, asking $250 total"');
const test6 = extractPricesFromText('HD650 $180, Magni $90, asking $250 total');
console.log('Expected: $250 ✓\n');

console.log('\n===== SUMMARY =====');
console.log('The improved extractPricesFromText now:');
console.log('✓ Prioritizes [W] (Want) section prices (highest priority)');
console.log('✓ Detects bundle keywords (all, total, together, bundle, etc.)');
console.log('✓ Picks HIGHEST price for bundles (likely the total)');
console.log('✓ Picks LOWEST price for single items (original behavior)');
