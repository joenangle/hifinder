import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// Simple stats cache to reduce database load
const cache = new Map<string, { data: unknown, expires: number }>()
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

export async function GET() {
  try {
    const cacheKey = 'site_stats'
    const cached = cache.get(cacheKey)

    if (cached && cached.expires > Date.now()) {
      return NextResponse.json(cached.data)
    }

    const supabase = supabaseServer

    // Get component count
    const { count: componentCount, error: componentError } = await supabase
      .from('components')
      .select('*', { count: 'exact', head: true })

    if (componentError) {
      throw componentError
    }

    // Get active listings count (if table exists)
    let listingsCount = 0
    try {
      const { count, error } = await supabase
        .from('used_listings')
        .select('*', { count: 'exact', head: true })

      if (!error) {
        listingsCount = count || 0
      }
    } catch (e) {
      // used_listings table might not exist yet
      console.warn('used_listings table not accessible:', e)
    }

    const stats = {
      components: componentCount || 0,
      listings: listingsCount,
      budgetRange: {
        min: 20,
        max: 10000
      },
      lastUpdated: new Date().toISOString()
    }

    // Cache the result
    cache.set(cacheKey, {
      data: stats,
      expires: Date.now() + CACHE_DURATION
    })

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching site stats:', error)

    // Return fallback stats on error
    return NextResponse.json({
      components: 550,
      listings: 0,
      budgetRange: {
        min: 20,
        max: 10000
      },
      lastUpdated: new Date().toISOString()
    })
  }
}