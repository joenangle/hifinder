#!/usr/bin/env node

/**
 * Populate Manufacturer URLs Script
 *
 * Generates and validates manufacturer product page URLs for components
 * based on brand-specific URL patterns.
 *
 * Usage:
 *   node scripts/populate-manufacturer-urls.js              # Dry run (preview only)
 *   node scripts/populate-manufacturer-urls.js --execute    # Execute updates
 *   node scripts/populate-manufacturer-urls.js --validate   # Only validate existing URLs
 *
 * Features:
 * - Brand-specific URL patterns
 * - HTTP HEAD validation to verify URLs exist
 * - Dry-run mode for safe preview
 * - Focuses on popular components first
 * - Generates SQL UPDATE statements
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const http = require('http');

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
 * Each function receives the component name and returns the likely manufacturer URL
 */
const manufacturerPatterns = {
  'Sennheiser': (name) => {
    // Examples: HD 600 -> hd-600, HD650 -> hd-650, Momentum 3 -> momentum-3
    const slug = name.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    return `https://www.sennheiser.com/en-us/${slug}`;
  },

  'Hifiman': (name) => {
    // Examples: Sundara -> sundara, HE400se -> he400se
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    return `https://hifiman.com/products/detail/${slug}`;
  },

  'Moondrop': (name) => {
    // Examples: Blessing 2 -> blessing2, Aria -> aria
    const slug = name.toLowerCase().replace(/\s+/g, '');
    return `https://www.moondroplab.com/en/product/${slug}`;
  },

  'Audio-Technica': (name) => {
    // Examples: ATH-M50x -> ath-m50x, ATH-R70x -> ath-r70x
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    return `https://www.audio-technica.com/en-us/headphones/${slug}`;
  },

  'Beyerdynamic': (name) => {
    // Examples: DT 770 Pro -> dt-770-pro, DT990 -> dt-990
    const slug = name.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    return `https://www.beyerdynamic.com/products/${slug}`;
  },

  'AKG': (name) => {
    // Examples: K371 -> k371, K702 -> k702
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    return `https://www.akg.com/Headphones/${slug}.html`;
  },

  'Focal': (name) => {
    // Examples: Clear -> clear, Utopia -> utopia
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    return `https://www.focal.com/en/headphones/${slug}`;
  },

  'Audeze': (name) => {
    // Examples: LCD-2 -> lcd-2, LCD-X -> lcd-x
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    return `https://www.audeze.com/products/${slug}`;
  },

  'Drop': (name) => {
    // Examples: HD 6XX -> hd-6xx, HD 58X -> hd-58x
    const slug = name.toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    return `https://drop.com/buy/${slug}`;
  },

  'Shure': (name) => {
    // Examples: SRH1540 -> srh1540, SE846 -> se846
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    return `https://www.shure.com/en-US/products/earphones/${slug}`;
  },

  'Etymotic': (name) => {
    // Examples: ER2XR -> er2xr, ER4XR -> er4xr
    const slug = name.toLowerCase().replace(/\s+/g, '');
    return `https://www.etymotic.com/product/${slug}`;
  },

  '7Hz': (name) => {
    // Examples: Timeless -> timeless, Salnotes Zero -> salnotes-zero
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    return `https://www.linsoul.com/products/${slug}`;
  },

  'Thieaudio': (name) => {
    // Examples: Monarch -> monarch, Oracle -> oracle
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    return `https://www.linsoul.com/products/${slug}`;
  },

  'FiiO': (name) => {
    // Examples: FH5 -> fh5, FD5 -> fd5
    const slug = name.toLowerCase().replace(/\s+/g, '-');
    return `https://www.fiio.com/products/${slug}`;
  },

  'Topping': (name) => {
    // Examples: D90SE -> d90se, A90 -> a90
    const slug = name.toUpperCase().replace(/\s+/g, '');
    return `https://www.toppingaudio.com/product-item/${slug}`;
  },

  'Schiit': (name) => {
    // Examples: Magni 3+ -> magni-3-plus, Modi 3 -> modi-3
    const slug = name.toLowerCase()
      .replace(/\+/g, 'plus')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    return `https://www.schiit.com/products/${slug}`;
  },

  'JDS Labs': (name) => {
    // Examples: Atom Amp+ -> atom-amp, Element III -> element-iii
    const slug = name.toLowerCase()
      .replace(/\+/g, '')
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    return `https://jdslabs.com/product/${slug}`;
  },
};

