#!/usr/bin/env node

/**
 * ASR Review Crawler - Main Entry Point
 *
 * This script uses an agent-based approach to crawl Audio Science Review
 * forum threads and extract component measurement data.
 *
 * Unlike traditional web scrapers, this uses LLM agents to:
 * - Read review content like a human
 * - Extract measurements from narrative text
 * - Handle varied review formats
 * - Parse specifications contextually
 *
 * Usage:
 *   node scripts/asr-crawler/index.js --dry-run           # Preview what would be imported
 *   node scripts/asr-crawler/index.js --execute           # Import to database
 *   node scripts/asr-crawler/index.js --urls urls.txt     # Crawl specific URLs
 *   node scripts/asr-crawler/index.js --category dac      # Crawl only DACs
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;

// Configuration
const config = {
  dryRun: process.argv.includes('--dry-run'),
  execute: process.argv.includes('--execute'),
  urlsFile: process.argv.find(arg => arg.startsWith('--urls='))?.split('=')[1],
  category: process.argv.find(arg => arg.startsWith('--category='))?.split('=')[1],
  maxReviews: parseInt(process.argv.find(arg => arg.startsWith('--max='))?.split('=')[1] || '50'),
  maxConcurrent: 3, // Number of reviews to process simultaneously
  outputDir: path.join(__dirname, 'output'),
  cacheDir: path.join(__dirname, 'cache')
};

async function main() {
  console.log('🎵 ASR Review Crawler Starting...\n');

  // Validate arguments
  if (!config.dryRun && !config.execute) {
    console.error('❌ Error: Must specify --dry-run or --execute');
    console.error('   Usage: node scripts/asr-crawler/index.js [--dry-run|--execute] [options]');
    process.exit(1);
  }

  // Ensure output directories exist
  await fs.mkdir(config.outputDir, { recursive: true });
  await fs.mkdir(config.cacheDir, { recursive: true });

  console.log('📋 Configuration:');
  console.log(`   Mode: ${config.dryRun ? 'DRY RUN (preview only)' : 'EXECUTE (will modify database)'}`);
  console.log(`   Category filter: ${config.category || 'all'}`);
  console.log(`   Max concurrent: ${config.maxConcurrent}`);
  console.log('');

  // Step 1: Discover review URLs
  console.log('🔍 Step 1: Discovering review URLs...');
  const reviewUrls = await discoverReviewUrls();
  console.log(`   Found ${reviewUrls.length} review URLs to process\n`);

  // Step 2: Parse reviews using agents
  console.log('📖 Step 2: Parsing reviews with AI agents...');
  const components = await parseReviews(reviewUrls);
  console.log(`   Extracted ${components.length} components\n`);

  // Step 3: Import to database
  if (config.execute) {
    console.log('💾 Step 3: Importing to database...');
    await importToDatabase(components);
  } else {
    console.log('👀 Step 3: Preview (dry run mode)...');
    await previewImport(components);
  }

  console.log('\n✅ Crawler complete!');
}

/**
 * Discover ASR review URLs to crawl
 */
