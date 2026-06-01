/**
 * Serialize / parse marketplace filter state to and from URL query params.
 *
 * Used by the marketplace page (to initialize all filters from the URL on
 * mount) and by saved searches (to store a filter set as a query string and
 * reconstruct it by navigating to /marketplace?<query_string>).
 */

export interface MarketplaceFilters {
  search: string
  source: string
  conditions: string[]
  categories: string[]
  dealQuality: string[]
  minPrice: string
  maxPrice: string
  state: string
  country: string
  sort: string
}

export const MARKETPLACE_SORTS = ['date_desc', 'price_asc', 'price_desc'] as const

export const DEFAULT_MARKETPLACE_FILTERS: MarketplaceFilters = {
  search: '',
  source: 'all',
  conditions: [],
  categories: [],
  dealQuality: [],
  minPrice: '',
  maxPrice: '',
  state: 'all',
  country: 'all',
  sort: 'date_desc',
}

function parseCsv(raw: string | null): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

export function parseMarketplaceParams(sp: URLSearchParams): MarketplaceFilters {
  const sortRaw = sp.get('sort')
  return {
    search: sp.get('search') ?? '',
    source: sp.get('source') || 'all',
    conditions: parseCsv(sp.get('conditions')),
    categories: parseCsv(sp.get('categories')),
    dealQuality: parseCsv(sp.get('deal')),
    minPrice: sp.get('min_price') ?? '',
    maxPrice: sp.get('max_price') ?? '',
    state: sp.get('state') || 'all',
    country: sp.get('country') || 'all',
    sort: MARKETPLACE_SORTS.includes(sortRaw as (typeof MARKETPLACE_SORTS)[number])
      ? (sortRaw as string)
      : 'date_desc',
  }
}

export function serializeMarketplaceParams(f: MarketplaceFilters): string {
  const params = new URLSearchParams()
  if (f.search) params.set('search', f.search)
  if (f.source && f.source !== 'all') params.set('source', f.source)
  if (f.conditions.length) params.set('conditions', f.conditions.join(','))
  if (f.categories.length) params.set('categories', f.categories.join(','))
  if (f.dealQuality.length) params.set('deal', f.dealQuality.join(','))
  if (f.minPrice) params.set('min_price', f.minPrice)
  if (f.maxPrice) params.set('max_price', f.maxPrice)
  if (f.state && f.state !== 'all') params.set('state', f.state)
  if (f.country && f.country !== 'all') params.set('country', f.country)
  if (f.sort && f.sort !== 'date_desc') params.set('sort', f.sort)
  return params.toString()
}
