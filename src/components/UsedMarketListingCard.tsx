'use client'

import { Component, UsedListing } from '@/types'
import { Clock, MapPin, User, Star, AlertTriangle } from 'lucide-react'
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
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getSourceDisplay = (source: string) => {
    const sourceMap: { [key: string]: { name: string; color: string } } = {
      'reddit_avexchange': { name: 'r/AVexchange', color: 'bg-orange-100 text-orange-800' },
      'ebay': { name: 'eBay', color: 'bg-blue-100 text-blue-800' },
      'head_fi': { name: 'Head-Fi', color: 'bg-purple-100 text-purple-800' },
      'reverb': { name: 'Reverb', color: 'bg-green-100 text-green-800' },
      'manual': { name: 'Curated', color: 'bg-gray-100 text-gray-800' }
    }
    return sourceMap[source] || { name: source, color: 'bg-gray-100 text-gray-800' }
  }

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)}w ago`
    return `${Math.floor(diffInDays / 30)}mo ago`
  }

  const amplificationAssessment = assessAmplificationFromImpedance(
    component.impedance, 
    component.needs_amp,
    component.name,
    component.brand
  )

  const sourceInfo = getSourceDisplay(listing.source)

  if (viewMode === 'list') {
    return (
      <div className="bg-surface-elevated border border-border rounded-lg p-4 hover:border-accent transition-colors">
        <div className="flex items-start justify-between gap-4">
          {/* Left: Component & Listing Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-foreground text-lg mb-1">
                  {component.brand} {component.name}
                </h3>
                <p className="text-muted text-sm line-clamp-2 mb-2">{listing.title}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-foreground">{formatPrice(listing.price)}</div>
                {listing.price_variance_percentage && Math.abs(listing.price_variance_percentage) > 10 && (
                  <div className={`text-sm font-medium ${
                    listing.price_variance_percentage < -10 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {listing.price_variance_percentage < 0 
                      ? `${Math.abs(listing.price_variance_percentage)}% below typical`
                      : `${listing.price_variance_percentage}% above typical`
                    }
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
              <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                {component.category === 'cans' ? 'Headphones' : component.category === 'iems' ? 'IEMs' : component.category}
              </span>
              {amplificationAssessment.difficulty !== 'unknown' && (
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
                <Clock className="w-4 h-4" />
                <span>{timeAgo(listing.date_posted)}</span>
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

            {/* Price Warning */}
            {listing.price_warning && (
              <div className="flex items-start gap-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-yellow-800 text-sm mb-3">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{listing.price_warning}</span>
              </div>
            )}
          </div>

          {/* Right: Actions */}
          <div className="flex flex-col gap-2">
            {listing.url.includes('/sample') ? (
              <div className="px-4 py-2 bg-gray-100 text-gray-500 rounded-md text-sm cursor-not-allowed">
                Demo Listing
              </div>
            ) : (
              <a 
                href={listing.url}
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-accent-foreground rounded-md font-medium transition-colors text-sm"
              >
                View Listing →
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
    <div className="bg-surface-elevated border border-border rounded-lg p-4 hover:border-accent transition-colors h-full flex flex-col">
      {/* Header */}
      <div className="mb-3">
        <h3 className="font-semibold text-foreground mb-1 line-clamp-1">
          {component.brand} {component.name}
        </h3>
        <p className="text-muted text-sm line-clamp-2 mb-2">{listing.title}</p>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1 mb-3">
        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${sourceInfo.color}`}>
          {sourceInfo.name}
        </span>
        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getConditionColor(listing.condition)}`}>
          {listing.condition.replace('_', ' ')}
        </span>
        {amplificationAssessment.difficulty !== 'unknown' && (
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
          <Clock className="w-4 h-4" />
          <span>{timeAgo(listing.date_posted)}</span>
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
          {listing.price_variance_percentage && Math.abs(listing.price_variance_percentage) > 10 && (
            <div className={`text-sm font-medium ${
              listing.price_variance_percentage < -10 ? 'text-green-600' : 'text-red-600'
            }`}>
              {listing.price_variance_percentage < 0 
                ? `${Math.abs(listing.price_variance_percentage)}% below`
                : `${listing.price_variance_percentage}% above`
              }
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          {listing.url.includes('/sample') ? (
            <div className="w-full px-3 py-2 bg-gray-100 text-gray-500 rounded-md text-sm text-center cursor-not-allowed">
              Demo Listing
            </div>
          ) : (
            <a 
              href={listing.url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full px-3 py-2 bg-accent hover:bg-accent-hover text-accent-foreground rounded-md font-medium transition-colors text-sm text-center"
            >
              View Listing →
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
  )
}