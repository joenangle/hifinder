import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * GET /api/admin/components?id=xxx
 * Fetch a single component by ID for editing
 */
export async function GET(request: Request) {
  try {
    // Protect endpoint
    const session = await getServerSession(authOptions)

    if (!session || session.user?.email !== 'joenangle@gmail.com') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access only' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Component ID is required' },
        { status: 400 }
      )
    }

    // Fetch component
    const { data: component, error: fetchError } = await supabaseServer
      .from('components')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError) throw fetchError

    if (!component) {
      return NextResponse.json(
        { error: 'Component not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      component
    })

  } catch (error) {
    console.error('Error fetching component:', error)
    return NextResponse.json(
      { error: 'Failed to fetch component' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/components
 * Create a new component
 */
export async function POST(request: Request) {
  try {
    // Protect endpoint
    const session = await getServerSession(authOptions)

    if (!session || session.user?.email !== 'joenangle@gmail.com') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access only' },
        { status: 401 }
      )
    }

    const body = await request.json()

    // Validate required fields
    if (!body.brand || !body.name || !body.category) {
      return NextResponse.json(
        { error: 'Missing required fields: brand, name, and category are required' },
        { status: 400 }
      )
    }

    // Validate at least one price field
    if (!body.price_new && !body.price_used_min && !body.price_used_max) {
      return NextResponse.json(
        { error: 'At least one price field (price_new, price_used_min, or price_used_max) is required' },
        { status: 400 }
      )
    }

    // Validate category
    const validCategories = ['cans', 'iems', 'dac', 'amp', 'dac_amp', 'cable']
    if (!validCategories.includes(body.category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate sound_signature if provided
    if (body.sound_signature) {
      const validSignatures = ['neutral', 'warm', 'bright', 'fun']
      if (!validSignatures.includes(body.sound_signature)) {
        return NextResponse.json(
          { error: `Invalid sound_signature. Must be one of: ${validSignatures.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Validate price values are positive
    if (body.price_new !== undefined && body.price_new !== null && body.price_new <= 0) {
      return NextResponse.json(
        { error: 'New price must be greater than $0' },
        { status: 400 }
      )
    }
    if (body.price_used_min !== undefined && body.price_used_min !== null && body.price_used_min <= 0) {
      return NextResponse.json(
        { error: 'Used price minimum must be greater than $0' },
        { status: 400 }
      )
    }
    if (body.price_used_max !== undefined && body.price_used_max !== null && body.price_used_max <= 0) {
      return NextResponse.json(
        { error: 'Used price maximum must be greater than $0' },
        { status: 400 }
      )
    }

    // Validate used price range logic
    if (body.price_used_min && body.price_used_max && body.price_used_min > body.price_used_max) {
      return NextResponse.json(
        { error: 'Used price minimum cannot be greater than maximum' },
        { status: 400 }
      )
    }

    // Validate manufacturer_url format if provided
    if (body.manufacturer_url) {
      try {
        new URL(body.manufacturer_url)
      } catch {
        return NextResponse.json(
          { error: 'Invalid manufacturer URL format. Must be a valid URL starting with http:// or https://' },
          { status: 400 }
        )
      }
    }

    // Build component object
    const newComponent = {
      brand: body.brand.trim(),
      name: body.name.trim(),
      category: body.category,
      price_new: body.price_new || null,
      price_used_min: body.price_used_min || null,
      price_used_max: body.price_used_max || null,
      sound_signature: body.sound_signature || null,
      driver_type: body.driver_type || null,
      impedance: body.impedance || null,
      needs_amp: body.needs_amp || null,
      manufacturer_url: body.manufacturer_url || null,
      source: 'admin_manual',
      // Expert data
      asr_sinad: body.asr_sinad || null,
      asr_review_url: body.asr_review_url || null,
      crin_rank: body.crin_rank || null,
      crin_tone: body.crin_tone || null,
      crin_tech: body.crin_tech || null,
      crin_value: body.crin_value || null,
      crin_signature: body.crin_signature || null,
    }

    // Insert into components table
    const { data: newComponentData, error: insertError } = await supabaseServer
      .from('components')
      .insert(newComponent)
      .select()
      .single()

    if (insertError) throw insertError

    return NextResponse.json({
      success: true,
      component: newComponentData,
      message: `Successfully created: ${newComponentData.brand} ${newComponentData.name}`
    }, { status: 201 })

  } catch (error) {
    console.error('Error creating component:', error)

    // Check for duplicate error
    if (error && typeof error === 'object' && 'code' in error) {
      const pgError = error as { code: string; message: string }
      if (pgError.code === '23505') {
        return NextResponse.json(
          { error: 'Component already exists (duplicate brand + name combination)' },
          { status: 409 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to create component' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/admin/components?id=xxx
 * Update an existing component
 */
export async function PUT(request: Request) {
  try {
    // Protect endpoint
    const session = await getServerSession(authOptions)

    if (!session || session.user?.email !== 'joenangle@gmail.com') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access only' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Component ID is required' },
        { status: 400 }
      )
    }

    const body = await request.json()

    // Validate required fields
    if (!body.brand || !body.name || !body.category) {
      return NextResponse.json(
        { error: 'Missing required fields: brand, name, and category are required' },
        { status: 400 }
      )
    }

    // Validate at least one price field
    if (!body.price_new && !body.price_used_min && !body.price_used_max) {
      return NextResponse.json(
        { error: 'At least one price field (price_new, price_used_min, or price_used_max) is required' },
        { status: 400 }
      )
    }

    // Validate category
    const validCategories = ['cans', 'iems', 'dac', 'amp', 'dac_amp', 'cable']
    if (!validCategories.includes(body.category)) {
      return NextResponse.json(
        { error: `Invalid category. Must be one of: ${validCategories.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate sound_signature if provided
    if (body.sound_signature) {
      const validSignatures = ['neutral', 'warm', 'bright', 'fun']
      if (!validSignatures.includes(body.sound_signature)) {
        return NextResponse.json(
          { error: `Invalid sound_signature. Must be one of: ${validSignatures.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Validate price values are positive
    if (body.price_new !== undefined && body.price_new !== null && body.price_new <= 0) {
      return NextResponse.json(
        { error: 'New price must be greater than $0' },
        { status: 400 }
      )
    }
    if (body.price_used_min !== undefined && body.price_used_min !== null && body.price_used_min <= 0) {
      return NextResponse.json(
        { error: 'Used price minimum must be greater than $0' },
        { status: 400 }
      )
    }
    if (body.price_used_max !== undefined && body.price_used_max !== null && body.price_used_max <= 0) {
      return NextResponse.json(
        { error: 'Used price maximum must be greater than $0' },
        { status: 400 }
      )
    }

    // Validate used price range logic
    if (body.price_used_min && body.price_used_max && body.price_used_min > body.price_used_max) {
      return NextResponse.json(
        { error: 'Used price minimum cannot be greater than maximum' },
        { status: 400 }
      )
    }

    // Validate manufacturer_url format if provided
    if (body.manufacturer_url) {
      try {
        new URL(body.manufacturer_url)
      } catch {
        return NextResponse.json(
          { error: 'Invalid manufacturer URL format. Must be a valid URL starting with http:// or https://' },
          { status: 400 }
        )
      }
    }

    // Build update object
    const updatedComponent = {
      brand: body.brand.trim(),
      name: body.name.trim(),
      category: body.category,
      price_new: body.price_new || null,
      price_used_min: body.price_used_min || null,
      price_used_max: body.price_used_max || null,
      sound_signature: body.sound_signature || null,
      driver_type: body.driver_type || null,
      impedance: body.impedance || null,
      needs_amp: body.needs_amp !== undefined ? body.needs_amp : null,
      manufacturer_url: body.manufacturer_url || null,
      // Expert data
      asr_sinad: body.asr_sinad || null,
      asr_review_url: body.asr_review_url || null,
      crin_rank: body.crin_rank || null,
      crin_tone: body.crin_tone || null,
      crin_tech: body.crin_tech || null,
      crin_value: body.crin_value || null,
      crin_signature: body.crin_signature || null,
    }

    // Update component in database
    const { data: updatedComponentData, error: updateError } = await supabaseServer
      .from('components')
      .update(updatedComponent)
      .eq('id', id)
      .select()
      .single()

    if (updateError) throw updateError

    if (!updatedComponentData) {
      return NextResponse.json(
        { error: 'Component not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      component: updatedComponentData,
      message: `Successfully updated: ${updatedComponentData.brand} ${updatedComponentData.name}`
    })

  } catch (error) {
    console.error('Error updating component:', error)

    // Check for duplicate error
    if (error && typeof error === 'object' && 'code' in error) {
      const pgError = error as { code: string; message: string }
      if (pgError.code === '23505') {
        return NextResponse.json(
          { error: 'Component already exists (duplicate brand + name combination)' },
          { status: 409 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to update component' },
      { status: 500 }
    )
  }
}
