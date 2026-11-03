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

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

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

    const id = searchParams.get('id')
    if (id !== null && !UUID_PATTERN.test(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 })
    }

    let query = supabaseServer
      .from('components')
      .select('id, brand, name, category, technical_specs')
      .eq('category', category)

    // Single-item lookup, used to restore catalog gear from a shared link.
    // The category filter above means an id from another role finds nothing.
    if (id !== null) query = query.eq('id', id)

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
