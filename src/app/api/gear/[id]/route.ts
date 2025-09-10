import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    
    // Ensure the gear item belongs to the user
    const { data: existingItem, error: checkError } = await supabaseServer
      .from('user_gear')
      .select('user_id')
      .eq('id', params.id)
      .single()
    
    if (checkError || !existingItem) {
      return NextResponse.json({ error: 'Gear item not found' }, { status: 404 })
    }
    
    if (existingItem.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { data: updatedItem, error } = await supabaseServer
      .from('user_gear')
      .update(body)
      .eq('id', params.id)
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
      console.error('Error updating gear item:', error)
      return NextResponse.json({ error: 'Failed to update gear item' }, { status: 500 })
    }
    
    return NextResponse.json(updatedItem)
  } catch (error) {
    console.error('Error updating gear:', error)
    return NextResponse.json(
      { error: 'Failed to update gear item' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    // Ensure the gear item belongs to the user
    const { data: existingItem, error: checkError } = await supabaseServer
      .from('user_gear')
      .select('user_id')
      .eq('id', params.id)
      .single()
    
    if (checkError || !existingItem) {
      return NextResponse.json({ error: 'Gear item not found' }, { status: 404 })
    }
    
    if (existingItem.user_id !== session.user.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Set is_active to false instead of hard delete
    const { error } = await supabaseServer
      .from('user_gear')
      .update({ is_active: false })
      .eq('id', params.id)
    
    if (error) {
      console.error('Error removing gear item:', error)
      return NextResponse.json({ error: 'Failed to remove gear item' }, { status: 500 })
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing gear:', error)
    return NextResponse.json(
      { error: 'Failed to remove gear item' },
      { status: 500 }
    )
  }
}