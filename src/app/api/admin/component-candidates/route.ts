import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * GET /api/admin/component-candidates
 * List all component candidates with optional filtering
 */
export async function GET(request: Request) {
  try {
    // Protect endpoint - only allow admin
    const session = await getServerSession(authOptions)

    if (!session || session.user?.email !== 'joenangle@gmail.com') {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access only' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'pending'
    const minQuality = parseInt(searchParams.get('minQuality') || '0')
    const category = searchParams.get('category')
    const brand = searchParams.get('brand')
    const sortBy = searchParams.get('sortBy') || 'quality_score'
    const sortOrder = searchParams.get('sortOrder') || 'desc'
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Build query
    let query = supabaseServer
      .from('new_component_candidates')
      .select('*', { count: 'exact' })

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (minQuality > 0) {
      query = query.gte('quality_score', minQuality)
    }

    if (category) {
      query = query.eq('category', category)
    }

    if (brand) {
      query = query.ilike('brand', `%${brand}%`)
    }

    // Apply sorting
    const ascending = sortOrder === 'asc'
    query = query.order(sortBy, { ascending })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: candidates, error, count } = await query

    if (error) throw error

    // Get summary stats
    const { data: stats } = await supabaseServer
      .from('new_component_candidates')
      .select('status, quality_score, category')

    const summary = {
      total: count || 0,
      byStatus: {
        pending: stats?.filter(s => s.status === 'pending').length || 0,
        approved: stats?.filter(s => s.status === 'approved').length || 0,
        rejected: stats?.filter(s => s.status === 'rejected').length || 0,
        needs_research: stats?.filter(s => s.status === 'needs_research').length || 0,
        merged: stats?.filter(s => s.status === 'merged').length || 0
      },
      byCategory: stats?.reduce((acc, s) => {
        if (s.category) {
          acc[s.category] = (acc[s.category] || 0) + 1
        }
        return acc
      }, {} as Record<string, number>) || {},
      avgQualityScore: stats?.reduce((sum, s) => sum + (s.quality_score || 0), 0) / (stats?.length || 1) || 0
    }

    return NextResponse.json({
      candidates,
      pagination: {
        offset,
        limit,
        total: count || 0,
        hasMore: (offset + limit) < (count || 0)
      },
      summary
    })

  } catch (error) {
    console.error('Error fetching component candidates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch component candidates' },
      { status: 500 }
    )
  }
}
