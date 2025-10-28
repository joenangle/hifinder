#!/usr/bin/env node

/**
 * Fix spacing inconsistencies in component names
 *
 * Issues to fix:
 * 1. "DT 1990 Pro" vs "DT1990 Pro" - merge into "DT 1990 Pro"
 * 2. "HD560S" vs "HD 560S" - merge into "HD 560S"
 * 3. Keep "Galaxy Buds" and "Galaxy Buds+" separate (different products)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fixSpacingIssues() {
  console.log('🔧 Fixing spacing inconsistencies in component names...\n');

  // Fix 1: DT1990 Pro → DT 1990 Pro (standardize with space)
  console.log('1. Beyerdynamic DT1990 Pro');
  const dt1990NoSpace = await supabase
    .from('components')
    .select('*')
    .eq('id', '12a43960-ace7-49c8-a0ec-7fced53d0ed2')
    .single();

  const dt1990WithSpace = await supabase
    .from('components')
    .select('*')
    .eq('id', 'f1dd15f4-f94e-4eb7-83aa-31c9c3c98b9f')
    .single();

  if (dt1990NoSpace.data && dt1990WithSpace.data) {
    console.log(`   Current: "${dt1990NoSpace.data.name}" (no prices: ${dt1990NoSpace.data.price_used_min})`);
    console.log(`   Current: "${dt1990WithSpace.data.name}" (prices: $${dt1990WithSpace.data.price_used_min}-$${dt1990WithSpace.data.price_used_max})`);
    console.log(`   Action: Delete entry without prices, keep "DT 1990 Pro"`);
  }

  // Fix 2: HD560S → HD 560S (standardize with space)
  console.log('\n2. Sennheiser HD560S');
  const hd560sNoSpace = await supabase
    .from('components')
    .select('*')
    .eq('id', '1bf78f29-13e6-4e2c-80b2-e8b43d59975b')
    .single();

  const hd560sWithSpace = await supabase
    .from('components')
    .select('*')
    .eq('id', 'b9c494ba-68a7-485a-9042-0e8609bca46e')
    .single();

  if (hd560sNoSpace.data && hd560sWithSpace.data) {
    console.log(`   Current: "${hd560sNoSpace.data.name}" (better data: 33%)`);
    console.log(`   Current: "${hd560sWithSpace.data.name}" (less data: 17%)`);
    console.log(`   Action: Rename "HD560S" to "HD 560S", delete duplicate`);
  }

  // Note 3: Galaxy Buds vs Galaxy Buds+
  console.log('\n3. Samsung Galaxy Buds');
  const galaxyBuds = await supabase
    .from('components')
    .select('*')
    .eq('id', '44f86ecb-3fad-452e-95b0-8036bd051ce9')
    .single();

  const galaxyBudsPlus = await supabase
    .from('components')
    .select('*')
    .eq('id', '67ad5f4e-ae56-4e2c-aa10-a5e1434a428c')
    .single();

  if (galaxyBuds.data && galaxyBudsPlus.data) {
    console.log(`   Current: "${galaxyBuds.data.name}" (B+/B, 67% data)`);
    console.log(`   Current: "${galaxyBudsPlus.data.name}" (B+/B, 61% data)`);
    console.log(`   Action: Keep both (different products)`);
  }

  if (process.argv.includes('--execute')) {
    console.log('\n🔨 Executing fixes...\n');

    // Fix 1: Delete DT1990 Pro (no space, no prices)
    const { error: deleteDT1990 } = await supabase
      .from('components')
      .delete()
      .eq('id', '12a43960-ace7-49c8-a0ec-7fced53d0ed2');

    if (deleteDT1990) {
      console.error('❌ Error deleting DT1990 Pro:', deleteDT1990);
    } else {
      console.log('✅ Deleted "DT1990 Pro" (kept "DT 1990 Pro")');
    }

    // Fix 2: Rename HD560S → HD 560S, then delete duplicate
    const { error: renameHD560S } = await supabase
      .from('components')
      .update({ name: 'HD 560S' })
      .eq('id', '1bf78f29-13e6-4e2c-80b2-e8b43d59975b');

    if (renameHD560S) {
      console.error('❌ Error renaming HD560S:', renameHD560S);
    } else {
      console.log('✅ Renamed "HD560S" → "HD 560S"');
    }

    const { error: deleteHD560S } = await supabase
      .from('components')
      .delete()
      .eq('id', 'b9c494ba-68a7-485a-9042-0e8609bca46e');

    if (deleteHD560S) {
      console.error('❌ Error deleting HD 560S duplicate:', deleteHD560S);
    } else {
      console.log('✅ Deleted duplicate "HD 560S" entry');
    }

    // Note 3: No action for Galaxy Buds (keeping both)
    console.log('✅ Kept both Galaxy Buds and Galaxy Buds+ (different products)');

    console.log('\n✨ Spacing fixes complete!');
    console.log('\nRemaining duplicates to fix: 9 (use auto-remove-duplicates.js)');
  } else {
    console.log('\n🔍 DRY RUN - Run with --execute to apply changes');
    console.log('\nSummary:');
    console.log('  - Delete: DT1990 Pro (no space variant)');
    console.log('  - Rename + Delete: HD560S → HD 560S');
    console.log('  - Keep: Galaxy Buds and Galaxy Buds+ (different products)');
  }
}

fixSpacingIssues().catch(console.error);
