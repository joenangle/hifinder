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
    const { name, description } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Stack name is required' }, { status: 400 })
    }

    const { data: newStack, error } = await supabaseServer
      .from('user_stacks')
      .insert({
        user_id: session.user.id,
        name: name.trim(),
        description: description?.trim() || null
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