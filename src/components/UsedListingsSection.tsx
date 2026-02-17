'use client'

import { useState } from 'react'
import { Component, UsedListing } from '@/types'
import { MarketplaceListingCard } from './MarketplaceListingCard'
import { EbayAffiliateCTA } from './EbayAffiliateCTA'
import { Grid, List } from 'lucide-react'

interface UsedListingsSectionProps {
  component: Component;
  listings: UsedListing[];
}

export function UsedListingsSection({ component, listings }: UsedListingsSectionProps) {
  const [filter, setFilter] = useState<'all' | 'reddit' | 'head_fi' | 'reverb' | 'manual'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'price_low' | 'price_high'>('newest')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list')

  const filteredListings = listings
    .filter(listing => {
      if (filter === 'all') return true
      if (filter === 'reddit') return listing.source === 'reddit_avexchange'
      if (filter === 'head_fi') return listing.source === 'head_fi'
      if (filter === 'reverb') return listing.source === 'reverb'
      if (filter === 'manual') return listing.source === 'manual'
      return true
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.date_posted).getTime() - new Date(a.date_posted).getTime()
        case 'price_low':
          return (a.price ?? Infinity) - (b.price ?? Infinity)
        case 'price_high':
          return (b.price ?? 0) - (a.price ?? 0)
        default:
          return 0
      }
    })

  if (!listings || listings.length === 0) {
    return (
      <div className="mt-10">
        <h3 className="heading-3 mb-4">
          Used Market for {component.name}
        </h3>
        
        <div className="card">
          <div className="text-center">
            <p className="text-secondary mb-4">No used listings currently available</p>
            
            {component.amazon_url && (
              <div>
                <p className="text-sm text-secondary mb-3">Consider buying new:</p>
                <a 
                  href={component.amazon_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="button button-primary"
                >
                  Buy New on Amazon →
                </a>
                <div className="text-xs text-tertiary mt-2">
                  <span className="inline-block bg-surface-secondary px-2 py-1 rounded">
                    Affiliate Link - HiFinder may earn a commission at no additional cost to you
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="mt-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h3 className="heading-3 mb-1">
            Used Market for {component.name}
          </h3>
          <p className="text-text-secondary text-sm">
            {filteredListings.length} listing{filteredListings.length !== 1 ? 's' : ''} found
          </p>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          {/* View Mode Toggle */}
          <div className="flex border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                viewMode === 'list'
                  ? 'bg-orange-600 text-white'
                  : 'bg-surface-card text-primary hover:bg-surface-hover'
              }`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 text-sm font-medium transition-colors border-l border-border ${
                viewMode === 'grid'
                  ? 'bg-orange-600 text-white'
                  : 'bg-surface-card text-primary hover:bg-surface-hover'
              }`}
              title="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>

          {/* Source Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="bg-surface-card border border-border rounded-lg px-3 py-2 text-sm text-primary focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
          >
            <option value="all">All Sources</option>
            <option value="reddit">Reddit</option>
            <option value="head_fi">Head-Fi</option>
            <option value="reverb">Reverb</option>
            <option value="manual">Curated</option>
          </select>

          {/* Sort Filter */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-surface-card border border-border rounded-lg px-3 py-2 text-sm text-primary focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-colors"
          >
            <option value="newest">Newest First</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
          </select>
        </div>
      </div>

{/* Demo Data Warning */}
      {filteredListings.some(listing => listing.url.includes('/sample')) && (
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 p-4 rounded-xl mb-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className="w-5 h-5 rounded-full bg-blue-500 dark:bg-blue-400 flex items-center justify-center">
                <span className="text-white text-xs font-bold">i</span>
              </div>
            </div>
            <div>
              <p className="text-blue-900 text-sm font-medium mb-1">Demo Data</p>
              <p className="text-blue-700 text-sm">
                These are sample listings for demonstration purposes. In a live system, these would be real marketplace listings from Reddit, eBay, and other sources.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Safety Warning */}
      <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 p-4 rounded-xl mb-6 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">
            <div className="w-5 h-5 rounded-full bg-yellow-500 dark:bg-yellow-400 flex items-center justify-center">
              <span className="text-white text-xs font-bold">!</span>
            </div>
          </div>
          <div>
            <p className="text-yellow-900 text-sm font-medium mb-1">Safety First</p>
            <p className="text-yellow-700 text-sm">
              Always use PayPal Goods & Services for buyer protection. Verify seller reputation and ask for additional photos before purchasing.
            </p>
          </div>
        </div>
      </div>

      {/* Listings */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
        {filteredListings.map(listing => (
          <MarketplaceListingCard
            key={listing.id}
            listing={listing}
            component={component}
            viewMode={viewMode}
          />
        ))}
      </div>

      {/* eBay Affiliate CTA */}
      {filteredListings.length > 0 && (
        <div className="mt-8 p-6 bg-gradient-to-br from-blue-50 via-blue-50 to-cyan-50 border border-blue-200 rounded-xl shadow-sm">
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0 mt-1">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
                <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                </svg>
              </div>
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-blue-900 text-lg mb-2">
                Looking for more options?
              </h4>
              <p className="text-sm text-blue-700 mb-4">
                Check eBay for hundreds of additional listings of {component.name}. Live auctions, buy-it-now deals, and verified sellers.
              </p>
              <EbayAffiliateCTA
                component={{
                  id: component.id,
                  brand: component.brand,
                  name: component.name,
                  category: component.category
                }}
                source="used_listings"
                variant="secondary"
              />
            </div>
          </div>
        </div>
      )}

      {/* Amazon Affiliate Fallback */}
      {component.amazon_url && (
        <div className="mt-6 p-6 bg-gradient-to-br from-gray-50 via-gray-50 to-orange-50 border border-border rounded-xl shadow-sm">
          <div className="text-center">
            <div className="mb-3">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 mb-3 shadow-md">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <p className="text-primary font-semibold text-lg mb-1">Prefer to buy new?</p>
              <p className="text-secondary text-sm">Get the latest model with full warranty</p>
            </div>
            <a
              href={component.amazon_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 text-white px-8 py-3 rounded-lg font-semibold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <span>Buy New on Amazon</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </a>
            <div className="text-xs text-secondary mt-3">
              <span className="inline-flex items-center gap-1 bg-surface-secondary px-3 py-1.5 rounded-full">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Affiliate Link - HiFinder may earn a commission at no additional cost to you
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}