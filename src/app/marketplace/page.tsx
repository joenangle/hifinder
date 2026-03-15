'use client'

import { Suspense, useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { Component, UsedListing } from '@/types'
import Link from 'next/link'
import { Search, SlidersHorizontal, Grid3X3, List, MapPin } from 'lucide-react'
import { MarketplaceListingCard } from '@/components/marketplace/MarketplaceListingCard'
import { ComponentDetailModal } from '@/components/modals/ComponentDetailModal'
import { FilterButton } from '@/components/ui/FilterButton'
import { US_STATES_LIST, COUNTRIES_LIST } from '@/lib/location-normalizer'
import { X } from 'lucide-react'

// Extended listing with component info for display
interface ListingWithComponent extends UsedListing {
  component: Component
}

type ViewMode = 'grid' | 'list'
type SortBy = 'date_desc' | 'price_asc' | 'price_desc'

function MarketplaceContent() {
  const urlParams = useSearchParams()
  const initialSearch = useMemo(() => urlParams.get('search') || '', []) // eslint-disable-line react-hooks/exhaustive-deps
  const initialComponentId = useMemo(() => urlParams.get('component_id') || '', []) // eslint-disable-line react-hooks/exhaustive-deps
  const initialComponentName = useMemo(() => urlParams.get('name') || '', []) // eslint-disable-line react-hooks/exhaustive-deps

  const [listings, setListings] = useState<ListingWithComponent[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [showFilters, setShowFilters] = useState(false)
  const [searchExpanded, setSearchExpanded] = useState(!!initialSearch)

  // Filter state — component_id is an exact filter (from recommendation cards)
  const [filteredComponentId, setFilteredComponentId] = useState(initialComponentId)
  const [filteredComponentName, setFilteredComponentName] = useState(initialComponentName)
  const [searchQuery, setSearchQuery] = useState(initialSearch)
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [selectedConditions, setSelectedConditions] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [dealQuality, setDealQuality] = useState<string[]>([]) // 'great', 'good', 'hideOverpriced'
  const [selectedState, setSelectedState] = useState<string>('all')
  const [selectedCountry, setSelectedCountry] = useState<string>('all')
  const [detectedState, setDetectedState] = useState<string | null>(null)
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [sortBy, setSortBy] = useState<SortBy>('date_desc')
  const [presetTick, setPresetTick] = useState(0) // bumped by presets to bypass price debounce

  // Modal state - Component details
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null)

  // Infinite scroll ref
  const observerTarget = useRef<HTMLDivElement>(null)

  // Search input ref - maintains focus across re-renders
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Fetch used listings with server-side filtering & pagination
  const fetchUsedListings = useCallback(async (pageNum: number, resetListings = false) => {
    try {
      if (pageNum === 1) {
        setLoading(true)
      } else {
        setLoadingMore(true)
      }

      // Build query params
      const params = new URLSearchParams({
        page: pageNum.toString(),
        limit: '50', // Load 50 at a time
        sort: sortBy
      })

      // Exact component filter (from recommendation card links)
      if (filteredComponentId) {
        params.append('component_id', filteredComponentId)
      }

      if (selectedSource && selectedSource !== 'all') {
        params.append('source', selectedSource)
      }

      if (priceRange.min) {
        params.append('min_price', priceRange.min)
      }

      if (priceRange.max) {
        params.append('max_price', priceRange.max)
      }

      if (selectedConditions.length > 0) {
        params.append('conditions', selectedConditions.join(','))
      }

      // Server-side filters (moved from client-side)
      if (selectedCategories.length > 0) {
        params.append('categories', selectedCategories.join(','))
      }

      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }

      if (selectedState && selectedState !== 'all') {
        params.append('state', selectedState)
      }

      if (selectedCountry && selectedCountry !== 'all') {
        params.append('country', selectedCountry)
      }

      const response = await fetch(`/api/used-listings?${params.toString()}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      // Component data is now included in the API response (joined server-side)
      let filteredData = data.listings as ListingWithComponent[]

      // Client-side fuzzy matching for model numbers (e.g., "HD 660" matches "HD660")
      const normalize = (s: string) => s.toLowerCase().replace(/[\s\-]/g, '')
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const normalizedQuery = normalize(searchQuery)
        filteredData = filteredData.filter(listing => {
          const standardMatch =
            listing.component?.name.toLowerCase().includes(query) ||
            listing.component?.brand.toLowerCase().includes(query) ||
            listing.title.toLowerCase().includes(query) ||
            (listing.description && listing.description.toLowerCase().includes(query))
          if (standardMatch) return true
          return (
            normalize(listing.component?.name || '').includes(normalizedQuery) ||
            normalize(listing.title || '').includes(normalizedQuery)
          )
        })
      }

      // Deal quality filter (kept client-side — requires component price data for comparison)
      if (dealQuality.length > 0) {
        filteredData = filteredData.filter(listing => {
          if (!listing.component?.price_used_min || !listing.component?.price_used_max) {
            return false
          }

          const expectedAvg = (listing.component.price_used_min + listing.component.price_used_max) / 2
          const percentage = ((listing.price - expectedAvg) / expectedAvg) * 100

          let meetsFilter = false
          if (dealQuality.includes('great') && percentage < -25) meetsFilter = true
          if (dealQuality.includes('good') && percentage >= -25 && percentage < -10) meetsFilter = true
          if (dealQuality.includes('hideOverpriced') && percentage <= 30) meetsFilter = true

          return meetsFilter
        })
      }

      setTotalCount(data.total)
      setHasMore(pageNum < data.total_pages)

      if (resetListings || pageNum === 1) {
        setListings(filteredData)
      } else {
        setListings(prev => [...prev, ...filteredData])
      }

    } catch (err) {
      console.error('Error fetching used listings:', err)
      setError(err instanceof Error ? err.message : 'Failed to load used market listings')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [sortBy, selectedSource, selectedConditions, searchQuery, priceRange, selectedCategories, selectedState, selectedCountry, dealQuality, filteredComponentId])

  // IP geolocation — detect user's state on mount
  useEffect(() => {
    const cached = sessionStorage.getItem('hf_detected_state')
    if (cached) {
      setDetectedState(cached)
      return
    }
    fetch('http://ip-api.com/json/?fields=regionName,countryCode,region')
      .then(r => r.json())
      .then(data => {
        if (data.countryCode === 'US' && data.region) {
          setDetectedState(data.region)
          sessionStorage.setItem('hf_detected_state', data.region)
        }
      })
      .catch(() => {}) // Silently fail — geolocation is optional
  }, [])

  // Initial load - non-debounced filters (dropdowns, checkboxes)
  useEffect(() => {
    setPage(1)
    fetchUsedListings(1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortBy, selectedSource, selectedConditions, selectedCategories, selectedState, selectedCountry, dealQuality, presetTick, filteredComponentId])

  // Search with debounce (text input - 800ms to let user finish typing model names)
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchUsedListings(1, true)
    }, 800)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

  // Price filter with debounce (number inputs - wait for user to finish typing)
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchUsedListings(1, true)
    }, 800)

    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceRange.min, priceRange.max])

  // Infinite scroll observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading && !loadingMore) {
          const nextPage = page + 1
          setPage(nextPage)
          fetchUsedListings(nextPage, false)
        }
      },
      { threshold: 0.1 }
    )

    const currentTarget = observerTarget.current
    if (currentTarget) {
      observer.observe(currentTarget)
    }

    return () => {
      if (currentTarget) {
        observer.unobserve(currentTarget)
      }
    }
  }, [hasMore, loading, loadingMore, page, fetchUsedListings])

  // Get unique filter options (simplified - we'll fetch these from API in future)

  const sourceOptions = [
    { value: 'all', label: 'All Sources' },
    { value: 'reddit_avexchange', label: 'r/AVexchange' },
    { value: 'reverb', label: 'Reverb' }
  ]

  const modalElement = selectedComponent && (
    <ComponentDetailModal
      component={selectedComponent}
      isOpen={modalOpen}
      onClose={() => {
        setModalOpen(false)
        setSelectedComponent(null)
      }}
    />
  )

  if (loading) {
    return (
      <div className="min-h-screen bg-surface">
        <div className="container mx-auto px-4 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-surface-elevated rounded w-1/4 mb-6"></div>
            <div className="h-12 bg-surface-elevated rounded mb-6"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 bg-surface-elevated rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
        {modalElement}
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary mb-4">Error Loading Used Market</h1>
          <p className="text-secondary mb-6">{error}</p>
          <Link href="/" className="button button-primary">
            Return Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-primary">
      <main className="container mx-auto px-4 py-4 sm:py-8">
        {/* Filter Presets - horizontal scroll on mobile */}
        <div className="lg:hidden mb-1.5 flex gap-2 overflow-x-auto scrollbar-hide">
          {detectedState && (
            <button
              onClick={() => {
                if (selectedState === detectedState) {
                  setSelectedState('all')
                  setSelectedCountry('all')
                } else {
                  setSelectedState(detectedState)
                  setSelectedCountry('US')
                }
              }}
              className={`shrink-0 px-2.5 py-1.5 sm:px-3 sm:py-2 border rounded-md text-sm transition-colors flex items-center gap-1.5 ${
                selectedState === detectedState
                  ? 'bg-accent text-accent-foreground border-accent'
                  : 'bg-surface-elevated border-border hover:border-accent text-primary'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              Near Me ({detectedState})
            </button>
          )}
          <button
            onClick={() => {
              if (dealQuality.includes('great')) {
                setDealQuality(dealQuality.filter(d => d !== 'great'))
              } else {
                setDealQuality([...dealQuality.filter(d => d !== 'great'), 'great'])
              }
            }}
            className={`shrink-0 px-2.5 py-1.5 sm:px-3 sm:py-2 border rounded-md text-sm transition-colors ${
              dealQuality.includes('great')
                ? 'bg-accent text-accent-foreground border-accent'
                : 'bg-surface-elevated border-border hover:border-accent text-primary'
            }`}
          >
            🔥 Hot Deals
          </button>
          <button
            onClick={() => {
              if (priceRange.max === '200' && !priceRange.min) {
                setPriceRange({ min: '', max: '' })
              } else {
                setPriceRange({ min: '', max: '200' })
              }
              setPresetTick(t => t + 1)
            }}
            className={`shrink-0 px-2.5 py-1.5 sm:px-3 sm:py-2 border rounded-md text-sm transition-colors ${
              priceRange.max === '200' && !priceRange.min
                ? 'bg-accent text-accent-foreground border-accent'
                : 'bg-surface-elevated border-border hover:border-accent text-primary'
            }`}
          >
            💰 Budget Picks
          </button>
          <button
            onClick={() => {
              if (priceRange.min === '1000' && !priceRange.max) {
                setPriceRange({ min: '', max: '' })
              } else {
                setPriceRange({ min: '1000', max: '' })
              }
              setPresetTick(t => t + 1)
            }}
            className={`shrink-0 px-2.5 py-1.5 sm:px-3 sm:py-2 border rounded-md text-sm transition-colors ${
              priceRange.min === '1000' && !priceRange.max
                ? 'bg-accent text-accent-foreground border-accent'
                : 'bg-surface-elevated border-border hover:border-accent text-primary'
            }`}
          >
            ✨ Summit-Fi
          </button>
          <button
            onClick={() => {
              const isActive = selectedCategories.includes('cans') && selectedCategories.includes('iems') && selectedCategories.length === 2
              if (isActive) {
                setSelectedCategories([])
              } else {
                setSelectedCategories(['cans', 'iems'])
              }
            }}
            className={`shrink-0 px-2.5 py-1.5 sm:px-3 sm:py-2 border rounded-md text-sm transition-colors ${
              selectedCategories.includes('cans') && selectedCategories.includes('iems') && selectedCategories.length === 2
                ? 'bg-accent text-accent-foreground border-accent'
                : 'bg-surface-elevated border-border hover:border-accent text-primary'
            }`}
          >
            🎧 Listening Gear Only
          </button>
        </div>

        {/* Component filter chip — shown when navigating from a recommendation card */}
        {filteredComponentId && filteredComponentName && (
          <div className="flex items-center gap-2 mb-2 lg:mb-3 px-1">
            <span className="text-sm text-secondary">Showing listings for</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-accent/10 text-accent border border-accent/20">
              {filteredComponentName}
              <button
                onClick={() => {
                  setFilteredComponentId('')
                  setFilteredComponentName('')
                  // Clear URL params without full reload
                  window.history.replaceState({}, '', '/marketplace')
                }}
                className="ml-0.5 p-0.5 rounded-full hover:bg-accent/20 transition-colors"
                aria-label="Clear component filter"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          </div>
        )}

        {/* Search and Filters Bar */}
        <div className="bg-surface-elevated rounded-lg p-2.5 lg:p-4 mb-2 lg:mb-6">
          {/* Mobile controls - single compact row */}
          <div className="flex lg:hidden items-center gap-2">
            {searchExpanded ? (
              <div className="flex-1 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
                <input
                  ref={searchInputRef}
                  autoFocus
                  type="text"
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-9 py-2 bg-surface border border-border rounded-md text-sm text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                />
                <button
                  onClick={() => setSearchExpanded(false)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-secondary hover:text-primary"
                  aria-label="Close search"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setSearchExpanded(true)}
                  className="relative p-2 rounded-md bg-surface border border-border hover:bg-surface-secondary text-secondary hover:text-primary transition-colors"
                  aria-label="Search"
                >
                  <Search className="w-4 h-4" />
                  {searchQuery && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-accent rounded-full" />
                  )}
                </button>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortBy)}
                  className="flex-1 min-w-0 px-2 py-2 bg-surface border border-border rounded-md text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
                >
                  <option value="date_desc">Newest First</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                </select>
                <div className="flex gap-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'grid'
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-surface border border-border hover:bg-surface-secondary text-secondary hover:text-primary'
                    }`}
                    aria-label="Grid view"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded-md transition-colors ${
                      viewMode === 'list'
                        ? 'bg-accent text-accent-foreground'
                        : 'bg-surface border border-border hover:bg-surface-secondary text-secondary hover:text-primary'
                    }`}
                    aria-label="List view"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`p-2 rounded-md transition-colors ${
                    showFilters
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-surface border border-border hover:bg-surface-secondary text-secondary hover:text-primary'
                  }`}
                  aria-label="Filters"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {/* Desktop controls - single row: presets + search + sort + view + filters */}
          <div className="hidden lg:flex items-center gap-2">
            {/* Preset pills */}
            <div className="flex items-center gap-1.5 shrink-0">
              {detectedState && (
                <button
                  onClick={() => {
                    if (selectedState === detectedState) {
                      setSelectedState('all')
                      setSelectedCountry('all')
                    } else {
                      setSelectedState(detectedState)
                      setSelectedCountry('US')
                    }
                  }}
                  className={`shrink-0 px-2.5 py-1.5 border rounded-md text-sm transition-colors flex items-center gap-1.5 ${
                    selectedState === detectedState
                      ? 'bg-accent text-accent-foreground border-accent'
                      : 'bg-surface border-border hover:border-accent text-primary'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  Near Me ({detectedState})
                </button>
              )}
              <button
                onClick={() => {
                  if (dealQuality.includes('great')) {
                    setDealQuality(dealQuality.filter(d => d !== 'great'))
                  } else {
                    setDealQuality([...dealQuality.filter(d => d !== 'great'), 'great'])
                  }
                }}
                className={`shrink-0 px-2.5 py-1.5 border rounded-md text-sm transition-colors ${
                  dealQuality.includes('great')
                    ? 'bg-accent text-accent-foreground border-accent'
                    : 'bg-surface border-border hover:border-accent text-primary'
                }`}
              >
                🔥 Hot Deals
              </button>
              <button
                onClick={() => {
                  if (priceRange.max === '200' && !priceRange.min) {
                    setPriceRange({ min: '', max: '' })
                  } else {
                    setPriceRange({ min: '', max: '200' })
                  }
                  setPresetTick(t => t + 1)
                }}
                className={`shrink-0 px-2.5 py-1.5 border rounded-md text-sm transition-colors ${
                  priceRange.max === '200' && !priceRange.min
                    ? 'bg-accent text-accent-foreground border-accent'
                    : 'bg-surface border-border hover:border-accent text-primary'
                }`}
              >
                💰 Budget Picks
              </button>
              <button
                onClick={() => {
                  if (priceRange.min === '1000' && !priceRange.max) {
                    setPriceRange({ min: '', max: '' })
                  } else {
                    setPriceRange({ min: '1000', max: '' })
                  }
                  setPresetTick(t => t + 1)
                }}
                className={`shrink-0 px-2.5 py-1.5 border rounded-md text-sm transition-colors ${
                  priceRange.min === '1000' && !priceRange.max
                    ? 'bg-accent text-accent-foreground border-accent'
                    : 'bg-surface border-border hover:border-accent text-primary'
                }`}
              >
                ✨ Summit-Fi
              </button>
              <button
                onClick={() => {
                  const isActive = selectedCategories.includes('cans') && selectedCategories.includes('iems') && selectedCategories.length === 2
                  if (isActive) {
                    setSelectedCategories([])
                  } else {
                    setSelectedCategories(['cans', 'iems'])
                  }
                }}
                className={`shrink-0 px-2.5 py-1.5 border rounded-md text-sm transition-colors ${
                  selectedCategories.includes('cans') && selectedCategories.includes('iems') && selectedCategories.length === 2
                    ? 'bg-accent text-accent-foreground border-accent'
                    : 'bg-surface border-border hover:border-accent text-primary'
                }`}
              >
                🎧 Listening Gear Only
              </button>
            </div>

            {/* Search */}
            <div className="flex-1 min-w-[180px] relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-surface border border-border rounded-md text-sm text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>

            {/* Sort */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="shrink-0 px-2.5 py-1.5 bg-surface border border-border rounded-md text-sm text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
            >
              <option value="date_desc">Newest First</option>
              <option value="price_asc">Price: Low → High</option>
              <option value="price_desc">Price: High → Low</option>
            </select>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-surface border border-border hover:bg-surface-secondary text-secondary hover:text-primary'
                }`}
                aria-label="Grid view"
              >
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-md transition-colors ${
                  viewMode === 'list'
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-surface border border-border hover:bg-surface-secondary text-secondary hover:text-primary'
                }`}
                aria-label="List view"
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors ${
                showFilters
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-surface border border-border hover:bg-surface-secondary text-primary'
              }`}
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
            </button>
          </div>

          {/* Expanded Filters — compact 2-row layout */}
          {showFilters && (
            <div className="mt-3 pt-3 border-t border-border space-y-2">
              {/* Row 1: Category + Deal Quality */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider shrink-0">Category</span>
                <div className="flex flex-wrap gap-1.5">
                  <FilterButton
                    active={selectedCategories.includes('cans')}
                    onClick={() => {
                      if (selectedCategories.includes('cans')) {
                        setSelectedCategories(selectedCategories.filter(c => c !== 'cans'))
                      } else {
                        setSelectedCategories([...selectedCategories, 'cans'])
                      }
                    }}
                    icon="🎧"
                    label="Headphones"
                    activeClass="bg-purple-100 text-purple-800 border-purple-300"
                  />
                  <FilterButton
                    active={selectedCategories.includes('iems')}
                    onClick={() => {
                      if (selectedCategories.includes('iems')) {
                        setSelectedCategories(selectedCategories.filter(c => c !== 'iems'))
                      } else {
                        setSelectedCategories([...selectedCategories, 'iems'])
                      }
                    }}
                    icon="👂"
                    label="IEMs"
                    activeClass="bg-indigo-100 text-indigo-800 border-indigo-300"
                  />
                  <FilterButton
                    active={selectedCategories.includes('dac')}
                    onClick={() => {
                      if (selectedCategories.includes('dac')) {
                        setSelectedCategories(selectedCategories.filter(c => c !== 'dac'))
                      } else {
                        setSelectedCategories([...selectedCategories, 'dac'])
                      }
                    }}
                    icon="🔄"
                    label="DACs"
                    activeClass="bg-blue-100 text-blue-800 border-blue-300"
                  />
                  <FilterButton
                    active={selectedCategories.includes('amp')}
                    onClick={() => {
                      if (selectedCategories.includes('amp')) {
                        setSelectedCategories(selectedCategories.filter(c => c !== 'amp'))
                      } else {
                        setSelectedCategories([...selectedCategories, 'amp'])
                      }
                    }}
                    icon="⚡"
                    label="Amps"
                    activeClass="bg-cyan-100 text-cyan-800 border-cyan-300"
                  />
                  <FilterButton
                    active={selectedCategories.includes('dac_amp')}
                    onClick={() => {
                      if (selectedCategories.includes('dac_amp')) {
                        setSelectedCategories(selectedCategories.filter(c => c !== 'dac_amp'))
                      } else {
                        setSelectedCategories([...selectedCategories, 'dac_amp'])
                      }
                    }}
                    icon="🎛️"
                    label="Combos"
                    activeClass="bg-teal-100 text-teal-800 border-teal-300"
                  />
                </div>
                <span className="hidden sm:block w-px h-5 bg-border shrink-0" />
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider shrink-0">Deals</span>
                <div className="flex flex-wrap gap-1.5">
                  <FilterButton
                    active={dealQuality.includes('great')}
                    onClick={() => {
                      if (dealQuality.includes('great')) {
                        setDealQuality(dealQuality.filter(d => d !== 'great'))
                      } else {
                        setDealQuality([...dealQuality, 'great'])
                      }
                    }}
                    icon="🔥"
                    label="Great (>25% off)"
                    activeClass="bg-green-100 text-green-800 border-green-300"
                  />
                  <FilterButton
                    active={dealQuality.includes('good')}
                    onClick={() => {
                      if (dealQuality.includes('good')) {
                        setDealQuality(dealQuality.filter(d => d !== 'good'))
                      } else {
                        setDealQuality([...dealQuality, 'good'])
                      }
                    }}
                    icon="👍"
                    label="Good (10-25% off)"
                    activeClass="bg-blue-100 text-blue-800 border-blue-300"
                  />
                  <FilterButton
                    active={dealQuality.includes('hideOverpriced')}
                    onClick={() => {
                      if (dealQuality.includes('hideOverpriced')) {
                        setDealQuality(dealQuality.filter(d => d !== 'hideOverpriced'))
                      } else {
                        setDealQuality([...dealQuality, 'hideOverpriced'])
                      }
                    }}
                    icon="🚫"
                    label="Hide Overpriced"
                    activeClass="bg-red-100 text-red-800 border-red-300"
                  />
                </div>
              </div>

              {/* Row 2: Condition + Source/Location dropdowns + Price */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <span className="text-[11px] font-semibold text-muted uppercase tracking-wider shrink-0">Condition</span>
                <div className="flex flex-wrap gap-1.5">
                  <FilterButton
                    active={selectedConditions.includes('excellent')}
                    onClick={() => {
                      if (selectedConditions.includes('excellent')) {
                        setSelectedConditions(selectedConditions.filter(c => c !== 'excellent'))
                      } else {
                        setSelectedConditions([...selectedConditions, 'excellent'])
                      }
                    }}
                    icon="✨"
                    label="Excellent"
                    activeClass="bg-green-100 text-green-800 border-green-300"
                  />
                  <FilterButton
                    active={selectedConditions.includes('very_good')}
                    onClick={() => {
                      if (selectedConditions.includes('very_good')) {
                        setSelectedConditions(selectedConditions.filter(c => c !== 'very_good'))
                      } else {
                        setSelectedConditions([...selectedConditions, 'very_good'])
                      }
                    }}
                    icon="👍"
                    label="Very Good"
                    activeClass="bg-blue-100 text-blue-800 border-blue-300"
                  />
                  <FilterButton
                    active={selectedConditions.includes('good')}
                    onClick={() => {
                      if (selectedConditions.includes('good')) {
                        setSelectedConditions(selectedConditions.filter(c => c !== 'good'))
                      } else {
                        setSelectedConditions([...selectedConditions, 'good'])
                      }
                    }}
                    icon="👌"
                    label="Good"
                    activeClass="bg-amber-100 text-amber-800 border-amber-300"
                  />
                  <FilterButton
                    active={selectedConditions.includes('fair')}
                    onClick={() => {
                      if (selectedConditions.includes('fair')) {
                        setSelectedConditions(selectedConditions.filter(c => c !== 'fair'))
                      } else {
                        setSelectedConditions([...selectedConditions, 'fair'])
                      }
                    }}
                    icon="⚠️"
                    label="Fair"
                    activeClass="bg-orange-100 text-orange-800 border-orange-300"
                  />
                  <FilterButton
                    active={selectedConditions.includes('parts_only')}
                    onClick={() => {
                      if (selectedConditions.includes('parts_only')) {
                        setSelectedConditions(selectedConditions.filter(c => c !== 'parts_only'))
                      } else {
                        setSelectedConditions([...selectedConditions, 'parts_only'])
                      }
                    }}
                    icon="🔧"
                    label="Parts Only"
                    activeClass="bg-red-100 text-red-800 border-red-300"
                  />
                </div>
                <span className="hidden sm:block w-px h-5 bg-border shrink-0" />
                <div className="flex flex-wrap items-center gap-1.5">
                  <select
                    value={selectedSource}
                    onChange={(e) => setSelectedSource(e.target.value)}
                    className="px-2 py-1 bg-surface border border-border rounded-md text-xs text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    {sourceOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <select
                    value={selectedCountry}
                    onChange={(e) => {
                      setSelectedCountry(e.target.value)
                      if (e.target.value !== 'US') setSelectedState('all')
                    }}
                    className="px-2 py-1 bg-surface border border-border rounded-md text-xs text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="all">All Countries</option>
                    {COUNTRIES_LIST.map(c => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                  {(selectedCountry === 'all' || selectedCountry === 'US') && (
                    <select
                      value={selectedState}
                      onChange={(e) => {
                        setSelectedState(e.target.value)
                        if (e.target.value !== 'all') setSelectedCountry('US')
                      }}
                      className="px-2 py-1 bg-surface border border-border rounded-md text-xs text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      <option value="all">All States</option>
                      {US_STATES_LIST.map(s => (
                        <option key={s.code} value={s.code}>{s.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <span className="hidden sm:block w-px h-5 bg-border shrink-0" />
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-muted uppercase tracking-wider shrink-0">Price</span>
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
                    className="w-[72px] px-2 py-1 bg-surface border border-border rounded-md text-xs text-primary placeholder-muted focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <span className="text-muted text-xs">–</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
                    className="w-[72px] px-2 py-1 bg-surface border border-border rounded-md text-xs text-primary placeholder-muted focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Listings Grid/List */}
        {listings.length === 0 && !loading ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-primary mb-2">No listings found</h2>
            <p className="text-secondary mb-6">Try adjusting your filters or search terms</p>
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedSource('all')
                setSelectedConditions([])
                setSelectedCategories([])
                setDealQuality([])
                setSelectedState('all')
                setSelectedCountry('all')
                setPriceRange({ min: '', max: '' })
              }}
              className="button button-secondary"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <>
            {viewMode === 'list' && (
              <div className="sticky top-0 z-10 bg-surface backdrop-blur-sm bg-opacity-95">
                <div className="flex items-center gap-2 px-3 py-1.5 border-b-2 border-border text-[11px] font-semibold text-muted uppercase tracking-wider">
                  <div className="flex-1 min-w-0 flex items-center gap-3">
                    Item
                    <span className="hidden sm:inline-flex items-center gap-3 font-normal normal-case tracking-normal text-xs text-muted">
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-sm bg-green-500 dark:bg-green-400" />
                        Great deal
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-sm bg-blue-500 dark:bg-blue-400" />
                        Good deal
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-sm bg-red-400 dark:bg-red-500" />
                        Overpriced
                      </span>
                    </span>
                  </div>
                  <div className="hidden sm:block w-20 flex-shrink-0">Source</div>
                  <div className="hidden md:block w-28 flex-shrink-0">Notes</div>
                  <div className="hidden lg:block w-16 flex-shrink-0">Loc.</div>
                  <div className="w-12 flex-shrink-0">Age</div>
                  <div className="w-16 flex-shrink-0 text-right">Price</div>
                  <div className="hidden md:block w-14 flex-shrink-0 text-right">MSRP</div>
                  <div className="w-16 flex-shrink-0"></div>
                </div>
              </div>
            )}

            <div className={viewMode === 'grid'
              ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 mb-8'
              : 'mb-8'
            }>
              {listings.filter(l => l.component).map(listing => (
                <MarketplaceListingCard
                  key={listing.id}
                  listing={listing}
                  component={listing.component}
                  viewMode={viewMode}
                  onViewDetails={() => {
                    setSelectedComponent(listing.component)
                    setModalOpen(true)
                  }}
                />
              ))}
            </div>

            {/* Infinite Scroll Sentinel & Loading Indicator */}
            <div ref={observerTarget} className="flex justify-center py-8">
              {loadingMore && (
                <div className="flex items-center gap-2 text-secondary">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
                  <span>Loading more listings...</span>
                </div>
              )}
              {!hasMore && listings.length > 0 && (
                <p className="text-secondary">
                  Showing {listings.length} of {totalCount} listings &middot; You&apos;ve reached the end
                </p>
              )}
            </div>
          </>
        )}
      </main>

      {modalElement}
    </div>
  )
}

export default function MarketplacePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    }>
      <MarketplaceContent />
    </Suspense>
  )
}