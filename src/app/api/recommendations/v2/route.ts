import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { assessAmplificationFromImpedance } from '@/lib/audio-calculations'

// Intelligent caching system for recommendations
const cache = new Map<string, { data: unknown, expires: number }>()
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes

function generateCacheKey(params: {
  experience: string
  budget: number
  budgetRangeMin: number
  budgetRangeMax: number
  headphoneType: string
  wantRecommendationsFor: object
  soundSignature: string
  usage: string
  driverType?: string
}): string {
  const keyComponents = [
    `exp_${params.experience}`,
    `budget_${params.budget}`,
    `range_${params.budgetRangeMin}_${params.budgetRangeMax}`,
    `type_${params.headphoneType}`,
    `want_${JSON.stringify(params.wantRecommendationsFor)}`,
    `sound_${params.soundSignature}`,
    `usage_${params.usage}`,
    params.driverType ? `driver_${params.driverType}` : ''
  ].filter(Boolean)
  return `recommendations_v2_${keyComponents.join('_')}`
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
  sensitivity?: number
  power_required_mw?: number
  voltage_required_v?: number
  needs_amp?: boolean
  amazon_url?: string
  why_recommended?: string
  image_url?: string
  // Expert analysis fields
  crinacle_sound_signature?: string
  tone_grade?: string
  technical_grade?: string
  expert_grade_numeric?: number
  crinacle_comments?: string
  driver_type?: string
  fit?: string
  crinacle_rank?: number
  value_rating?: number
  asr_sinad?: number
  // Amp specific
  power_output?: string
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
}

interface RecommendationRequest {
  experience: string
  budget: number
  budgetRangeMin: number
  budgetRangeMax: number
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
  driverType?: string // New: for enthusiasts
}

// Convert letter grades to numeric for quality gating
function gradeToNumeric(grade: string | null | undefined): number | null {
  if (!grade) return null

  const gradeMap: Record<string, number> = {
    'S+': 4.3, 'S': 4.0, 'S-': 3.7,
    'A+': 4.0, 'A': 3.7, 'A-': 3.3,
    'B+': 3.0, 'B': 2.7, 'B-': 2.3,
    'C+': 2.0, 'C': 1.7, 'C-': 1.3,
    'D+': 1.0, 'D': 0.7, 'D-': 0.3,
    'F': 0
  }

  // Clean the grade string
  const cleanGrade = grade.trim().toUpperCase()
  return gradeMap[cleanGrade] ?? null
}

// Use case to sound signature translation
function translateUseCaseToSignature(useCase: string): string {
  const translations: Record<string, string> = {
    'gaming': 'fun',
    'movies': 'fun',
    'classical': 'neutral',
    'jazz': 'neutral',
    'acoustic': 'neutral',
    'electronic': 'fun',
    'edm': 'fun',
    'hip-hop': 'warm',
    'rock': 'fun',
    'metal': 'bright',
    'podcasts': 'neutral',
    'vocals': 'neutral',
    'studio': 'neutral',
    'mixing': 'neutral',
    'mastering': 'neutral'
  }

  return translations[useCase.toLowerCase()] || 'neutral'
}

// Map sound signatures to beginner-friendly use cases
function getUseCasesForSignature(signature: string): string[] {
  const signatureToUseCases: { [key: string]: string[] } = {
    'neutral': ['critical listening', 'all music genres', 'reference', 'studio work'],
    'warm': ['relaxed listening', 'long sessions', 'acoustic', 'jazz', 'vocals'],
    'bright': ['detail retrieval', 'classical', 'acoustic', 'competitive gaming'],
    'fun': ['EDM', 'hip-hop', 'movies', 'gaming', 'bass-heavy music'],
    'balanced': ['versatile listening', 'all genres', 'daily use']
  }

  return signatureToUseCases[signature] || signatureToUseCases['neutral']
}

