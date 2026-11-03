import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'
import { CATEGORY } from '@/lib/component-categories'
import { parseSpeakerSpecs, parseSpeakerAmpSpecs } from '@/lib/stereo/specs'
import type { StackRole } from '@/types/gear'
import type { Json } from '@/types/supabase'

const MAX_NAME_LENGTH = 200
const STEREO_PURPOSE = 'stereo'

// Display order of the slots; also the stored `position`.
const ROLES: readonly StackRole[] = ['speakers', 'amp', 'sub', 'source']

// Catalog category a component must have to fill a role. Roles absent here
// (sub, source) have no catalog category in v1 and accept custom items only.
const ROLE_CATEGORY: Partial<Record<StackRole, string>> = {
  speakers: CATEGORY.SPEAKERS,
  amp: CATEGORY.SPEAKER_AMP,
}

function isStackRole(value: unknown): value is StackRole {
  return typeof value === 'string' && (ROLES as readonly string[]).includes(value)
}

/** Parse overrides with the role's spec parser. An empty result is stored as null. */
function parseOverrides(role: StackRole, input: unknown): Json | null {
  const parsed =
    role === 'speakers' ? parseSpeakerSpecs(input)
    : role === 'amp' ? parseSpeakerAmpSpecs(input)
    : null
  return parsed && Object.keys(parsed).length > 0 ? (parsed as unknown as Json) : null
}

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null
  const text = value.trim()
  return text && text.length <= MAX_NAME_LENGTH ? text : null
}

/**
 * Load the stack scoped to the session user. Returns an error response when it
 * is missing or not someone's stereo system, otherwise null. Scoping by user_id
 * makes another user's stack indistinguishable from a missing one.
 */
async function rejectUnlessOwnStereoStack(stackId: string, userId: string) {
  const { data: stack, error } = await supabaseServer
    .from('user_stacks')
    .select('id, purpose')
    .eq('id', stackId)
    .eq('user_id', userId)
    .single()

  if (error || !stack) {
    return NextResponse.json({ error: 'System not found' }, { status: 404 })
  }
  if (stack.purpose !== STEREO_PURPOSE) {
    return NextResponse.json({ error: 'Not a stereo system' }, { status: 400 })
  }
  return null
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { stack_id, role, component_id, custom, spec_overrides } = body ?? {}

    if (!stack_id || typeof stack_id !== 'string') {
      return NextResponse.json({ error: 'System ID is required' }, { status: 400 })
    }
    if (!isStackRole(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const hasComponent = component_id != null
    const hasCustom = custom != null
    if (hasComponent === hasCustom) {
      return NextResponse.json(
        { error: 'Provide exactly one of component_id or custom' },
        { status: 400 }
      )
    }

    const requiredCategory = ROLE_CATEGORY[role]
    let customName: string | null = null
    let customBrand: string | null = null

    if (hasComponent) {
      if (typeof component_id !== 'string' || !component_id) {
        return NextResponse.json({ error: 'Invalid component_id' }, { status: 400 })
      }
      if (!requiredCategory) {
        return NextResponse.json(
          { error: `The ${role} slot only accepts custom items` },
          { status: 400 }
        )
      }
    } else {
      customName = cleanText(custom?.name)
      if (!customName) {
        return NextResponse.json(
          { error: `Custom name is required (max ${MAX_NAME_LENGTH} characters)` },
          { status: 400 }
        )
      }
      customBrand = cleanText(custom?.brand)
    }

    const stackRejection = await rejectUnlessOwnStereoStack(stack_id, session.user.id)
    if (stackRejection) return stackRejection

    if (hasComponent) {
      // The only read of the catalog: confirm the category fits the slot.
      const { data: component, error: componentError } = await supabaseServer
        .from('components')
        .select('category')
        .eq('id', component_id)
        .single()

      if (componentError || !component || component.category !== requiredCategory) {
        return NextResponse.json(
          { error: `Component is not a valid ${role} item` },
          { status: 400 }
        )
      }
    }

    // Replace whatever fills this slot now.
    const { error: deleteError } = await supabaseServer
      .from('stack_components')
      .delete()
      .eq('stack_id', stack_id)
      .eq('role', role)

    if (deleteError) {
      console.error('Error clearing stereo system slot:', deleteError)
      return NextResponse.json({ error: 'Failed to save item' }, { status: 500 })
    }

    const { data: item, error: insertError } = await supabaseServer
      .from('stack_components')
      .insert({
        stack_id,
        role,
        position: ROLES.indexOf(role),
        component_id: hasComponent ? component_id : null,
        custom_brand: customBrand,
        custom_name: customName,
        custom_category: hasCustom ? (requiredCategory ?? null) : null,
        spec_overrides: parseOverrides(role, spec_overrides),
      })
      .select(`
        id, stack_id, position, role, component_id, custom_brand, custom_name,
        custom_category, spec_overrides, created_at,
        components!stack_components_component_id_fkey (
          id, brand, name, category, technical_specs
        )
      `)
      .single()

    if (insertError || !item) {
      console.error('Error saving stereo system item:', insertError)
      return NextResponse.json({ error: 'Failed to save item' }, { status: 500 })
    }

    return NextResponse.json({ item })
  } catch (error) {
    console.error('Error saving stereo system item:', error)
    return NextResponse.json({ error: 'Failed to save item' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const params = new URL(request.url).searchParams
    const stackId = params.get('stack_id')
    const role = params.get('role')

    if (!stackId) {
      return NextResponse.json({ error: 'System ID is required' }, { status: 400 })
    }
    if (!isStackRole(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    const stackRejection = await rejectUnlessOwnStereoStack(stackId, session.user.id)
    if (stackRejection) return stackRejection

    const { error } = await supabaseServer
      .from('stack_components')
      .delete()
      .eq('stack_id', stackId)
      .eq('role', role)

    if (error) {
      console.error('Error removing stereo system item:', error)
      return NextResponse.json({ error: 'Failed to remove item' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error removing stereo system item:', error)
    return NextResponse.json({ error: 'Failed to remove item' }, { status: 500 })
  }
}
