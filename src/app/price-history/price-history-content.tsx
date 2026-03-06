'use client'

import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, Search, ExternalLink, TrendingUp, Headphones, Ear, Cpu } from 'lucide-react'
import { PriceHistoryChart } from '@/components/PriceHistoryChart'
import { Tooltip } from '@/components/ui/Tooltip'
import { Component } from '@/types'

const FEATURED_SLUG = 'sennheiser-hd650'

interface SoldListing {
  price: number
  condition: string
  date_sold: string
  source: string
  url: string
  is_estimated: boolean
}

interface PriceHistoryData {
  component_id: string
  statistics: {
    count: number
    min: number
    max: number
    median: number
    avg: number
  } | null
  sales: SoldListing[]
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency', currency: 'USD',
    minimumFractionDigits: 0, maximumFractionDigits: 0
  }).format(amount)
}

function sourceLabel(source: string) {
  switch (source) {
    case 'reddit_avexchange': return 'r/AVexchange'
    case 'reverb': return 'Reverb'
    case 'ebay': return 'eBay'
    case 'head_fi': return 'Head-Fi'
    default: return source
  }
}

function categoryLabel(category: string) {
  switch (category) {
    case 'cans': return 'Headphones'
    case 'iems': return 'IEMs'
    case 'dac': return 'DAC'
    case 'amp': return 'Amp'
    case 'dac_amp': return 'DAC/Amp'
    default: return category
  }
}

