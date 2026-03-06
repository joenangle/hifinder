'use client'

import { Suspense, useEffect, useState, useRef, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Component, UsedListing } from '@/types'
import Link from 'next/link'
import { ArrowLeft, Search, SlidersHorizontal, Grid3X3, List, MapPin, Bell } from 'lucide-react'
import { MarketplaceListingCard } from '@/components/MarketplaceListingCard'
import { ComponentDetailModal } from '@/components/ComponentDetailModal'
import { FilterButton } from '@/components/FilterButton'
import { US_STATES_LIST, COUNTRIES_LIST } from '@/lib/location-normalizer'
import { createAlert } from '@/lib/alerts'
import { X } from 'lucide-react'

// Extended listing with component info for display
interface ListingWithComponent extends UsedListing {
  component: Component
}

type ViewMode = 'grid' | 'list'
type SortBy = 'date_desc' | 'price_asc' | 'price_desc'

function MarketplaceContent() {
  const { data: session } = useSession()
  const [listings, setListings] = useState<ListingWithComponent[]>([])
  const [loading, setLoading] = useState(true)
  const [alertSaved, setAlertSaved] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [showFilters, setShowFilters] = useState(false)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [selectedConditions, setSelectedConditions] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [dealQuality, setDealQuality] = useState<string[]>([]) // 'great', 'good', 'hideOverpriced'
  const [selectedState, setSelectedState] = useState<string>('all')
  const [selectedCountry, setSelectedCountry] = useState<string>('all')
  const [detectedState, setDetectedState] = useState<string | null>(null)
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [sortBy, setSortBy] = useState<SortBy>('date_desc')

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
  }, [sortBy, selectedSource, selectedConditions, searchQuery, priceRange, selectedCategories, selectedState, selectedCountry, dealQuality])

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
  }, [sortBy, selectedSource, selectedConditions, selectedCategories, selectedState, selectedCountry])

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
  const conditionOptions = ['excellent', 'very_good', 'good', 'fair', 'parts_only']
  const sourceOptions = [
    { value: 'all', label: 'All Sources' },
    { value: 'reddit_avexchange', label: 'r/AVexchange' },
    { value: 'reverb', label: 'Reverb' }
  ]

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
      <main className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <Link href="/" className="text-secondary hover:text-primary transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="heading-1">Used Market</h1>
          </div>
          <p className="text-secondary">
            Showing {listings.length} of {totalCount} used listings
          </p>
        </div>

        {/* Filter Presets */}
        <div className="mb-4 flex flex-wrap gap-2">
          {detectedState && (
            <button
              onClick={() => {
                setSelectedState(detectedState)
                setSelectedCountry('US')
                setDealQuality([])
                setPriceRange({ min: '', max: '' })
                setSelectedCategories([])
                setSelectedConditions([])
                setSelectedSource('all')
              }}
              className={`px-3 py-2 border rounded-md text-sm transition-colors flex items-center gap-1.5 ${
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
              setDealQuality(['great'])
              setPriceRange({ min: '', max: '' })
              setSelectedCategories([])
              setSelectedConditions([])
              setSelectedState('all')
              setSelectedCountry('all')
              setSelectedSource('all')
            }}
            className="px-3 py-2 bg-surface-elevated border border-border hover:border-accent rounded-md text-sm text-primary transition-colors"
          >
            🔥 Hot Deals
          </button>
          <button
            onClick={() => {
              setPriceRange({ min: '', max: '200' })
              setDealQuality([])
              setSelectedCategories([])
              setSelectedConditions([])
              setSelectedState('all')
              setSelectedCountry('all')
              setSelectedSource('all')
            }}
            className="px-3 py-2 bg-surface-elevated border border-border hover:border-accent rounded-md text-sm text-primary transition-colors"
          >
            💰 Budget Picks
          </button>
          <button
            onClick={() => {
              setPriceRange({ min: '1000', max: '' })
              setDealQuality([])
              setSelectedCategories([])
              setSelectedConditions([])
              setSelectedState('all')
              setSelectedCountry('all')
              setSelectedSource('all')
            }}
            className="px-3 py-2 bg-surface-elevated border border-border hover:border-accent rounded-md text-sm text-primary transition-colors"
          >
            ✨ Summit-Fi
          </button>
          <button
            onClick={() => {
              setSelectedCategories(['cans', 'iems'])
              setDealQuality([])
              setPriceRange({ min: '', max: '' })
              setSelectedConditions([])
              setSelectedState('all')
              setSelectedCountry('all')
              setSelectedSource('all')
            }}
            className="px-3 py-2 bg-surface-elevated border border-border hover:border-accent rounded-md text-sm text-primary transition-colors"
          >
            🎧 Listening Gear Only
          </button>
        </div>

        {/* Search and Filters Bar */}
        <div className="bg-surface-elevated rounded-lg p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-secondary" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search headphones, brands, or descriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-md text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
            
            {/* Sort */}
            <div className="lg:w-48">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="w-full px-3 py-2 bg-surface border border-border rounded-md text-primary focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              >
                <option value="date_desc">Newest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-colors ${
                  viewMode === 'grid'
                    ? 'bg-accent text-accent-foreground'
                    : 'bg-surface border border-border hover:bg-surface-secondary text-secondary hover:text-primary'
                }`}
                aria-label="Grid view"
              >
                <Grid3X3 className="w-5 h-5" />
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
                <List className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                showFilters
                  ? 'bg-accent text-accent-foreground'
                  : 'bg-surface border border-border hover:bg-surface-secondary text-primary'
              }`}
            >
              <SlidersHorizontal className="w-5 h-5" />
              Filters
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-border space-y-3">
              {/* Category Filters */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">Category</label>
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
              </div>

              {/* Deal Quality Filters */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">Deal Quality</label>
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
                    label="Great Deals (>25% off)"
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
                    label="Good Deals (10-25% off)"
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

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {/* Source Filter */}
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5">Source</label>
                  <select
                    value={selectedSource}
                    onChange={(e) => setSelectedSource(e.target.value)}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-md text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {sourceOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                {/* Country Filter */}
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5">Country</label>
                  <select
                    value={selectedCountry}
                    onChange={(e) => {
                      setSelectedCountry(e.target.value)
                      if (e.target.value !== 'US') setSelectedState('all')
                    }}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-md text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="all">All Countries</option>
                    {COUNTRIES_LIST.map(c => (
                      <option key={c.code} value={c.code}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* State Filter (US only) */}
                {(selectedCountry === 'all' || selectedCountry === 'US') && (
                  <div>
                    <label className="block text-sm font-medium text-primary mb-1.5">
                      State
                      {detectedState && selectedState === 'all' && (
                        <button
                          onClick={() => {
                            setSelectedState(detectedState)
                            setSelectedCountry('US')
                          }}
                          className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 bg-accent/10 text-accent text-xs rounded-full hover:bg-accent/20 transition-colors"
                        >
                          <MapPin className="w-3 h-3" />
                          Near me ({detectedState})
                        </button>
                      )}
                    </label>
                    <select
                      value={selectedState}
                      onChange={(e) => {
                        setSelectedState(e.target.value)
                        if (e.target.value !== 'all') setSelectedCountry('US')
                      }}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-md text-primary focus:outline-none focus:ring-2 focus:ring-accent"
                    >
                      <option value="all">All States</option>
                      {US_STATES_LIST.map(s => (
                        <option key={s.code} value={s.code}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Condition Filter */}
                <div>
                  <label className="block text-sm font-medium text-primary mb-1.5">Condition</label>
                  <div className="space-y-1.5 max-h-32 overflow-y-auto">
                    {conditionOptions.map(condition => (
                      <label key={condition} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedConditions.includes(condition)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedConditions([...selectedConditions, condition])
                            } else {
                              setSelectedConditions(selectedConditions.filter(c => c !== condition))
                            }
                          }}
                          className="mr-2 rounded border-border text-accent focus:ring-accent"
                        />
                        <span className="text-sm text-primary capitalize">
                          {condition.replace('_', ' ')}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-primary mb-1.5">Price Range</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
                    className="flex-1 px-3 py-2 bg-surface border border-border rounded text-sm text-primary placeholder-muted focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
                    className="flex-1 px-3 py-2 bg-surface border border-border rounded text-sm text-primary placeholder-muted focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Active Filters Summary */}
        {(selectedCategories.length > 0 || dealQuality.length > 0 || selectedConditions.length > 0 || selectedSource !== 'all' || selectedState !== 'all' || selectedCountry !== 'all' || searchQuery || priceRange.min || priceRange.max) && (
          <div className="bg-surface-elevated rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-primary">Active Filters</h3>
              <div className="flex items-center gap-3">
                {session?.user ? (
                  <button
                    onClick={async () => {
                      const userId = (session.user as { id?: string })?.id
                      if (!userId) return
                      const result = await createAlert(userId, {
                        custom_search_query: searchQuery || undefined,
                        target_price: priceRange.max ? parseFloat(priceRange.max) : 9999,
                        alert_type: priceRange.max ? 'below' : 'below',
                        price_range_min: priceRange.min ? parseFloat(priceRange.min) : undefined,
                        price_range_max: priceRange.max ? parseFloat(priceRange.max) : undefined,
                        condition_preference: selectedConditions.length > 0 ? selectedConditions : ['excellent', 'very_good', 'good', 'fair'],
                        marketplace_preference: selectedSource !== 'all' ? [selectedSource] : ['reddit_avexchange', 'reverb'],
                        notification_frequency: 'digest',
                        email_enabled: true,
                      })
                      if (result) {
                        setAlertSaved(true)
                        setTimeout(() => setAlertSaved(false), 3000)
                      }
                    }}
                    disabled={alertSaved}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/10 text-accent text-xs rounded-md hover:bg-accent/20 transition-colors disabled:opacity-50"
                  >
                    <Bell className="w-3 h-3" />
                    {alertSaved ? 'Alert Saved!' : 'Save as Alert'}
                  </button>
                ) : (
                  <Link
                    href="/api/auth/signin"
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-accent/10 text-accent text-xs rounded-md hover:bg-accent/20 transition-colors"
                  >
                    <Bell className="w-3 h-3" />
                    Sign in to save alerts
                  </Link>
                )}
                <button
                  onClick={() => {
                    setSelectedCategories([])
                    setDealQuality([])
                    setSelectedConditions([])
                    setSelectedSource('all')
                    setSelectedState('all')
                    setSelectedCountry('all')
                    setSearchQuery('')
                    setPriceRange({ min: '', max: '' })
                  }}
                  className="text-xs text-accent hover:text-accent-hover transition-colors"
                >
                  Clear All
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-surface border border-border rounded-md text-xs text-primary">
                  Search: {searchQuery}
                  <button
                    onClick={() => setSearchQuery('')}
                    className="hover:text-accent"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedCategories.map(cat => (
                <span key={cat} className="inline-flex items-center gap-1 px-2 py-1 bg-surface border border-border rounded-md text-xs text-primary">
                  {cat === 'cans' ? '🎧 Headphones' :
                   cat === 'iems' ? '👂 IEMs' :
                   cat === 'dac' ? '🔄 DACs' :
                   cat === 'amp' ? '⚡ Amps' :
                   cat === 'dac_amp' ? '🎛️ Combos' : cat}
                  <button
                    onClick={() => setSelectedCategories(selectedCategories.filter(c => c !== cat))}
                    className="hover:text-accent"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {dealQuality.map(deal => (
                <span key={deal} className="inline-flex items-center gap-1 px-2 py-1 bg-surface border border-border rounded-md text-xs text-primary">
                  {deal === 'great' ? '🔥 Great Deals' :
                   deal === 'good' ? '👍 Good Deals' :
                   deal === 'hideOverpriced' ? '🚫 Hide Overpriced' : deal}
                  <button
                    onClick={() => setDealQuality(dealQuality.filter(d => d !== deal))}
                    className="hover:text-accent"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {selectedConditions.map(cond => (
                <span key={cond} className="inline-flex items-center gap-1 px-2 py-1 bg-surface border border-border rounded-md text-xs text-primary capitalize">
                  {cond.replace('_', ' ')}
                  <button
                    onClick={() => setSelectedConditions(selectedConditions.filter(c => c !== cond))}
                    className="hover:text-accent"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
              {selectedSource !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-surface border border-border rounded-md text-xs text-primary">
                  Source: {sourceOptions.find(o => o.value === selectedSource)?.label}
                  <button
                    onClick={() => setSelectedSource('all')}
                    className="hover:text-accent"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedCountry !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-surface border border-border rounded-md text-xs text-primary">
                  {COUNTRIES_LIST.find(c => c.code === selectedCountry)?.name || selectedCountry}
                  <button
                    onClick={() => { setSelectedCountry('all'); setSelectedState('all') }}
                    className="hover:text-accent"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedState !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-surface border border-border rounded-md text-xs text-primary">
                  {US_STATES_LIST.find(s => s.code === selectedState)?.name || selectedState}
                  <button
                    onClick={() => setSelectedState('all')}
                    className="hover:text-accent"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {(priceRange.min || priceRange.max) && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-surface border border-border rounded-md text-xs text-primary">
                  Price: ${priceRange.min || '0'} - ${priceRange.max || '∞'}
                  <button
                    onClick={() => setPriceRange({ min: '', max: '' })}
                    className="hover:text-accent"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
          </div>
        )}

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
              <div className="sticky top-0 z-10 border-b-2 border-border bg-surface backdrop-blur-sm bg-opacity-95">
                <div className="flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold text-muted uppercase tracking-wider">
                  <div className="flex-1 min-w-0">Item</div>
                  <div className="hidden sm:block w-20 flex-shrink-0">Source</div>
                  <div className="hidden sm:block w-16 flex-shrink-0">Cond.</div>
                  <div className="hidden md:block w-28 flex-shrink-0">Seller</div>
                  <div className="hidden lg:block w-16 flex-shrink-0">Loc.</div>
                  <div className="w-12 flex-shrink-0">Age</div>
                  <div className="w-16 flex-shrink-0 text-right">Price</div>
                  <div className="hidden md:block w-14 flex-shrink-0 text-right">MSRP</div>
                  <div className="hidden sm:block w-10 flex-shrink-0 text-right">Deal</div>
                  <div className="w-12 flex-shrink-0"></div>
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
                <p className="text-secondary">You&apos;ve reached the end of the listings</p>
              )}
            </div>
          </>
        )}
      </main>

      {/* Component Detail Modal */}
      {selectedComponent && (
        <ComponentDetailModal
          component={selectedComponent}
          isOpen={modalOpen}
          onClose={() => {
            setModalOpen(false)
            setSelectedComponent(null)
          }}
        />
      )}
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