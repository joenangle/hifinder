#!/usr/bin/env node

/**
 * Combo DAC/Amp Research Script
 *
 * Purpose: Gather accurate pricing and specifications for combo DAC/amp units
 * from manufacturer websites, retailers, and review sites.
 *
 * Usage:
 *   node scripts/research-combo-dac-amps.js [--tier=dongle|budget-portable|budget-desktop|mid|high]
 *   node scripts/research-combo-dac-amps.js --export=json
 *
 * Data Sources:
 *   1. Manufacturer websites (most accurate)
 *   2. Amazon (current street prices)
 *   3. ASR forum (measurements)
 *   4. Head-Fi (community recommendations)
 */

import https from 'https';
import http from 'http';
import { readFileSync, writeFileSync } from 'fs';
import { URL } from 'url';

// Define combo units to research by price tier
const COMBO_UNITS = {
  dongle: [
    {
      brand: 'Apple',
      name: 'USB-C to 3.5mm Headphone Adapter',
      searchTerms: ['apple usb-c dongle', 'apple headphone adapter'],
      manufacturerUrl: 'https://www.apple.com/shop/product/MU7E2AM/A/',
      estimatedPrice: 9,
      powerOutput: '~30mW @ 32Ω',
      soundSignature: 'neutral',
      formFactor: 'dongle'
    },
    {
      brand: 'Moondrop',
      name: 'Dawn Pro',
      searchTerms: ['moondrop dawn pro', 'moondrop dawn pro dongle'],
      manufacturerUrl: 'https://www.moondroplab.com/', // Check for exact product URL
      estimatedPrice: 50,
      powerOutput: '230mW @ 32Ω SE, higher balanced',
      soundSignature: 'neutral',
      formFactor: 'dongle',
      features: ['4.4mm balanced', '3.5mm SE', 'USB-C']
    },
    {
      brand: 'Moondrop',
      name: 'Moonriver 2',
      searchTerms: ['moondrop moonriver 2'],
      estimatedPrice: 79,
      soundSignature: 'neutral',
      formFactor: 'dongle',
      features: ['4.4mm balanced', 'flagship dongle']
    },
    {
      brand: 'Hidizs',
      name: 'S9 Pro',
      searchTerms: ['hidizs s9 pro dongle'],
      estimatedPrice: 59,
      powerOutput: '~120mW @ 32Ω',
      soundSignature: 'neutral',
      formFactor: 'dongle',
      features: ['2.5mm balanced', '3.5mm SE']
    },
    {
      brand: 'ddHiFi',
      name: 'TC44C',
      searchTerms: ['ddhifi tc44c', 'ddhifi tc-44c'],
      estimatedPrice: 50,
      soundSignature: 'neutral',
      formFactor: 'dongle'
    },
    {
      brand: 'Shanling',
      name: 'UA2 Plus',
      searchTerms: ['shanling ua2 plus'],
      estimatedPrice: 65,
      powerOutput: '~250mW @ 32Ω',
      soundSignature: 'neutral',
      formFactor: 'dongle'
    },
    {
      brand: 'Qudelix',
      name: 'T71',
      searchTerms: ['qudelix t71'],
      manufacturerUrl: 'https://www.qudelix.com/',
      estimatedPrice: 69,
      soundSignature: 'neutral',
      formFactor: 'dongle',
      features: ['Qudelix app support', 'USB-C']
    },
    {
      brand: 'Truthear',
      name: 'SHIO',
      searchTerms: ['truthear shio dongle'],
      estimatedPrice: 55,
      soundSignature: 'neutral',
      formFactor: 'dongle'
    }
  ],

  budgetPortable: [
    {
      brand: 'Qudelix',
      name: '5K',
      searchTerms: ['qudelix 5k bluetooth dac'],
      manufacturerUrl: 'https://www.qudelix.com/products/qudelix-5k-dac-amp',
      estimatedPrice: 110,
      powerOutput: '240mW @ 32Ω balanced, 120mW SE',
      asrSinad: 105,
      soundSignature: 'neutral',
      formFactor: 'portable',
      features: ['Bluetooth LDAC', 'Parametric EQ app', '2.5mm balanced', 'USB DAC mode']
    },
    {
      brand: 'FiiO',
      name: 'BTR7',
      searchTerms: ['fiio btr7'],
      manufacturerUrl: 'https://www.fiio.com/btr7',
      estimatedPrice: 189,
      powerOutput: '440mW @ 32Ω balanced, 220mW SE',
      soundSignature: 'warm',
      formFactor: 'portable',
      features: ['Bluetooth 5.1', 'OLED display', 'USB DAC', '4.4mm balanced']
    },
    {
      brand: 'FiiO',
      name: 'BTR5 2021',
      searchTerms: ['fiio btr5 2021'],
      manufacturerUrl: 'https://www.fiio.com/btr5_2021',
      estimatedPrice: 129,
      powerOutput: '240mW @ 32Ω balanced',
      soundSignature: 'neutral',
      formFactor: 'portable',
      features: ['Bluetooth', 'USB DAC', 'FiiO app']
    },
    {
      brand: 'iFi',
      name: 'GO bar',
      searchTerms: ['ifi go bar'],
      manufacturerUrl: 'https://ifi-audio.com/products/go-bar/',
      estimatedPrice: 169,
      powerOutput: '~400mW @ 32Ω',
      soundSignature: 'warm',
      formFactor: 'portable',
      features: ['4.4mm balanced', 'XBass', 'XSpace', 'USB-C']
    },
    {
      brand: 'iFi',
      name: 'GO blu',
      searchTerms: ['ifi go blu'],
      manufacturerUrl: 'https://ifi-audio.com/products/go-blu/',
      estimatedPrice: 199,
      powerOutput: '~400mW @ 32Ω',
      soundSignature: 'warm',
      formFactor: 'portable',
      features: ['Bluetooth', 'Balanced output', 'XBass', 'XSpace']
    },
    {
      brand: 'Shanling',
      name: 'UA5',
      searchTerms: ['shanling ua5'],
      estimatedPrice: 189,
      soundSignature: 'neutral',
      formFactor: 'portable',
      features: ['Dual DAC', 'Balanced output']
    },
    {
      brand: 'Cayin',
      name: 'RU6',
      searchTerms: ['cayin ru6 r2r'],
      estimatedPrice: 159,
      soundSignature: 'warm',
      formFactor: 'dongle',
      features: ['R2R DAC', 'Balanced output']
    }
  ],

  budgetDesktop: [
    {
      brand: 'Schiit',
      name: 'Fulla E',
      searchTerms: ['schiit fulla e'],
      manufacturerUrl: 'https://www.schiit.com/products/fulla-e',
      estimatedPrice: 129,
      powerOutput: '~200mW @ 32Ω',
      soundSignature: 'neutral',
      formFactor: 'desktop',
      features: ['USB', 'Microphone input', 'Gaming focused']
    },
    {
      brand: 'Schiit',
      name: 'Hel 2',
      searchTerms: ['schiit hel 2'],
      manufacturerUrl: 'https://www.schiit.com/products/hel',
      estimatedPrice: 229,
      powerOutput: '~1W @ 32Ω',
      soundSignature: 'neutral',
      formFactor: 'desktop',
      features: ['Gaming optimized', 'Mic input', 'Preamp out']
    },
    {
      brand: 'FiiO',
      name: 'K7',
      searchTerms: ['fiio k7'],
      manufacturerUrl: 'https://www.fiio.com/k7',
      estimatedPrice: 209,
      powerOutput: '2000mW @ 32Ω balanced',
      asrSinad: 116,
      soundSignature: 'neutral',
      formFactor: 'desktop',
      features: ['THX AAA-78+', 'Balanced XLR', 'Remote control']
    },
    {
      brand: 'FiiO',
      name: 'K9 Pro',
      searchTerms: ['fiio k9 pro'],
      manufacturerUrl: 'https://www.fiio.com/k9pro',
      estimatedPrice: 329,
      soundSignature: 'neutral',
      formFactor: 'desktop',
      features: ['ESS DAC', 'THX amp', 'OLED display']
    },
    {
      brand: 'Topping',
      name: 'DX3 Pro+',
      searchTerms: ['topping dx3 pro+', 'topping dx3 pro plus'],
      manufacturerUrl: 'https://www.toppingaudio.com/product-item/dx3-pro',
      estimatedPrice: 229,
      powerOutput: '1200mW @ 32Ω balanced',
      asrSinad: 120,
      soundSignature: 'neutral',
      formFactor: 'desktop',
      features: ['Remote control', 'Bluetooth 5.0', 'Multiple inputs']
    },
    {
      brand: 'Topping',
      name: 'DX1',
      searchTerms: ['topping dx1'],
      estimatedPrice: 139,
      soundSignature: 'neutral',
      formFactor: 'desktop'
    },
    {
      brand: 'iFi',
      name: 'Zen DAC V3',
      searchTerms: ['ifi zen dac v3'],
      manufacturerUrl: 'https://ifi-audio.com/products/zen-dac/',
      estimatedPrice: 269,
      powerOutput: '~1500mW @ 32Ω balanced',
      asrSinad: 95,
      soundSignature: 'warm',
      formFactor: 'desktop',
      features: ['XBass', 'XSpace', '4.4mm balanced', 'TrueBass']
    },
    {
      brand: 'Loxjie',
      name: 'D30',
      searchTerms: ['loxjie d30'],
      estimatedPrice: 169,
      soundSignature: 'neutral',
      formFactor: 'desktop'
    }
  ],

  mid: [
    {
      brand: 'Topping',
      name: 'DX5',
      searchTerms: ['topping dx5'],
      manufacturerUrl: 'https://www.toppingaudio.com/product-item/dx5',
      estimatedPrice: 429,
      powerOutput: '2000mW @ 32Ω balanced',
      asrSinad: 122,
      soundSignature: 'neutral',
      formFactor: 'desktop',
      features: ['Dual ES9068AS DACs', 'Remote', 'Multiple filters']
    },
    {
      brand: 'JDS Labs',
      name: 'Element IV',
      searchTerms: ['jds labs element iv', 'jds element 4'],
      manufacturerUrl: 'https://jdslabs.com/product/element-iv/',
      estimatedPrice: 529,
      powerOutput: '3000mW @ 32Ω',
      asrSinad: 110,
      soundSignature: 'neutral',
      formFactor: 'desktop',
      features: ['Premium volume knob', 'Relay mute', 'All-metal build']
    },
    {
      brand: 'iFi',
      name: 'NEO iDSD',
      searchTerms: ['ifi neo idsd'],
      manufacturerUrl: 'https://ifi-audio.com/products/neo-idsd/',
      estimatedPrice: 679,
      powerOutput: '6400mW @ 32Ω balanced',
      asrSinad: 100,
      soundSignature: 'warm',
      formFactor: 'desktop',
      features: ['Tube+ mode', 'XBass', 'DSD512', 'MQA']
    },
    {
      brand: 'SMSL',
      name: 'DO300',
      searchTerms: ['smsl do300'],
      estimatedPrice: 429,
      soundSignature: 'neutral',
      formFactor: 'desktop'
    }
  ],

  high: [
    {
      brand: 'RME',
      name: 'ADI-2 DAC FS',
      searchTerms: ['rme adi-2 dac fs'],
      manufacturerUrl: 'https://www.rme-audio.de/adi-2-dac.html',
      estimatedPrice: 1149,
      powerOutput: '1500mW @ 32Ω',
      asrSinad: 120,
      soundSignature: 'neutral',
      formFactor: 'desktop',
      features: ['Parametric EQ', 'Multiple filters', 'Reference monitor', 'Pro audio']
    },
    {
      brand: 'Chord',
      name: 'Mojo 2',
      searchTerms: ['chord mojo 2'],
      manufacturerUrl: 'https://www.chordelectronics.co.uk/product/mojo-2/',
      estimatedPrice: 799,
      powerOutput: '~600mW @ 32Ω',
      asrSinad: 95,
      soundSignature: 'neutral',
      formFactor: 'portable',
      features: ['FPGA DAC', 'DSP presets', 'Tactile buttons', 'Battery']
    },
    {
      brand: 'iFi',
      name: 'iDSD Diablo',
      searchTerms: ['ifi idsd diablo'],
      manufacturerUrl: 'https://ifi-audio.com/products/micro-idsd-diablo/',
      estimatedPrice: 1299,
      powerOutput: '4980mW @ 32Ω balanced',
      asrSinad: 100,
      soundSignature: 'warm',
      formFactor: 'portable',
      features: ['Tube+', 'XBass', 'XSpace', 'Battery operation']
    },
    {
      brand: 'Cayin',
      name: 'RU7',
      searchTerms: ['cayin ru7 r2r'],
      estimatedPrice: 1399,
      soundSignature: 'warm',
      formFactor: 'dongle',
      features: ['R2R ladder DAC', 'Balanced output']
    },
    {
      brand: 'Chord',
      name: 'Hugo 2',
      searchTerms: ['chord hugo 2'],
      manufacturerUrl: 'https://www.chordelectronics.co.uk/product/hugo-2/',
      estimatedPrice: 2295,
      powerOutput: '740mW @ 32Ω',
      asrSinad: 100,
      soundSignature: 'neutral',
      formFactor: 'portable',
      features: ['FPGA DAC', 'Battery', 'DSD512']
    },
    {
      brand: 'Benchmark',
      name: 'DAC3 HGC',
      searchTerms: ['benchmark dac3 hgc'],
      manufacturerUrl: 'https://benchmarkmedia.com/products/benchmark-dac3-hgc',
      estimatedPrice: 2295,
      powerOutput: '6000mW @ 32Ω',
      asrSinad: 120,
      soundSignature: 'neutral',
      formFactor: 'desktop',
      features: ['Professional monitor', 'Preamp', 'HPA4 amp circuit']
    }
  ]
};

