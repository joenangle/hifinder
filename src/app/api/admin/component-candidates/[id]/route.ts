import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * GET /api/admin/component-candidates/[id]
 * Get single component candidate with full details including triggering listings
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Protect endpoint
    const session = await getServerSession(authOptions)

    if (!session || session.user?.email !== 'joenangle@gmail.com') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access only' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Get candidate details
    const { data: candidate, error } = await supabaseServer
      .from('new_component_candidates')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'Candidate not found' },
          { status: 404 }
        )
      }
      throw error
    }

    // Get triggering listings
    let triggeringListings = []
    if (candidate.trigger_listing_ids && candidate.trigger_listing_ids.length > 0) {
      const { data: listings } = await supabaseServer
        .from('used_listings')
        .select('id, title, price, url, date_posted, source')
        .in('id', candidate.trigger_listing_ids)
        .order('date_posted', { ascending: false })
        .limit(10)

      triggeringListings = listings || []
    }

    return NextResponse.json({
      candidate,
      triggeringListings
    })

  } catch (error) {
    console.error('Error fetching component candidate:', error)
    return NextResponse.json(
      { error: 'Failed to fetch component candidate' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/component-candidates/[id]
 * Update component candidate fields (for manual editing)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Protect endpoint
    const session = await getServerSession(authOptions)

    if (!session || session.user?.email !== 'joenangle@gmail.com') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access only' },
        { status: 401 }
      )
    }

    const { id } = await params
    const updates = await request.json()

    // Whitelist of fields that can be updated
    const allowedFields = [
      'brand',
      'model',
      'category',
      'price_estimate_new',
      'price_used_min',
      'price_used_max',
      'sound_signature',
      'driver_type',
      'impedance',
      'needs_amp',
      'manufacturer_url',
      'review_notes'
    ]

    const filteredUpdates = Object.keys(updates)
      .filter(key => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = updates[key]
        return obj
      }, {} as Record<string, string | number | boolean | null>)

    // Add updated timestamp
    filteredUpdates.updated_at = new Date().toISOString()

    const { data, error } = await supabaseServer
      .from('new_component_candidates')
      .update(filteredUpdates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ candidate: data })

  } catch (error) {
    console.error('Error updating component candidate:', error)
    return NextResponse.json(
      { error: 'Failed to update component candidate' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/component-candidates/[id]
 * Delete (reject) a component candidate
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Protect endpoint
    const session = await getServerSession(authOptions)

    if (!session || session.user?.email !== 'joenangle@gmail.com') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access only' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Update status to rejected instead of deleting
    const { error } = await supabaseServer
      .from('new_component_candidates')
      .update({
        status: 'rejected',
        reviewed_at: new Date().toISOString(),
        reviewed_by: session.user.email
      })
      .eq('id', id)

    if (error) throw error

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error rejecting component candidate:', error)
    return NextResponse.json(
      { error: 'Failed to reject component candidate' },
      { status: 500 }
    )
  }
}
