import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Admin auth check
async function isAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization')
  if (!authHeader) return false

  try {
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)

    if (error || !user) return false

    // Check if user email matches admin email
    const adminEmail = process.env.ADMIN_EMAIL || 'joe@example.com'
    return user.email === adminEmail
  } catch {
    return false
  }
}

export async function GET(request: NextRequest) {
  // Check admin auth
  if (!(await isAdmin(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '30')
    const platform = searchParams.get('platform') // 'ebay', 'amazon', or null for all

    // Get click statistics
    let clickQuery = supabase
      .from('affiliate_clicks')
      .select('*')
      .gte('clicked_at', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('clicked_at', { ascending: false })

    if (platform) {
      clickQuery = clickQuery.eq('platform', platform)
    }

    const { data: clicks, error: clickError } = await clickQuery

    if (clickError) throw clickError

    // Get revenue statistics
    let revenueQuery = supabase
      .from('affiliate_revenue')
      .select('*')
      .gte('transaction_date', new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString())
      .order('transaction_date', { ascending: false })

    if (platform) {
      revenueQuery = revenueQuery.eq('platform', platform)
    }

    const { data: revenue, error: revenueError } = await revenueQuery

    if (revenueError) throw revenueError

    // Get top components
    const { data: topComponents, error: topError } = await supabase
      .from('top_affiliate_components')
      .select('*')

    if (topError) throw topError

    // Calculate summary stats
    const totalClicks = clicks?.length || 0
    const totalRevenue = revenue?.reduce((sum, r) => sum + (r.commission_amount || 0), 0) || 0
    const confirmedRevenue = revenue?.filter(r => r.status === 'confirmed' || r.status === 'paid')
      .reduce((sum, r) => sum + (r.commission_amount || 0), 0) || 0
    const conversionRate = totalClicks > 0 ? ((revenue?.length || 0) / totalClicks * 100).toFixed(2) : '0.00'

    // Group by platform
    const platformStats = clicks?.reduce((acc, click) => {
      if (!acc[click.platform]) {
        acc[click.platform] = { clicks: 0, revenue: 0 }
      }
      acc[click.platform].clicks++
      return acc
    }, {} as Record<string, { clicks: number; revenue: number }>)

    revenue?.forEach(r => {
      if (platformStats && platformStats[r.platform]) {
        platformStats[r.platform].revenue += r.commission_amount || 0
      }
    })

    // Group by source
    const sourceStats = clicks?.reduce((acc, click) => {
      if (!acc[click.source]) {
        acc[click.source] = 0
      }
      acc[click.source]++
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      summary: {
        totalClicks,
        totalRevenue,
        confirmedRevenue,
        conversionRate,
        days
      },
      platformStats,
      sourceStats,
      topComponents,
      recentClicks: clicks?.slice(0, 10),
      recentRevenue: revenue?.slice(0, 10)
    })

  } catch (error) {
    console.error('Error fetching affiliate stats:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch stats' },
      { status: 500 }
    )
  }
}
