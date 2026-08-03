/**
 * Pure parsing + sort helpers for the public catalog browse endpoint
 * (`/api/components/browse`). Kept separate from the route so the
 * normalization/clamping logic is unit-testable without a request.
 */

export const BROWSE_CATEGORIES = ['cans', 'iems', 'dac', 'amp', 'dac_amp'] as const
export type BrowseCategory = (typeof BROWSE_CATEGORIES)[number]

export const BROWSE_SORTS = ['brand', 'price_asc', 'price_desc', 'expert'] as const
export type BrowseSort = (typeof BROWSE_SORTS)[number]

export const DEFAULT_PAGE_SIZE = 24
export const MAX_PAGE_SIZE = 60

export interface BrowseParams {
  q: string | null
  category: BrowseCategory | null
  sort: BrowseSort
  page: number
  pageSize: number
}

export interface SortClause {
  column: string
  ascending: boolean
  nullsFirst: boolean
}

function clampInt(raw: string | null, fallback: number, min: number, max: number): number {
  const n = parseInt(raw ?? '', 10)
  if (Number.isNaN(n)) return fallback
  return Math.min(Math.max(n, min), max)
}

export function parseBrowseParams(sp: URLSearchParams): BrowseParams {
  const qRaw = (sp.get('q') ?? '').trim()
  const category = sp.get('category') as BrowseCategory | null
  const sort = sp.get('sort') as BrowseSort | null

  return {
    q: qRaw.length > 0 ? qRaw : null,
    category: category && BROWSE_CATEGORIES.includes(category) ? category : null,
    sort: sort && BROWSE_SORTS.includes(sort) ? sort : 'brand',
    page: clampInt(sp.get('page'), 1, 1, Number.MAX_SAFE_INTEGER),
    pageSize: clampInt(sp.get('pageSize'), DEFAULT_PAGE_SIZE, 1, MAX_PAGE_SIZE),
  }
}

export function browseSearchWords(q: string | null | undefined): string[] {
  if (!q) return []
  return q.trim().toLowerCase().split(/\s+/).filter(Boolean)
}

export function browseSortClauses(sort: BrowseSort): SortClause[] {
  switch (sort) {
    case 'price_asc':
      return [{ column: 'price_new', ascending: true, nullsFirst: false }]
    case 'price_desc':
      return [{ column: 'price_new', ascending: false, nullsFirst: false }]
    case 'expert':
      return [{ column: 'expert_grade_numeric', ascending: false, nullsFirst: false }]
    case 'brand':
    default:
      return [
        { column: 'brand', ascending: true, nullsFirst: false },
        { column: 'name', ascending: true, nullsFirst: false },
      ]
  }
}
