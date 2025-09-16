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

// Calculate synergy score based on sound signature and usage
function calculateSynergyScore(component: unknown, soundSig: string, primaryUsage: string): number {
  const comp = component as {
    sound_signature?: string
    use_cases?: string | string[]
  }
  let score = 0.5 // Base score
  
  // Sound signature matching (30% weight)
  if (comp.sound_signature) {
    if (comp.sound_signature === soundSig) {
      score += 0.3
    } else if (soundSig === 'neutral' && comp.sound_signature === 'balanced') {
      score += 0.25
    } else if (
      (soundSig === 'warm' && comp.sound_signature === 'neutral') ||
      (soundSig === 'bright' && comp.sound_signature === 'neutral')
    ) {
      score += 0.15
    }
  }
  
  // Usage case matching (20% weight)
  if (comp.use_cases && primaryUsage) {
    const useCases = Array.isArray(comp.use_cases) 
      ? comp.use_cases 
      : (typeof comp.use_cases === 'string' 
        ? comp.use_cases.split(',').map(u => u.trim().toLowerCase())
        : [])
    
    if (useCases.includes(primaryUsage.toLowerCase())) {
      score += 0.2
    } else if (useCases.includes('music') && primaryUsage.toLowerCase() === 'gaming') {
      score += 0.1 // Music gear often works well for gaming
    }
  }
  
  return Math.min(1, score)
}

// Calculate budget allocation across requested components
function allocateBudgetAcrossComponents(
  totalBudget: number, 
  requestedComponents: string[], 
  existingGear: RecommendationRequest['existingGear']
): Record<string, number> {
  const allocation: Record<string, number> = {}
  
  // Typical price ratios for audio components
  const priceRatios = {
    headphones: existingGear?.headphones ? 0.6 : 0.5,
    dac: existingGear?.dac ? 0.3 : 0.2,
    amp: existingGear?.amp ? 0.35 : 0.25,
    combo: existingGear?.combo ? 0.5 : 0.4
  }
  
  // Single component gets full budget
  if (requestedComponents.length === 1) {
    allocation[requestedComponents[0]] = totalBudget
    return allocation
  }
  
  // Calculate proportional allocation
  const totalRatio = requestedComponents.reduce((sum, comp) => {
    return sum + (priceRatios[comp as keyof typeof priceRatios] || 0.2)
  }, 0)
  
  requestedComponents.forEach(component => {
    const ratio = priceRatios[component as keyof typeof priceRatios] || 0.2
    allocation[component] = Math.floor(totalBudget * (ratio / totalRatio))
  })
  
  return allocation
}

// Filter and score components based on budget and preferences
function filterAndScoreComponents(
  components: unknown[],
  budget: number,
  budgetRangeMin: number,
  budgetRangeMax: number,
  soundSignature: string,
  primaryUsage: string,
  maxOptions: number
): RecommendationComponent[] {
  const minAcceptable = Math.max(20, budget * (1 - budgetRangeMin / 100))
  const maxAcceptable = budget * (1 + budgetRangeMax / 100)
  
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
      
      return {
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
    })
    .filter((c, index, arr) => {
      // Remove duplicates
      const key = `${c.name}|${c.brand}`
      return arr.findIndex(item => `${item.name}|${item.brand}` === key) === index
    })
    .filter(c => {
      // Budget filtering
      const isAffordable = (c.price_used_min || 0) <= budget * 1.15
      const isInRange = c.avgPrice <= maxAcceptable && c.avgPrice >= minAcceptable
      const hasReasonableRange = ((c.price_used_max || 0) - (c.price_used_min || 0)) <= c.avgPrice * 1.5
      
      return isAffordable && isInRange && hasReasonableRange
    })
    .sort((a, b) => {
      // Multi-factor scoring: price fit + synergy
      const aPriceFit = 1 - Math.abs(budget - a.avgPrice) / budget
      const bPriceFit = 1 - Math.abs(budget - b.avgPrice) / budget
      const aScore = aPriceFit * 0.6 + a.synergyScore * 0.4
      const bScore = bPriceFit * 0.6 + b.synergyScore * 0.4
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
    const soundSignatureParam = searchParams.get('sound') || 'neutral'

    // Validate experience level
    const validExperience = ['beginner', 'intermediate', 'advanced']
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

        results.headphones = filterAndScoreComponents(
          componentsByCategory.headphones,
          headphoneBudget,
          req.budgetRangeMin,
          req.budgetRangeMax,
          req.soundSignature,
          req.usageRanking[0] || req.usage,
          maxOptions
        )

        // Check if amplification is needed
        results.needsAmplification = results.headphones.some(h => {
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
          50, // More flexible range for DACs
          100, // Allow higher prices for DACs
          req.soundSignature,
          req.usageRanking[0] || req.usage,
          maxOptions
        )
      }

      // Process AMPs if requested
      if (req.wantRecommendationsFor.amp && componentsByCategory.amps.length > 0) {
        const ampBudget = budgetAllocation.amp || req.budget * 0.25

        results.amps = filterAndScoreComponents(
          componentsByCategory.amps,
          ampBudget,
          50, // More flexible range for amps
          100,
          req.soundSignature,
          req.usageRanking[0] || req.usage,
          maxOptions
        )
      }

      // Process combo units if requested
      if (req.wantRecommendationsFor.combo && componentsByCategory.combos.length > 0) {
        const comboBudget = budgetAllocation.combo || req.budget * 0.4

        results.combos = filterAndScoreComponents(
          componentsByCategory.combos,
          comboBudget,
          40,
          80,
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
          50,
          100,
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