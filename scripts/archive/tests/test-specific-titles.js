/**
 * Test specific titles to understand false negative patterns
 */

const { detectMultipleComponents } = require('./component-matcher-enhanced');

// Test cases from the false negatives
const testCases = [
  {
    title: "[WTS] [USA-TX] [H] HD800s, ADX3000, Woo Audio Wa7 Gen 3 [W] Paypal",
    expected: "TRUE BUNDLE - clearly 3 items separated by commas",
    shouldBeBundle: true
  },
  {
    title: "[WTS][US-OH][H]Kiwi Ears Aether + NiceHCK FirstTouch[W]Paypal",
    expected: "TRUE BUNDLE - has + separator",
    shouldBeBundle: true
  },
  {
    title: "[WTS] [USA-NY] [H] Unique Melody UM Mest Jet Black (Almost New) - REPOST + PRICE DROP [W] PayPal $1250 net",
    expected: "SINGLE ITEM - the + is for 'REPOST + PRICE DROP', not products",
    shouldBeBundle: false
  },
  {
    title: "[WTS][US-TX][H] Sennheiser Momentum 4 [W] Paypal",
    expected: "SINGLE ITEM - Momentum 4 is the model name",
    shouldBeBundle: false
  },
  {
    title: "[WTS] [USA-CA] [H] Empire 298 Turntable [W] PayPal, Venmo, Zelle",
    expected: "SINGLE ITEM - 298 is the model number",
    shouldBeBundle: false
  },
  {
    title: "[WTS] [US-IN] [H] Schiit Lyr 3 (no dac) w/ lots of tubes and stands [W] $450 PayPal G&S",
    expected: "SINGLE ITEM - main item is Lyr 3, 'with accessories' doesn't count",
    shouldBeBundle: false
  },
  {
    title: "[WTS] [US-VA] [H] Hifiman Edition XS, Capra Strap, Hifiman Branded Carrying Case [W]$160",
    expected: "SINGLE ITEM - Edition XS with accessories",
    shouldBeBundle: false
  },
  {
    title: "[WTS] [US-CA] [H] Meze 99 Noir, Truthear Nova, Rock Lobster, FDX-1 [W] your money",
    expected: "TRUE BUNDLE - clearly 4 items separated by commas",
    shouldBeBundle: true
  },
  {
    title: "[WTS][USA-IL][H]Moondrop Meteor and Moondrop Blessing 3[W] Paypal G & S",
    expected: "TRUE BUNDLE - 2 items with 'and' separator",
    shouldBeBundle: true
  },
  {
    title: "[WTS][USA-NY][H] Audeze iSine20/ Audient Evo 4/ + Sim Racing Equipment [W] PayPal",
    expected: "TRUE BUNDLE - 2+ items with / separators",
    shouldBeBundle: true
  },
  {
    title: "[WTS] [US-CA] [H] Audeze LCD-4 [W]Paypal, Zelle",
    expected: "SINGLE ITEM - LCD-4 is the model name (has a 4 in it)",
    shouldBeBundle: false
  },
  {
    title: "[WTS] [USA-CA] [H] fiio ft1, ziigaat estrella, simgot et142, large tips bundle [W] paypal",
    expected: "TRUE BUNDLE - 3 IEMs + tips",
    shouldBeBundle: true
  },
  {
    title: "[WTS][US-NY][H]: Xenns Top Pro, Ziigaat Doscinco, Aful Explorer, iBasso DX180, Sennheiser HD650 [W] Paypal",
    expected: "TRUE BUNDLE - 5 items separated by commas",
    shouldBeBundle: true
  }
];

console.log('Testing bundle detection on specific examples:\n');
console.log('═'.repeat(80));

let correctCount = 0;
let incorrectCount = 0;

testCases.forEach((test, i) => {
  const result = detectMultipleComponents(test.title);
  const isCorrect = result.isBundle === test.shouldBeBundle;

  if (isCorrect) correctCount++;
  else incorrectCount++;

  console.log(`\nTest ${i + 1}:`);
  console.log(`Title: "${test.title}"`);
  console.log(`Expected: ${test.expected}`);
  console.log(`Detection result: ${result.isBundle ? 'BUNDLE' : 'SINGLE'} (${result.componentCount} items)`);
  console.log(`Status: ${isCorrect ? '✅ CORRECT' : '❌ INCORRECT'}`);
});

console.log('\n' + '═'.repeat(80));
console.log(`\nAccuracy on test cases: ${correctCount}/${testCases.length} (${(correctCount/testCases.length*100).toFixed(1)}%)`);
console.log(`Correct: ${correctCount}`);
console.log(`Incorrect: ${incorrectCount}`);
