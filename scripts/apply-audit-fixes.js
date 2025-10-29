import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: join(__dirname, '..', '.env.local') })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

// Load audit report
const auditReport = JSON.parse(
  readFileSync(join(__dirname, '..', 'data', 'component-audit-report.json'), 'utf-8')
)

const DRY_RUN = !process.argv.includes('--execute')

console.log('🔧 COMPONENT AUDIT FIXES\n')
console.log(`Mode: ${DRY_RUN ? 'DRY RUN (preview only)' : 'EXECUTION MODE'}\n`)

if (DRY_RUN) {
  console.log('⚠️  This is a DRY RUN. No changes will be made.')
  console.log('   Run with --execute flag to apply changes.\n')
}

// Category fixes
const categoryFixes = auditReport.categorization_fixes.filter(
  fix => fix.current_category !== fix.correct_category
)

console.log('=' .repeat(80))
console.log('CATEGORY CORRECTIONS')
console.log('='.repeat(80) + '\n')

if (categoryFixes.length === 0) {
  console.log('✅ No category corrections needed\n')
} else {
  console.log(`Found ${categoryFixes.length} components needing category correction:\n`)

  for (const fix of categoryFixes) {
    console.log(`📝 ${fix.name}`)
    console.log(`   ID: ${fix.id}`)
    console.log(`   Change: ${fix.current_category} → ${fix.correct_category}`)
    console.log(`   Reason: ${fix.reasoning}\n`)

    if (!DRY_RUN) {
      const { error } = await supabase
        .from('components')
        .update({ category: fix.correct_category })
        .eq('id', fix.id)

      if (error) {
        console.error(`   ❌ ERROR: ${error.message}\n`)
      } else {
        console.log(`   ✅ Updated successfully\n`)
      }
    }
  }
}

// Technical specifications enrichment
console.log('\n' + '='.repeat(80))
console.log('TECHNICAL SPECIFICATIONS ENRICHMENT')
console.log('='.repeat(80) + '\n')

let updatesApplied = 0
let updatesFailed = 0

for (const enrichment of auditReport.data_enrichment) {
  const updates = {}
  const changes = []

  // Build update object
  if (enrichment.missing_fields.impedance !== undefined && enrichment.missing_fields.impedance !== null) {
    updates.impedance = enrichment.missing_fields.impedance
    changes.push(`impedance: ${enrichment.missing_fields.impedance}Ω`)
  }

  if (enrichment.missing_fields.driver_type) {
    updates.driver_type = enrichment.missing_fields.driver_type
    changes.push(`driver_type: ${enrichment.missing_fields.driver_type}`)
  }

  if (enrichment.missing_fields.needs_amp !== undefined) {
    updates.needs_amp = enrichment.missing_fields.needs_amp
    changes.push(`needs_amp: ${enrichment.missing_fields.needs_amp}`)
  }

  if (enrichment.missing_fields.fit) {
    updates.fit = enrichment.missing_fields.fit
    changes.push(`fit: ${enrichment.missing_fields.fit}`)
  }

  if (Object.keys(updates).length === 0) {
    continue
  }

  console.log(`📝 ${enrichment.name}`)
  console.log(`   ID: ${enrichment.id}`)
  console.log(`   Updates: ${changes.join(', ')}`)
  console.log(`   Source: ${enrichment.source}`)
  if (enrichment.notes) {
    console.log(`   Notes: ${enrichment.notes}`)
  }

  if (!DRY_RUN) {
    const { error } = await supabase
      .from('components')
      .update(updates)
      .eq('id', enrichment.id)

    if (error) {
      console.error(`   ❌ ERROR: ${error.message}\n`)
      updatesFailed++
    } else {
      console.log(`   ✅ Updated successfully\n`)
      updatesApplied++
    }
  } else {
    console.log()
  }
}

// Summary
console.log('\n' + '='.repeat(80))
console.log('SUMMARY')
console.log('='.repeat(80) + '\n')

if (DRY_RUN) {
  console.log(`Category corrections to apply: ${categoryFixes.length}`)
  console.log(`Technical spec updates to apply: ${auditReport.data_enrichment.length}`)
  console.log('\n✅ Dry run complete. Run with --execute to apply changes.')
} else {
  console.log(`Category corrections applied: ${categoryFixes.length}`)
  console.log(`Technical spec updates applied: ${updatesApplied}`)
  if (updatesFailed > 0) {
    console.log(`Failed updates: ${updatesFailed}`)
  }
  console.log('\n✅ All updates complete!')
}

console.log('\n' + '='.repeat(80))
console.log('SPECIAL NOTES FROM AUDIT')
console.log('='.repeat(80) + '\n')

auditReport.summary.special_notes.forEach(note => {
  console.log(`⚠️  ${note}`)
})

console.log()
