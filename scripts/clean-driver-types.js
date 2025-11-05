/**
 * Clean and normalize driver_type data
 *
 * Issues to fix:
 * 1. Grade values (A+, S-, B, etc.) imported into driver_type column
 * 2. Inconsistent naming (DD vs Dynamic, Planar Magnetic vs Planar)
 * 3. IEM hybrid configurations need standardization
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Grade values that should be removed
const GRADE_VALUES = ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'S+', 'S', 'S-', 'D', 'F', '?']

// Normalization mappings
const NORMALIZATION_MAP = {
  // Headphones
  'DD': 'Dynamic',
  'dynamic': 'Dynamic',
  'Planar Magnetic': 'Planar',
  'planar': 'Planar',
  'Electrostatic': 'Electrostatic',
  'electrostatic': 'Electrostatic',

  // IEMs - keep as-is but standardize format
  'BA': 'BA', // Balanced Armature
  'Dynamic': 'Dynamic'
}

async function cleanDriverTypes() {
  console.log('Starting driver_type cleanup...\n')

  // Get all components with driver_type
  const { data: components, error } = await supabase
    .from('components')
    .select('id, name, brand, category, driver_type')
    .not('driver_type', 'is', null)

  if (error) {
    console.error('Error fetching components:', error)
    return
  }

  console.log(`Found ${components.length} components with driver_type\n`)

  let removedGrades = 0
  let normalized = 0
  const updates = []

  for (const component of components) {
    let newDriverType = component.driver_type
    let shouldUpdate = false

    // Remove if it's a grade value
    if (GRADE_VALUES.includes(component.driver_type)) {
      newDriverType = null
      shouldUpdate = true
      removedGrades++
      console.log(`❌ Removing grade "${component.driver_type}" from: ${component.brand} ${component.name}`)
    }
    // Normalize known values
    else if (NORMALIZATION_MAP[component.driver_type]) {
      newDriverType = NORMALIZATION_MAP[component.driver_type]
      if (newDriverType !== component.driver_type) {
        shouldUpdate = true
        normalized++
        console.log(`🔄 Normalizing "${component.driver_type}" → "${newDriverType}": ${component.brand} ${component.name}`)
      }
    }

    if (shouldUpdate) {
      updates.push({
        id: component.id,
        driver_type: newDriverType
      })
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`  - Grade values to remove: ${removedGrades}`)
  console.log(`  - Values to normalize: ${normalized}`)
  console.log(`  - Total updates: ${updates.length}`)

  if (updates.length === 0) {
    console.log('\n✅ No updates needed!')
    return
  }

  // Confirm before executing
  const shouldExecute = process.argv.includes('--execute')

  if (!shouldExecute) {
    console.log('\n⚠️  DRY RUN MODE - No changes made')
    console.log('Run with --execute to apply changes')
    return
  }

  console.log('\n🚀 Executing updates...')

  // Update in batches
  for (const update of updates) {
    const { error } = await supabase
      .from('components')
      .update({ driver_type: update.driver_type })
      .eq('id', update.id)

    if (error) {
      console.error(`Error updating ${update.id}:`, error)
    }
  }

  console.log('\n✅ Cleanup complete!')

  // Show final stats
  const { data: afterStats } = await supabase
    .from('components')
    .select('category, driver_type')
    .in('category', ['cans', 'iems'])

  const canStats = afterStats.filter(c => c.category === 'cans')
  const iemStats = afterStats.filter(c => c.category === 'iems')

  const cansWithDriver = canStats.filter(c => c.driver_type).length
  const iemsWithDriver = iemStats.filter(c => c.driver_type).length

  console.log('\n📈 Final Coverage:')
  console.log(`  Headphones: ${cansWithDriver}/${canStats.length} (${(100 * cansWithDriver / canStats.length).toFixed(1)}%)`)
  console.log(`  IEMs: ${iemsWithDriver}/${iemStats.length} (${(100 * iemsWithDriver / iemStats.length).toFixed(1)}%)`)

  // Show unique driver types
  const uniqueCans = [...new Set(canStats.filter(c => c.driver_type).map(c => c.driver_type))].sort()
  const uniqueIems = [...new Set(iemStats.filter(c => c.driver_type).map(c => c.driver_type))].sort()

  console.log('\n🎯 Unique Driver Types:')
  console.log(`  Headphones: ${uniqueCans.join(', ')}`)
  console.log(`  IEMs (first 20): ${uniqueIems.slice(0, 20).join(', ')}${uniqueIems.length > 20 ? '...' : ''}`)
}

cleanDriverTypes().catch(console.error)
