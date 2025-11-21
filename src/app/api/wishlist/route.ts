import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      console.log('GET wishlist: No session')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('GET wishlist for user:', session.user.id)

    const { data, error } = await supabaseServer
      .from('wishlists')
      .select(`
        *,
        components (
          id,
          name,
          brand,
          category,
          price_new,
          price_used_min,
          price_used_max,
          image_url
        )
      `)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching wishlist:', error)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }

    console.log('GET wishlist: Returning', data?.length || 0, 'items')
    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error fetching wishlist:', error)
    return NextResponse.json({ error: 'Failed to fetch wishlist' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { componentId } = await request.json()

    if (!componentId) {
      return NextResponse.json({ error: 'Component ID required' }, { status: 400 })
    }

    const { data, error } = await supabaseServer
      .from('wishlists')
      .insert({
        user_id: session.user.id,
        component_id: componentId
      })
      .select(`
        *,
        components (
          id,
          name,
          brand,
          category,
          price_new,
          price_used_min,
          price_used_max,
          image_url
        )
      `)
      .single()

    if (error) {
      console.error('Error adding to wishlist:', error)
      return NextResponse.json({ error: 'Failed to add to wishlist' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error adding to wishlist:', error)
    return NextResponse.json({ error: 'Failed to add to wishlist' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const componentId = url.searchParams.get('componentId')

    if (!componentId) {
      return NextResponse.json({ error: 'Component ID required' }, { status: 400 })
    }

    const { error } = await supabaseServer
      .from('wishlists')
      .delete()
      .eq('user_id', session.user.id)
      .eq('component_id', componentId)

    if (error) {
      console.error('Error removing from wishlist:', error)
      return NextResponse.json({ error: 'Failed to remove from wishlist' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing from wishlist:', error)
    return NextResponse.json({ error: 'Failed to remove from wishlist' }, { status: 500 })
  }
}
