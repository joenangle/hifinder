const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  // Get ALL cans and IEMs
  const { data: all } = await supabase.from('components')
    .select('brand, name, category, sensitivity_db_mw, sensitivity_db_v, impedance, source')
    .in('category', ['cans', 'iems'])
    .order('category')
    .order('brand');

  const hasMw = all.filter(d => d.sensitivity_db_mw !== null);
  const hasV = all.filter(d => d.sensitivity_db_v !== null);
  const hasEither = all.filter(d => d.sensitivity_db_mw !== null || d.sensitivity_db_v !== null);
  const hasNeither = all.filter(d => d.sensitivity_db_mw === null && d.sensitivity_db_v === null);
  const hasImpedance = all.filter(d => d.impedance !== null);

  console.log('=== SENSITIVITY GAP ANALYSIS (ALL cans + IEMs) ===\n');
  console.log(`Total cans/IEMs in DB: ${all.length}`);
  console.log(`  Cans:  ${all.filter(d => d.category === 'cans').length}`);
  console.log(`  IEMs:  ${all.filter(d => d.category === 'iems').length}`);
  console.log('');
  console.log(`Has sensitivity_db_mw:  ${hasMw.length} (${(hasMw.length/all.length*100).toFixed(0)}%)`);
  console.log(`Has sensitivity_db_v:   ${hasV.length} (${(hasV.length/all.length*100).toFixed(0)}%)`);
  console.log(`Has either:             ${hasEither.length} (${(hasEither.length/all.length*100).toFixed(0)}%)`);
  console.log(`Has NEITHER (gap):      ${hasNeither.length} (${(hasNeither.length/all.length*100).toFixed(0)}%)`);
  console.log(`Has impedance:          ${hasImpedance.length} (${(hasImpedance.length/all.length*100).toFixed(0)}%)`);

  // Break down by source
  const sources = {};
  for (const d of all) {
    const src = d.source || 'unknown';
    if (!sources[src]) sources[src] = { total: 0, hasSens: 0, noSens: 0 };
    sources[src].total++;
    if (d.sensitivity_db_mw !== null || d.sensitivity_db_v !== null) {
      sources[src].hasSens++;
    } else {
      sources[src].noSens++;
    }
  }
  console.log('\n--- By Source ---');
  for (const [src, s] of Object.entries(sources).sort((a, b) => b[1].total - a[1].total)) {
    console.log(`  ${src.padEnd(30)} ${s.total} total, ${s.hasSens} have sens, ${s.noSens} missing`);
  }

  // Break down missing by category
  const missingCans = hasNeither.filter(d => d.category === 'cans');
  const missingIems = hasNeither.filter(d => d.category === 'iems');
  console.log(`\n--- Missing Sensitivity ---`);
  console.log(`  Cans missing: ${missingCans.length}`);
  console.log(`  IEMs missing: ${missingIems.length}`);

  // Show ones that DO have it, for sanity check
  console.log('\n--- Sample entries WITH sensitivity (verify these are accurate) ---');
  const sampleWith = hasEither.slice(0, 10);
  for (const d of sampleWith) {
    console.log(`  ${d.brand} ${d.name} (${d.category}): db/mW=${d.sensitivity_db_mw}, db/V=${d.sensitivity_db_v}, Z=${d.impedance}Ω [${d.source}]`);
  }

  // Check: how many missing sensitivity but HAVE impedance (could derive one from other)
  const missingBothSens = hasNeither.filter(d => d.impedance !== null);
  console.log(`\n--- Derivation potential ---`);
  console.log(`  Missing sensitivity but HAVE impedance: ${missingBothSens.length}`);
  console.log(`  (If we find db/mW, we can calculate db/V from impedance, and vice versa)`);
  console.log(`  Formula: dB/V = dB/mW + 10*log10(Z/1000)`);

  // List ALL missing, grouped
  console.log('\n--- ALL cans missing sensitivity ---');
  missingCans.forEach(d => console.log(`  ${d.brand} ${d.name} (Z=${d.impedance || '?'}Ω) [${d.source}]`));
  console.log('\n--- ALL IEMs missing sensitivity ---');
  missingIems.forEach(d => console.log(`  ${d.brand} ${d.name} (Z=${d.impedance || '?'}Ω) [${d.source}]`));
}

check().catch(console.error);
