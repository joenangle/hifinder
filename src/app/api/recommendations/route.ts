import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { assessAmplificationFromImpedance } from '@/lib/audio-calculations'

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
    
    // Parse request parameters
    const req: RecommendationRequest = {
      experience: searchParams.get('experience') || 'intermediate',
      budget: parseInt(searchParams.get('budget') || '300'),
      budgetRangeMin: parseInt(searchParams.get('budgetRangeMin') || '20'),
      budgetRangeMax: parseInt(searchParams.get('budgetRangeMax') || '10'),
      headphoneType: searchParams.get('headphoneType') || 'cans',
      wantRecommendationsFor: JSON.parse(searchParams.get('wantRecommendationsFor') || '{"headphones":true,"dac":false,"amp":false,"combo":false}'),
      existingGear: JSON.parse(searchParams.get('existingGear') || '{"headphones":false,"dac":false,"amp":false,"combo":false,"specificModels":{"headphones":"","dac":"","amp":"","combo":""}}'),
      usage: searchParams.get('usage') || 'music',
      usageRanking: JSON.parse(searchParams.get('usageRanking') || '["Music","Gaming","Movies","Work"]'),
      excludedUsages: JSON.parse(searchParams.get('excludedUsages') || '[]'),
      soundSignature: searchParams.get('sound') || 'neutral',
      powerNeeds: searchParams.get('powerNeeds') || '',
      connectivity: searchParams.get('connectivity') ? JSON.parse(searchParams.get('connectivity')!) : [],
      usageContext: searchParams.get('usageContext') || '',
      existingHeadphones: searchParams.get('existingHeadphones') || '',
      optimizeAroundHeadphones: searchParams.get('optimizeAroundHeadphones') || ''
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

    // Fetch headphones if requested
    if (req.wantRecommendationsFor.headphones) {
      const headphoneBudget = budgetAllocation.headphones || req.budget
      const categoryFilter = req.headphoneType === 'cans' ? 'cans' : 
                           req.headphoneType === 'iems' ? 'iems' : 'cans'
      
      const { data: headphonesData } = await supabaseServer
        .from('components')
        .select('*')
        .eq('category', categoryFilter)
        .order('price_used_min')

      if (headphonesData) {
        results.headphones = filterAndScoreComponents(
          headphonesData,
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
    }

    // Fetch DACs if requested
    if (req.wantRecommendationsFor.dac) {
      const dacBudget = budgetAllocation.dac || req.budget * 0.2
      
      const { data: dacsData } = await supabaseServer
        .from('components')
        .select('*')
        .eq('category', 'dac')
        .order('price_used_min')

      if (dacsData) {
        results.dacs = filterAndScoreComponents(
          dacsData,
          dacBudget,
          50, // More flexible range for DACs
          100, // Allow higher prices for DACs
          req.soundSignature,
          req.usageRanking[0] || req.usage,
          maxOptions
        )
      }
    }

    // Fetch AMPs if requested
    if (req.wantRecommendationsFor.amp) {
      const ampBudget = budgetAllocation.amp || req.budget * 0.25
      
      const { data: ampsData } = await supabaseServer
        .from('components')
        .select('*')
        .eq('category', 'amp')
        .order('price_used_min')

      if (ampsData) {
        results.amps = filterAndScoreComponents(
          ampsData,
          ampBudget,
          50, // More flexible range for amps
          100,
          req.soundSignature,
          req.usageRanking[0] || req.usage,
          maxOptions
        )
      }
    }

    // Fetch combo units if requested
    if (req.wantRecommendationsFor.combo) {
      const comboBudget = budgetAllocation.combo || req.budget * 0.4
      
      const { data: combosData } = await supabaseServer
        .from('components')
        .select('*')
        .eq('category', 'dac_amp')
        .order('price_used_min')

      if (combosData) {
        results.combos = filterAndScoreComponents(
          combosData,
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

    return NextResponse.json(results)
  } catch (error) {
    console.error('Error generating recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    )
  }
}