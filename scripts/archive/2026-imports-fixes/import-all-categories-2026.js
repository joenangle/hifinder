#!/usr/bin/env node
/**
 * All-Categories Import & Data Fix Script (Feb 2026)
 *
 * Comprehensive database cleanup and import across all component categories:
 *   - IEMs: 87 price fixes, ~70 corrupted driver_type fixes, 1 category fix, ~10 new models
 *   - DACs: 4 price fixes
 *   - Amps: 1 price fix
 *   - Combos (dac_amp): 5 price fixes
 *   - Cans: Already handled by import-cans-2026.js (skipped here)
 *
 * Usage:
 *   node scripts/import-all-categories-2026.js                  # Dry run (preview only)
 *   node scripts/import-all-categories-2026.js --execute         # Actually insert/update
 *   node scripts/import-all-categories-2026.js --category iems   # Only IEMs
 *   node scripts/import-all-categories-2026.js --category dac    # Only DACs
 *   node scripts/import-all-categories-2026.js --category amp    # Only amps
 *   node scripts/import-all-categories-2026.js --category combo  # Only combos
 *   node scripts/import-all-categories-2026.js --fixes-only      # Only data/price fixes
 *   node scripts/import-all-categories-2026.js --imports-only    # Only new models
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ============================================================
// IEM Price Fixes — 87 entries with price_new = 0 or null
// Prices researched Feb 2026 from retailers, used markets
// ============================================================
const IEM_PRICE_FIXES = [
  { brand: '64 Audio', name: 'U12t', price_new: 1999, sound_signature: 'neutral' },
  { brand: '7Hz Salnotes', name: 'Zero', price_new: 20, sound_signature: 'neutral' },
  { brand: 'A&K', name: 'T8iE', price_new: 350, sound_signature: 'warm' },  // discontinued, used
  { brand: 'Abyss', name: 'AB-1266 Phi CC', price_new: 5999, sound_signature: 'neutral' },  // ALSO: move to cans
  { brand: 'Acoustune', name: 'HS1695Ti', price_new: 950, sound_signature: 'fun' },
  { brand: 'Audio Technica', name: 'ATH-LS200', price_new: 200, sound_signature: 'neutral' },  // discontinued
  { brand: 'Audiosense', name: 'DT200', price_new: 149, sound_signature: 'neutral' },
  { brand: 'CrinEar', name: 'Meta', price_new: 250, sound_signature: 'bright' },  // limited, sold out
  { brand: 'Dita', name: 'Sakura 71', price_new: 700, sound_signature: 'fun' },  // limited, used
  { brand: 'Drop x JVC', name: 'HA-FDX1', price_new: 250, sound_signature: 'neutral' },  // discontinued
  { brand: 'DUNU', name: 'DK-2001', price_new: 270, sound_signature: 'fun' },
  { brand: 'DUNU', name: 'Talos', price_new: 200, sound_signature: 'bright' },
  { brand: 'DUNU', name: 'Titan 1', price_new: 50, sound_signature: 'bright' },  // discontinued
  { brand: 'DUNU', name: 'Titan 3', price_new: 60, sound_signature: 'neutral' },  // discontinued
  { brand: 'DUNU', name: 'DK-3001 Pro', price_new: 469, sound_signature: 'warm' },
  { brand: 'DUNU x Z Reviews', name: 'SA6 Ultra', price_new: 580, sound_signature: 'neutral' },
  { brand: 'Elysian', name: 'Pilgrim', price_new: 400, sound_signature: 'neutral' },
  { brand: 'Etymotic', name: 'ER4PT', price_new: 200, sound_signature: 'neutral' },  // discontinued, used — also fix driver_type
  { brand: 'Etymotic', name: 'ER4B', price_new: 150, sound_signature: 'bright' },  // discontinued
  { brand: 'FatFreq', name: 'Grand Maestro', price_new: 2729, sound_signature: 'fun' },
  { brand: 'Hidition', name: 'Viento', price_new: 1100, sound_signature: 'neutral' },  // custom
  { brand: 'iBasso', name: 'IT04', price_new: 499, sound_signature: 'fun' },
  { brand: 'Jomo', name: 'Samba', price_new: 1725, sound_signature: 'fun' },
  { brand: 'Kiwi Ears', name: 'Astral', price_new: 299, sound_signature: 'neutral' },
  { brand: 'Kiwi Ears', name: 'Orchestra', price_new: 249, sound_signature: 'neutral' },
  { brand: 'Kiwi Ears', name: 'HBB PUNCH', price_new: 449, sound_signature: 'fun' },
  { brand: 'Kumitate', name: 'KL-REF Type S', price_new: 1100, sound_signature: 'neutral' },  // custom
  { brand: 'LETSHUOER', name: 'Cadenza 12', price_new: 1999, sound_signature: 'neutral' },
  { brand: 'LETSHUOER', name: 'MYSTIC 8', price_new: 989, sound_signature: 'bright' },
  { brand: 'Lypertek', name: 'PurePlay Z3 2.0', price_new: 99, sound_signature: 'neutral' },
  { brand: 'Massdrop x Noble', name: 'Kaiser 10', price_new: 600, sound_signature: 'neutral' },  // discontinued
  { brand: 'Mofasest', name: 'M14', price_new: 300, sound_signature: 'warm' },  // discontinued
  { brand: 'Moondrop', name: 'Chu', price_new: 20, sound_signature: 'neutral' },
  { brand: 'Moondrop', name: 'S8', price_new: 700, sound_signature: 'fun' },
  { brand: 'Moondrop', name: 'A8', price_new: 670, sound_signature: 'fun' },
  { brand: 'Moondrop', name: 'Kanas Pro', price_new: 180, sound_signature: 'fun' },
  { brand: 'Moondrop', name: 'Aria', price_new: 79, sound_signature: 'fun' },
  { brand: 'Moondrop', name: 'CHU 2', price_new: 19, sound_signature: 'neutral' },
  { brand: 'Moondrop', name: 'Starfield', price_new: 110, sound_signature: 'fun' },
  { brand: 'Moondrop', name: 'KXXS', price_new: 190, sound_signature: 'fun' },
  { brand: 'Moondrop', name: 'Crescent', price_new: 30, sound_signature: 'warm' },  // discontinued
  { brand: 'Moondrop', name: 'Blessing 2', price_new: 320, sound_signature: 'neutral' },
  { brand: 'Prisma', name: 'Azul', price_new: 299, sound_signature: 'neutral' },
  { brand: 'Samsung', name: 'Galaxy Buds+', price_new: 50, sound_signature: 'fun' },  // discontinued
  { brand: 'See Audio', name: 'Yume', price_new: 169, sound_signature: 'warm' },
  { brand: 'Simgot', name: 'EM6L Phoenix', price_new: 110, sound_signature: 'warm' },
  { brand: 'Simgot', name: 'EA500LM', price_new: 109, sound_signature: 'warm' },
  { brand: 'Simgot', name: 'EW200', price_new: 35, sound_signature: 'warm' },
  { brand: 'SIMGOT', name: 'EW300', price_new: 69, sound_signature: 'warm' },
  { brand: 'SIMGOT', name: 'SUPERMIX4', price_new: 150, sound_signature: 'neutral' },
  { brand: 'Softears', name: 'Studio 4', price_new: 449, sound_signature: 'neutral' },
  { brand: 'Softears', name: 'Twilight', price_new: 930, sound_signature: 'fun' },
  { brand: 'Softears', name: 'RSV', price_new: 700, sound_signature: 'warm' },
  { brand: 'Sony', name: 'MDR-EX1000', price_new: 400, sound_signature: 'bright' },  // discontinued, used
  { brand: 'Sony', name: 'MDR-AS800AP', price_new: 30, sound_signature: 'warm' },  // discontinued
  { brand: 'Sony', name: 'XBA-H3', price_new: 150, sound_signature: 'warm' },  // discontinued
  { brand: 'Sony', name: 'MH755', price_new: 15, sound_signature: 'fun' },  // discontinued
  { brand: 'Sony', name: 'Z1R', price_new: 1700, sound_signature: 'fun' },  // IER-Z1R
  { brand: 'Sony', name: 'XBA-N3', price_new: 200, sound_signature: 'warm' },  // discontinued
  { brand: 'Soranik', name: 'Bastille Signature', price_new: 1299, sound_signature: 'fun' },
  { brand: 'Subtonic', name: 'SUBTONIC STORM', price_new: 5200, sound_signature: 'neutral' },
  { brand: 'Symphonium', name: 'Crimson', price_new: 1499, sound_signature: 'fun' },
  { brand: 'Tanchjim', name: 'Oxygen', price_new: 220, sound_signature: 'fun' },
  { brand: 'TangZu', name: 'Waner', price_new: 19, sound_signature: 'neutral' },
  { brand: 'Thieaudio', name: 'HYPE 4', price_new: 399, sound_signature: 'fun' },
  { brand: 'Thieaudio', name: 'Prestige LTD', price_new: 1299, sound_signature: 'bright' },
  { brand: 'Thieaudio', name: 'Monarch MK4', price_new: 1149, sound_signature: 'warm' },
  { brand: 'Thieaudio', name: 'Monarch Mk3', price_new: 999, sound_signature: 'warm' },
  { brand: 'Thieaudio', name: 'ThieAudio Legacy 4 (L4)', price_new: 195, sound_signature: 'neutral' },
  { brand: 'Thieaudio', name: 'Monarch', price_new: 729, sound_signature: 'warm' },  // original, discontinued
  { brand: 'Thieaudio', name: 'Valhalla', price_new: 1999, sound_signature: 'neutral' },
  { brand: 'Thieaudio', name: 'ThieAudio Legacy 5 (L5)', price_new: 249, sound_signature: 'neutral' },
  { brand: 'ThieAudio', name: 'Excalibur', price_new: 529, sound_signature: 'fun' },
  { brand: 'ThieAudio', name: 'Clairvoyance', price_new: 700, sound_signature: 'warm' },
  { brand: 'Tripowin', name: 'Lea', price_new: 25, sound_signature: 'fun' },
  { brand: 'Tripowin x HBB', name: 'Olina SE', price_new: 100, sound_signature: 'neutral' },
  { brand: 'Truthear', name: 'HEXA', price_new: 80, sound_signature: 'neutral' },
  { brand: 'Truthear', name: 'Hola', price_new: 20, sound_signature: 'warm' },
  { brand: 'Truthear', name: 'NOVA', price_new: 150, sound_signature: 'neutral' },
  { brand: 'Ultimate Ears', name: 'Reference Monitor (UERM)', price_new: 600, sound_signature: 'neutral' },  // discontinued
  { brand: 'Ultimate Ears', name: 'UE18+ Pro Gen 2', price_new: 1599, sound_signature: 'warm' },
  { brand: 'Ultimate Ears', name: 'UE4 Pro', price_new: 399, sound_signature: 'neutral' },
  { brand: 'XENNS', name: 'Tea Pro', price_new: 359, sound_signature: 'fun' },
  { brand: 'Yanyin', name: 'Carmen', price_new: 849, sound_signature: 'warm' },
  { brand: 'ZIIGAAT', name: 'Arcanis', price_new: 399, sound_signature: 'neutral' },
  { brand: 'ZIIGAAT', name: 'Luna', price_new: 379, sound_signature: 'warm' },
  { brand: 'ZIIGAAT', name: 'Odyssey', price_new: 229, sound_signature: 'neutral' },
]

// ============================================================
// IEM Category Fixes — headphones miscategorized as IEMs
// ============================================================
const IEM_CATEGORY_FIXES = [
  { brand: 'Abyss', name: 'AB-1266 Phi CC', new_category: 'cans', note: 'Flagship planar headphone, not IEM' },
]

// ============================================================
// Signal Gear Price Fixes — DACs, Amps, Combos with missing prices
// ============================================================
const DAC_PRICE_FIXES = [
  { brand: 'JDS Labs', name: 'Atom DAC+', price_new: 109, sound_signature: 'neutral' },
  { brand: 'Schiit', name: 'Modi+', price_new: 129, sound_signature: 'neutral' },
  { brand: 'Topping', name: 'D10s', price_new: 99, sound_signature: 'neutral' },
  { brand: 'Topping', name: 'D70s', price_new: 549, sound_signature: 'neutral' },
]

const AMP_PRICE_FIXES = [
  { brand: 'Schiit', name: 'Magni 3+', price_new: 99, sound_signature: 'neutral' },  // discontinued
]

const COMBO_PRICE_FIXES = [
  { brand: 'FiiO', name: 'BTR5', price_new: 109, sound_signature: 'neutral' },
  { brand: 'iFi', name: 'Zen DAC V2', price_new: 179, sound_signature: 'warm' },
  { brand: 'iFi', name: 'Hip DAC', price_new: 149, sound_signature: 'warm' },
  { brand: 'iFi', name: 'Nano iDSD Black Label', price_new: 199, sound_signature: 'warm' },
  { brand: 'JDS Labs', name: 'Element III', price_new: 399, sound_signature: 'neutral' },
]

// ============================================================
// New IEM Models to Import
// ============================================================
const NEW_IEMS = [
  { brand: 'Moondrop', name: 'Variations', price_new: 520, driver_type: '2BA 1DD', sound_signature: 'neutral' },
  { brand: 'Moondrop', name: 'KATO', price_new: 190, driver_type: 'DD', sound_signature: 'neutral' },
  { brand: 'FiiO', name: 'FH9', price_new: 600, driver_type: '6BA 1DD', sound_signature: 'warm' },
  { brand: 'Letshuoer', name: 'S12 Pro', price_new: 170, driver_type: 'Planar', sound_signature: 'neutral' },
  { brand: '7Hz', name: 'Dioko', price_new: 100, driver_type: 'Planar', sound_signature: 'neutral' },
  { brand: 'Truthear', name: 'Zero RED', price_new: 55, driver_type: '1BA 1DD', sound_signature: 'neutral' },
  { brand: 'Simgot', name: 'EA1000 Fermat', price_new: 219, driver_type: 'DD', sound_signature: 'neutral' },
  { brand: 'DUNU', name: 'Vulkan', price_new: 380, driver_type: '2BA 1DD', sound_signature: 'warm' },
  { brand: 'Campfire Audio', name: 'Mammoth', price_new: 549, driver_type: 'DD', sound_signature: 'warm' },
  { brand: 'Sennheiser', name: 'IE 600', price_new: 700, driver_type: 'DD', sound_signature: 'neutral' },
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

function budgetTier(price) {
  if (!price) return 'Entry Level'
  if (price <= 100) return 'Budget'
  if (price <= 300) return 'Entry Level'
  if (price <= 700) return 'Mid Range'
  if (price <= 1500) return 'High End'
  return 'Summit-Fi'
}

async function findExisting(brand, name, category) {
  // Exact match first
  const { data: exact } = await supabase
    .from('components')
    .select('id, brand, name, price_new, sound_signature, impedance, driver_type, budget_tier, power_output, asr_sinad')
    .eq('category', category)
    .ilike('brand', brand)
    .ilike('name', name)
    .single()

  if (exact) return exact

  // Fuzzy match
  const { data: all } = await supabase
    .from('components')
    .select('id, brand, name, price_new, sound_signature, impedance, driver_type, budget_tier, power_output, asr_sinad')
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

// ============================================================
// Phase: Fix prices for existing entries in a category
// ============================================================

async function fixPrices(priceFixes, category, executeMode) {
  const label = category === 'dac_amp' ? 'combo' : category
  console.log(`\n  --- ${label.toUpperCase()} price fixes (${priceFixes.length} entries) ---`)

  let fixed = 0, skipped = 0, errors = 0

  for (const entry of priceFixes) {
    const existing = await findExisting(entry.brand, entry.name, category)

    if (!existing) {
      console.log(`    !! Not found: ${entry.brand} ${entry.name}`)
      errors++
      continue
    }

    const updates = {}

    // Fix price
    if (entry.price_new && (!existing.price_new || existing.price_new === 0)) {
      updates.price_new = entry.price_new
      updates.price_used_min = Math.round(entry.price_new * 0.65)
      updates.price_used_max = Math.round(entry.price_new * 0.85)
      updates.budget_tier = budgetTier(entry.price_new)
    }

    // Fix sound_signature if missing
    if (entry.sound_signature && !existing.sound_signature) {
      updates.sound_signature = entry.sound_signature
    }

    if (Object.keys(updates).length === 0) {
      skipped++
      continue
    }

    const changeList = Object.entries(updates)
      .filter(([k]) => !['price_used_min', 'price_used_max'].includes(k))
      .map(([k, v]) => {
        const old = existing[k]
        return `${k}: ${old || '(empty)'} → ${v}`
      }).join(', ')

    if (executeMode) {
      const { error } = await supabase
        .from('components')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', existing.id)

      if (error) {
        console.log(`    !! Error: ${entry.brand} ${entry.name}: ${error.message}`)
        errors++
      } else {
        console.log(`    FIX: ${entry.brand} ${entry.name} — ${changeList}`)
        fixed++
      }
    } else {
      console.log(`    [dry] FIX: ${entry.brand} ${entry.name} — ${changeList}`)
      fixed++
    }
  }

  return { fixed, skipped, errors }
}

// ============================================================
// Phase: Fix corrupted driver_type fields in IEMs
// (crin_comments leaked into driver_type during import)
// ============================================================

async function fixCorruptedDriverTypes(executeMode) {
  console.log('\n  --- IEM corrupted driver_type fixes ---')

  const { data: allIems } = await supabase
    .from('components')
    .select('id, brand, name, driver_type')
    .eq('category', 'iems')
    .not('driver_type', 'is', null)

  let fixed = 0
  const corrupted = allIems.filter(c => c.driver_type && c.driver_type.length > 30)

  console.log(`    Found ${corrupted.length} IEMs with corrupted driver_type (>30 chars)`)

  for (const c of corrupted) {
    if (executeMode) {
      const { error } = await supabase
        .from('components')
        .update({ driver_type: null, updated_at: new Date().toISOString() })
        .eq('id', c.id)

      if (error) {
        console.log(`    !! Error: ${c.brand} ${c.name}: ${error.message}`)
      } else {
        console.log(`    FIX: ${c.brand} ${c.name} — driver_type nulled (was: "${c.driver_type.substring(0, 40)}...")`)
        fixed++
      }
    } else {
      console.log(`    [dry] FIX: ${c.brand} ${c.name} — driver_type → null (was: "${c.driver_type.substring(0, 40)}...")`)
      fixed++
    }
  }

  return { fixed }
}

// ============================================================
// Phase: Fix category for miscategorized entries
// ============================================================

async function fixCategories(categoryFixes, sourceCategory, executeMode) {
  console.log(`\n  --- Category corrections from ${sourceCategory} ---`)

  let fixed = 0, errors = 0

  for (const entry of categoryFixes) {
    const { data: found } = await supabase
      .from('components')
      .select('id, brand, name, category, price_new, budget_tier')
      .eq('category', sourceCategory)
      .ilike('brand', entry.brand)
      .ilike('name', entry.name)
      .single()

    if (!found) {
      console.log(`    !! Not found: ${entry.brand} ${entry.name}`)
      errors++
      continue
    }

    // Also fix budget_tier if price exists but tier is wrong
    const updates = { category: entry.new_category }
    if (found.price_new && found.price_new > 0) {
      const correctTier = budgetTier(found.price_new)
      if (found.budget_tier !== correctTier) {
        updates.budget_tier = correctTier
      }
    }

    if (executeMode) {
      const { error } = await supabase
        .from('components')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', found.id)

      if (error) {
        console.log(`    !! Error: ${entry.brand} ${entry.name}: ${error.message}`)
        errors++
      } else {
        console.log(`    MOVE: ${entry.brand} ${entry.name} — ${sourceCategory} → ${entry.new_category} (${entry.note})`)
        fixed++
      }
    } else {
      console.log(`    [dry] MOVE: ${entry.brand} ${entry.name} — ${sourceCategory} → ${entry.new_category} (${entry.note})`)
      fixed++
    }
  }

  return { fixed, errors }
}

// ============================================================
// Phase: Import new models
// ============================================================

async function importNewModels(models, category, executeMode) {
  const label = category === 'dac_amp' ? 'combo' : category
  console.log(`\n  --- New ${label} imports (${models.length} models) ---`)

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
      if (comp.driver_type && !existing.driver_type) updates.driver_type = comp.driver_type
      if (comp.sound_signature && !existing.sound_signature) updates.sound_signature = comp.sound_signature
      if (comp.impedance && !existing.impedance) updates.impedance = comp.impedance
      if (comp.power_output && !existing.power_output) updates.power_output = comp.power_output
      if (comp.asr_sinad && !existing.asr_sinad) updates.asr_sinad = comp.asr_sinad

      if (Object.keys(updates).length > 0) {
        const changes = Object.entries(updates)
          .filter(([k]) => !['price_used_min', 'price_used_max'].includes(k))
          .map(([k, v]) => `${k}=${v}`).join(', ')
        if (executeMode) {
          const { error } = await supabase
            .from('components')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', existing.id)
          if (error) {
            console.log(`    !! Error updating ${comp.brand} ${comp.name}: ${error.message}`)
            errors++
          } else {
            console.log(`    UPD: ${comp.brand} ${comp.name} (${changes})`)
            updated++
          }
        } else {
          console.log(`    [dry] UPD: ${comp.brand} ${comp.name} (${changes})`)
          updated++
        }
      } else {
        skipped++
      }
    } else {
      const newComp = {
        brand: comp.brand,
        name: comp.name,
        category: category,
        price_new: comp.price_new,
        price_used_min: comp.price_new ? Math.round(comp.price_new * 0.65) : null,
        price_used_max: comp.price_new ? Math.round(comp.price_new * 0.85) : null,
        budget_tier: budgetTier(comp.price_new),
        impedance: comp.impedance || null,
        driver_type: comp.driver_type || null,
        sound_signature: comp.sound_signature || null,
        power_output: comp.power_output || null,
        asr_sinad: comp.asr_sinad || null,
        source: 'community_research_2026',
        created_at: new Date().toISOString(),
      }

      if (executeMode) {
        const { error } = await supabase.from('components').insert(newComp)
        if (error) {
          console.log(`    !! Error adding ${comp.brand} ${comp.name}: ${error.message}`)
          errors++
        } else {
          console.log(`    ADD: ${comp.brand} ${comp.name} ($${comp.price_new}) [${newComp.budget_tier}]`)
          added++
        }
      } else {
        console.log(`    [dry] ADD: ${comp.brand} ${comp.name} ($${comp.price_new}) [${newComp.budget_tier}]`)
        added++
      }
    }
  }

  return { added, updated, skipped, errors }
}

// ============================================================
// Phase: Fix IEM budget_tiers that were wrong due to $0 prices
// (Run AFTER price fixes so we can recalculate from real prices)
// ============================================================

async function fixBudgetTiers(category, executeMode) {
  const label = category === 'dac_amp' ? 'combo' : category
  const { data } = await supabase
    .from('components')
    .select('id, brand, name, price_new, budget_tier')
    .eq('category', category)
    .gt('price_new', 0)

  let fixed = 0
  for (const c of data || []) {
    const correctTier = budgetTier(c.price_new)
    if (c.budget_tier !== correctTier) {
      if (executeMode) {
        await supabase
          .from('components')
          .update({ budget_tier: correctTier, updated_at: new Date().toISOString() })
          .eq('id', c.id)
        console.log(`    TIER: ${c.brand} ${c.name} — ${c.budget_tier} → ${correctTier} ($${c.price_new})`)
      } else {
        console.log(`    [dry] TIER: ${c.brand} ${c.name} — ${c.budget_tier} → ${correctTier} ($${c.price_new})`)
      }
      fixed++
    }
  }

  if (fixed > 0) {
    console.log(`    ${label}: ${fixed} budget_tier corrections`)
  }

  return { fixed }
}

// ============================================================
// Main
// ============================================================

async function main() {
  const args = process.argv.slice(2)
  const executeMode = args.includes('--execute')
  const fixesOnly = args.includes('--fixes-only')
  const importsOnly = args.includes('--imports-only')
  const categoryArg = args.includes('--category') ? args[args.indexOf('--category') + 1] : null

  console.log('='.repeat(65))
  console.log(' HiFinder All-Categories Import & Fix Script — February 2026')
  console.log('='.repeat(65))
  console.log(executeMode
    ? '  MODE: EXECUTE — Changes will be written to database'
    : '  MODE: DRY RUN — No changes will be made')
  if (categoryArg) console.log(`  FILTER: ${categoryArg} only`)
  if (fixesOnly) console.log('  SCOPE: fixes only (no new imports)')
  if (importsOnly) console.log('  SCOPE: imports only (no fixes)')
  console.log('')

  // Current counts
  const categories = ['iems', 'dac', 'amp', 'dac_amp']
  for (const cat of categories) {
    const { data: all } = await supabase.from('components').select('id').eq('category', cat)
    const { data: noPrice } = await supabase.from('components').select('id').eq('category', cat).or('price_new.is.null,price_new.eq.0')
    const label = cat === 'dac_amp' ? 'combo' : cat
    console.log(`  ${label}: ${all?.length || 0} total, ${noPrice?.length || 0} missing prices`)
  }

  const totals = { priceFixes: 0, driverFixes: 0, categoryFixes: 0, tierFixes: 0, added: 0, updated: 0, skipped: 0, errors: 0 }

  // ===== IEMs =====
  if (!categoryArg || categoryArg === 'iems') {
    console.log('\n' + '='.repeat(65))
    console.log(' IEMs')
    console.log('='.repeat(65))

    if (!importsOnly) {
      // Price fixes
      const r1 = await fixPrices(IEM_PRICE_FIXES, 'iems', executeMode)
      totals.priceFixes += r1.fixed; totals.skipped += r1.skipped; totals.errors += r1.errors

      // Corrupted driver_type fixes
      const r2 = await fixCorruptedDriverTypes(executeMode)
      totals.driverFixes += r2.fixed

      // Category fixes (Abyss → cans)
      const r3 = await fixCategories(IEM_CATEGORY_FIXES, 'iems', executeMode)
      totals.categoryFixes += r3.fixed; totals.errors += r3.errors

      // Budget tier corrections
      console.log('\n  --- IEM budget_tier corrections ---')
      const r4 = await fixBudgetTiers('iems', executeMode)
      totals.tierFixes += r4.fixed
    }

    if (!fixesOnly) {
      const r5 = await importNewModels(NEW_IEMS, 'iems', executeMode)
      totals.added += r5.added; totals.updated += r5.updated; totals.skipped += r5.skipped; totals.errors += r5.errors
    }
  }

  // ===== DACs =====
  if (!categoryArg || categoryArg === 'dac') {
    console.log('\n' + '='.repeat(65))
    console.log(' DACs')
    console.log('='.repeat(65))

    if (!importsOnly) {
      const r = await fixPrices(DAC_PRICE_FIXES, 'dac', executeMode)
      totals.priceFixes += r.fixed; totals.skipped += r.skipped; totals.errors += r.errors

      console.log('\n  --- DAC budget_tier corrections ---')
      const r2 = await fixBudgetTiers('dac', executeMode)
      totals.tierFixes += r2.fixed
    }
  }

  // ===== Amps =====
  if (!categoryArg || categoryArg === 'amp') {
    console.log('\n' + '='.repeat(65))
    console.log(' Amps')
    console.log('='.repeat(65))

    if (!importsOnly) {
      const r = await fixPrices(AMP_PRICE_FIXES, 'amp', executeMode)
      totals.priceFixes += r.fixed; totals.skipped += r.skipped; totals.errors += r.errors

      console.log('\n  --- Amp budget_tier corrections ---')
      const r2 = await fixBudgetTiers('amp', executeMode)
      totals.tierFixes += r2.fixed
    }
  }

  // ===== Combos =====
  if (!categoryArg || categoryArg === 'combo') {
    console.log('\n' + '='.repeat(65))
    console.log(' Combos (DAC/Amp)')
    console.log('='.repeat(65))

    if (!importsOnly) {
      const r = await fixPrices(COMBO_PRICE_FIXES, 'dac_amp', executeMode)
      totals.priceFixes += r.fixed; totals.skipped += r.skipped; totals.errors += r.errors

      console.log('\n  --- Combo budget_tier corrections ---')
      const r2 = await fixBudgetTiers('dac_amp', executeMode)
      totals.tierFixes += r2.fixed
    }
  }

  // Final summary
  console.log('\n' + '='.repeat(65))
  console.log(' SUMMARY')
  console.log('='.repeat(65))
  console.log(`  Price fixes:            ${totals.priceFixes}`)
  console.log(`  Driver type fixes:      ${totals.driverFixes}`)
  console.log(`  Category corrections:   ${totals.categoryFixes}`)
  console.log(`  Budget tier fixes:      ${totals.tierFixes}`)
  console.log(`  New models added:       ${totals.added}`)
  console.log(`  Existing models updated: ${totals.updated}`)
  console.log(`  Skipped (no changes):   ${totals.skipped}`)
  console.log(`  Errors:                 ${totals.errors}`)
  console.log('='.repeat(65))

  const totalChanges = totals.priceFixes + totals.driverFixes + totals.categoryFixes + totals.tierFixes + totals.added + totals.updated

  if (!executeMode && totalChanges > 0) {
    console.log(`\nRun with --execute to apply ${totalChanges} changes.`)
  }

  if (executeMode) {
    console.log('\nPost-execution counts:')
    for (const cat of categories) {
      const { data: all } = await supabase.from('components').select('id').eq('category', cat)
      const { data: noPrice } = await supabase.from('components').select('id').eq('category', cat).or('price_new.is.null,price_new.eq.0')
      const label = cat === 'dac_amp' ? 'combo' : cat
      console.log(`  ${label}: ${all?.length || 0} total, ${noPrice?.length || 0} missing prices`)
    }
  }
}

main().catch(console.error)
