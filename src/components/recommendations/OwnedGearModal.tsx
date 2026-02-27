'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { Modal } from '@/components/Modal'
import { useDebounce } from '@/hooks/useDebounce'
import { Search } from 'lucide-react'

interface SearchResult {
  id: string
  name: string
  brand: string
  category: string
  price_new: number | null
  price_used_min: number | null
  price_used_max: number | null
  impedance: number | null
  sound_signature: string | null
  needs_amp: boolean
  fit: string | null
}

interface OwnedGearModalProps {
  isOpen: boolean
  onClose: () => void
  onAddOwnedGear: (component: SearchResult) => void
  ownedIds: Set<string>
}

const categoryLabels: Record<string, string> = {
  cans: 'Headphones',
  iems: 'IEMs',
  dac: 'DAC',
  amp: 'Amp',
  dac_amp: 'DAC/Amp Combo',
}

const categoryFilters = [
  { value: '', label: 'All' },
  { value: 'headphones', label: 'Headphones & IEMs' },
  { value: 'dac', label: 'DACs' },
  { value: 'amp', label: 'Amps' },
  { value: 'dac_amp', label: 'Combos' },
]

export function OwnedGearModal({ isOpen, onClose, onAddOwnedGear, ownedIds }: OwnedGearModalProps) {
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debouncedQuery = useDebounce(query, 250)

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      // Small delay to let modal animation start
      const timer = setTimeout(() => inputRef.current?.focus(), 100)
      return () => clearTimeout(timer)
    }
    // Reset state when modal closes
    setQuery('')
    setCategoryFilter('')
    setResults([])
    setHasSearched(false)
  }, [isOpen])

  // Search when debounced query changes
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setResults([])
      setHasSearched(false)
      return
    }

    const search = async () => {
      setLoading(true)
      try {
        const params = new URLSearchParams({ q: debouncedQuery, limit: '10' })
        if (categoryFilter) params.set('category', categoryFilter)
        const res = await fetch(`/api/components/search?${params}`)
        if (res.ok) {
          const data = await res.json()
          setResults(data)
        }
      } catch {
        // Silently handle search errors
      } finally {
        setLoading(false)
        setHasSearched(true)
      }
    }

    search()
  }, [debouncedQuery, categoryFilter])

  const handleSelect = useCallback((component: SearchResult) => {
    onAddOwnedGear(component)
  }, [onAddOwnedGear])

  const fmt = (amount: number) => `$${Math.round(amount).toLocaleString()}`

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Gear You Own" maxWidth="lg">
      <div className="p-4">
        {/* Search input */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tertiary" aria-hidden="true" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by brand or model name..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border bg-secondary text-primary placeholder:text-tertiary focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent text-base sm:text-sm"
          />
          {loading && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-accent border-t-transparent" />
            </div>
          )}
        </div>

        {/* Category filter pills */}
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {categoryFilters.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(cat.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                categoryFilter === cat.value
                  ? 'bg-accent text-white'
                  : 'bg-secondary text-secondary hover:bg-surface-hover border border-subtle'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Results */}
        <div className="min-h-[200px] max-h-[400px] overflow-y-auto">
          {results.length > 0 ? (
            <div className="space-y-1">
              {results.map((item) => {
                const isOwned = ownedIds.has(item.id)
                return (
                  <button
                    key={item.id}
                    onClick={() => !isOwned && handleSelect(item)}
                    disabled={isOwned}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-3 ${
                      isOwned
                        ? 'bg-surface-hover opacity-60 cursor-not-allowed'
                        : 'hover:bg-surface-hover cursor-pointer'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary truncate">
                        <span className="text-secondary font-normal">{item.brand}</span>{' '}
                        {item.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-tertiary">
                          {categoryLabels[item.category] || item.category}
                        </span>
                        {item.impedance && (
                          <span className="text-xs text-tertiary">{item.impedance}&#8486;</span>
                        )}
                        {item.sound_signature && (
                          <span className="text-xs text-tertiary capitalize">{item.sound_signature}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      {isOwned ? (
                        <span className="text-xs font-medium text-tertiary">Already added</span>
                      ) : (
                        <>
                          {item.price_used_min && item.price_used_max ? (
                            <span className="text-xs text-tertiary tabular-nums">
                              {fmt(item.price_used_min)}–{fmt(item.price_used_max)}
                            </span>
                          ) : item.price_new ? (
                            <span className="text-xs text-tertiary tabular-nums">
                              {fmt(item.price_new)} new
                            </span>
                          ) : null}
                          <div className="text-xs font-medium text-accent mt-0.5">
                            + Add
                          </div>
                        </>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          ) : hasSearched && debouncedQuery.length >= 2 ? (
            <div className="text-center py-12">
              <p className="text-sm text-secondary">No components found for &ldquo;{debouncedQuery}&rdquo;</p>
              <p className="text-xs text-tertiary mt-1">Try a different search term or category</p>
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-sm text-secondary">Search for gear you already own</p>
              <p className="text-xs text-tertiary mt-1">
                Adding your existing gear helps us build better system recommendations
              </p>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
