'use client'

import { Component, UsedListing } from '@/types'
import { Clock, MapPin, User, Star, AlertTriangle, TrendingDown, TrendingUp, ExternalLink, Award } from 'lucide-react'
import { AmplificationBadge } from './AmplificationIndicator'
import { assessAmplificationFromImpedance } from '@/lib/audio-calculations'
import { Tooltip } from './Tooltip'

interface MarketplaceListingCardProps {
  listing: UsedListing;
  component: Component;
  viewMode?: 'grid' | 'list';
  onViewDetails?: () => void;
}

export function MarketplaceListingCard({ 
  listing, 
  component, 
  viewMode = 'grid',
  onViewDetails 
}: MarketplaceListingCardProps) {
  
  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }
  
  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'text-green-600 bg-green-50'
      case 'very_good': return 'text-blue-600 bg-blue-50'
      case 'good': return 'text-yellow-600 bg-yellow-50'
      case 'fair': return 'text-orange-600 bg-orange-50'
      case 'parts_only': return 'text-red-600 bg-red-50'
      default: return 'text-secondary bg-surface-secondary'
    }
  }

  const getSourceDisplay = (source: string) => {
    const sourceMap: { [key: string]: { name: string; color: string; icon: string } } = {
      'reddit_avexchange': { name: 'r/AVexchange', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: '🔥' },
      'ebay': { name: 'eBay', color: 'bg-blue-100 text-blue-800 border-blue-200', icon: '🛒' },
      'head_fi': { name: 'Head-Fi', color: 'bg-purple-100 text-purple-800 border-purple-200', icon: '🎧' },
      'reverb': { name: 'Reverb', color: 'bg-green-100 text-green-800 border-green-200', icon: '👂' },
      'manual': { name: 'Curated', color: 'bg-surface-secondary text-primary border-border', icon: '⭐' }
    }
    return sourceMap[source] || { name: source, color: 'bg-surface-secondary text-primary border-border', icon: '📦' }
  }

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return { text: 'Just now', urgent: true }
    if (diffInHours < 6) return { text: `${diffInHours}h ago`, urgent: true }
    if (diffInHours < 24) return { text: `${diffInHours}h ago`, urgent: false }
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return { text: `${diffInDays}d ago`, urgent: false }
    if (diffInDays < 30) return { text: `${Math.floor(diffInDays / 7)}w ago`, urgent: false }
    return { text: `${Math.floor(diffInDays / 30)}mo ago`, urgent: false }
  }

  const getPriceAnalysis = (listingPrice: number) => {
    if (!component.price_used_min || !component.price_used_max) {
      return { type: 'neutral', message: '', percentage: 0, trend: 'stable' }
    }

    const expectedMin = component.price_used_min
    const expectedMax = component.price_used_max
    const expectedAvg = (expectedMin + expectedMax) / 2
    const percentage = Math.round(((listingPrice - expectedAvg) / expectedAvg) * 100)

    // Price trend analysis based on position in range
    const rangePosition = (listingPrice - expectedMin) / (expectedMax - expectedMin)
    let trend = 'stable'
    if (rangePosition < 0.3) trend = 'dropping'
    else if (rangePosition > 0.7) trend = 'rising'

    if (percentage < -25) {
      return { type: 'great-deal', message: 'Great Deal!', percentage, trend }
    } else if (percentage < -10) {
      return { type: 'good-deal', message: 'Good Deal', percentage, trend }
    } else if (percentage > 30) {
      return { type: 'overpriced', message: 'Above Market', percentage, trend }
    } else {
      return { type: 'fair', message: 'Fair Price', percentage, trend }
    }
  }

  const amplificationAssessment = assessAmplificationFromImpedance(
    component.impedance,
    component.needs_amp,
    component.name,
    component.brand
  )

  const sourceInfo = getSourceDisplay(listing.source)
  const timeInfo = timeAgo(listing.date_posted)
  const priceAnalysis = getPriceAnalysis(listing.price)

  // Only show condition badge if explicitly stated or from Reverb
  // Reverb provides structured condition data, Reddit defaults to "good" if not mentioned
  const showCondition = listing.source === 'reverb' ||
    (listing.source === 'reddit_avexchange' && listing.condition !== 'good')

  if (viewMode === 'list') {
    return (
      <div className="bg-surface-elevated border-b border-border hover:bg-surface-hover transition-colors">
        <div className="flex items-center gap-3 px-4 py-2 min-w-max md:min-w-0">
          {/* Item - flex-1 with responsive min-width */}
          <div className="flex-1 min-w-[160px] sm:min-w-[200px]">
            <div className="font-semibold text-foreground truncate text-sm sm:text-base">
              {component.brand} {component.name}
            </div>
          </div>

          {/* Condition - hide on mobile */}
          <div className="hidden sm:block w-24 flex-shrink-0">
            {showCondition && (
              <Tooltip content={listing.source === 'reverb' ? 'Condition verified by Reverb' : 'Condition stated by seller in post'}>
                <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${getConditionColor(listing.condition)}`}>
                  {listing.condition.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </span>
              </Tooltip>
            )}
          </div>

          {/* Deal - hide on small screens */}
          <div className="hidden md:block w-16 flex-shrink-0">
            {priceAnalysis.type !== 'fair' && (
              <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                priceAnalysis.type === 'great-deal' ? 'bg-green-100 text-green-800' :
                priceAnalysis.type === 'good-deal' ? 'bg-blue-100 text-blue-800' :
                'bg-red-100 text-red-800'
              }`}>
                {priceAnalysis.percentage > 0 ? '+' : ''}{priceAnalysis.percentage}%
              </span>
            )}
          </div>

          {/* Location / Seller - hide on mobile */}
          <div className="hidden lg:block w-48 flex-shrink-0">
            <div className="flex flex-col gap-0.5 text-xs text-muted">
              <div className="flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{listing.location}</span>
              </div>
              <div className="flex items-center gap-1 truncate">
                <User className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{listing.seller_username}</span>
              </div>
            </div>
          </div>

          {/* Posted - always visible, responsive sizing */}
          <div className={`w-16 sm:w-20 flex-shrink-0 text-xs ${timeInfo.urgent ? 'text-orange-600 font-medium' : 'text-muted'}`}>
            {timeInfo.text}
          </div>

          {/* Price - always visible, responsive sizing */}
          <div className="w-20 sm:w-24 flex-shrink-0 text-right text-base sm:text-lg font-bold text-foreground">
            {formatPrice(listing.price)}
          </div>

          {/* Action - always visible, responsive sizing */}
          <div className="w-16 sm:w-20 flex-shrink-0">
            {listing.url.includes('/sample') ? (
              <div className="px-2 sm:px-3 py-1 bg-surface-secondary text-secondary rounded text-xs text-center cursor-not-allowed">
                Demo
              </div>
            ) : (
              <a
                href={listing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 sm:py-1 bg-accent hover:bg-accent-hover text-accent-foreground rounded font-medium transition-colors text-xs w-full min-h-[44px] sm:min-h-0"
                aria-label="View listing"
              >
                <span className="hidden sm:inline">View</span>
                <ExternalLink className="w-4 h-4 sm:w-3 sm:h-3" />
              </a>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Grid view
  return (
    <div className="bg-surface-elevated border border-border rounded-lg overflow-hidden hover:border-accent transition-colors h-full flex flex-col">
      {/* Header */}
      <div className="p-4 pb-0">
        <div className="mb-3">
          <h3 className="font-semibold text-foreground line-clamp-1">
            {component.brand} {component.name}
          </h3>
        </div>
      </div>

      <div className="px-4 pb-4 flex flex-col flex-1">

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-3">
        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${sourceInfo.color}`}>
          {sourceInfo.name}
        </span>
        {showCondition && (
          <Tooltip content={listing.source === 'reverb' ? 'Condition verified by Reverb' : 'Condition stated by seller in post'}>
            <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getConditionColor(listing.condition)}`}>
              Condition: {listing.condition.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          </Tooltip>
        )}
        {/* Reverb-specific: Accepts Offers badge */}
        {listing.source === 'reverb' && listing.accepts_offers && (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
            💬 Offers
          </span>
        )}
        {/* Bundle badge */}
        {listing.is_bundle && (
          <Tooltip content={`This listing contains ${listing.component_count || 2}+ items. Price shown is for the bundle.`}>
            <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800 border border-orange-200">
              📦 Bundle ({listing.component_count || 2}+ items)
            </span>
          </Tooltip>
        )}
      </div>

      {/* Details - Flex Layout for Consistent Spacing */}
      <div className="flex-1 flex flex-col gap-2 text-sm text-muted mb-4">
        {/* Row 1: Location + Username */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <MapPin className="w-4 h-4 flex-shrink-0" />
            <Tooltip content={listing.location}>
              <span className="truncate">{listing.location}</span>
            </Tooltip>
          </div>
          <div className="flex items-center gap-1 min-w-0 flex-1">
            <User className="w-4 h-4 flex-shrink-0" />
            <Tooltip content={listing.seller_username}>
              <span className="truncate">{listing.seller_username}</span>
            </Tooltip>
          </div>
        </div>
        {/* Row 2: Age + Trades (only if trades > 0) */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-1 flex-1">
            <Clock className={`w-4 h-4 flex-shrink-0 ${timeInfo.urgent ? 'text-orange-500' : ''}`} />
            <span className={timeInfo.urgent ? 'text-orange-600 font-medium' : ''}>{timeInfo.text}</span>
            {timeInfo.urgent && <span className="text-xs text-orange-500 ml-1">🔥</span>}
          </div>
          {listing.seller_confirmed_trades != null && listing.seller_confirmed_trades > 0 && (
            <div className="flex items-center gap-1 text-green-600 flex-1">
              <Star className="w-4 h-4 flex-shrink-0" />
              <span>{listing.seller_confirmed_trades} trades</span>
            </div>
          )}
        </div>
      </div>

      {/* Price Analysis Badge - Consolidated */}
      {priceAnalysis.type !== 'fair' && (
        <div className={`flex flex-wrap items-center gap-1 p-2 rounded text-xs font-medium mb-3 ${
          priceAnalysis.type === 'great-deal' ? 'bg-green-100 text-green-800 border border-green-200' :
          priceAnalysis.type === 'good-deal' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
          priceAnalysis.type === 'overpriced' ? 'bg-red-100 text-red-800 border border-red-200' :
          'bg-surface-secondary text-primary border border-border'
        }`}>
          {priceAnalysis.type === 'great-deal' || priceAnalysis.type === 'good-deal' ? <TrendingDown className="w-3.5 h-3.5" /> :
           priceAnalysis.type === 'overpriced' ? <TrendingUp className="w-3.5 h-3.5" /> : null}
          <span className="font-semibold">{priceAnalysis.message}</span>
          {priceAnalysis.percentage !== 0 && (
            <span>• {priceAnalysis.percentage > 0 ? '+' : ''}{priceAnalysis.percentage}%</span>
          )}
          {priceAnalysis.trend !== 'stable' && (
            <span>• {priceAnalysis.trend === 'dropping' ? 'Market Low' : 'Market High'}</span>
          )}
        </div>
      )}

      {/* Price Warning */}
      {listing.price_warning && (
        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm mb-3">
          <AlertTriangle className="w-4 h-4 inline mr-1" />
          <span className="text-xs">{listing.price_warning}</span>
        </div>
      )}

      {/* Price & Actions */}
      <div className="mt-auto">
        <div className="text-center mb-3">
          <div className="text-xl font-bold text-foreground">{formatPrice(listing.price)}</div>
          {/* Reverb-specific: Show shipping cost */}
          {listing.source === 'reverb' && listing.shipping_cost !== undefined && listing.shipping_cost > 0 && (
            <div className="text-xs text-muted">
              + ${listing.shipping_cost} shipping
            </div>
          )}
          {listing.source === 'reverb' && listing.shipping_cost === 0 && (
            <div className="text-xs text-green-600 font-medium">
              Free shipping
            </div>
          )}
        </div>

        <div className="flex flex-row gap-2">
          {listing.url.includes('/sample') ? (
            <div className="flex-1 px-3 py-2.5 bg-surface-secondary text-secondary rounded-md text-sm text-center cursor-not-allowed min-h-[44px] flex items-center justify-center">
              Demo Listing
            </div>
          ) : (
            <a
              href={listing.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2.5 bg-accent hover:bg-accent-hover text-accent-foreground rounded-md font-medium transition-colors text-sm min-h-[44px]"
            >
              <span>View Listing</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="flex-1 px-3 py-2.5 bg-surface-secondary hover:bg-surface-hover text-foreground rounded-md font-medium transition-colors text-sm min-h-[44px]"
            >
              Details
            </button>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}