import { NextRequest, NextResponse } from 'next/server'
import { supabaseServer } from '@/lib/supabase-server'
import {
  parseBrowseParams,
  browseSearchWords,
  browseSortClauses,
} from '@/lib/browse-params'

/**
 * Public catalog browse — paginated, filterable, sortable list of components.
 *
 * Powers the /browse page so power users can look gear up directly instead of
 * running the beginner recommendation flow. Kept separate from /api/components
 * (used by share URLs / curated systems) to avoid regressing that shared path.
 */

// Card-relevant columns only — keep the payload lean for grid rendering.
const SELECT_COLS =
  'id, brand, name, category, price_new, price_used_min, price_used_max, image_url, sound_signature, crin_rank, crin_tone, crin_tech, asr_sinad, needs_amp, expert_grade_numeric'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const { q, category, sort, page, pageSize } = parseBrowseParams(searchParams)

    let query = supabaseServer
      .from('components')
      .select(SELECT_COLS, { count: 'exact' })

    // Each search word must appear in brand or name (words AND together).
    for (const word of browseSearchWords(q)) {
      query = query.or(`brand.ilike.%${word}%,name.ilike.%${word}%`)
    }

    if (category) {
      query = query.eq('category', category)
    }

    for (const clause of browseSortClauses(sort)) {
      query = query.order(clause.column, {
        ascending: clause.ascending,
        nullsFirst: clause.nullsFirst,
      })
    }

    const from = (page - 1) * pageSize
    query = query.range(from, from + pageSize - 1)

    const { data, error, count } = await query

    if (error) {
      console.error('Browse error:', error)
      return NextResponse.json({ error: 'Browse failed' }, { status: 500 })
    }

    return NextResponse.json(
      { items: data ?? [], total: count ?? 0, page, pageSize },
      { headers: { 'Cache-Control': 'public, max-age=300, stale-while-revalidate=3600' } }
    )
  } catch (error) {
    console.error('Error browsing components:', error)
    return NextResponse.json({ error: 'Browse failed' }, { status: 500 })
  }
}
