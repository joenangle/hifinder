'use client'

import { UsedListing } from '@/types'

interface ListingCardProps {
  listing: UsedListing;
  expectedPrice: number;
}

export function ListingCard({ listing, expectedPrice }: ListingCardProps) {
  const priceVariance = ((listing.price - expectedPrice) / expectedPrice) * 100
  
  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'excellent': return 'text-green-400'
      case 'very_good': return 'text-blue-400'  
      case 'good': return 'text-yellow-400'
      case 'fair': return 'text-orange-400'
      case 'parts_only': return 'text-red-400'
      default: return 'text-gray-400'
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
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 hover:border-gray-600 transition-all">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h4 className="font-semibold text-white mb-2">{listing.title}</h4>
          
          <div className="flex flex-wrap gap-3 mb-3 text-sm">
            <span className="text-gray-400">
              📍 {listing.location}
            </span>
            <span className="text-gray-400">
              🕒 {timeAgo(listing.date_posted)}
            </span>
            <span className="text-gray-400">
              📱 {getSourceDisplay(listing.source)}
            </span>
            <span className={getConditionColor(listing.condition)}>
              ✦ {listing.condition.replace('_', ' ')}
            </span>
          </div>

          {/* Seller Trust Indicators */}
          <div className="flex flex-wrap gap-3 text-sm">
            <span className="text-gray-400">
              👤 u/{listing.seller.username}
            </span>
            {listing.seller.confirmed_trades && listing.seller.confirmed_trades > 0 && (
              <span className="text-green-400">
                ✓ {listing.seller.confirmed_trades} confirmed trades
              </span>
            )}
            {listing.seller.feedback_percentage && (
              <span className={listing.seller.feedback_percentage >= 98 ? 'text-green-400' : 'text-yellow-400'}>
                ⭐ {listing.seller.feedback_percentage}% feedback
              </span>
            )}
          </div>

          {/* Price Validation Warning */}
          {!listing.price_validation.is_reasonable && listing.price_validation.warning && (
            <div className="mt-3 p-2 bg-yellow-900/30 border border-yellow-600/50 rounded text-yellow-300 text-sm">
              ⚠️ {listing.price_validation.warning}
            </div>
          )}
        </div>

        <div className="text-right ml-4">
          <div className="text-2xl font-bold text-white">${listing.price}</div>
          
          {/* Price Variance Indicator */}
          <div className={`text-sm font-medium ${
            priceVariance < -10 ? 'text-green-400' : 
            priceVariance > 10 ? 'text-red-400' : 
            'text-gray-400'
          }`}>
            {priceVariance < 0 ? '↓' : '↑'} {Math.abs(priceVariance).toFixed(0)}% vs typical
          </div>
          
          <a 
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm font-medium transition-colors"
          >
            View Listing →
          </a>
        </div>
      </div>
    </div>
  )
}