import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const component_id = searchParams.get('component_id')
    const component_ids = searchParams.get('component_ids') // Comma-separated list
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
    const page = searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1
    const source = searchParams.get('source') // Filter by source
    const sort = searchParams.get('sort') || 'date_desc' // date_desc, date_asc, price_asc, price_desc
    const minPrice = searchParams.get('min_price') ? parseFloat(searchParams.get('min_price')!) : null
    const maxPrice = searchParams.get('max_price') ? parseFloat(searchParams.get('max_price')!) : null
    const conditions = searchParams.get('conditions') // Comma-separated conditions
    const categories = searchParams.get('categories') // Comma-separated categories (cans, iems, dac, amp, dac_amp)
    const search = searchParams.get('search') // Search query for brand/model/title
    const status = searchParams.get('status') // Filter by status (available, sold, expired)

    // Calculate offset for pagination
    const offset = (page - 1) * limit

    let query = supabaseServer
      .from('used_listings')
      .select(`
        *,
        component:components(*)
      `, { count: 'exact' })
      // Filter out sample/demo listings in SQL (performance optimization)
      .not('url', 'ilike', '%sample%')
      .not('url', 'ilike', '%demo%')
      .not('title', 'ilike', '%sample%')
      .not('title', 'ilike', '%demo%')

    // Filter by status (default to 'available' if not specified)
    if (status && status !== 'all') {
      query = query.eq('status', status)
    } else if (!status) {
      query = query.eq('status', 'available')
    }
    // When status='all', no filter applied — returns all statuses

    // Filter by component ID(s)
    if (component_id) {
      query = query.eq('component_id', component_id)
    } else if (component_ids) {
      const idsArray = component_ids.split(',').map(id => id.trim())
      query = query.in('component_id', idsArray)
    }

    // Filter by source
    if (source && source !== 'all') {
      query = query.eq('source', source)
    }

    // Filter by price range
    if (minPrice !== null) {
      query = query.gte('price', minPrice)
    }
    if (maxPrice !== null) {
      query = query.lte('price', maxPrice)
    }

    // Filter by conditions
    if (conditions) {
      const conditionsArray = conditions.split(',').map(c => c.trim())
      query = query.in('condition', conditionsArray)
    }

    // Filter by category (via joined component table)
    if (categories) {
      const categoriesArray = categories.split(',').map(c => c.trim())
      query = query.in('component.category', categoriesArray)
    }

    // Search by title (server-side text search)
    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    // Apply sorting
    switch (sort) {
      case 'date_asc':
        query = query.order('date_posted', { ascending: true })
        break
      case 'price_asc':
        query = query.order('price', { ascending: true })
        break
      case 'price_desc':
        query = query.order('price', { ascending: false })
        break
      case 'date_desc':
      default:
        query = query.order('date_posted', { ascending: false })
        break
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: listings, error, count } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    // Listings are already filtered by SQL (sample/demo excluded)
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

      // Apply smart prioritization: Reddit first (time-sensitive), then Reverb (persistent)
      // Show ALL listings, just prioritize by source order
      const prioritized = Object.keys(grouped).reduce((acc, componentId) => {
        const componentListings = grouped[componentId]

        // Separate by source
        const redditListings = componentListings
          .filter((l: ListingType) => l.source === 'reddit_avexchange')

        const reverbListings = componentListings
          .filter((l: ListingType) => l.source === 'reverb')

        const otherListings = componentListings
          .filter((l: ListingType) => l.source !== 'reddit_avexchange' && l.source !== 'reverb')

        // Combine: Reddit first (urgent), then Reverb, then others
        acc[componentId] = [...redditListings, ...reverbListings, ...otherListings]

        return acc
      }, {} as Record<string, ListingType[]>)

      return NextResponse.json({
        listings: prioritized,
        total: listings.length,
        page,
        per_page: limit,
        total_pages: Math.ceil(listings.length / limit)
      })
    }

    return NextResponse.json({
      listings: listings || [],
      total: count || 0,
      page,
      per_page: limit,
      total_pages: Math.ceil((count || 0) / limit)
    })
  } catch (error) {
    console.error('Error fetching used listings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch used listings' },
      { status: 500 }
    )
  }
}