'use client'

import { Component, UsedListing } from '@/types'
import { Clock, MapPin, User, Star, AlertTriangle, TrendingDown, TrendingUp, ExternalLink, Award } from 'lucide-react'
import { AmplificationBadge } from './AmplificationIndicator'
import { assessAmplificationFromImpedance } from '@/lib/audio-calculations'

interface UsedMarketListingCardProps {
  listing: UsedListing;
  component: Component;
  viewMode?: 'grid' | 'list';
  onViewDetails?: () => void;
}

export function UsedMarketListingCard({ 
  listing, 
  component, 
  viewMode = 'grid',
  onViewDetails 
}: UsedMarketListingCardProps) {
  
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

  if (viewMode === 'list') {
    return (
      <div className="bg-surface-elevated border border-border rounded-lg overflow-hidden hover:border-accent transition-colors">
        <div className="flex items-start gap-4">
          {/* Listing Image */}
          {listing.images && listing.images.length > 0 && (
            <div className="w-32 h-32 bg-surface-secondary flex-shrink-0">
              <img
                src={listing.images[0]}
                alt={listing.title}
                className="w-full h-full object-cover"
                onError={(e) => {
                  // Hide image container on error
                  const parent = e.currentTarget.parentElement
                  if (parent) parent.style.display = 'none'
                }}
              />
            </div>
          )}

          {/* Left: Component & Listing Info */}
          <div className="flex-1 min-w-0 p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-foreground text-lg mb-1">
                  {component.brand} {component.name}
                </h3>
                <p className="text-muted text-sm line-clamp-2 mb-2">{listing.title}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-foreground">{formatPrice(listing.price)}</div>
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
            </div>

            {/* Tags Row */}
            <div className="flex flex-wrap gap-2 mb-3">
              <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${sourceInfo.color}`}>
                {sourceInfo.name}
              </span>
              <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs font-medium ${getConditionColor(listing.condition)}`}>
                {listing.condition.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-surface-secondary text-primary">
                {component.category === 'cans' ? 'Headphones' : component.category === 'iems' ? 'IEMs' : component.category}
              </span>
              {/* Reverb-specific: Accepts Offers badge */}
              {listing.source === 'reverb' && listing.accepts_offers && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
                  💬 Accepts Offers
                </span>
              )}
              {amplificationAssessment.difficulty !== 'unknown' && component.impedance && component.impedance > 0 && (
                <AmplificationBadge difficulty={amplificationAssessment.difficulty} />
              )}
            </div>

            {/* Details Row */}
            <div className="flex items-center gap-4 text-sm text-muted mb-3">
              <div className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                <span>{listing.location}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className={`w-4 h-4 ${timeInfo.urgent ? 'text-orange-500' : ''}`} />
                <span className={timeInfo.urgent ? 'text-orange-600 font-medium' : ''}>{timeInfo.text}</span>
                {timeInfo.urgent && <span className="text-xs text-orange-500 ml-1">🔥</span>}
              </div>
              <div className="flex items-center gap-1">
                <User className="w-4 h-4" />
                <span>{listing.seller_username}</span>
              </div>
              {listing.seller_confirmed_trades && listing.seller_confirmed_trades > 0 && (
                <div className="flex items-center gap-1 text-green-600">
                  <Star className="w-4 h-4" />
                  <span>{listing.seller_confirmed_trades} trades</span>
                </div>
              )}
            </div>

            {/* Price Analysis Badge */}
            {priceAnalysis.type !== 'fair' && (
              <div className="flex items-center gap-2 mb-3">
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                  priceAnalysis.type === 'great-deal' ? 'bg-green-100 text-green-800 border border-green-200' :
                  priceAnalysis.type === 'good-deal' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
                  priceAnalysis.type === 'overpriced' ? 'bg-red-100 text-red-800 border border-red-200' :
                  'bg-surface-secondary text-primary border border-border'
                }`}>
                  {priceAnalysis.type === 'great-deal' ? <TrendingDown className="w-3 h-3" /> :
                   priceAnalysis.type === 'good-deal' ? <TrendingDown className="w-3 h-3" /> :
                   priceAnalysis.type === 'overpriced' ? <TrendingUp className="w-3 h-3" /> : null}
                  <span>{priceAnalysis.message}</span>
                  {priceAnalysis.percentage !== 0 && (
                    <span className="font-bold">({priceAnalysis.percentage > 0 ? '+' : ''}{priceAnalysis.percentage}%)</span>
                  )}
                </div>
                {priceAnalysis.trend !== 'stable' && (
                  <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs ${
                    priceAnalysis.trend === 'dropping' ? 'bg-green-50 text-green-700 border border-green-200' :
                    'bg-orange-50 text-orange-700 border border-orange-200'
                  }`}>
                    <Award className="w-3 h-3" />
                    <span>{priceAnalysis.trend === 'dropping' ? 'Market Low' : 'Market High'}</span>
                  </div>
                )}
              </div>
            )}

            {/* Price Warning */}
            {listing.price_warning && (
              <div className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm mb-3">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{listing.price_warning}</span>
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex flex-col gap-2 p-4 pl-0">
            {listing.url.includes('/sample') ? (
              <div className="px-4 py-2 bg-surface-secondary text-secondary rounded-md text-sm cursor-not-allowed">
                Demo Listing
              </div>
            ) : (
              <a
                href={listing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-4 py-2 bg-accent hover:bg-accent-hover text-accent-foreground rounded-md font-medium transition-colors text-sm"
              >
                <span>View Listing</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
            {onViewDetails && (
              <button 
                onClick={onViewDetails}
                className="px-4 py-2 bg-surface-secondary hover:bg-surface-secondary text-foreground rounded-md font-medium transition-colors text-sm"
              >
                Details
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Grid view
  return (
    <div className="bg-surface-elevated border border-border rounded-lg overflow-hidden hover:border-accent transition-colors h-full flex flex-col">
      {/* Listing Image */}
      {listing.images && listing.images.length > 0 && (
        <div className="w-full h-48 bg-surface-secondary relative">
          <img
            src={listing.images[0]}
            alt={listing.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              // Hide image on error
              e.currentTarget.style.display = 'none'
            }}
          />
        </div>
      )}

      {/* Header */}
      <div className="p-4 pb-0">
        <div className="mb-3">
          <h3 className="font-semibold text-foreground mb-1 line-clamp-1">
            {component.brand} {component.name}
          </h3>
          <p className="text-muted text-sm line-clamp-2 mb-2">{listing.title}</p>
        </div>
      </div>

      <div className="px-4 pb-4 flex flex-col flex-1">

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-3">
        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${sourceInfo.color}`}>
          {sourceInfo.name}
        </span>
        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getConditionColor(listing.condition)}`}>
          {listing.condition.replace('_', ' ')}
        </span>
        {/* Reverb-specific: Accepts Offers badge */}
        {listing.source === 'reverb' && listing.accepts_offers && (
          <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800 border border-blue-200">
            💬 Offers
          </span>
        )}
        {amplificationAssessment.difficulty !== 'unknown' && component.impedance && component.impedance > 0 && (
          <AmplificationBadge difficulty={amplificationAssessment.difficulty} className="text-xs" />
        )}
      </div>

      {/* Details */}
      <div className="flex-1 space-y-2 text-sm text-muted mb-4">
        <div className="flex items-center gap-1">
          <MapPin className="w-4 h-4" />
          <span className="truncate">{listing.location}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className={`w-4 h-4 ${timeInfo.urgent ? 'text-orange-500' : ''}`} />
          <span className={timeInfo.urgent ? 'text-orange-600 font-medium' : ''}>{timeInfo.text}</span>
          {timeInfo.urgent && <span className="text-xs text-orange-500 ml-1">🔥</span>}
        </div>
        <div className="flex items-center gap-1">
          <User className="w-4 h-4" />
          <span className="truncate">{listing.seller_username}</span>
        </div>
        {listing.seller_confirmed_trades && listing.seller_confirmed_trades > 0 && (
          <div className="flex items-center gap-1 text-green-600">
            <Star className="w-4 h-4" />
            <span>{listing.seller_confirmed_trades} trades</span>
          </div>
        )}
      </div>

      {/* Price Analysis Badge */}
      {priceAnalysis.type !== 'fair' && (
        <div className="flex flex-col gap-1 mb-3">
          <div className={`flex items-center gap-1 p-2 rounded text-xs font-medium ${
            priceAnalysis.type === 'great-deal' ? 'bg-green-100 text-green-800 border border-green-200' :
            priceAnalysis.type === 'good-deal' ? 'bg-blue-100 text-blue-800 border border-blue-200' :
            priceAnalysis.type === 'overpriced' ? 'bg-red-100 text-red-800 border border-red-200' :
            'bg-surface-secondary text-primary border border-border'
          }`}>
            {priceAnalysis.type === 'great-deal' ? <TrendingDown className="w-3 h-3" /> :
             priceAnalysis.type === 'good-deal' ? <TrendingDown className="w-3 h-3" /> :
             priceAnalysis.type === 'overpriced' ? <TrendingUp className="w-3 h-3" /> : null}
            <span>{priceAnalysis.message}</span>
            {priceAnalysis.percentage !== 0 && (
              <span className="font-bold">({priceAnalysis.percentage > 0 ? '+' : ''}{priceAnalysis.percentage}%)</span>
            )}
          </div>
          {priceAnalysis.trend !== 'stable' && (
            <div className={`flex items-center gap-1 p-1 rounded text-xs ${
              priceAnalysis.trend === 'dropping' ? 'bg-green-50 text-green-700 border border-green-200' :
              'bg-orange-50 text-orange-700 border border-orange-200'
            }`}>
              <Award className="w-3 h-3" />
              <span>{priceAnalysis.trend === 'dropping' ? 'Market Low' : 'Market High'}</span>
            </div>
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

        <div className="flex flex-col gap-2">
          {listing.url.includes('/sample') ? (
            <div className="w-full px-3 py-2 bg-surface-secondary text-secondary rounded-md text-sm text-center cursor-not-allowed">
              Demo Listing
            </div>
          ) : (
            <a
              href={listing.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full inline-flex items-center justify-center gap-1 px-3 py-2 bg-accent hover:bg-accent-hover text-accent-foreground rounded-md font-medium transition-colors text-sm"
            >
              <span>View Listing</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          )}
          {onViewDetails && (
            <button 
              onClick={onViewDetails}
              className="w-full px-3 py-2 bg-surface-secondary hover:bg-surface-secondary text-foreground rounded-md font-medium transition-colors text-sm"
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