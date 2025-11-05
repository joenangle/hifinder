#!/usr/bin/env node

/**
 * Interactive Manufacturer URL Finder
 *
 * This script helps find accurate manufacturer product URLs using web search.
 * Since automated web scraping can be unreliable, this uses a hybrid approach:
 *
 * Phase 1: Generate search queries for manual lookup
 * Phase 2: Import results from CSV and update database
 *
 * Usage:
 *   node scripts/find-manufacturer-urls-interactive.js export              # Generate search queries CSV
 *   node scripts/find-manufacturer-urls-interactive.js import results.csv  # Import URLs from CSV
 *   node scripts/find-manufacturer-urls-interactive.js import results.csv --execute  # Actually update DB
 *
 * Workflow:
 * 1. Run with 'export' to generate a CSV with search queries
 * 2. Manually search for each product and fill in the URL column
 * 3. Run with 'import' to preview/execute database updates
 */

const { createClient } = require('@supabase/supabase-js');
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
 * Manufacturer domain mapping for site-specific searches
 */
const manufacturerDomains = {
  'Sennheiser': 'sennheiser.com',
  'HiFiMAN': 'hifiman.com',
  'Hifiman': 'hifiman.com',
  'Moondrop': 'moondroplab.com',
  'Audio-Technica': 'audio-technica.com',
  'Audio Technica': 'audio-technica.com',
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
  'Campfire Audio': 'campfireaudio.com',
  'Meze Audio': 'mezeaudio.com',
  'Fostex': 'fostex.jp',
  'Denon': 'denon.com',
  'Grado': 'gradolabs.com',
  'Drop': 'drop.com',
  'Sony': 'sony.com',
  'Apple': 'apple.com',
  'Bose': 'bose.com',
  'Beats': 'beatsbydre.com',
  '7Hz': 'linsoul.com',
  'Thieaudio': 'linsoul.com',
  'LETSHUOER': 'linsoul.com',
  'Tripowin': 'linsoul.com',
  'Chord Electronics': 'chordelectronics.co.uk',
  'RME': 'rme-audio.de',
  'Benchmark': 'benchmarkmedia.com',
  'Violectric': 'violectric.de',
  'Gustard': 'gustard.audio',
  'Denafrips': 'denafrips.com',
  'Mytek': 'mytekdigital.com',
  'Burson Audio': 'bursonaudio.com',
  'Monolith': 'monoprice.com',
  'THX': 'thx.com',
};

/**
 * Generate search query for finding manufacturer URL
 */
function generateSearchQuery(brand, model) {
  const domain = manufacturerDomains[brand];

  if (domain) {
    // Use site-specific search for better accuracy
    return `"${brand} ${model}" site:${domain}`;
  } else {
    // Fallback to general search
    return `"${brand} ${model}" official product page`;
  }
}

/**
 * Validate that a URL looks like a product page
 */
function validateProductUrl(url, brand, model) {
  if (!url || url.trim() === '') {
    return { valid: false, confidence: 0, reason: 'Empty URL' };
  }

  const urlLower = url.toLowerCase();
  const modelLower = model.toLowerCase().replace(/[^a-z0-9]/g, '');
  const domain = manufacturerDomains[brand];

  // Check if URL is from expected domain
  if (domain && !urlLower.includes(domain.toLowerCase())) {
    return { valid: true, confidence: 60, reason: 'Not from official domain' };
  }

  // Check if URL contains model identifier
  const urlPath = urlLower.replace(/[^a-z0-9]/g, '');
  if (urlPath.includes(modelLower) || modelLower.includes(urlPath.slice(-10))) {
    return { valid: true, confidence: 95, reason: 'High confidence - model in URL' };
  }

  // Check for product page indicators
  const productIndicators = ['/product', '/products', '/detail', '/headphones', '/earphones', '/iem', '/dac', '/amp'];
  const hasProductIndicator = productIndicators.some(ind => urlLower.includes(ind));

  if (hasProductIndicator) {
    return { valid: true, confidence: 75, reason: 'Medium confidence - product page pattern' };
  }

  // Exclude common non-product pages
  const excludePatterns = ['/support', '/press', '/news', '/blog', '/search', '/category', '/tag'];
  const isExcluded = excludePatterns.some(pat => urlLower.includes(pat));

  if (isExcluded) {
    return { valid: false, confidence: 0, reason: 'Excluded pattern (support/press/etc)' };
  }

  return { valid: true, confidence: 50, reason: 'Low confidence - generic URL' };
}

/**
 * Export search queries to CSV
 */
