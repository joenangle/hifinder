import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * GET /api/user/dashboard/stats
 * Returns aggregated stats for the dashboard overview tab
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // Fetch gear collection count, value, and component used prices for depreciation
    const { data: gear, error: gearError } = await supabaseServer
      .from('user_gear')
      .select('purchase_price, components(price_used_min, price_used_max)')
      .eq('user_id', userId)
      .eq('is_active', true)

    if (gearError) throw gearError

    const collectionCount = gear?.length || 0
    const totalInvested = gear?.reduce((sum, item) => sum + (item.purchase_price || 0), 0) || 0

    // Fetch wishlist count
    const { count: wishlistCount, error: wishlistError } = await supabaseServer
      .from('wishlists')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)

    if (wishlistError) throw wishlistError

    // Fetch active alerts count
    const { count: activeAlertsCount, error: alertsError } = await supabaseServer
      .from('price_alerts')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true)

    if (alertsError) throw alertsError

    // Fetch unread alert matches count
    const { count: unreadMatchesCount, error: unreadError } = await supabaseServer
      .from('alert_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('user_viewed', false)

    if (unreadError) throw unreadError

    // Calculate current market value from used price data
    const currentValue = (gear || []).reduce((sum, item) => {
      // Supabase returns single-object joins as an object (not array) for belongsTo relations
      const comp = item.components as unknown as { price_used_min: number | null; price_used_max: number | null } | null
      if (comp?.price_used_min && comp?.price_used_max) {
        return sum + (comp.price_used_min + comp.price_used_max) / 2
      }
      return sum + (item.purchase_price || 0)
    }, 0)

    const depreciation = totalInvested > 0 ? totalInvested - currentValue : 0

    return NextResponse.json({
      collection: {
        count: collectionCount,
        totalInvested,
        totalValue: currentValue,
        depreciation
      },
      wishlist: {
        count: wishlistCount || 0
      },
      alerts: {
        activeCount: activeAlertsCount || 0,
        unreadMatches: unreadMatchesCount || 0
      }
    })

  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard stats' },
      { status: 500 }
    )
  }
}
