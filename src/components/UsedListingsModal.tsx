'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { ArrowUpRight, ExternalLink, MapPin, Clock } from 'lucide-react'
import { Modal } from './Modal'
import { PriceHistoryChart } from './PriceHistoryChart'
import type { Component, UsedListing } from '@/types'

interface UsedListingsModalProps {
  isOpen: boolean
  onClose: () => void
  component: Component
  listings: UsedListing[]
  listingsLoading: boolean
}

type SortOption = 'date_desc' | 'price_asc' | 'price_desc'

function formatPrice(amount: number | null | undefined) {
  if (!amount) return null
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const days = Math.floor(diff / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return '1d ago'
  if (days < 30) return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

function conditionLabel(condition: string) {
  return condition.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
}

function conditionColor(condition: string) {
  switch (condition) {
    case 'excellent': return 'text-green-700 dark:text-green-400'
    case 'very_good': return 'text-blue-700 dark:text-blue-400'
    case 'good': return 'text-yellow-700 dark:text-yellow-400'
    case 'fair': return 'text-orange-700 dark:text-orange-400'
    default: return 'text-muted'
  }
}

function sourceLabel(source: string) {
  switch (source) {
    case 'reddit_avexchange': return 'r/AVex'
    case 'reverb': return 'Reverb'
    case 'ebay': return 'eBay'
    case 'head_fi': return 'Head-Fi'
    default: return source
  }
}

export function UsedListingsModal({
  isOpen,
  onClose,
  component,
  listings,
  listingsLoading,
}: UsedListingsModalProps) {
  const [sortBy, setSortBy] = useState<SortOption>('date_desc')

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

  const searchQuery = encodeURIComponent(`${component.brand} ${component.name}`)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${component.brand} ${component.name}`} maxWidth="4xl">
      <div className="flex flex-col lg:flex-row lg:h-[70vh] max-h-[80vh]">

        {/* Left column: Price stats + history chart */}
        <div className="lg:w-1/2 p-4 lg:border-r border-border flex flex-col gap-3 lg:overflow-y-auto">
          {/* Inline price stats */}
          <div className="flex gap-2 text-xs">
            <div className="flex-1 p-2 bg-surface-secondary rounded text-center">
              <span className="text-muted">Used </span>
              <span className="font-semibold text-foreground">
                {component.price_used_min && component.price_used_max
                  ? `${formatPrice(component.price_used_min)}–${formatPrice(component.price_used_max)}`
                  : '—'}
              </span>
            </div>
            <div className="flex-1 p-2 bg-surface-secondary rounded text-center">
              <span className="text-muted">New </span>
              <span className="font-semibold text-foreground">{formatPrice(component.price_new) ?? '—'}</span>
            </div>
            <div className="flex-1 p-2 bg-surface-secondary rounded text-center">
              <span className="text-muted">Listed </span>
              <span className="font-semibold text-foreground">{listingsLoading ? '…' : listings.length}</span>
            </div>
          </div>

          {/* Price history chart */}
          <div className="flex-1 min-h-0">
            <PriceHistoryChart componentId={component.id} priceNew={component.price_new} />
          </div>
        </div>

        {/* Right column: Listings + marketplace link */}
        <div className="lg:w-1/2 flex flex-col min-h-0">
          {/* Listings header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <span className="text-sm font-semibold text-foreground">
              Available{!listingsLoading && ` (${listings.length})`}
            </span>
            {listings.length > 1 && (
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortOption)}
                className="text-xs bg-surface-secondary text-foreground border border-border rounded px-1.5 py-0.5"
              >
                <option value="date_desc">Newest</option>
                <option value="price_asc">Price ↑</option>
                <option value="price_desc">Price ↓</option>
              </select>
            )}
          </div>

          {/* Listings body */}
          <div className="flex-1 overflow-y-auto">
            {listingsLoading ? (
              <div className="py-8 text-center text-muted text-sm">Loading…</div>
            ) : listings.length === 0 ? (
              <div className="py-8 text-center text-muted text-sm">
                No active listings right now.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {sortedListings.map((listing) => (
                  <a
                    key={listing.id}
                    href={listing.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-hover transition-colors group"
                    aria-label={`${listing.title} listing (opens in new tab)`}
                  >
                    {/* Price */}
                    <div className="w-16 flex-shrink-0 text-right">
                      <span className="font-semibold text-foreground text-sm">
                        {listing.price
                          ? `${listing.price_is_estimated ? '~' : ''}${formatPrice(listing.price)}`
                          : '—'}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-xs text-muted">
                        <span className={`font-medium ${conditionColor(listing.condition)}`}>
                          {conditionLabel(listing.condition)}
                        </span>
                        <span className="text-border">·</span>
                        <span>{sourceLabel(listing.source)}</span>
                        {listing.location && (
                          <>
                            <span className="text-border">·</span>
                            <span className="truncate flex items-center gap-0.5">
                              <MapPin className="w-3 h-3 inline flex-shrink-0" />
                              {listing.location}
                            </span>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted mt-0.5">
                        <Clock className="w-3 h-3 flex-shrink-0" />
                        <span>{timeAgo(listing.date_posted)}</span>
                        {listing.seller_username && (
                          <>
                            <span className="text-border">·</span>
                            <span className="truncate">{listing.seller_username}</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* External link icon */}
                    <ExternalLink className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Footer: marketplace link */}
          <div className="px-4 py-3 border-t border-border">
            <Link
              href={`/marketplace?search=${searchQuery}`}
              className="w-full px-3 py-2 bg-accent hover:bg-accent-hover text-accent-foreground rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-1.5"
            >
              Browse on Marketplace <ArrowUpRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

      </div>
    </Modal>
  )
}
