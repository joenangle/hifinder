import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'
import { resolveUserPreferences } from '@/lib/user-preferences'

/**
 * Read / update the current user's notification preferences.
 * Service-role access gated by the authenticated NextAuth session.
 */

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseServer
    .from('user_preferences')
    .select('email_alerts_enabled')
    .eq('user_id', session.user.id)
    .maybeSingle()

  if (error) {
    console.error('Error loading preferences:', error)
    return NextResponse.json({ error: 'Failed to load preferences' }, { status: 500 })
  }

  return NextResponse.json(resolveUserPreferences(data))
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  if (typeof body.emailAlertsEnabled !== 'boolean') {
    return NextResponse.json({ error: 'emailAlertsEnabled (boolean) is required' }, { status: 400 })
  }

  const { error } = await supabaseServer.from('user_preferences').upsert(
    {
      user_id: session.user.id,
      email_alerts_enabled: body.emailAlertsEnabled,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (error) {
    console.error('Error saving preferences:', error)
    return NextResponse.json({ error: 'Failed to save preferences' }, { status: 500 })
  }

  return NextResponse.json(resolveUserPreferences({ email_alerts_enabled: body.emailAlertsEnabled }))
}
