#!/usr/bin/env node

/**
 * Clean corrupted tone_grade data in database
 *
 * Some tone_grade entries contain text snippets instead of letter grades
 * This script identifies and fixes them
 */

const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  console.log('🧹 Cleaning corrupted tone_grade data...\n')

  // Fetch all components with tone_grade data
  const { data: components, error } = await supabase
    .from('components')
    .select('id, name, brand, tone_grade, technical_grade')
    .not('tone_grade', 'is', null)

  if (error) {
    console.error('❌ Error fetching components:', error)
    return
  }

  console.log(`Found ${components.length} components with tone_grade data\n`)

  const corrupted = []
  const valid = []

  // Check each tone_grade
  for (const comp of components) {
    const grade = comp.tone_grade

    // Valid grades are 1-3 characters (A, A+, A-, S+, etc.)
    if (grade.length > 3) {
      corrupted.push(comp)
      console.log(`❌ Corrupted: ${comp.name} (${comp.brand})`)
      console.log(`   Grade: "${grade.substring(0, 50)}..."`)
    } else {
      valid.push(comp)
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`  • Valid grades: ${valid.length}`)
  console.log(`  • Corrupted grades: ${corrupted.length}`)

  if (corrupted.length === 0) {
    console.log('\n✅ No corrupted data found!')
    return
  }

  // Analyze corrupted data for patterns
  console.log('\n🔍 Analyzing corruption patterns...')

  const patterns = {
    hasQuotes: 0,
    hasBackslash: 0,
    startsWithLowercase: 0,
    tooLong: 0
  }

  for (const comp of corrupted) {
    const grade = comp.tone_grade
    if (grade.includes('"')) patterns.hasQuotes++
    if (grade.includes('\\')) patterns.hasBackslash++
    if (grade[0] === grade[0].toLowerCase()) patterns.startsWithLowercase++
    if (grade.length > 50) patterns.tooLong++
  }

  console.log('  Patterns found:')
  console.log(`    • Contains quotes: ${patterns.hasQuotes}`)
  console.log(`    • Contains backslash: ${patterns.hasBackslash}`)
  console.log(`    • Starts lowercase: ${patterns.startsWithLowercase}`)
  console.log(`    • Very long (>50 chars): ${patterns.tooLong}`)

  // Check for --execute flag
  const execute = process.argv.includes('--execute')

  if (!execute) {
    console.log('\n🔸 DRY RUN MODE')
    console.log('🔸 To fix corrupted data, run with --execute flag')
    console.log('🔸 This will set corrupted tone_grades to NULL')
    return
  }

  console.log('\n🔄 Fixing corrupted data...')

  // Set corrupted tone_grades to NULL
  const ids = corrupted.map(c => c.id)

  const { error: updateError } = await supabase
    .from('components')
    .update({ tone_grade: null })
    .in('id', ids)

  if (updateError) {
    console.error('❌ Error updating:', updateError)
    return
  }

  console.log(`✅ Fixed ${corrupted.length} corrupted tone_grade entries`)

  // Now populate expert_grade_numeric for valid grades
  console.log('\n🔢 Updating expert_grade_numeric...')

  const gradeMap = {
    'S+': 1.0,
    'S': 0.95,
    'S-': 0.9,
    'A+': 0.85,
    'A': 0.8,
    'A-': 0.75,
    'B+': 0.7,
    'B': 0.65,
    'B-': 0.6,
    'C+': 0.55,
    'C': 0.5,
    'C-': 0.45,
    'D': 0.4,
    'F': 0.2
  }

  let updated = 0

  for (const comp of valid) {
    const toneScore = gradeMap[comp.tone_grade?.toUpperCase()]
    const techScore = gradeMap[comp.technical_grade?.toUpperCase()]

    if (!toneScore && !techScore) continue

    let numericGrade
    if (toneScore && techScore) {
      numericGrade = (toneScore + techScore) / 2
    } else {
      numericGrade = toneScore || techScore
    }

    const { error } = await supabase
      .from('components')
      .update({ expert_grade_numeric: numericGrade })
      .eq('id', comp.id)

    if (!error) updated++
  }

  console.log(`✅ Updated ${updated} expert_grade_numeric values`)
  console.log('\n🎉 Cleanup complete!')
}

main().catch(console.error)