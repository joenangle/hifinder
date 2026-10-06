import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'
import { purposeIcons } from '@/lib/stacks'
import type { StackPurpose } from '@/types/gear'

function isStackPurpose(value: unknown): value is StackPurpose {
  return typeof value === 'string' && Object.hasOwn(purposeIcons, value)
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: stacks, error } = await supabaseServer
      .from('user_stacks')
      .select(`
        *,
        stack_components (
          id,
          position,
          user_gear_id,
          component_id,
          created_at,
          user_gear (
            *,
            components (
              id, name, brand, category, price_new, price_used_min, price_used_max,
              budget_tier, sound_signature, use_cases, impedance, needs_amp,
              amplification_difficulty, amazon_url, why_recommended, image_url,
              crin_tone, crin_tech, crin_rank, crin_value, crin_signature,
              asr_sinad, driver_type, fit
            )
          ),
          components!stack_components_component_id_fkey (
            id, name, brand, category, price_new, price_used_min, price_used_max,
            budget_tier, sound_signature, use_cases, impedance, needs_amp,
            amplification_difficulty, amazon_url, why_recommended, image_url,
            crin_tone, crin_tech, crin_rank, crin_value, crin_signature,
            asr_sinad, driver_type, fit
          )
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error fetching stacks:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json(stacks || [])
  } catch (error) {
    console.error('Error fetching stacks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stacks' },
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
    const { name, description, purpose } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Stack name is required' }, { status: 400 })
    }

    if (purpose != null && !isStackPurpose(purpose)) {
      return NextResponse.json({ error: 'Invalid stack purpose' }, { status: 400 })
    }

    const { data: newStack, error } = await supabaseServer
      .from('user_stacks')
      .insert({
        user_id: session.user.id,
        name: name.trim(),
        description: description?.trim() || null,
        ...(purpose != null && { purpose })
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating stack:', error)
      return NextResponse.json({ error: 'Failed to create stack' }, { status: 500 })
    }

    return NextResponse.json(newStack, { status: 201 })
  } catch (error) {
    console.error('Error creating stack:', error)
    return NextResponse.json(
      { error: 'Failed to create stack' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, name, description, purpose } = body

    if (!id) {
      return NextResponse.json({ error: 'Stack ID is required' }, { status: 400 })
    }

    const updates: { name?: string; description?: string | null; purpose?: StackPurpose } = {}

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        return NextResponse.json({ error: 'Stack name is required' }, { status: 400 })
      }
      updates.name = name.trim()
    }
    if (description !== undefined) {
      updates.description = typeof description === 'string' && description.trim() ? description.trim() : null
    }
    if (purpose !== undefined) {
      if (!isStackPurpose(purpose)) {
        return NextResponse.json({ error: 'Invalid stack purpose' }, { status: 400 })
      }
      updates.purpose = purpose
    }

    // Scoping by user_id makes another user's stack indistinguishable from a missing one
    const { data: stack, error } = await supabaseServer
      .from('user_stacks')
      .update(updates)
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select()
      .single()

    if (error || !stack) {
      return NextResponse.json({ error: 'Stack not found' }, { status: 404 })
    }

    return NextResponse.json(stack)
  } catch (error) {
    console.error('Error updating stack:', error)
    return NextResponse.json(
      { error: 'Failed to update stack' },
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

    const id = new URL(request.url).searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Stack ID is required' }, { status: 400 })
    }

    // stack_components rows cascade via stack_components_stack_id_fkey
    const { data: deleted, error } = await supabaseServer
      .from('user_stacks')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select('id')

    if (error) {
      console.error('Error deleting stack:', error)
      return NextResponse.json({ error: 'Failed to delete stack' }, { status: 500 })
    }

    if (!deleted?.length) {
      return NextResponse.json({ error: 'Stack not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting stack:', error)
    return NextResponse.json(
      { error: 'Failed to delete stack' },
      { status: 500 }
    )
  }
}
