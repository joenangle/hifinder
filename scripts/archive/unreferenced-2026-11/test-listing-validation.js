#!/usr/bin/env node
/**
 * Unit tests for band-aware listing price validation.
 * Plain Node, no framework — run: node scripts/test-listing-validation.js
 */
const { validateListing } = require('./validators/listing-validator');

let passed = 0;
let failed = 0;

function check(label, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}\n       want: ${JSON.stringify(want)}\n       got:  ${JSON.stringify(got)}`);
  }
}

const valhalla = { category: 'iems', price_new: 1500, price_used_min: 900, price_used_max: 1200 };
const noBand = { category: 'cans', price_new: 1500, price_used_min: null, price_used_max: null };
const noRef = { category: 'cans', price_new: null, price_used_min: null, price_used_max: null };

console.log('\n--- listing price validation ---\n');

// The bug: $24 on a ~$900-1200 used band must REJECT and null the price.
{
  const r = validateListing({ price: 24, title: 'Thieaudio Valhalla' }, valhalla);
  check('$24 vs used band → reject + price nulled', {
    reject: r.shouldReject, override: r.priceOverride, reasonable: r.priceIsReasonable,
  }, { reject: true, override: null, reasonable: false });
}

// A fair used price accepts and is kept.
{
  const r = validateListing({ price: 950, title: 'Thieaudio Valhalla' }, valhalla);
  check('$950 vs used band → accept + kept', {
    reject: r.shouldReject, flag: r.shouldFlag, override: r.priceOverride, reasonable: r.priceIsReasonable,
  }, { reject: false, flag: false, override: 950, reasonable: true });
}

// Below-range but not absurd → flag, price kept.
{
  const r = validateListing({ price: 500, title: 'Thieaudio Valhalla' }, valhalla);
  check('$500 vs used band → flag (below range), kept', {
    reject: r.shouldReject, flag: r.shouldFlag, override: r.priceOverride,
  }, { reject: false, flag: true, override: 500 });
}

// No used band: ratio vs MSRP. >3x → reject.
{
  const r = validateListing({ price: 6000, title: 'Some headphone' }, noBand);
  check('$6000 vs MSRP $1500 (no band) → reject', { reject: r.shouldReject, override: r.priceOverride }, { reject: true, override: null });
}

// Bundle split estimate → strict band skipped, accepted.
{
  const r = validateListing({ price: 30, title: 'bundle item', price_is_estimated: true }, valhalla);
  check('bundle estimate $30 → accept (strict band skipped)', { reject: r.shouldReject, flag: r.shouldFlag }, { reject: false, flag: false });
}

// No reference price at all → accept, warning set, NOT flagged.
{
  const r = validateListing({ price: 200, title: 'Obscure DAC' }, noRef);
  check('no reference price → accept, not flagged, warning set', {
    reject: r.shouldReject, flag: r.shouldFlag, hasWarning: !!r.priceWarning,
  }, { reject: false, flag: false, hasWarning: true });
}

console.log(`\n${failed === 0 ? '✅' : '❌'} ${passed} passed, ${failed} failed\n`);
process.exit(failed === 0 ? 0 : 1);
