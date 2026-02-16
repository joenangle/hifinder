import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * GET /api/admin/flagged-listings
 * List all flagged used listings with filtering and pagination
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

    // Parse query parameters
    const status = searchParams.get('status') || 'pending' // pending, approved, deleted, all
    const issueTypes = searchParams.getAll('issueType') // Can have multiple
    const confidenceMin = parseFloat(searchParams.get('confidenceMin') || '0')
    const confidenceMax = parseFloat(searchParams.get('confidenceMax') || '1')
    const source = searchParams.get('source')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const sortBy = searchParams.get('sortBy') || 'match_confidence' // match_confidence, date_posted, price
    const sortOrder = searchParams.get('sortOrder') || 'asc' // asc or desc
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = (page - 1) * limit

    // Build query
    let query = supabaseServer
      .from('used_listings')
      .select(`
        *,
        component:components(
          id,
          brand,
          name,
          category,
          price_new,
          sound_signature
        )
      `, { count: 'exact' })

    // Filter by review status
    if (status === 'pending') {
      query = query.eq('requires_manual_review', true)
    } else if (status === 'approved') {
      query = query.not('reviewed_at', 'is', null).eq('requires_manual_review', false)
    } else if (status === 'deleted') {
      query = query.eq('status', 'deleted')
    }
    // 'all' = no status filter

    // Filter by confidence range
    if (confidenceMin > 0 || confidenceMax < 1) {
      query = query.gte('match_confidence', confidenceMin).lte('match_confidence', confidenceMax)
    }

    // Filter by source
    if (source && source !== 'all') {
      query = query.eq('source', source)
    }

    // Filter by date range
    if (dateFrom) {
      query = query.gte('date_posted', dateFrom)
    }
    if (dateTo) {
      query = query.lte('date_posted', dateTo)
    }

    // Filter by issue types (check validation_warnings)
    // This is complex - we'll need to filter in JS after fetching
    // For now, skip this filter in the query

    // Apply sorting
    const ascending = sortOrder === 'asc'
    query = query.order(sortBy, { ascending })

    // Apply pagination
    query = query.range(offset, offset + limit - 1)

    const { data: listings, error, count } = await query

    if (error) {
      console.error('Error fetching flagged listings:', error)
      throw error
    }

    // Post-process: Filter by issue types if specified
    let filteredListings = listings || []
    if (issueTypes.length > 0) {
      filteredListings = filteredListings.filter(listing => {
        const warnings = listing.validation_warnings || []
        return issueTypes.some(issueType => {
          switch (issueType) {
            case 'low_confidence':
              return listing.match_confidence < 0.5
            case 'ambiguous':
              return listing.is_ambiguous === true
            case 'price_mismatch':
              return warnings.some((w: string) => w.includes('price') || w.includes('Price'))
            case 'category_conflict':
              return warnings.some((w: string) => w.includes('category') || w.includes('Category'))
            case 'generic_name':
              return warnings.some((w: string) => w.includes('generic') || w.includes('Generic'))
            case 'no_match':
              return warnings.some((w: string) => w.includes('No match') || w.includes('no match'))
            case 'accessory':
              return warnings.some((w: string) => w.includes('accessory') || w.includes('Accessory'))
            default:
              return false
          }
        })
      })
    }

    // Calculate summary stats (across all flagged listings, not just current page)
    const { data: allFlagged } = await supabaseServer
      .from('used_listings')
      .select('match_confidence, is_ambiguous, validation_warnings')
      .eq('requires_manual_review', true)

    const summary = {
      total: count || 0,
      totalPending: allFlagged?.length || 0,
      ambiguous: allFlagged?.filter(l => l.is_ambiguous).length || 0,
      lowConfidence: allFlagged?.filter(l => l.match_confidence < 0.5).length || 0,
      avgConfidence: allFlagged && allFlagged.length > 0
        ? allFlagged.reduce((sum, l) => sum + (l.match_confidence || 0), 0) / allFlagged.length
        : 0,
      byIssueType: {
        low_confidence: allFlagged?.filter(l => l.match_confidence < 0.5).length || 0,
        ambiguous: allFlagged?.filter(l => l.is_ambiguous).length || 0,
        price_mismatch: allFlagged?.filter(l =>
          (l.validation_warnings || []).some((w: string) => w.includes('price'))
        ).length || 0,
        category_conflict: allFlagged?.filter(l =>
          (l.validation_warnings || []).some((w: string) => w.includes('category'))
        ).length || 0,
        generic_name: allFlagged?.filter(l =>
          (l.validation_warnings || []).some((w: string) => w.includes('generic'))
        ).length || 0,
        no_match: allFlagged?.filter(l =>
          (l.validation_warnings || []).some((w: string) => w.includes('No match'))
        ).length || 0
      }
    }

    return NextResponse.json({
      listings: filteredListings,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasMore: offset + limit < (count || 0)
      },
      summary
    })

  } catch (error) {
    console.error('Error in flagged-listings API:', error)
    return NextResponse.json(
      { error: 'Failed to fetch flagged listings' },
      { status: 500 }
    )
  }
}
