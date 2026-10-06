import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'

/** The signed-in user's alert matches, optionally filtered to one alert (?alert_id=). */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const alertId = new URL(request.url).searchParams.get('alert_id')

    let query = supabaseServer
      .from('alert_history')
      .select('*')
      .eq('user_id', session.user.id)
      .order('triggered_at', { ascending: false })

    if (alertId) {
      query = query.eq('alert_id', alertId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching alert history:', error)
      return NextResponse.json({ error: 'Failed to fetch alert history' }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (error) {
    console.error('Error fetching alert history:', error)
    return NextResponse.json({ error: 'Failed to fetch alert history' }, { status: 500 })
  }
}

/** Mark one alert match as viewed: body `{ id }`. */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await request.json()
    if (!id) {
      return NextResponse.json({ error: 'History ID is required' }, { status: 400 })
    }

    const { data, error } = await supabaseServer
      .from('alert_history')
      .update({ user_viewed: true, user_viewed_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select('id')

    if (error) {
      console.error('Error marking alert viewed:', error)
      return NextResponse.json({ error: 'Failed to update alert history' }, { status: 500 })
    }
    if (!data?.length) {
      return NextResponse.json({ error: 'Alert history entry not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error marking alert viewed:', error)
    return NextResponse.json({ error: 'Failed to update alert history' }, { status: 500 })
  }
}
