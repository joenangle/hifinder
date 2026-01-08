import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  try {
    // Use database function for efficient DISTINCT query (no client-side deduplication needed)
    const { data, error } = await supabaseServer
      .rpc('get_unique_brands')

    if (error) {
      console.error('Error fetching brands:', error)
      return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 })
    }

    // Database returns array of objects with brand property, extract values
    const brands = data?.map((item: { brand: string }) => item.brand) || []

    return NextResponse.json(brands)
  } catch (error) {
    console.error('Error fetching brands:', error)
    return NextResponse.json(
      { error: 'Failed to fetch brands' },
      { status: 500 }
    )
  }
}