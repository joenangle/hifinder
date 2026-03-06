#!/usr/bin/env node
/**
 * Gap Report — identifies missing data across the components database
 * Usage: node scripts/enrichment/gap-report.js [--category dac,amp,dac_amp] [--json]
 */

const { execSync } = require('child_process');
const { readFileSync } = require('fs');
const { resolve } = require('path');

// --- DB connection (reuses run-sql.js pattern) ---
const envFile = resolve(__dirname, '..', '..', '.env.local');
const lines = readFileSync(envFile, 'utf8').split('\n');
const get = (key) => {
  const line = lines.find((l) => l.startsWith(`${key}=`));
  return line ? line.slice(key.length + 1) : null;
};
const password = get('SUPABASE_DB_PASSWORD');
const dbUrl = get('DATABASE_URL');
if (!password || !dbUrl) {
  console.error('Missing SUPABASE_DB_PASSWORD or DATABASE_URL in .env.local');
  process.exit(1);
}

function runQuery(sql) {
  const result = execSync(
    `psql "${dbUrl}" -t -A -F '\t' -c '${sql.replace(/'/g, "'\"'\"'")}'`,
    { env: { ...process.env, PGPASSWORD: password }, encoding: 'utf8' }
  );
  return result.trim().split('\n').filter(Boolean).map(row => row.split('\t'));
}

// --- Parse args ---
const args = process.argv.slice(2);
const jsonOutput = args.includes('--json');
const catIdx = args.indexOf('--category');
const categories = catIdx !== -1 ? args[catIdx + 1].split(',') : null;

const catFilter = categories
  ? `AND category IN (${categories.map(c => `'${c}'`).join(',')})`
  : '';
const elecFilter = "AND category IN ('dac','amp','dac_amp')";

// --- Queries ---
const gaps = {
  sinad: {
    label: 'Missing SINAD measurements',
    query: `SELECT brand, name, category FROM components WHERE asr_sinad IS NULL ${elecFilter} ORDER BY category, brand, name`,
  },
  power_output: {
    label: 'Missing power output specs',
    query: `SELECT brand, name, category, power_output FROM components WHERE power_output IS NULL AND power_output_mw_32 IS NULL ${elecFilter} ORDER BY category, brand, name`,
  },
  power_structured: {
    label: 'Have string power_output but missing structured (mw_32/mw_300)',
    query: `SELECT brand, name, category, power_output FROM components WHERE power_output IS NOT NULL AND power_output_mw_32 IS NULL ${elecFilter} ORDER BY brand, name`,
  },
  images: {
    label: 'Missing product images',
    query: `SELECT brand, name, category FROM components WHERE image_url IS NULL ${catFilter} ORDER BY category, brand, name`,
  },
  retail_urls: {
    label: 'Missing retail URLs (no amazon_url AND no manufacturer_url)',
    query: `SELECT brand, name, category FROM components WHERE amazon_url IS NULL AND manufacturer_url IS NULL ${catFilter} ORDER BY category, brand, name`,
  },
  asr_url_only: {
    label: 'Have ASR review URL but no SINAD (likely version mismatch)',
    query: `SELECT brand, name, category, asr_review_url FROM components WHERE asr_review_url IS NOT NULL AND asr_sinad IS NULL ${elecFilter} ORDER BY brand, name`,
  },
};

// --- Run and display ---
const report = {};

for (const [key, { label, query }] of Object.entries(gaps)) {
  const rows = runQuery(query);
  report[key] = { label, count: rows.length, items: rows };
}

if (jsonOutput) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('\n=== HiFinder Data Gap Report ===\n');

  let totalGaps = 0;
  for (const [key, { label, count, items }] of Object.entries(report)) {
    console.log(`\n--- ${label} (${count}) ---`);
    totalGaps += count;
    if (count === 0) {
      console.log('  None!');
    } else if (count <= 30) {
      for (const row of items) {
        console.log(`  ${row[0]} ${row[1]} [${row[2]}]${row[3] ? ` — ${row[3]}` : ''}`);
      }
    } else {
      // Show first 15 and last 5
      for (const row of items.slice(0, 15)) {
        console.log(`  ${row[0]} ${row[1]} [${row[2]}]${row[3] ? ` — ${row[3]}` : ''}`);
      }
      console.log(`  ... (${count - 20} more)`);
      for (const row of items.slice(-5)) {
        console.log(`  ${row[0]} ${row[1]} [${row[2]}]${row[3] ? ` — ${row[3]}` : ''}`);
      }
    }
  }

  console.log(`\n=== Total gap items: ${totalGaps} ===\n`);
}
