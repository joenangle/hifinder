import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from('components')
      .select('brand')
      .not('brand', 'is', null)
      .order('brand')

    if (error) {
      console.error('Error fetching brands:', error)
      return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 })
    }

    // Extract unique brands
    const uniqueBrands = [...new Set(data?.map(item => item.brand) || [])]
    
    return NextResponse.json(uniqueBrands)
  } catch (error) {
    console.error('Error fetching brands:', error)
    return NextResponse.json(
      { error: 'Failed to fetch brands' },
      { status: 500 }
    )
  }
}