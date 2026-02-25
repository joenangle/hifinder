#!/usr/bin/env node
/**
 * Headphone (Cans) Import & Data Fix Script (Feb 2026)
 *
 * Fixes existing data quality issues and adds missing popular headphone models.
 *
 * What it does:
 *   1. Fixes 15 entries with missing prices ($0 / null) — fills in current retail/used prices
 *   2. Fixes corrupted driver_type fields (crin_comments leaked into driver_type)
 *   3. Fixes incorrect sound_signatures (ZMF Aeolus/Auteur were wrong)
 *   4. Fixes wrong budget_tiers caused by $0 prices
 *   5. Fixes 2 miscategorized IEMs (Lypertek PurePlay Z3, Hidition Viento → iems)
 *   6. Adds ~28 new popular headphone models across all price tiers
 *
 * Usage:
 *   node scripts/import-cans-2026.js                  # Dry run (preview only)
 *   node scripts/import-cans-2026.js --execute         # Actually insert/update
 *   node scripts/import-cans-2026.js --fixes-only      # Only run data fixes (no new imports)
 *   node scripts/import-cans-2026.js --imports-only     # Only add new models (no fixes)
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// ============================================================
// SECTION 1: Price & Data Fixes for Existing Entries
// ============================================================

const PRICE_FIXES = [
  // Entries with price_new = 0 or null that need real prices + corrected budget_tier
  // Prices researched Feb 2026 from manufacturer sites, Amazon, Drop, Head-Fi
  {
    brand: 'Abyss', name: 'Diana Phi',
    fixes: { price_new: 3999, budget_tier: 'Summit-Fi', impedance: 32, driver_type: 'planar magnetic' },
    note: 'MSRP $3999; discontinued, used ~$2000'
  },
  {
    brand: 'Beyerdynamic', name: 'DT880 Pro',
    fixes: { price_new: 199, budget_tier: 'Entry Level', impedance: 250, driver_type: 'dynamic', sound_signature: 'bright' },
    note: 'Semi-open; 250 ohm version'
  },
  {
    brand: 'Hifiman', name: 'Edition XS',
    fixes: { price_new: 249, budget_tier: 'Entry Level', driver_type: 'planar magnetic' },
    note: 'Reduced from $499 launch; impedance already set (18Ω)'
  },
  {
    brand: 'Hifiman', name: 'HE1000',
    fixes: { price_new: 1399, budget_tier: 'High End', impedance: 35, driver_type: 'planar magnetic' },
    note: 'HE1000 V2 current retail $1399'
  },
  {
    brand: 'Hifiman', name: 'HE500',
    fixes: { price_new: 350, budget_tier: 'Entry Level', driver_type: 'planar magnetic', sound_signature: 'warm' },
    note: 'Discontinued; used market avg ~$350'
  },
  {
    brand: 'Hifiman', name: 'HE560',
    fixes: { price_new: 299, budget_tier: 'Entry Level', impedance: 50, driver_type: 'planar magnetic' },
    note: 'Discontinued; remaining stock/used ~$299'
  },
  {
    brand: 'Sony', name: 'MDR-SA5000',
    fixes: { price_new: 500, budget_tier: 'Mid Range', impedance: 70, driver_type: 'dynamic', sound_signature: 'bright' },
    note: 'Discontinued; used market avg ~$500'
  },
  {
    brand: 'Stax', name: 'SR-404',
    fixes: { price_new: 600, budget_tier: 'Mid Range', driver_type: 'electrostatic' },
    note: 'Discontinued; used market avg ~$600. Requires electrostatic energizer.'
  },
  {
    brand: 'ZMF', name: 'Aeolus',
    fixes: { price_new: 1199, budget_tier: 'High End', impedance: 300, driver_type: 'dynamic', sound_signature: 'warm' },
    note: 'Correcting sound_signature from bright→warm, fixing corrupted driver_type'
  },
  {
    brand: 'ZMF', name: 'Auteur',
    fixes: { price_new: 1599, budget_tier: 'High End', impedance: 300, driver_type: 'dynamic', sound_signature: 'neutral' },
    note: 'Correcting sound_signature from bright→neutral, fixing corrupted driver_type'
  },
  {
    brand: 'ZMF', name: 'Verite',
    fixes: { price_new: 2499, budget_tier: 'Summit-Fi', impedance: 300, driver_type: 'dynamic' },
    note: 'Verite Open; farewell pricing ~$1999 but MSRP $2499'
  },
  {
    brand: 'ZMF', name: 'Verite Closed',
    fixes: { price_new: 2499, budget_tier: 'Summit-Fi', impedance: 300, driver_type: 'dynamic' },
    note: 'Fixing corrupted driver_type field'
  },
  {
    brand: 'MrSpeakers', name: 'Ether C',
    fixes: { price_new: 800, budget_tier: 'Mid Range', impedance: 23, driver_type: 'planar magnetic' },
    note: 'Discontinued (now Dan Clark Audio); used market ~$800. Fixing corrupted driver_type.'
  },
]

// ============================================================
// SECTION 2: Miscategorized Entries (IEMs listed as cans)
// ============================================================

const CATEGORY_FIXES = [
  { brand: 'Lypertek', name: 'PurePlay Z3 2.0', new_category: 'iems', note: 'TWS IEM, not a headphone' },
  { brand: 'Hidition', name: 'Viento', new_category: 'iems', note: 'Custom IEM, not a headphone' },
]

// ============================================================
// SECTION 3: New Headphone Models to Import
// ============================================================

const NEW_CANS = [
  // === Budget (under $150) ===
  { brand: 'Samson', name: 'SR850', price_new: 40, impedance: 32, driver_type: 'dynamic', sound_signature: 'bright' },
  { brand: 'Superlux', name: 'HD681 EVO', price_new: 38, impedance: 32, driver_type: 'dynamic', sound_signature: 'warm' },
  { brand: 'AKG', name: 'K361', price_new: 99, impedance: 32, driver_type: 'dynamic', sound_signature: 'neutral' },
  { brand: 'Creative', name: 'Aurvana Live! SE', price_new: 60, impedance: 32, driver_type: 'dynamic', sound_signature: 'warm' },
  { brand: 'Grado', name: 'SR80x', price_new: 125, impedance: 38, driver_type: 'dynamic', sound_signature: 'bright' },

  // === Entry Level ($150–$300) ===
  { brand: 'Hifiman', name: 'Deva Pro', price_new: 159, impedance: 18, driver_type: 'planar magnetic', sound_signature: 'neutral' },
  { brand: 'Beyerdynamic', name: 'DT 770 Pro X Limited', price_new: 199, impedance: 48, driver_type: 'dynamic', sound_signature: 'fun' },
  { brand: 'Audio-Technica', name: 'ATH-M50xBT2', price_new: 199, impedance: 38, driver_type: 'dynamic', sound_signature: 'fun' },
  { brand: 'Grado', name: 'SR225x', price_new: 225, impedance: 38, driver_type: 'dynamic', sound_signature: 'bright' },
  { brand: 'Austrian Audio', name: 'Hi-X55', price_new: 249, impedance: 25, driver_type: 'dynamic', sound_signature: 'neutral' },
  { brand: 'Beyerdynamic', name: 'DT 700 Pro X', price_new: 259, impedance: 48, driver_type: 'dynamic', sound_signature: 'neutral' },
  { brand: 'Beyerdynamic', name: 'DT 900 Pro X', price_new: 259, impedance: 48, driver_type: 'dynamic', sound_signature: 'bright' },
  { brand: 'Meze', name: '99 Classics', price_new: 309, impedance: 32, driver_type: 'dynamic', sound_signature: 'warm' },

  // === Mid Range ($300–$700) ===
  { brand: 'Sennheiser', name: 'HD 620S', price_new: 349, impedance: 150, driver_type: 'dynamic', sound_signature: 'neutral' },
  { brand: 'Austrian Audio', name: 'Hi-X65', price_new: 499, impedance: 25, driver_type: 'dynamic', sound_signature: 'neutral' },
  { brand: 'Sennheiser', name: 'HD 660S2', price_new: 499, impedance: 300, driver_type: 'dynamic', sound_signature: 'warm' },

  // === High End ($700–$1500) ===
  { brand: 'Meze', name: '109 Pro', price_new: 799, impedance: 40, driver_type: 'dynamic', sound_signature: 'warm' },
  { brand: 'Dan Clark Audio', name: 'Aeon 2 Noire', price_new: 899, impedance: 13, driver_type: 'planar magnetic', sound_signature: 'fun' },
  { brand: 'Hifiman', name: 'Arya Organic', price_new: 979, impedance: 16, driver_type: 'planar magnetic', sound_signature: 'neutral' },
  { brand: 'Focal', name: 'Celestee', price_new: 990, impedance: 35, driver_type: 'dynamic', sound_signature: 'warm' },
  { brand: 'Hifiman', name: 'HE-R10D', price_new: 1299, impedance: 32, driver_type: 'dynamic', sound_signature: 'warm' },

  // === Summit-Fi ($1500+) ===
  { brand: 'Audeze', name: 'MM-500', price_new: 1699, impedance: 18, driver_type: 'planar magnetic', sound_signature: 'neutral' },
  { brand: 'Dan Clark Audio', name: 'Ether 2', price_new: 2199, impedance: 16, driver_type: 'planar magnetic', sound_signature: 'neutral' },
  { brand: 'ZMF', name: 'Caldera', price_new: 3499, impedance: 300, driver_type: 'planar magnetic', sound_signature: 'warm' },
  { brand: 'Dan Clark Audio', name: 'Stealth', price_new: 3999, impedance: 23, driver_type: 'planar magnetic', sound_signature: 'neutral' },
  { brand: 'Dan Clark Audio', name: 'Expanse', price_new: 3999, impedance: 23, driver_type: 'planar magnetic', sound_signature: 'neutral' },
  { brand: 'Audeze', name: 'LCD-5', price_new: 4500, impedance: 14, driver_type: 'planar magnetic', sound_signature: 'neutral' },
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

async function findExisting(brand, name) {
  // Exact match first
  const { data: exact } = await supabase
    .from('components')
    .select('id, brand, name, price_new, sound_signature, impedance, driver_type, budget_tier')
    .eq('category', 'cans')
    .ilike('brand', brand)
    .ilike('name', name)
    .single()

  if (exact) return exact

  // Fuzzy match
  const { data: all } = await supabase
    .from('components')
    .select('id, brand, name, price_new, sound_signature, impedance, driver_type, budget_tier')
    .eq('category', 'cans')

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
// Phase 1: Fix existing entries with bad data
// ============================================================

async function runPriceFixes(executeMode) {
  console.log('\n' + '='.repeat(60))
  console.log('PHASE 1: Price & Data Quality Fixes')
  console.log('='.repeat(60))

  let fixed = 0, skipped = 0, errors = 0

  for (const entry of PRICE_FIXES) {
    // Find the entry by brand + name (fuzzy)
    const existing = await findExisting(entry.brand, entry.name)

    if (!existing) {
      console.log(`  !! Not found in DB: ${entry.brand} ${entry.name}`)
      errors++
      continue
    }

    // Build the update object — only include fields that actually need changing
    const updates = {}
    for (const [key, val] of Object.entries(entry.fixes)) {
      if (val !== undefined && val !== null) {
        const currentVal = existing[key]
        // Update if current value is missing, zero, or corrupted (string longer than expected for driver_type)
        const isMissing = currentVal === null || currentVal === undefined || currentVal === 0
        const isCorrupted = key === 'driver_type' && typeof currentVal === 'string' && currentVal.length > 30
        const isWrong = key === 'sound_signature' && currentVal !== val
        const isBudgetFix = key === 'budget_tier' && currentVal !== val

        if (isMissing || isCorrupted || isWrong || isBudgetFix) {
          updates[key] = val
        }
      }
    }

    // Also recalculate price_used_min/max if we're setting a new price
    if (updates.price_new) {
      updates.price_used_min = Math.round(updates.price_new * 0.65)
      updates.price_used_max = Math.round(updates.price_new * 0.85)
    }

    if (Object.keys(updates).length === 0) {
      console.log(`  -- Skipped (no changes needed): ${existing.brand} ${existing.name}`)
      skipped++
      continue
    }

    const changeList = Object.entries(updates).map(([k, v]) => {
      const old = existing[k]
      const oldStr = old === null || old === undefined || old === 0 ? '(empty)' : String(old).substring(0, 30)
      return `${k}: ${oldStr} → ${v}`
    }).join(', ')

    if (executeMode) {
      const { error } = await supabase
        .from('components')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', existing.id)

      if (error) {
        console.log(`  !! Error fixing ${existing.brand} ${existing.name}: ${error.message}`)
        errors++
      } else {
        console.log(`  FIX: ${existing.brand} ${existing.name} — ${changeList}`)
        fixed++
      }
    } else {
      console.log(`  [dry] FIX: ${existing.brand} ${existing.name} — ${changeList}`)
      fixed++
    }
  }

  return { fixed, skipped, errors }
}

// ============================================================
// Phase 2: Fix miscategorized entries
// ============================================================

async function runCategoryFixes(executeMode) {
  console.log('\n' + '='.repeat(60))
  console.log('PHASE 2: Category Corrections')
  console.log('='.repeat(60))

  let fixed = 0, errors = 0

  for (const entry of CATEGORY_FIXES) {
    const { data: found } = await supabase
      .from('components')
      .select('id, brand, name, category')
      .eq('category', 'cans')
      .ilike('brand', entry.brand)
      .ilike('name', entry.name)
      .single()

    if (!found) {
      console.log(`  !! Not found: ${entry.brand} ${entry.name}`)
      errors++
      continue
    }

    if (executeMode) {
      const { error } = await supabase
        .from('components')
        .update({ category: entry.new_category, updated_at: new Date().toISOString() })
        .eq('id', found.id)

      if (error) {
        console.log(`  !! Error moving ${entry.brand} ${entry.name}: ${error.message}`)
        errors++
      } else {
        console.log(`  MOVE: ${entry.brand} ${entry.name} — cans → ${entry.new_category} (${entry.note})`)
        fixed++
      }
    } else {
      console.log(`  [dry] MOVE: ${entry.brand} ${entry.name} — cans → ${entry.new_category} (${entry.note})`)
      fixed++
    }
  }

  return { fixed, errors }
}

// ============================================================
// Phase 3: Import new headphone models
// ============================================================

async function runNewImports(executeMode) {
  console.log('\n' + '='.repeat(60))
  console.log('PHASE 3: New Headphone Imports')
  console.log('='.repeat(60))

  let added = 0, skipped = 0, updated = 0, errors = 0

  for (const comp of NEW_CANS) {
    const existing = await findExisting(comp.brand, comp.name)

    if (existing) {
      // Check if we can fill in missing data
      const updates = {}
      if (comp.price_new && (!existing.price_new || existing.price_new === 0)) {
        updates.price_new = comp.price_new
        updates.price_used_min = Math.round(comp.price_new * 0.65)
        updates.price_used_max = Math.round(comp.price_new * 0.85)
        updates.budget_tier = budgetTier(comp.price_new)
      }
      if (comp.impedance && !existing.impedance) updates.impedance = comp.impedance
      if (comp.driver_type && !existing.driver_type) updates.driver_type = comp.driver_type
      if (comp.sound_signature && !existing.sound_signature) updates.sound_signature = comp.sound_signature

      if (Object.keys(updates).length > 0) {
        const changes = Object.entries(updates).map(([k, v]) => `${k}=${v}`).join(', ')
        if (executeMode) {
          const { error } = await supabase
            .from('components')
            .update({ ...updates, updated_at: new Date().toISOString() })
            .eq('id', existing.id)

          if (error) {
            console.log(`  !! Error updating ${comp.brand} ${comp.name}: ${error.message}`)
            errors++
          } else {
            console.log(`  UPD: ${comp.brand} ${comp.name} (${changes})`)
            updated++
          }
        } else {
          console.log(`  [dry] UPD: ${comp.brand} ${comp.name} (${changes})`)
          updated++
        }
      } else {
        console.log(`  -- Skipped (exists): ${comp.brand} ${comp.name}`)
        skipped++
      }
    } else {
      // Insert new
      const newComp = {
        brand: comp.brand,
        name: comp.name,
        category: 'cans',
        price_new: comp.price_new,
        price_used_min: comp.price_new ? Math.round(comp.price_new * 0.65) : null,
        price_used_max: comp.price_new ? Math.round(comp.price_new * 0.85) : null,
        budget_tier: budgetTier(comp.price_new),
        impedance: comp.impedance || null,
        driver_type: comp.driver_type || null,
        sound_signature: comp.sound_signature || null,
        source: 'community_research_2026',
        created_at: new Date().toISOString(),
      }

      if (executeMode) {
        const { error } = await supabase
          .from('components')
          .insert(newComp)

        if (error) {
          console.log(`  !! Error adding ${comp.brand} ${comp.name}: ${error.message}`)
          errors++
        } else {
          console.log(`  ADD: ${comp.brand} ${comp.name} ($${comp.price_new}) [${newComp.budget_tier}]`)
          added++
        }
      } else {
        console.log(`  [dry] ADD: ${comp.brand} ${comp.name} ($${comp.price_new}) [${newComp.budget_tier}]`)
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
  const fixesOnly = args.includes('--fixes-only')
  const importsOnly = args.includes('--imports-only')

  console.log('='.repeat(60))
  console.log(' HiFinder Headphone (Cans) Import & Fix Script')
  console.log(' February 2026')
  console.log('='.repeat(60))
  console.log(executeMode
    ? '  MODE: EXECUTE — Changes will be written to database'
    : '  MODE: DRY RUN — No changes will be made')
  console.log('')

  // Current counts
  const { data: currentCans } = await supabase
    .from('components')
    .select('id', { count: 'exact' })
    .eq('category', 'cans')

  const { data: noPriceCans } = await supabase
    .from('components')
    .select('id')
    .eq('category', 'cans')
    .or('price_new.is.null,price_new.eq.0')

  console.log(`Current cans in DB: ${currentCans?.length || 0}`)
  console.log(`Cans missing prices: ${noPriceCans?.length || 0}`)
  console.log(`New models to add: ${NEW_CANS.length}`)
  console.log(`Data fixes queued: ${PRICE_FIXES.length}`)
  console.log(`Category fixes: ${CATEGORY_FIXES.length}`)

  const summary = { fixes: 0, categoryFixes: 0, added: 0, updated: 0, skipped: 0, errors: 0 }

  // Phase 1: Price & data fixes
  if (!importsOnly) {
    const r1 = await runPriceFixes(executeMode)
    summary.fixes += r1.fixed
    summary.skipped += r1.skipped
    summary.errors += r1.errors

    // Phase 2: Category fixes
    const r2 = await runCategoryFixes(executeMode)
    summary.categoryFixes += r2.fixed
    summary.errors += r2.errors
  }

  // Phase 3: New imports
  if (!fixesOnly) {
    const r3 = await runNewImports(executeMode)
    summary.added += r3.added
    summary.updated += r3.updated
    summary.skipped += r3.skipped
    summary.errors += r3.errors
  }

  // Final summary
  console.log('\n' + '='.repeat(60))
  console.log('SUMMARY')
  console.log('='.repeat(60))
  console.log(`  Data fixes applied:     ${summary.fixes}`)
  console.log(`  Category corrections:   ${summary.categoryFixes}`)
  console.log(`  New models added:       ${summary.added}`)
  console.log(`  Existing models updated: ${summary.updated}`)
  console.log(`  Skipped (no changes):   ${summary.skipped}`)
  console.log(`  Errors:                 ${summary.errors}`)
  console.log('='.repeat(60))

  if (!executeMode) {
    const totalChanges = summary.fixes + summary.categoryFixes + summary.added + summary.updated
    if (totalChanges > 0) {
      console.log(`\nRun with --execute to apply ${totalChanges} changes.`)
    } else {
      console.log('\nNo changes needed — database is up to date.')
    }
  } else {
    // Verify final count
    const { data: finalCans } = await supabase
      .from('components')
      .select('id', { count: 'exact' })
      .eq('category', 'cans')

    const { data: finalNoPriceCans } = await supabase
      .from('components')
      .select('id')
      .eq('category', 'cans')
      .or('price_new.is.null,price_new.eq.0')

    console.log(`\nFinal cans count: ${finalCans?.length || 0} (was ${currentCans?.length || 0})`)
    console.log(`Remaining missing prices: ${finalNoPriceCans?.length || 0} (was ${noPriceCans?.length || 0})`)
  }
}

main().catch(console.error)
