import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { stack_id, user_gear_id, position } = body

    if (!stack_id || !user_gear_id) {
      return NextResponse.json({ error: 'Stack ID and gear ID are required' }, { status: 400 })
    }

    // Verify the stack belongs to the user
    const { data: stack, error: stackError } = await supabaseServer
      .from('user_stacks')
      .select('id')
      .eq('id', stack_id)
      .eq('user_id', session.user.id)
      .single()

    if (stackError || !stack) {
      return NextResponse.json({ error: 'Stack not found or unauthorized' }, { status: 404 })
    }

    // Verify the gear belongs to the user
    const { data: gear, error: gearError } = await supabaseServer
      .from('user_gear')
      .select('id')
      .eq('id', user_gear_id)
      .eq('user_id', session.user.id)
      .single()

    if (gearError || !gear) {
      return NextResponse.json({ error: 'Gear not found or unauthorized' }, { status: 404 })
    }

    // Calculate position if not provided
    let componentPosition = position
    if (componentPosition === undefined) {
      const { data: existingComponents } = await supabaseServer
        .from('stack_components')
        .select('position')
        .eq('stack_id', stack_id)
        .order('position', { ascending: false })
        .limit(1)

      componentPosition = existingComponents && existingComponents.length > 0
        ? existingComponents[0].position + 1
        : 0
    }

    // Check if gear is already in the stack
    const { data: existingComponent } = await supabaseServer
      .from('stack_components')
      .select('id')
      .eq('stack_id', stack_id)
      .eq('user_gear_id', user_gear_id)
      .single()

    if (existingComponent) {
      return NextResponse.json({ error: 'This gear is already in the stack' }, { status: 409 })
    }

    // Add component to stack
    const { data: newComponent, error } = await supabaseServer
      .from('stack_components')
      .insert({
        stack_id,
        user_gear_id,
        position: componentPosition
      })
      .select(`
        *,
        user_gear (
          *,
          components (*)
        )
      `)
      .single()

    if (error) {
      console.error('Error adding gear to stack:', error)
      return NextResponse.json({ error: 'Failed to add gear to stack' }, { status: 500 })
    }

    return NextResponse.json(newComponent, { status: 201 })
  } catch (error) {
    console.error('Error in POST /api/stacks/components:', error)
    return NextResponse.json(
      { error: 'Failed to add gear to stack' },
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
    const stack_id = url.searchParams.get('stack_id')
    const user_gear_id = url.searchParams.get('user_gear_id')
    const component_id = url.searchParams.get('component_id')

    if (!stack_id || (!user_gear_id && !component_id)) {
      return NextResponse.json({ error: 'Stack ID and either gear ID or component ID are required' }, { status: 400 })
    }

    // Verify the stack belongs to the user
    const { data: stack, error: stackError } = await supabaseServer
      .from('user_stacks')
      .select('id')
      .eq('id', stack_id)
      .eq('user_id', session.user.id)
      .single()

    if (stackError || !stack) {
      return NextResponse.json({ error: 'Stack not found or unauthorized' }, { status: 404 })
    }

    // Remove component from stack (supports both user_gear and direct component references)
    let query = supabaseServer
      .from('stack_components')
      .delete()
      .eq('stack_id', stack_id)

    if (user_gear_id) {
      query = query.eq('user_gear_id', user_gear_id)
    } else if (component_id) {
      query = query.eq('component_id', component_id)
    }

    const { error } = await query

    if (error) {
      console.error('Error removing item from stack:', error)
      return NextResponse.json({ error: 'Failed to remove item from stack' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/stacks/components:', error)
    return NextResponse.json(
      { error: 'Failed to remove item from stack' },
      { status: 500 }
    )
  }
}