import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

interface BatchPriceEntry {
  count: number
  median: number
  min: number
  max: number
  trend: 'up' | 'down' | 'stable' | null
}

const MAX_IDS = 100

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const idsParam = searchParams.get('ids')

    if (!idsParam) {
      return NextResponse.json(
        { error: 'Missing required query parameter: ids' },
        { status: 400 }
      )
    }

    const ids = idsParam.split(',').map(id => id.trim()).filter(Boolean)

    if (ids.length === 0) {
      return NextResponse.json({})
    }

    if (ids.length > MAX_IDS) {
      return NextResponse.json(
        { error: `Too many IDs. Maximum is ${MAX_IDS}, received ${ids.length}` },
        { status: 400 }
      )
    }

    // 90-day window for all price history
    const now = Date.now()
    const dateThreshold90 = new Date(now - 90 * 24 * 60 * 60 * 1000).toISOString()
    const dateThreshold30 = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString()

    // Single query: fetch all sold listings for all requested component IDs within 90 days
    const { data: sales, error } = await supabaseServer
      .from('used_listings')
      .select('component_id, price, sale_price, date_sold')
      .in('component_id', ids)
      .eq('status', 'sold')
      .gte('date_sold', dateThreshold90)
      .order('date_sold', { ascending: true })

    if (error) {
      console.error('Batch price history error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Group sales by component_id
    const salesByComponent = new Map<string, Array<{ price: number; date_sold: string }>>()

    for (const sale of sales || []) {
      const price = sale.sale_price || sale.price
      if (!price || price <= 0) continue

      const componentId = sale.component_id
      if (!salesByComponent.has(componentId)) {
        salesByComponent.set(componentId, [])
      }
      salesByComponent.get(componentId)!.push({
        price,
        date_sold: sale.date_sold,
      })
    }

    // Calculate stats for each component
    const result: Record<string, BatchPriceEntry | null> = {}

    for (const id of ids) {
      const componentSales = salesByComponent.get(id)

      if (!componentSales || componentSales.length < 3) {
        // Match the existing badge behavior: only show if count >= 3
        result[id] = null
        continue
      }

      const prices = componentSales.map(s => s.price)
      const sortedPrices = [...prices].sort((a, b) => a - b)

      const median = calculateMedian(sortedPrices)
      const min = sortedPrices[0]
      const max = sortedPrices[sortedPrices.length - 1]

      // Calculate trend: compare median of last 30 days vs older sales
      let trend: 'up' | 'down' | 'stable' | null = null
      const recentSales = componentSales.filter(s => s.date_sold >= dateThreshold30)
      const olderSales = componentSales.filter(s => s.date_sold < dateThreshold30)

      if (recentSales.length >= 2 && olderSales.length >= 2) {
        const recentMedian = calculateMedian(
          recentSales.map(s => s.price).sort((a, b) => a - b)
        )
        const olderMedian = calculateMedian(
          olderSales.map(s => s.price).sort((a, b) => a - b)
        )
        const changePercent = ((recentMedian - olderMedian) / olderMedian) * 100

        if (changePercent > 5) trend = 'up'
        else if (changePercent < -5) trend = 'down'
        else trend = 'stable'
      }

      result[id] = {
        count: componentSales.length,
        median: Math.round(median),
        min: Math.round(min),
        max: Math.round(max),
        trend,
      }
    }

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, max-age=3600, stale-while-revalidate=7200',
      },
    })
  } catch (error) {
    console.error('Batch price history API error:', error)
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
