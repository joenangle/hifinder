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
  }, [sortBy, selectedSource, selectedConditions, searchQuery, priceRange])

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