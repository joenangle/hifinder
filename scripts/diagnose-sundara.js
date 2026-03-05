#!/usr/bin/env node

/**
 * Diagnose Sundara sold price data issues
 * Checks for duplicate entries, orphaned listings, and data gaps
 */

const { supabase } = require('./shared/database');

const KNOWN_SUNDARA_IDS = {
  'hifiman_sundara':    '2c9584bb-8707-43a6-b3cd-db56cf6f6629',  // Original with Crinacle data
  'hifiman_sundara_dup':'4dde0bfc-2fe4-45fa-bb4a-cbf5ccd66373',  // Deleted duplicate
  'sundara_2020':       'a5179a0e-af89-408e-b95e-0ef0af45de7f',  // Sundara (2020)
};

async function diagnose() {
  console.log('=== Sundara Diagnostic Report ===\n');

  // 1. Check which Sundara entries exist in components
  console.log('1. Components matching "sundara":');
  const { data: components, error: compErr } = await supabase
    .from('components')
    .select('id, brand, name, category, crin_tone, crin_tech, price_used_min, price_used_max, price_new')
    .ilike('name', '%sundara%')
    .order('name');

  if (compErr) {
    console.error('   Error:', compErr.message);
    return;
  }

  if (components.length === 0) {
    console.log('   NONE FOUND - this is a problem!');
  } else {
    components.forEach(c => {
      console.log(`   - "${c.name}" by "${c.brand}" (${c.id})`);
      console.log(`     Category: ${c.category}, Tone: ${c.crin_tone || 'none'}, Tech: ${c.crin_tech || 'none'}`);
      console.log(`     New: $${c.price_new || '?'}, Used: $${c.price_used_min || '?'}-$${c.price_used_max || '?'}`);
    });
  }

  // 2. Check used_listings for each known Sundara UUID
  console.log('\n2. Used listings per Sundara UUID:');
  for (const [label, id] of Object.entries(KNOWN_SUNDARA_IDS)) {
    const { data: listings, error: listErr } = await supabase
      .from('used_listings')
      .select('id, status, price, sale_price, date_sold, source')
      .eq('component_id', id);

    if (listErr) {
      console.log(`   ${label} (${id}): Error - ${listErr.message}`);
      continue;
    }

    const total = listings?.length || 0;
    const sold = listings?.filter(l => l.date_sold != null).length || 0;
    const sources = [...new Set(listings?.map(l => l.source) || [])];
    console.log(`   ${label} (${id}): ${total} total, ${sold} with sold data [sources: ${sources.join(', ') || 'none'}]`);
  }

  // 3. Check for any live Sundara component IDs
  const liveIds = components.map(c => c.id);
  console.log('\n3. Live Sundara component IDs:', liveIds);

  for (const id of liveIds) {
    const { count, error: countErr } = await supabase
      .from('used_listings')
      .select('*', { count: 'exact', head: true })
      .eq('component_id', id)
      .not('date_sold', 'is', null);

    console.log(`   ${id}: ${countErr ? 'Error' : count} sold listings`);
  }

  // 4. Check curated_systems references
  console.log('\n4. Curated systems referencing Sundara:');
  const { data: systems } = await supabase
    .from('curated_systems')
    .select('id, name, component_ids, budget_tier, category');

  if (systems) {
    const sundaraSystems = systems.filter(s =>
      Object.values(KNOWN_SUNDARA_IDS).some(sid => s.component_ids?.includes(sid))
    );
    if (sundaraSystems.length === 0) {
      console.log('   None found');
    } else {
      sundaraSystems.forEach(s => {
        console.log(`   - "${s.name}" (${s.category} $${s.budget_tier}): ${s.component_ids.join(', ')}`);
      });
    }
  }

  // 5. Summary
  console.log('\n=== Summary ===');
  const livingIds = new Set(liveIds);
  const deadIds = Object.entries(KNOWN_SUNDARA_IDS)
    .filter(([_, id]) => !livingIds.has(id))
    .map(([label, id]) => `${label} (${id})`);

  if (deadIds.length > 0) {
    console.log(`Deleted Sundara UUIDs: ${deadIds.join(', ')}`);
  }
  if (components.length > 1) {
    console.log(`WARNING: ${components.length} Sundara entries still exist - consolidation needed`);
  }
  if (components.length === 1) {
    console.log(`Single Sundara entry: ${components[0].id} - good`);
  }
}

diagnose().catch(console.error);
