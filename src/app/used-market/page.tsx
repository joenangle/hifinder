'use client'

import { Suspense, useEffect, useState, useRef, useCallback } from 'react'
// import { useSession } from 'next-auth/react' // Unused
import { supabase } from '@/lib/supabase'
import { Component, UsedListing } from '@/types'
import Link from 'next/link'
import { ArrowLeft, Search, SlidersHorizontal, Grid3X3, List } from 'lucide-react'
import { UsedMarketListingCard } from '@/components/UsedMarketListingCard'
import { ComponentDetailModal } from '@/components/ComponentDetailModal'

// Extended listing with component info for display
interface ListingWithComponent extends UsedListing {
  component: Component
}

type ViewMode = 'grid' | 'list'
type SortBy = 'date_desc' | 'price_asc' | 'price_desc'

function UsedMarketContent() {
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
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [sortBy, setSortBy] = useState<SortBy>('date_desc')

  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null)

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
  }, [sortBy, selectedSource, priceRange, selectedConditions, searchQuery])

  // Initial load
  useEffect(() => {
    setPage(1)
    fetchUsedListings(1, true)
  }, [sortBy, selectedSource, priceRange, selectedConditions])

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      fetchUsedListings(1, true)
    }, 500)

    return () => clearTimeout(timer)
  }, [searchQuery])

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
    { value: 'reverb', label: 'Reverb' },
    { value: 'head_fi', label: 'Head-Fi' },
    { value: 'ebay', label: 'eBay' }
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
        <div className="flex items-center justify-between mb-6">
          <div>
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
          
          {/* View Mode Toggle */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-accent text-accent-foreground' 
                  : 'bg-surface-elevated hover:bg-surface-secondary text-muted hover:text-foreground'
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
                  : 'bg-surface-elevated hover:bg-surface-secondary text-muted hover:text-foreground'
              }`}
              aria-label="List view"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
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
            <div className="mt-4 pt-4 border-t border-border">
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

                {/* Price Range */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Price Range</label>
                  <div className="space-y-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={priceRange.min}
                      onChange={(e) => setPriceRange({...priceRange, min: e.target.value})}
                      className="w-full px-3 py-1 bg-surface border border-border rounded text-sm text-foreground placeholder-muted focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={priceRange.max}
                      onChange={(e) => setPriceRange({...priceRange, max: e.target.value})}
                      className="w-full px-3 py-1 bg-surface border border-border rounded text-sm text-foreground placeholder-muted focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

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
            <div className={viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8'
              : 'space-y-4 mb-8'
            }>
              {listings.map(listing => (
                <UsedMarketListingCard
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
    </div>
  )
}

export default function UsedMarketPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    }>
      <UsedMarketContent />
    </Suspense>
  )
}