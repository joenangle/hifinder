import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const {
      platform,
      component_id,
      tracking_id,
      source,
      referrer_url
    } = body

    // Validate required fields
    if (!platform || !tracking_id || !source) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Get client info
    const user_agent = request.headers.get('user-agent') || 'Unknown'
    const forwarded_for = request.headers.get('x-forwarded-for')
    const ip_address = forwarded_for?.split(',')[0] || request.headers.get('x-real-ip') || null

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

  } catch (error: any) {
    console.error('Error in affiliate click tracking:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
