#!/usr/bin/env node

/**
 * Fix Sundara duplicate entries in the database
 *
 * Problem: 3 Sundara entries exist with brand name inconsistencies:
 * 1. "Sundara" by "Hifiman" (has Crinacle data) - KEEP
 * 2. "Sundara" by "HiFiMAN" (no data) - DELETE
 * 3. "Sundara (2020)" by "HiFiMAN" (no data) - RESEARCH NEEDED
 *
 * This script:
 * - Standardizes brand name to "HiFiMAN" for consistency
 * - Deletes the duplicate entry without data
 * - Keeps Sundara (2020) as it may be a legitimate revision
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixSundaraDuplicates() {
  console.log('🔍 Analyzing Sundara entries...\n');

  // Get all Sundara entries
  const { data: sundaras, error: fetchError } = await supabase
    .from('components')
    .select('*')
    .ilike('name', '%sundara%')
    .order('name');

  if (fetchError) {
    console.error('❌ Error fetching Sundaras:', fetchError);
    return;
  }

  console.log(`Found ${sundaras.length} Sundara entries:\n`);
  sundaras.forEach((s, i) => {
    console.log(`${i + 1}. "${s.name}" by "${s.brand}" (ID: ${s.id})`);
    console.log(`   Price: $${s.price_used_min}-$${s.price_used_max}`);
    console.log(`   Crinacle data: ${s.tone_grade || 'none'} / ${s.technical_grade || 'none'}`);
    console.log(`   Driver: ${s.driver_type || 'none'}, Fit: ${s.fit || 'none'}\n`);
  });

  const keepEntry = sundaras.find(s => s.id === '2c9584bb-8707-43a6-b3cd-db56cf6f6629');
  const deleteEntry = sundaras.find(s => s.id === '4dde0bfc-2fe4-45fa-bb4a-cbf5ccd66373');
  const sundara2020 = sundaras.find(s => s.id === 'a5179a0e-af89-408e-b95e-0ef0af45de7f');

  console.log('📋 Action Plan:');
  console.log('1. UPDATE: Standardize brand name "Hifiman" → "HiFiMAN" on entry with Crinacle data');
  console.log('2. DELETE: Remove duplicate "Sundara" by "HiFiMAN" (no data)');
  console.log('3. KEEP: "Sundara (2020)" - may be a legitimate revision\n');

  if (process.argv.includes('--execute')) {
    console.log('🔧 Executing fixes...\n');

    // 1. Update brand name to HiFiMAN
    const { error: updateError } = await supabase
      .from('components')
      .update({ brand: 'HiFiMAN' })
      .eq('id', keepEntry.id);

    if (updateError) {
      console.error('❌ Error updating brand name:', updateError);
      return;
    }
    console.log('✅ Updated brand name to "HiFiMAN"');

    // 2. Delete duplicate entry
    const { error: deleteError } = await supabase
      .from('components')
      .delete()
      .eq('id', deleteEntry.id);

    if (deleteError) {
      console.error('❌ Error deleting duplicate:', deleteError);
      return;
    }
    console.log('✅ Deleted duplicate Sundara entry');

    // Verify results
    const { data: remaining } = await supabase
      .from('components')
      .select('id, name, brand, tone_grade, technical_grade')
      .ilike('name', '%sundara%')
      .order('name');

    console.log('\n✅ Final state:');
    remaining.forEach(s => {
      console.log(`   - "${s.name}" by "${s.brand}" (${s.tone_grade || 'no data'})`);
    });

    console.log('\n✨ Sundara duplicates fixed!');
    console.log('\n💡 Note: "Sundara (2020)" was kept as it may be a legitimate revision.');
    console.log('   If it should have Crinacle data, research and add it separately.');
  } else {
    console.log('🔍 DRY RUN - no changes made');
    console.log('Run with --execute to apply changes');
  }
}

fixSundaraDuplicates().catch(console.error);