async function exportSearchQueries(limit = 100) {
  console.log('🔍 Fetching components without manufacturer URLs...\n');

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

  console.log(`Found ${components.length} components without URLs\n`);

  // Generate CSV content
  const csvRows = [
    'ID,Brand,Model,Category,Search Query,Manufacturer URL,Notes'
  ];

  components.forEach(comp => {
    const query = generateSearchQuery(comp.brand, comp.name);
    const escapedQuery = `"${query.replace(/"/g, '""')}"`;

    csvRows.push([
      comp.id,
      comp.brand,
      comp.name,
      comp.category,
      escapedQuery,
      '', // Empty URL to be filled in
      '' // Empty notes
    ].join(','));
  });

  const csvContent = csvRows.join('\n');
  const filename = `manufacturer-urls-search-${Date.now()}.csv`;
  const filepath = path.join(process.cwd(), filename);

  fs.writeFileSync(filepath, csvContent);

  console.log(`✅ Exported ${components.length} search queries to: ${filename}\n`);
  console.log('📋 Next steps:');
  console.log('1. Open the CSV file in a spreadsheet editor');
  console.log('2. For each row, copy the "Search Query" into Google/DuckDuckGo');
  console.log('3. Find the official product page and paste the URL in "Manufacturer URL" column');
  console.log('4. Add any notes (e.g., "discontinued", "404", "redirects") in Notes column');
  console.log('5. Save the CSV file');
  console.log(`6. Run: node scripts/find-manufacturer-urls-interactive.js import ${filename}\n`);

  console.log('💡 Tips:');
  console.log('- Look for URLs with /product, /products, /detail in the path');
  console.log('- Verify the URL contains the model name or number');
  console.log('- Prefer official manufacturer domains over retailers');
  console.log('- Leave blank if you can\'t find an official page\n');

  // Print sample queries
  console.log('🔎 Sample search queries:\n');
  components.slice(0, 5).forEach(comp => {
    console.log(`${comp.brand} ${comp.name}:`);
    console.log(`  ${generateSearchQuery(comp.brand, comp.name)}\n`);
  });
}

/**
 * Parse CSV file
 */
function parseCSV(filepath) {
  const content = fs.readFileSync(filepath, 'utf-8');
  const lines = content.split('\n').filter(line => line.trim());

  // Skip header
  const rows = lines.slice(1);

  return rows.map(line => {
    // Simple CSV parser (handles quoted fields)
    const fields = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());

    return {
      id: fields[0],
      brand: fields[1],
      model: fields[2],
      category: fields[3],
      searchQuery: fields[4],
      url: fields[5],
      notes: fields[6] || ''
    };
  }).filter(row => row.id); // Filter out empty rows
}

/**
 * Import URLs from CSV
 */
