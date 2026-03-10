#!/usr/bin/env node
// Classify sound signatures from Crinacle FR curves
// Uses median-reference approach: compute median FR per category (IEM/headphones),
// then classify each model based on deviation from that median.
// This is rig-independent — no need for exact Harman target calibration.
//
// Usage: node scripts/enrichment/classify-fr-signatures.js [--dry-run]

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const DRY_RUN = process.argv.includes('--dry-run');
const FR_DIR = path.resolve(__dirname, '../../data/crinacle-fr-samples');
const MATCH_REPORT = path.resolve(__dirname, '../../data/crinacle-match-report.json');
const OUTPUT_JSON = path.resolve(__dirname, '../../data/fr-classifications.json');
const OUTPUT_SQL = path.resolve(__dirname, 'output/update-fr-signatures.sql');

// ─── Thresholds (dB relative to median) ──────────────────────────────────────

const T = {
  ELEVATED: 2.0,
  SLIGHTLY_ELEVATED: 1.0,
  SLIGHTLY_RECESSED: -1.0,
  RECESSED: -2.0,
  SCOOP_THRESHOLD: 2.0,
  MILD_SCOOP: 1.0,
  HARMAN_LIKE: 1.0,
};

// ─── Frequency Bands ─────────────────────────────────────────────────────────

const BANDS = [
  { name: 'sub_bass', low: 20, high: 60 },
  { name: 'bass', low: 60, high: 200 },
  { name: 'low_mids', low: 200, high: 500 },
  { name: 'mids', low: 500, high: 2000 },
  { name: 'upper_mids', low: 2000, high: 5000 },
  { name: 'treble', low: 5000, high: 10000 },
  { name: 'air', low: 10000, high: 20000 },
];

// ─── Channel Averaging ───────────────────────────────────────────────────────

function averageChannels(channels) {
  const keys = Object.keys(channels);
  const first = channels[keys[0]].full;
  const length = first.length;
  const freqs = first.map((p) => p[0]);
  const avgSpl = new Array(length).fill(0);

  for (const key of keys) {
    const ch = channels[key].full;
    for (let i = 0; i < length; i++) {
      avgSpl[i] += ch[i][1];
    }
  }
  for (let i = 0; i < length; i++) {
    avgSpl[i] /= keys.length;
  }
  return { freqs, avgSpl };
}

// ─── Normalization (to 500-1kHz reference) ───────────────────────────────────

function normalizeToMidrange(freqs, spl) {
  let sum = 0, count = 0;
  for (let i = 0; i < freqs.length; i++) {
    if (freqs[i] >= 500 && freqs[i] <= 1000) {
      sum += spl[i];
      count++;
    }
  }
  const midAvg = sum / count;
  return spl.map((v) => v - midAvg);
}

// ─── Median Computation ──────────────────────────────────────────────────────

function computeMedianCurve(curves) {
  // curves: array of { freqs, normalizedSpl }
  const length = curves[0].normalizedSpl.length;
  const median = new Array(length);

  for (let i = 0; i < length; i++) {
    const values = curves.map((c) => c.normalizedSpl[i]).sort((a, b) => a - b);
    const mid = Math.floor(values.length / 2);
    median[i] = values.length % 2 === 0
      ? (values[mid - 1] + values[mid]) / 2
      : values[mid];
  }
  return median;
}

// ─── Band Deviation ──────────────────────────────────────────────────────────

function computeBandDeviations(freqs, normalizedSpl, medianSpl) {
  const deviations = {};
  for (const band of BANDS) {
    let sum = 0, count = 0;
    for (let i = 0; i < freqs.length; i++) {
      if (freqs[i] >= band.low && freqs[i] < band.high) {
        sum += normalizedSpl[i] - medianSpl[i];
        count++;
      }
    }
    deviations[band.name] = count > 0 ? sum / count : 0;
  }
  return deviations;
}

// ─── Classification ──────────────────────────────────────────────────────────

