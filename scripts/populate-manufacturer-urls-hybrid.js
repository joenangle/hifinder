#!/usr/bin/env node

/**
 * Hybrid Manufacturer URL Finder (Test Version)
 *
 * Combines automated pattern-based URL generation with manual web search fallback.
 *
 * Phase 1: Try pattern-based URL generation and validation
 * Phase 2: For failures, export search queries for manual lookup
 *
 * Usage:
 *   node scripts/populate-manufacturer-urls-hybrid.js              # Test with 20 components
 *   node scripts/populate-manufacturer-urls-hybrid.js 50           # Test with 50 components
 *   node scripts/populate-manufacturer-urls-hybrid.js --execute    # Actually update database
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Brand-specific URL generation patterns
 */
const manufacturerPatterns = {
  'Sennheiser': (name) => {
    const slug = name.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    return `https://www.sennheiser.com/en-us/${slug}`;
  },
  'Hifiman': (name) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    return `https://hifiman.com/products/detail/${slug}`;
  },
  'Moondrop': (name) => {
    const slug = name.toLowerCase().replace(/\s+/g, '');
    return `https://www.moondroplab.com/en/product/${slug}`;
  },
  'Audio-Technica': (name) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    return `https://www.audio-technica.com/en-us/headphones/${slug}`;
  },
  'Beyerdynamic': (name) => {
    const slug = name.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    return `https://www.beyerdynamic.com/products/${slug}`;
  },
  'AKG': (name) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    return `https://www.akg.com/Headphones/${slug}.html`;
  },
  'Focal': (name) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    return `https://www.focal.com/en/headphones/${slug}`;
  },
  'Audeze': (name) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    return `https://www.audeze.com/products/${slug}`;
  },
  'Shure': (name) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    return `https://www.shure.com/en-US/products/earphones/${slug}`;
  },
  'Etymotic': (name) => {
    const slug = name.toLowerCase().replace(/\s+/g, '');
    return `https://www.etymotic.com/product/${slug}`;
  },
  'FiiO': (name) => {
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    return `https://www.fiio.com/products/${slug}`;
  },
  'Topping': (name) => {
    const slug = name.toUpperCase().replace(/\s+/g, '');
    return `https://www.toppingaudio.com/product-item/${slug}`;
  },
  'Schiit': (name) => {
    const slug = name.toLowerCase()
      .replace(/\+/g, 'plus')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    return `https://www.schiit.com/products/${slug}`;
  },
  'JDS Labs': (name) => {
    const slug = name.toLowerCase()
      .replace(/\+/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    return `https://jdslabs.com/product/${slug}`;
  },
};

/**
 * Manufacturer domain mapping for search queries
 */
const manufacturerDomains = {
  'Sennheiser': 'sennheiser.com',
  'Hifiman': 'hifiman.com',
  'Moondrop': 'moondroplab.com',
  'Audio-Technica': 'audio-technica.com',
  'Beyerdynamic': 'beyerdynamic.com',
  'AKG': 'akg.com',
  'Focal': 'focal.com',
  'Audeze': 'audeze.com',
  'Shure': 'shure.com',
  'Etymotic': 'etymotic.com',
  'FiiO': 'fiio.com',
  'Topping': 'toppingaudio.com',
  'Schiit': 'schiit.com',
  'JDS Labs': 'jdslabs.com',
  'Sony': 'sony.com',
  '64 Audio': '64audio.com',
  'Stax': 'stax.co.jp',
  'iFi': 'ifi-audio.com',
  'SMSL': 'smsl-audio.com',
  '7Hz': 'linsoul.com',
  'Thieaudio': 'linsoul.com',
};

/**
 * Validate URL by making HTTP HEAD request
 */
async function validateUrl(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    const options = {
      method: 'HEAD',
      timeout: 5000,
    };

    const req = protocol.request(url, options, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });

    req.on('error', () => resolve(false));
    req.on('timeout', () => {
      req.destroy();
      resolve(false);
    });

    req.end();
  });
}

