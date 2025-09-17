#!/usr/bin/env node

// Comprehensive Recommendation Engine Test Suite
// Tests API functionality across different budget levels and configurations

const testCases = [
  {
    name: "Budget $150 - Beginner IEMs",
    params: {
      experience: "beginner",
      budget: 150,
      budgetRangeMin: 20,
      budgetRangeMax: 10,
      headphoneType: "iems",
      wantRecommendationsFor: JSON.stringify({headphones: true, dac: false, amp: false, combo: false}),
      sound: "any",
      usage: "music"
    },
    expected: {
      headphones: { min: 1, max: 3 },
      dacs: { min: 0, max: 0 },
      amps: { min: 0, max: 0 },
      combos: { min: 0, max: 0 }
    }
  },
  {
    name: "Budget $300 - Beginner Cans",
    params: {
      experience: "beginner",
      budget: 300,
      budgetRangeMin: 20,
      budgetRangeMax: 10,
      headphoneType: "cans",
      wantRecommendationsFor: JSON.stringify({headphones: true, dac: false, amp: false, combo: false}),
      sound: "neutral",
      usage: "music"
    },
    expected: {
      headphones: { min: 1, max: 3 },
      dacs: { min: 0, max: 0 },
      amps: { min: 0, max: 0 },
      combos: { min: 0, max: 0 }
    }
  },
  {
    name: "Budget $1200 - Intermediate Cans + Amp",
    params: {
      experience: "intermediate",
      budget: 1200,
      budgetRangeMin: 20,
      budgetRangeMax: 10,
      headphoneType: "cans",
      wantRecommendationsFor: JSON.stringify({headphones: true, dac: false, amp: true, combo: false}),
      existingGear: JSON.stringify({headphones: false, dac: false, amp: false, combo: false, specificModels: {headphones: "", dac: "", amp: "", combo: ""}}),
      usage: "music",
      usageRanking: JSON.stringify(["Music", "Gaming", "Movies", "Work"]),
      excludedUsages: JSON.stringify([]),
      sound: "neutral"
    },
    expected: {
      headphones: { min: 1, max: 5 },
      dacs: { min: 0, max: 0 },
      amps: { min: 1, max: 5 },
      combos: { min: 0, max: 0 }
    }
  },
  {
    name: "Budget $500 - Intermediate Both Types",
    params: {
      experience: "intermediate",
      budget: 500,
      budgetRangeMin: 20,
      budgetRangeMax: 10,
      headphoneType: "both",
      wantRecommendationsFor: JSON.stringify({headphones: true, dac: false, amp: false, combo: false}),
      sound: "warm",
      usage: "music"
    },
    expected: {
      headphones: { min: 1, max: 5 },
      dacs: { min: 0, max: 0 },
      amps: { min: 0, max: 0 },
      combos: { min: 0, max: 0 }
    }
  },
  {
    name: "Budget $2000 - Advanced Full Setup",
    params: {
      experience: "advanced",
      budget: 2000,
      budgetRangeMin: 20,
      budgetRangeMax: 10,
      headphoneType: "cans",
      wantRecommendationsFor: JSON.stringify({headphones: true, dac: true, amp: true, combo: false}),
      sound: "neutral",
      usage: "music"
    },
    expected: {
      headphones: { min: 1, max: 10 },
      dacs: { min: 0, max: 10 }, // May be 0 due to limited high-end inventory
      amps: { min: 0, max: 10 }, // May be 0 due to limited high-end inventory
      combos: { min: 0, max: 0 }
    }
  }
]

async function runTest(testCase) {
  const { name, params, expected } = testCase

  try {
    // Build URL
    const url = new URL('http://localhost:3000/api/recommendations')
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value.toString())
    })

    console.log(`\n🧪 Testing: ${name}`)
    console.log(`📝 Budget: $${params.budget}, Type: ${params.headphoneType}, Experience: ${params.experience}`)

    // Make request
    const response = await fetch(url.toString())

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const data = await response.json()

    // Validate structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid response structure')
    }

    // Count results
    const results = {
      headphones: data.headphones?.length || 0,
      dacs: data.dacs?.length || 0,
      amps: data.amps?.length || 0,
      combos: data.combos?.length || 0
    }

    // Check expectations
    let passed = true
    const issues = []

    Object.entries(expected).forEach(([category, range]) => {
      const actual = results[category]
      if (actual < range.min || actual > range.max) {
        passed = false
        issues.push(`${category}: got ${actual}, expected ${range.min}-${range.max}`)
      }
    })

    // Display results
    console.log(`📊 Results: ${JSON.stringify(results)}`)
    if (passed) {
      console.log(`✅ PASSED`)
    } else {
      console.log(`❌ FAILED: ${issues.join(', ')}`)
    }

    return { name, passed, results, issues }

  } catch (error) {
    console.log(`💥 ERROR: ${error.message}`)
    return { name, passed: false, error: error.message }
  }
}

async function runAllTests() {
  console.log('🚀 Running Comprehensive Recommendation Engine Test Suite\n')
  console.log('=' .repeat(70))

  const results = []

  for (const testCase of testCases) {
    const result = await runTest(testCase)
    results.push(result)
  }

  // Summary
  console.log('\n' + '=' .repeat(70))
  console.log('📈 TEST SUMMARY')
  console.log('=' .repeat(70))

  const passed = results.filter(r => r.passed).length
  const total = results.length

  results.forEach(result => {
    const status = result.passed ? '✅' : '❌'
    console.log(`${status} ${result.name}`)
    if (!result.passed && result.issues) {
      console.log(`   └─ Issues: ${result.issues.join(', ')}`)
    }
    if (result.error) {
      console.log(`   └─ Error: ${result.error}`)
    }
  })

  console.log(`\n🎯 Overall: ${passed}/${total} tests passed (${Math.round(passed/total*100)}%)`)

  if (passed === total) {
    console.log('🎉 All tests passed! API is working correctly.')
  } else {
    console.log('⚠️  Some tests failed. Check the issues above.')
  }
}

// Run tests if called directly
if (require.main === module) {
  runAllTests().catch(console.error)
}

module.exports = { runAllTests, testCases }