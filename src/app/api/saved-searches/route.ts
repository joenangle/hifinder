import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * CRUD for a user's saved marketplace searches.
 * Service-role access gated by the authenticated NextAuth session.
 */

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabaseServer
    .from('saved_searches')
    .select('id, name, query_string, created_at')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error loading saved searches:', error)
    return NextResponse.json({ error: 'Failed to load saved searches' }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const queryString = typeof body.queryString === 'string' ? body.queryString : ''

  if (!name) {
    return NextResponse.json({ error: 'A name is required' }, { status: 400 })
  }

  const { data, error } = await supabaseServer
    .from('saved_searches')
    .insert({ user_id: session.user.id, name, query_string: queryString })
    .select('id, name, query_string, created_at')
    .single()

  if (error) {
    console.error('Error saving search:', error)
    return NextResponse.json({ error: 'Failed to save search' }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const id = new URL(request.url).searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const { error } = await supabaseServer
    .from('saved_searches')
    .delete()
    .eq('id', id)
    .eq('user_id', session.user.id)

  if (error) {
    console.error('Error deleting saved search:', error)
    return NextResponse.json({ error: 'Failed to delete saved search' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
