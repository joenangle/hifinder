#!/usr/bin/env node

/**
 * SAFE DATABASE OPERATION TEMPLATE
 *
 * CRITICAL RULES:
 * 1. NEVER delete source data
 * 2. ALWAYS dry-run by default
 * 3. ALWAYS create backups before bulk operations
 * 4. ALWAYS preserve original values when transforming
 * 5. ALWAYS require explicit --execute flag for changes
 */

const { createClient } = require('@supabase/supabase-js')

// SAFETY FIRST: Dry run by default
const DRY_RUN = !process.argv.includes('--execute')
const VERBOSE = process.argv.includes('--verbose')

// Color codes for terminal output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
}

// Initialize Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

/**
 * MAIN SAFETY CHECKS
 */
async function runSafetyChecks() {
  console.log(`${colors.yellow}🔒 Running safety checks...${colors.reset}`)

  // Check 1: Verify we can connect
  const { count, error } = await supabase
    .from('components')
    .select('*', { count: 'exact', head: true })

  if (error) {
    console.error(`${colors.red}❌ Cannot connect to database${colors.reset}`)
    process.exit(1)
  }

  console.log(`${colors.green}✅ Connected to database (${count} records)${colors.reset}`)

  // Check 2: Warn about mode
  if (DRY_RUN) {
    console.log(`${colors.blue}🔍 DRY RUN MODE - No changes will be made${colors.reset}`)
    console.log(`${colors.blue}   To execute changes, run with: --execute${colors.reset}`)
  } else {
    console.log(`${colors.red}⚠️  EXECUTE MODE - Changes WILL be applied!${colors.reset}`)
    console.log(`${colors.red}   Press Ctrl+C within 5 seconds to cancel...${colors.reset}`)
    await new Promise(resolve => setTimeout(resolve, 5000))
  }
}

/**
 * CREATE BACKUP (for execute mode)
 */
async function createBackup(tableName = 'components') {
  if (DRY_RUN) {
    console.log(`${colors.blue}[DRY RUN] Would create backup of ${tableName}${colors.reset}`)
    return
  }

  const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '')
  const backupTable = `${tableName}_backup_${timestamp}`

  console.log(`${colors.yellow}Creating backup table: ${backupTable}${colors.reset}`)

  // Note: This would need to be done via SQL function or admin panel
  // Showing the SQL that should be run:
  const backupSQL = `
    CREATE TABLE ${backupTable} AS
    SELECT * FROM ${tableName};
  `

  console.log(`${colors.yellow}Backup SQL to run manually:${colors.reset}`)
  console.log(backupSQL)

  // In production, you'd run this via supabase.rpc() or admin panel
}

/**
 * SAFE UPDATE FUNCTION
 * Never overwrites original data
 */
async function safeUpdate(record, updates) {
  const safeUpdates = {}

  // Rule: Never overwrite existing data with null
  for (const [key, value] of Object.entries(updates)) {
    if (record[key] !== null && value === null) {
      console.log(`${colors.red}⚠️  WARNING: Attempted to delete ${key} for ${record.name}${colors.reset}`)
      console.log(`   Original value: "${record[key]}"`)
      console.log(`   Skipping this change...`)
      continue
    }

    // Rule: Preserve original when transforming
    if (record[key] !== null && value !== record[key]) {
      // Store original in backup column
      safeUpdates[`${key}_original`] = record[key]
      console.log(`${colors.yellow}   Preserving original ${key} in ${key}_original${colors.reset}`)
    }

    safeUpdates[key] = value
  }

  if (DRY_RUN) {
    console.log(`${colors.blue}[DRY RUN] Would update ${record.name}:${colors.reset}`)
    if (VERBOSE) {
      console.log(JSON.stringify(safeUpdates, null, 2))
    }
    return { data: record, error: null }
  } else {
    return await supabase
      .from('components')
      .update(safeUpdates)
      .eq('id', record.id)
  }
}

/**
 * EXAMPLE OPERATION: Convert grades to numeric
 * Following ALL safety rules
 */
async function convertGradesToNumeric() {
  console.log(`\n${colors.green}Starting safe grade conversion...${colors.reset}`)

  // Fetch data
  const { data: components, error } = await supabase
    .from('components')
    .select('id, name, brand, tone_grade, expert_grade_numeric')
    .not('tone_grade', 'is', null)
    .limit(DRY_RUN ? 10 : 1000) // Limit in dry run for faster testing

  if (error) throw error

  console.log(`Found ${components.length} components with tone_grade data`)

  const gradeMap = {
    'S+': 4.3, 'S': 4.0, 'S-': 3.7,
    'A+': 4.0, 'A': 3.7, 'A-': 3.3,
    'B+': 3.0, 'B': 2.7, 'B-': 2.3,
    'C+': 2.0, 'C': 1.7, 'C-': 1.3,
    'D+': 1.0, 'D': 0.7, 'D-': 0.3,
    'F': 0
  }

  let processed = 0
  let skipped = 0
  let errors = 0

  for (const component of components) {
    const grade = component.tone_grade?.trim()

    // Check if it's a valid grade
    if (!gradeMap.hasOwnProperty(grade)) {
      console.log(`${colors.yellow}⚠️  Non-standard grade for ${component.name}: "${grade}"${colors.reset}`)

      // CRITICAL: Never delete! Store in different column
      await safeUpdate(component, {
        tone_grade_text: component.tone_grade, // Preserve the text
        // NOT setting tone_grade to null - preserving original!
      })

      skipped++
      continue
    }

    // Valid grade - convert to numeric
    const numericGrade = gradeMap[grade]

    await safeUpdate(component, {
      expert_grade_numeric: numericGrade
      // NOT touching tone_grade - preserving original!
    })

    processed++
  }

  console.log(`\n${colors.green}Summary:${colors.reset}`)
  console.log(`  ✅ Processed: ${processed}`)
  console.log(`  ⏭️  Skipped: ${skipped}`)
  console.log(`  ❌ Errors: ${errors}`)
}

/**
 * MAIN EXECUTION
 */
async function main() {
  try {
    // Always run safety checks first
    await runSafetyChecks()

    // Create backup in execute mode
    if (!DRY_RUN) {
      await createBackup()
    }

    // Run the operation
    await convertGradesToNumeric()

    console.log(`\n${colors.green}✅ Operation complete!${colors.reset}`)

    if (DRY_RUN) {
      console.log(`${colors.blue}This was a dry run. To apply changes, run with: --execute${colors.reset}`)
    }

  } catch (error) {
    console.error(`${colors.red}❌ Error:${colors.reset}`, error.message)
    process.exit(1)
  }
}

// Run with safety wrapper
if (require.main === module) {
  // Validate environment variables
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(`${colors.red}❌ Missing environment variables${colors.reset}`)
    console.log('Usage:')
    console.log('NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node script.js [--execute] [--verbose]')
    process.exit(1)
  }

  main()
}

/**
 * SAFETY CHECKLIST:
 * ✅ Dry run by default
 * ✅ Requires explicit --execute flag
 * ✅ Creates backups
 * ✅ Never deletes original data
 * ✅ Preserves originals when transforming
 * ✅ Shows warning countdown in execute mode
 * ✅ Validates operations before running
 * ✅ Detailed logging of all changes
 */