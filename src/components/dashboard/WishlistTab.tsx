'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { getUserWishlist } from '@/lib/wishlist'
import { WishlistItem } from '@/types/auth'
import { Heart } from 'lucide-react'
import { WishlistButton } from '@/components/WishlistButton'
import { FindUsedButton } from '@/components/marketplace/FindUsedButton'
import { PriceAlertButton } from '@/components/PriceAlertButton'
import { supabase } from '@/lib/supabase'
import { countListingsByComponent, type ListingCountEntry } from '@/lib/listing-counts'
import Link from 'next/link'

export function WishlistTab() {
  const { data: session } = useSession()
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
  const [listingCounts, setListingCounts] = useState<Map<string, ListingCountEntry>>(new Map())
  const [loading, setLoading] = useState(true)

  const loadWishlist = useCallback(async () => {
    if (!session?.user?.id) return

    setLoading(true)
    const items = await getUserWishlist(session.user.id)
    setWishlistItems(items)

    // Fetch active used-listing counts so we can gate the "Find Used" CTA:
    // inventory => show count; none => offer a price alert (which now fires).
    const componentIds = items
      .map((i) => i.component_id)
      .filter((id): id is string => !!id)
    if (componentIds.length > 0) {
      const { data: listings } = await supabase
        .from('used_listings')
        .select('component_id, price')
        .in('component_id', componentIds)
        .eq('status', 'available')
      setListingCounts(countListingsByComponent(listings ?? []))
    } else {
      setListingCounts(new Map())
    }

    setLoading(false)
  }, [session?.user?.id])

  // Load wishlist on mount and when session is available
  useEffect(() => {
    if (session?.user?.id) {
      loadWishlist()
    }
  }, [session?.user?.id, loadWishlist])

  // Refetch wishlist when window regains focus (user returns to tab)
  useEffect(() => {
    const handleFocus = () => {
      if (session?.user?.id) {
        loadWishlist()
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [session?.user?.id, loadWishlist])

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getCategoryDisplay = (category: string) => {
    switch (category) {
      case 'cans': return 'Headphones'
      case 'iems': return 'In-Ear Monitors'
      case 'dac': return 'DAC'
      case 'amp': return 'Amplifier'
      case 'dac_amp': return 'DAC/Amp Combo'
      case 'cable': return 'Cable'
      default: return category
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    )
  }

  if (wishlistItems.length === 0) {
    return (
      <div className="text-center py-12">
        <Heart className="w-16 h-16 mx-auto mb-4 text-muted" />
        <h2 className="heading-3 mb-2">Your wishlist is empty</h2>
        <p className="text-muted mb-6">
          Start adding components from the recommendations page or browse the used market
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/recommendations"
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-accent-foreground rounded-lg font-medium transition-colors"
          >
            Browse Recommendations
          </Link>
          <Link
            href="/marketplace"
            className="px-4 py-2 border border-border hover:border-accent rounded-lg transition-colors"
          >
            Browse Used Market
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {wishlistItems.map((item) => (
        <div
          key={item.id}
          className="bg-surface-elevated border border-border rounded-lg p-6 hover:border-accent transition-colors"
        >
          {/* Component Info */}
          <div className="mb-4">
            <h3 className="font-semibold text-foreground text-lg mb-1">
              {item.component?.brand} {item.component?.name}
            </h3>
            <p className="text-sm text-muted">
              {getCategoryDisplay(item.component?.category || '')}
            </p>
          </div>

          {/* Price Info */}
          {(item.component?.price_used_min && item.component?.price_used_max) && (
            <div className="mb-4 p-3 bg-surface-secondary rounded-lg">
              <div className="text-sm text-muted mb-1">Used Price Range</div>
              <div className="font-semibold text-foreground">
                {formatPrice(item.component.price_used_min)} - {formatPrice(item.component.price_used_max)}
              </div>
              {item.component?.price_new && (
                <div className="text-sm text-muted">
                  New: {formatPrice(item.component.price_new)}
                </div>
              )}
            </div>
          )}

          {/* Actions — show listings when available, otherwise capture a price
              alert (the matcher now fires these when matching gear is listed). */}
          <div className="flex gap-2">
            {(listingCounts.get(item.component_id)?.count ?? 0) > 0 ? (
              <FindUsedButton
                componentId={item.component_id}
                componentName={item.component?.name}
                brand={item.component?.brand}
                listingCount={listingCounts.get(item.component_id)?.count}
                className="flex-1 justify-center"
                showText
              />
            ) : (
              <PriceAlertButton
                componentId={item.component_id}
                avgPrice={
                  item.component?.price_used_min && item.component?.price_used_max
                    ? (item.component.price_used_min + item.component.price_used_max) / 2
                    : item.component?.price_new ?? 0
                }
                priceFloor={item.component?.price_used_min ?? null}
                className="flex-1 justify-center"
                showText
              />
            )}
            <WishlistButton
              componentId={item.component_id}
              className="px-3"
            />
          </div>

          {/* Added Date */}
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-xs text-muted">
              Added {new Date(item.created_at).toLocaleDateString()}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