// Enhanced dual-layer synergy scoring with detailed Crinacle signatures
function calculateSynergyScore(
  component: unknown,
  soundSig: string,
  primaryUsage: string
): number {
  const comp = component as {
    sound_signature?: string
    crinacle_sound_signature?: string
    use_cases?: string | string[]
  }

  // New approach: Start at 0 and build up with clear component weights
  // Max possible: 100%, but realistic excellent matches: 75-85%
  let score = 0

  // Translate use case to sound signature preference (for 'any' signature)
  const usageSignature = translateUseCaseToSignature(primaryUsage)
  const effectiveSignature = soundSig !== 'any' ? soundSig : usageSignature

  // Component 1: Sound Signature Match (max 30% weight)
  let soundScore = 0
  if (comp.sound_signature && effectiveSignature !== 'any') {
    if (comp.sound_signature === effectiveSignature) {
      soundScore = 0.20 // Perfect basic match
    } else if (effectiveSignature === 'neutral' && comp.sound_signature === 'balanced') {
      soundScore = 0.16 // Close match
    } else if (
      (effectiveSignature === 'warm' && comp.sound_signature === 'neutral') ||
      (effectiveSignature === 'bright' && comp.sound_signature === 'neutral')
    ) {
      soundScore = 0.12 // Compatible match
    } else {
      soundScore = 0.05 // Has signature but doesn't match
    }
  } else {
    soundScore = 0.10 // No signature = neutral baseline
  }

  // Detailed Crinacle signature adds to sound score
  if (comp.crinacle_sound_signature && effectiveSignature !== 'any') {
    const detailedMatch = getDetailedSignatureMatch(comp.crinacle_sound_signature, effectiveSignature)
    soundScore += detailedMatch * 0.10 // Up to +10% for detailed match
  }

  score += Math.min(0.30, soundScore)

  // Component 2: Usage Match (max 20% weight)
  let usageScore = 0
  if (comp.use_cases && primaryUsage) {
    const useCases = Array.isArray(comp.use_cases)
      ? comp.use_cases
      : (typeof comp.use_cases === 'string'
        ? comp.use_cases.split(',').map(u => u.trim().toLowerCase())
        : [])

    if (useCases.includes(primaryUsage.toLowerCase())) {
      usageScore = 0.15 // Direct usage match
    } else if (useCases.includes('music') && primaryUsage.toLowerCase() === 'gaming') {
      usageScore = 0.08 // Music gear for gaming
    }
  }

  // Inferred use case bonus
  const inferredUseCases = getUseCasesForSignature(comp.sound_signature || 'neutral')
  if (inferredUseCases.some(uc => uc.toLowerCase().includes(primaryUsage.toLowerCase()))) {
    usageScore += 0.05
  }

  score += Math.min(0.20, usageScore)

  // Total from synergy: max 50%
  // The other 50% comes from price fit + bonuses in sorting
  return Math.min(1, score)
}

// Detailed signature matching with partial scoring
function getDetailedSignatureMatch(crinSig: string, userPref: string): number {
  if (!crinSig || !userPref) return 0

  const exactMatches: Record<string, Record<string, number>> = {
    'neutral': {
      'Neutral': 1.0,
      'Bass-rolled neutral': 0.85,
      'Warm neutral': 0.75,
      'Bright neutral': 0.75,
      'Harman neutral': 0.9,
      'DF-neutral': 0.85,
      'Dark neutral': 0.8,
      '"""Balanced"""': 0.8
    },
    'bright': {
      'Bright neutral': 1.0,
      'Bright': 0.95,
      'Neutral': 0.7,
      'Bass-rolled neutral': 0.5 // Less bass = more apparent brightness (more accurate)
    },
    'warm': {
      'Warm neutral': 1.0,
      'Warm': 0.95,
      'Warm V-shape': 0.85,
      'Warm U-shape': 0.8,
      'Neutral': 0.6,
      'Neutral with bass boost': 0.8, // Better match for warm preference
      'Dark neutral': 0.9
    },
    'fun': {
      'V-shaped': 1.0,
      'U-shaped': 0.95,
      'Warm V-shape': 0.9,
      'Mild V-shape': 0.85,
      'Neutral with bass boost': 0.7,
      'Mid-centric': 0.3
    }
  }

  return exactMatches[userPref]?.[crinSig] || 0
}

