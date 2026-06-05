#!/usr/bin/env node
/**
 * Unit tests for the hardened shared price extractor.
 * Plain Node, no framework — run: node scripts/test-price-extraction.js
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
    console.log(
      `  ❌ ${label}\n       text: ${JSON.stringify(text)}\n` +
      `       want: ${want}  got: ${got}  (${result ? result.sourcePattern : 'none'})`
    );
  }
}

console.log('\n--- price extraction (hardened) ---\n');

// The reported bug: "24 hours" must not become the price.
expect('Selling Valhalla, bought it 24 hours ago, asking $1100', 1100, 'time-unit not read as price');

// [W] = the seller's "want" — often a payment method, not a price.
expect('[H] Thieaudio Valhalla [W] PayPal, local', null, '[W] payment-method yields no price');
expect('[WTS][US-CA][H] Sundara, Atom [W] $500 PayPal', 500, '[W] $500 still extracted');

// Discount amounts are not the asking price.
expect('Focal Clear OG. $50 off if local. Asking $450 obo', 450, 'local discount filtered');
expect('Headphones $100 discount from retail! Asking $500', 500, 'discount-from-retail filtered');

// MSRP/retail reference de-prioritised vs the asking price.
expect('MSRP $1500, selling for $900', 900, 'MSRP de-prioritised');
expect('[WTS] IEMs - was $800, now $600 sale price', 600, 'original price ignored, sale price kept');

// Spec numbers adjacent to units are excluded.
expect('Comes with 1.2m cable, 24 ohm, asking $300', 300, 'cable length + impedance excluded');

// Model numbers glued to letters are not prices; explicit obo/shipped wins.
expect('FiiO K5 Pro, $180 obo', 180, 'model number not read as price');
expect('v2 unit, 2x adapters, price: $250', 250, 'version + quantity excluded');
expect('[WTS][US-CA][H] Sennheiser HD600 [W] $250 shipped', 250, 'standard [W] $X shipped');
expect('[H] AirPods Pro [W] $150 obo', 150, 'simple obo pattern');

// Comma-thousands must survive (guards historical $1,200 -> $200 regression).
expect('$1,200 firm', 1200, 'comma-thousands preserved');

console.log(`\n${failed === 0 ? '✅' : '❌'} ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