async function importURLs(filepath, execute = false) {
  if (!fs.existsSync(filepath)) {
    console.error(`❌ File not found: ${filepath}`);
    return;
  }

  console.log(`📥 Importing URLs from: ${filepath}\n`);

  const rows = parseCSV(filepath);
  console.log(`Found ${rows.length} rows in CSV\n`);

  const updates = [];
  const skipped = [];
  const validationStats = {
    high: 0,
    medium: 0,
    low: 0,
    invalid: 0
  };

  // Validate and prepare updates
  rows.forEach(row => {
    if (!row.url || row.url.trim() === '') {
      skipped.push({ ...row, reason: 'No URL provided' });
      return;
    }

    const validation = validateProductUrl(row.url, row.brand, row.model);

    if (!validation.valid) {
      skipped.push({ ...row, reason: validation.reason });
      validationStats.invalid++;
      return;
    }

    // Categorize by confidence
    if (validation.confidence >= 90) {
      validationStats.high++;
    } else if (validation.confidence >= 70) {
      validationStats.medium++;
    } else {
      validationStats.low++;
    }

    updates.push({
      id: row.id,
      brand: row.brand,
      model: row.model,
      url: row.url,
      confidence: validation.confidence,
      reason: validation.reason,
      notes: row.notes
    });
  });

  // Print summary
  console.log('='.repeat(80));
  console.log('VALIDATION SUMMARY');
  console.log('='.repeat(80) + '\n');

  console.log(`✅ Valid URLs: ${updates.length}`);
  console.log(`   - High confidence (90%+): ${validationStats.high}`);
  console.log(`   - Medium confidence (70-89%): ${validationStats.medium}`);
  console.log(`   - Low confidence (50-69%): ${validationStats.low}`);
  console.log(`❌ Skipped: ${skipped.length}\n`);

  if (updates.length > 0) {
    console.log('URLs by Category:');
    const byCategory = updates.reduce((acc, item) => {
      acc[item.brand] = (acc[item.brand] || 0) + 1;
      return acc;
    }, {});
    Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([brand, count]) => {
        console.log(`  ${brand}: ${count}`);
      });
    console.log('');
  }

  // Show low confidence URLs for manual review
  const lowConfidence = updates.filter(u => u.confidence < 70);
  if (lowConfidence.length > 0) {
    console.log('⚠️  Low confidence URLs (please review):');
    lowConfidence.forEach(({ brand, model, url, confidence, reason }) => {
      console.log(`  ${brand} ${model} (${confidence}%)`);
      console.log(`    URL: ${url}`);
      console.log(`    Reason: ${reason}\n`);
    });
  }

  // Generate SQL UPDATE statements
  if (updates.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('SQL UPDATE STATEMENTS');
    console.log('='.repeat(80) + '\n');

    updates.slice(0, 10).forEach(({ id, brand, model, url, confidence }) => {
      console.log(`-- ${brand} ${model} (${confidence}% confidence)`);
      console.log(`UPDATE components SET manufacturer_url = '${url}' WHERE id = '${id}';\n`);
    });

    if (updates.length > 10) {
      console.log(`... and ${updates.length - 10} more updates\n`);
    }
  }

  // Execute updates if requested
  if (execute && updates.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('🚀 EXECUTING DATABASE UPDATES');
    console.log('='.repeat(80) + '\n');

    let successCount = 0;
    let errorCount = 0;

    for (const { id, brand, model, url, confidence } of updates) {
      const { error } = await supabase
        .from('components')
        .update({ manufacturer_url: url })
        .eq('id', id);

      if (error) {
        console.error(`❌ Failed to update ${brand} ${model}:`, error.message);
        errorCount++;
      } else {
        console.log(`✅ Updated ${brand} ${model} (${confidence}%)`);
        successCount++;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`\n✅ Successfully updated ${successCount} components`);
    if (errorCount > 0) {
      console.log(`❌ Failed to update ${errorCount} components`);
    }
  } else if (!execute && updates.length > 0) {
    console.log('\n💡 To execute these updates, run:');
    console.log(`   node scripts/find-manufacturer-urls-interactive.js import ${filepath} --execute\n`);
  }

  // Show brands without domain mappings
  const unknownDomains = rows.filter(row => !manufacturerDomains[row.brand]);
  if (unknownDomains.length > 0) {
    const brandCounts = unknownDomains.reduce((acc, row) => {
      acc[row.brand] = (acc[row.brand] || 0) + 1;
      return acc;
    }, {});

    console.log('\n📝 Brands without domain mappings (add to manufacturerDomains):');
    Object.entries(brandCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([brand, count]) => {
        console.log(`  ${brand}: ${count} components`);
      });
    console.log('');
  }
}

/**
 * Show usage help
 */
function showHelp() {
  console.log(`
Interactive Manufacturer URL Finder
====================================

This script helps find accurate manufacturer product URLs using manual web search.

USAGE:

  1. Export search queries:
     node scripts/find-manufacturer-urls-interactive.js export [limit]

     Example: node scripts/find-manufacturer-urls-interactive.js export 50

  2. Import and preview results:
     node scripts/find-manufacturer-urls-interactive.js import <csv-file>

     Example: node scripts/find-manufacturer-urls-interactive.js import results.csv

  3. Import and execute updates:
     node scripts/find-manufacturer-urls-interactive.js import <csv-file> --execute

WORKFLOW:

  1. Run 'export' to generate a CSV with search queries
  2. Open CSV in spreadsheet editor (Excel, Google Sheets, etc.)
  3. For each row, search using the provided query
  4. Paste the official product page URL in the "Manufacturer URL" column
  5. Save the CSV
  6. Run 'import' to preview changes
  7. Run 'import --execute' to update database

TIPS:

  - Look for URLs with /product, /products, /detail in path
  - Verify URL contains the model name or number
  - Prefer official manufacturer domains over retailers
  - Leave blank if no official page exists
  - Use Notes column for context (e.g., "discontinued", "404")

VALIDATION:

  - High confidence (90%+): URL from official domain with model in path
  - Medium confidence (70-89%): URL from official domain, product page pattern
  - Low confidence (50-69%): Generic URL, manual review recommended

`);
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    showHelp();
    return;
  }

  if (command === 'export') {
    const limit = parseInt(args[1]) || 100;
    await exportSearchQueries(limit);
  } else if (command === 'import') {
    const filepath = args[1];
    if (!filepath) {
      console.error('❌ Please provide CSV file path');
      console.log('Usage: node scripts/find-manufacturer-urls-interactive.js import <csv-file>');
      return;
    }
    const execute = args.includes('--execute');
    await importURLs(filepath, execute);
  } else {
    console.error(`❌ Unknown command: ${command}`);
    showHelp();
  }
}

// Run the script
main().catch(console.error);
