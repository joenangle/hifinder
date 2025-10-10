/**
 * Standard test queries for recommendation engine v2
 * Based on quick-start cases from landing page
 */

export const standardTestQueries = [
  {
    name: 'Budget Tier - Beginner',
    description: 'Entry-level user with $75 budget looking for headphones',
    v1URL: '/api/recommendations?budget=75&experience=beginner&soundSignature=neutral&headphoneType=cans&wantRecommendationsFor={"headphones":true}',
    v2URL: '/api/recommendations/v2?budget=75&experience=beginner&soundSignature=neutral&headphoneType=cans&wantRecommendationsFor={"headphones":true}',
    expectedBehavior: {
      headphoneCount: '3-5 options',
      priceRange: '$20-100',
      characteristics: 'Easy to drive, neutral sound, good value'
    }
  },
  {
    name: 'Entry Level - Warm Sound',
    description: 'Intermediate user with $250 budget preferring warm sound',
    v1URL: '/api/recommendations?budget=250&experience=intermediate&soundSignature=warm&headphoneType=cans&wantRecommendationsFor={"headphones":true}',
    v2URL: '/api/recommendations/v2?budget=250&experience=intermediate&soundSignature=warm&headphoneType=cans&wantRecommendationsFor={"headphones":true}',
    expectedBehavior: {
      headphoneCount: '5 options',
      priceRange: '$100-400',
      characteristics: 'Warm signature, comfortable for long sessions'
    }
  },
  {
    name: 'Mid Range - Full Stack',
    description: 'Intermediate user with $700 budget wanting headphones + DAC/amp',
    v1URL: '/api/recommendations?budget=700&experience=intermediate&soundSignature=any&headphoneType=both&wantRecommendationsFor={"headphones":true,"dac":true,"amp":true}',
    v2URL: '/api/recommendations/v2?budget=700&experience=intermediate&soundSignature=any&headphoneType=both&wantRecommendationsFor={"headphones":true,"dac":true,"amp":true}',
    expectedBehavior: {
      headphoneCount: '5 options',
      dacCount: '3-5 options',
      ampCount: '3-5 options',
      budgetAllocation: 'Headphones ~$400, DAC ~$150, Amp ~$150'
    }
  },
  {
    name: 'High End - Enthusiast',
    description: 'Enthusiast with $2000 budget for full audiophile setup',
    v1URL: '/api/recommendations?budget=2000&experience=enthusiast&soundSignature=neutral&headphoneType=cans&wantRecommendationsFor={"headphones":true,"dac":true,"amp":true}',
    v2URL: '/api/recommendations/v2?budget=2000&experience=enthusiast&soundSignature=neutral&headphoneType=cans&wantRecommendationsFor={"headphones":true,"dac":true,"amp":true}',
    expectedBehavior: {
      headphoneCount: '10 options',
      dacCount: '5-10 options',
      ampCount: '5-10 options',
      budgetAllocation: 'Headphones ~$1200, DAC ~$400, Amp ~$400',
      characteristics: 'High-end components, proper power matching'
    }
  },
  {
    name: 'Value Hunter',
    description: 'User prioritizing value with $500 budget',
    v1URL: '/api/recommendations?budget=500&experience=intermediate&soundSignature=any&headphoneType=both&wantRecommendationsFor={"headphones":true}',
    v2URL: '/api/recommendations/v2?budget=500&experience=intermediate&soundSignature=any&headphoneType=both&wantRecommendationsFor={"headphones":true}',
    expectedBehavior: {
      v2Changes: 'Should prioritize components with value_rating=3',
      pricePreference: 'Slight preference for items under budget'
    }
  },
  {
    name: 'Existing Gear Optimization',
    description: 'User with HD650 looking for matching amp',
    v1URL: '/api/recommendations?budget=400&experience=intermediate&wantRecommendationsFor={"amp":true}&existingGear={"headphones":true,"specificModels":{"headphones":"HD650"}}',
    v2URL: '/api/recommendations/v2?budget=400&experience=intermediate&wantRecommendationsFor={"amp":true}&existingGear={"headphones":true,"specificModels":{"headphones":"HD650"}}',
    expectedBehavior: {
      v2Changes: 'Should boost scores for amps that can drive 300Ω headphones',
      ampCharacteristics: 'Prefer higher-powered amps suitable for HD650'
    }
  },
  {
    name: 'Driver Type Filter',
    description: 'Enthusiast wanting only planar magnetic headphones',
    v1URL: '/api/recommendations?budget=1000&experience=enthusiast&soundSignature=neutral&headphoneType=cans&wantRecommendationsFor={"headphones":true}',
    v2URL: '/api/recommendations/v2?budget=1000&experience=enthusiast&soundSignature=neutral&headphoneType=cans&wantRecommendationsFor={"headphones":true}&driverTypeFilter=["planar"]',
    expectedBehavior: {
      v2Changes: 'Should only return planar magnetic headphones',
      expectedBrands: 'HiFiMan, Audeze, etc.'
    }
  }
]

/**
 * Test runner function
 * Run both v1 and v2 queries and compare results
 */
export async function runTests() {
  const results: any[] = []

  for (const test of standardTestQueries) {
    console.log(`\n🧪 Testing: ${test.name}`)
    console.log(`   ${test.description}`)

    try {
      // Test v1
      const v1Response = await fetch(test.v1URL)
      const v1Data = await v1Response.json()

      // Test v2
      const v2Response = await fetch(test.v2URL)
      const v2Data = await v2Response.json()

      // Compare results
      const comparison = {
        testName: test.name,
        v1HeadphoneCount: v1Data.headphones?.length || 0,
        v2HeadphoneCount: v2Data.headphones?.length || 0,
        v1AvgPrice: v1Data.headphones?.[0]?.avgPrice || 0,
        v2AvgPrice: v2Data.headphones?.[0]?.avgPrice || 0,
        v1TopPick: v1Data.headphones?.[0]?.name || 'none',
        v2TopPick: v2Data.headphones?.[0]?.name || 'none',
        budgetAllocation: v2Data.budgetAllocation,
        expectedBehavior: test.expectedBehavior
      }

      console.log(`   ✓ v1: ${comparison.v1HeadphoneCount} results, top: ${comparison.v1TopPick}`)
      console.log(`   ✓ v2: ${comparison.v2HeadphoneCount} results, top: ${comparison.v2TopPick}`)

      results.push(comparison)
    } catch (error) {
      console.error(`   ✗ Error: ${error}`)
      results.push({
        testName: test.name,
        error: String(error)
      })
    }
  }

  return results
}
