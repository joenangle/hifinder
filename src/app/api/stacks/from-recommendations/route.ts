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
    const { name, description, componentIds } = body

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Stack name is required' }, { status: 400 })
    }

    if (!Array.isArray(componentIds) || componentIds.length === 0) {
      return NextResponse.json({ error: 'At least one component is required' }, { status: 400 })
    }

    // Validate that all component IDs exist
    const { data: validComponents, error: validationError } = await supabaseServer
      .from('components')
      .select('id')
      .in('id', componentIds)

    if (validationError) {
      console.error('Error validating components:', validationError)
      return NextResponse.json({ error: 'Failed to validate components' }, { status: 500 })
    }

    const validIds = new Set((validComponents || []).map(c => c.id))
    const invalidIds = componentIds.filter((id: string) => !validIds.has(id))

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: `Invalid component IDs: ${invalidIds.join(', ')}` },
        { status: 400 }
      )
    }

    // Create the stack
    const { data: newStack, error: stackError } = await supabaseServer
      .from('user_stacks')
      .insert({
        user_id: session.user.id,
        name: name.trim(),
        description: description?.trim() || null
      })
      .select()
      .single()

    if (stackError) {
      console.error('Error creating stack:', stackError)
      return NextResponse.json({ error: 'Failed to create stack' }, { status: 500 })
    }

    // Add components to the stack
    const stackComponents = componentIds.map((componentId: string, index: number) => ({
      stack_id: newStack.id,
      component_id: componentId,
      position: index
    }))

    const { error: componentsError } = await supabaseServer
      .from('stack_components')
      .insert(stackComponents)

    if (componentsError) {
      console.error('Error adding components to stack:', componentsError)
      // Clean up the stack if component insertion failed
      await supabaseServer.from('user_stacks').delete().eq('id', newStack.id)
      return NextResponse.json({ error: 'Failed to add components to stack' }, { status: 500 })
    }

    return NextResponse.json({
      id: newStack.id,
      name: newStack.name,
      description: newStack.description,
      componentCount: componentIds.length
    }, { status: 201 })
  } catch (error) {
    console.error('Error saving stack from recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to save stack' },
      { status: 500 }
    )
  }
}
