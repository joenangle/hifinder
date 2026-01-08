import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { calculateBudgetRange } from '@/lib/budget-ranges'

// Simple in-memory cache for filter counts
const cache = new Map<string, { data: unknown, expires: number }>()
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes (longer since this changes less frequently)

function getCacheKey(params: {
  budget: number
  rangeMin: number
  rangeMax: number
  equipment?: string[]
  soundSignature?: string | null
  wantRecommendationsFor?: string
  customBudgetAllocation?: string
}) {
  const equipStr = params.equipment?.sort().join('-') || 'none'
  const soundStr = params.soundSignature || 'none'
  const wantStr = params.wantRecommendationsFor || 'headphones'
  const customStr = params.customBudgetAllocation || 'auto'
  return `filter_counts_${params.budget}_${params.rangeMin}_${params.rangeMax}_${equipStr}_${soundStr}_${wantStr}_${customStr}`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse parameters
    const budget = parseInt(searchParams.get('budget') || '300')
    const rangeMin = parseInt(searchParams.get('rangeMin') || '20')
    const rangeMax = parseInt(searchParams.get('rangeMax') || '10')

    // Parse wantRecommendationsFor to understand budget allocation
    const wantRecsParam = searchParams.get('wantRecommendationsFor')
    let wantRecommendationsFor = {
      headphones: true,
      dac: false,
      amp: false,
      combo: false
    }
    if (wantRecsParam) {
      try {
        wantRecommendationsFor = JSON.parse(wantRecsParam)
      } catch {
        // Use defaults
      }
    }

    // Parse custom budget allocation (user-defined)
    const customBudgetAllocationParam = searchParams.get('customBudgetAllocation')
    let customBudgetAllocation: Record<string, { amount: number; rangeMin?: number; rangeMax?: number }> | null = null
    if (customBudgetAllocationParam) {
      try {
        customBudgetAllocation = JSON.parse(customBudgetAllocationParam)
      } catch {
        // Invalid format, ignore
      }
    }

    // Parse current filters
    const equipmentParam = searchParams.get('equipment') || ''
    const soundSignatureParam = searchParams.get('soundSignatures') || ''
    const activeEquipment = equipmentParam ? equipmentParam.split(',').filter(Boolean) : []
    const activeSoundSignature = soundSignatureParam || null

    // Check cache first
    const cacheKey = getCacheKey({
      budget,
      rangeMin,
      rangeMax,
      equipment: activeEquipment,
      soundSignature: activeSoundSignature,
      wantRecommendationsFor: wantRecsParam || '',
      customBudgetAllocation: customBudgetAllocationParam || ''
    })
    const cached = cache.get(cacheKey)

    if (cached && cached.expires > Date.now()) {
      return NextResponse.json(cached.data)
    }

    // Calculate budget allocation
    const budgetAllocation: Record<string, { min: number, max: number }> = {}

    if (customBudgetAllocation) {
      // Use custom user-defined allocation
      Object.entries(customBudgetAllocation).forEach(([component, data]) => {
        const { amount, rangeMin: customRangeMin, rangeMax: customRangeMax } = data
        const isSignalGear = ['dac', 'amp', 'combo'].includes(component)
        const range = calculateBudgetRange(
          amount,
          customRangeMin ?? rangeMin,
          customRangeMax ?? rangeMax,
          isSignalGear
        )
        budgetAllocation[component] = range
      })
    } else {
      // Use automatic allocation (same logic as recommendations API)
      const requestedComponents = []
      if (wantRecommendationsFor.headphones) requestedComponents.push('headphones')
      if (wantRecommendationsFor.dac) requestedComponents.push('dac')
      if (wantRecommendationsFor.amp) requestedComponents.push('amp')
      if (wantRecommendationsFor.combo) requestedComponents.push('combo')

      // Price ratios for budget allocation
      const priceRatios = {
        headphones: 0.5,
        dac: 0.2,
        amp: 0.2,
        combo: 0.35
      }

      if (requestedComponents.length === 1) {
        const component = requestedComponents[0]
        const isSignalGear = ['dac', 'amp', 'combo'].includes(component)
        const range = calculateBudgetRange(budget, undefined, undefined, isSignalGear)
        budgetAllocation[component] = range
      } else if (requestedComponents.length > 0) {
        // Proportional allocation for multiple components
        const totalRatio = requestedComponents.reduce((sum, comp) => {
          return sum + (priceRatios[comp as keyof typeof priceRatios] || 0.25)
        }, 0)

        requestedComponents.forEach(component => {
          const ratio = priceRatios[component as keyof typeof priceRatios] || 0.25
          const componentBudget = Math.floor(budget * (ratio / totalRatio))
          const isSignalGear = ['dac', 'amp', 'combo'].includes(component)
          const range = calculateBudgetRange(componentBudget, undefined, undefined, isSignalGear)
          budgetAllocation[component] = range
        })
      } else {
        // Default to headphones if no components selected
        const range = calculateBudgetRange(budget, undefined, undefined, false)
        budgetAllocation['headphones'] = range
      }
    }

    // OPTIMIZED: Single query approach - fetch minimal data and count in-memory
    // This replaces 9+ separate queries with 1 query + client-side aggregation

    // Build list of all categories and price ranges we need
    const categoriesToFetch: Array<{category: string; minPrice: number; maxPrice: number}> = []

    if (wantRecommendationsFor.headphones && budgetAllocation.headphones) {
      const { min, max } = budgetAllocation.headphones
      categoriesToFetch.push({ category: 'cans', minPrice: min, maxPrice: max })
      categoriesToFetch.push({ category: 'iems', minPrice: min, maxPrice: max })
    }
    if (wantRecommendationsFor.dac && budgetAllocation.dac) {
      const { min, max } = budgetAllocation.dac
      categoriesToFetch.push({ category: 'dac', minPrice: min, maxPrice: max })
    }
    if (wantRecommendationsFor.amp && budgetAllocation.amp) {
      const { min, max } = budgetAllocation.amp
      categoriesToFetch.push({ category: 'amp', minPrice: min, maxPrice: max })
    }
    if (wantRecommendationsFor.combo && budgetAllocation.combo) {
      const { min, max } = budgetAllocation.combo
      categoriesToFetch.push({ category: 'dac_amp', minPrice: min, maxPrice: max })
    }

    // Single query to fetch all components we need for counting
    const allCategories = [...new Set(categoriesToFetch.map(c => c.category))]
    const { data: componentsData } = await supabase
      .from('components')
      .select('category, sound_signature, price_used_min, price_used_max')
      .in('category', allCategories)

    // Count in-memory (still faster than multiple round trips)
    const soundSignatures = ['neutral', 'warm', 'bright', 'fun']
    const soundCounts: Record<string, number> = {}
    let cansCount = 0
    let iemsCount = 0
    let dacsCount = 0
    let ampsCount = 0
    let combosCount = 0

    // Initialize sound signature counts
    soundSignatures.forEach(sig => { soundCounts[sig] = 0 })

    // Count each component
    componentsData?.forEach(comp => {
      const categoryRange = categoriesToFetch.find(
        r => r.category === comp.category &&
             comp.price_used_min !== null &&
             comp.price_used_max !== null &&
             comp.price_used_min >= r.minPrice &&
             comp.price_used_max <= r.maxPrice
      )

      if (!categoryRange) return // Component doesn't match any requested range

      // Count for equipment types
      if (comp.category === 'cans') cansCount++
      else if (comp.category === 'iems') iemsCount++
      else if (comp.category === 'dac') dacsCount++
      else if (comp.category === 'amp') ampsCount++
      else if (comp.category === 'dac_amp') combosCount++

      // Count for sound signatures (headphones only)
      if ((comp.category === 'cans' || comp.category === 'iems') && comp.sound_signature) {
        // Apply equipment filter if set
        if (activeEquipment.length > 0) {
          if (activeEquipment.includes(comp.category)) {
            soundCounts[comp.sound_signature] = (soundCounts[comp.sound_signature] || 0) + 1
          }
        } else {
          soundCounts[comp.sound_signature] = (soundCounts[comp.sound_signature] || 0) + 1
        }
      }
    })

    const result = {
      sound: soundCounts,
      equipment: {
        cans: cansCount,
        iems: iemsCount,
        dacs: dacsCount,
        amps: ampsCount,
        combos: combosCount
      },
      budget: {
        requested: budget,
        allocation: budgetAllocation
      }
    }

    // Cache the result
    cache.set(cacheKey, {
      data: result,
      expires: Date.now() + CACHE_DURATION
    })

    // Clean up expired cache entries periodically
    if (Math.random() < 0.1) {
      const now = Date.now()
      for (const [key, value] of cache.entries()) {
        if (value.expires <= now) {
          cache.delete(key)
        }
      }
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error fetching filter counts:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch filter counts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
