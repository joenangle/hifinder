import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

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
}) {
  const equipStr = params.equipment?.sort().join('-') || 'none'
  const soundStr = params.soundSignature || 'none'
  const wantStr = params.wantRecommendationsFor || 'headphones'
  return `filter_counts_${params.budget}_${params.rangeMin}_${params.rangeMax}_${equipStr}_${soundStr}_${wantStr}`
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
      wantRecommendationsFor: wantRecsParam || ''
    })
    const cached = cache.get(cacheKey)

    if (cached && cached.expires > Date.now()) {
      return NextResponse.json(cached.data)
    }

    // Calculate budget allocation (same logic as recommendations API)
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

    // Calculate budget allocation
    const budgetAllocation: Record<string, { min: number, max: number }> = {}

    if (requestedComponents.length === 1) {
      const component = requestedComponents[0]
      const minBudget = budget <= 150 && ['dac', 'amp', 'combo'].includes(component)
        ? 5
        : Math.max(20, Math.round(budget * (1 - rangeMin / 100)))
      budgetAllocation[component] = {
        min: minBudget,
        max: Math.round(budget * (1 + rangeMax / 100))
      }
    } else if (requestedComponents.length > 0) {
      // Proportional allocation for multiple components
      const totalRatio = requestedComponents.reduce((sum, comp) => {
        return sum + (priceRatios[comp as keyof typeof priceRatios] || 0.25)
      }, 0)

      requestedComponents.forEach(component => {
        const ratio = priceRatios[component as keyof typeof priceRatios] || 0.25
        const componentBudget = Math.floor(budget * (ratio / totalRatio))

        const minBudget = budget <= 150 && ['dac', 'amp', 'combo'].includes(component)
          ? 5
          : Math.max(20, Math.round(componentBudget * (1 - rangeMin / 100)))

        budgetAllocation[component] = {
          min: minBudget,
          max: Math.round(componentBudget * (1 + rangeMax / 100))
        }
      })
    } else {
      // Default to headphones if no components selected
      budgetAllocation['headphones'] = {
        min: Math.max(20, Math.round(budget * (1 - rangeMin / 100))),
        max: Math.round(budget * (1 + rangeMax / 100))
      }
    }

    // Query for sound signature counts (headphones + IEMs only)
    const soundSignatures = ['neutral', 'warm', 'bright', 'fun']
    const soundCounts: Record<string, number> = {}

    // Only count sound signatures if headphones are wanted
    if (wantRecommendationsFor.headphones && budgetAllocation.headphones) {
      const { min: headphoneMin, max: headphoneMax } = budgetAllocation.headphones

      await Promise.all(
        soundSignatures.map(async (signature) => {
          let query = supabase
            .from('components')
            .select('id', { count: 'exact', head: true })
            .eq('sound_signature', signature)
            .gte('price_used_min', headphoneMin)
            .lte('price_used_max', headphoneMax)

          // Apply equipment filter if set
          if (activeEquipment.length > 0) {
            // Filter to only cans/iems that are in active equipment
            const relevantCategories = activeEquipment.filter(cat => ['cans', 'iems'].includes(cat))
            if (relevantCategories.length > 0) {
              query = query.in('category', relevantCategories)
            } else {
              // If active equipment has no cans/iems, count should be 0
              soundCounts[signature] = 0
              return
            }
          } else {
            query = query.in('category', ['cans', 'iems'])
          }

          const { count } = await query
          soundCounts[signature] = count || 0
        })
      )
    } else {
      // Set all counts to 0 if headphones not wanted
      soundSignatures.forEach(signature => {
        soundCounts[signature] = 0
      })
    }

    // Query for equipment type counts based on allocated budgets
    let cansCount = 0
    let iemsCount = 0
    let dacsCount = 0
    let ampsCount = 0
    let combosCount = 0

    // Headphones counts
    if (wantRecommendationsFor.headphones && budgetAllocation.headphones) {
      const { min: headphoneMin, max: headphoneMax } = budgetAllocation.headphones

      let cansQuery = supabase
        .from('components')
        .select('id', { count: 'exact', head: true })
        .eq('category', 'cans')
        .gte('price_used_min', headphoneMin)
        .lte('price_used_max', headphoneMax)

      if (activeSoundSignature) {
        cansQuery = cansQuery.eq('sound_signature', activeSoundSignature)
      }

      const cansResult = await cansQuery
      cansCount = cansResult.count || 0

      let iemsQuery = supabase
        .from('components')
        .select('id', { count: 'exact', head: true })
        .eq('category', 'iems')
        .gte('price_used_min', headphoneMin)
        .lte('price_used_max', headphoneMax)

      if (activeSoundSignature) {
        iemsQuery = iemsQuery.eq('sound_signature', activeSoundSignature)
      }

      const iemsResult = await iemsQuery
      iemsCount = iemsResult.count || 0
    }

    // DAC counts
    if (wantRecommendationsFor.dac && budgetAllocation.dac) {
      const { min: dacMin, max: dacMax } = budgetAllocation.dac
      const dacsResult = await supabase
        .from('components')
        .select('id', { count: 'exact', head: true })
        .eq('category', 'dac')
        .gte('price_used_min', dacMin)
        .lte('price_used_max', dacMax)

      dacsCount = dacsResult.count || 0
    }

    // Amp counts
    if (wantRecommendationsFor.amp && budgetAllocation.amp) {
      const { min: ampMin, max: ampMax } = budgetAllocation.amp
      const ampsResult = await supabase
        .from('components')
        .select('id', { count: 'exact', head: true })
        .eq('category', 'amp')
        .gte('price_used_min', ampMin)
        .lte('price_used_max', ampMax)

      ampsCount = ampsResult.count || 0
    }

    // Combo counts
    if (wantRecommendationsFor.combo && budgetAllocation.combo) {
      const { min: comboMin, max: comboMax } = budgetAllocation.combo
      const combosResult = await supabase
        .from('components')
        .select('id', { count: 'exact', head: true })
        .eq('category', 'dac_amp')
        .gte('price_used_min', comboMin)
        .lte('price_used_max', comboMax)

      combosCount = combosResult.count || 0
    }

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
