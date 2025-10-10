#!/usr/bin/env node

/**
 * Import headphone impedance and sensitivity data from CSV
 *
 * Usage:
 *   node scripts/import-headphone-specs.js --dry-run
 *   node scripts/import-headphone-specs.js --execute
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Parse command line arguments
const isDryRun = process.argv.includes('--dry-run');
const isExecute = process.argv.includes('--execute');
const csvFile = process.argv.find(arg => arg.endsWith('.csv')) || 'data/headphone-specs-import.csv';

if (!isDryRun && !isExecute) {
  console.error('❌ Error: Must specify --dry-run or --execute');
  console.error('   Usage: node scripts/import-headphone-specs.js [--dry-run|--execute] [file.csv]');
  process.exit(1);
}

console.log('🎧 Headphone Specs Importer\n');
console.log(`📋 Mode: ${isDryRun ? 'DRY RUN (preview only)' : 'EXECUTE (will modify database)'}`);
console.log(`📂 File: ${csvFile}\n`);

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Simple CSV parser (handles comments with #)
function parseCSV(content) {
  const lines = content.split('\n').filter(line => {
    const trimmed = line.trim();
    return trimmed && !trimmed.startsWith('#');
  });

  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    if (values.length === headers.length) {
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || null;
      });
      rows.push(row);
    }
  }

  return rows;
}

async function main() {
  // Load and parse CSV
  const csvContent = fs.readFileSync(csvFile, 'utf-8');
  const specs = parseCSV(csvContent);

  console.log(`📊 Loaded ${specs.length} headphone specs from CSV\n`);

  let updated = 0;
  let notFound = 0;
  let skipped = 0;
  const results = [];

  for (const spec of specs) {
    const { brand, model, impedance, sensitivity_type, sensitivity_value, driver_type, notes, ...extraFields } = spec;

    // Skip if missing critical data
    if (!brand || !model) {
      skipped++;
      continue;
    }

    // Find matching component in database
    const { data: matches, error: searchError } = await supabase
      .from('components')
      .select('id, brand, name, impedance, sensitivity_db_mw, sensitivity_db_v, driver_type, technical_specs')
      .eq('brand', brand)
      .ilike('name', `%${model}%`);  // Fuzzy match on name

    if (searchError) {
      console.error(`   ✗ Error searching ${brand} ${model}: ${searchError.message}`);
      continue;
    }

    if (!matches || matches.length === 0) {
      notFound++;
      console.log(`   ⊘ Not found: ${brand} ${model}`);
      continue;
    }

    // If multiple matches, try to find exact match first, otherwise take the shortest name (most specific)
    let existing;
    if (matches.length > 1) {
      existing = matches.find(m => m.name.toLowerCase() === model.toLowerCase()) ||
                 matches.sort((a, b) => a.name.length - b.name.length)[0];
      console.log(`   ⚠ Multiple matches for ${brand} ${model}, using: ${existing.name}`);
    } else {
      existing = matches[0];
    }

    // Prepare update data
    const updateData = {};

    if (impedance && !existing.impedance) {
      updateData.impedance = parseInt(impedance);
    }

    if ((sensitivity_type === 'dB/mW' || sensitivity_type === 'dB/1mW') && sensitivity_value) {
      updateData.sensitivity_db_mw = parseFloat(sensitivity_value);
    } else if (sensitivity_type === 'dB/V' && sensitivity_value) {
      updateData.sensitivity_db_v = parseFloat(sensitivity_value);
    }

    if (driver_type && !existing.driver_type) {
      updateData.driver_type = driver_type;
    }

    // Build technical_specs JSON from extra CSV columns
    const technicalSpecs = {};
    const knownColumns = ['brand', 'model', 'impedance', 'sensitivity_type', 'sensitivity_value', 'driver_type', 'notes'];

    for (const [key, value] of Object.entries(extraFields)) {
      if (value && value.trim && value.trim() !== '') {
        // Convert key from snake_case/kebab-case to camelCase for JSON
        const jsonKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        technicalSpecs[jsonKey] = value;
      }
    }

    // Merge with existing technical_specs if any
    if (Object.keys(technicalSpecs).length > 0) {
      const existingSpecs = existing.technical_specs || {};
      updateData.technical_specs = { ...existingSpecs, ...technicalSpecs };
    }

    // Skip if no updates needed
    if (Object.keys(updateData).length === 0) {
      skipped++;
      console.log(`   ⊘ Skipped: ${brand} ${model} (already has data)`);
      continue;
    }

    if (isExecute) {
      const { error: updateError } = await supabase
        .from('components')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);

      if (updateError) {
        console.error(`   ✗ Error updating ${brand} ${model}: ${updateError.message}`);
      } else {
        updated++;
        const summary = [];
        if (updateData.impedance) summary.push(`${updateData.impedance}Ω`);
        if (updateData.sensitivity_db_mw) summary.push(`${updateData.sensitivity_db_mw} dB/mW`);
        if (updateData.sensitivity_db_v) summary.push(`${updateData.sensitivity_db_v} dB/V`);
        if (updateData.driver_type) summary.push(updateData.driver_type);

        console.log(`   ✓ Updated: ${brand} ${existing.name} → ${summary.join(', ')}`);
        results.push({ brand, model: existing.name, updates: updateData });
      }
    } else {
      updated++;
      const summary = [];
      if (updateData.impedance) summary.push(`${updateData.impedance}Ω`);
      if (updateData.sensitivity_db_mw) summary.push(`${updateData.sensitivity_db_mw} dB/mW`);
      if (updateData.sensitivity_db_v) summary.push(`${updateData.sensitivity_db_v} dB/V`);
      if (updateData.driver_type) summary.push(updateData.driver_type);

      console.log(`   ⊙ Would update: ${brand} ${existing.name} → ${summary.join(', ')}`);
      results.push({ brand, model: existing.name, updates: updateData });
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Import Summary');
  console.log('='.repeat(60));
  console.log(`   Total specs in CSV: ${specs.length}`);
  console.log(`   ${isDryRun ? 'Would update' : 'Updated'}: ${updated}`);
  console.log(`   Not found in database: ${notFound}`);
  console.log(`   Skipped (already has data): ${skipped}`);
  console.log('');

  if (isDryRun) {
    console.log('💡 This was a DRY RUN. No changes were made to the database.');
    console.log('   Run with --execute to perform the actual import.\n');
  } else {
    console.log('✅ Import complete!\n');
  }

  // Show breakdown
  if (results.length > 0) {
    const withImpedance = results.filter(r => r.updates.impedance).length;
    const withSensitivity = results.filter(r => r.updates.sensitivity_db_mw || r.updates.sensitivity_db_v).length;
    const withDriver = results.filter(r => r.updates.driver_type).length;

    console.log('📦 Data added:');
    console.log(`   Impedance: ${withImpedance} headphones`);
    console.log(`   Sensitivity: ${withSensitivity} headphones`);
    console.log(`   Driver type: ${withDriver} headphones`);
    console.log('');

    // Show examples
    console.log('📝 Sample updates:');
    results.slice(0, 10).forEach(r => {
      const summary = [];
      if (r.updates.impedance) summary.push(`${r.updates.impedance}Ω`);
      if (r.updates.sensitivity_db_mw) summary.push(`${r.updates.sensitivity_db_mw} dB/mW`);
      if (r.updates.sensitivity_db_v) summary.push(`${r.updates.sensitivity_db_v} dB/V`);
      console.log(`   ${r.brand} ${r.model}: ${summary.join(', ')}`);
    });
  }

  if (notFound > 0) {
    console.log(`\n⚠️  ${notFound} headphones from CSV not found in database`);
    console.log('   These may need to be added first or have different naming');
  }
}

// Run the import
main().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});
