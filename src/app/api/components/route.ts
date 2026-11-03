import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import {
  HEADPHONE_SYSTEM_CATEGORIES,
  isCategoryIn,
  normalizeCategory,
} from '@/lib/component-categories'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const budget_tier = searchParams.get('budget_tier')
    const sound_signature = searchParams.get('sound_signature')
    const use_cases = searchParams.get('use_cases')
    const headphone_type = searchParams.get('headphone_type')
    // Stereo categories (and unknown ones) are ignored: this feeds headphone flows.
    const safeCategory = isCategoryIn(category, HEADPHONE_SYSTEM_CATEGORIES)
      ? normalizeCategory(category)
      : null
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : undefined

    const ids = searchParams.get('ids')
    const brand = searchParams.get('brand')
    const brands_only = searchParams.get('brands_only') === 'true'
    const models_only = searchParams.get('models_only') === 'true'

    // Fetch specific components by IDs (used by curated systems + share URLs)
    if (ids) {
      const idArray = ids.split(',').filter(Boolean)
      const { data, error } = await supabaseServer
        .from('components')
        .select('*')
        .in('id', idArray)

      if (error) {
        console.error('Database error:', error)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      return NextResponse.json(data || [])
    }

    if (brands_only) {
      let brandsQuery = supabaseServer
        .from('components')
        .select('brand')
        
      if (category === 'headphones_and_iems') {
        brandsQuery = brandsQuery.in('category', ['headphones', 'iems'])
      } else if (safeCategory) {
        brandsQuery = brandsQuery.eq('category', safeCategory)
      } else {
        brandsQuery = brandsQuery.in('category', HEADPHONE_SYSTEM_CATEGORIES)
      }
      
      const { data: components, error } = await brandsQuery.order('brand')
      
      if (error) {
        console.error('Database error:', error)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      // Return unique brands
      const uniqueBrands = [...new Set(components?.map(item => item.brand))].filter(Boolean)
      return NextResponse.json(uniqueBrands)
    }

    if (models_only && brand) {
      let modelsQuery = supabaseServer
        .from('components')
        .select('name')
        .eq('brand', brand)
        
      if (category === 'headphones_and_iems') {
        modelsQuery = modelsQuery.in('category', ['headphones', 'iems'])
      } else {
        modelsQuery = modelsQuery.in('category', HEADPHONE_SYSTEM_CATEGORIES)
      }
      
      const { data: components, error } = await modelsQuery.order('name')
      
      if (error) {
        console.error('Database error:', error)
        return NextResponse.json({ error: 'Database error' }, { status: 500 })
      }

      const models = components?.map(item => item.name).filter(Boolean) || []
      return NextResponse.json(models)
    }

    // Regular component queries
    let query = supabaseServer
      .from('components')
      .select('*')

    // Apply filters
    if (safeCategory) {
      query = query.eq('category', safeCategory)
    } else {
      query = query.in('category', HEADPHONE_SYSTEM_CATEGORIES)
    }

    if (brand) {
      query = query.eq('brand', brand)
    }

    if (budget_tier) {
      query = query.eq('budget_tier', budget_tier)
    }

    if (sound_signature) {
      query = query.eq('sound_signature', sound_signature)
    }

    if (use_cases) {
      // Handle array-type filtering for use_cases
      query = query.contains('use_cases', [use_cases])
    }

    if (headphone_type && (category === 'headphones' || category === 'iems')) {
      // Add headphone type filtering if needed
      query = query.ilike('name', `%${headphone_type}%`)
    }

    if (limit) {
      query = query.limit(limit)
    }

    // Default ordering
    const { data: components, error } = await query.order('name')

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json(components || [])
  } catch (error) {
    console.error('Error fetching components:', error)
    return NextResponse.json(
      { error: 'Failed to fetch components' },
      { status: 500 }
    )
  }
}