function classify(dev) {
  const bassElev = (dev.sub_bass + dev.bass) / 2;
  const upperEnergy = (dev.upper_mids + dev.treble) / 2;
  const trebleElev = (dev.treble + dev.air) / 2;
  const midScoop = (bassElev + upperEnergy) / 2 - (dev.low_mids + dev.mids) / 2;

  const metrics = { bassElev, upperEnergy, trebleElev, midScoop };

  let signature, confidence;

  if (bassElev >= T.ELEVATED && upperEnergy >= T.SLIGHTLY_ELEVATED && midScoop >= T.SCOOP_THRESHOLD) {
    signature = 'v-shaped';
    confidence = Math.min(bassElev - T.ELEVATED, midScoop - T.SCOOP_THRESHOLD);
  } else if (
    (bassElev >= T.SLIGHTLY_ELEVATED && trebleElev <= T.RECESSED && upperEnergy <= T.SLIGHTLY_RECESSED) ||
    (trebleElev <= T.RECESSED && upperEnergy <= T.SLIGHTLY_RECESSED)
  ) {
    // Dark: bass-elevated + treble-recessed, OR just heavily treble-recessed
    signature = 'dark';
    confidence = Math.abs(trebleElev - T.RECESSED);
  } else if (upperEnergy >= T.SLIGHTLY_ELEVATED && bassElev < T.SLIGHTLY_ELEVATED) {
    signature = 'bright';
    confidence = upperEnergy - T.SLIGHTLY_ELEVATED;
  } else if (bassElev >= T.SLIGHTLY_ELEVATED && upperEnergy < T.SLIGHTLY_ELEVATED && trebleElev <= 0) {
    signature = 'warm';
    confidence = bassElev - T.SLIGHTLY_ELEVATED;
  } else if (bassElev >= T.SLIGHTLY_ELEVATED && upperEnergy >= T.SLIGHTLY_ELEVATED && midScoop >= T.MILD_SCOOP) {
    signature = 'fun';
    confidence = Math.min(bassElev - T.SLIGHTLY_ELEVATED, midScoop - T.MILD_SCOOP);
  } else {
    signature = 'neutral';
    confidence = T.SLIGHTLY_ELEVATED - Math.max(Math.abs(bassElev), Math.abs(upperEnergy));
  }

  let confLevel;
  if (confidence >= 1.5) confLevel = 'high';
  else if (confidence >= 0.5) confLevel = 'medium';
  else confLevel = 'low';

  return { signature, confLevel, metrics };
}

// ─── Detail Descriptor ───────────────────────────────────────────────────────

function generateDetail(signature, dev, metrics) {
  const parts = [];

  const maxDev = Math.max(...Object.values(dev).map(Math.abs));
  if (maxDev < T.HARMAN_LIKE) {
    return 'Neutral (near-median)';
  }

  switch (signature) {
    case 'neutral':
      if (metrics.bassElev > 0.8) parts.push('Warm neutral');
      else if (metrics.upperEnergy > 0.8) parts.push('Bright neutral');
      else parts.push('Neutral');
      break;
    case 'warm':
      if (metrics.midScoop >= T.MILD_SCOOP) parts.push('Warm V-shape');
      else if (dev.bass >= T.ELEVATED) parts.push('Warm, bass-boosted');
      else parts.push('Warm');
      break;
    case 'bright':
      if (dev.air >= T.SLIGHTLY_ELEVATED) parts.push('Bright and airy');
      else if (dev.upper_mids >= T.ELEVATED) parts.push('Bright, forward');
      else parts.push('Bright');
      break;
    case 'v-shaped':
      if (dev.bass >= T.ELEVATED + 1) parts.push('V-shaped, bass-heavy');
      else parts.push('V-shaped');
      break;
    case 'dark':
      if (dev.bass >= T.ELEVATED) parts.push('Dark, bassy');
      else parts.push('Dark');
      break;
    case 'fun':
      if (metrics.bassElev >= T.ELEVATED) parts.push('Fun, bass-boosted');
      else parts.push('Fun V-shape');
      break;
  }

  if (signature !== 'dark' && dev.air <= T.RECESSED) parts.push('treble-rolled');
  if (signature !== 'bright' && dev.upper_mids >= T.ELEVATED) parts.push('sibilant-prone');
  if (signature !== 'warm' && signature !== 'dark' && (dev.low_mids + dev.mids) / 2 >= T.SLIGHTLY_ELEVATED) {
    parts.push('mid-forward');
  }

  return parts.join(', ');
}

// ─── Main ────────────────────────────────────────────────────────────────────

const matchReport = JSON.parse(fs.readFileSync(MATCH_REPORT, 'utf8'));
const iemIds = new Set((matchReport.iem?.matches || []).map((m) => m.db_id));
const hpIds = new Set((matchReport.headphones?.matches || []).map((m) => m.db_id));
const allMatches = [...(matchReport.iem?.matches || []), ...(matchReport.headphones?.matches || [])];

function lookupDbId(dbMatch) {
  const match = allMatches.find((m) => m.db_name === dbMatch || m.catalog === dbMatch);
  return match?.db_id || null;
}

// Phase 1: Load all FR data and compute median curves per category
const files = fs.readdirSync(FR_DIR).filter((f) => f.endsWith('.json'));
const loaded = [];

