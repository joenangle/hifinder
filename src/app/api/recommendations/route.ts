import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { assessAmplificationFromImpedance } from '@/lib/audio-calculations'

// Intelligent caching system for recommendations
const cache = new Map<string, { data: unknown, expires: number }>()
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes for recommendations (longer than count API)

function generateCacheKey(params: {
  experience: string
  budget: number
  budgetRangeMin: number
  budgetRangeMax: number
  headphoneType: string
  wantRecommendationsFor: object
  soundSignature: string
  usage: string
}): string {
  // Create a deterministic cache key from critical parameters
  const keyComponents = [
    `exp_${params.experience}`,
    `budget_${params.budget}`,
    `range_${params.budgetRangeMin}_${params.budgetRangeMax}`,
    `type_${params.headphoneType}`,
    `want_${JSON.stringify(params.wantRecommendationsFor)}`,
    `sound_${params.soundSignature}`,
    `usage_${params.usage}`
  ]
  return `recommendations_${keyComponents.join('_')}`
}

// Enhanced component interface for recommendations
interface RecommendationComponent {
  id: string
  name: string
  brand: string
  category: string
  price_new?: number
  price_used_min?: number
  price_used_max?: number
  budget_tier?: string
  sound_signature?: string
  use_cases?: string[]
  impedance?: number
  needs_amp?: boolean
  amazon_url?: string
  why_recommended?: string
  image_url?: string
  // Expert analysis fields
  crinacle_sound_signature?: string
  tone_grade?: string
  technical_grade?: string
  crinacle_comments?: string
  driver_type?: string
  fit?: string
  crinacle_rank?: number
  value_rating?: number
  // Computed fields
  avgPrice: number
  synergyScore: number
  compatibilityScore?: number
  powerAdequacy?: number
  amplificationAssessment?: {
    difficulty: 'easy' | 'moderate' | 'demanding' | 'very_demanding' | 'unknown'
    explanation: string
    estimatedSensitivity?: number
  }
  // v2.0 Performance-tier fields
  performanceScore?: number
  valueRating?: string | null
  asr_sinad?: number  // ASR measurement for DACs/amps
}

interface RecommendationRequest {
  experience: string
  budget: number
  budgetRangeMin: number // Percentage below budget
  budgetRangeMax: number // Percentage above budget
  headphoneType: string
  wantRecommendationsFor: {
    headphones: boolean
    dac: boolean
    amp: boolean
    combo: boolean
  }
  existingGear: {
    headphones: boolean
    dac: boolean
    amp: boolean
    combo: boolean
    specificModels: {
      headphones: string
      dac: string
      amp: string
      combo: string
    }
  }
  usage: string
  usageRanking: string[]
  excludedUsages: string[]
  soundSignature: string
  powerNeeds?: string
  connectivity?: string[]
  usageContext?: string
  existingHeadphones?: string
  optimizeAroundHeadphones?: string
}

// Enhanced dual-layer synergy scoring with detailed Crinacle signatures + ASR measurements
function calculateSynergyScore(component: unknown, soundSig: string, primaryUsage: string): number {
  const comp = component as {
    sound_signature?: string
    crinacle_sound_signature?: string
    use_cases?: string | string[]
    asr_sinad?: number
    price_new?: number
    category?: string
  }
  let score = 0.6 // Base score - slightly lower to make room for bonuses

  // Layer 1: Basic signature matching (existing system)
  if (comp.sound_signature && soundSig !== 'any') {
    if (comp.sound_signature === soundSig) {
      score += 0.15 // Basic perfect match
    } else if (soundSig === 'neutral' && comp.sound_signature === 'balanced') {
      score += 0.12 // Close match
    } else if (
      (soundSig === 'warm' && comp.sound_signature === 'neutral') ||
      (soundSig === 'bright' && comp.sound_signature === 'neutral')
    ) {
      score += 0.08 // Compatible match
    }
  }

  // Layer 2: Detailed Crinacle signature matching (enhanced system)
  if (comp.crinacle_sound_signature && soundSig !== 'any') {
    const detailedMatch = getDetailedSignatureMatch(comp.crinacle_sound_signature, soundSig);
    score += detailedMatch * 0.2; // Up to 20% bonus for detailed matching
  }

  // Layer 3: ASR measurement quality boost (DAC/amp/combo only)
  if (comp.asr_sinad && ['dac', 'amp', 'dac_amp'].includes(comp.category || '')) {
    const asrBoost = calculateASRQualityBoost(comp.asr_sinad, comp.price_new || 0);
    score += asrBoost;
  }

  // Usage case matching - BONUS only, not penalty for missing
  if (comp.use_cases && primaryUsage) {
    const useCases = Array.isArray(comp.use_cases)
      ? comp.use_cases
      : (typeof comp.use_cases === 'string'
        ? comp.use_cases.split(',').map(u => u.trim().toLowerCase())
        : [])

    if (useCases.includes(primaryUsage.toLowerCase())) {
      score += 0.1 // Usage match bonus
    } else if (useCases.includes('music') && primaryUsage.toLowerCase() === 'gaming') {
      score += 0.05 // Music gear often works well for gaming
    }
  }

  return Math.min(1, score)
}

