import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'
import { parseSystemProfile } from '@/lib/stereo/specs'
import type { Json } from '@/types/supabase'

const MAX_NAME_LENGTH = 200

// Only stereo stacks are ever visible through this route; headphone stacks
// stay behind /api/stacks.
const STEREO_PURPOSE = 'stereo'

const NAME_ERROR = `System name is required (max ${MAX_NAME_LENGTH} characters)`

/** Trimmed name, or null when missing, blank, not a string, or too long. */
function cleanName(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const name = value.trim()
  return name && name.length <= MAX_NAME_LENGTH ? name : null
}

function profileJson(input: unknown): Json {
  return parseSystemProfile(input) as unknown as Json
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: systems, error } = await supabaseServer
      .from('user_stacks')
      .select(`
        *,
        stack_components (
          id, stack_id, position, role, component_id, custom_brand, custom_name,
          custom_category, spec_overrides, created_at,
          components!stack_components_component_id_fkey (
            id, brand, name, category, technical_specs
          )
        )
      `)
      .eq('user_id', session.user.id)
      .eq('purpose', STEREO_PURPOSE)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error fetching stereo systems:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    return NextResponse.json({ systems: systems || [] })
  } catch (error) {
    console.error('Error fetching stereo systems:', error)
    return NextResponse.json({ error: 'Failed to fetch stereo systems' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const name = cleanName(body?.name)

    if (!name) {
      return NextResponse.json({ error: NAME_ERROR }, { status: 400 })
    }

    const { data: system, error } = await supabaseServer
      .from('user_stacks')
      .insert({
        user_id: session.user.id,
        name,
        purpose: STEREO_PURPOSE,
        system_profile: profileJson(body?.system_profile),
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating stereo system:', error)
      return NextResponse.json({ error: 'Failed to create stereo system' }, { status: 500 })
    }

    return NextResponse.json({ system }, { status: 201 })
  } catch (error) {
    console.error('Error creating stereo system:', error)
    return NextResponse.json({ error: 'Failed to create stereo system' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, name, system_profile } = body ?? {}

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ error: 'System ID is required' }, { status: 400 })
    }

    const updates: { name?: string; system_profile?: Json } = {}

    if (name !== undefined) {
      const cleaned = cleanName(name)
      if (!cleaned) {
        return NextResponse.json({ error: NAME_ERROR }, { status: 400 })
      }
      updates.name = cleaned
    }
    if (system_profile !== undefined) {
      updates.system_profile = profileJson(system_profile)
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
    }

    // Scoping by user_id and purpose makes another user's stack (or a headphone
    // stack) indistinguishable from a missing one.
    const { data: system, error } = await supabaseServer
      .from('user_stacks')
      .update(updates)
      .eq('id', id)
      .eq('user_id', session.user.id)
      .eq('purpose', STEREO_PURPOSE)
      .select()
      .single()

    if (error || !system) {
      return NextResponse.json({ error: 'System not found' }, { status: 404 })
    }

    return NextResponse.json({ system })
  } catch (error) {
    console.error('Error updating stereo system:', error)
    return NextResponse.json({ error: 'Failed to update stereo system' }, { status: 500 })
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
      return NextResponse.json({ error: 'System ID is required' }, { status: 400 })
    }

    // stack_components rows cascade via stack_components_stack_id_fkey
    const { data: deleted, error } = await supabaseServer
      .from('user_stacks')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id)
      .eq('purpose', STEREO_PURPOSE)
      .select('id')

    if (error) {
      console.error('Error deleting stereo system:', error)
      return NextResponse.json({ error: 'Failed to delete stereo system' }, { status: 500 })
    }

    if (!deleted?.length) {
      return NextResponse.json({ error: 'System not found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error deleting stereo system:', error)
    return NextResponse.json({ error: 'Failed to delete stereo system' }, { status: 500 })
  }
}