/**
 * Simple HTTP(S) GET request helper
 */
function httpGet(url, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;

    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; HiFinder Research Bot/1.0)',
        'Accept': 'text/html,application/json'
      },
      timeout
    };

    const req = client.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

/**
 * Check manufacturer URL for pricing (basic HTML scraping)
 */
async function checkManufacturerPrice(unit) {
  if (!unit.manufacturerUrl) {
    return { found: false, reason: 'No manufacturer URL' };
  }

  try {
    console.log(`  Checking manufacturer: ${unit.manufacturerUrl}`);
    const response = await httpGet(unit.manufacturerUrl);

    if (response.statusCode !== 200) {
      return { found: false, reason: `HTTP ${response.statusCode}` };
    }

    // Look for common price patterns in HTML
    const pricePatterns = [
      /\$(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)/g,
      /USD\s*(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)/gi,
      /price["\s:>]+\$?(\d{1,4}(?:,\d{3})*(?:\.\d{2})?)/gi
    ];

    const prices = [];
    for (const pattern of pricePatterns) {
      const matches = [...response.body.matchAll(pattern)];
      prices.push(...matches.map(m => parseFloat(m[1].replace(',', ''))));
    }

    // Filter reasonable prices (not SKU numbers or other data)
    const validPrices = prices.filter(p => p >= 9 && p <= 5000);

    if (validPrices.length > 0) {
      // Return most common price or median
      const priceCount = {};
      validPrices.forEach(p => {
        priceCount[p] = (priceCount[p] || 0) + 1;
      });
      const mostCommon = Object.entries(priceCount).sort((a, b) => b[1] - a[1])[0];

      return {
        found: true,
        price: parseFloat(mostCommon[0]),
        confidence: validPrices.length > 3 ? 'high' : 'medium',
        allPrices: validPrices
      };
    }

    return { found: false, reason: 'No price found in HTML' };
  } catch (err) {
    return { found: false, reason: err.message };
  }
}

/**
 * Search ASR forum for SINAD measurements
 */
async function searchASRMeasurement(unit) {
  try {
    const searchQuery = encodeURIComponent(`${unit.brand} ${unit.name} SINAD`);
    const searchUrl = `https://www.audiosciencereview.com/forum/index.php?search/${searchQuery}`;

    console.log(`  Searching ASR: ${searchUrl}`);
    // Note: ASR requires JavaScript, this is a placeholder
    // In practice, you'd need Puppeteer or manual verification

    return { found: false, reason: 'ASR requires manual verification (JavaScript site)' };
  } catch (err) {
    return { found: false, reason: err.message };
  }
}

/**
 * Research a single combo unit
 */
async function researchComboUnit(unit, tier) {
  console.log(`\n📊 Researching: ${unit.brand} ${unit.name} (${tier})`);
  console.log(`   Estimated: $${unit.estimatedPrice}`);

  const result = {
    brand: unit.brand,
    name: unit.name,
    category: 'dac_amp',
    tier,
    estimatedPrice: unit.estimatedPrice,
    verifiedPrice: null,
    powerOutput: unit.powerOutput || null,
    asrSinad: unit.asrSinad || null,
    soundSignature: unit.soundSignature,
    formFactor: unit.formFactor,
    features: unit.features || [],
    manufacturerUrl: unit.manufacturerUrl || null,
    researchStatus: 'pending',
    notes: []
  };

  // Check manufacturer price
  const manufacturerCheck = await checkManufacturerPrice(unit);
  if (manufacturerCheck.found) {
    result.verifiedPrice = manufacturerCheck.price;
    result.researchStatus = 'verified';
    result.notes.push(`Manufacturer price: $${manufacturerCheck.price} (${manufacturerCheck.confidence} confidence)`);
    console.log(`   ✅ Found price: $${manufacturerCheck.price}`);
  } else {
    result.notes.push(`Manufacturer check failed: ${manufacturerCheck.reason}`);
    console.log(`   ⚠️  Manufacturer check: ${manufacturerCheck.reason}`);
  }

  // Check ASR (placeholder - requires manual verification)
  if (!unit.asrSinad) {
    const asrCheck = await searchASRMeasurement(unit);
    result.notes.push(asrCheck.reason);
  }

  // Wait to avoid rate limiting
  await new Promise(resolve => setTimeout(resolve, 2000));

  return result;
}

/**
 * Main research function
 */
async function main() {
  const args = process.argv.slice(2);
  const tierFilter = args.find(arg => arg.startsWith('--tier='))?.split('=')[1];
  const exportFormat = args.find(arg => arg.startsWith('--export='))?.split('=')[1];

  console.log('🔍 Combo DAC/Amp Research Script');
  console.log('==================================\n');

  const tiersToResearch = tierFilter
    ? [tierFilter]
    : ['dongle', 'budgetPortable', 'budgetDesktop', 'mid', 'high'];

  const allResults = {};

  for (const tier of tiersToResearch) {
    if (!COMBO_UNITS[tier]) {
      console.error(`❌ Unknown tier: ${tier}`);
      continue;
    }

    console.log(`\n📁 Tier: ${tier.toUpperCase()}`);
    console.log(`   Units to research: ${COMBO_UNITS[tier].length}`);

    const results = [];
    for (const unit of COMBO_UNITS[tier]) {
      const result = await researchComboUnit(unit, tier);
      results.push(result);
    }

    allResults[tier] = results;
  }

  // Export results
  const timestamp = new Date().toISOString().split('T')[0];
  const outputPath = `./data/combo-research-results-${timestamp}.json`;

  writeFileSync(outputPath, JSON.stringify(allResults, null, 2));
  console.log(`\n✅ Research complete! Results saved to: ${outputPath}`);

  // Generate summary
  console.log('\n📊 SUMMARY');
  console.log('==========');
  for (const [tier, results] of Object.entries(allResults)) {
    const verified = results.filter(r => r.researchStatus === 'verified').length;
    console.log(`${tier}: ${verified}/${results.length} verified`);
  }

  // Generate manual research TODO list
  console.log('\n📝 MANUAL VERIFICATION NEEDED:');
  for (const [tier, results] of Object.entries(allResults)) {
    const unverified = results.filter(r => r.researchStatus === 'pending');
    if (unverified.length > 0) {
      console.log(`\n${tier.toUpperCase()}:`);
      unverified.forEach(u => {
        console.log(`  - ${u.brand} ${u.name} ($${u.estimatedPrice} est.)`);
        console.log(`    URLs to check:`);
        if (u.manufacturerUrl) console.log(`      Manufacturer: ${u.manufacturerUrl}`);
        console.log(`      Amazon: https://www.amazon.com/s?k=${encodeURIComponent(u.brand + ' ' + u.name)}`);
        console.log(`      ASR: https://www.audiosciencereview.com/forum/index.php?search/${encodeURIComponent(u.brand + ' ' + u.name)}`);
      });
    }
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
}

export { COMBO_UNITS, researchComboUnit };
