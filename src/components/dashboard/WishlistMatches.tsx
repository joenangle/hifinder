'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Heart, ExternalLink, ShoppingBag } from 'lucide-react'

interface WishlistMatch {
  componentId: string
  brand: string
  name: string
  category: string
  listingCount: number
  lowestPrice: number
  priceUsedMin: number | null
  priceUsedMax: number | null
}

export function WishlistMatches({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { data: session } = useSession()
  const [matches, setMatches] = useState<WishlistMatch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.user?.id) return

    const fetchMatches = async () => {
      // Get wishlist items with component data
      const { data: wishlistItems } = await supabase
        .from('wishlists')
        .select('component_id, components(id, brand, name, category, price_used_min, price_used_max)')
        .eq('user_id', session.user.id)

      if (!wishlistItems || wishlistItems.length === 0) {
        setLoading(false)
        return
      }

      const componentIds = wishlistItems
        .map(w => w.component_id)
        .filter((id): id is string => !!id)

      if (componentIds.length === 0) {
        setLoading(false)
        return
      }

      // Check which wishlist items have active used listings
      const { data: listings } = await supabase
        .from('used_listings')
        .select('component_id, price')
        .in('component_id', componentIds)
        .eq('status', 'available')

      if (!listings || listings.length === 0) {
        setLoading(false)
        return
      }

      // Group listings by component
      const listingsByComponent = new Map<string, { count: number; lowest: number }>()
      for (const listing of listings) {
        if (!listing.component_id) continue
        const existing = listingsByComponent.get(listing.component_id)
        if (existing) {
          existing.count++
          if (listing.price && listing.price < existing.lowest) {
            existing.lowest = listing.price
          }
        } else {
          listingsByComponent.set(listing.component_id, {
            count: 1,
            lowest: listing.price || 0
          })
        }
      }

      // Build matches
      const result: WishlistMatch[] = []
      for (const item of wishlistItems) {
        const comp = item.components as unknown as { id: string; brand: string; name: string; category: string; price_used_min: number | null; price_used_max: number | null } | null
        if (!comp || !item.component_id) continue
        const listingData = listingsByComponent.get(item.component_id)
        if (!listingData) continue

        result.push({
          componentId: item.component_id,
          brand: comp.brand,
          name: comp.name,
          category: comp.category,
          listingCount: listingData.count,
          lowestPrice: listingData.lowest,
          priceUsedMin: comp.price_used_min,
          priceUsedMax: comp.price_used_max
        })
      }

      // Sort by listing count descending
      result.sort((a, b) => b.listingCount - a.listingCount)
      setMatches(result)
      setLoading(false)
    }

    fetchMatches()
  }, [session?.user?.id])

  if (loading || matches.length === 0) return null

  const fmt = (amount: number) => `$${Math.round(amount).toLocaleString()}`

  return (
    <div className="card p-6 border-green-500/30">
      <div className="flex items-center gap-2 mb-4">
        <ShoppingBag className="w-5 h-5 text-green-500" />
        <h3 className="text-lg font-semibold text-foreground">
          Wishlist Items Available
        </h3>
        <span className="px-2 py-0.5 bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-semibold rounded-full">
          {matches.length} found
        </span>
      </div>
      <div className="space-y-2">
        {matches.map(match => (
          <Link
            key={match.componentId}
            href={`/marketplace?search=${encodeURIComponent(`${match.brand} ${match.name}`)}`}
            className="flex items-center justify-between gap-3 p-3 rounded-lg hover:bg-surface-secondary transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <Heart className="w-4 h-4 text-pink-500 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {match.brand} {match.name}
                </p>
                <p className="text-xs text-muted">
                  {match.listingCount} listing{match.listingCount !== 1 ? 's' : ''} available
                  {match.lowestPrice > 0 ? ` · from ${fmt(match.lowestPrice)}` : ''}
                </p>
              </div>
            </div>
            <ExternalLink className="w-4 h-4 text-muted flex-shrink-0" />
          </Link>
        ))}
      </div>
      <button
        onClick={() => setActiveTab('wishlist')}
        className="mt-3 text-xs text-accent hover:underline"
      >
        View full wishlist
      </button>
    </div>
  )
}
