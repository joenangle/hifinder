#!/usr/bin/env node

/**
 * Import ASR components from JSON file to database
 *
 * Usage:
 *   node scripts/import-asr-json.js --dry-run    # Preview changes
 *   node scripts/import-asr-json.js --execute    # Import to database
 */

require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse command line arguments
const isDryRun = process.argv.includes('--dry-run');
const isExecute = process.argv.includes('--execute');
const jsonFile = process.argv.find(arg => arg.endsWith('.json')) ||
                 'scripts/asr-crawler/output/asr-components-2025-10-09.json';

if (!isDryRun && !isExecute) {
  console.error('❌ Error: Must specify --dry-run or --execute');
  console.error('   Usage: node scripts/import-asr-json.js [--dry-run|--execute] [file.json]');
  process.exit(1);
}

console.log('🎵 ASR Component Importer\n');
console.log(`📋 Mode: ${isDryRun ? 'DRY RUN (preview only)' : 'EXECUTE (will modify database)'}`);
console.log(`📂 File: ${jsonFile}\n`);

// Load JSON data
const components = JSON.parse(fs.readFileSync(jsonFile, 'utf-8'));
console.log(`📊 Loaded ${components.length} components from JSON\n`);

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function main() {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  const results = [];

  for (const component of components) {
    const { brand, name, category, asr_sinad, price_new, power_output, asr_review_url, source } = component;

    // Check if component already exists
    const { data: existing, error: searchError } = await supabase
      .from('components')
      .select('id, brand, name, category, asr_sinad, price_new, updated_at')
      .eq('brand', brand)
      .eq('name', name)
      .maybeSingle();

    if (searchError) {
      console.error(`   ✗ Error checking ${brand} ${name}: ${searchError.message}`);
      continue;
    }

    if (existing) {
      // Component exists - decide whether to update
      const shouldUpdate = !existing.asr_sinad || // No SINAD yet
                          (asr_sinad && asr_sinad > existing.asr_sinad) || // Better SINAD
                          !existing.price_new; // No price yet

      if (shouldUpdate && isExecute) {
        const { error: updateError } = await supabase
          .from('components')
          .update({
            asr_sinad: asr_sinad || existing.asr_sinad,
            asr_review_url,
            price_new: price_new || existing.price_new,
            power_output: power_output || existing.power_output,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) {
          console.error(`   ✗ Error updating ${brand} ${name}: ${updateError.message}`);
        } else {
          updated++;
          console.log(`   ✓ Updated: ${brand} ${name}`);
          results.push({ action: 'updated', brand, name, category, price_new, asr_sinad });
        }
      } else if (shouldUpdate) {
        console.log(`   ⊙ Would update: ${brand} ${name}`);
        results.push({ action: 'would_update', brand, name, category, price_new, asr_sinad });
        updated++;
      } else {
        skipped++;
        console.log(`   ⊘ Skipped: ${brand} ${name} (no new data)`);
      }
    } else {
      // Component doesn't exist - insert it
      if (isExecute) {
        const budgetTier = categorizeBudgetTier(price_new);
        console.log(`   DEBUG: ${brand} ${name} - price: $${price_new}, tier: ${budgetTier}`);

        const { error: insertError } = await supabase
          .from('components')
          .insert({
            brand,
            name,
            category,
            asr_sinad,
            asr_review_url,
            price_new,
            price_used_min: price_new ? Math.round(price_new * 0.7) : null,
            price_used_max: price_new ? Math.round(price_new * 0.85) : null,
            power_output,
            source: source || 'asr_manual_import',
            budget_tier: budgetTier,
            // Required fields with sensible defaults
            sound_signature: 'neutral',
            use_cases: ['music', 'gaming'],
            impedance: null,
            needs_amp: false,
            amazon_url: null,
            why_recommended: `ASR reviewed with ${asr_sinad ? `${asr_sinad} dB SINAD` : 'excellent measurements'}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          console.error(`   ✗ Error inserting ${brand} ${name}: ${insertError.message}`);
        } else {
          inserted++;
          console.log(`   ✓ Inserted: ${brand} ${name} - $${price_new} (${category})`);
          results.push({ action: 'inserted', brand, name, category, price_new, asr_sinad });
        }
      } else {
        console.log(`   ⊕ Would insert: ${brand} ${name} - $${price_new} (${category})`);
        results.push({ action: 'would_insert', brand, name, category, price_new, asr_sinad });
        inserted++;
      }
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Import Summary');
  console.log('='.repeat(60));
  console.log(`   Total components processed: ${components.length}`);
  console.log(`   ${isDryRun ? 'Would insert' : 'Inserted'}: ${inserted}`);
  console.log(`   ${isDryRun ? 'Would update' : 'Updated'}: ${updated}`);
  console.log(`   Skipped (no new data): ${skipped}`);
  console.log('');

  if (isDryRun) {
    console.log('💡 This was a DRY RUN. No changes were made to the database.');
    console.log('   Run with --execute to perform the actual import.\n');
  } else {
    console.log('✅ Import complete!\n');
  }

  // Show breakdown by category
  const breakdown = {
    dac: results.filter(r => r.category === 'dac' && r.action.includes('insert')).length,
    amp: results.filter(r => r.category === 'amp' && r.action.includes('insert')).length,
    dac_amp: results.filter(r => r.category === 'dac_amp' && r.action.includes('insert')).length
  };

  console.log('📦 New components by category:');
  console.log(`   DACs: ${breakdown.dac}`);
  console.log(`   Amps: ${breakdown.amp}`);
  console.log(`   DAC/Amp combos: ${breakdown.dac_amp}`);
  console.log('');

  // Show price distribution
  const newComponents = results.filter(r => r.action.includes('insert'));
  if (newComponents.length > 0) {
    const prices = newComponents.map(c => c.price_new).filter(p => p !== null);
    const avgPrice = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    const maxPrice = Math.max(...prices);
    const minPrice = Math.min(...prices);

    console.log('💰 Price distribution (new components):');
    console.log(`   Min: $${minPrice}`);
    console.log(`   Avg: $${avgPrice}`);
    console.log(`   Max: $${maxPrice}`);
    console.log('');
  }

  // Show SINAD distribution
  const sinadComponents = newComponents.filter(c => c.asr_sinad !== null);
  if (sinadComponents.length > 0) {
    const avgSinad = Math.round(sinadComponents.reduce((a, c) => a + c.asr_sinad, 0) / sinadComponents.length);
    console.log('📈 SINAD measurements:');
    console.log(`   Components with SINAD: ${sinadComponents.length}/${newComponents.length}`);
    console.log(`   Average SINAD: ${avgSinad} dB`);
    console.log('');
  }
}

/**
 * Categorize budget tier based on price
 * Database uses: 'Entry Level' | 'Mid Range' | 'High End' | 'Summit-Fi'
 */
function categorizeBudgetTier(price) {
  if (!price) return null;
  if (price < 300) return 'Entry Level';
  if (price < 600) return 'Mid Range';
  if (price < 1500) return 'High End';
  return 'Summit-Fi';
}

// Run the import
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
