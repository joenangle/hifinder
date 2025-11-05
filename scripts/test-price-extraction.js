#!/usr/bin/env node

/**
 * Test price extraction with various edge cases
 */

// Copy the updated extractPrice function
function extractPrice(title) {
  const patterns = [
    /\$(\d{1,5}(?:,\d{3})*)/g,
    /asking\s*\$?(\d{1,5})/gi,
    /price[:\s]+\$?(\d{1,5})/gi,
    /\[w\]\s*\$?(\d{1,5})/gi,
    /\[h\].*?\[w\]\s*\$?(\d{1,5})/gi,
    /(\d{1,5})\s*shipped/gi,
    /(\d{1,5})\s*(?:usd|dollars?)/gi,
    /obo.*?\$?(\d{1,5})/gi,
    /\$?(\d{1,5})\s*obo/gi,
  ];

  const discountPatterns = [
    /\$?(\d{1,5})\s*(?:off|discount|savings|reduced|sale)/gi,
    /(?:off|discount|savings|reduced|sale)\s*\$?(\d{1,5})/gi,
  ];

  let foundPrices = [];

  for (const pattern of patterns) {
    const matches = [...title.matchAll(pattern)];
    for (const match of matches) {
      const priceStr = match[1].replace(/,/g, '');
      const price = parseInt(priceStr);

      if (price >= 20 && price <= 10000) {
        const matchIndex = title.indexOf(match[0]);
        const surroundingText = title.substring(Math.max(0, matchIndex - 20), Math.min(title.length, matchIndex + match[0].length + 20));

        let isDiscount = false;
        for (const discountPattern of discountPatterns) {
          if (discountPattern.test(surroundingText)) {
            isDiscount = true;
            break;
          }
        }

        if (!isDiscount) {
          foundPrices.push({ price, raw: match[0], confidence: 1 });
        }
      }
    }
  }

  if (foundPrices.length > 0) {
    return foundPrices[0];
  }

  return null;
}

// Test cases
const testCases = [
  {
    title: "Focal Clear OG. $50 off if local. Asking $450 obo",
    expected: 450,
    description: "Focal Clear with local discount"
  },
  {
    title: "[WTS][US-CA][H] Sennheiser HD600 [W] $250 shipped",
    expected: 250,
    description: "Standard price pattern"
  },
  {
    title: "Headphones $100 discount from retail! Asking $500",
    expected: 500,
    description: "Discount from retail (not asking price)"
  },
  {
    title: "[WTS] IEMs - was $800, now $600 sale price",
    expected: 600,
    description: "Sale price vs original price"
  },
  {
    title: "[H] AirPods Pro [W] $150 obo",
    expected: 150,
    description: "Simple obo pattern"
  }
];

console.log('🧪 Testing Price Extraction\n');

let passed = 0;
let failed = 0;

for (const test of testCases) {
  const result = extractPrice(test.title);
  const extractedPrice = result ? result.price : null;
  const success = extractedPrice === test.expected;

  if (success) {
    console.log(`✅ PASS: ${test.description}`);
    console.log(`   Title: "${test.title}"`);
    console.log(`   Expected: $${test.expected} | Got: $${extractedPrice}\n`);
    passed++;
  } else {
    console.log(`❌ FAIL: ${test.description}`);
    console.log(`   Title: "${test.title}"`);
    console.log(`   Expected: $${test.expected} | Got: $${extractedPrice}\n`);
    failed++;
  }
}

console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
process.exit(failed > 0 ? 1 : 0);
