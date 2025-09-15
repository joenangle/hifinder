import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Simple in-memory cache for count data
const cache = new Map<string, { data: unknown, expires: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

function getCacheKey(params: {
  budget: number
  rangeMin: number
  rangeMax: number
  headphoneType?: string
  soundSignature?: string
}) {
  return `count_${params.budget}_${params.rangeMin}_${params.rangeMax}_${params.headphoneType || 'all'}_${params.soundSignature || 'all'}`
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)

    // Parse parameters
    const budget = parseInt(searchParams.get('budget') || '300')
    const rangeMin = parseInt(searchParams.get('rangeMin') || '20')
    const rangeMax = parseInt(searchParams.get('rangeMax') || '10')
    const headphoneType = searchParams.get('headphoneType') || 'both'
    const soundSignature = searchParams.get('sound') || 'any'

    // Calculate actual budget range
    const minBudget = Math.max(20, Math.round(budget * (1 - rangeMin / 100)))
    const maxBudget = Math.round(budget * (1 + rangeMax / 100))

    // Check cache first
    const cacheKey = getCacheKey({ budget, rangeMin, rangeMax, headphoneType, soundSignature })
    const cached = cache.get(cacheKey)

    if (cached && cached.expires > Date.now()) {
      return NextResponse.json(cached.data)
    }

    // Build base query
    let headphonesQuery = supabase
      .from('components')
      .select('id', { count: 'exact', head: true })
      .gte('price_used_min', minBudget)
      .lte('price_used_max', maxBudget)

    const dacsQuery = supabase
      .from('components')
      .select('id', { count: 'exact', head: true })
      .eq('category', 'dacs')
      .gte('price_used_min', minBudget)
      .lte('price_used_max', maxBudget)

    const ampsQuery = supabase
      .from('components')
      .select('id', { count: 'exact', head: true })
      .eq('category', 'amps')
      .gte('price_used_min', minBudget)
      .lte('price_used_max', maxBudget)

    const combosQuery = supabase
      .from('components')
      .select('id', { count: 'exact', head: true })
      .eq('category', 'combo')
      .gte('price_used_min', minBudget)
      .lte('price_used_max', maxBudget)

    // Apply headphone type filter
    if (headphoneType === 'cans') {
      headphonesQuery = headphonesQuery.eq('category', 'headphones')
    } else if (headphoneType === 'iems') {
      headphonesQuery = headphonesQuery.eq('category', 'iems')
    } else {
      headphonesQuery = headphonesQuery.in('category', ['headphones', 'iems'])
    }

    // Apply sound signature filter
    if (soundSignature && soundSignature !== 'any') {
      headphonesQuery = headphonesQuery.eq('sound_signature', soundSignature)
    }

    // Execute all queries in parallel
    const [headphonesResult, dacsResult, ampsResult, combosResult] = await Promise.all([
      headphonesQuery,
      dacsQuery,
      ampsQuery,
      combosQuery
    ])

    // Check for errors
    if (headphonesResult.error) throw headphonesResult.error
    if (dacsResult.error) throw dacsResult.error
    if (ampsResult.error) throw ampsResult.error
    if (combosResult.error) throw combosResult.error

    const result = {
      headphones: headphonesResult.count || 0,
      dacs: dacsResult.count || 0,
      amps: ampsResult.count || 0,
      combos: combosResult.count || 0,
      total: (headphonesResult.count || 0) + (dacsResult.count || 0) + (ampsResult.count || 0) + (combosResult.count || 0),
      budget: {
        requested: budget,
        min: minBudget,
        max: maxBudget,
        range: `${rangeMin}%/+${rangeMax}%`
      }
    }

    // Cache the result
    cache.set(cacheKey, {
      data: result,
      expires: Date.now() + CACHE_DURATION
    })

    // Clean up expired cache entries periodically
    if (Math.random() < 0.1) { // 10% chance
      const now = Date.now()
      for (const [key, value] of cache.entries()) {
        if (value.expires <= now) {
          cache.delete(key)
        }
      }
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error fetching component counts:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch component counts',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}