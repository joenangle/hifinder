import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const component_id = searchParams.get('component_id')
    const component_ids = searchParams.get('component_ids') // Comma-separated list
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50

    let query = supabaseServer
      .from('used_listings')
      .select('*')
      .eq('is_active', true)

    // Filter out sample/demo listings in production
    if (process.env.NODE_ENV === 'production') {
      query = query.not('url', 'ilike', '%sample%').not('url', 'ilike', '%demo%')
    }

    // Filter by component ID(s)
    if (component_id) {
      query = query.eq('component_id', component_id)
    } else if (component_ids) {
      const idsArray = component_ids.split(',').map(id => id.trim())
      query = query.in('component_id', idsArray)
    }

    query = query
      .order('date_posted', { ascending: false })
      .limit(limit)

    const { data: listings, error } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Group by component_id if multiple were requested
    if (component_ids && listings) {
      type ListingType = typeof listings[number]
      const grouped = listings.reduce((acc, listing) => {
        const componentId = listing.component_id
        if (!acc[componentId]) {
          acc[componentId] = []
        }
        acc[componentId].push(listing)
        return acc
      }, {} as Record<string, ListingType[]>)
      
      return NextResponse.json(grouped)
    }

    return NextResponse.json(listings || [])
  } catch (error) {
    console.error('Error fetching used listings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch used listings' },
      { status: 500 }
    )
  }
}