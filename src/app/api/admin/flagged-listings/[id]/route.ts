import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * GET /api/admin/flagged-listings/[id]
 * Get detailed information about a specific flagged listing
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user?.email !== 'joenangle@gmail.com') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access only' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Fetch the listing with component details
    const { data: listing, error } = await supabaseServer
      .from('used_listings')
      .select(`
        *,
        component:components(
          id,
          brand,
          name,
          category,
          price_new,
          price_used_min,
          price_used_max,
          sound_signature,
          driver_type,
          impedance
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Error fetching flagged listing:', error)
      throw error
    }

    if (!listing) {
      return NextResponse.json(
        { error: 'Listing not found' },
        { status: 404 }
      )
    }

    // Find alternative component matches
    // This would ideally call the matcher again, but for now we'll return empty
    // In the future, we can re-run findComponentMatch() and return top 5 candidates
    const alternatives: Record<string, unknown>[] = []

    // TODO: Re-run component matcher to get alternatives
    // const { findComponentMatch } = require('@/scripts/component-matcher-enhanced')
    // const matchResult = await findComponentMatch(listing.title, listing.description || '', listing.source)
    // alternatives = matchResult.topCandidates or similar

    return NextResponse.json({
      listing,
      alternatives
    })

  } catch (error) {
    console.error('Error fetching flagged listing details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch listing details' },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/flagged-listings/[id]
 * Update a flagged listing (approve, delete, or fix)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user?.email !== 'joenangle@gmail.com') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access only' },
        { status: 401 }
      )
    }

    const { id } = await params
    const body = await request.json()
    const { action, notes, newComponentId } = body

    if (!action || !['approve', 'delete', 'fix'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be: approve, delete, or fix' },
        { status: 400 }
      )
    }

    const updateData: {
      reviewed_by: string | null | undefined
      reviewed_at: string
      manual_review_notes: string | null
      requires_manual_review?: boolean
      status?: string
      component_id?: string
      validation_warnings?: string[]
    } = {
      reviewed_by: session.user.email,
      reviewed_at: new Date().toISOString(),
      manual_review_notes: notes || null
    }

    if (action === 'approve') {
      // Approve: Mark as reviewed, no longer requires manual review
      updateData.requires_manual_review = false

    } else if (action === 'delete') {
      // Delete: Soft delete (set status to 'deleted')
      updateData.status = 'deleted'
      updateData.requires_manual_review = false

    } else if (action === 'fix') {
      // Fix: Change the component_id to the correct one
      if (!newComponentId) {
        return NextResponse.json(
          { error: 'newComponentId required for fix action' },
          { status: 400 }
        )
      }

      // Verify the new component exists
      const { data: newComponent, error: componentError } = await supabaseServer
        .from('components')
        .select('id, brand, name')
        .eq('id', newComponentId)
        .single()

      if (componentError || !newComponent) {
        return NextResponse.json(
          { error: 'Invalid component ID' },
          { status: 400 }
        )
      }

      updateData.component_id = newComponentId
      updateData.requires_manual_review = false
      updateData.validation_warnings = [
        ...(updateData.validation_warnings || []),
        `Manually corrected to: ${newComponent.brand} ${newComponent.name}`
      ]
    }

    // Update the listing
    const { data: updatedListing, error: updateError } = await supabaseServer
      .from('used_listings')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating flagged listing:', updateError)
      throw updateError
    }

    return NextResponse.json({
      success: true,
      message: `Listing ${action}ed successfully`,
      listing: updatedListing
    })

  } catch (error) {
    console.error('Error updating flagged listing:', error)
    return NextResponse.json(
      { error: 'Failed to update listing' },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/flagged-listings/[id]
 * Hard delete a flagged listing (use with caution)
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || session.user?.email !== 'joenangle@gmail.com') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access only' },
        { status: 401 }
      )
    }

    const { id } = await params

    // Hard delete (actually remove from database)
    // Note: We prefer soft delete via PATCH with action='delete'
    const { error } = await supabaseServer
      .from('used_listings')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting flagged listing:', error)
      throw error
    }

    return NextResponse.json({
      success: true,
      message: 'Listing permanently deleted'
    })

  } catch (error) {
    console.error('Error deleting flagged listing:', error)
    return NextResponse.json(
      { error: 'Failed to delete listing' },
      { status: 500 }
    )
  }
}