/**
 * Validate URL by making HTTP HEAD request
 * Returns true if URL exists (200-399 status), false otherwise
 */
async function validateUrl(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    const options = {
      method: 'HEAD',
      timeout: 5000,
    };

    const req = protocol.request(url, options, (res) => {
      // Consider 200-399 as valid, including redirects
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
    'Hifiman': 'Hifiman',
    'JDS Labs': 'JDS Labs',
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
 * Main execution function
 */
async function main() {
  const args = process.argv.slice(2);
  const executeUpdates = args.includes('--execute');
  const validateOnly = args.includes('--validate');

  console.log('🔍 Fetching components from database...\n');

  // Query components without manufacturer URLs, ordered by popularity
  // (assuming more expert data = more popular/researched)
  const { data: components, error } = await supabase
    .from('components')
    .select('id, brand, name, category, expert_grade_numeric, manufacturer_url')
    .order('expert_grade_numeric', { ascending: false, nullsLast: true })
    .limit(200); // Focus on top 200 components

  if (error) {
    console.error('❌ Error fetching components:', error);
    return;
  }

  console.log(`Found ${components.length} components to process\n`);

  const updates = [];
  const validations = [];
  const skipped = [];

  for (const component of components) {
    const { id, brand, name, category, manufacturer_url } = component;

    // Skip if URL already exists and not in validate mode
    if (manufacturer_url && !validateOnly) {
      continue;
    }

    // Generate URL
    const generatedUrl = generateUrl(brand, name);

    if (!generatedUrl) {
      skipped.push({ brand, name, reason: 'No pattern available' });
      continue;
    }

    // Validate URL
    console.log(`Validating: ${brand} ${name}`);
    console.log(`  URL: ${generatedUrl}`);

    const isValid = await validateUrl(generatedUrl);

    if (isValid) {
      console.log(`  ✅ Valid\n`);
      updates.push({ id, brand, name, url: generatedUrl, category });
    } else {
      console.log(`  ❌ Invalid (404 or timeout)\n`);
      validations.push({ brand, name, url: generatedUrl, status: 'invalid' });
    }

    // Rate limiting - wait 500ms between requests
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80) + '\n');

  console.log(`✅ Valid URLs found: ${updates.length}`);
  console.log(`❌ Invalid URLs: ${validations.length}`);
  console.log(`⏭️  Skipped (no pattern): ${skipped.length}\n`);

  if (updates.length > 0) {
    console.log('Valid URLs by Category:');
    const byCategory = updates.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {});
    Object.entries(byCategory).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}`);
    });
    console.log('');
  }

  // Generate SQL UPDATE statements
  if (updates.length > 0 && !validateOnly) {
    console.log('SQL UPDATE Statements:');
    console.log('='.repeat(80) + '\n');

    updates.forEach(({ id, brand, name, url }) => {
      console.log(`-- ${brand} ${name}`);
      console.log(`UPDATE components SET manufacturer_url = '${url}' WHERE id = '${id}';\n`);
    });
  }

  // Execute updates if requested
  if (executeUpdates && updates.length > 0) {
    console.log('\n🚀 Executing database updates...\n');

    let successCount = 0;
    let errorCount = 0;

    for (const { id, brand, name, url } of updates) {
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
  } else if (!executeUpdates && updates.length > 0) {
    console.log('\n💡 To execute these updates, run:');
    console.log('   node scripts/populate-manufacturer-urls.js --execute\n');
  }

  // Show brands that need pattern development
  if (skipped.length > 0) {
    console.log('\nBrands needing URL patterns:');
    const brandCounts = skipped.reduce((acc, item) => {
      acc[item.brand] = (acc[item.brand] || 0) + 1;
      return acc;
    }, {});
    Object.entries(brandCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([brand, count]) => {
        console.log(`  ${brand}: ${count} components`);
      });
  }
}

// Run the script
main().catch(console.error);