export function PriceHistoryContent() {
  const searchParams = useSearchParams()
  const router = useRouter()

  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Component[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null)
  const [priceData, setPriceData] = useState<PriceHistoryData | null>(null)
  const [soldSort, setSoldSort] = useState<'date' | 'price_asc' | 'price_desc'>('date')
  const [activeListingsCount, setActiveListingsCount] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [isFeatured, setIsFeatured] = useState(false)

  const searchInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Load component from URL param on mount, or show featured example
  useEffect(() => {
    const modelParam = searchParams.get('model')
    const slug = modelParam || FEATURED_SLUG
    const featured = !modelParam

    fetch(`/api/components/search?q=${encodeURIComponent(slug.replace(/-/g, ' '))}&limit=1`)
      .then(r => r.json())
      .then(data => {
        if (data.length > 0) {
          if (featured) {
            setIsFeatured(true)
          }
          selectComponent(data[0], featured)
        }
      })
      .catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Autocomplete search
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/components/search?q=${encodeURIComponent(query)}&limit=5`)
        if (res.ok) {
          const data = await res.json()
          setSuggestions(data)
          setShowSuggestions(true)
        }
      } catch {
        setSuggestions([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function selectComponent(component: Component, skipUrl = false) {
    setSelectedComponent(component)
    setQuery(`${component.brand} ${component.name}`)
    setShowSuggestions(false)
    setPriceData(null)
    setLoading(true)
    if (!skipUrl) {
      setIsFeatured(false)
    }

    // Update URL (skip for featured example)
    if (!skipUrl) {
      const slug = `${component.brand}-${component.name}`.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
      router.replace(`/price-history?model=${slug}`, { scroll: false })
    }

    // Fetch price history
    fetch(`/api/components/${component.id}/price-history?days=365`)
      .then(r => r.json())
      .then(data => {
        setPriceData(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    // Fetch active listings count
    fetch(`/api/used-listings?component_id=${component.id}&limit=1`)
      .then(r => r.json())
      .then(data => setActiveListingsCount(data.total || 0))
      .catch(() => {})
  }

  const sortedSales = priceData?.sales ? [...priceData.sales].sort((a, b) => {
    switch (soldSort) {
      case 'price_asc': return a.price - b.price
      case 'price_desc': return b.price - a.price
      default: return new Date(b.date_sold).getTime() - new Date(a.date_sold).getTime()
    }
  }) : []

  return (
    <div className="min-h-screen bg-primary">
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <Link href="/marketplace" className="text-secondary hover:text-primary transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="heading-1 flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              Price History
            </h1>
          </div>
          <p className="text-secondary">
            Look up used market prices for any headphone, IEM, DAC, or amp.
          </p>
        </div>

        {/* Search */}
        <div className="relative mb-8" ref={suggestionsRef}>
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Search for a component... (e.g. Sennheiser HD 650)"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                if (selectedComponent) {
                  setSelectedComponent(null)
                  setPriceData(null)
                }
              }}
              onFocus={() => {
                if (selectedComponent) {
                  setQuery('')
                  setSelectedComponent(null)
                  setPriceData(null)
                } else if (suggestions.length > 0) {
                  setShowSuggestions(true)
                }
              }}
              className="w-full pl-12 pr-4 py-3 bg-surface-elevated border border-border rounded-lg text-primary text-lg placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            />
          </div>

          {/* Suggestions dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-surface-elevated border border-border rounded-lg shadow-lg overflow-hidden">
              {suggestions.map((comp) => (
                <button
                  key={comp.id}
                  onClick={() => selectComponent(comp)}
                  className="w-full px-4 py-3 text-left hover:bg-surface-secondary transition-colors flex items-center justify-between"
                >
                  <div>
                    <span className="font-medium text-primary">{comp.brand} {comp.name}</span>
                    <span className="ml-2 text-xs text-muted">{categoryLabel(comp.category)}</span>
                  </div>
                  {comp.price_new && (
                    <span className="text-sm text-muted">MSRP {formatPrice(comp.price_new)}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Selected Component Content */}
        {selectedComponent && (
          <div className="space-y-6">
            {/* Featured banner */}
            {isFeatured && (
              <div className="text-sm text-muted flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4" />
                Featured example — search above to look up any component
              </div>
            )}

            {/* Component Header */}
            <div className="bg-surface-elevated rounded-lg p-6">
              <div className="flex items-start gap-4">
                {/* Product image */}
                <div className="flex-shrink-0 w-20 rounded-lg bg-surface-secondary flex items-center justify-center overflow-hidden self-start">
                  {selectedComponent.image_url ? (
                    <Image
                      src={selectedComponent.image_url}
                      alt={`${selectedComponent.brand} ${selectedComponent.name}`}
                      width={80}
                      height={80}
                      className="w-full h-auto object-contain max-h-24 min-h-10"
                    />
                  ) : ['cans'].includes(selectedComponent.category) ? (
                    <div className="py-4">
                      <Headphones className="w-8 h-8 text-tertiary" />
                    </div>
                  ) : ['iems'].includes(selectedComponent.category) ? (
                    <div className="py-4">
                      <Ear className="w-8 h-8 text-tertiary" />
                    </div>
                  ) : (
                    <div className="py-4">
                      <Cpu className="w-8 h-8 text-tertiary" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-primary">
                        {selectedComponent.brand} {selectedComponent.name}
                      </h2>
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-surface-secondary text-muted">{categoryLabel(selectedComponent.category)}</span>
                        {selectedComponent.driver_type && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-surface-secondary text-muted">{selectedComponent.driver_type}</span>
                        )}
                        {selectedComponent.fit && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-surface-secondary text-muted capitalize">{selectedComponent.fit.replace('_', '-')}</span>
                        )}
                        {selectedComponent.sound_signature && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-surface-secondary text-muted capitalize">{selectedComponent.sound_signature}</span>
                        )}
                        {selectedComponent.impedance && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-surface-secondary text-muted">{selectedComponent.impedance} &#8486;</span>
                        )}
                        {selectedComponent.crin_tone && selectedComponent.crin_tech && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-surface-secondary text-muted">Crin: {selectedComponent.crin_tone}/{selectedComponent.crin_tech}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      {selectedComponent.price_new && (
                        <div>
                          <span className="text-xs text-muted">MSRP</span>
                          <div className="text-lg font-semibold text-primary">{formatPrice(selectedComponent.price_new)}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Market stats summary */}
              {priceData?.statistics && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-surface rounded-lg p-3 text-center">
                    <div className="text-xs text-muted mb-1">Median Used</div>
                    <div className="text-lg font-bold text-primary">{formatPrice(priceData.statistics.median)}</div>
                    {selectedComponent.price_new && (
                      <div className="text-xs text-muted">
                        {Math.round((1 - priceData.statistics.median / selectedComponent.price_new) * 100)}% off MSRP
                      </div>
                    )}
                  </div>
                  <div className="bg-surface rounded-lg p-3 text-center">
                    <div className="text-xs text-muted mb-1">Low</div>
                    <div className="text-lg font-bold text-green-500">{formatPrice(priceData.statistics.min)}</div>
                  </div>
                  <div className="bg-surface rounded-lg p-3 text-center">
                    <div className="text-xs text-muted mb-1">High</div>
                    <div className="text-lg font-bold text-orange-500">{formatPrice(priceData.statistics.max)}</div>
                  </div>
                  <div className="bg-surface rounded-lg p-3 text-center">
                    <div className="text-xs text-muted mb-1">Total Sales</div>
                    <div className="text-lg font-bold text-primary">{priceData.statistics.count}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Price Chart */}
            {loading ? (
              <div className="bg-surface-elevated rounded-lg p-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
              </div>
            ) : (
              <div className="bg-surface-elevated rounded-lg p-6">
                <h3 className="text-lg font-semibold text-primary mb-4">Price Trend</h3>
                <PriceHistoryChart
                  componentId={selectedComponent.id}
                  priceNew={selectedComponent.price_new}
                />
              </div>
            )}

            {/* Active listings CTA */}
            {activeListingsCount !== null && activeListingsCount > 0 && (
              <Link
                href={`/marketplace?search=${encodeURIComponent(`${selectedComponent.brand} ${selectedComponent.name}`)}`}
                className="block bg-surface-elevated rounded-lg p-4 hover:bg-surface-secondary transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-primary font-medium">
                      {activeListingsCount} active listing{activeListingsCount !== 1 ? 's' : ''} available
                    </span>
                    <p className="text-sm text-muted">View on marketplace</p>
                  </div>
                  <ExternalLink className="w-5 h-5 text-muted group-hover:text-accent transition-colors" />
                </div>
              </Link>
            )}

            {/* Sold Listings Table */}
            {sortedSales.length > 0 && (
              <div className="bg-surface-elevated rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-primary">Sold Listings</h3>
                  <select
                    value={soldSort}
                    onChange={(e) => setSoldSort(e.target.value as typeof soldSort)}
                    className="px-3 py-1.5 bg-surface border border-border rounded-md text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="date">Most Recent</option>
                    <option value="price_asc">Price: Low to High</option>
                    <option value="price_desc">Price: High to Low</option>
                  </select>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase">Date</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase hidden sm:table-cell">Condition</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-secondary uppercase hidden sm:table-cell">Source</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-secondary uppercase">Link</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {sortedSales.map((sale, i) => (
                        <tr key={i} className="hover:bg-surface-secondary transition-colors">
                          <td className="px-6 py-3 text-sm text-primary whitespace-nowrap">
                            {new Date(sale.date_sold).toLocaleDateString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric'
                            })}
                          </td>
                          <td className="px-6 py-3 text-sm font-medium text-primary whitespace-nowrap">
                            {formatPrice(sale.price)}
                            {sale.is_estimated && (
                              <span className="ml-1 text-xs text-muted">(est.)</span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-sm text-primary capitalize hidden sm:table-cell">
                            {sale.condition?.replace('_', ' ') || '-'}
                          </td>
                          <td className="px-6 py-3 text-sm text-muted hidden sm:table-cell">
                            {sourceLabel(sale.source)}
                          </td>
                          <td className="px-6 py-3 text-right">
                            {sale.url && sale.url.startsWith('http') ? (
                              <a
                                href={sale.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-accent hover:text-accent-hover text-sm"
                              >
                                <ExternalLink className="w-4 h-4 inline" />
                              </a>
                            ) : sale.url && !sale.url.startsWith('http') ? (
                              <Tooltip content="Sold listing from Reverb Price Guide — no public link available">
                                <ExternalLink className="w-4 h-4 inline text-muted/40 cursor-help" />
                              </Tooltip>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Empty state */}
            {!loading && priceData && !priceData.statistics && (
              <div className="bg-surface-elevated rounded-lg p-8 text-center">
                <p className="text-secondary">No sold price data available for this component yet.</p>
                {activeListingsCount !== null && activeListingsCount > 0 && (
                  <p className="text-sm text-muted mt-2">
                    There {activeListingsCount === 1 ? 'is' : 'are'} {activeListingsCount} active listing{activeListingsCount !== 1 ? 's' : ''} on the marketplace.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Initial empty state (shown briefly before featured example loads) */}
        {!selectedComponent && !loading && (
          <div className="text-center py-16">
            <TrendingUp className="w-12 h-12 text-muted mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-primary mb-2">Check Used Market Prices</h2>
            <p className="text-secondary max-w-md mx-auto">
              Search for any headphone, IEM, DAC, or amp to see price trends, historical sold prices, and current market value.
            </p>
          </div>
        )}
      </main>
    </div>
  )
}
