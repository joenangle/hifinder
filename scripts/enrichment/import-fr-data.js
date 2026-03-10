#!/usr/bin/env node
// Import Crinacle FR data into the components table
// Usage: node scripts/enrichment/import-fr-data.js [--dry-run]

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DRY_RUN = process.argv.includes('--dry-run');
const FR_DIR = path.resolve(__dirname, '../../data/crinacle-fr-samples');
const MATCH_REPORT = path.resolve(__dirname, '../../data/crinacle-match-report.json');
const OUTPUT_SQL = path.resolve(__dirname, 'output/import-fr-data.sql');

// Load match report for db_id lookups (files missing db_id)
const matchReport = JSON.parse(fs.readFileSync(MATCH_REPORT, 'utf8'));
const allMatches = [
  ...(matchReport.iem?.matches || []),
  ...(matchReport.headphones?.matches || []),
];

function lookupDbId(dbMatch) {
  const match = allMatches.find(
    (m) => m.db_name === dbMatch || m.catalog === dbMatch
  );
  return match?.db_id || null;
}

function averageChannels(channels) {
  const channelKeys = Object.keys(channels);
  const numChannels = channelKeys.length;
  const firstChannel = channels[channelKeys[0]].full;
  const length = firstChannel.length;

  const averaged = [];
  for (let i = 0; i < length; i++) {
    const freq = firstChannel[i][0];
    let splSum = 0;
    for (const key of channelKeys) {
      splSum += channels[key].full[i][1];
    }
    // Round to 2 decimal places for compact storage
    averaged.push([
      Math.round(freq * 100) / 100,
      Math.round((splSum / numChannels) * 100) / 100,
    ]);
  }
  return { points: averaged, numChannels };
}

function escapeSQL(str) {
  return str.replace(/'/g, "''");
}

// Process all FR files
const files = fs.readdirSync(FR_DIR).filter((f) => f.endsWith('.json'));
const sqlStatements = [];
let processed = 0;
let skipped = 0;

for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(FR_DIR, file), 'utf8'));
  const dbId = data.db_id || lookupDbId(data.db_match);

  if (!dbId) {
    console.warn(`SKIP: No db_id for ${file} (db_match: ${data.db_match})`);
    skipped++;
    continue;
  }

  const { points, numChannels } = averageChannels(data.channels);
  const frData = {
    points,
    source: 'crinacle',
    channels: numChannels,
  };

  const jsonStr = escapeSQL(JSON.stringify(frData));
  sqlStatements.push(
    `UPDATE components SET fr_data = '${jsonStr}'::jsonb WHERE id = '${dbId}';`
  );
  processed++;
}

console.log(
  `\nProcessed: ${processed} files, Skipped: ${skipped}, Total: ${files.length}`
);

// Write SQL file
fs.mkdirSync(path.dirname(OUTPUT_SQL), { recursive: true });
const sqlContent = [
  '-- Auto-generated: Import Crinacle FR data into components table',
  `-- Generated: ${new Date().toISOString()}`,
  `-- Files processed: ${processed}`,
  '',
  'BEGIN;',
  '',
  ...sqlStatements,
  '',
  'COMMIT;',
  '',
].join('\n');

fs.writeFileSync(OUTPUT_SQL, sqlContent);
console.log(`SQL written to: ${OUTPUT_SQL}`);

if (!DRY_RUN) {
  console.log('\nApplying to database...');
  try {
    execSync(`npm run db -- -f ${OUTPUT_SQL}`, {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '../..'),
    });
    console.log('Done! FR data imported successfully.');
  } catch (e) {
    console.error('Failed to apply SQL:', e.message);
    process.exit(1);
  }
} else {
  console.log('\nDry run — SQL file written but not applied.');
}
