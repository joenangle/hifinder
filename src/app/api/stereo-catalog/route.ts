import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import { searchWords, brandOrNameMatches } from '@/lib/search-terms'
import { CATEGORY } from '@/lib/component-categories'
import {
  parseSpeakerSpecs,
  parseSpeakerAmpSpecs,
  type StereoCatalogItem,
} from '@/lib/stereo/specs'

const MAX_RESULTS = 20

const ROLE_CATEGORY = {
  speakers: CATEGORY.SPEAKERS,
  amp: CATEGORY.SPEAKER_AMP,
} as const

/** Public, read-only catalog search for the stereo builder's speaker and amp pickers. */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    if (role !== 'speakers' && role !== 'amp') {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }
    const category = ROLE_CATEGORY[role]

    let query = supabaseServer
      .from('components')
      .select('id, brand, name, category, technical_specs')
      .eq('category', category)

    // Each word must appear in either brand or name
    for (const word of searchWords(searchParams.get('q'))) {
      query = query.or(brandOrNameMatches(word))
    }

    const { data, error } = await query
      .order('brand')
      .order('name')
      .limit(MAX_RESULTS)

    if (error) {
      console.error('Stereo catalog search error:', error)
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }

    const parse = role === 'speakers' ? parseSpeakerSpecs : parseSpeakerAmpSpecs
    const items: StereoCatalogItem[] = (data ?? []).map((row) => ({
      id: row.id,
      brand: row.brand,
      name: row.name,
      category,
      specs: parse(row.technical_specs),
    }))

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Error searching stereo catalog:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
