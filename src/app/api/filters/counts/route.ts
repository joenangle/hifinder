import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Simple in-memory cache for filter counts
const cache = new Map<string, { data: unknown, expires: number }>()
const CACHE_DURATION = 10 * 60 * 1000 // 10 minutes (longer since this changes less frequently)

function getCacheKey(params: {
  budget: number
  rangeMin: number
  rangeMax: number
}) {
  return `filter_counts_${params.budget}_${params.rangeMin}_${params.rangeMax}`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse parameters
    const budget = parseInt(searchParams.get('budget') || '300')
    const rangeMin = parseInt(searchParams.get('rangeMin') || '20')
    const rangeMax = parseInt(searchParams.get('rangeMax') || '10')

    // Calculate actual budget range
    const minBudget = Math.max(20, Math.round(budget * (1 - rangeMin / 100)))
    const maxBudget = Math.round(budget * (1 + rangeMax / 100))

    // Check cache first
    const cacheKey = getCacheKey({ budget, rangeMin, rangeMax })
    const cached = cache.get(cacheKey)

    if (cached && cached.expires > Date.now()) {
      return NextResponse.json(cached.data)
    }

    // Query for sound signature counts (headphones + IEMs only)
    const soundSignatures = ['neutral', 'warm', 'bright', 'fun']
    const soundCounts: Record<string, number> = {}

    await Promise.all(
      soundSignatures.map(async (signature) => {
        const { count } = await supabase
          .from('components')
          .select('id', { count: 'exact', head: true })
          .in('category', ['cans', 'iems'])
          .eq('sound_signature', signature)
          .gte('price_used_min', minBudget)
          .lte('price_used_max', maxBudget)

        soundCounts[signature] = count || 0
      })
    )

    // Query for equipment type counts
    const { count: cansCount } = await supabase
      .from('components')
      .select('id', { count: 'exact', head: true })
      .eq('category', 'cans')
      .gte('price_used_min', minBudget)
      .lte('price_used_max', maxBudget)

    const { count: iemsCount } = await supabase
      .from('components')
      .select('id', { count: 'exact', head: true })
      .eq('category', 'iems')
      .gte('price_used_min', minBudget)
      .lte('price_used_max', maxBudget)

    const { count: dacsCount } = await supabase
      .from('components')
      .select('id', { count: 'exact', head: true })
      .eq('category', 'dac')
      .gte('price_used_min', minBudget)
      .lte('price_used_max', maxBudget)

    const { count: ampsCount } = await supabase
      .from('components')
      .select('id', { count: 'exact', head: true })
      .eq('category', 'amp')
      .gte('price_used_min', minBudget)
      .lte('price_used_max', maxBudget)

    const { count: combosCount } = await supabase
      .from('components')
      .select('id', { count: 'exact', head: true })
      .eq('category', 'dac_amp')
      .gte('price_used_min', minBudget)
      .lte('price_used_max', maxBudget)

    const result = {
      sound: soundCounts,
      equipment: {
        cans: cansCount || 0,
        iems: iemsCount || 0,
        dacs: dacsCount || 0,
        amps: ampsCount || 0,
        combos: combosCount || 0
      },
      budget: {
        requested: budget,
        min: minBudget,
        max: maxBudget
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
