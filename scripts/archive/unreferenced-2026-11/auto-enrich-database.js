import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// ============================================================================
// STATIC KNOWLEDGE BASE - No API calls needed, 100% reliable
// ============================================================================

const KNOWN_SPECS = {
  // Sennheiser
  'HD600': { impedance: 300, driver_type: 'Dynamic', needs_amp: true, category: 'cans' },
  'HD650': { impedance: 300, driver_type: 'Dynamic', needs_amp: true, category: 'cans' },
  'HD660S': { impedance: 150, driver_type: 'Dynamic', needs_amp: true, category: 'cans' },
  'HD560S': { impedance: 120, driver_type: 'Dynamic', needs_amp: false, category: 'cans' },
  'HD800': { impedance: 300, driver_type: 'Dynamic', needs_amp: true, category: 'cans' },
  'HD800S': { impedance: 300, driver_type: 'Dynamic', needs_amp: true, category: 'cans' },
  'HD599': { impedance: 50, driver_type: 'Dynamic', needs_amp: false, category: 'cans' },
  'HD25': { impedance: 70, driver_type: 'Dynamic', needs_amp: false, category: 'cans' },
  'HD25 Plus': { impedance: 70, driver_type: 'Dynamic', needs_amp: false, category: 'cans' },

  // Audio-Technica
  'ATH-M50x': { impedance: 38, driver_type: 'Dynamic', needs_amp: false, category: 'cans' },
  'ATH-M40x': { impedance: 35, driver_type: 'Dynamic', needs_amp: false, category: 'cans' },
  'ATH-M70x': { impedance: 35, driver_type: 'Dynamic', needs_amp: false, category: 'cans' },
  'ATH-R70x': { impedance: 470, driver_type: 'Dynamic', needs_amp: true, category: 'cans' },

  // Beyerdynamic
  'DT770 Pro': { impedance: 80, driver_type: 'Dynamic', needs_amp: false, category: 'cans' },
  'DT880 Pro': { impedance: 250, driver_type: 'Dynamic', needs_amp: true, category: 'cans' },
  'DT990 Pro': { impedance: 250, driver_type: 'Dynamic', needs_amp: true, category: 'cans' },
  'DT1990 Pro': { impedance: 250, driver_type: 'Dynamic', needs_amp: true, category: 'cans' },

  // AKG
  'K371': { impedance: 32, driver_type: 'Dynamic', needs_amp: false, category: 'cans' },
  'K702': { impedance: 62, driver_type: 'Dynamic', needs_amp: true, category: 'cans' },
  'K712 Pro': { impedance: 62, driver_type: 'Dynamic', needs_amp: true, category: 'cans' },

  // HiFiMAN
  'Sundara': { impedance: 37, driver_type: 'Planar', needs_amp: true, category: 'cans' },
  'Ananda': { impedance: 25, driver_type: 'Planar', needs_amp: true, category: 'cans' },
  'Edition XS': { impedance: 18, driver_type: 'Planar', needs_amp: true, category: 'cans' },
  'HE400SE': { impedance: 32, driver_type: 'Planar', needs_amp: true, category: 'cans' },
  'HE500': { impedance: 38, driver_type: 'Planar', needs_amp: true, category: 'cans' },

  // Add more as needed...
}

const BRAND_CATEGORY_RULES = {
  // IEM-only brands
  'Moondrop': (name) => {
    // Exception: Moondrop Para and Void are headphones
    if (['Para', 'Void'].includes(name)) return 'cans'
    return 'iems'
  },
  'Truthear': () => 'iems',
  'LETSHUOER': () => 'iems',
  'Kiwi Ears': () => 'iems',
  'BQEYZ': () => 'iems',
  'ZIIGAAT': () => 'iems',
  'Symphonium': () => 'iems',
  'ThieAudio': () => 'iems',
  'Kinera': () => 'iems',
  'DUNU': () => 'iems',
  'Campfire Audio': () => 'iems',
  '64 Audio': () => 'iems',

  // Headphone-only brands (no exceptions)
  'Grado': () => 'cans',
  'ZMF': () => 'cans',
  'HiFiMAN': () => 'cans', // HiFiMAN only makes headphones, despite the HE500 confusion

  // Mixed brands with patterns
  'Audeze': (name) => {
    // Euclid is their only IEM
    if (name === 'Euclid') return 'iems'
    return 'cans'
  },
  'Meze': (name) => {
    // Rai Penta is IEM, others are headphones
    if (name.includes('Rai')) return 'iems'
    return 'cans'
  },
}

const DRIVER_TYPE_PATTERNS = {
  planar: /planar|orthodynamic|isodynamic/i,
  dynamic: /dynamic|dd/i,
  ba: /balanced armature|ba(?!\w)/i,
  hybrid: /hybrid/i,
  electrostatic: /electrostatic|estat/i,
}

// ============================================================================
// ENRICHMENT LOGIC
// ============================================================================

