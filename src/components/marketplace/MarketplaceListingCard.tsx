'use client'

import { Component, UsedListing } from '@/types'
import { Clock, MapPin, User, Star, AlertTriangle, TrendingDown, TrendingUp, ExternalLink, Award } from 'lucide-react'
import { AmplificationBadge } from '../ui/AmplificationIndicator'
import { assessAmplificationFromImpedance } from '@/lib/audio-calculations'
import { Tooltip } from '../ui/Tooltip'
import { PriceHistoryBadge, getCachedPriceStats } from '@/components/recommendations/PriceHistoryBadge'

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
      case 'excellent': return 'text-green-800 bg-green-200 dark:text-green-300 dark:bg-green-900/30'
      case 'very_good': return 'text-blue-800 bg-blue-200 dark:text-blue-300 dark:bg-blue-900/30'
      case 'good': return 'text-yellow-900 bg-yellow-200 dark:text-yellow-300 dark:bg-yellow-900/30'
      case 'fair': return 'text-orange-800 bg-orange-200 dark:text-orange-300 dark:bg-orange-900/30'
      case 'parts_only': return 'text-red-800 bg-red-200 dark:text-red-300 dark:bg-red-900/30'
      default: return 'text-secondary bg-surface-secondary'
    }
  }

  const getSourceDisplay = (source: string) => {
    const sourceMap: { [key: string]: { name: string; color: string; dotColor: string; icon: string } } = {
      'reddit_avexchange': { name: 'r/AVexchange', color: 'bg-orange-200 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800', dotColor: 'bg-orange-500', icon: '🔥' },
      'ebay': { name: 'eBay', color: 'bg-blue-200 text-blue-800 border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800', dotColor: 'bg-blue-500', icon: '🛒' },
      'head_fi': { name: 'Head-Fi', color: 'bg-purple-200 text-purple-800 border-purple-300 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800', dotColor: 'bg-purple-500', icon: '🎧' },
      'reverb': { name: 'Reverb', color: 'bg-green-200 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800', dotColor: 'bg-green-500', icon: '👂' },
      'manual': { name: 'Curated', color: 'bg-surface-secondary text-primary border-border', dotColor: 'bg-gray-400', icon: '⭐' }
    }
    return sourceMap[source] || { name: source, color: 'bg-surface-secondary text-primary border-border', dotColor: 'bg-gray-400', icon: '📦' }
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
    // Use actual sales median as benchmark when available (much more accurate)
    const cachedStats = getCachedPriceStats(component.id)
    const hasMarketData = cachedStats && cachedStats.median > 0

    if (!hasMarketData && !component.price_used_min && !component.price_used_max) {
      return { type: 'neutral', message: '', percentage: 0, trend: 'stable' }
    }

    const expectedAvg = hasMarketData
      ? cachedStats.median
      : ((component.price_used_min || 0) + (component.price_used_max || 0)) / 2
    const expectedMin = hasMarketData
      ? cachedStats.median * 0.8
      : (component.price_used_min || 0)
    const expectedMax = hasMarketData
      ? cachedStats.median * 1.2
      : (component.price_used_max || 0)
    const percentage = Math.round(((listingPrice - expectedAvg) / expectedAvg) * 100)

    // Price trend analysis based on position in range
    const range = expectedMax - expectedMin
    const rangePosition = range > 0 ? (listingPrice - expectedMin) / range : 0.5
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

  // Only show condition when it's real data — Reverb provides structured condition,
  // Reddit defaults to "good" when not mentioned so we only show non-default values
  const showCondition = listing.source === 'reverb' ||
    (listing.source === 'reddit_avexchange' && listing.condition !== 'good')

  const getDealColor = () => {
    if (priceAnalysis.type === 'great-deal') return 'text-green-700 dark:text-green-400'
    if (priceAnalysis.type === 'good-deal') return 'text-blue-700 dark:text-blue-400'
    if (priceAnalysis.type === 'overpriced') return 'text-red-600 dark:text-red-400'
    return ''
  }

  const getDealBarColor = () => {
    if (priceAnalysis.type === 'great-deal') return 'bg-green-500 dark:bg-green-400'
    if (priceAnalysis.type === 'good-deal') return 'bg-blue-500 dark:bg-blue-400'
    if (priceAnalysis.type === 'overpriced') return 'bg-red-400 dark:bg-red-500'
    return ''
  }

  const getConditionTextColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'text-green-700 dark:text-green-400'
      case 'very_good': return 'text-blue-700 dark:text-blue-400'
      case 'good': return 'text-yellow-700 dark:text-yellow-400'
      case 'fair': return 'text-orange-700 dark:text-orange-400'
      case 'parts_only': return 'text-red-700 dark:text-red-400'
      default: return 'text-muted'
    }
  }

  const hasDeal = priceAnalysis.type !== 'fair' && priceAnalysis.type !== 'neutral'

  if (viewMode === 'list') {
    return (
      <div className="relative border-b border-border hover:bg-surface-hover transition-colors">
        {/* Deal indicator bar — left edge, centered vertically */}
        {hasDeal && (
          <div className={`absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r ${getDealBarColor()}`} />
        )}

        <div className="flex items-center gap-2 px-3 py-1.5">
          {/* Item — brand + name + source dot + bundle */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {onViewDetails ? (
              <button
                onClick={onViewDetails}
                className="font-medium text-foreground hover:text-accent truncate text-sm text-left transition-colors"
              >
                <span className="hidden lg:inline text-muted font-normal">{component.brand} </span>{component.name}
              </button>
            ) : (
              <span className="font-medium text-foreground truncate text-sm">
                <span className="hidden lg:inline text-muted font-normal">{component.brand} </span>{component.name}
              </span>
            )}
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${sourceInfo.dotColor}`} />
            {priceAnalysis.type === 'great-deal' && (
              <span className="text-[11px] flex-shrink-0" aria-label="Great deal">🔥</span>
            )}
            {listing.is_bundle && (
              <Tooltip content={`Bundle: ${listing.component_count || 2}+ items`}>
                <span className="text-orange-600 dark:text-orange-400 text-[11px] flex-shrink-0">📦</span>
              </Tooltip>
            )}
          </div>

          {/* Source */}
          <div className="hidden sm:block w-20 flex-shrink-0 text-xs text-muted truncate">
            {sourceInfo.name}
          </div>

          {/* Notes — surfaces noteworthy info only when relevant */}
          <div className="hidden md:flex items-center gap-1 w-28 flex-shrink-0 flex-wrap">
            {showCondition && (
              <Tooltip content={listing.source === 'reverb' ? 'Condition verified by Reverb' : 'Condition stated by seller'}>
                <span className={`text-[11px] font-medium ${getConditionTextColor(listing.condition)}`}>
                  {listing.condition === 'very_good' ? 'Very Good' :
                   listing.condition === 'excellent' ? 'Excellent' :
                   listing.condition === 'parts_only' ? 'Parts Only' :
                   listing.condition.charAt(0).toUpperCase() + listing.condition.slice(1)}
                </span>
              </Tooltip>
            )}
            {listing.is_bundle && (
              <span className="text-[11px] text-orange-600 dark:text-orange-400 font-medium">Bundle</span>
            )}
            {listing.source === 'reverb' && listing.accepts_offers && (
              <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">Offers</span>
            )}
            {listing.seller_confirmed_trades != null && listing.seller_confirmed_trades >= 25 && (
              <Tooltip content={`${listing.seller_confirmed_trades} confirmed trades`}>
                <span className="text-[11px] text-green-600 dark:text-green-400 font-medium">⭐ {listing.seller_confirmed_trades}</span>
              </Tooltip>
            )}
          </div>

          {/* Location */}
          <div className="hidden lg:block w-16 flex-shrink-0 text-xs text-muted truncate">
            {listing.location}
          </div>

          {/* Age */}
          <div className={`w-12 flex-shrink-0 text-xs ${timeInfo.urgent ? 'text-orange-600 dark:text-orange-400 font-medium' : 'text-muted'}`}>
            {timeInfo.text}
          </div>

          {/* Price */}
          <div className="w-16 flex-shrink-0 text-right tabular-nums">
            <span className="text-sm font-bold text-foreground">
              {formatPrice(listing.price)}
            </span>
          </div>

          {/* MSRP */}
          <div className="hidden md:block w-14 flex-shrink-0 text-right tabular-nums">
            <span className="text-xs text-muted">
              {component.price_new ? formatPrice(component.price_new) : '—'}
            </span>
          </div>


          {/* Action */}
          <div className="w-16 flex-shrink-0 text-right">
            {listing.url.includes('/sample') ? (
              <span className="text-xs text-muted">Demo</span>
            ) : (
              <a
                href={listing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 px-2.5 py-1 text-xs font-medium bg-accent text-accent-foreground rounded-full hover:bg-accent-hover transition-colors"
                aria-label={`View listing for ${listing.title} (opens in new tab)`}
              >
                View <ExternalLink className="w-3 h-3" aria-hidden="true" />
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
        <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${sourceInfo.color}`}>
          {sourceInfo.name}
        </span>
        {showCondition && (
          <Tooltip content={listing.source === 'reverb' ? 'Condition verified by Reverb' : 'Condition stated by seller in post'}>
            <span className={`inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium ${getConditionColor(listing.condition)}`}>
              Condition: {listing.condition.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </span>
          </Tooltip>
        )}
        {/* Reverb-specific: Accepts Offers badge */}
        {listing.source === 'reverb' && listing.accepts_offers && (
          <span className="inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium bg-blue-200 text-blue-800 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
            💬 Offers
          </span>
        )}
        {/* Bundle badge */}
        {listing.is_bundle && (
          <Tooltip content={`This listing contains ${listing.component_count || 2}+ items. Price shown is for the bundle.`}>
            <span
              className="inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium bg-orange-200 text-orange-800 border border-orange-300 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800"
              role="note"
              aria-label={`Bundle listing with ${listing.component_count || 2} or more items`}
              tabIndex={0}
            >
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
            <Clock className={`w-4 h-4 flex-shrink-0 ${timeInfo.urgent ? 'text-orange-500 dark:text-orange-400' : ''}`} />
            <span className={timeInfo.urgent ? 'text-orange-600 dark:text-orange-400 font-medium' : ''}>{timeInfo.text}</span>
            {timeInfo.urgent && <span className="text-xs text-orange-500 dark:text-orange-400 ml-1">🔥</span>}
          </div>
          {listing.seller_confirmed_trades != null && listing.seller_confirmed_trades > 0 && (
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400 flex-1">
              <Star className="w-4 h-4 flex-shrink-0" />
              <span>{listing.seller_confirmed_trades} trades</span>
            </div>
          )}
        </div>
      </div>

      {/* Price Analysis Badge - Consolidated */}
      {priceAnalysis.type !== 'fair' && (
        <div className={`flex flex-wrap items-center gap-1 p-2 rounded text-xs font-medium mb-3 ${
          priceAnalysis.type === 'great-deal' ? 'bg-green-200 text-green-800 border border-green-300 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800' :
          priceAnalysis.type === 'good-deal' ? 'bg-blue-200 text-blue-800 border border-blue-300 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800' :
          priceAnalysis.type === 'overpriced' ? 'bg-red-200 text-red-800 border border-red-300 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800' :
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
        <div className="p-2 bg-yellow-200 border border-yellow-300 rounded text-yellow-800 dark:bg-yellow-900/30 dark:border-yellow-800 dark:text-yellow-300 text-sm mb-3">
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
            <div className="text-xs text-green-600 dark:text-green-400 font-medium">
              Free shipping
            </div>
          )}
          <PriceHistoryBadge componentId={component.id} />
        </div>

        <div className="flex flex-row gap-2">
          {listing.url.includes('/sample') ? (
            <div className="flex-1 px-3 py-2.5 bg-surface-secondary text-secondary rounded-lg text-sm text-center cursor-not-allowed min-h-[44px] flex items-center justify-center">
              Demo Listing
            </div>
          ) : (
            <a
              href={listing.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2.5 bg-accent hover:bg-accent-hover text-accent-foreground rounded-lg font-medium transition-colors text-sm min-h-[44px]"
              aria-label={`View listing for ${listing.title} (opens in new tab)`}
            >
              <span>View Listing</span>
              <ExternalLink className="w-4 h-4" aria-hidden="true" />
            </a>
          )}
          {onViewDetails && (
            <button
              onClick={onViewDetails}
              className="flex-1 px-3 py-2.5 bg-surface-secondary hover:bg-surface-hover text-foreground rounded-lg font-medium transition-colors text-sm min-h-[44px]"
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