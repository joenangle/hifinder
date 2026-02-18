'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowUpRight, ChevronDown, ChevronUp } from 'lucide-react'
import { Modal } from './Modal'
import { PriceHistoryChart } from './PriceHistoryChart'
import { MarketplaceListingCard } from './MarketplaceListingCard'
import type { Component, UsedListing } from '@/types'

interface UsedListingsModalProps {
  isOpen: boolean
  onClose: () => void
  component: Component
  listings: UsedListing[]
  listingsLoading: boolean
}

type SortOption = 'date_desc' | 'price_asc' | 'price_desc'

const INITIAL_SHOW_COUNT = 5

function formatPrice(amount: number | null | undefined) {
  if (!amount) return null
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export function UsedListingsModal({
  isOpen,
  onClose,
  component,
  listings,
  listingsLoading,
}: UsedListingsModalProps) {
  const [sortBy, setSortBy] = useState<SortOption>('date_desc')
  const [showAll, setShowAll] = useState(false)

  const sortedListings = useMemo(() => {
    const sorted = [...listings]
    switch (sortBy) {
      case 'date_desc':
        sorted.sort((a, b) => new Date(b.date_posted).getTime() - new Date(a.date_posted).getTime())
        break
      case 'price_asc':
        sorted.sort((a, b) => (a.price ?? Infinity) - (b.price ?? Infinity))
        break
      case 'price_desc':
        sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0))
        break
    }
    return sorted
  }, [listings, sortBy])

  const displayedListings = showAll ? sortedListings : sortedListings.slice(0, INITIAL_SHOW_COUNT)
  const hasMore = sortedListings.length > INITIAL_SHOW_COUNT

  const searchQuery = encodeURIComponent(`${component.brand} ${component.name}`)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${component.brand} ${component.name} — Used Market`} maxWidth="4xl">
      <div className="p-4 sm:p-6 space-y-6">

        {/* Price Summary Bar */}
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="p-3 bg-surface-secondary rounded-lg">
            <div className="text-xs text-muted mb-1">Used Range</div>
            <div className="text-sm font-semibold text-foreground">
              {component.price_used_min && component.price_used_max
                ? `${formatPrice(component.price_used_min)} – ${formatPrice(component.price_used_max)}`
                : 'No data'}
            </div>
          </div>
          <div className="p-3 bg-surface-secondary rounded-lg">
            <div className="text-xs text-muted mb-1">New / MSRP</div>
            <div className="text-sm font-semibold text-foreground">
              {formatPrice(component.price_new) ?? 'N/A'}
            </div>
          </div>
          <div className="p-3 bg-surface-secondary rounded-lg">
            <div className="text-xs text-muted mb-1">Active Listings</div>
            <div className="text-sm font-semibold text-foreground">
              {listingsLoading ? '...' : listings.length}
            </div>
          </div>
        </div>

        {/* Price History Chart */}
        <div>
          <h3 className="text-sm font-semibold text-foreground mb-3">Price History (Sold)</h3>
          <PriceHistoryChart componentId={component.id} priceNew={component.price_new} />
        </div>

        {/* Available Listings */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground">
              Available Listings{!listingsLoading && ` (${listings.length})`}
            </h3>
            {listings.length > 1 && (
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="text-xs bg-surface-secondary text-foreground border border-border rounded px-2 py-1"
              >
                <option value="date_desc">Newest</option>
                <option value="price_asc">Price: Low → High</option>
                <option value="price_desc">Price: High → Low</option>
              </select>
            )}
          </div>

          {listingsLoading ? (
            <div className="py-8 text-center text-muted text-sm">Loading listings...</div>
          ) : listings.length === 0 ? (
            <div className="py-8 text-center text-muted text-sm">
              No active listings right now. Check back later or browse the full marketplace.
            </div>
          ) : (
            <div className="space-y-2">
              {displayedListings.map((listing) => (
                <MarketplaceListingCard
                  key={listing.id}
                  listing={listing}
                  component={component}
                  viewMode="list"
                />
              ))}

              {hasMore && (
                <button
                  onClick={() => setShowAll(!showAll)}
                  className="w-full py-2 text-sm text-accent hover:text-accent-hover font-medium flex items-center justify-center gap-1 transition-colors"
                >
                  {showAll ? (
                    <>Show fewer <ChevronUp className="w-4 h-4" /></>
                  ) : (
                    <>Show all {sortedListings.length} listings <ChevronDown className="w-4 h-4" /></>
                  )}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer: Link to full marketplace */}
        <div className="pt-2 border-t border-border">
          <Link
            href={`/marketplace?search=${searchQuery}`}
            className="w-full px-4 py-2.5 bg-accent hover:bg-accent-hover text-accent-foreground rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
          >
            Browse on Marketplace <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

      </div>
    </Modal>
  )
}
