import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

const COMPLEMENTARY_CATEGORIES: Record<string, string[]> = {
  cans: ['dacs', 'amps', 'combo'],
  iems: ['dacs', 'combo'],
  dacs: ['amps', 'cans', 'iems'],
  amps: ['dacs', 'cans'],
  combo: ['cans', 'iems'],
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const componentId = resolvedParams.id

    // Try the RPC function first (stack-based pairings)
    try {
      const { data: rpcData, error: rpcError } = await supabaseServer
        .rpc('get_component_pairings', {
          target_component_id: componentId,
          result_limit: 5,
        })

      if (!rpcError && rpcData && rpcData.length >= 3) {
        return NextResponse.json({
          pairings: rpcData.map((p: { component_id: number; name: string; brand: string; category: string; price_new: number; price_used_min: number; price_used_max: number; pair_count: number }) => ({
            component_id: p.component_id,
            name: p.name,
            brand: p.brand,
            category: p.category,
            price_new: p.price_new,
            price_used_min: p.price_used_min,
            price_used_max: p.price_used_max,
          })),
          source: 'stacks',
        }, {
          headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' }
        })
      }
    } catch {
      // RPC function may not exist yet — fall through to fallback
    }

    // Fallback: suggest complementary components in a similar price range
    const { data: component, error: componentError } = await supabaseServer
      .from('components')
      .select('category, price_new')
      .eq('id', componentId)
      .single()

    if (componentError || !component) {
      return NextResponse.json({ pairings: [], source: 'suggested' })
    }

    const complementary = COMPLEMENTARY_CATEGORIES[component.category]
    if (!complementary || complementary.length === 0) {
      return NextResponse.json({ pairings: [], source: 'suggested' })
    }

    let query = supabaseServer
      .from('components')
      .select('id, name, brand, category, price_new, price_used_min, price_used_max')
      .in('category', complementary)
      .neq('id', componentId)
      .order('crin_rank', { ascending: true, nullsFirst: false })
      .limit(5)

    // Apply price range filter if the component has a price
    if (component.price_new) {
      const priceLow = component.price_new * 0.3
      const priceHigh = component.price_new * 3
      query = query.gte('price_new', priceLow).lte('price_new', priceHigh)
    }

    const { data: suggestions, error: suggestionsError } = await query

    if (suggestionsError) {
      console.error('Error fetching suggested pairings:', suggestionsError)
      return NextResponse.json({ pairings: [], source: 'suggested' })
    }

    return NextResponse.json({
      pairings: (suggestions || []).map(s => ({
        component_id: s.id,
        name: s.name,
        brand: s.brand,
        category: s.category,
        price_new: s.price_new,
        price_used_min: s.price_used_min,
        price_used_max: s.price_used_max,
      })),
      source: 'suggested',
    }, {
      headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=600' }
    })
  } catch (error) {
    console.error('Pairings API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