// ASR measurement quality boost - budget-aware scoring
function calculateASRQualityBoost(sinad: number, price: number): number {
  // Budget tiers determine how much we care about measurements
  const isBudget = price < 200;
  const isMidRange = price >= 200 && price < 600;
  const isHighEnd = price >= 600 && price < 1500;
  const isSummitFi = price >= 1500;

  // Exceptional performance (>120 dB SINAD)
  if (sinad >= 120) {
    if (isSummitFi) return 0.08; // Expected at this price, moderate boost
    if (isHighEnd) return 0.12;  // Great value, strong boost
    if (isMidRange) return 0.15; // Exceptional value, very strong boost
    return 0.10; // Budget gear with great measurements
  }

  // Excellent performance (110-120 dB)
  if (sinad >= 110) {
    if (isSummitFi) return 0.05; // Acceptable but not exceptional
    if (isHighEnd) return 0.08;  // Good performance
    if (isMidRange) return 0.10; // Strong performance for price
    return 0.08; // Very good for budget gear
  }

  // Good performance (100-110 dB)
  if (sinad >= 100) {
    if (isSummitFi) return -0.05; // Concerning at this price
    if (isHighEnd) return 0.03;   // Acceptable but not great
    if (isMidRange) return 0.05;  // Decent for the price
    return 0.05; // Acceptable for budget
  }

  // Below average (<100 dB)
  if (isSummitFi || isHighEnd) {
    return -0.10; // Serious concern for expensive gear
  }
  return 0; // Neutral for budget gear (other factors matter more)
}

// Detailed signature matching with partial scoring
function getDetailedSignatureMatch(crinSig: string, userPref: string): number {
  if (!crinSig || !userPref) return 0;

  // Exact match mappings for maximum compatibility
  const exactMatches: Record<string, Record<string, number>> = {
    'neutral': {
      'Neutral': 1.0,
      'Bass-rolled neutral': 0.85,
      'Warm neutral': 0.75,
      'Bright neutral': 0.75,
      'Harman neutral': 0.9,
      'DF-neutral': 0.85,
      '"""Balanced"""': 0.8
    },
    'bright': {
      'Bright neutral': 1.0,
      'Bright': 0.95,
      'Neutral': 0.7,
      'Bass-rolled neutral': 0.5 // Less bass = more apparent brightness
    },
    'warm': {
      'Warm neutral': 1.0,
      'Warm': 0.95,
      'Warm V-shape': 0.85,
      'Warm U-shape': 0.8,
      'Neutral': 0.6,
      'Neutral with bass boost': 0.8
    },
    'fun': {
      'V-shaped': 1.0,
      'U-shaped': 0.95,
      'Warm V-shape': 0.9,
      'Mild V-shape': 0.85,
      'Mid-centric': 0.3 // Fun seekers usually don't want mid-forward
    }
  };

  return exactMatches[userPref]?.[crinSig] || 0;
}

// Performance-Tier Filtering System (v2.0)
// Budget is a ceiling, performance determines ranking

/**
 * Determine expected performance tier for a given budget
 * Returns numeric tier: 1 (C+), 2 (B), 3 (B+), 4 (A), 5 (A+)
 */
function getExpectedPerformanceTier(budget: number): number {
  if (budget >= 3000) return 5  // A+ tier (summit-fi)
  if (budget >= 1000) return 4  // A tier (high-end)
  if (budget >= 400) return 4   // A tier (excellent quality)
  if (budget >= 150) return 3   // B+ tier (good quality)
  return 2                       // C+ tier (acceptable quality)
}

