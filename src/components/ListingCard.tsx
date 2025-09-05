'use client'

import { UsedListing } from '@/types'

interface ListingCardProps {
  listing: UsedListing;
  expectedPrice: number;
}

export function ListingCard({ listing, expectedPrice }: ListingCardProps) {
  const priceVariance = ((listing.price - expectedPrice) / expectedPrice) * 100
  
  const formatBudgetUSD = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }
  
  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'text-success'
      case 'very_good': return 'text-info'  
      case 'good': return 'text-warning'
      case 'fair': return 'text-warning'
      case 'parts_only': return 'text-error'
      default: return 'text-tertiary'
    }
  }

  const getSourceDisplay = (source: string) => {
    switch (source) {
      case 'reddit_avexchange': return 'r/AVexchange'
      case 'ebay': return 'eBay'
      case 'head_fi': return 'Head-Fi'
      case 'usaudiomart': return 'USAudioMart'
      case 'manual': return 'Curated'
      default: return source
    }
  }

  const timeAgo = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))
    
    if (diffInHours < 24) return `${diffInHours}h ago`
    const diffInDays = Math.floor(diffInHours / 24)
    if (diffInDays < 7) return `${diffInDays}d ago`
    return `${Math.floor(diffInDays / 7)}w ago`
  }

  return (
    <div className="card transition-all">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="font-semibold text-primary mb-2">{listing.title}</h4>
          
          <div className="flex flex-wrap gap-3 mb-3 text-sm">
            <span className="text-secondary">
              📍 {listing.location}
            </span>
            <span className="text-secondary">
              🕒 {timeAgo(listing.date_posted)}
            </span>
            <span className="text-secondary">
              📱 {getSourceDisplay(listing.source)}
            </span>
            <span className={getConditionColor(listing.condition)}>
              ✦ {listing.condition.replace('_', ' ')}
            </span>
          </div>

          {/* Seller Trust Indicators */}
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="text-secondary">
              👤 u/{listing.seller_username}
            </span>
            {listing.seller_confirmed_trades && listing.seller_confirmed_trades > 0 && (
              <span className="text-success">
                ✓ {listing.seller_confirmed_trades} confirmed trades
              </span>
            )}
            {listing.seller_feedback_percentage && (
              <span className={listing.seller_feedback_percentage >= 98 ? 'text-success' : 'text-warning'}>
                ⭐ {listing.seller_feedback_percentage}% feedback
              </span>
            )}
          </div>

          {/* Price Validation Warning */}
          {!listing.price_is_reasonable && listing.price_warning && (
            <div className="mt-3 p-2 bg-warning-light border border-warning rounded text-warning text-sm">
              ⚠️ {listing.price_warning}
            </div>
          )}
        </div>

        <div className="text-right ml-4">
          <div className="text-2xl font-bold text-primary">{formatBudgetUSD(listing.price)}</div>
          
          {/* Price Variance Indicator */}
          <div className={`text-sm font-medium ${
            priceVariance < -10 ? 'text-success' : 
            priceVariance > 10 ? 'text-error' : 
            'text-tertiary'
          }`}>
            {priceVariance < -10 ? '💰 ' : priceVariance > 10 ? '⚠️ ' : ''}
            {priceVariance < 0 ? 
              `${Math.abs(priceVariance).toFixed(0)}% below typical` : 
              `${priceVariance.toFixed(0)}% above typical`
            }
          </div>
          
{listing.url.includes('/sample') ? (
            <div className="button button-secondary mt-2 cursor-not-allowed">
              Demo Listing
            </div>
          ) : (
            <a 
              href={listing.url}
              target="_blank"
              rel="noopener noreferrer"
              className="button button-primary mt-2"
            >
              View Listing →
            </a>
          )}
        </div>
      </div>
    </div>
  )
}