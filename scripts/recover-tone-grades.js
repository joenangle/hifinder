/**
 * Recover tone grades that were accidentally deleted
 *
 * The grades (A+, S-, B, etc.) were imported into driver_type column by mistake.
 * We cleaned them out, but should have moved them to tone_grade instead.
 * This script recovers them from the original Crinacle CSV files.
 */

const fs = require('fs')
const path = require('path')
const { parse } = require('csv-parse/sync')
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Fuzzy matching utilities (from merge-crinacle-cans.js)
const MULTI_WORD_BRANDS = [
  'Audio Technica', 'Audio-Technica', 'Focal Stellia', 'Meze Audio',
  'Ultimate Ears', 'Beyerdynamic', 'Sennheiser', 'Austrian Audio',
  'Drop + Sennheiser', 'Moondrop', 'HiFiMAN', 'Hifiman'
]

function splitBrandAndModel(fullName) {
  for (const brand of MULTI_WORD_BRANDS) {
    const brandLower = brand.toLowerCase()
    const nameLower = fullName.toLowerCase()
    if (nameLower.startsWith(brandLower)) {
      return {
        brand: fullName.substring(0, brand.length).trim(),
        model: fullName.substring(brand.length).trim()
      }
    }
  }

  const parts = fullName.split(' ')
  return {
    brand: parts[0],
    model: parts.slice(1).join(' ')
  }
}

function levenshteinDistance(a, b) {
  const matrix = []
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }
  return matrix[b.length][a.length]
}

function fuzzyMatch(str1, str2) {
  const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '')
  const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '')
  const maxLen = Math.max(s1.length, s2.length)
  if (maxLen === 0) return 1
  const distance = levenshteinDistance(s1, s2)
  return 1 - distance / maxLen
}

async function recoverToneGrades() {
  console.log('🔄 Recovering tone grades from Crinacle CSV files...\n')

  // Read IEM CSV
  const iemCsv = fs.readFileSync('data/crinacle/Crinacle Headphone List - IEM.csv', 'utf-8')
  const iemRecords = parse(iemCsv, { columns: true, skip_empty_lines: true })

  // Read Headphones CSV
  const cansCsv = fs.readFileSync('data/crinacle/Crinacle Headphone List - Cans.csv', 'utf-8')
  const cansRecords = parse(cansCsv, { columns: true, skip_empty_lines: true })

  console.log(`📁 Loaded ${iemRecords.length} IEM records from CSV`)
  console.log(`📁 Loaded ${cansRecords.length} headphone records from CSV\n`)

  // Get all components from database
  const { data: dbComponents, error } = await supabase
    .from('components')
    .select('id, name, brand, category, tone_grade, technical_grade')
    .in('category', ['iems', 'cans'])

  if (error) {
    console.error('Error fetching components:', error)
    return
  }

  console.log(`💾 Loaded ${dbComponents.length} components from database\n`)

  const updates = []
  let matched = 0
  let notMatched = 0

  for (const dbComp of dbComponents) {
    const csvRecords = dbComp.category === 'iems' ? iemRecords : cansRecords
    const dbBrandModel = `${dbComp.brand} ${dbComp.name}`

    let bestMatch = null
    let bestScore = 0

    for (const csvRecord of csvRecords) {
      const csvModel = csvRecord.Model
      if (!csvModel) continue

      const similarity = fuzzyMatch(dbBrandModel, csvModel)
      if (similarity > bestScore) {
        bestScore = similarity
        bestMatch = csvRecord
      }
    }

    if (bestScore >= 0.8 && bestMatch) {
      const toneGrade = bestMatch['Tone Grade']
      const techGrade = bestMatch['Technical Grade']

      if (toneGrade || techGrade) {
        updates.push({
          id: dbComp.id,
          name: dbComp.name,
          brand: dbComp.brand,
          tone_grade: toneGrade || null,
          technical_grade: techGrade || null,
          matched_to: bestMatch.Model,
          similarity: bestScore
        })
        matched++
        console.log(`✅ ${dbComp.brand} ${dbComp.name} → ${toneGrade || '(none)'}/${techGrade || '(none)'} (${(bestScore * 100).toFixed(0)}% match)`)
      }
    } else {
      notMatched++
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`  - Matched and will update: ${matched}`)
  console.log(`  - No match found: ${notMatched}`)
  console.log(`  - Total updates: ${updates.length}`)

  if (updates.length === 0) {
    console.log('\n✅ No updates needed!')
    return
  }

  const shouldExecute = process.argv.includes('--execute')

  if (!shouldExecute) {
    console.log('\n⚠️  DRY RUN MODE - No changes made')
    console.log('Run with --execute to apply changes')
    return
  }

  console.log('\n🚀 Executing updates...')

  for (const update of updates) {
    const { error } = await supabase
      .from('components')
      .update({
        tone_grade: update.tone_grade,
        technical_grade: update.technical_grade
      })
      .eq('id', update.id)

    if (error) {
      console.error(`Error updating ${update.id}:`, error)
    }
  }

  console.log('\n✅ Recovery complete!')
}

recoverToneGrades().catch(console.error)