for (const file of files) {
  const data = JSON.parse(fs.readFileSync(path.join(FR_DIR, file), 'utf8'));
  const dbId = data.db_id || lookupDbId(data.db_match);
  if (!dbId) continue;

  let category;
  if (iemIds.has(dbId)) category = 'iem';
  else if (hpIds.has(dbId)) category = 'headphones';
  else category = Object.keys(data.channels).length <= 2 ? 'iem' : 'headphones';

  const { freqs, avgSpl } = averageChannels(data.channels);
  const normalizedSpl = normalizeToMidrange(freqs, avgSpl);

  loaded.push({ file, data, dbId, category, freqs, normalizedSpl });
}

const iemCurves = loaded.filter((l) => l.category === 'iem');
const hpCurves = loaded.filter((l) => l.category === 'headphones');

console.log(`Loaded: ${iemCurves.length} IEMs, ${hpCurves.length} headphones`);

const iemMedian = computeMedianCurve(iemCurves);
const hpMedian = computeMedianCurve(hpCurves);

// Phase 2: Classify each model against its category median
const results = [];
const distribution = {};
const confDist = { high: 0, medium: 0, low: 0 };

for (const item of loaded) {
  const medianSpl = item.category === 'iem' ? iemMedian : hpMedian;
  const deviations = computeBandDeviations(item.freqs, item.normalizedSpl, medianSpl);
  const { signature, confLevel, metrics } = classify(deviations);
  const detail = generateDetail(signature, deviations, metrics);

  distribution[signature] = (distribution[signature] || 0) + 1;
  confDist[confLevel]++;

  results.push({
    db_id: item.dbId,
    name: item.data.db_match || item.data.name,
    file: item.file,
    category: item.category,
    band_deviations: Object.fromEntries(
      Object.entries(deviations).map(([k, v]) => [k, Math.round(v * 100) / 100])
    ),
    composite_metrics: Object.fromEntries(
      Object.entries(metrics).map(([k, v]) => [k, Math.round(v * 100) / 100])
    ),
    derived_signature: signature,
    derived_signature_detail: detail,
    confidence: confLevel,
  });
}

// ─── Output ──────────────────────────────────────────────────────────────────

fs.writeFileSync(OUTPUT_JSON, JSON.stringify(results, null, 2));
console.log(`\nClassifications written to: ${OUTPUT_JSON}`);

function escapeSQL(str) {
  return str.replace(/'/g, "''");
}

const sqlStatements = results.map(
  (r) =>
    `UPDATE components SET derived_signature = '${r.derived_signature}', derived_signature_detail = '${escapeSQL(r.derived_signature_detail)}' WHERE id = '${r.db_id}';`
);

fs.mkdirSync(path.dirname(OUTPUT_SQL), { recursive: true });
const sqlContent = [
  '-- Auto-generated: Update FR-derived sound signatures',
  `-- Generated: ${new Date().toISOString()}`,
  `-- Classified: ${results.length}`,
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

// Summary
console.log('\n── Distribution ──');
for (const [sig, count] of Object.entries(distribution).sort((a, b) => b[1] - a[1])) {
  const pct = ((count / results.length) * 100).toFixed(1);
  const bar = '█'.repeat(Math.round(count / 2));
  console.log(`  ${sig.padEnd(10)} ${String(count).padStart(3)} (${pct}%) ${bar}`);
}

console.log('\n── Confidence ──');
for (const [level, count] of Object.entries(confDist)) {
  console.log(`  ${level.padEnd(8)} ${count}`);
}

console.log(`\n── Summary ──`);
console.log(`  Total: ${results.length}, Skipped: ${files.length - loaded.length}`);

// Spot-check well-known models
console.log('\n── Spot Checks ──');
const spotChecks = ['Sundara', 'Blessing 2', 'Aria', 'Utopia', 'LCD', 'IE 600', 'IE 900', 'DT 900', 'Ananda', 'Edition XS'];
for (const name of spotChecks) {
  const r = results.find((r) => r.name.includes(name));
  if (r) {
    console.log(`  ${r.name.padEnd(30)} ${r.derived_signature.padEnd(10)} ${r.derived_signature_detail.padEnd(30)} bass=${r.composite_metrics.bassElev} upper=${r.composite_metrics.upperEnergy} scoop=${r.composite_metrics.midScoop}`);
  }
}

if (!DRY_RUN) {
  console.log('\nApplying signatures to database...');
  try {
    execSync(`npm run db -- -f ${OUTPUT_SQL}`, {
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '../..'),
    });
    console.log('Done! Signatures applied successfully.');
  } catch (e) {
    console.error('Failed to apply SQL:', e.message);
    process.exit(1);
  }
} else {
  console.log('\nDry run — SQL file written but not applied.');
}
