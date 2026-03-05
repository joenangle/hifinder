#!/usr/bin/env node

/**
 * Consolidate Sundara entries into a single canonical record
 *
 * Current state (from diagnostic):
 * - 2c9584bb: "Sundara" by "Hifiman" — has Crinacle data (A+ tone, B tech), 12 listings
 * - a5179a0e: "Sundara (2020)" by "HiFiMAN" — no expert data, 0 listings, used by curated_systems
 *
 * Actions:
 * 1. Standardize brand "Hifiman" → "HiFiMAN" on canonical entry
 * 2. Reassign any used_listings from a5179a0e → 2c9584bb
 * 3. Update curated_systems component_ids array to swap UUIDs
 * 4. Move any reverb_priceguide_mappings from a5179a0e → 2c9584bb
 * 5. Delete the redundant a5179a0e entry
 *
 * Usage:
 *   node scripts/fix-sundara-consolidation.js              # Dry run
 *   node scripts/fix-sundara-consolidation.js --execute     # Apply changes
 */

const { supabase } = require('./shared/database');

const CANONICAL_ID = '2c9584bb-8707-43a6-b3cd-db56cf6f6629';  // "Sundara" with Crinacle data
const REDUNDANT_ID = 'a5179a0e-af89-408e-b95e-0ef0af45de7f';  // "Sundara (2020)" — no data
const DRY_RUN = !process.argv.includes('--execute');

async function consolidate() {
  console.log(`=== Sundara Consolidation ${DRY_RUN ? '(DRY RUN)' : '(EXECUTING)'} ===\n`);

  // Verify both entries exist
  const { data: entries } = await supabase
    .from('components')
    .select('id, brand, name, crin_tone, crin_tech')
    .in('id', [CANONICAL_ID, REDUNDANT_ID]);

  const canonical = entries?.find(e => e.id === CANONICAL_ID);
  const redundant = entries?.find(e => e.id === REDUNDANT_ID);

  if (!canonical) {
    console.log('Canonical entry (2c9584bb) not found — nothing to do');
    return;
  }
  console.log(`Canonical: "${canonical.name}" by "${canonical.brand}" (tone: ${canonical.crin_tone})`);

  if (!redundant) {
    console.log('Redundant entry (a5179a0e) already deleted — just standardizing brand');
  } else {
    console.log(`Redundant: "${redundant.name}" by "${redundant.brand}" (tone: ${redundant.crin_tone || 'none'})`);
  }

  // Step 1: Standardize brand name
  console.log('\n1. Standardize brand → "HiFiMAN"');
  if (!DRY_RUN) {
    const { error } = await supabase
      .from('components')
      .update({ brand: 'HiFiMAN' })
      .eq('id', CANONICAL_ID);
    console.log(error ? `   Error: ${error.message}` : '   Done');
  }

  if (redundant) {
    // Step 2: Reassign used_listings
    const { count: listingCount } = await supabase
      .from('used_listings')
      .select('*', { count: 'exact', head: true })
      .eq('component_id', REDUNDANT_ID);

    console.log(`\n2. Reassign used_listings: ${listingCount || 0} to move`);
    if (!DRY_RUN && listingCount > 0) {
      const { error } = await supabase
        .from('used_listings')
        .update({ component_id: CANONICAL_ID })
        .eq('component_id', REDUNDANT_ID);
      console.log(error ? `   Error: ${error.message}` : '   Done');
    }

    // Step 3: Update curated_systems
    console.log('\n3. Update curated_systems component_ids');
    const { data: systems } = await supabase
      .from('curated_systems')
      .select('id, name, component_ids');

    const affectedSystems = systems?.filter(s => s.component_ids?.includes(REDUNDANT_ID)) || [];
    console.log(`   ${affectedSystems.length} system(s) to update`);

    for (const sys of affectedSystems) {
      const newIds = sys.component_ids.map(id => id === REDUNDANT_ID ? CANONICAL_ID : id);
      console.log(`   - "${sys.name}": swapping ${REDUNDANT_ID} → ${CANONICAL_ID}`);
      if (!DRY_RUN) {
        const { error } = await supabase
          .from('curated_systems')
          .update({ component_ids: newIds })
          .eq('id', sys.id);
        if (error) console.log(`     Error: ${error.message}`);
      }
    }

    // Step 4: Move reverb_priceguide_mappings
    const { data: reverbMapping } = await supabase
      .from('reverb_priceguide_mappings')
      .select('id')
      .eq('component_id', REDUNDANT_ID)
      .maybeSingle();

    console.log(`\n4. Reverb price guide mapping: ${reverbMapping ? 'exists, will reassign' : 'none'}`);
    if (!DRY_RUN && reverbMapping) {
      // Check if canonical already has a mapping
      const { data: existingMapping } = await supabase
        .from('reverb_priceguide_mappings')
        .select('id')
        .eq('component_id', CANONICAL_ID)
        .maybeSingle();

      if (existingMapping) {
        // Delete redundant mapping since canonical already has one
        await supabase.from('reverb_priceguide_mappings').delete().eq('id', reverbMapping.id);
        console.log('   Deleted redundant mapping (canonical already has one)');
      } else {
        const { error } = await supabase
          .from('reverb_priceguide_mappings')
          .update({ component_id: CANONICAL_ID })
          .eq('id', reverbMapping.id);
        console.log(error ? `   Error: ${error.message}` : '   Reassigned');
      }
    }

    // Step 5: Delete redundant entry
    console.log(`\n5. Delete redundant component (${REDUNDANT_ID})`);
    if (!DRY_RUN) {
      const { error } = await supabase
        .from('components')
        .delete()
        .eq('id', REDUNDANT_ID);
      console.log(error ? `   Error: ${error.message}` : '   Deleted');
    }
  }

  // Verify final state
  if (!DRY_RUN) {
    console.log('\n=== Verification ===');
    const { data: final } = await supabase
      .from('components')
      .select('id, brand, name, crin_tone')
      .ilike('name', '%sundara%');
    console.log('Remaining Sundara entries:', final?.map(c => `"${c.name}" by "${c.brand}" (${c.id})`));

    const { count } = await supabase
      .from('used_listings')
      .select('*', { count: 'exact', head: true })
      .eq('component_id', CANONICAL_ID);
    console.log(`Listings on canonical: ${count}`);
  }

  if (DRY_RUN) {
    console.log('\n--- DRY RUN complete. Run with --execute to apply. ---');
  }
}

consolidate().catch(console.error);
