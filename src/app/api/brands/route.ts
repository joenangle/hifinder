import { NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { HEADPHONE_SYSTEM_CATEGORIES } from '@/lib/component-categories'

export async function GET() {
  try {
    // Headphone-system categories only: the get_unique_brands RPC spans every
    // category and would list stereo (speaker) brands in the headphone filter.
    const { data, error } = await supabaseServer
      .from('components')
      .select('brand')
      .in('category', HEADPHONE_SYSTEM_CATEGORIES)

    if (error) {
      console.error('Error fetching brands:', error)
      return NextResponse.json({ error: 'Failed to fetch brands' }, { status: 500 })
    }

    const brands = [
      ...new Set((data ?? []).map((row) => row.brand).filter((b): b is string => !!b)),
    ].sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))

    return NextResponse.json(brands)
  } catch (error) {
    console.error('Error fetching brands:', error)
    return NextResponse.json(
      { error: 'Failed to fetch brands' },
      { status: 500 }
    )
  }
}
