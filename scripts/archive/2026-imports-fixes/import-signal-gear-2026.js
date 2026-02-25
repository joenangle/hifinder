#!/usr/bin/env node
/**
 * Comprehensive Signal Gear Import Script (Feb 2026)
 *
 * Adds amps, DACs, and combo DAC/amps to the HiFinder database.
 * Data compiled from ASR, community recommendations, and retailer research.
 *
 * Usage:
 *   node scripts/import-signal-gear-2026.js              # Dry run (preview only)
 *   node scripts/import-signal-gear-2026.js --execute     # Actually insert/update
 *   node scripts/import-signal-gear-2026.js --category amp  # Only amps
 *   node scripts/import-signal-gear-2026.js --category dac  # Only DACs
 *   node scripts/import-signal-gear-2026.js --category combo # Only combos
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ============================================================
// AMPLIFIERS - Standalone headphone amps
// ============================================================
const AMPS = [
  // Budget ($50-$150)
  { brand: 'Schiit', name: 'Magni+', price_new: 109, power_output: '2.4W @ 32Ω, 350mW @ 300Ω', asr_sinad: 110, sound_signature: 'neutral' },
  { brand: 'Geshelli', name: 'Archel 3', price_new: 119, power_output: '1W @ 32Ω', asr_sinad: null, sound_signature: 'warm' },
  // Mid ($150-$500)
  { brand: 'Schiit', name: 'Magnius', price_new: 199, power_output: '2.2W @ 32Ω SE, 5W @ 32Ω balanced', asr_sinad: 119, sound_signature: 'neutral' },
  { brand: 'Schiit', name: 'Asgard 3', price_new: 229, power_output: '3.5W @ 32Ω, 500mW @ 300Ω', asr_sinad: 100, sound_signature: 'warm' },
  { brand: 'Geshelli', name: 'Erish 2', price_new: 239, power_output: '2W @ 32Ω', asr_sinad: null, sound_signature: 'neutral' },
  { brand: 'Little Dot', name: 'MK III', price_new: 299, power_output: null, asr_sinad: null, sound_signature: 'warm' },
  { brand: 'xDuoo', name: 'TA-26', price_new: 349, power_output: '2W @ 32Ω', asr_sinad: null, sound_signature: 'warm' },
  { brand: 'Aune', name: 'S9c Pro', price_new: 349, power_output: '2W @ 32Ω', asr_sinad: null, sound_signature: 'neutral' },
  { brand: 'Schiit', name: 'Valhalla 2', price_new: 399, power_output: '650mW @ 50Ω, 450mW @ 300Ω', asr_sinad: null, sound_signature: 'warm' },
  { brand: 'Singxer', name: 'SA-1', price_new: 399, power_output: '8W @ 32Ω balanced', asr_sinad: 116, sound_signature: 'neutral' },
  { brand: 'Lake People', name: 'G111', price_new: 449, power_output: '4W @ 32Ω', asr_sinad: 110, sound_signature: 'neutral' },
  // High ($500-$1500)
  { brand: 'iFi', name: 'Pro iCAN', price_new: 499, power_output: '4.5W @ 16Ω', asr_sinad: 105, sound_signature: 'neutral' },
  { brand: 'SMSL', name: 'VMV A2', price_new: 699, power_output: '5W @ 32Ω balanced', asr_sinad: 120, sound_signature: 'neutral' },
  { brand: 'Flux Lab', name: 'Volot', price_new: 849, power_output: '8W @ 32Ω', asr_sinad: 115, sound_signature: 'neutral' },
  { brand: 'Gustard', name: 'A26', price_new: 899, power_output: '8W @ 32Ω balanced', asr_sinad: 118, sound_signature: 'neutral' },
  { brand: 'Burson', name: 'Soloist 3X GT', price_new: 1199, power_output: '4W @ 32Ω', asr_sinad: 100, sound_signature: 'warm' },
  { brand: 'Ferrum', name: 'OOR', price_new: 1399, power_output: '4W @ 32Ω', asr_sinad: 110, sound_signature: 'neutral' },
  { brand: 'SPL', name: 'Phonitor SE', price_new: 1399, power_output: '2.2W @ 32Ω', asr_sinad: 105, sound_signature: 'neutral' },
  { brand: 'Cayin', name: 'HA-300', price_new: 1399, power_output: '2W @ 32Ω', asr_sinad: null, sound_signature: 'warm' },
  // Summit ($1500+)
  { brand: 'HeadAmp', name: 'GS-X mini', price_new: 1499, power_output: '3W @ 32Ω', asr_sinad: 108, sound_signature: 'neutral' },
  { brand: 'Grace Design', name: 'm900', price_new: 1595, power_output: '2W @ 32Ω', asr_sinad: 108, sound_signature: 'neutral' },
  { brand: 'Feliks Audio', name: 'Euforia', price_new: 1699, power_output: null, asr_sinad: null, sound_signature: 'warm' },
  { brand: 'Violectric', name: 'V550', price_new: 2499, power_output: '4W @ 32Ω', asr_sinad: 112, sound_signature: 'neutral' },
  { brand: 'Niimbus', name: 'US4+', price_new: 2499, power_output: '8W @ 32Ω', asr_sinad: 118, sound_signature: 'neutral' },
  { brand: 'HeadAmp', name: 'GS-X mk2', price_new: 3299, power_output: '8W @ 32Ω', asr_sinad: 110, sound_signature: 'neutral' },
  { brand: 'SPL', name: 'Phonitor XE', price_new: 3499, power_output: '4W @ 32Ω', asr_sinad: 108, sound_signature: 'neutral' },
]

// ============================================================
// DACs - Standalone digital-to-analog converters
// ============================================================
const DACS = [
  // Budget ($50-$200)
  { brand: 'SMSL', name: 'SU-1', price_new: 89, asr_sinad: 112, sound_signature: 'neutral' },
  { brand: 'FiiO', name: 'K11', price_new: 109, asr_sinad: null, sound_signature: 'neutral' },
  { brand: 'Topping', name: 'E30 II', price_new: 139, asr_sinad: 120, sound_signature: 'neutral' },
  { brand: 'SMSL', name: 'D-6', price_new: 189, asr_sinad: 121, sound_signature: 'neutral' },
  { brand: 'iFi', name: 'Zen DAC 3', price_new: 199, asr_sinad: null, sound_signature: 'neutral' },
  // Mid ($200-$600)
  { brand: 'Schiit', name: 'Modius', price_new: 249, asr_sinad: 111, sound_signature: 'neutral' },
  { brand: 'Topping', name: 'D50s', price_new: 279, asr_sinad: 121, sound_signature: 'neutral' },
  { brand: 'SMSL', name: 'SU-9', price_new: 399, asr_sinad: 121, sound_signature: 'neutral' },
  { brand: 'Gustard', name: 'A18', price_new: 499, asr_sinad: null, sound_signature: 'neutral' },
  { brand: 'Gustard', name: 'X16', price_new: 549, asr_sinad: 120, sound_signature: 'neutral' },
  { brand: 'Topping', name: 'E70 Velvet', price_new: 599, asr_sinad: 123, sound_signature: 'neutral' },
  // High ($600-$1500)
  { brand: 'iFi', name: 'NEO iDSD', price_new: 649, asr_sinad: null, sound_signature: 'neutral' },
  { brand: 'Schiit', name: 'Bifrost 2', price_new: 749, asr_sinad: null, sound_signature: 'warm' },
  { brand: 'Audio-GD', name: 'R2R-11', price_new: 799, asr_sinad: null, sound_signature: 'warm' },
  { brand: 'Denafrips', name: 'Ares II', price_new: 849, asr_sinad: null, sound_signature: 'warm' },
  { brand: 'Gustard', name: 'X18', price_new: 849, asr_sinad: null, sound_signature: 'neutral' },
  { brand: 'Topping', name: 'Centaurus R2R', price_new: 999, asr_sinad: null, sound_signature: 'warm' },
  // Summit ($1500+)
  { brand: 'Denafrips', name: 'Pontus II', price_new: 1799, asr_sinad: null, sound_signature: 'warm' },
  { brand: 'Holo Audio', name: 'Spring 3 KTE', price_new: 3999, asr_sinad: null, sound_signature: 'warm' },
  { brand: 'Denafrips', name: 'Terminator II', price_new: 4999, asr_sinad: null, sound_signature: 'warm' },
  { brand: 'Holo Audio', name: 'May KTE', price_new: 5999, asr_sinad: null, sound_signature: 'warm' },
]

// ============================================================
// COMBOS - DAC/Amp combo units (desktop + portable/dongle)
// ============================================================
const COMBOS = [
  // Dongles ($10-$80)
  { brand: 'ddHiFi', name: 'TC44C', price_new: 25, power_output: '78mW @ 32Ω', asr_sinad: null, sound_signature: 'neutral' },
  { brand: 'Moondrop', name: 'Dawn Pro', price_new: 50, power_output: '230mW @ 32Ω', asr_sinad: null, sound_signature: 'neutral' },
  { brand: 'Moondrop', name: 'Dawn 4.4', price_new: 60, power_output: '230mW @ 32Ω balanced', asr_sinad: null, sound_signature: 'neutral' },
  { brand: 'Hidizs', name: 'S9 Pro', price_new: 79, power_output: '200mW @ 32Ω', asr_sinad: null, sound_signature: 'neutral' },
  { brand: 'TempoTec', name: 'Sonata BHD Pro', price_new: 65, power_output: '200mW @ 32Ω', asr_sinad: null, sound_signature: 'neutral' },
  // Budget portable ($80-$200)
  { brand: 'Shanling', name: 'UA5', price_new: 130, power_output: '250mW @ 32Ω', asr_sinad: null, sound_signature: 'neutral' },
  { brand: 'FiiO', name: 'BTR7', price_new: 130, power_output: '320mW @ 32Ω', asr_sinad: null, sound_signature: 'neutral' },
  { brand: 'iFi', name: 'GO bar', price_new: 169, power_output: '475mW @ 32Ω', asr_sinad: null, sound_signature: 'neutral' },
  { brand: 'Cayin', name: 'RU6', price_new: 199, power_output: '200mW @ 32Ω', asr_sinad: null, sound_signature: 'warm' },
  { brand: 'FiiO', name: 'KA17', price_new: 150, power_output: '650mW @ 32Ω', asr_sinad: null, sound_signature: 'neutral' },
  // Budget desktop ($100-$300)
  { brand: 'Schiit', name: 'Fulla 4', price_new: 99, power_output: '400mW @ 32Ω', asr_sinad: null, sound_signature: 'neutral' },
  { brand: 'Schiit', name: 'Fulla E', price_new: 59, power_output: '300mW @ 32Ω', asr_sinad: null, sound_signature: 'neutral' },
  { brand: 'Schiit', name: 'Hel 2E', price_new: 199, power_output: '1.2W @ 32Ω', asr_sinad: 110, sound_signature: 'neutral' },
  { brand: 'iFi', name: 'Zen DAC V3', price_new: 199, power_output: '1W @ 32Ω', asr_sinad: null, sound_signature: 'neutral' },
  { brand: 'FiiO', name: 'K7', price_new: 199, power_output: '2W @ 32Ω', asr_sinad: 114, sound_signature: 'neutral' },
  { brand: 'FiiO', name: 'K9 Pro ESS', price_new: 599, power_output: '1.5W @ 32Ω', asr_sinad: null, sound_signature: 'neutral' },
  // Mid desktop ($300-$700)
  { brand: 'Topping', name: 'DX5 II', price_new: 299, power_output: '1.8W @ 32Ω', asr_sinad: null, sound_signature: 'neutral' },
  { brand: 'Topping', name: 'DX7 Pro', price_new: 599, power_output: '2.3W @ 32Ω', asr_sinad: 118, sound_signature: 'neutral' },
  { brand: 'SMSL', name: 'DO300', price_new: 429, power_output: '2.6W @ 32Ω', asr_sinad: null, sound_signature: 'neutral' },
  { brand: 'Loxjie', name: 'D50', price_new: 399, power_output: '2W @ 32Ω', asr_sinad: null, sound_signature: 'neutral' },
  { brand: 'iFi', name: 'NEO iDSD 2', price_new: 699, power_output: '1.9W @ 32Ω', asr_sinad: null, sound_signature: 'neutral' },
  // High ($700-$2000)
  { brand: 'Chord', name: 'Mojo 2', price_new: 599, power_output: '600mW @ 8Ω', asr_sinad: null, sound_signature: 'warm' },
  { brand: 'iFi', name: 'iDSD Diablo', price_new: 999, power_output: '5W @ 32Ω', asr_sinad: null, sound_signature: 'neutral' },
  { brand: 'Cayin', name: 'RU7', price_new: 299, power_output: '500mW @ 32Ω', asr_sinad: null, sound_signature: 'warm' },
]

// ============================================================
// Import Logic
// ============================================================

// Levenshtein distance for fuzzy matching
function levenshtein(a, b) {
  const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null))
  for (let i = 0; i <= a.length; i++) matrix[0][i] = i
  for (let j = 0; j <= b.length; j++) matrix[j][0] = j
  for (let j = 1; j <= b.length; j++) {
    for (let i = 1; i <= a.length; i++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[j][i] = Math.min(
        matrix[j][i - 1] + 1,
        matrix[j - 1][i] + 1,
        matrix[j - 1][i - 1] + cost
      )
    }
  }
  return matrix[b.length][a.length]
}

function similarity(a, b) {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(a.toLowerCase(), b.toLowerCase()) / maxLen
}

async function findExisting(brand, name, category) {
  // Exact match first
  const { data: exact } = await supabase
    .from('components')
    .select('id, brand, name, price_new, asr_sinad, power_output, sound_signature')
    .eq('category', category)
    .ilike('brand', brand)
    .ilike('name', name)
    .single()

  if (exact) return exact

  // Fuzzy match — check all components in category
  const { data: all } = await supabase
    .from('components')
    .select('id, brand, name, price_new, asr_sinad, power_output, sound_signature')
    .eq('category', category)

  if (!all) return null

  for (const comp of all) {
    const brandSim = similarity(brand, comp.brand)
    const nameSim = similarity(name, comp.name)
    if (brandSim >= 0.8 && nameSim >= 0.8) {
      return comp
    }
  }

  return null
}

function budgetTier(price) {
  if (!price) return 'Entry Level'
  if (price <= 100) return 'Budget'
  if (price <= 300) return 'Entry Level'
  if (price <= 700) return 'Mid Range'
  if (price <= 1500) return 'High End'
  return 'Summit-Fi'
}

async function importComponents(components, category, executeMode) {
  const categoryLabel = category === 'dac_amp' ? 'combo' : category
  console.log(`\n📦 Processing ${components.length} ${categoryLabel}s...`)

  let added = 0, updated = 0, skipped = 0, errors = 0

  for (const comp of components) {
    const existing = await findExisting(comp.brand, comp.name, category)

    if (existing) {
      // Check if we have new data to update
      const updates = {}
      if (comp.price_new && (!existing.price_new || existing.price_new !== comp.price_new)) {
        updates.price_new = comp.price_new
      }
      if (comp.asr_sinad && !existing.asr_sinad) {
        updates.asr_sinad = comp.asr_sinad
      }
      if (comp.power_output && !existing.power_output) {
        updates.power_output = comp.power_output
      }
      if (comp.sound_signature && !existing.sound_signature) {
        updates.sound_signature = comp.sound_signature
      }

      if (Object.keys(updates).length > 0) {
        if (executeMode) {
          const { error } = await supabase
            .from('components')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', existing.id)

          if (error) {
            console.log(`  ❌ Error updating ${comp.brand} ${comp.name}: ${error.message}`)
            errors++
          } else {
            const changes = Object.entries(updates).map(([k, v]) => `${k}=${v}`).join(', ')
            console.log(`  ✏️  Updated: ${comp.brand} ${comp.name} (${changes})`)
            updated++
          }
        } else {
          const changes = Object.entries(updates).map(([k, v]) => `${k}=${v}`).join(', ')
          console.log(`  📝 Would update: ${comp.brand} ${comp.name} (${changes})`)
          updated++
        }
      } else {
        console.log(`  ⏭️  Skipped (exists, no new data): ${comp.brand} ${comp.name}`)
        skipped++
      }
    } else {
      // Insert new component
      const newComp = {
        brand: comp.brand,
        name: comp.name,
        category: category,
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
        const { error } = await supabase
          .from('components')
          .insert(newComp)

        if (error) {
          console.log(`  ❌ Error adding ${comp.brand} ${comp.name}: ${error.message}`)
          errors++
        } else {
          console.log(`  ➕ Added: ${comp.brand} ${comp.name} ($${comp.price_new})`)
          added++
        }
      } else {
        console.log(`  📝 Would add: ${comp.brand} ${comp.name} ($${comp.price_new})`)
        added++
      }
    }
  }

  return { added, updated, skipped, errors }
}

async function main() {
  const args = process.argv.slice(2)
  const executeMode = args.includes('--execute')
  const categoryArg = args.includes('--category') ? args[args.indexOf('--category') + 1] : null

  console.log('🎧 HiFinder Signal Gear Import (Feb 2026)')
  console.log('═══════════════════════════════════════════')
  console.log(executeMode ? '⚠️  EXECUTE MODE — Changes will be written to database' : '👀 DRY RUN — No changes will be made')
  console.log('')

  // Get current counts
  const { data: currentAmps } = await supabase.from('components').select('id', { count: 'exact' }).eq('category', 'amp')
  const { data: currentDacs } = await supabase.from('components').select('id', { count: 'exact' }).eq('category', 'dac')
  const { data: currentCombos } = await supabase.from('components').select('id', { count: 'exact' }).eq('category', 'dac_amp')

  console.log('Current database:')
  console.log(`  Amps: ${currentAmps?.length || 0}`)
  console.log(`  DACs: ${currentDacs?.length || 0}`)
  console.log(`  Combos: ${currentCombos?.length || 0}`)
  console.log(`  Total signal gear: ${(currentAmps?.length || 0) + (currentDacs?.length || 0) + (currentCombos?.length || 0)}`)

  const totals = { added: 0, updated: 0, skipped: 0, errors: 0 }

  if (!categoryArg || categoryArg === 'amp') {
    const r = await importComponents(AMPS, 'amp', executeMode)
    totals.added += r.added; totals.updated += r.updated; totals.skipped += r.skipped; totals.errors += r.errors
  }
  if (!categoryArg || categoryArg === 'dac') {
    const r = await importComponents(DACS, 'dac', executeMode)
    totals.added += r.added; totals.updated += r.updated; totals.skipped += r.skipped; totals.errors += r.errors
  }
  if (!categoryArg || categoryArg === 'combo') {
    const r = await importComponents(COMBOS, 'dac_amp', executeMode)
    totals.added += r.added; totals.updated += r.updated; totals.skipped += r.skipped; totals.errors += r.errors
  }

  console.log('\n═══════════════════════════════════════════')
  console.log('Summary:')
  console.log(`  Added:   ${totals.added}`)
  console.log(`  Updated: ${totals.updated}`)
  console.log(`  Skipped: ${totals.skipped}`)
  console.log(`  Errors:  ${totals.errors}`)
  console.log('═══════════════════════════════════════════')

  if (!executeMode && totals.added > 0) {
    console.log(`\nRun with --execute to apply ${totals.added} additions and ${totals.updated} updates.`)
  }
}

main().catch(console.error)
