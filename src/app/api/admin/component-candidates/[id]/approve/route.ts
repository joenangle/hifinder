import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * POST /api/admin/component-candidates/[id]/approve
 * Approve candidate and insert into components table
 */
export async function POST(
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

    // Get candidate
    const { data: candidate, error: fetchError } = await supabaseServer
      .from('new_component_candidates')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    if (!candidate) {
      return NextResponse.json(
        { error: 'Candidate not found' },
        { status: 404 }
      )
    }

    // Check if already approved
    if (candidate.status === 'approved') {
      return NextResponse.json(
        { error: 'Candidate already approved' },
        { status: 400 }
      )
    }

    // Validate required fields
    if (!candidate.brand || !candidate.model || !candidate.category) {
      return NextResponse.json(
        { error: 'Missing required fields: brand, model, or category' },
        { status: 400 }
      )
    }

    // Build component object
    const newComponent = {
      brand: candidate.brand,
      name: candidate.model,
      category: candidate.category,
      price_new: candidate.price_estimate_new,
      price_used_min: candidate.price_used_min,
      price_used_max: candidate.price_used_max,
      sound_signature: candidate.sound_signature,
      driver_type: candidate.driver_type,
      impedance: candidate.impedance,
      needs_amp: candidate.needs_amp,
      manufacturer_url: candidate.manufacturer_url,
      source: 'candidate_approval',
      // Expert data
      asr_sinad: candidate.asr_sinad,
      asr_review_url: candidate.asr_review_url,
      crin_rank: candidate.crin_rank,
      crin_tone: candidate.crin_tone,
      crin_tech: candidate.crin_tech,
      crin_value: candidate.crin_value,
      crin_signature: candidate.crin_signature
    }

    // Insert into components table
    const { data: newComponentData, error: insertError } = await supabaseServer
      .from('components')
      .insert(newComponent)
      .select()
      .single()

    if (insertError) throw insertError

    // Update candidate status
    const { error: updateError } = await supabaseServer
      .from('new_component_candidates')
      .update({
        status: 'approved',
        reviewed_at: new Date().toISOString(),
        reviewed_by: session.user.email
      })
      .eq('id', id)

    if (updateError) throw updateError

    // TODO: Update any trigger listings to point to new component
    // This would require storing the original listing IDs, which we might want to add later

    return NextResponse.json({
      success: true,
      component: newComponentData,
      message: `Successfully approved and created: ${newComponentData.brand} ${newComponentData.name}`
    })

  } catch (error) {
    console.error('Error approving component candidate:', error)

    // Check for duplicate error
    if (error && typeof error === 'object' && 'code' in error) {
      const pgError = error as { code: string; message: string }
      if (pgError.code === '23505') {
        return NextResponse.json(
          { error: 'Component already exists in database' },
          { status: 409 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to approve component candidate' },
      { status: 500 }
    )
  }
}