/**
 * Calculate component's actual performance tier from expert data
 */
function getComponentPerformanceTier(component: RecommendationComponent): number {
  // For headphones/IEMs with Crinacle data
  if ((component.category === 'cans' || component.category === 'iems') &&
      (component.tone_grade || component.technical_grade)) {

    // Convert letter grades to numeric scores
    const gradeToScore = (grade?: string): number => {
      if (!grade) return 2.5 // Neutral baseline
      const normalized = grade.toUpperCase().replace(/\s/g, '')
      if (normalized.includes('A+')) return 5
      if (normalized.includes('A-')) return 3.7
      if (normalized.includes('A')) return 4
      if (normalized.includes('B+')) return 3.3
      if (normalized.includes('B-')) return 2.7
      if (normalized.includes('B')) return 3
      if (normalized.includes('C+')) return 2.3
      if (normalized.includes('C')) return 2
      return 2.5
    }

    const toneScore = gradeToScore(component.tone_grade)
    const techScore = gradeToScore(component.technical_grade)
    const avgGrade = (toneScore + techScore) / 2

    // Crinacle rank bonus (lower rank = better, top 20 get boost)
    let rankBonus = 0
    if (component.crinacle_rank) {
      if (component.crinacle_rank <= 10) rankBonus = 0.5
      else if (component.crinacle_rank <= 20) rankBonus = 0.3
      else if (component.crinacle_rank <= 50) rankBonus = 0.1
    }

    // Value rating bonus (1-3 scale from Crinacle)
    let valueBonus = 0
    if (component.value_rating) {
      if (component.value_rating >= 3) valueBonus = 0.3
      else if (component.value_rating >= 2) valueBonus = 0.15
    }

    return Math.min(5, avgGrade + rankBonus + valueBonus)
  }

  // For DACs/Amps/Combos with ASR data
  if (component.asr_sinad && ['dac', 'amp', 'dac_amp'].includes(component.category || '')) {
    const sinad = component.asr_sinad
    const price = component.avgPrice || 0

    // Budget-aware SINAD evaluation
    if (price < 200) {
      if (sinad >= 115) return 5  // Exceptional for budget
      if (sinad >= 110) return 4
      if (sinad >= 105) return 3
      return 2
    } else if (price < 500) {
      if (sinad >= 120) return 5
      if (sinad >= 115) return 4
      if (sinad >= 110) return 3
      return 2
    } else {
      if (sinad >= 125) return 5
      if (sinad >= 120) return 4
      if (sinad >= 115) return 3
      return 2
    }
  }

  // Baseline tiering for components without expert data
  return getBaselinePerformanceTier(component)
}

/**
 * Baseline performance tier assignment for components without expert data
 */
function getBaselinePerformanceTier(component: RecommendationComponent): number {
  const price = component.avgPrice

  if (component.category === 'cans' || component.category === 'iems') {
    if (price >= 1000) return 4  // Assume A tier
    if (price >= 400) return 3   // Assume B+ tier
    if (price >= 150) return 2   // Assume B tier
    return 1                      // Assume C+ tier
  }

  // DACs/amps without ASR data - neutral baseline
  return 3  // B+ tier assumption
}

/**
 * Calculate performance quality score (0-1) for ranking
 * This replaces the old price-fit scoring
 */
function calculatePerformanceScore(component: RecommendationComponent): number {
  const performanceTier = getComponentPerformanceTier(component)

  // Convert tier (1-5) to score (0-1)
  // Tier 5 (A+) = 1.0
  // Tier 4 (A) = 0.85
  // Tier 3 (B+) = 0.70
  // Tier 2 (B/C+) = 0.55
  // Tier 1 (C) = 0.40
  const baseScore = 0.15 + (performanceTier * 0.17)

  // Bonus for having expert data (increases confidence)
  const hasExpertData = !!(
    component.crinacle_sound_signature ||
    component.tone_grade ||
    component.technical_grade ||
    component.asr_sinad
  )

  return Math.min(1, hasExpertData ? baseScore + 0.05 : baseScore)
}

/**
 * Calculate value rating for display
 */
