import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * Milestone counts and recent activity for the signed-in user's dashboard.
 *
 * User tables are RLS-locked to the browser (NextAuth sessions carry no
 * Supabase JWT, so auth.uid() is always null), so dashboard widgets must read
 * them through a session-scoped route like this one.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    const [gear, wishlist, alerts, stacks, alertHistory] = await Promise.all([
      supabaseServer
        .from('user_gear')
        .select('id, created_at, components(brand, name, category)', { count: 'exact' })
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5),
      supabaseServer
        .from('wishlists')
        .select('id, created_at, components(brand, name)', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5),
      supabaseServer
        .from('price_alerts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId),
      supabaseServer
        .from('user_stacks')
        .select('id, name, created_at', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3),
      supabaseServer
        .from('alert_history')
        .select('id, triggered_at, listing_title, listing_price, user_viewed')
        .eq('user_id', userId)
        .order('triggered_at', { ascending: false })
        .limit(5),
    ])

    const failed = [gear, wishlist, alerts, stacks, alertHistory].find(res => res.error)
    if (failed) {
      console.error('Error fetching user activity:', failed.error)
      return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
    }

    return NextResponse.json({
      counts: {
        gear: gear.count ?? 0,
        wishlist: wishlist.count ?? 0,
        alerts: alerts.count ?? 0,
        stacks: stacks.count ?? 0,
      },
      recent: {
        gear: gear.data ?? [],
        wishlist: wishlist.data ?? [],
        stacks: stacks.data ?? [],
        alertHistory: alertHistory.data ?? [],
      },
    })
  } catch (error) {
    console.error('Error fetching user activity:', error)
    return NextResponse.json({ error: 'Failed to fetch activity' }, { status: 500 })
  }
}