// Calculate budget allocation with summit-fi caps
function allocateBudgetAcrossComponents(
  totalBudget: number,
  requestedComponents: string[],
  existingGear: RecommendationRequest['existingGear']
): Record<string, number> {
  const allocation: Record<string, number> = {}

  // Summit-fi budget caps - significantly higher for high-end gear
  const componentBudgetCaps = {
    headphones: totalBudget * 0.9, // Headphones can take most budget
    dac: Math.min(2000, totalBudget * 0.4), // DACs up to $2000
    amp: Math.min(2000, totalBudget * 0.4), // Amps up to $2000
    combo: Math.min(3000, totalBudget * 0.6) // Combos up to $3000
  }

  // Price ratios adjusted for existing gear
  const priceRatios = {
    headphones: existingGear?.headphones ? 0.6 : 0.5,
    dac: existingGear?.dac ? 0.3 : 0.2,
    amp: existingGear?.amp ? 0.3 : 0.2,
    combo: existingGear?.combo ? 0.5 : 0.35
  }

  // Single component gets full budget (respects caps)
  if (requestedComponents.length === 1) {
    const component = requestedComponents[0]
    const cap = componentBudgetCaps[component as keyof typeof componentBudgetCaps] || totalBudget
    allocation[component] = Math.min(totalBudget, cap)
    return allocation
  }

  // Calculate proportional allocation
  const totalRatio = requestedComponents.reduce((sum, comp) => {
    return sum + (priceRatios[comp as keyof typeof priceRatios] || 0.25)
  }, 0)

  requestedComponents.forEach(component => {
    const ratio = priceRatios[component as keyof typeof priceRatios] || 0.25
    const proportionalBudget = Math.floor(totalBudget * (ratio / totalRatio))
    const cap = componentBudgetCaps[component as keyof typeof componentBudgetCaps] || totalBudget
    allocation[component] = Math.min(proportionalBudget, cap)
  })

  return allocation
}

// Power matching for amps based on existing headphones
function calculatePowerCompatibility(
  amp: RecommendationComponent,
  headphones: {
    impedance?: number
    sensitivity?: number
    power_required_mw?: number
    voltage_required_v?: number
    name?: string
  }
): number {
  if (!headphones.impedance && !headphones.sensitivity) return 0.5

  // If we have power requirements, check if amp can meet them
  if (headphones.power_required_mw && amp.power_output) {
    // Parse power output (e.g., "500mW @ 32Ω")
    const powerMatch = amp.power_output.match(/(\d+)mW.*?(\d+)[Ωohm]/i)
    if (powerMatch) {
      const ampPower = parseInt(powerMatch[1])
      const ampImpedance = parseInt(powerMatch[2])

      // Rough power scaling based on impedance
      const scaledPower = ampPower * (ampImpedance / (headphones.impedance || 32))

      if (scaledPower >= headphones.power_required_mw * 1.5) {
        return 1.0 // Excellent match - 50% headroom
      } else if (scaledPower >= headphones.power_required_mw) {
        return 0.8 // Good match
      } else if (scaledPower >= headphones.power_required_mw * 0.7) {
        return 0.5 // Marginal
      } else {
        return 0.2 // Insufficient
      }
    }
  }

  // Fallback to impedance-based assessment
  const assessment = assessAmplificationFromImpedance(
    headphones.impedance ?? null,
    null,
    headphones.name,
    ''
  )

  const difficultyScores = {
    'easy': 0.3,
    'moderate': 0.6,
    'demanding': 0.8,
    'very_demanding': 1.0,
    'unknown': 0.5
  }

  return difficultyScores[assessment.difficulty]
}

