import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

// Public, unauthenticated endpoint: only accept values our own CTAs send, and
// bound every free-text field so it can't be used to store arbitrary data.
const PLATFORMS = ['ebay', 'amazon'] as const
const SOURCES = ['recommendations', 'component_detail', 'used_listings'] as const
const MAX_TRACKING_ID = 128
const MAX_REFERRER = 2048
const MAX_USER_AGENT = 512
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const isOneOf = <T extends string>(values: readonly T[], v: unknown): v is T =>
  typeof v === 'string' && (values as readonly string[]).includes(v)

const isBoundedString = (v: unknown, max: number): v is string =>
  typeof v === 'string' && v.length > 0 && v.length <= max

export async function POST(request: NextRequest) {
  try {
    let body: Record<string, unknown>
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const { platform, component_id, tracking_id, source, referrer_url } = body

    if (
      !isOneOf(PLATFORMS, platform) ||
      !isOneOf(SOURCES, source) ||
      !isBoundedString(tracking_id, MAX_TRACKING_ID) ||
      (component_id != null && !(typeof component_id === 'string' && UUID_RE.test(component_id))) ||
      (referrer_url != null && !isBoundedString(referrer_url, MAX_REFERRER))
    ) {
      return NextResponse.json({ error: 'Invalid click payload' }, { status: 400 })
    }

    // Get client info
    const user_agent = (request.headers.get('user-agent') || 'Unknown').slice(0, MAX_USER_AGENT)
    const forwarded_for = request.headers.get('x-forwarded-for')
    const ip_address = forwarded_for?.split(',')[0].trim() || request.headers.get('x-real-ip') || null

    // Insert click tracking
    const { data, error } = await supabaseServer
      .from('affiliate_clicks')
      .insert({
        platform,
        component_id: component_id || null,
        tracking_id,
        source,
        referrer_url: referrer_url || null,
        user_agent,
        ip_address,
        clicked_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Error tracking affiliate click:', error)
      return NextResponse.json(
        { error: 'Failed to track click' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true, click_id: data.id })

  } catch (error) {
    console.error('Error in affiliate click tracking:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
