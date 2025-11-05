import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  try {
    // Protect endpoint - only allow joenangle@gmail.com
    const session = await getServerSession(authOptions)

    if (!session || session.user?.email !== 'joenangle@gmail.com') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access only' },
        { status: 401 }
      )
    }

    // Total listings count
    const { count: totalListings, error: totalError } = await supabaseServer
      .from('used_listings')
      .select('*', { count: 'exact', head: true })

    if (totalError) throw totalError

    // Available listings
    const { count: availableListings, error: availableError } = await supabaseServer
      .from('used_listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'available')

    if (availableError) throw availableError

    // Sold listings
    const { count: soldListings, error: soldError } = await supabaseServer
      .from('used_listings')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'sold')

    if (soldError) throw soldError

    // Bot-confirmed sales
    const { count: botConfirmedSales, error: botError } = await supabaseServer
      .from('used_listings')
      .select('*', { count: 'exact', head: true })
      .eq('avexchange_bot_confirmed', true)

    if (botError) throw botError

    // Recent listings (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const { count: recentListings, error: recentError } = await supabaseServer
      .from('used_listings')
      .select('*', { count: 'exact', head: true })
      .gte('date_posted', sevenDaysAgo)

    if (recentError) throw recentError

    // Listings by source
    const { data: bySource, error: sourceError } = await supabaseServer
      .from('used_listings')
      .select('source')

    if (sourceError) throw sourceError

    const sourceCounts = bySource?.reduce((acc, { source }) => {
      acc[source] = (acc[source] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Recent activity (last 20 listings)
    const { data: recentActivity, error: activityError } = await supabaseServer
      .from('used_listings')
      .select('id, title, price, status, date_posted, source, seller_username, avexchange_bot_confirmed, url')
      .order('date_posted', { ascending: false })
      .limit(20)

    if (activityError) throw activityError

    // Components with listings
    const { data: componentsWithListings, error: componentsError } = await supabaseServer
      .rpc('get_components_with_listing_counts')

    // If RPC doesn't exist, use fallback query
    let topComponents = []
    if (componentsError) {
      const { data: fallback, error: fallbackError } = await supabaseServer
        .from('used_listings')
        .select('component_id, components(brand, name)')
        .limit(1000)

      if (!fallbackError && fallback) {
        const counts = fallback.reduce((acc, listing) => {
          if (listing.component_id) {
            acc[listing.component_id] = (acc[listing.component_id] || 0) + 1
          }
          return acc
        }, {} as Record<string, number>)

        topComponents = Object.entries(counts)
          .map(([id, count]) => ({
            component_id: id,
            listing_count: count
          }))
          .sort((a, b) => b.listing_count - a.listing_count)
          .slice(0, 10)
      }
    } else {
      topComponents = componentsWithListings?.slice(0, 10) || []
    }

    return NextResponse.json({
      summary: {
        totalListings: totalListings || 0,
        availableListings: availableListings || 0,
        soldListings: soldListings || 0,
        botConfirmedSales: botConfirmedSales || 0,
        recentListings: recentListings || 0
      },
      bySource: sourceCounts || {},
      recentActivity: recentActivity || [],
      topComponents: topComponents || []
    })

  } catch (error) {
    console.error('Error fetching scraper stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch scraper stats' },
      { status: 500 }
    )
  }
}