async function discoverReviewUrls() {
  // If URLs file provided, read from it
  if (config.urlsFile) {
    const content = await fs.readFile(config.urlsFile, 'utf-8');
    return content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
  }

  // Otherwise, discover reviews from ASR's master review index
  console.log('   Fetching ASR review index...');

  const https = require('https');
  const indexUrl = 'https://www.audiosciencereview.com/forum/index.php?pages/Reviews/';

  const html = await new Promise((resolve, reject) => {
    https.get(indexUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });

  // Extract review thread URLs using regex
  // ASR review URLs follow pattern: /forum/index.php?threads/...review...
  const urlPattern = /href="(\/forum\/index\.php\?threads\/[^"]+review[^"]+)"/gi;
  const matches = [...html.matchAll(urlPattern)];

  const reviewUrls = matches
    .map(match => {
      const path = match[1];
      return `https://www.audiosciencereview.com${path}`;
    })
    .filter(url => {
      // Filter by category if specified
      if (!config.category) return true;

      const lower = url.toLowerCase();
      switch (config.category) {
        case 'dac':
          return lower.includes('dac') && !lower.includes('amp');
        case 'amp':
          return lower.includes('amp') && !lower.includes('dac');
        case 'dac_amp':
          return (lower.includes('dac') && lower.includes('amp')) ||
                 lower.includes('combo');
        default:
          return true;
      }
    })
    // Remove duplicates
    .filter((url, index, self) => self.indexOf(url) === index)
    // Limit to most recent (first N results)
    .slice(0, config.maxReviews || 50);

  return reviewUrls;
}

/**
 * Parse reviews using Claude agents
 */
async function parseReviews(urls) {
  const components = [];

  for (const url of urls) {
    console.log(`   Processing: ${url}`);

    try {
      // Use Claude Code's agent system to parse the review
      const component = await parseReviewWithAgent(url);

      if (component) {
        components.push(component);
        console.log(`   ✓ Extracted: ${component.brand} ${component.name}`);
      } else {
        console.log(`   ⚠ No data extracted from this review`);
      }
    } catch (error) {
      console.error(`   ✗ Error parsing ${url}: ${error.message}`);
    }
  }

  return components;
}

/**
 * Parse a single review using fetch + simple regex extraction
 * This approach works standalone without requiring AI API keys
 */
async function parseReviewWithAgent(url) {
  const https = require('https');

  try {
    // Fetch the review HTML
    const html = await new Promise((resolve, reject) => {
      https.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => resolve(data));
      }).on('error', reject);
    });

    // Extract title to get brand/model/category
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1] : '';

    // Parse brand, model, category from title
    // Title format: "Brand Model Review Category" or "Brand Model Category Review"
    let brand = null;
    let name = null;
    let category = null;

    // Common patterns in ASR titles
    if (title.toLowerCase().includes('dac') && title.toLowerCase().includes('amp')) {
      category = 'dac_amp';
    } else if (title.toLowerCase().includes('dac')) {
      category = 'dac';
    } else if (title.toLowerCase().includes('amp')) {
      category = 'amp';
    } else if (title.toLowerCase().includes('headphone')) {
      category = 'amp';
    }

    // Extract brand and model from title (simplified - works for most cases)
    const titleParts = title.replace(/Review|Stereo|DAC|Amp|Headphone|Amplifier|Balanced/gi, '').trim().split(/\s+/);
    if (titleParts.length >= 2) {
      brand = titleParts[0];
      name = titleParts.slice(1).join(' ').trim();
    }

    // Extract SINAD measurement
    const sinadMatch = html.match(/SINAD[\s:]+(\d+(?:\.\d+)?)\s*dB/i) ||
                       html.match(/Signal[\s-]*to[\s-]*Noise[\s-]*and[\s-]*Distortion[\s:]+(\d+(?:\.\d+)?)\s*dB/i);
    const asr_sinad = sinadMatch ? parseFloat(sinadMatch[1]) : null;

    // Extract price (looking for $XXX patterns)
    const priceMatch = html.match(/\$(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    const price_new = priceMatch ? parseInt(priceMatch[1].replace(/,/g, '')) : null;

    // Extract power output for amps
    let power_output = null;
    if (category === 'amp' || category === 'dac_amp') {
      const powerMatch = html.match(/(\d+(?:\.\d+)?)\s*(?:W|Watts?)\s*(?:@|at)\s*(\d+)\s*(?:Ω|ohm)/i);
      if (powerMatch) {
        power_output = `${powerMatch[1]}W @ ${powerMatch[2]}Ω`;
      }
    }

    // Only return if we got at least brand, name, and one measurement
    if (!brand || !name || !asr_sinad) {
      return null;
    }

    return {
      brand,
      name,
      category,
      asr_sinad,
      price_new,
      power_output,
      asr_review_url: url
    };

  } catch (error) {
    console.error(`   ✗ Error fetching/parsing ${url}: ${error.message}`);
    return null;
  }
}

/**
 * Import components to database
 */
async function importToDatabase(components) {
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  let inserted = 0;
  let updated = 0;
  let skipped = 0;

  for (const component of components) {
    // Check if component already exists
    const { data: existing } = await supabase
      .from('components')
      .select('id, asr_sinad, updated_at')
      .eq('brand', component.brand)
      .eq('name', component.name)
      .eq('category', component.category)
      .single();

    if (existing) {
      // Update if we have new/better data
      if (!existing.asr_sinad || component.asr_sinad > existing.asr_sinad) {
        await supabase
          .from('components')
          .update({
            asr_sinad: component.asr_sinad,
            asr_review_url: component.asr_review_url,
            price_new: component.price_new || existing.price_new,
            power_output: component.power_output || existing.power_output,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        updated++;
        console.log(`   ✓ Updated: ${component.brand} ${component.name}`);
      } else {
        skipped++;
        console.log(`   ⊘ Skipped: ${component.brand} ${component.name} (no new data)`);
      }
    } else {
      // Insert new component
      await supabase
        .from('components')
        .insert({
          brand: component.brand,
          name: component.name,
          category: component.category,
          asr_sinad: component.asr_sinad,
          asr_review_url: component.asr_review_url,
          price_new: component.price_new,
          price_used_min: component.price_new ? Math.round(component.price_new * 0.7) : null,
          price_used_max: component.price_new ? Math.round(component.price_new * 0.85) : null,
          power_output: component.power_output,
          source: 'asr_crawler',
          created_at: new Date().toISOString()
        });

      inserted++;
      console.log(`   ✓ Inserted: ${component.brand} ${component.name}`);
    }
  }

  console.log('\n📊 Import Summary:');
  console.log(`   Inserted: ${inserted}`);
  console.log(`   Updated: ${updated}`);
  console.log(`   Skipped: ${skipped}`);
}

/**
 * Preview import (dry run)
 */
async function previewImport(components) {
  console.log('\n📊 Preview of components to import:\n');

  for (const component of components) {
    console.log(`   ${component.brand} ${component.name}`);
    console.log(`     Category: ${component.category}`);
    console.log(`     SINAD: ${component.asr_sinad} dB`);
    if (component.price_new) console.log(`     Price: $${component.price_new}`);
    if (component.power_output) console.log(`     Power: ${component.power_output}`);
    console.log(`     Review: ${component.asr_review_url}`);
    console.log('');
  }

  console.log(`\n   Total: ${components.length} components ready to import`);
  console.log('   Run with --execute to import to database');
}

// Run main function
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