/**
 * Normalize brand name for pattern matching
 */
function normalizeBrand(brand) {
  const brandMap = {
    'Audio Technica': 'Audio-Technica',
    'HiFiMAN': 'Hifiman',
  };
  return brandMap[brand] || brand;
}

/**
 * Generate manufacturer URL for a component
 */
function generateUrl(brand, name) {
  const normalizedBrand = normalizeBrand(brand);
  const pattern = manufacturerPatterns[normalizedBrand];

  if (!pattern) {
    return null;
  }

  return pattern(name);
}

/**
 * Generate search query for manual lookup
 */
function generateSearchQuery(brand, name) {
  const domain = manufacturerDomains[normalizeBrand(brand)];
  if (domain) {
    return `"${brand} ${name}" site:${domain}`;
  }
  return `"${brand} ${name}" official product page`;
}

/**
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  const limitArg = args.find(arg => !arg.startsWith('--'));
  const limit = parseInt(limitArg) || 20; // Default to 20 for testing
  const executeUpdates = args.includes('--execute');

  console.log(`🔍 Hybrid Manufacturer URL Finder (Testing with ${limit} components)\n`);
  console.log('Phase 1: Trying pattern-based URL generation...\n');

  // Query components without manufacturer URLs
  const { data: components, error } = await supabase
    .from('components')
    .select('id, brand, name, category, expert_grade_numeric, manufacturer_url')
    .is('manufacturer_url', null)
    .order('expert_grade_numeric', { ascending: false, nullsLast: true })
    .limit(limit);

  if (error) {
    console.error('❌ Error fetching components:', error);
    return;
  }

  console.log(`Found ${components.length} components to process\n`);

  const automaticSuccess = [];
  const automaticFailure = [];
  const needsManualSearch = [];

  // Phase 1: Try pattern-based approach
  for (const component of components) {
    const { id, brand, name, category } = component;

    // Generate URL
    const generatedUrl = generateUrl(brand, name);

    if (!generatedUrl) {
      console.log(`⏭️  ${brand} ${name}: No pattern available`);
      needsManualSearch.push({ ...component, reason: 'no_pattern' });
      continue;
    }

    // Validate URL
    console.log(`🔍 ${brand} ${name}`);
    console.log(`   Generated: ${generatedUrl}`);

    const isValid = await validateUrl(generatedUrl);

    if (isValid) {
      console.log(`   ✅ Valid\n`);
      automaticSuccess.push({ id, brand, name, url: generatedUrl, category });
    } else {
      console.log(`   ❌ Invalid (404 or timeout)\n`);
      automaticFailure.push({ ...component, generatedUrl });
      needsManualSearch.push({ ...component, reason: 'validation_failed' });
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Print Phase 1 Summary
  console.log('\n' + '='.repeat(80));
  console.log('PHASE 1 SUMMARY - Automatic Pattern-Based Approach');
  console.log('='.repeat(80) + '\n');

  console.log(`✅ Automatic success: ${automaticSuccess.length} (${Math.round(automaticSuccess.length / components.length * 100)}%)`);
  console.log(`❌ Validation failed: ${automaticFailure.length}`);
  console.log(`⏭️  No pattern available: ${needsManualSearch.filter(c => c.reason === 'no_pattern').length}\n`);

  if (automaticSuccess.length > 0) {
    console.log('✅ Automatically validated URLs by category:');
    const byCategory = automaticSuccess.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {});
    Object.entries(byCategory).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`);
    });
    console.log('');

    console.log('✅ By brand:');
    const byBrand = automaticSuccess.reduce((acc, item) => {
      acc[item.brand] = (acc[item.brand] || 0) + 1;
      return acc;
    }, {});
    Object.entries(byBrand)
      .sort((a, b) => b[1] - a[1])
      .forEach(([brand, count]) => {
        console.log(`  ${brand}: ${count}`);
      });
    console.log('');
  }

  // Phase 2: Export manual search queries for failures
  if (needsManualSearch.length > 0) {
    console.log('='.repeat(80));
    console.log('PHASE 2 - Manual Web Search Required');
    console.log('='.repeat(80) + '\n');

    console.log(`📋 ${needsManualSearch.length} components need manual search\n`);

    // Generate CSV for manual search
    const csvRows = [
      'ID,Brand,Model,Category,Search Query,Manufacturer URL,Notes'
    ];

    needsManualSearch.forEach(comp => {
      const query = generateSearchQuery(comp.brand, comp.name);
      const escapedQuery = `"${query.replace(/"/g, '""')}"`;
      const notes = comp.reason === 'no_pattern' ? 'No pattern available' : 'Pattern validation failed';

      csvRows.push([
        comp.id,
        comp.brand,
        comp.name,
        comp.category,
        escapedQuery,
        '',
        notes
      ].join(','));
    });

    const csvContent = csvRows.join('\n');
    const filename = `manufacturer-urls-manual-${Date.now()}.csv`;
    const filepath = path.join(process.cwd(), filename);

    fs.writeFileSync(filepath, csvContent);

    console.log(`✅ Exported manual search queries to: ${filename}\n`);
    console.log('📋 Next steps for manual URLs:');
    console.log('1. Open the CSV file');
    console.log('2. Search for each product using the provided query');
    console.log('3. Fill in the "Manufacturer URL" column');
    console.log('4. Import using: node scripts/find-manufacturer-urls-interactive.js import ' + filename + '\n');
  }

  // Execute automatic updates if requested
  if (executeUpdates && automaticSuccess.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 EXECUTING AUTOMATIC UPDATES');
    console.log('='.repeat(80) + '\n');

    let successCount = 0;
    let errorCount = 0;

    for (const { id, brand, name, url } of automaticSuccess) {
      const { error } = await supabase
        .from('components')
        .update({ manufacturer_url: url })
        .eq('id', id);

      if (error) {
        console.error(`❌ Failed to update ${brand} ${name}:`, error.message);
        errorCount++;
      } else {
        console.log(`✅ Updated ${brand} ${name}`);
        successCount++;
      }
    }

    console.log(`\n✅ Successfully updated ${successCount} components`);
    if (errorCount > 0) {
      console.log(`❌ Failed to update ${errorCount} components`);
    }
  } else if (automaticSuccess.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('SQL UPDATE STATEMENTS (Automatic URLs)');
    console.log('='.repeat(80) + '\n');

    automaticSuccess.forEach(({ id, brand, name, url }) => {
      console.log(`-- ${brand} ${name}`);
      console.log(`UPDATE components SET manufacturer_url = '${url}' WHERE id = '${id}';\n`);
    });

    console.log('\n💡 To execute these updates, run:');
    console.log(`   node scripts/populate-manufacturer-urls-hybrid.js ${limit} --execute\n`);
  }

  // Final summary
  console.log('\n' + '='.repeat(80));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(80) + '\n');

  console.log(`📊 Total components processed: ${components.length}`);
  console.log(`✅ Automatic validation: ${automaticSuccess.length} (${Math.round(automaticSuccess.length / components.length * 100)}%)`);
  console.log(`📋 Manual search needed: ${needsManualSearch.length} (${Math.round(needsManualSearch.length / components.length * 100)}%)`);

  if (executeUpdates && automaticSuccess.length > 0) {
    console.log(`\n🎉 Database updated with ${automaticSuccess.length} manufacturer URLs`);
  }

  console.log('\n💡 Recommended workflow:');
  console.log('1. Run this hybrid script to get automatic URLs (fast, free)');
  console.log('2. Use the exported CSV for manual searches (high accuracy)');
  console.log('3. Import manual URLs using find-manufacturer-urls-interactive.js');
  console.log('4. Repeat with larger batches (50, 100, etc.)\n');
}

// Run the script
main().catch(console.error);
