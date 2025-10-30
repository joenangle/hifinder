#!/usr/bin/env node

/**
 * Sound Signature Data Verification Script
 *
 * Checks the sound_signature column across all component categories:
 * - DACs, Amps, Combos (should have no sound_signature values)
 * - Cans, IEMs (should have sound_signature values distributed across neutral/warm/bright/fun)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkSoundSignatures() {
  console.log('Fetching all components...\n');

  const { data: components, error } = await supabase
    .from('components')
    .select('id, name, brand, category, sound_signature');

  if (error) {
    console.error('Error fetching components:', error);
    process.exit(1);
  }

  // Group by category
  const byCategory = {
    dac: [],
    amp: [],
    dac_amp: [],
    cans: [],
    iems: [],
    unknown: []
  };

  components.forEach(comp => {
    const cat = comp.category || 'unknown';
    if (!byCategory[cat]) {
      byCategory[cat] = [];
    }
    byCategory[cat].push(comp);
  });

  // Analyze each category
  console.log('=== SOUND SIGNATURE DATA VERIFICATION ===\n');

  // DACs
  const dacsWithSignature = byCategory.dac.filter(c => c.sound_signature);
  console.log(`DACs with sound_signature: ${dacsWithSignature.length}/${byCategory.dac.length}`);
  if (dacsWithSignature.length > 0) {
    console.log('  ⚠️  Found DACs with sound_signature (should be 0):');
    dacsWithSignature.slice(0, 5).forEach(c => {
      console.log(`    - ${c.brand} ${c.name}: "${c.sound_signature}"`);
    });
  }

  // Amps
  const ampsWithSignature = byCategory.amp.filter(c => c.sound_signature);
  console.log(`\nAmps with sound_signature: ${ampsWithSignature.length}/${byCategory.amp.length}`);
  if (ampsWithSignature.length > 0) {
    console.log('  ⚠️  Found Amps with sound_signature (should be 0):');
    ampsWithSignature.slice(0, 5).forEach(c => {
      console.log(`    - ${c.brand} ${c.name}: "${c.sound_signature}"`);
    });
  }

  // Combos
  const combosWithSignature = byCategory.dac_amp.filter(c => c.sound_signature);
  console.log(`\nCombos (dac_amp) with sound_signature: ${combosWithSignature.length}/${byCategory.dac_amp.length}`);
  if (combosWithSignature.length > 0) {
    console.log('  ⚠️  Found Combos with sound_signature (should be 0):');
    combosWithSignature.slice(0, 5).forEach(c => {
      console.log(`    - ${c.brand} ${c.name}: "${c.sound_signature}"`);
    });
  }

  // Cans & IEMs combined distribution
  const portable = [...byCategory.cans, ...byCategory.iems];
  const distribution = {
    neutral: 0,
    warm: 0,
    bright: 0,
    fun: 0,
    null: 0,
    empty: 0
  };

  portable.forEach(comp => {
    if (!comp.sound_signature) {
      distribution.null++;
    } else if (comp.sound_signature.trim() === '') {
      distribution.empty++;
    } else {
      const sig = comp.sound_signature.toLowerCase().trim();
      if (distribution[sig] !== undefined) {
        distribution[sig]++;
      }
    }
  });

  console.log(`\nCans/IEMs Sound Signature Distribution:`);
  console.log(`- Neutral: ${distribution.neutral}`);
  console.log(`- Warm: ${distribution.warm}`);
  console.log(`- Bright: ${distribution.bright}`);
  console.log(`- Fun: ${distribution.fun}`);
  console.log(`- NULL/empty: ${distribution.null + distribution.empty}`);
  console.log(`Total Cans/IEMs: ${portable.length}`);

  // Check for any invalid values
  const validSigs = new Set(['neutral', 'warm', 'bright', 'fun']);
  const invalidSigs = [];
  portable.forEach(comp => {
    if (comp.sound_signature && comp.sound_signature.trim() !== '') {
      const sig = comp.sound_signature.toLowerCase().trim();
      if (!validSigs.has(sig)) {
        invalidSigs.push({ brand: comp.brand, name: comp.name, sig: comp.sound_signature });
      }
    }
  });

  if (invalidSigs.length > 0) {
    console.log(`\n⚠️  Found ${invalidSigs.length} invalid sound_signature values:`);
    invalidSigs.slice(0, 10).forEach(item => {
      console.log(`  - ${item.brand} ${item.name}: "${item.sig}"`);
    });
  }

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Total components: ${components.length}`);
  console.log(`  DACs: ${byCategory.dac.length}`);
  console.log(`  Amps: ${byCategory.amp.length}`);
  console.log(`  Combos: ${byCategory.dac_amp.length}`);
  console.log(`  Cans: ${byCategory.cans.length}`);
  console.log(`  IEMs: ${byCategory.iems.length}`);

  const issues = dacsWithSignature.length + ampsWithSignature.length + combosWithSignature.length + invalidSigs.length;
  if (issues === 0) {
    console.log('\n✅ All sound_signature data looks good!');
  } else {
    console.log(`\n❌ Found ${issues} issues to investigate`);
  }
}

checkSoundSignatures().catch(console.error);
