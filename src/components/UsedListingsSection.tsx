'use client'

import { useState } from 'react'
import { Component, UsedListing } from '@/types'
import { ListingCard } from './ListingCard'

interface UsedListingsSectionProps {
  component: Component;
  listings: UsedListing[];
}

export function UsedListingsSection({ component, listings }: UsedListingsSectionProps) {
  const [filter, setFilter] = useState<'all' | 'reddit' | 'ebay' | 'head_fi' | 'reverb' | 'manual'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'price_low' | 'price_high'>('newest')

  const filteredListings = listings
    .filter(listing => {
      if (filter === 'all') return true
      if (filter === 'reddit') return listing.source === 'reddit_avexchange'
      if (filter === 'ebay') return listing.source === 'ebay'
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
          return a.price - b.price
        case 'price_high':
          return b.price - a.price
        default:
          return 0
      }
    })

  const expectedPrice = component.price_used_min && component.price_used_max 
    ? (component.price_used_min + component.price_used_max) / 2
    : component.price_used_min || component.price_used_max || 0

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
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="heading-3">
            Used Market for {component.name}
          </h3>
          <p className="text-secondary text-sm">
            {filteredListings.length} listing{filteredListings.length !== 1 ? 's' : ''} found
          </p>
        </div>
        
        <div className="flex gap-2">
          {/* Source Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as typeof filter)}
            className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-3 py-1 text-sm text-gray-900 dark:text-white"
          >
            <option value="all">All Sources</option>
            <option value="reddit">Reddit</option>
            <option value="ebay">eBay</option>
            <option value="head_fi">Head-Fi</option>
            <option value="reverb">Reverb</option>
            <option value="manual">Curated</option>
          </select>

          {/* Sort Filter */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-3 py-1 text-sm text-gray-900 dark:text-white"
          >
            <option value="newest">Newest First</option>
            <option value="price_low">Price: Low to High</option>
            <option value="price_high">Price: High to Low</option>
          </select>
        </div>
      </div>

{/* Demo Data Warning */}
      {filteredListings.some(listing => listing.url.includes('/sample')) && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-600/50 p-4 rounded-lg mb-4">
          <p className="text-blue-800 dark:text-blue-200 text-sm">
            ℹ️ <strong>Demo Data:</strong> These are sample listings for demonstration purposes. 
            In a live system, these would be real marketplace listings from Reddit, eBay, and other sources.
          </p>
        </div>
      )}

      {/* Safety Warning */}
      <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-600/50 p-4 rounded-lg mb-4">
        <p className="text-yellow-800 dark:text-yellow-200 text-sm">
          ⚠️ <strong>Safety First:</strong> Always use PayPal Goods & Services for buyer protection. 
          Verify seller reputation and ask for additional photos before purchasing.
        </p>
      </div>

      {/* Listings */}
      <div className="space-y-3">
        {filteredListings.map(listing => (
          <ListingCard 
            key={listing.id}
            listing={listing}
            expectedPrice={expectedPrice}
          />
        ))}
      </div>

      {/* Affiliate Fallback */}
      {component.amazon_url && (
        <div className="mt-6 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="text-center">
            <p className="text-gray-600 dark:text-gray-400 mb-3">Prefer to buy new?</p>
            <a 
              href={component.amazon_url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-2 rounded-lg inline-block font-medium transition-colors"
            >
              Buy New on Amazon →
            </a>
            <div className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              <span className="inline-block bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">
                Affiliate Link - HiFinder may earn a commission at no additional cost to you
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}