#!/usr/bin/env node
/**
 * Amplifier Price Verification Helper
 *
 * This script helps verify and update amplifier pricing data.
 * Use this to manually check prices against manufacturer/retailer websites.
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  red: '\x1b[31m'
};

// Common retailer URLs for manual price checking
const RETAILERS = {
  schiit: 'https://www.schiit.com',
  jdslabs: 'https://jdslabs.com',
  topping: 'https://www.toppingaudio.com',
  drop: 'https://drop.com',
  headphones: 'https://www.headphones.com',
  amazon: 'https://www.amazon.com',
  audio46: 'https://audio46.com'
};

async function loadResearchData() {
  const filePath = path.join(__dirname, '../data/headphone-amps-2026-research.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  return data;
}

async function getCurrentDbAmps() {
  const { data, error } = await supabase
    .from('components')
    .select('*')
    .eq('category', 'amp')
    .order('price_new', { ascending: true });

  if (error) {
    console.error('Error fetching amps:', error);
    return [];
  }
  return data;
}

function printRetailerLinks(brand) {
  console.log(`\n${colors.cyan}Suggested Retailer Links:${colors.reset}`);

  const brandLower = brand.toLowerCase();
  if (brandLower.includes('schiit')) {
    console.log(`  → ${RETAILERS.schiit}/products`);
  } else if (brandLower.includes('jds')) {
    console.log(`  → ${RETAILERS.jdslabs}/products`);
  } else if (brandLower.includes('topping')) {
    console.log(`  → ${RETAILERS.topping}`);
  }

  console.log(`  → ${RETAILERS.drop}/search?q=${encodeURIComponent(brand)}`);
  console.log(`  → ${RETAILERS.headphones}/search?q=${encodeURIComponent(brand)}`);
  console.log(`  → ${RETAILERS.amazon}/s?k=${encodeURIComponent(brand + ' headphone amp')}`);
}

async function showPriceVerificationChecklist() {
  console.log(`\n${colors.bright}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}  Amplifier Price Verification Checklist${colors.reset}`);
  console.log(`${colors.bright}═══════════════════════════════════════════════════════${colors.reset}\n`);

  const researchData = await loadResearchData();
  const dbAmps = await getCurrentDbAmps();

  // Create a map of existing amps
  const dbMap = new Map();
  dbAmps.forEach(amp => {
    const key = `${amp.brand}-${amp.name}`.toLowerCase();
    dbMap.set(key, amp);
  });

  // Categorize amps
  const needsVerification = researchData.filter(amp => {
    const key = `${amp.brand}-${amp.name}`.toLowerCase();
    return !dbMap.has(key);
  });

  // Show summary
  console.log(`${colors.green}Current Database:${colors.reset} ${dbAmps.length} amps`);
  console.log(`${colors.yellow}Needs Adding:${colors.reset} ${needsVerification.length} amps\n`);

  // Group by price tier
  const tiers = {
    budget: needsVerification.filter(a => a.price_new < 150),
    mid: needsVerification.filter(a => a.price_new >= 150 && a.price_new < 500),
    high: needsVerification.filter(a => a.price_new >= 500 && a.price_new < 1500),
    summit: needsVerification.filter(a => a.price_new >= 1500)
  };

  console.log(`${colors.bright}By Price Tier:${colors.reset}`);
  console.log(`  Budget ($50-$150):    ${colors.yellow}${tiers.budget.length} amps${colors.reset}`);
  console.log(`  Mid ($150-$500):      ${colors.yellow}${tiers.mid.length} amps${colors.reset}`);
  console.log(`  High ($500-$1500):    ${colors.yellow}${tiers.high.length} amps${colors.reset}`);
  console.log(`  Summit ($1500+):      ${colors.yellow}${tiers.summit.length} amps${colors.reset}`);

  return { researchData, dbAmps, needsVerification, tiers };
}

async function showDetailedList() {
  const { needsVerification } = await showPriceVerificationChecklist();

  console.log(`\n${colors.bright}═══════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}  Detailed List - Amps Needing Verification${colors.reset}`);
  console.log(`${colors.bright}═══════════════════════════════════════════════════════${colors.reset}\n`);

  needsVerification.forEach((amp, index) => {
    const tier = amp.price_new < 150 ? 'BUDGET' :
                 amp.price_new < 500 ? 'MID' :
                 amp.price_new < 1500 ? 'HIGH' : 'SUMMIT';

    console.log(`${colors.bright}${index + 1}. ${amp.brand} ${amp.name}${colors.reset}`);
    console.log(`   Price: ${colors.green}$${amp.price_new}${colors.reset} (${tier})`);
    console.log(`   Power: ${amp.power_output || 'TBD'}`);
    console.log(`   SINAD: ${amp.asr_sinad ? `${amp.asr_sinad} dB` : 'Not measured'}`);
    console.log(`   Signature: ${amp.sound_signature || 'unknown'}`);
    console.log(`   Balanced: ${amp.balanced ? 'Yes' : 'No'}`);
    if (amp.notes) {
      console.log(`   ${colors.cyan}Notes: ${amp.notes}${colors.reset}`);
    }
    printRetailerLinks(amp.brand);
    console.log('');
  });
}

async function generateImportScript() {
  const researchData = await loadResearchData();

  const scriptContent = `#!/usr/bin/env node
/**
 * Import Verified Amplifier Data
 *
 * BEFORE RUNNING:
 * 1. Manually verify all prices in headphone-amps-2026-research.json
 * 2. Update the JSON file with current prices
 * 3. Change status from "needs_verification" to "verified"
 * 4. Run with --execute flag to import
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const ampsToImport = ${JSON.stringify(researchData, null, 2)};

async function importAmps() {
  const executeMode = process.argv.includes('--execute');

  console.log('🔊 Amplifier Import Script');
  console.log(executeMode ? '⚠️  EXECUTE MODE - Will modify database' : '👀 DRY RUN - No changes will be made');
  console.log('');

  let imported = 0;
  let updated = 0;
  let skipped = 0;

  for (const amp of ampsToImport) {
    // Only import verified amps
    if (amp.status !== 'verified') {
      console.log(\`⏭️  Skipped (not verified): \${amp.brand} \${amp.name}\`);
      skipped++;
      continue;
    }

    // Check if amp already exists
    const { data: existing } = await supabase
      .from('components')
      .select('id, price_new')
      .eq('brand', amp.brand)
      .eq('name', amp.name)
      .eq('category', 'amp')
      .single();

    if (existing) {
      // Update existing amp
      if (executeMode) {
        const { error } = await supabase
          .from('components')
          .update({
            price_new: amp.price_new,
            power_output: amp.power_output,
            asr_sinad: amp.asr_sinad,
            sound_signature: amp.sound_signature,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (error) {
          console.log(\`❌ Error updating \${amp.brand} \${amp.name}:\`, error);
        } else {
          console.log(\`✅ Updated: \${amp.brand} \${amp.name} ($\${existing.price_new} → $\${amp.price_new})\`);
          updated++;
        }
      } else {
        console.log(\`📝 Would update: \${amp.brand} \${amp.name} ($\${existing.price_new} → $\${amp.price_new})\`);
      }
    } else {
      // Insert new amp
      if (executeMode) {
        const { error } = await supabase
          .from('components')
          .insert({
            brand: amp.brand,
            name: amp.name,
            category: 'amp',
            price_new: amp.price_new,
            power_output: amp.power_output,
            asr_sinad: amp.asr_sinad,
            sound_signature: amp.sound_signature,
            source: 'manual_research_2026',
            created_at: new Date().toISOString()
          });

        if (error) {
          console.log(\`❌ Error importing \${amp.brand} \${amp.name}:\`, error);
        } else {
          console.log(\`➕ Imported: \${amp.brand} \${amp.name} ($\${amp.price_new})\`);
          imported++;
        }
      } else {
        console.log(\`📝 Would import: \${amp.brand} \${amp.name} ($\${amp.price_new})\`);
      }
    }
  }

  console.log('');
  console.log('═══════════════════════════════════════════');
  console.log(\`Summary:\`);
  console.log(\`  Imported: \${imported}\`);
  console.log(\`  Updated: \${updated}\`);
  console.log(\`  Skipped: \${skipped}\`);
  console.log('═══════════════════════════════════════════');

  if (!executeMode) {
    console.log('');
    console.log('ℹ️  This was a dry run. Run with --execute to apply changes.');
  }
}

importAmps();
`;

  const scriptPath = path.join(__dirname, 'import-verified-amps.js');
  fs.writeFileSync(scriptPath, scriptContent);
  fs.chmodSync(scriptPath, '755');

  console.log(`\n${colors.green}✅ Generated import script:${colors.reset}`);
  console.log(`   ${scriptPath}\n`);
  console.log(`${colors.bright}Next steps:${colors.reset}`);
  console.log('   1. Manually verify prices in data/headphone-amps-2026-research.json');
  console.log('   2. Change "status" from "needs_verification" to "verified" for each amp');
  console.log('   3. Run: node scripts/import-verified-amps.js (dry run)');
  console.log('   4. Run: node scripts/import-verified-amps.js --execute (actual import)\n');
}

// Main CLI
const args = process.argv.slice(2);
const command = args[0];

async function main() {
  switch (command) {
    case 'summary':
      await showPriceVerificationChecklist();
      break;

    case 'list':
      await showDetailedList();
      break;

    case 'generate':
      await generateImportScript();
      break;

    default:
      console.log(`${colors.bright}Amplifier Price Verification Helper${colors.reset}\n`);
      console.log('Usage:');
      console.log('  node scripts/verify-amp-prices.js summary   - Show verification summary');
      console.log('  node scripts/verify-amp-prices.js list      - Show detailed amp list');
      console.log('  node scripts/verify-amp-prices.js generate  - Generate import script\n');
      console.log('Workflow:');
      console.log('  1. Run "summary" to see what needs verification');
      console.log('  2. Run "list" to get detailed info with retailer links');
      console.log('  3. Manually verify prices and update JSON file');
      console.log('  4. Run "generate" to create import script');
      console.log('  5. Execute import script to add to database\n');
      break;
  }
}

main();