// Filter and score with asymmetric price scoring
function filterAndScoreComponents(
  components: unknown[],
  budget: number,
  budgetRangeMin: number,
  budgetRangeMax: number,
  soundSignature: string,
  primaryUsage: string,
  maxOptions: number,
  driverType?: string,
  existingHeadphones?: {
    impedance?: number
    sensitivity?: number
    power_required_mw?: number
    voltage_required_v?: number
    name?: string
  }
): RecommendationComponent[] {
  const minAcceptable = 20 // Always allow cheap options
  const maxAcceptable = budget * (1 + budgetRangeMax / 100)

  return components
    .map(c => {
      const component = c as {
        price_used_min?: number
        price_used_max?: number
        category?: string
        impedance?: number
        sensitivity?: number
        power_required_mw?: number
        voltage_required_v?: number
        needs_amp?: boolean
        name?: string
        brand?: string
        tone_grade?: string
        technical_grade?: string
        expert_grade_numeric?: number
        value_rating?: number
        driver_type?: string
        power_output?: string
        [key: string]: unknown
      }

      const avgPrice = ((component.price_used_min || 0) + (component.price_used_max || 0)) / 2

      // Only calculate synergy for headphones/IEMs (sound signature is meaningful)
      // DACs/amps/combos get neutral score since they should be transparent
      const synergyScore = (component.category === 'cans' || component.category === 'iems')
        ? calculateSynergyScore(component, soundSignature, primaryUsage)
        : 0.75 // Neutral score for DACs/amps (higher than base to avoid penalty)

      // Convert letter grades to numeric if not already done
      const toneGradeNumeric = component.expert_grade_numeric ?? gradeToNumeric(component.tone_grade)
      const technicalGradeNumeric = gradeToNumeric(component.technical_grade)

      // Calculate power compatibility for amps
      let powerAdequacy = 0.5
      if (component.category === 'amp' && existingHeadphones) {
        powerAdequacy = calculatePowerCompatibility(
          { ...component, avgPrice, synergyScore } as RecommendationComponent,
          existingHeadphones
        )
      }

      return {
        ...component,
        avgPrice,
        synergyScore,
        powerAdequacy,
        expert_grade_numeric: toneGradeNumeric,
        // Add amplification assessment for headphones
        ...(component.category === 'cans' || component.category === 'iems' ? {
          amplificationAssessment: assessAmplificationFromImpedance(
            component.impedance ?? null,
            component.needs_amp ?? null,
            component.name,
            component.brand
          )
        } : {})
      } as RecommendationComponent
    })
    .filter((c, index, arr) => {
      // Remove duplicates
      const key = `${c.name}|${c.brand}`
      return arr.findIndex(item => `${item.name}|${item.brand}` === key) === index
    })
    .filter(c => {
      // Driver type filtering for enthusiasts
      if (driverType && driverType !== 'any' && c.driver_type) {
        if (c.driver_type.toLowerCase() !== driverType.toLowerCase()) {
          return false
        }
      }

      // Budget filtering with 2.5x price spread ratio
      const isAffordable = (c.price_used_min || 0) <= budget * 1.15
      const isInRange = c.avgPrice <= maxAcceptable && c.avgPrice >= minAcceptable
      const hasReasonableRange = ((c.price_used_max || 0) - (c.price_used_min || 0)) <= c.avgPrice * 2.5

      return isAffordable && isInRange && hasReasonableRange
    })
    .map(comp => {
      // Calculate price fit for this component
      let priceFit = 0
      if (comp.avgPrice <= budget) {
        // Under budget: 25% spread (0.75 to 1.00) for meaningful differentiation
        priceFit = 0.75 + (comp.avgPrice / budget) * 0.25
      } else {
        // Over budget: heavy penalty
        priceFit = Math.max(0, 1 - (comp.avgPrice - budget) / budget * 1.5)
      }

      // Calculate bonuses - Quality and value indicators (max 20% total)
      const valueBonus = (comp.value_rating ?? 0) * 0.02 // Max 10% (5 rating × 2%)
      const expertBonus = (comp.expert_grade_numeric && comp.expert_grade_numeric >= 3.3) ? 0.05 : 0
      const powerBonus = comp.category === 'amp' ? (comp.powerAdequacy || 0.5) * 0.05 : 0
      const totalBonus = Math.min(0.20, valueBonus + expertBonus + powerBonus)

      // Final scoring breakdown:
      // - Price fit: 40% weight
      // - Synergy score: 40% weight (synergy itself is max 50%)
      // - Bonuses: up to 20% (quality/value/power)
      // Total possible: 100%, realistic excellent: 75-85%
      const matchScore = priceFit * 0.40 + comp.synergyScore * 0.40 + totalBonus

      return {
        ...comp,
        matchScore: Math.round(matchScore * 100), // Convert to percentage (0-100)
        priceFitScore: Math.round(priceFit * 100)
      }
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, maxOptions)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse parameters
    const experienceParam = searchParams.get('experience') || 'intermediate'
    const budgetParam = searchParams.get('budget') || '300'
    const budgetRangeMinParam = searchParams.get('budgetRangeMin') || '20'
    const budgetRangeMaxParam = searchParams.get('budgetRangeMax') || '10'
    const headphoneTypeParam = searchParams.get('headphoneType') || 'cans'
    const soundSignatureParam = searchParams.get('sound') || 'neutral'
    const driverTypeParam = searchParams.get('driverType') || 'any'

    // Validate parameters
    const budget = parseInt(budgetParam)
    if (isNaN(budget) || budget < 20 || budget > 50000) {
      return NextResponse.json({ error: 'Invalid budget' }, { status: 400 })
    }

    const budgetRangeMin = parseInt(budgetRangeMinParam)
    const budgetRangeMax = parseInt(budgetRangeMaxParam)

    // Parse JSON parameters
    let wantRecommendationsFor, existingGear, usageRanking, excludedUsages, connectivity

    try {
      wantRecommendationsFor = JSON.parse(searchParams.get('wantRecommendationsFor') || '{"headphones":true}')
      existingGear = JSON.parse(searchParams.get('existingGear') || '{}')
      usageRanking = JSON.parse(searchParams.get('usageRanking') || '["Music"]')
      excludedUsages = JSON.parse(searchParams.get('excludedUsages') || '[]')
      connectivity = JSON.parse(searchParams.get('connectivity') || '[]')
    } catch {
      return NextResponse.json({ error: 'Invalid JSON parameters' }, { status: 400 })
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
      optimizeAroundHeadphones: searchParams.get('optimizeAroundHeadphones') || '',
      driverType: driverTypeParam
    }

    // Generate cache key
    const cacheKey = generateCacheKey({
      experience: req.experience,
      budget: req.budget,
      budgetRangeMin: req.budgetRangeMin,
      budgetRangeMax: req.budgetRangeMax,
      headphoneType: req.headphoneType,
      wantRecommendationsFor: req.wantRecommendationsFor,
      soundSignature: req.soundSignature,
      usage: req.usage,
      driverType: req.driverType
    })

    // Check cache
    const cached = cache.get(cacheKey)
    if (cached && cached.expires > Date.now()) {
      return NextResponse.json(cached.data)
    }

    // Determine max options - NO LIMITS for enthusiasts
    const maxOptions = req.experience === 'beginner' ? 5 :
                      req.experience === 'intermediate' ? 8 : 15

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
      dacs: RecommendationComponent[]
      amps: RecommendationComponent[]
      combos: RecommendationComponent[]
      budgetAllocation: Record<string, number>
      needsAmplification: boolean
    } = {
      headphones: [],
      dacs: [],
      amps: [],
      combos: [],
      budgetAllocation,
      needsAmplification: false
    }

    // Build query for all components
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

    // Single database query
    const { data: allComponentsData, error } = await supabaseServer
      .from('components')
      .select('*')
      .in('category', requestedCategories)
      .order('price_used_min')

    if (error) throw error

    // Get existing headphones data for amp matching
    let existingHeadphonesData = null
    if (req.wantRecommendationsFor.amp && req.existingHeadphones) {
      const { data } = await supabaseServer
        .from('components')
        .select('impedance, sensitivity, power_required_mw, voltage_required_v, name')
        .ilike('name', `%${req.existingHeadphones}%`)
        .limit(1)

      existingHeadphonesData = data?.[0] || null
    }

    if (allComponentsData) {
      const componentsByCategory = {
        headphones: allComponentsData.filter(c => c.category === 'cans' || c.category === 'iems'),
        dacs: allComponentsData.filter(c => c.category === 'dac'),
        amps: allComponentsData.filter(c => c.category === 'amp'),
        combos: allComponentsData.filter(c => c.category === 'dac_amp')
      }

      // Process headphones
      if (req.wantRecommendationsFor.headphones && componentsByCategory.headphones.length > 0) {
        const headphoneBudget = budgetAllocation.headphones || req.budget

        results.headphones = filterAndScoreComponents(
          componentsByCategory.headphones,
          headphoneBudget,
          req.budgetRangeMin,
          req.budgetRangeMax,
          req.soundSignature,
          req.usageRanking[0] || req.usage,
          maxOptions,
          req.driverType
        )

        results.needsAmplification = results.headphones.some(h => {
          if (!h.amplificationAssessment) return h.needs_amp === true
          return h.amplificationAssessment.difficulty === 'demanding' ||
                 h.amplificationAssessment.difficulty === 'very_demanding'
        })
      }

      // Process DACs
      if (req.wantRecommendationsFor.dac && componentsByCategory.dacs.length > 0) {
        const dacBudget = budgetAllocation.dac || req.budget * 0.25

        results.dacs = filterAndScoreComponents(
          componentsByCategory.dacs,
          dacBudget,
          req.budgetRangeMin,
          req.budgetRangeMax,
          req.soundSignature,
          req.usageRanking[0] || req.usage,
          maxOptions
        )
      }

      // Process AMPs with power matching
      if (req.wantRecommendationsFor.amp && componentsByCategory.amps.length > 0) {
        const ampBudget = budgetAllocation.amp || req.budget * 0.25

        results.amps = filterAndScoreComponents(
          componentsByCategory.amps,
          ampBudget,
          req.budgetRangeMin,
          req.budgetRangeMax,
          req.soundSignature,
          req.usageRanking[0] || req.usage,
          maxOptions,
          undefined,
          existingHeadphonesData || undefined
        )
      }

      // Process combo units
      if (req.wantRecommendationsFor.combo && componentsByCategory.combos.length > 0) {
        const comboBudget = budgetAllocation.combo || req.budget * 0.4

        results.combos = filterAndScoreComponents(
          componentsByCategory.combos,
          comboBudget,
          req.budgetRangeMin,
          req.budgetRangeMax,
          req.soundSignature,
          req.usageRanking[0] || req.usage,
          maxOptions
        )
      }
    }

    // Cache results
    cache.set(cacheKey, {
      data: results,
      expires: Date.now() + CACHE_DURATION
    })

    // Periodic cache cleanup
    if (Math.random() < 0.1) {
      const now = Date.now()
      for (const [key, value] of cache.entries()) {
        if (value.expires <= now) {
          cache.delete(key)
        }
      }
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error in v2 recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    )
  }
}

// POST endpoint
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Convert body to URL params for GET handler
    const url = new URL(request.url)
    Object.entries(body).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, typeof value === 'object' ? JSON.stringify(value) : String(value))
      }
    })

    const mockRequest = { url: url.toString() } as NextRequest
    return await GET(mockRequest)

  } catch (error) {
    console.error('Error in v2 POST:', error)
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}