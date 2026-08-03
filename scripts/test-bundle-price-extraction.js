#!/usr/bin/env node
/**
 * Bundle / [W]-section price extraction tests.
 * Exercises the shared extractor's tier model and bundle-total selection.
 * Run: node scripts/test-bundle-price-extraction.js
 */
const { extractPrice } = require('./shared/price-extractor');

let passed = 0;
let failed = 0;

function expect(text, want, label) {
  const result = extractPrice(text);
  const got = result ? result.price : null;
  if (got === want) {
    passed++;
    console.log(`  ✅ ${label}  → ${got}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}\n       text: ${JSON.stringify(text)}\n       want: ${want}  got: ${got}  (${result ? result.sourcePattern : 'none'})`);
  }
}

console.log('\n--- bundle / [W] price extraction ---\n');

// Bundle totals: prefer the explicit "for all"/"total" figure.
expect('Sundara $250, Atom $90, Enog 2 $150, asking $490 for all', 490, 'bundle "asking $X for all"');
expect('HD650 $180, Magni $90, asking $250 total', 250, 'bundle "asking $X total"');

// [W] (Want) section carries the asking total.
expect('[H] HD600 $200, Clear $800 [W] $1000', 1000, '[W] $1000 bundle total');
expect('[H] HD600, Clear, Modi [W] $400 shipped', 400, '[W] $400 shipped');
expect('[WTS] [US-CA] [H] Sundara, Atom, Enog 2 [W] $500 PayPal', 500, '[W] $500 PayPal still extracts 500');

// [W] with NO price (payment method only) must yield nothing.
expect('[WTS] [US-IL][H] Thieaudio Valhalla [W] PayPal', null, '[W] PayPal (no $) yields null');

// Single item (no bundle keywords): prefer the lowest plausible price.
expect('HD600 $150, also selling Clear for $800', 150, 'single item picks lowest');

console.log(`\n${failed === 0 ? '✅' : '❌'} ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
