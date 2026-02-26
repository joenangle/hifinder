import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const q = searchParams.get('q')
    const category = searchParams.get('category')
    const limit = parseInt(searchParams.get('limit') || '8')

    if (!q || q.length < 2) {
      return NextResponse.json([])
    }

    // Search across brand + name using ilike
    // Split query into words for better matching ("sennheiser hd" matches "Sennheiser HD 600")
    const words = q.trim().toLowerCase().split(/\s+/).filter(Boolean)

    let query = supabaseServer
      .from('components')
      .select('id, name, brand, category, price_new, price_used_min, price_used_max, impedance, sound_signature, needs_amp, fit')

    // Each word must appear in either brand or name
    for (const word of words) {
      query = query.or(`brand.ilike.%${word}%,name.ilike.%${word}%`)
    }

    // Optional category filter
    if (category) {
      if (category === 'headphones') {
        query = query.in('category', ['cans', 'iems'])
      } else {
        query = query.eq('category', category)
      }
    }

    const { data, error } = await query
      .order('brand')
      .order('name')
      .limit(limit)

    if (error) {
      console.error('Search error:', error)
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }

    return NextResponse.json(data || [])
  } catch (error) {
    console.error('Error searching components:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
