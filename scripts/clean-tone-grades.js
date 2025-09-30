const { createClient } = require('@supabase/supabase-js')

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function cleanToneGrades() {
  console.log('🧹 Starting tone_grade cleanup...')

  try {
    // First, get all components with tone_grade data
    const { data: components, error: fetchError } = await supabase
      .from('components')
      .select('id, name, brand, tone_grade')
      .not('tone_grade', 'is', null)

    if (fetchError) throw fetchError

    console.log(`Found ${components.length} components with tone_grade data`)

    // Identify corrupted entries
    const corrupted = []
    const valid = []
    const validGrades = ['S+', 'S', 'S-', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D', 'D-', 'F']

    for (const comp of components) {
      const grade = comp.tone_grade?.trim()

      if (!grade || grade.length > 3 || !validGrades.includes(grade)) {
        corrupted.push(comp)
      } else {
        valid.push(comp)
      }
    }

    console.log(`\n📊 Analysis:`)
    console.log(`✅ Valid grades: ${valid.length}`)
    console.log(`❌ Corrupted grades: ${corrupted.length}`)

    if (corrupted.length > 0) {
      console.log(`\n🔍 Sample corrupted entries:`)
      corrupted.slice(0, 5).forEach(comp => {
        const preview = comp.tone_grade?.substring(0, 50)
        console.log(`  - ${comp.brand} ${comp.name}: "${preview}${comp.tone_grade?.length > 50 ? '...' : ''}"`)
      })

      // Clean corrupted entries (set to null)
      console.log(`\n🧹 Cleaning ${corrupted.length} corrupted entries...`)

      const corruptedIds = corrupted.map(c => c.id)

      const { error: updateError } = await supabase
        .from('components')
        .update({ tone_grade: null })
        .in('id', corruptedIds)

      if (updateError) throw updateError

      console.log('✅ Corrupted tone_grades set to null')
    }

    // Now update expert_grade_numeric for valid entries
    console.log(`\n📊 Converting valid grades to numeric...`)

    const gradeMap = {
      'S+': 4.3, 'S': 4.0, 'S-': 3.7,
      'A+': 4.0, 'A': 3.7, 'A-': 3.3,
      'B+': 3.0, 'B': 2.7, 'B-': 2.3,
      'C+': 2.0, 'C': 1.7, 'C-': 1.3,
      'D+': 1.0, 'D': 0.7, 'D-': 0.3,
      'F': 0
    }

    let updatedCount = 0
    const batchSize = 50

    for (let i = 0; i < valid.length; i += batchSize) {
      const batch = valid.slice(i, i + batchSize)

      for (const comp of batch) {
        const numericGrade = gradeMap[comp.tone_grade.trim()]

        if (numericGrade !== undefined) {
          const { error } = await supabase
            .from('components')
            .update({ expert_grade_numeric: numericGrade })
            .eq('id', comp.id)

          if (!error) updatedCount++
        }
      }

      console.log(`Progress: ${Math.min(i + batchSize, valid.length)}/${valid.length}`)
    }

    console.log(`\n✅ Cleanup complete!`)
    console.log(`   - Cleaned: ${corrupted.length} corrupted entries`)
    console.log(`   - Updated: ${updatedCount} numeric grades`)

    // Show final statistics
    const { data: stats } = await supabase
      .from('components')
      .select('category, expert_grade_numeric')
      .not('expert_grade_numeric', 'is', null)

    const categoryStats = {}
    stats.forEach(item => {
      if (!categoryStats[item.category]) {
        categoryStats[item.category] = { count: 0, sum: 0 }
      }
      categoryStats[item.category].count++
      categoryStats[item.category].sum += item.expert_grade_numeric
    })

    console.log(`\n📊 Final Statistics:`)
    Object.entries(categoryStats).forEach(([category, data]) => {
      const avg = (data.sum / data.count).toFixed(2)
      console.log(`   ${category}: ${data.count} items, avg grade: ${avg}`)
    })

  } catch (error) {
    console.error('❌ Error during cleanup:', error)
    process.exit(1)
  }
}

// Run the cleanup
cleanToneGrades()