async function enrichDatabase(options = {}) {
  const {
    dryRun = true,
    batchSize = 50,
    minConfidence = 'high', // 'high' | 'medium' | 'low'
  } = options

  console.log(`\n${'='.repeat(80)}`)
  console.log(`🤖 AUTOMATED DATABASE ENRICHMENT`)
  console.log(`${'='.repeat(80)}\n`)
  console.log(`Mode: ${dryRun ? '🔍 DRY RUN (no changes)' : '⚠️  EXECUTE (will modify database)'}`)
  console.log(`Batch Size: ${batchSize}`)
  console.log(`Min Confidence: ${minConfidence}\n`)

  // Fetch components with missing data
  const { data: components, error } = await supabase
    .from('components')
    .select('id, brand, name, category, impedance, driver_type, needs_amp, fit')
    .in('category', ['cans', 'iems'])
    .limit(batchSize)

  if (error) {
    console.error('Error fetching components:', error)
    return
  }

  console.log(`📊 Processing ${components.length} components...\n`)

  const stats = {
    total: components.length,
    highConfidence: 0,
    mediumConfidence: 0,
    lowConfidence: 0,
    updated: 0,
    skipped: 0,
  }

  const updates = []

  for (const component of components) {
    const enrichment = analyzeComponent(component)

    if (enrichment.confidence === 'high') stats.highConfidence++
    else if (enrichment.confidence === 'medium') stats.mediumConfidence++
    else stats.lowConfidence++

    // Only process if meets confidence threshold
    const confidenceLevels = { high: 3, medium: 2, low: 1 }
    if (confidenceLevels[enrichment.confidence] < confidenceLevels[minConfidence]) {
      stats.skipped++
      continue
    }

    if (Object.keys(enrichment.updates).length > 0) {
      updates.push({
        id: component.id,
        name: component.name,
        brand: component.brand,
        confidence: enrichment.confidence,
        updates: enrichment.updates,
        source: enrichment.source,
      })
    }
  }

  // Display results
  console.log(`\n${'='.repeat(80)}`)
  console.log(`📈 ENRICHMENT RESULTS`)
  console.log(`${'='.repeat(80)}\n`)
  console.log(`Total Analyzed: ${stats.total}`)
  console.log(`  • High Confidence: ${stats.highConfidence}`)
  console.log(`  • Medium Confidence: ${stats.mediumConfidence}`)
  console.log(`  • Low Confidence: ${stats.lowConfidence}`)
  console.log(`\nUpdates Ready: ${updates.length}`)
  console.log(`Skipped (low confidence): ${stats.skipped}\n`)

  if (updates.length > 0) {
    console.log(`${'='.repeat(80)}`)
    console.log(`📝 PROPOSED UPDATES`)
    console.log(`${'='.repeat(80)}\n`)

    for (const update of updates) {
      console.log(`✏️  ${update.brand} ${update.name}`)
      console.log(`   Confidence: ${update.confidence.toUpperCase()}`)
      console.log(`   Source: ${update.source}`)
      console.log(`   Updates:`, JSON.stringify(update.updates, null, 6).replace(/\n/g, '\n   '))
      console.log()
    }

    if (!dryRun) {
      console.log(`\n⚙️  Applying ${updates.length} updates...`)

      for (const update of updates) {
        const { error } = await supabase
          .from('components')
          .update(update.updates)
          .eq('id', update.id)

        if (error) {
          console.error(`❌ Error updating ${update.brand} ${update.name}:`, error)
        } else {
          console.log(`✅ Updated: ${update.brand} ${update.name}`)
          stats.updated++
        }
      }

      console.log(`\n✅ Successfully updated ${stats.updated} components!`)
    } else {
      console.log(`\n💡 To apply these changes, run with --execute flag`)
    }
  } else {
    console.log(`ℹ️  No updates needed for this batch`)
  }

  return { stats, updates }
}

function analyzeComponent(component) {
  const { brand, name, category, impedance, driver_type, needs_amp, fit } = component

  const updates = {}
  let confidence = 'low'
  let source = 'unknown'

  // 1. Check static knowledge base (HIGHEST confidence)
  if (KNOWN_SPECS[name]) {
    const specs = KNOWN_SPECS[name]
    confidence = 'high'
    source = 'static knowledge base'

    if (!category || category !== specs.category) updates.category = specs.category
    if (!impedance && specs.impedance) updates.impedance = specs.impedance
    if (!driver_type && specs.driver_type) updates.driver_type = specs.driver_type
    if (needs_amp === null && specs.needs_amp !== undefined) updates.needs_amp = specs.needs_amp

    return { confidence, updates, source }
  }

  // 2. Check brand-based rules (HIGH confidence)
  if (BRAND_CATEGORY_RULES[brand]) {
    const correctCategory = BRAND_CATEGORY_RULES[brand](name)

    if (category !== correctCategory) {
      updates.category = correctCategory
      confidence = 'high'
      source = 'brand categorization rules'
    }
  }

  // 3. Pattern-based inference (MEDIUM confidence)
  // Could add more sophisticated logic here

  return { confidence, updates, source }
}

// ============================================================================
// CLI EXECUTION
// ============================================================================

const args = process.argv.slice(2)
const dryRun = !args.includes('--execute')
const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='))
const batchSize = batchSizeArg ? parseInt(batchSizeArg.split('=')[1]) : 508 // All components by default
const confidenceArg = args.find(arg => arg.startsWith('--confidence='))
const minConfidence = confidenceArg ? confidenceArg.split('=')[1] : 'high'

enrichDatabase({ dryRun, batchSize, minConfidence })
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err)
    process.exit(1)
  })
