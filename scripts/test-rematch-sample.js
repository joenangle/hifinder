/**
 * Phase 2: Sample Re-Match Test (Dry-Run)
 *
 * Purpose: Validate enhanced matcher performance before full database cleanup
 *
 * Strategy:
 * 1. Select 100 random listings (50 from problematic set, 50 from general population)
 * 2. Re-run enhanced matcher on each
 * 3. Compare old vs new component_id
 * 4. Calculate improvement metrics
 * 5. Categorize error types fixed/introduced
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Import the enhanced matcher
const { findComponentMatch } = require('./component-matcher-enhanced.js')

// Configuration
const SAMPLE_SIZE = 100
const PROBLEMATIC_SAMPLE_SIZE = 50 // Half from known issues
const RANDOM_SAMPLE_SIZE = 50 // Half from general population

const PRICE_MISMATCH_THRESHOLD = 3.0 // 300% difference
const PRICE_ABS_THRESHOLD = 10000 // $10,000 absolute difference

// Brand aliases for validation
const BRAND_ALIASES = {
  'HiFiMAN': ['hifiman', 'he'],
  'Sennheiser': ['sennheiser', 'hd'],
  'Audio-Technica': ['audio-technica', 'audio technica', 'ath'],
  'FiiO': ['fiio', 'fh', 'fa', 'fd'],
  'Moondrop': ['moondrop', 'aria', 'blessing', 'kato'],
  'Focal': ['focal', 'clear', 'elear', 'utopia'],
  'Audeze': ['audeze', 'lcd'],
  'Beyerdynamic': ['beyerdynamic', 'beyer', 'dt'],
  'Shure': ['shure', 'se'],
  'Sony': ['sony', 'wh', 'wf'],
  'AKG': ['akg', 'k'],
  'Grado': ['grado', 'sr', 'gs', 'ps'],
  'ZMF': ['zmf', 'aeolus', 'auteur', 'verite']
}

function getBrandAliases(brand) {
  return BRAND_ALIASES[brand] || [brand.toLowerCase()]
}

// Validation functions
function validateBrandMatch(listingTitle, componentBrand) {
  const titleLower = listingTitle.toLowerCase()
  const aliases = getBrandAliases(componentBrand)
  return aliases.some(alias => titleLower.includes(alias.toLowerCase()))
}

function validatePriceMatch(listingPrice, component) {
  if (!listingPrice) return { valid: true, reason: 'no_price' }

  const compUsedMin = component.price_used_min || (component.price_new ? component.price_new * 0.5 : null)
  const compUsedMax = component.price_used_max || (component.price_new ? component.price_new * 0.8 : null)

  if (!compUsedMin || !compUsedMax) {
    return { valid: true, reason: 'no_component_price' }
  }

  let priceDiff = 0
  let priceDiffPercent = 0

  if (listingPrice < compUsedMin) {
    priceDiff = compUsedMin - listingPrice
    priceDiffPercent = (priceDiff / compUsedMin) * 100
  } else if (listingPrice > compUsedMax) {
    priceDiff = listingPrice - compUsedMax
    priceDiffPercent = (priceDiff / compUsedMax) * 100
  }

  const isRelativeMismatch = priceDiffPercent > (PRICE_MISMATCH_THRESHOLD * 100)
  const isAbsoluteMismatch = priceDiff > PRICE_ABS_THRESHOLD

  if (isRelativeMismatch || isAbsoluteMismatch) {
    return {
      valid: false,
      reason: 'price_mismatch',
      priceDiff,
      priceDiffPercent: priceDiffPercent.toFixed(0)
    }
  }

  return { valid: true, reason: 'price_ok' }
}

function validateCategoryMatch(listingTitle, componentCategory) {
  const titleLower = listingTitle.toLowerCase()

  // Check for category indicators in title
  const iemIndicators = ['iem', 'in-ear', 'in ear', 'earphone', 'earbud']
  const headphoneIndicators = ['headphone', 'over-ear', 'over ear', 'on-ear', 'on ear']
  const ampIndicators = ['amp', 'amplifier']
  const dacIndicators = ['dac', 'converter']

  const hasIemIndicator = iemIndicators.some(ind => titleLower.includes(ind))
  const hasHeadphoneIndicator = headphoneIndicators.some(ind => titleLower.includes(ind))
  const hasAmpIndicator = ampIndicators.some(ind => titleLower.includes(ind))
  const hasDacIndicator = dacIndicators.some(ind => titleLower.includes(ind))

  // Allow flexible matching - only flag clear mismatches
  if (componentCategory === 'iems' && hasHeadphoneIndicator && !hasIemIndicator) {
    return { valid: false, reason: 'category_mismatch', expected: 'headphones', got: 'iems' }
  }

  if (componentCategory === 'headphones' && hasIemIndicator && !hasHeadphoneIndicator) {
    return { valid: false, reason: 'category_mismatch', expected: 'iems', got: 'headphones' }
  }

  return { valid: true, reason: 'category_ok' }
}

async function selectSample() {
  console.log('\n📋 Selecting sample of 100 listings...\n')

  // 1. Get problematic listings from audit results
  const problemListings = []

  // Read price mismatches CSV
  const priceMismatchPath = path.join(__dirname, 'audit-results', 'price-mismatches-2025-11-12.csv')
  if (fs.existsSync(priceMismatchPath)) {
    const content = fs.readFileSync(priceMismatchPath, 'utf-8')
    const lines = content.split('\n').slice(1) // Skip header
    lines.forEach(line => {
      if (line.trim()) {
        const match = line.match(/^(\d+),/)
        if (match) {
          problemListings.push(parseInt(match[1]))
        }
      }
    })
  }

  // Read brand mismatches CSV
  const brandMismatchPath = path.join(__dirname, 'audit-results', 'brand-mismatches-2025-11-12.csv')
  if (fs.existsSync(brandMismatchPath)) {
    const content = fs.readFileSync(brandMismatchPath, 'utf-8')
    const lines = content.split('\n').slice(1) // Skip header
    lines.forEach(line => {
      if (line.trim()) {
        const match = line.match(/^(\d+),/)
        if (match) {
          problemListings.push(parseInt(match[1]))
        }
      }
    })
  }

  // Deduplicate
  const uniqueProblemListings = [...new Set(problemListings)]
  console.log(`Found ${uniqueProblemListings.length} problematic listings from audit`)

  // Sample 50 from problematic set
  const shuffledProblems = uniqueProblemListings.sort(() => Math.random() - 0.5)
  const problematicSample = shuffledProblems.slice(0, PROBLEMATIC_SAMPLE_SIZE)

  // 2. Get 50 random listings from general population
  const { data: allListings, error: allError } = await supabase
    .from('used_listings')
    .select('id')
    .not('component_id', 'is', null)

  if (allError) {
    console.error('Error fetching all listings:', allError)
    process.exit(1)
  }

  // Exclude already-selected problematic ones
  const generalPopulation = allListings
    .map(l => l.id)
    .filter(id => !problematicSample.includes(id))

  const shuffledGeneral = generalPopulation.sort(() => Math.random() - 0.5)
  const randomSample = shuffledGeneral.slice(0, RANDOM_SAMPLE_SIZE)

  const fullSample = [...problematicSample, ...randomSample]

  console.log(`✅ Selected ${fullSample.length} listings:`)
  console.log(`   - ${problematicSample.length} from known issues`)
  console.log(`   - ${randomSample.length} from general population\n`)

  return fullSample
}

async function testRematch(sampleIds) {
  console.log('🔄 Re-matching sample listings...\n')

  // Fetch full listing data
  const { data: listings, error } = await supabase
    .from('used_listings')
    .select(`
      id,
      title,
      price,
      url,
      created_at,
      component_id,
      components (
        id,
        brand,
        name,
        category,
        price_new,
        price_used_min,
        price_used_max
      )
    `)
    .in('id', sampleIds)

  if (error) {
    console.error('Error fetching listings:', error)
    process.exit(1)
  }

  const results = {
    total: listings.length,
    unchanged: 0,
    changed: 0,
    improvements: {
      price: 0,
      brand: 0,
      category: 0,
      overall: 0
    },
    regressions: {
      price: 0,
      brand: 0,
      category: 0,
      overall: 0
    },
    details: []
  }

  let processed = 0
  for (const listing of listings) {
    processed++
    console.log(`[${processed}/${listings.length}] Testing: ${listing.title.substring(0, 60)}...`)

    // Temporarily suppress console output from matcher
    const originalLog = console.log
    console.log = () => {}

    // Run enhanced matcher (it fetches components internally)
    const matchResult = await findComponentMatch(listing.title, '', 'test')

    // Restore console output
    console.log = originalLog

    const oldComponentId = listing.component_id
    const newComponentId = matchResult?.component?.id || null

    const oldComponent = listing.components
    const newComponent = matchResult?.component || null

    // Validate old match
    const oldValidations = {
      brand: oldComponent ? validateBrandMatch(listing.title, oldComponent.brand) : false,
      price: oldComponent ? validatePriceMatch(listing.price, oldComponent) : { valid: false },
      category: oldComponent ? validateCategoryMatch(listing.title, oldComponent.category) : { valid: false }
    }

    // Validate new match
    const newValidations = {
      brand: newComponent ? validateBrandMatch(listing.title, newComponent.brand) : false,
      price: newComponent ? validatePriceMatch(listing.price, newComponent) : { valid: false },
      category: newComponent ? validateCategoryMatch(listing.title, newComponent.category) : { valid: false }
    }

    const changed = oldComponentId !== newComponentId

    if (changed) {
      results.changed++

      // Determine if improvement or regression
      const oldIssues = [
        !oldValidations.brand,
        !oldValidations.price.valid,
        !oldValidations.category.valid
      ].filter(Boolean).length

      const newIssues = [
        !newValidations.brand,
        !newValidations.price.valid,
        !newValidations.category.valid
      ].filter(Boolean).length

      const isImprovement = newIssues < oldIssues
      const isRegression = newIssues > oldIssues

      if (isImprovement) {
        results.improvements.overall++
        if (!oldValidations.brand && newValidations.brand) results.improvements.brand++
        if (!oldValidations.price.valid && newValidations.price.valid) results.improvements.price++
        if (!oldValidations.category.valid && newValidations.category.valid) results.improvements.category++
      }

      if (isRegression) {
        results.regressions.overall++
        if (oldValidations.brand && !newValidations.brand) results.regressions.brand++
        if (oldValidations.price.valid && !newValidations.price.valid) results.regressions.price++
        if (oldValidations.category.valid && !newValidations.category.valid) results.regressions.category++
      }

      results.details.push({
        listingId: listing.id,
        title: listing.title,
        price: listing.price,
        oldComponent: oldComponent ? `${oldComponent.brand} ${oldComponent.name}` : 'NULL',
        newComponent: newComponent ? `${newComponent.brand} ${newComponent.name}` : 'NULL',
        oldIssues,
        newIssues,
        changed: true,
        improvement: isImprovement,
        regression: isRegression,
        matchScore: matchResult?.score || 0,
        validations: {
          old: oldValidations,
          new: newValidations
        },
        url: listing.url
      })
    } else {
      results.unchanged++

      // Still track validation results for unchanged matches
      const issues = [
        !oldValidations.brand,
        !oldValidations.price.valid,
        !oldValidations.category.valid
      ].filter(Boolean).length

      if (issues > 0) {
        results.details.push({
          listingId: listing.id,
          title: listing.title,
          price: listing.price,
          oldComponent: oldComponent ? `${oldComponent.brand} ${oldComponent.name}` : 'NULL',
          newComponent: newComponent ? `${newComponent.brand} ${newComponent.name}` : 'NULL',
          oldIssues: issues,
          newIssues: issues,
          changed: false,
          improvement: false,
          regression: false,
          matchScore: matchResult?.score || 0,
          validations: {
            old: oldValidations,
            new: newValidations
          },
          url: listing.url
        })
      }
    }
  }

  return results
}

function generateReport(results) {
  console.log('\n' + '='.repeat(80))
  console.log('📊 SAMPLE RE-MATCH TEST RESULTS')
  console.log('='.repeat(80))

  console.log('\n📈 Overall Statistics:')
  console.log(`   Total tested: ${results.total}`)
  console.log(`   Unchanged: ${results.unchanged} (${((results.unchanged / results.total) * 100).toFixed(1)}%)`)
  console.log(`   Changed: ${results.changed} (${((results.changed / results.total) * 100).toFixed(1)}%)`)

  console.log('\n✅ Improvements:')
  console.log(`   Overall: ${results.improvements.overall} matches`)
  console.log(`   Brand fixes: ${results.improvements.brand}`)
  console.log(`   Price fixes: ${results.improvements.price}`)
  console.log(`   Category fixes: ${results.improvements.category}`)

  console.log('\n⚠️  Regressions:')
  console.log(`   Overall: ${results.regressions.overall} matches`)
  console.log(`   Brand issues: ${results.regressions.brand}`)
  console.log(`   Price issues: ${results.regressions.price}`)
  console.log(`   Category issues: ${results.regressions.category}`)

  // Calculate net improvement
  const netImprovement = results.improvements.overall - results.regressions.overall
  const netImprovementPercent = ((netImprovement / results.total) * 100).toFixed(1)

  console.log('\n📊 Net Result:')
  if (netImprovement > 0) {
    console.log(`   ✅ ${netImprovement} net improvements (${netImprovementPercent}%)`)
  } else if (netImprovement < 0) {
    console.log(`   ❌ ${Math.abs(netImprovement)} net regressions (${Math.abs(netImprovementPercent)}%)`)
  } else {
    console.log(`   ➖ No net change`)
  }

  // Top improvements
  console.log('\n🏆 Top 5 Improvements:')
  const improvements = results.details
    .filter(d => d.improvement)
    .sort((a, b) => (b.oldIssues - b.newIssues) - (a.oldIssues - a.newIssues))
    .slice(0, 5)

  improvements.forEach((detail, i) => {
    console.log(`\n   ${i + 1}. ${detail.title.substring(0, 60)}...`)
    console.log(`      Old: ${detail.oldComponent} (${detail.oldIssues} issues)`)
    console.log(`      New: ${detail.newComponent} (${detail.newIssues} issues)`)
    console.log(`      Match score: ${(detail.matchScore * 100).toFixed(0)}%`)
  })

  // Top regressions (if any)
  if (results.regressions.overall > 0) {
    console.log('\n⚠️  Top 5 Regressions:')
    const regressions = results.details
      .filter(d => d.regression)
      .sort((a, b) => (b.newIssues - b.oldIssues) - (a.newIssues - a.oldIssues))
      .slice(0, 5)

    regressions.forEach((detail, i) => {
      console.log(`\n   ${i + 1}. ${detail.title.substring(0, 60)}...`)
      console.log(`      Old: ${detail.oldComponent} (${detail.oldIssues} issues)`)
      console.log(`      New: ${detail.newComponent} (${detail.newIssues} issues)`)
      console.log(`      Match score: ${(detail.matchScore * 100).toFixed(0)}%`)
    })
  }

  // Unchanged matches with issues
  const unchangedWithIssues = results.details.filter(d => !d.changed && d.oldIssues > 0)
  if (unchangedWithIssues.length > 0) {
    console.log(`\n⚠️  Unchanged matches still have issues: ${unchangedWithIssues.length}`)
    console.log('   (These require manual review or enhanced matcher logic)')
  }

  console.log('\n' + '='.repeat(80))

  // Export detailed results to CSV
  const csvPath = path.join(__dirname, 'audit-results', `rematch-test-${new Date().toISOString().split('T')[0]}.csv`)
  const csvHeader = 'Listing ID,Title,Price,Old Component,New Component,Old Issues,New Issues,Changed,Improvement,Regression,Match Score,URL\n'
  const csvRows = results.details.map(d =>
    `${d.listingId},"${d.title.replace(/"/g, '""')}",${d.price || ''},"${d.oldComponent}","${d.newComponent}",${d.oldIssues},${d.newIssues},${d.changed},${d.improvement},${d.regression},${(d.matchScore * 100).toFixed(0)}%,${d.url}`
  ).join('\n')

  fs.writeFileSync(csvPath, csvHeader + csvRows)
  console.log(`\n📄 Detailed results exported to: ${csvPath}`)
}

async function main() {
  console.log('🧪 Phase 2: Sample Re-Match Test (Dry-Run)\n')
  console.log('Purpose: Validate enhanced matcher before full database cleanup\n')

  try {
    // 1. Select sample
    const sampleIds = await selectSample()

    // 2. Test re-matching
    const results = await testRematch(sampleIds)

    // 3. Generate report
    generateReport(results)

    console.log('\n✅ Sample re-match test complete!')
    console.log('\nNext steps:')
    console.log('   - Review detailed CSV results')
    console.log('   - If net improvement is positive, proceed to Phase 3')
    console.log('   - If regressions exist, investigate and enhance matcher logic')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()
