import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * GET /api/admin/components/check-duplicate?brand=xxx&name=xxx&excludeId=xxx
 * Check if a component with the given brand+name combination already exists
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
    const brand = searchParams.get('brand')
    const name = searchParams.get('name')
    const excludeId = searchParams.get('excludeId') // For edit mode - exclude current component

    if (!brand || !name) {
      return NextResponse.json(
        { error: 'Brand and name parameters are required' },
        { status: 400 }
      )
    }

    // Normalize brand and name for comparison (case-insensitive, trimmed)
    const normalizedBrand = brand.trim().toLowerCase()
    const normalizedName = name.trim().toLowerCase()

    // Query for exact matches (case-insensitive)
    const query = supabaseServer
      .from('components')
      .select('id, brand, name')

    // Use PostgreSQL's ILIKE for case-insensitive comparison
    const { data: components, error: fetchError } = await query

    if (fetchError) throw fetchError

    // Filter manually to ensure proper case-insensitive matching
    const duplicates = components?.filter(c => {
      const isDuplicate =
        c.brand.toLowerCase() === normalizedBrand &&
        c.name.toLowerCase() === normalizedName

      // Exclude current component in edit mode
      if (excludeId && c.id === excludeId) {
        return false
      }

      return isDuplicate
    }) || []

    if (duplicates.length > 0) {
      return NextResponse.json({
        isDuplicate: true,
        existingComponents: duplicates,
        message: `A component with brand "${duplicates[0].brand}" and name "${duplicates[0].name}" already exists in the database.`
      })
    }

    return NextResponse.json({
      isDuplicate: false,
      message: 'No duplicate found'
    })

  } catch (error) {
    console.error('Error checking for duplicates:', error)
    return NextResponse.json(
      { error: 'Failed to check for duplicates' },
      { status: 500 }
    )
  }
}
