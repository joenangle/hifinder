#!/usr/bin/env node
/**
 * Signal Gear Batch 2 — Sound Signatures + Summit-Fi Expansion (Feb 2026)
 *
 * Fills in:
 *   1. Missing sound_signature on 49 DAC/amp/combo entries
 *   2. New summit-fi and popular models across signal gear categories
 *      (addresses gaps called out in CLAUDE.md)
 *
 * Usage:
 *   node scripts/import-signal-gear-batch2.js              # Dry run
 *   node scripts/import-signal-gear-batch2.js --execute     # Apply changes
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ============================================================
// Sound Signature Fixes — 49 entries with null sound_signature
// These are well-known products; signatures based on community
// consensus, reviewer impressions, and measurement philosophy.
// ============================================================

const DAC_SIG_FIXES = [
  { brand: 'Benchmark', name: 'DAC3 B', sound_signature: 'neutral' },      // Reference/measurement
  { brand: 'Chord Electronics', name: 'Qutest', sound_signature: 'warm' },  // Chord house sound
  { brand: 'Chord Electronics', name: 'Hugo 2', sound_signature: 'warm' },
  { brand: 'JDS Labs', name: 'Atom DAC 2', sound_signature: 'neutral' },
  { brand: 'RME', name: 'ADI-2 DAC FS', sound_signature: 'neutral' },      // Reference/studio
  { brand: 'Schiit', name: 'Modi 3E', sound_signature: 'neutral' },
  { brand: 'SMSL', name: 'RAW Pro-DAC1', sound_signature: 'neutral' },
  { brand: 'SMSL', name: 'D400 Pro', sound_signature: 'neutral' },
  { brand: 'SMSL', name: 'DO200 Pro', sound_signature: 'neutral' },
  { brand: 'Topping', name: 'D90 III Sabre', sound_signature: 'neutral' },
  { brand: 'Topping', name: 'E50', sound_signature: 'neutral' },
  { brand: 'Topping', name: 'D90SE', sound_signature: 'neutral' },
]

const AMP_SIG_FIXES = [
  { brand: 'Benchmark', name: 'HPA4', sound_signature: 'neutral' },         // Reference
  { brand: 'Chord', name: 'Alto', sound_signature: 'warm' },                // Chord house sound
  { brand: 'iFi', name: 'Zen CAN', sound_signature: 'warm' },              // XBass, analog warmth
  { brand: 'JDS Labs', name: 'Atom Amp+', sound_signature: 'neutral' },
  { brand: 'JDS Labs', name: 'Atom Amp 2', sound_signature: 'neutral' },
  { brand: 'Monoprice', name: 'Monolith 887', sound_signature: 'neutral' }, // THX AAA
  { brand: 'Rupert Neve Designs', name: 'RNHP', sound_signature: 'warm' },  // Musical, analog character
  { brand: 'Schiit', name: 'KARA', sound_signature: 'neutral' },
  { brand: 'Schiit', name: 'Midgard', sound_signature: 'neutral' },
  { brand: 'Schiit', name: 'Magni Heresy', sound_signature: 'neutral' },
  { brand: 'Schiit', name: 'Mjolnir 3', sound_signature: 'warm' },         // Tube hybrid
  { brand: 'Schiit', name: 'Ragnarok 2', sound_signature: 'neutral' },
  { brand: 'SMSL', name: 'SH-9', sound_signature: 'neutral' },             // THX AAA
  { brand: 'Space Audio', name: 'Space II', sound_signature: 'neutral' },
  { brand: 'THX', name: 'AAA 789', sound_signature: 'neutral' },
  { brand: 'Topping', name: 'A90', sound_signature: 'neutral' },
  { brand: 'Topping', name: 'A30 Pro', sound_signature: 'neutral' },
  { brand: 'Topping', name: 'A70 Pro', sound_signature: 'neutral' },
  { brand: 'Topping', name: 'L30 II', sound_signature: 'neutral' },
  { brand: 'Topping', name: 'A90 Discrete', sound_signature: 'neutral' },
  { brand: 'Violectric', name: 'V280', sound_signature: 'warm' },           // German analog warmth
]

const COMBO_SIG_FIXES = [
  { brand: 'Apple', name: 'USB-C Dongle', sound_signature: 'neutral' },
  { brand: 'D&A', name: 'Alpha PRO', sound_signature: 'neutral' },
  { brand: 'Fosi', name: 'ZH3', sound_signature: 'neutral' },
  { brand: 'Fosi Audio', name: 'K7 Gaming', sound_signature: 'fun' },       // Gaming tuning
  { brand: 'JDS Labs', name: 'Element IV', sound_signature: 'neutral' },
  { brand: 'Leckerton Audio', name: 'UHA-6S.MKII', sound_signature: 'neutral' },
  { brand: 'Loxjie', name: 'D40 Pro', sound_signature: 'neutral' },
  { brand: 'Luxsin', name: 'X9', sound_signature: 'warm' },
  { brand: 'Qudelix', name: '5K', sound_signature: 'neutral' },
  { brand: 'RME', name: 'ADI-2 Pro FS R', sound_signature: 'neutral' },     // Reference/studio
  { brand: 'Sabaj', name: 'A20d 2023', sound_signature: 'neutral' },
  { brand: 'Schiit', name: 'Magni', sound_signature: 'neutral' },
  { brand: 'SMSL', name: 'RAW-MDA 1', sound_signature: 'neutral' },
  { brand: 'Topping', name: 'DX3 Pro+', sound_signature: 'neutral' },
  { brand: 'Topping', name: 'DX5', sound_signature: 'neutral' },
  { brand: 'Zidoo', name: 'EverSolo Z8', sound_signature: 'neutral' },
]

// ============================================================
// New Models — Addressing CLAUDE.md summit-fi gaps
// ============================================================

const NEW_DACS = [
  // Summit-fi (explicitly called out as missing in CLAUDE.md)
  { brand: 'Schiit', name: 'Yggdrasil', price_new: 2449, asr_sinad: null, sound_signature: 'warm' },
  { brand: 'Chord Electronics', name: 'DAVE', price_new: 13500, asr_sinad: null, sound_signature: 'warm' },
  { brand: 'Mytek', name: 'Brooklyn DAC+', price_new: 2195, asr_sinad: null, sound_signature: 'neutral' },
  { brand: 'Denafrips', name: 'Venus II', price_new: 2998, asr_sinad: null, sound_signature: 'warm' },
  { brand: 'T+A', name: 'DAC 200', price_new: 6500, asr_sinad: null, sound_signature: 'neutral' },
  { brand: 'Weiss', name: 'DAC501', price_new: 5199, asr_sinad: null, sound_signature: 'neutral' },
  // High-end
  { brand: 'Schiit', name: 'Gungnir', price_new: 749, asr_sinad: null, sound_signature: 'warm' },
  { brand: 'Musician', name: 'Pegasus II', price_new: 1199, asr_sinad: null, sound_signature: 'warm' },
  { brand: 'Musician', name: 'Draco', price_new: 499, asr_sinad: null, sound_signature: 'warm' },
  { brand: 'SMSL', name: 'D1SE', price_new: 799, asr_sinad: 120, sound_signature: 'neutral' },
]

const NEW_AMPS = [
  // Tube/hybrid (popular category gap)
  { brand: 'Schiit', name: 'Lyr+', price_new: 299, power_output: '6W @ 32Ω', asr_sinad: null, sound_signature: 'warm' },
  { brand: 'Woo Audio', name: 'WA7 Fireflies', price_new: 999, power_output: '1W @ 32Ω', asr_sinad: null, sound_signature: 'warm' },
  { brand: 'Woo Audio', name: 'WA6', price_new: 790, power_output: '800mW @ 32Ω', asr_sinad: null, sound_signature: 'warm' },
  { brand: 'Woo Audio', name: 'WA22', price_new: 2200, power_output: '2W @ 32Ω', asr_sinad: null, sound_signature: 'warm' },
  { brand: 'Bottlehead', name: 'Crack OTL', price_new: 429, power_output: '600mW @ 300Ω', asr_sinad: null, sound_signature: 'warm' },
  { brand: 'Monoprice', name: 'Liquid Platinum', price_new: 499, power_output: '3.5W @ 32Ω', asr_sinad: null, sound_signature: 'warm' },
  // Solid state
  { brand: 'Topping', name: 'A90D', price_new: 649, power_output: '7.6W @ 32Ω balanced', asr_sinad: 120, sound_signature: 'neutral' },
  { brand: 'SMSL', name: 'SP400', price_new: 399, power_output: '6W @ 32Ω balanced', asr_sinad: 117, sound_signature: 'neutral' },
  // Summit-fi
  { brand: 'Woo Audio', name: 'WA33', price_new: 5999, power_output: '4W @ 32Ω', asr_sinad: null, sound_signature: 'warm' },
  { brand: 'Enleum', name: 'AMP-23R', price_new: 3999, power_output: '3W @ 32Ω', asr_sinad: null, sound_signature: 'neutral' },
  { brand: 'ZMF', name: 'Pendant SE', price_new: 1599, power_output: '1.2W @ 32Ω', asr_sinad: null, sound_signature: 'warm' },
]

const NEW_COMBOS = [
  // High-end/summit-fi (only 1 summit-fi combo currently — CLAUDE.md gap)
  { brand: 'FiiO', name: 'Q7', price_new: 849, power_output: '1.5W @ 32Ω balanced', asr_sinad: null, sound_signature: 'neutral' },
  { brand: 'iFi', name: 'Gryphon', price_new: 599, power_output: '1W @ 32Ω', asr_sinad: null, sound_signature: 'warm' },
  { brand: 'Chord Electronics', name: 'Hugo TT2', price_new: 5595, power_output: '1W @ 32Ω', asr_sinad: null, sound_signature: 'warm' },
  { brand: 'Mytek', name: 'Brooklyn Bridge', price_new: 2995, power_output: '1W @ 32Ω', asr_sinad: null, sound_signature: 'neutral' },
  { brand: 'Burson', name: 'Conductor 3X GT', price_new: 1899, power_output: '4W @ 32Ω', asr_sinad: null, sound_signature: 'warm' },
  { brand: 'iFi', name: 'Pro iDSD Signature', price_new: 2799, power_output: '4W @ 32Ω', asr_sinad: null, sound_signature: 'warm' },
  { brand: 'Matrix Audio', name: 'Element X2', price_new: 2999, power_output: '3W @ 32Ω', asr_sinad: null, sound_signature: 'neutral' },
  { brand: 'Topping', name: 'DX9 Pro', price_new: 1599, power_output: '5.6W @ 32Ω balanced', asr_sinad: null, sound_signature: 'neutral' },
  // Portable high-end
  { brand: 'Astell&Kern', name: 'KANN Ultra', price_new: 1299, power_output: '12Vrms balanced', asr_sinad: null, sound_signature: 'neutral' },
  { brand: 'FiiO', name: 'M17', price_new: 1799, power_output: '3W @ 32Ω', asr_sinad: null, sound_signature: 'neutral' },
  { brand: 'Shanling', name: 'M9 Plus', price_new: 1800, power_output: '1.2W @ 32Ω', asr_sinad: null, sound_signature: 'warm' },
]

// ============================================================
// Utility Functions
// ============================================================

function levenshtein(a, b) {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null))
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(matrix[j][i - 1] + 1, matrix[j - 1][i] + 1, matrix[j - 1][i - 1] + cost)
    }
  }
  return matrix[b.length][a.length]
}

function similarity(a, b) {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(a.toLowerCase(), b.toLowerCase()) / maxLen
}

function budgetTier(price) {
  if (!price) return 'Entry Level'
  if (price <= 100) return 'Budget'
  if (price <= 300) return 'Entry Level'
  if (price <= 700) return 'Mid Range'
  if (price <= 1500) return 'High End'
  return 'Summit-Fi'
}

async function findExisting(brand, name, category) {
  const { data: exact } = await supabase
    .from('components')
    .select('id, brand, name, price_new, sound_signature, power_output, asr_sinad, budget_tier')
    .eq('category', category)
    .ilike('brand', brand)
    .ilike('name', name)
    .single()
  if (exact) return exact

  const { data: all } = await supabase
    .from('components')
    .select('id, brand, name, price_new, sound_signature, power_output, asr_sinad, budget_tier')
    .eq('category', category)
  if (!all) return null

  for (const comp of all) {
    if (similarity(brand, comp.brand) >= 0.8 && similarity(name, comp.name) >= 0.8) return comp
  }
  return null
}

// ============================================================
// Fix sound_signatures
// ============================================================
async function fixSoundSignatures(fixes, category, executeMode) {
  const label = category === 'dac_amp' ? 'combo' : category
  console.log(`\n  --- ${label.toUpperCase()} sound_signature fixes (${fixes.length}) ---`)

  let fixed = 0, skipped = 0, errors = 0

  for (const entry of fixes) {
    const existing = await findExisting(entry.brand, entry.name, category)
    if (!existing) {
      console.log(`    !! Not found: ${entry.brand} ${entry.name}`)
      errors++
      continue
    }
    if (existing.sound_signature) { skipped++; continue }

    if (executeMode) {
      const { error } = await supabase
        .from('components')
        .update({ sound_signature: entry.sound_signature, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (error) { console.log(`    !! Error: ${entry.brand} ${entry.name}: ${error.message}`); errors++ }
      else { console.log(`    SIG: ${entry.brand} ${entry.name} → ${entry.sound_signature}`); fixed++ }
    } else {
      console.log(`    [dry] SIG: ${entry.brand} ${entry.name} → ${entry.sound_signature}`)
      fixed++
    }
  }

  return { fixed, skipped, errors }
}

// ============================================================
// Import new models
// ============================================================
async function importNew(models, category, executeMode) {
  const label = category === 'dac_amp' ? 'combo' : category
  console.log(`\n  --- New ${label}s (${models.length}) ---`)

  let added = 0, updated = 0, skipped = 0, errors = 0

  for (const comp of models) {
    const existing = await findExisting(comp.brand, comp.name, category)

    if (existing) {
      const updates = {}
      if (comp.price_new && (!existing.price_new || existing.price_new === 0)) {
        updates.price_new = comp.price_new
        updates.price_used_min = Math.round(comp.price_new * 0.65)
        updates.price_used_max = Math.round(comp.price_new * 0.85)
        updates.budget_tier = budgetTier(comp.price_new)
      }
      if (comp.sound_signature && !existing.sound_signature) updates.sound_signature = comp.sound_signature
      if (comp.power_output && !existing.power_output) updates.power_output = comp.power_output
      if (comp.asr_sinad && !existing.asr_sinad) updates.asr_sinad = comp.asr_sinad

      if (Object.keys(updates).length > 0) {
        const changes = Object.entries(updates)
          .filter(([k]) => !['price_used_min', 'price_used_max'].includes(k))
          .map(([k, v]) => `${k}=${v}`).join(', ')
        if (executeMode) {
          const { error } = await supabase.from('components').update({ ...updates, updated_at: new Date().toISOString() }).eq('id', existing.id)
          if (error) { console.log(`    !! Error: ${comp.brand} ${comp.name}: ${error.message}`); errors++ }
          else { console.log(`    UPD: ${comp.brand} ${comp.name} (${changes})`); updated++ }
        } else {
          console.log(`    [dry] UPD: ${comp.brand} ${comp.name} (${changes})`)
          updated++
        }
      } else { skipped++ }
    } else {
      const newComp = {
        brand: comp.brand, name: comp.name, category,
        price_new: comp.price_new,
        price_used_min: comp.price_new ? Math.round(comp.price_new * 0.65) : null,
        price_used_max: comp.price_new ? Math.round(comp.price_new * 0.85) : null,
        budget_tier: budgetTier(comp.price_new),
        power_output: comp.power_output || null,
        asr_sinad: comp.asr_sinad || null,
        sound_signature: comp.sound_signature || null,
        source: 'community_research_2026',
        created_at: new Date().toISOString(),
      }

      if (executeMode) {
        const { error } = await supabase.from('components').insert(newComp)
        if (error) { console.log(`    !! Error: ${comp.brand} ${comp.name}: ${error.message}`); errors++ }
        else { console.log(`    ADD: ${comp.brand} ${comp.name} ($${comp.price_new}) [${newComp.budget_tier}]`); added++ }
      } else {
        console.log(`    [dry] ADD: ${comp.brand} ${comp.name} ($${comp.price_new}) [${newComp.budget_tier}]`)
        added++
      }
    }
  }

  return { added, updated, skipped, errors }
}

// ============================================================
// Main
// ============================================================
async function main() {
  const args = process.argv.slice(2)
  const executeMode = args.includes('--execute')

  console.log('='.repeat(65))
  console.log(' Signal Gear Batch 2 — Signatures + Summit-Fi Expansion')
  console.log(' February 2026')
  console.log('='.repeat(65))
  console.log(executeMode ? '  MODE: EXECUTE' : '  MODE: DRY RUN')
  console.log('')

  for (const cat of ['dac', 'amp', 'dac_amp']) {
    const label = cat === 'dac_amp' ? 'combo' : cat
    const { data: all } = await supabase.from('components').select('id').eq('category', cat)
    const { data: noSig } = await supabase.from('components').select('id').eq('category', cat).is('sound_signature', null)
    const { data: summit } = await supabase.from('components').select('id').eq('category', cat).eq('budget_tier', 'Summit-Fi')
    console.log(`  ${label}: ${all?.length} total, ${noSig?.length} missing sig, ${summit?.length} summit-fi`)
  }

  const t = { sigFixes: 0, added: 0, updated: 0, skipped: 0, errors: 0 }

  // Phase 1: Sound signatures
  console.log('\n' + '='.repeat(65))
  console.log(' PHASE 1: Sound Signature Fixes')
  console.log('='.repeat(65))

  let r
  r = await fixSoundSignatures(DAC_SIG_FIXES, 'dac', executeMode)
  t.sigFixes += r.fixed; t.skipped += r.skipped; t.errors += r.errors

  r = await fixSoundSignatures(AMP_SIG_FIXES, 'amp', executeMode)
  t.sigFixes += r.fixed; t.skipped += r.skipped; t.errors += r.errors

  r = await fixSoundSignatures(COMBO_SIG_FIXES, 'dac_amp', executeMode)
  t.sigFixes += r.fixed; t.skipped += r.skipped; t.errors += r.errors

  // Phase 2: New models
  console.log('\n' + '='.repeat(65))
  console.log(' PHASE 2: New Models (Summit-Fi + Popular Gaps)')
  console.log('='.repeat(65))

  r = await importNew(NEW_DACS, 'dac', executeMode)
  t.added += r.added; t.updated += r.updated; t.skipped += r.skipped; t.errors += r.errors

  r = await importNew(NEW_AMPS, 'amp', executeMode)
  t.added += r.added; t.updated += r.updated; t.skipped += r.skipped; t.errors += r.errors

  r = await importNew(NEW_COMBOS, 'dac_amp', executeMode)
  t.added += r.added; t.updated += r.updated; t.skipped += r.skipped; t.errors += r.errors

  // Summary
  console.log('\n' + '='.repeat(65))
  console.log(' SUMMARY')
  console.log('='.repeat(65))
  console.log(`  Sound signature fixes: ${t.sigFixes}`)
  console.log(`  New models added:      ${t.added}`)
  console.log(`  Existing updated:      ${t.updated}`)
  console.log(`  Skipped:               ${t.skipped}`)
  console.log(`  Errors:                ${t.errors}`)
  console.log('='.repeat(65))

  const total = t.sigFixes + t.added + t.updated
  if (!executeMode && total > 0) console.log(`\nRun with --execute to apply ${total} changes.`)

  if (executeMode) {
    console.log('\nPost-execution:')
    for (const cat of ['dac', 'amp', 'dac_amp']) {
      const label = cat === 'dac_amp' ? 'combo' : cat
      const { data: all } = await supabase.from('components').select('id').eq('category', cat)
      const { data: noSig } = await supabase.from('components').select('id').eq('category', cat).is('sound_signature', null)
      const { data: summit } = await supabase.from('components').select('id').eq('category', cat).eq('budget_tier', 'Summit-Fi')
      console.log(`  ${label}: ${all?.length} total, ${noSig?.length} missing sig, ${summit?.length} summit-fi`)
    }
  }
}

main().catch(console.error)
