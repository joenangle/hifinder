'use client'

import { Suspense, useEffect, useState, useRef, useCallback } from 'react'
// import { useSession } from 'next-auth/react' // Unused
import { supabase } from '@/lib/supabase'
import { Component, UsedListing } from '@/types'
import Link from 'next/link'
import { ArrowLeft, Search, SlidersHorizontal, Grid3X3, List } from 'lucide-react'
import { MarketplaceListingCard } from '@/components/MarketplaceListingCard'
import { ComponentDetailModal } from '@/components/ComponentDetailModal'
import { Modal } from '@/components/Modal'
import { ImageCarousel } from '@/components/ImageCarousel'
import { FilterButton } from '@/components/FilterButton'
import { X } from 'lucide-react'

// Extended listing with component info for display
interface ListingWithComponent extends UsedListing {
  component: Component
}

type ViewMode = 'grid' | 'list'
type SortBy = 'date_desc' | 'price_asc' | 'price_desc'

function MarketplaceContent() {
  const [listings, setListings] = useState<ListingWithComponent[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const [totalCount, setTotalCount] = useState(0)

  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [showFilters, setShowFilters] = useState(false)

  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSource, setSelectedSource] = useState<string>('all')
  const [selectedConditions, setSelectedConditions] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [dealQuality, setDealQuality] = useState<string[]>([]) // 'great', 'good', 'hideOverpriced'
  const [selectedRegion, setSelectedRegion] = useState<string>('all')
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [sortBy, setSortBy] = useState<SortBy>('date_desc')

  // Modal state - Component details
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null)

  // Modal state - Image viewer
  const [imageModalOpen, setImageModalOpen] = useState(false)
  const [selectedListing, setSelectedListing] = useState<ListingWithComponent | null>(null)

  // Infinite scroll ref
  const observerTarget = useRef<HTMLDivElement>(null)

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

      const response = await fetch(`/api/used-listings?${params.toString()}`)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()

      // DEBUG: Check image data in API response
      console.log('📸 Image Debug - First 3 listings:')
      data.listings.slice(0, 3).forEach((listing: UsedListing, idx: number) => {
        console.log(`Listing ${idx + 1}:`, {
          title: listing.title,
          hasImages: !!listing.images,
          imageCount: listing.images?.length || 0,
          imageUrls: listing.images?.slice(0, 2) || 'none'
        })
      })

      // Fetch component info for each listing
      const listingsWithComponents = await Promise.all(
        data.listings.map(async (listing: UsedListing) => {
          const { data: component } = await supabase
            .from('components')
            .select('*')
            .eq('id', listing.component_id)
            .single()

          return {
            ...listing,
            component
          } as ListingWithComponent
        })
      )

      // Filter by search query (client-side since it involves component data)
      let filteredData = listingsWithComponents
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        filteredData = filteredData.filter(listing =>
          listing.component?.name.toLowerCase().includes(query) ||
          listing.component?.brand.toLowerCase().includes(query) ||
          listing.title.toLowerCase().includes(query) ||
          (listing.description && listing.description.toLowerCase().includes(query))
        )
      }

      // Filter by category
      if (selectedCategories.length > 0) {
        filteredData = filteredData.filter(listing =>
          listing.component && selectedCategories.includes(listing.component.category)
        )
      }

      // Filter by region
      if (selectedRegion !== 'all') {
        filteredData = filteredData.filter(listing => {
          const location = listing.location.toLowerCase()
          switch (selectedRegion) {
            case 'us':
              return location.includes('us') || location.includes('usa') || /\b[A-Z]{2}\b/.test(listing.location)
            case 'canada':
              return location.includes('canada') || location.includes('ca')
            case 'eu':
              return location.includes('uk') || location.includes('europe') || location.includes('germany') ||
                     location.includes('france') || location.includes('spain') || location.includes('italy')
            case 'asia':
              return location.includes('japan') || location.includes('singapore') || location.includes('korea') ||
                     location.includes('china') || location.includes('hong kong')
            default:
              return true
          }
        })
      }

      // Filter by deal quality
      if (dealQuality.length > 0) {
        filteredData = filteredData.filter(listing => {
          if (!listing.component?.price_used_min || !listing.component?.price_used_max) {
            return false // Can't assess deal quality without price data
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
  }, [sortBy, selectedSource, selectedConditions, searchQuery, priceRange, selectedCategories, selectedRegion, dealQuality])

  // Initial load - non-debounced filters (dropdowns, checkboxes)
  useEffect(() => {
    setPage(1)
    fetchUsedListings(1, true)
  }, [sortBy, selectedSource, selectedConditions, fetchUsedListings])

  // Search with debounce (text input)
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchUsedListings(1, true)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery, fetchUsedListings])

  // Price filter with debounce (number inputs - wait for user to finish typing)
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchUsedListings(1, true)
    }, 800)

    return () => clearTimeout(timer)
  }, [priceRange.min, priceRange.max, fetchUsedListings])

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
          <h1 className="text-2xl font-bold text-foreground mb-4">Error Loading Used Market</h1>
          <p className="text-muted mb-6">{error}</p>
          <Link href="/" className="button button-primary">
            Return Home
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <Link href="/" className="text-muted hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="heading-1">Used Market</h1>
          </div>
          <p className="text-muted">
            Showing {listings.length} of {totalCount} used listings
          </p>
        </div>

        {/* Filter Presets */}
        <div className="mb-4 flex flex-wrap gap-2">
          <button
            onClick={() => {
              setDealQuality(['great'])
              setPriceRange({ min: '', max: '' })
              setSelectedCategories([])
              setSelectedConditions([])
              setSelectedRegion('all')
              setSelectedSource('all')
            }}
            className="px-3 py-2 bg-surface-elevated border border-border hover:border-accent rounded-md text-sm text-foreground transition-colors"
          >
            🔥 Hot Deals
          </button>
          <button
            onClick={() => {
              setPriceRange({ min: '', max: '200' })
              setDealQuality([])
              setSelectedCategories([])
              setSelectedConditions([])
              setSelectedRegion('all')
              setSelectedSource('all')
            }}
            className="px-3 py-2 bg-surface-elevated border border-border hover:border-accent rounded-md text-sm text-foreground transition-colors"
          >
            💰 Budget Picks
          </button>
          <button
            onClick={() => {
              setPriceRange({ min: '1000', max: '' })
              setDealQuality([])
              setSelectedCategories([])
              setSelectedConditions([])
              setSelectedRegion('all')
              setSelectedSource('all')
            }}
            className="px-3 py-2 bg-surface-elevated border border-border hover:border-accent rounded-md text-sm text-foreground transition-colors"
          >
            ✨ Summit-Fi
          </button>
          <button
            onClick={() => {
              setSelectedCategories(['cans', 'iems'])
              setDealQuality([])
              setPriceRange({ min: '', max: '' })
              setSelectedConditions([])
              setSelectedRegion('all')
              setSelectedSource('all')
            }}
            className="px-3 py-2 bg-surface-elevated border border-border hover:border-accent rounded-md text-sm text-foreground transition-colors"
          >
            🎧 Listening Gear Only
          </button>
        </div>

        {/* Search and Filters Bar */}
        <div className="bg-surface-elevated rounded-lg p-4 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted" />
              <input
                type="text"
                placeholder="Search headphones, brands, or descriptions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-md text-foreground placeholder-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
              />
            </div>
            
            {/* Sort */}
            <div className="lg:w-48">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortBy)}
                className="w-full px-3 py-2 bg-surface border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent"
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
                    : 'bg-surface border border-border hover:bg-surface-secondary text-muted hover:text-foreground'
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
                    : 'bg-surface border border-border hover:bg-surface-secondary text-muted hover:text-foreground'
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
                  : 'bg-surface border border-border hover:bg-surface-secondary text-foreground'
              }`}
            >
              <SlidersHorizontal className="w-5 h-5" />
              Filters
            </button>
          </div>

          {/* Expanded Filters */}
          {showFilters && (
            <div className="mt-4 pt-4 border-t border-border space-y-4">
              {/* Category Filters */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                <div className="flex flex-wrap gap-2">
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
                <label className="block text-sm font-medium text-foreground mb-2">Deal Quality</label>
                <div className="flex flex-wrap gap-2">
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Source Filter */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Source</label>
                  <select
                    value={selectedSource}
                    onChange={(e) => setSelectedSource(e.target.value)}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {sourceOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                {/* Region Filter */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Region</label>
                  <select
                    value={selectedRegion}
                    onChange={(e) => setSelectedRegion(e.target.value)}
                    className="w-full px-3 py-2 bg-surface border border-border rounded-md text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    <option value="all">All Regions</option>
                    <option value="us">🇺🇸 United States</option>
                    <option value="canada">🇨🇦 Canada</option>
                    <option value="eu">🇪🇺 Europe</option>
                    <option value="asia">🌏 Asia</option>
                  </select>
                </div>

                {/* Condition Filter */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Condition</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
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
                        <span className="text-sm text-foreground capitalize">
                          {condition.replace('_', ' ')}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">Price Range</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
                    className="flex-1 px-3 py-2 bg-surface border border-border rounded text-sm text-foreground placeholder-muted focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
                    className="flex-1 px-3 py-2 bg-surface border border-border rounded text-sm text-foreground placeholder-muted focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Active Filters Summary */}
        {(selectedCategories.length > 0 || dealQuality.length > 0 || selectedConditions.length > 0 || selectedSource !== 'all' || selectedRegion !== 'all' || searchQuery || priceRange.min || priceRange.max) && (
          <div className="bg-surface-elevated rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-foreground">Active Filters</h3>
              <button
                onClick={() => {
                  setSelectedCategories([])
                  setDealQuality([])
                  setSelectedConditions([])
                  setSelectedSource('all')
                  setSelectedRegion('all')
                  setSearchQuery('')
                  setPriceRange({ min: '', max: '' })
                }}
                className="text-xs text-accent hover:text-accent-hover transition-colors"
              >
                Clear All
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {searchQuery && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-surface border border-border rounded-md text-xs text-foreground">
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
                <span key={cat} className="inline-flex items-center gap-1 px-2 py-1 bg-surface border border-border rounded-md text-xs text-foreground">
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
                <span key={deal} className="inline-flex items-center gap-1 px-2 py-1 bg-surface border border-border rounded-md text-xs text-foreground">
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
                <span key={cond} className="inline-flex items-center gap-1 px-2 py-1 bg-surface border border-border rounded-md text-xs text-foreground capitalize">
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
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-surface border border-border rounded-md text-xs text-foreground">
                  Source: {sourceOptions.find(o => o.value === selectedSource)?.label}
                  <button
                    onClick={() => setSelectedSource('all')}
                    className="hover:text-accent"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {selectedRegion !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-surface border border-border rounded-md text-xs text-foreground">
                  Region: {selectedRegion === 'us' ? '🇺🇸 US' :
                           selectedRegion === 'canada' ? '🇨🇦 Canada' :
                           selectedRegion === 'eu' ? '🇪🇺 Europe' :
                           selectedRegion === 'asia' ? '🌏 Asia' : selectedRegion}
                  <button
                    onClick={() => setSelectedRegion('all')}
                    className="hover:text-accent"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {(priceRange.min || priceRange.max) && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-surface border border-border rounded-md text-xs text-foreground">
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
            <h2 className="text-xl font-semibold text-foreground mb-2">No listings found</h2>
            <p className="text-muted mb-6">Try adjusting your filters or search terms</p>
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedSource('all')
                setSelectedConditions([])
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
              <div className="bg-surface-elevated border-b-2 border-border mb-0">
                <div className="flex items-center gap-3 px-4 py-2">
                  {/* Image column */}
                  <div className="w-16 flex-shrink-0">
                    <span className="text-xs font-semibold text-muted uppercase tracking-wide">Image</span>
                  </div>

                  {/* Component Info */}
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-muted uppercase tracking-wide">Item</span>
                  </div>

                  {/* Condition */}
                  <div className="w-24">
                    <span className="text-xs font-semibold text-muted uppercase tracking-wide">Condition</span>
                  </div>

                  {/* Price Analysis */}
                  <div className="w-16">
                    <span className="text-xs font-semibold text-muted uppercase tracking-wide">Deal</span>
                  </div>

                  {/* Location & Seller */}
                  <div className="w-48">
                    <span className="text-xs font-semibold text-muted uppercase tracking-wide">Location / Seller</span>
                  </div>

                  {/* Time */}
                  <div className="w-20">
                    <span className="text-xs font-semibold text-muted uppercase tracking-wide">Posted</span>
                  </div>

                  {/* Price */}
                  <div className="w-24 text-right">
                    <span className="text-xs font-semibold text-muted uppercase tracking-wide">Price</span>
                  </div>

                  {/* Action */}
                  <div className="w-20">
                    <span className="text-xs font-semibold text-muted uppercase tracking-wide">Action</span>
                  </div>
                </div>
              </div>
            )}

            <div className={viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8'
              : 'mb-8'
            }>
              {listings.map(listing => (
                <MarketplaceListingCard
                  key={listing.id}
                  listing={listing}
                  component={listing.component}
                  viewMode={viewMode}
                  onViewDetails={() => {
                    // In list view with images, show image modal
                    // In all other cases, show component details modal
                    if (viewMode === 'list' && listing.images && listing.images.length > 0) {
                      setSelectedListing(listing)
                      setImageModalOpen(true)
                    } else {
                      setSelectedComponent(listing.component)
                      setModalOpen(true)
                    }
                  }}
                />
              ))}
            </div>

            {/* Infinite Scroll Sentinel & Loading Indicator */}
            <div ref={observerTarget} className="flex justify-center py-8">
              {loadingMore && (
                <div className="flex items-center gap-2 text-muted">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-accent"></div>
                  <span>Loading more listings...</span>
                </div>
              )}
              {!hasMore && listings.length > 0 && (
                <p className="text-muted">You&apos;ve reached the end of the listings</p>
              )}
            </div>
          </>
        )}
      </div>
      
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

      {/* Image Viewer Modal */}
      {selectedListing && (
        <Modal
          isOpen={imageModalOpen}
          onClose={() => {
            setImageModalOpen(false)
            setSelectedListing(null)
          }}
          maxWidth="4xl"
        >
          <div className="p-6">
            {/* Component Info Header */}
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-foreground mb-1">
                {selectedListing.component.brand} {selectedListing.component.name}
              </h2>
              <p className="text-sm text-muted">
                ${selectedListing.price} • {selectedListing.location}
              </p>
            </div>

            {/* Image Carousel */}
            <div className="w-full aspect-video bg-surface-secondary rounded-lg overflow-hidden">
              {selectedListing.images && selectedListing.images.length > 0 ? (
                <ImageCarousel
                  images={selectedListing.images}
                  alt={`${selectedListing.component.brand} ${selectedListing.component.name}`}
                  className="w-full h-full"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-muted">
                  <div className="text-center">
                    <svg className="w-16 h-16 mx-auto mb-2 opacity-30" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm">No images available</span>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="mt-4 flex gap-3">
              <a
                href={selectedListing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-accent-foreground rounded-md font-medium transition-colors"
              >
                View Listing
              </a>
              <button
                onClick={() => {
                  // Close image modal and open component details modal
                  setImageModalOpen(false)
                  setSelectedComponent(selectedListing.component)
                  setModalOpen(true)
                }}
                className="flex-1 px-4 py-2 bg-surface-secondary hover:bg-surface-hover text-foreground rounded-md font-medium transition-colors"
              >
                Component Details
              </button>
            </div>
          </div>
        </Modal>
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