function calculateValueRating(component: RecommendationComponent): string | null {
  const actualTier = getComponentPerformanceTier(component)
  const price = component.avgPrice

  // Expected tier at this price point
  let expectedTier = 1
  if (price >= 1000) expectedTier = 4
  else if (price >= 400) expectedTier = 3
  else if (price >= 150) expectedTier = 2

  const tierDelta = actualTier - expectedTier

  // Value rating thresholds
  if (tierDelta >= 2) return 'exceptional'  // Performs 2+ tiers above price
  if (tierDelta >= 1.5) return 'great'      // Performs 1.5 tiers above
  if (tierDelta >= 0.7) return 'good'       // Performs 0.7 tiers above
  if (tierDelta >= -0.3) return 'fair'      // Performs at expected level

  return null  // Below expected performance (poor value)
}

// Calculate budget allocation across requested components
function allocateBudgetAcrossComponents(
  totalBudget: number,
  requestedComponents: string[],
  existingGear: RecommendationRequest['existingGear']
): Record<string, number> {
  const allocation: Record<string, number> = {}

  // Realistic budget caps based on actual market prices
  const componentBudgetCaps = {
    headphones: totalBudget * 0.8, // Headphones can take most of the budget
    dac: Math.min(500, totalBudget * 0.3), // DACs rarely need more than $500
    amp: Math.min(300, totalBudget * 0.3), // Amps rarely need more than $300
    combo: Math.min(600, totalBudget * 0.5) // Combo units cap at $600
  }

  // Typical price ratios for audio components (more conservative)
  const priceRatios = {
    headphones: existingGear?.headphones ? 0.6 : 0.5,
    dac: existingGear?.dac ? 0.25 : 0.15,
    amp: existingGear?.amp ? 0.25 : 0.15,
    combo: existingGear?.combo ? 0.4 : 0.3
  }

  // Single component gets full budget (but respects caps)
  if (requestedComponents.length === 1) {
    const component = requestedComponents[0]
    const cap = componentBudgetCaps[component as keyof typeof componentBudgetCaps] || totalBudget
    allocation[component] = Math.min(totalBudget, cap)
    return allocation
  }

  // Calculate proportional allocation
  const totalRatio = requestedComponents.reduce((sum, comp) => {
    return sum + (priceRatios[comp as keyof typeof priceRatios] || 0.2)
  }, 0)

  requestedComponents.forEach(component => {
    const ratio = priceRatios[component as keyof typeof priceRatios] || 0.2
    const proportionalBudget = Math.floor(totalBudget * (ratio / totalRatio))
    const cap = componentBudgetCaps[component as keyof typeof componentBudgetCaps] || totalBudget
    allocation[component] = Math.min(proportionalBudget, cap)
  })

  return allocation
}

