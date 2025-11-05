import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

interface PriceStats {
  count: number
  min: number
  max: number
  median: number
  avg: number
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const { searchParams } = new URL(request.url)
    const days = parseInt(searchParams.get('days') || '90')

    // Calculate date threshold
    const dateThreshold = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

    // Query sold listings
    const { data: sales, error } = await supabaseServer
      .from('used_listings')
      .select('price, sale_price, condition, date_sold, source, url')
      .eq('component_id', resolvedParams.id)
      .eq('status', 'sold')
      .gte('date_sold', dateThreshold)
      .order('date_sold', { ascending: true })

    if (error) {
      console.error('Error fetching price history:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!sales || sales.length === 0) {
      return NextResponse.json({
        component_id: resolvedParams.id,
        statistics: null,
        sales: []
      })
    }

    // Calculate statistics
    const prices = sales.map(s => s.sale_price || s.price).filter(p => p > 0)

    if (prices.length === 0) {
      return NextResponse.json({
        component_id: resolvedParams.id,
        statistics: null,
        sales: []
      })
    }

    const sortedPrices = [...prices].sort((a, b) => a - b)
    const statistics: PriceStats = {
      count: prices.length,
      min: Math.min(...prices),
      max: Math.max(...prices),
      median: calculateMedian(sortedPrices),
      avg: prices.reduce((a, b) => a + b, 0) / prices.length
    }

    return NextResponse.json({
      component_id: resolvedParams.id,
      statistics,
      sales: sales.map(s => ({
        price: s.sale_price || s.price,
        condition: s.condition,
        date_sold: s.date_sold,
        source: s.source,
        url: s.url
      }))
    })

  } catch (error) {
    console.error('Price history API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function calculateMedian(sortedArr: number[]): number {
  const mid = Math.floor(sortedArr.length / 2)
  return sortedArr.length % 2
    ? sortedArr[mid]
    : (sortedArr[mid - 1] + sortedArr[mid]) / 2
}
