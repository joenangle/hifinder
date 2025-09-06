'use client'

import { Suspense, useEffect, useState } from 'react'
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
type SortBy = 'newest' | 'price_low' | 'price_high' | 'relevance'

function UsedMarketContent() {
  const [listings, setListings] = useState<ListingWithComponent[]>([])
  const [filteredListings, setFilteredListings] = useState<ListingWithComponent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // UI state
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [showFilters, setShowFilters] = useState(false)
  
  // Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSources, setSelectedSources] = useState<string[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedBrands, setSelectedBrands] = useState<string[]>([])
  const [selectedConditions, setSelectedConditions] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState({ min: '', max: '' })
  const [sortBy, setSortBy] = useState<SortBy>('newest')
  
  // Modal state
  const [modalOpen, setModalOpen] = useState(false)
  const [selectedComponent, setSelectedComponent] = useState<Component | null>(null)

  // Fetch all used listings with component info
  useEffect(() => {
    async function fetchUsedListings() {
      try {
        setLoading(true)
        
        const { data: listingsData, error: listingsError } = await supabase
          .from('used_listings')
          .select(`
            *,
            components (
              id,
              name,
              brand,
              category,
              price_new,
              price_used_min,
              price_used_max,
              impedance,
              needs_amp,
              amazon_url
            )
          `)
          .eq('is_active', true)
          .order('date_posted', { ascending: false })

        if (listingsError) {
          throw listingsError
        }

        if (!listingsData) {
          setListings([])
          setFilteredListings([])
          return
        }

        // Transform the data to match our interface
        const transformedListings: ListingWithComponent[] = listingsData
          .filter(listing => listing.components) // Only include listings with valid components
          .map(listing => ({
            ...listing,
            component: Array.isArray(listing.components) ? listing.components[0] : listing.components
          }))

        setListings(transformedListings)
        setFilteredListings(transformedListings)

      } catch (err) {
        console.error('Error fetching used listings:', err)
        setError(err instanceof Error ? err.message : 'Failed to load used market listings')
      } finally {
        setLoading(false)
      }
    }

    fetchUsedListings()
  }, [])

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...listings]

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(listing => 
        listing.component.name.toLowerCase().includes(query) ||
        listing.component.brand.toLowerCase().includes(query) ||
        listing.title.toLowerCase().includes(query) ||
        (listing.description && listing.description.toLowerCase().includes(query))
      )
    }

    // Source filter
    if (selectedSources.length > 0) {
      filtered = filtered.filter(listing => selectedSources.includes(listing.source))
    }

    // Category filter
    if (selectedCategories.length > 0) {
      filtered = filtered.filter(listing => selectedCategories.includes(listing.component.category))
    }

    // Brand filter
    if (selectedBrands.length > 0) {
      filtered = filtered.filter(listing => selectedBrands.includes(listing.component.brand))
    }

    // Condition filter
    if (selectedConditions.length > 0) {
      filtered = filtered.filter(listing => selectedConditions.includes(listing.condition))
    }

    // Price range filter
    if (priceRange.min || priceRange.max) {
      const minPrice = priceRange.min ? parseFloat(priceRange.min) : 0
      const maxPrice = priceRange.max ? parseFloat(priceRange.max) : Infinity
      filtered = filtered.filter(listing => 
        listing.price >= minPrice && listing.price <= maxPrice
      )
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.date_posted).getTime() - new Date(a.date_posted).getTime()
        case 'price_low':
          return a.price - b.price
        case 'price_high':
          return b.price - a.price
        case 'relevance':
        default:
          return 0 // Keep current order for relevance
      }
    })

    setFilteredListings(filtered)
  }, [listings, searchQuery, selectedSources, selectedCategories, selectedBrands, selectedConditions, priceRange, sortBy])

  // Get unique filter options from data
  const filterOptions = {
    sources: [...new Set(listings.map(l => l.source))].sort(),
    categories: [...new Set(listings.map(l => l.component.category))].sort(),
    brands: [...new Set(listings.map(l => l.component.brand))].sort(),
    conditions: [...new Set(listings.map(l => l.condition))].sort()
  }

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
              Browse {listings.length} used listings across {filterOptions.brands.length} brands
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
                <option value="newest">Newest First</option>
                <option value="price_low">Price: Low to High</option>
                <option value="price_high">Price: High to Low</option>
                <option value="relevance">Most Relevant</option>
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {/* Source Filter */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Source</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {filterOptions.sources.map(source => (
                      <label key={source} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedSources.includes(source)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSources([...selectedSources, source])
                            } else {
                              setSelectedSources(selectedSources.filter(s => s !== source))
                            }
                          }}
                          className="mr-2 rounded border-border text-accent focus:ring-accent"
                        />
                        <span className="text-sm text-foreground capitalize">
                          {source.replace('_', ' ')}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Category Filter */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Category</label>
                  <div className="space-y-2">
                    {filterOptions.categories.map(category => (
                      <label key={category} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCategories([...selectedCategories, category])
                            } else {
                              setSelectedCategories(selectedCategories.filter(c => c !== category))
                            }
                          }}
                          className="mr-2 rounded border-border text-accent focus:ring-accent"
                        />
                        <span className="text-sm text-foreground capitalize">
                          {category === 'cans' ? 'Headphones' : category === 'iems' ? 'IEMs' : category}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Brand Filter */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Brand</label>
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {filterOptions.brands.slice(0, 10).map(brand => (
                      <label key={brand} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedBrands.includes(brand)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBrands([...selectedBrands, brand])
                            } else {
                              setSelectedBrands(selectedBrands.filter(b => b !== brand))
                            }
                          }}
                          className="mr-2 rounded border-border text-accent focus:ring-accent"
                        />
                        <span className="text-sm text-foreground">{brand}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Condition Filter */}
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Condition</label>
                  <div className="space-y-2">
                    {filterOptions.conditions.map(condition => (
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

        {/* Results Count */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted">
            Showing {filteredListings.length} of {listings.length} listings
          </p>
        </div>

        {/* Listings Grid/List */}
        {filteredListings.length === 0 ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-foreground mb-2">No listings found</h2>
            <p className="text-muted mb-6">Try adjusting your filters or search terms</p>
            <button
              onClick={() => {
                setSearchQuery('')
                setSelectedSources([])
                setSelectedCategories([])
                setSelectedBrands([])
                setSelectedConditions([])
                setPriceRange({ min: '', max: '' })
              }}
              className="button button-secondary"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <div className={viewMode === 'grid' 
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' 
            : 'space-y-4'
          }>
            {filteredListings.map(listing => (
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