// Filter and score components based on budget and preferences (v2.0: Performance-Tier Filtering)
function filterAndScoreComponents(
  components: unknown[],
  budget: number,
  budgetRangeMin: number,
  budgetRangeMax: number,
  soundSignature: string,
  primaryUsage: string,
  maxOptions: number
): RecommendationComponent[] {
  // V2.0: Budget as ceiling (allow 10% stretch), performance determines ranking
  const maxAcceptable = budget * 1.1  // 10% stretch allowance
  const expectedTier = getExpectedPerformanceTier(budget)

  return components
    .map(c => {
      const component = c as {
        price_used_min?: number
        price_used_max?: number
        category?: string
        impedance?: number
        needs_amp?: boolean
        name?: string
        brand?: string
        [key: string]: unknown
      }

      const avgPrice = ((component.price_used_min || 0) + (component.price_used_max || 0)) / 2
      const synergyScore = calculateSynergyScore(component, soundSignature, primaryUsage)

      const enrichedComponent = {
        ...component,
        avgPrice,
        synergyScore,
        // Add amplification assessment for headphones
        ...(component.category === 'headphones' || component.category === 'iems' ? {
          amplificationAssessment: assessAmplificationFromImpedance(
            component.impedance ?? null,
            component.needs_amp ?? null,
            component.name,
            component.brand
          )
        } : {})
      } as RecommendationComponent

      // Calculate performance score and value rating
      const performanceScore = calculatePerformanceScore(enrichedComponent)
      const valueRating = calculateValueRating(enrichedComponent)

      return {
        ...enrichedComponent,
        performanceScore,
        valueRating
      }
    })
    .filter((c, index, arr) => {
      // Remove duplicates
      const key = `${c.name}|${c.brand}`
      return arr.findIndex(item => `${item.name}|${item.brand}` === key) === index
    })
    .filter(c => {
      // V2.0 Performance-Tier Filtering:
      // 1. Must be under budget (with 10% stretch allowance)
      // 2. Must meet or exceed expected performance tier for budget
      // 3. Price range must be reasonable (no $1-$999 ranges)

      const isAffordable = c.avgPrice <= maxAcceptable
      const meetsPerformanceTier = getComponentPerformanceTier(c) >= expectedTier
      const hasReasonableRange = ((c.price_used_max || 0) - (c.price_used_min || 0)) <= c.avgPrice * 1.5

      return isAffordable && meetsPerformanceTier && hasReasonableRange
    })
    .sort((a, b) => {
      // V2.0 Scoring: Performance 78% + Signature 22% (NO price-fit scoring)
      // Rationale: Within budget, performance quality is all that matters

      const aPerformance = a.performanceScore || 0
      const bPerformance = b.performanceScore || 0

      // Sound signature match (using existing synergyScore which includes signature matching)
      const aSignature = a.synergyScore || 0
      const bSignature = b.synergyScore || 0

      // Final score: 78% performance, 22% signature match
      const aScore = (aPerformance * 0.78) + (aSignature * 0.22)
      const bScore = (bPerformance * 0.78) + (bSignature * 0.22)

      return bScore - aScore
    })
    .slice(0, maxOptions)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    
    // Parse and validate request parameters
    const experienceParam = searchParams.get('experience') || 'intermediate'
    const budgetParam = searchParams.get('budget') || '300'
    const budgetRangeMinParam = searchParams.get('budgetRangeMin') || '20'
    const budgetRangeMaxParam = searchParams.get('budgetRangeMax') || '10'
    const headphoneTypeParam = searchParams.get('headphoneType') || 'cans'
    const soundSignatureParam = searchParams.get('soundSignature') || 'neutral'

    // Validate experience level
    const validExperience = ['beginner', 'intermediate', 'enthusiast']
    if (!validExperience.includes(experienceParam)) {
      return NextResponse.json(
        { error: `Invalid experience level. Must be one of: ${validExperience.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate budget
    const budget = parseInt(budgetParam)
    if (isNaN(budget) || budget < 20 || budget > 50000) {
      return NextResponse.json(
        { error: 'Invalid budget. Must be between 20 and 50000.' },
        { status: 400 }
      )
    }

    // Validate budget ranges
    const budgetRangeMin = parseInt(budgetRangeMinParam)
    const budgetRangeMax = parseInt(budgetRangeMaxParam)
    if (isNaN(budgetRangeMin) || budgetRangeMin < 0 || budgetRangeMin > 90) {
      return NextResponse.json(
        { error: 'Invalid budgetRangeMin. Must be between 0 and 90.' },
        { status: 400 }
      )
    }
    if (isNaN(budgetRangeMax) || budgetRangeMax < 0 || budgetRangeMax > 200) {
      return NextResponse.json(
        { error: 'Invalid budgetRangeMax. Must be between 0 and 200.' },
        { status: 400 }
      )
    }

    // Validate headphone type
    const validHeadphoneTypes = ['cans', 'iems', 'both']
    if (!validHeadphoneTypes.includes(headphoneTypeParam)) {
      return NextResponse.json(
        { error: `Invalid headphoneType. Must be one of: ${validHeadphoneTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate sound signature
    const validSoundSignatures = ['any', 'neutral', 'warm', 'bright', 'fun', 'balanced']
    if (!validSoundSignatures.includes(soundSignatureParam)) {
      return NextResponse.json(
        { error: `Invalid sound signature. Must be one of: ${validSoundSignatures.join(', ')}` },
        { status: 400 }
      )
    }

    // Parse and validate JSON parameters with error handling
    let wantRecommendationsFor, existingGear, usageRanking, excludedUsages, connectivity

    try {
      wantRecommendationsFor = JSON.parse(searchParams.get('wantRecommendationsFor') || '{"headphones":true,"dac":false,"amp":false,"combo":false}')
      existingGear = JSON.parse(searchParams.get('existingGear') || '{"headphones":false,"dac":false,"amp":false,"combo":false,"specificModels":{"headphones":"","dac":"","amp":"","combo":""}}')
      usageRanking = JSON.parse(searchParams.get('usageRanking') || '["Music","Gaming","Movies","Work"]')
      excludedUsages = JSON.parse(searchParams.get('excludedUsages') || '[]')
      connectivity = searchParams.get('connectivity') ? JSON.parse(searchParams.get('connectivity')!) : []
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid JSON in request parameters. Please check your data format.' },
        { status: 400 }
      )
    }

    // Validate wantRecommendationsFor object
    if (!wantRecommendationsFor || typeof wantRecommendationsFor !== 'object') {
      return NextResponse.json(
        { error: 'Invalid wantRecommendationsFor parameter. Must be an object.' },
        { status: 400 }
      )
    }

    // Validate that at least one recommendation type is requested
    if (!Object.values(wantRecommendationsFor).some(Boolean)) {
      return NextResponse.json(
        { error: 'At least one recommendation type must be requested.' },
        { status: 400 }
      )
    }

    const req: RecommendationRequest = {
      experience: experienceParam,
      budget,
      budgetRangeMin,
      budgetRangeMax,
      headphoneType: headphoneTypeParam,
      wantRecommendationsFor,
      existingGear,
      usage: searchParams.get('usage') || 'music',
      usageRanking,
      excludedUsages,
      soundSignature: soundSignatureParam,
      powerNeeds: searchParams.get('powerNeeds') || '',
      connectivity,
      usageContext: searchParams.get('usageContext') || '',
      existingHeadphones: searchParams.get('existingHeadphones') || '',
      optimizeAroundHeadphones: searchParams.get('optimizeAroundHeadphones') || ''
    }

    // Generate cache key for this specific request
    const cacheKey = generateCacheKey({
      experience: req.experience,
      budget: req.budget,
      budgetRangeMin: req.budgetRangeMin,
      budgetRangeMax: req.budgetRangeMax,
      headphoneType: req.headphoneType,
      wantRecommendationsFor: req.wantRecommendationsFor,
      soundSignature: req.soundSignature,
      usage: req.usage
    })

    // Check cache first
    const cached = cache.get(cacheKey)
    if (cached && cached.expires > Date.now()) {
      console.log('🚀 Cache hit for recommendations:', cacheKey)
      return NextResponse.json(cached.data)
    }

    // Determine max options based on experience
    const maxOptions = req.experience === 'beginner' ? 3 : 
                      req.experience === 'intermediate' ? 5 : 10

    // Get requested components
    const requestedComponents = Object.entries(req.wantRecommendationsFor)
      .filter(([, wanted]) => wanted)
      .map(([component]) => component)

    // Calculate budget allocation
    const budgetAllocation = allocateBudgetAcrossComponents(
      req.budget, 
      requestedComponents, 
      req.existingGear
    )

    const results: {
      headphones: RecommendationComponent[]
      cans: RecommendationComponent[]
      iems: RecommendationComponent[]
      dacs: RecommendationComponent[]
      amps: RecommendationComponent[]
      combos: RecommendationComponent[]
      budgetAllocation: Record<string, number>
      needsAmplification: boolean
    } = {
      headphones: [],
      cans: [],
      iems: [],
      dacs: [],
      amps: [],
      combos: [],
      budgetAllocation,
      needsAmplification: false
    }

    // Build unified query to fetch all requested component types in a single database call
    const requestedCategories: string[] = []

    if (req.wantRecommendationsFor.headphones) {
      if (req.headphoneType === 'cans') {
        requestedCategories.push('cans')
      } else if (req.headphoneType === 'iems') {
        requestedCategories.push('iems')
      } else {
        requestedCategories.push('cans', 'iems')
      }
    }

    if (req.wantRecommendationsFor.dac) {
      requestedCategories.push('dac')
    }

    if (req.wantRecommendationsFor.amp) {
      requestedCategories.push('amp')
    }

    if (req.wantRecommendationsFor.combo) {
      requestedCategories.push('dac_amp')
    }

    // Single unified database query for all component types
    const { data: allComponentsData, error: componentsError } = await supabaseServer
      .from('components')
      .select('*')
      .in('category', requestedCategories)
      .order('price_used_min')

    if (componentsError) {
      throw componentsError
    }

    if (allComponentsData) {
      // Separate components by category for processing
      const componentsByCategory = {
        headphones: allComponentsData.filter(c => c.category === 'cans' || c.category === 'iems'),
        dacs: allComponentsData.filter(c => c.category === 'dac'),
        amps: allComponentsData.filter(c => c.category === 'amp'),
        combos: allComponentsData.filter(c => c.category === 'dac_amp')
      }

      // Process headphones if requested
      if (req.wantRecommendationsFor.headphones && componentsByCategory.headphones.length > 0) {
        const headphoneBudget = budgetAllocation.headphones || req.budget

        const allHeadphones = filterAndScoreComponents(
          componentsByCategory.headphones,
          headphoneBudget,
          req.budgetRangeMin,
          req.budgetRangeMax,
          req.soundSignature,
          req.usageRanking[0] || req.usage,
          maxOptions
        )

        // Separate cans and IEMs based on headphoneType
        if (req.headphoneType === 'both') {
          results.cans = allHeadphones.filter(h => h.category === 'cans')
          results.iems = allHeadphones.filter(h => h.category === 'iems')
          results.headphones = [] // Keep empty for backwards compatibility
        } else if (req.headphoneType === 'cans') {
          results.cans = allHeadphones.filter(h => h.category === 'cans')
          results.iems = []
          results.headphones = [] // Keep empty for backwards compatibility
        } else if (req.headphoneType === 'iems') {
          results.iems = allHeadphones.filter(h => h.category === 'iems')
          results.cans = []
          results.headphones = [] // Keep empty for backwards compatibility
        } else {
          // Fallback for legacy usage
          results.headphones = allHeadphones
          results.cans = []
          results.iems = []
        }

        // Check if amplification is needed
        results.needsAmplification = allHeadphones.some(h => {
          if (!h.amplificationAssessment) return h.needs_amp === true
          return h.amplificationAssessment.difficulty === 'demanding' ||
                 h.amplificationAssessment.difficulty === 'very_demanding'
        })
      }

      // Process DACs if requested
      if (req.wantRecommendationsFor.dac && componentsByCategory.dacs.length > 0) {
        const dacBudget = budgetAllocation.dac || req.budget * 0.2

        results.dacs = filterAndScoreComponents(
          componentsByCategory.dacs,
          dacBudget,
          req.budgetRangeMin, // Use same range as headphones
          req.budgetRangeMax, // Use same range as headphones
          req.soundSignature,
          req.usageRanking[0] || req.usage,
          maxOptions
        )
      }

      // Process AMPs if requested
      if (req.wantRecommendationsFor.amp && componentsByCategory.amps.length > 0) {
        const ampBudget = budgetAllocation.amp || req.budget * 0.25

        console.log('🔧 Processing amps with budget:', ampBudget, 'from', componentsByCategory.amps.length, 'available amps')

        results.amps = filterAndScoreComponents(
          componentsByCategory.amps,
          ampBudget,
          req.budgetRangeMin, // Use same range as headphones (-20% to +10%)
          req.budgetRangeMax, // Use same range as headphones
          req.soundSignature,
          req.usageRanking[0] || req.usage,
          maxOptions
        )

        console.log('🔧 Filtered amps result:', results.amps.length, 'amps')
      }

      // Process combo units if requested
      if (req.wantRecommendationsFor.combo && componentsByCategory.combos.length > 0) {
        const comboBudget = budgetAllocation.combo || req.budget * 0.4

        results.combos = filterAndScoreComponents(
          componentsByCategory.combos,
          comboBudget,
          req.budgetRangeMin, // Use same range as headphones
          req.budgetRangeMax, // Use same range as headphones
          req.soundSignature,
          req.usageRanking[0] || req.usage,
          maxOptions
        )
      }
    }

    // Auto-suggest amplification if needed
    if (results.needsAmplification && !req.wantRecommendationsFor.amp && !req.wantRecommendationsFor.combo) {
      const ampBudget = Math.min(300, req.budget * 0.3)
      
      const { data: suggestedAmps } = await supabaseServer
        .from('components')
        .select('*')
        .eq('category', 'amp')
        .lte('price_used_min', ampBudget * 1.5)
        .order('price_used_min')
        .limit(3)

      if (suggestedAmps) {
        const scoredAmps = filterAndScoreComponents(
          suggestedAmps,
          ampBudget,
          req.budgetRangeMin,
          req.budgetRangeMax,
          req.soundSignature,
          req.usageRanking[0] || req.usage,
          3
        )
        results.amps = [...results.amps, ...scoredAmps]
      }
    }

    // Cache the computed results before returning
    console.log('💾 Caching recommendations result:', cacheKey)
    cache.set(cacheKey, {
      data: results,
      expires: Date.now() + CACHE_DURATION
    })

    // Periodically clean up expired cache entries (10% chance)
    if (Math.random() < 0.1) {
      const now = Date.now()
      let expiredCount = 0
      for (const [key, value] of cache.entries()) {
        if (value.expires <= now) {
          cache.delete(key)
          expiredCount++
        }
      }
      if (expiredCount > 0) {
        console.log(`🧹 Cleaned up ${expiredCount} expired cache entries`)
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error generating recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    )
  }
}

// POST endpoint for handling request body parameters
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Extract parameters from request body (same logic as GET)
    const experienceParam = body.experience || 'intermediate'
    const budgetParam = body.budget?.toString() || '300'
    const budgetRangeMinParam = body.budgetRangeMin?.toString() || '20'
    const budgetRangeMaxParam = body.budgetRangeMax?.toString() || '10'
    const headphoneTypeParam = body.headphoneType || 'cans'
    const soundSignatureParam = body.soundSignature || body.sound || 'neutral'

    // For POST, we can accept more complex objects directly
    const wantRecommendationsForParam = body.wantRecommendationsFor || { headphones: true }
    const existingGearParam = body.existingGear || {}
    const usageParam = body.usage || 'music'
    const usageRankingParam = body.usageRanking || [usageParam]
    const excludedUsagesParam = body.excludedUsages || []

    // Convert to the format expected by the existing logic
    const experience = experienceParam
    const budget = parseInt(budgetParam, 10)
    const budgetRangeMin = parseInt(budgetRangeMinParam, 10)
    const budgetRangeMax = parseInt(budgetRangeMaxParam, 10)
    const headphoneType = headphoneTypeParam
    const soundSignature = soundSignatureParam
    const wantRecommendationsFor = wantRecommendationsForParam
    const existingGear = existingGearParam
    const usage = usageParam
    const usageRanking = Array.isArray(usageRankingParam) ? usageRankingParam : [usageParam]
    const excludedUsages = Array.isArray(excludedUsagesParam) ? excludedUsagesParam : []

    // Generate cache key
    const cacheKey = generateCacheKey({
      experience,
      budget,
      budgetRangeMin,
      budgetRangeMax,
      headphoneType,
      wantRecommendationsFor,
      soundSignature,
      usage,
    })

    // Check cache first
    const cached = cache.get(cacheKey)
    if (cached && cached.expires > Date.now()) {
      console.log('🚀 Cache hit for recommendations:', cacheKey)
      return NextResponse.json(cached.data)
    }

    // Continue with the same logic as GET endpoint...
    // For brevity, I'll delegate to a shared function
    // Create a mock request object for the existing GET logic
    const mockUrl = new URL('http://localhost:3000/api/recommendations')
    mockUrl.searchParams.set('experience', experience)
    mockUrl.searchParams.set('budget', budget.toString())
    mockUrl.searchParams.set('budgetRangeMin', budgetRangeMin.toString())
    mockUrl.searchParams.set('budgetRangeMax', budgetRangeMax.toString())
    mockUrl.searchParams.set('headphoneType', headphoneType)
    mockUrl.searchParams.set('soundSignature', soundSignature)
    mockUrl.searchParams.set('wantRecommendationsFor', JSON.stringify(wantRecommendationsFor))
    mockUrl.searchParams.set('existingGear', JSON.stringify(existingGear))
    mockUrl.searchParams.set('usage', usage)
    mockUrl.searchParams.set('usageRanking', JSON.stringify(usageRanking))
    mockUrl.searchParams.set('excludedUsages', JSON.stringify(excludedUsages))

    const mockRequest = {
      url: mockUrl.toString()
    } as NextRequest

    // Delegate to GET logic
    return await GET(mockRequest)

  } catch (error) {
    console.error('Error in POST recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to process recommendations request' },
      { status: 500 }
    )
  }
}