'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { getUserWishlist } from '@/lib/wishlist'
import { WishlistItem } from '@/types/auth'
import { Heart } from 'lucide-react'
import { WishlistButton } from '@/components/WishlistButton'
import { FindUsedButton } from '@/components/FindUsedButton'
import Link from 'next/link'

function WishlistContent() {
  const { data: session } = useSession()
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session?.user?.id) {
      loadWishlist()
    }
  }, [session?.user?.id, loadWishlist])

  const loadWishlist = useCallback(async () => {
    if (!session?.user?.id) return
    
    setLoading(true)
    const items = await getUserWishlist(session.user.id)
    setWishlistItems(items)
    setLoading(false)
  }, [session?.user?.id])

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getCategoryDisplay = (category: string, type: string) => {
    if (category === 'headphones') {
      switch (type) {
        case 'over_ear': return 'Over-Ear Headphones'
        case 'on_ear': return 'On-Ear Headphones'
        case 'iem': return 'In-Ear Monitors'
        default: return 'Headphones'
      }
    }
    return category
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="max-w-md text-center">
          <Heart className="w-16 h-16 mx-auto mb-4 text-muted" />
          <h1 className="text-2xl font-bold text-foreground mb-2">Sign In to View Wishlist</h1>
          <p className="text-muted mb-4">
            Save your favorite audio components and track them across the used market.
          </p>
          <button
            onClick={() => {/* TODO: Open login modal */}}
            className="px-6 py-2 bg-accent hover:bg-accent-hover text-accent-foreground rounded-lg font-medium transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-6xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Heart className="w-8 h-8 text-accent" />
            <h1 className="text-3xl font-bold text-foreground">My Wishlist</h1>
          </div>
          <p className="text-muted">
            Components you&apos;ve saved for future reference
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
          </div>
        ) : wishlistItems.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-16 h-16 mx-auto mb-4 text-muted" />
            <h2 className="text-xl font-semibold text-foreground mb-2">Your wishlist is empty</h2>
            <p className="text-muted mb-6">
              Start adding components from our recommendations or browse the used market
            </p>
            <div className="flex gap-3 justify-center">
              <Link
                href="/recommendations"
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-accent-foreground rounded-lg font-medium transition-colors"
              >
                Browse Recommendations
              </Link>
              <Link
                href="/used-market"
                className="px-4 py-2 border border-border hover:border-accent rounded-lg transition-colors"
              >
                Browse Used Market
              </Link>
            </div>
          </div>
        ) : (
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
                    {getCategoryDisplay(item.component?.category || '', item.component?.type || '')}
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

                {/* Actions */}
                <div className="flex gap-2">
                  <FindUsedButton
                    componentId={item.component_id}
                    componentName={item.component?.name}
                    brand={item.component?.brand}
                    className="flex-1 justify-center"
                    showText
                  />
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
        )}
      </div>
    </div>
  )
}

export default function WishlistPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    }>
      <WishlistContent />
    </Suspense>
  )
}