import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: gear, error } = await supabaseServer
      .from('user_gear')
      .select(`
        *,
        components (
          id, name, brand, category, price_new, price_used_min, price_used_max,
          budget_tier, sound_signature, use_cases, impedance, needs_amp,
          amazon_url, why_recommended, image_url
        )
      `)
      .eq('user_id', session.user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
    
    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
    return NextResponse.json(gear || [])
  } catch (error) {
    console.error('Error fetching gear:', error)
    return NextResponse.json(
      { error: 'Failed to fetch gear' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { data: newItem, error } = await supabaseServer
      .from('user_gear')
      .insert({
        ...body,
        user_id: session.user.id,
        is_active: true,
        is_loaned: false
      })
      .select(`
        *,
        components (
          id, name, brand, category, price_new, price_used_min, price_used_max,
          budget_tier, sound_signature, use_cases, impedance, needs_amp,
          amazon_url, why_recommended, image_url
        )
      `)
      .single()
    
    if (error) {
      console.error('Error adding gear item:', error)
      return NextResponse.json({ error: 'Failed to add gear item' }, { status: 500 })
    }
    
    return NextResponse.json(newItem, { status: 201 })
  } catch (error) {
    console.error('Error adding gear:', error)
    return NextResponse.json(
      { error: 'Failed to add gear item' },
      { status: 500 }
    )
  }
}