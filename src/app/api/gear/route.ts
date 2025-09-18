import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const showAll = url.searchParams.get('all') === 'true'
    const stackId = url.searchParams.get('stack_id')

    let query = supabaseServer
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

    // If stack_id provided, get gear for that specific stack
    if (stackId) {
      // First get the gear IDs for this stack
      const { data: stackComponents, error: stackError } = await supabaseServer
        .from('stack_components')
        .select('user_gear_id')
        .eq('stack_id', stackId)

      if (stackError) {
        console.error('Error fetching stack components:', stackError)
        return NextResponse.json({ error: 'Failed to fetch stack gear' }, { status: 500 })
      }

      const gearIds = stackComponents?.map(sc => sc.user_gear_id) || []
      if (gearIds.length > 0) {
        query = query.in('id', gearIds)
      } else {
        // Empty stack - return empty array
        return NextResponse.json([])
      }
    } else if (!showAll) {
      // Default behavior - only show active gear
      query = query.eq('is_active', true)
    }
    // If showAll=true, don't filter by is_active (shows all gear)

    query = query.order('created_at', { ascending: false })

    const { data: gear, error } = await query
    
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

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const gearId = url.searchParams.get('id')

    if (!gearId) {
      return NextResponse.json({ error: 'Gear ID is required' }, { status: 400 })
    }

    const body = await request.json()

    // Verify the gear belongs to the user
    const { data: existingGear, error: fetchError } = await supabaseServer
      .from('user_gear')
      .select('id')
      .eq('id', gearId)
      .eq('user_id', session.user.id)
      .single()

    if (fetchError || !existingGear) {
      return NextResponse.json({ error: 'Gear not found or unauthorized' }, { status: 404 })
    }

    const { data: updatedItem, error } = await supabaseServer
      .from('user_gear')
      .update(body)
      .eq('id', gearId)
      .eq('user_id', session.user.id)
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

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const gearId = url.searchParams.get('id')

    if (!gearId) {
      return NextResponse.json({ error: 'Gear ID is required' }, { status: 400 })
    }

    // Verify the gear belongs to the user and delete it
    const { error } = await supabaseServer
      .from('user_gear')
      .delete()
      .eq('id', gearId)
      .eq('user_id', session.user.id)

    if (error) {
      console.error('Error deleting gear item:', error)
      return NextResponse.json({ error: 'Failed to delete gear item' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting gear:', error)
    return NextResponse.json(
      { error: 'Failed to delete gear item' },
      { status: 500 }
    )
  }
}