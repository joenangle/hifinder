'use client'

import { useEffect, useState } from 'react'
import { useQueryState, parseAsString, parseAsInteger } from 'nuqs'
import { Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { WishlistButton } from '@/components/WishlistButton'
import { FindUsedButton } from '@/components/marketplace/FindUsedButton'
import { DEFAULT_PAGE_SIZE } from '@/lib/browse-params'

interface BrowseItem {
  id: string
  brand: string
  name: string
  category: string
  price_new: number | null
  price_used_min: number | null
  price_used_max: number | null
  image_url: string | null
  sound_signature: string | null
  crin_rank: string | null
  crin_tone: string | null
  crin_tech: string | null
  asr_sinad: number | null
  needs_amp: boolean | null
}

const CATEGORY_FILTERS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'cans', label: 'Headphones' },
  { value: 'iems', label: 'IEMs' },
  { value: 'dac', label: 'DAC' },
  { value: 'amp', label: 'Amp' },
  { value: 'dac_amp', label: 'DAC/Amp' },
]

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'brand', label: 'Brand (A–Z)' },
  { value: 'price_asc', label: 'Price (low to high)' },
  { value: 'price_desc', label: 'Price (high to low)' },
  { value: 'expert', label: 'Expert rating' },
]

const CATEGORY_LABEL: Record<string, string> = {
  cans: 'Headphones',
  iems: 'IEMs',
  dac: 'DAC',
  amp: 'Amp',
  dac_amp: 'DAC/Amp',
}

function priceLabel(item: BrowseItem): string {
  if (item.price_used_min && item.price_used_max) {
    return `$${Math.round(item.price_used_min)}–$${Math.round(item.price_used_max)} used`
  }
  if (item.price_new) return `$${Math.round(item.price_new)} new`
  return 'Price unknown'
}

function expertBadge(item: BrowseItem): string | null {
  if (item.crin_rank) return `Crinacle ${item.crin_rank}`
  if (item.asr_sinad) return `SINAD ${item.asr_sinad}`
  return null
}

export function BrowseCatalog() {
  const [q, setQ] = useQueryState('q', parseAsString.withDefault(''))
  const [category, setCategory] = useQueryState('category', parseAsString.withDefault(''))
  const [sort, setSort] = useQueryState('sort', parseAsString.withDefault('brand'))
  const [page, setPage] = useQueryState('page', parseAsInteger.withDefault(1))

  const [input, setInput] = useState(q)
  const [items, setItems] = useState<BrowseItem[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // Debounce the search box into the URL query (and reset to page 1).
  useEffect(() => {
    const t = setTimeout(() => {
      if (input !== q) {
        setQ(input || null)
        setPage(1)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [input, q, setQ, setPage])

  // Fetch whenever the committed filters change.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (category) params.set('category', category)
    if (sort) params.set('sort', sort)
    params.set('page', String(page))

    fetch(`/api/components/browse?${params.toString()}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return
        setItems(data.items ?? [])
        setTotal(data.total ?? 0)
        setLoading(false)
      })
      .catch(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [q, category, sort, page])

  const totalPages = Math.max(1, Math.ceil(total / DEFAULT_PAGE_SIZE))

  return (
    <div className="min-h-screen bg-primary">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-1">Browse Catalog</h1>
          <p className="text-muted">
            {total.toLocaleString()} component{total === 1 ? '' : 's'} — search, filter, and jump
            straight to used listings.
          </p>
        </header>

        {/* Controls */}
        <div className="flex flex-col gap-4 mb-6">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Search by brand or model (e.g. Sennheiser HD 600)…"
              className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-foreground focus:border-accent outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {CATEGORY_FILTERS.map((c) => (
                <button
                  key={c.value || 'all'}
                  onClick={() => {
                    setCategory(c.value || null)
                    setPage(1)
                  }}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    category === c.value
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-surface-secondary text-muted hover:text-foreground'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value)
                setPage(1)
              }}
              className="px-3 py-1.5 bg-surface border border-border rounded-lg text-sm text-foreground"
              aria-label="Sort components"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <Search className="w-12 h-12 text-muted mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-foreground mb-1">No components found</h2>
            <p className="text-muted">Try a different search or clear the filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {items.map((item) => {
              const badge = expertBadge(item)
              return (
                <div
                  key={item.id}
                  className="bg-surface-elevated border border-border rounded-lg p-4 flex flex-col hover:border-accent transition-colors"
                >
                  {item.image_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image_url}
                      alt={`${item.brand} ${item.name}`}
                      loading="lazy"
                      className="w-full h-32 object-contain mb-3"
                    />
                  )}
                  <div className="flex-1">
                    <div className="text-xs text-muted uppercase tracking-wide mb-0.5">
                      {CATEGORY_LABEL[item.category] ?? item.category}
                    </div>
                    <h3 className="font-semibold text-foreground leading-snug">
                      {item.brand} {item.name}
                    </h3>
                    <div className="mt-1 text-sm text-foreground">{priceLabel(item)}</div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {badge && (
                        <span className="px-2 py-0.5 bg-accent/10 text-accent text-xs rounded">
                          {badge}
                        </span>
                      )}
                      {item.sound_signature && (
                        <span className="px-2 py-0.5 bg-surface-secondary text-muted text-xs rounded capitalize">
                          {item.sound_signature}
                        </span>
                      )}
                      {item.needs_amp && (
                        <span className="px-2 py-0.5 bg-surface-secondary text-muted text-xs rounded">
                          Needs amp
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <FindUsedButton
                      componentId={item.id}
                      componentName={item.name}
                      brand={item.brand}
                      className="flex-1 justify-center text-sm"
                      showText
                    />
                    <WishlistButton componentId={item.id} className="px-3" />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Pagination */}
        {!loading && items.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 mt-8">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-sm disabled:opacity-40 hover:border-accent transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <span className="text-sm text-muted">
              Page {page} of {totalPages}
            </span>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-sm disabled:opacity-40 hover:border-accent transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
