'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { UserGearItem } from '@/lib/gear'
import { Package, Plus, DollarSign, Calendar, MapPin } from 'lucide-react'
import Link from 'next/link'

export function GearTab() {
  const { data: session } = useSession()
  const [gear, setGear] = useState<UserGearItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'headphones' | 'dacs' | 'amps'>('all')

  const loadGear = useCallback(async () => {
    if (!session?.user?.id) return

    setLoading(true)
    try {
      const response = await fetch('/api/user/dashboard', {
        credentials: 'include'
      })

      if (response.ok) {
        const data = await response.json()
        setGear(data.gear || [])
      }
    } catch (error) {
      console.error('Error loading gear:', error)
    }
    setLoading(false)
  }, [session?.user?.id])

  useEffect(() => {
    if (session?.user?.id) {
      loadGear()
    }
  }, [session?.user?.id, loadGear])

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getCategoryFromItem = (item: UserGearItem): string => {
    if (item.custom_category) return item.custom_category
    if (item.components?.category) return item.components.category
    return 'other'
  }

  const filteredGear = gear.filter(item => {
    if (filter === 'all') return true
    const category = getCategoryFromItem(item)
    return category === filter
  })

  const getDisplayName = (item: UserGearItem): string => {
    if (item.custom_name) return item.custom_name
    if (item.custom_brand) return `${item.custom_brand} (Custom)`
    if (item.components) return `${item.components.brand} ${item.components.name}`
    return 'Unknown Item'
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    )
  }

  if (gear.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 mx-auto mb-4 text-muted" />
        <h2 className="text-xl font-semibold text-foreground mb-2">No gear in your collection</h2>
        <p className="text-muted mb-6">
          Start tracking your audio gear collection
        </p>
        <Link
          href="/gear"
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-accent-foreground rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Your First Item
        </Link>
      </div>
    )
  }

  return (
    <div>
      {/* Header with Add Button */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-1">My Gear Collection</h2>
          <p className="text-muted">{gear.length} {gear.length === 1 ? 'item' : 'items'} in your collection</p>
        </div>
        <Link
          href="/gear"
          className="inline-flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-accent-foreground rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Gear
        </Link>
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'all'
              ? 'bg-accent text-accent-foreground'
              : 'bg-surface-secondary text-muted hover:text-foreground'
          }`}
        >
          All ({gear.length})
        </button>
        <button
          onClick={() => setFilter('headphones')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'headphones'
              ? 'bg-accent text-accent-foreground'
              : 'bg-surface-secondary text-muted hover:text-foreground'
          }`}
        >
          Headphones ({gear.filter(g => getCategoryFromItem(g) === 'headphones').length})
        </button>
        <button
          onClick={() => setFilter('dacs')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'dacs'
              ? 'bg-accent text-accent-foreground'
              : 'bg-surface-secondary text-muted hover:text-foreground'
          }`}
        >
          DACs ({gear.filter(g => getCategoryFromItem(g) === 'dacs').length})
        </button>
        <button
          onClick={() => setFilter('amps')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            filter === 'amps'
              ? 'bg-accent text-accent-foreground'
              : 'bg-surface-secondary text-muted hover:text-foreground'
          }`}
        >
          Amps ({gear.filter(g => getCategoryFromItem(g) === 'amps').length})
        </button>
      </div>

      {/* Gear Grid */}
      {filteredGear.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-12 h-12 mx-auto mb-3 text-muted" />
          <p className="text-muted">No {filter} in your collection</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGear.map((item) => (
            <div
              key={item.id}
              className="bg-surface-elevated border border-border rounded-lg p-6 hover:border-accent transition-colors"
            >
              {/* Item Name */}
              <div className="mb-4">
                <h3 className="font-semibold text-foreground text-lg mb-1">
                  {getDisplayName(item)}
                </h3>
                <p className="text-sm text-muted capitalize">
                  {getCategoryFromItem(item)}
                </p>
              </div>

              {/* Purchase Info */}
              <div className="space-y-2 mb-4">
                {item.purchase_price && (
                  <div className="flex items-center gap-2 text-sm">
                    <DollarSign className="w-4 h-4 text-muted" />
                    <span className="text-foreground">
                      Paid {formatPrice(item.purchase_price)}
                    </span>
                  </div>
                )}

                {item.purchase_date && (
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-muted" />
                    <span className="text-muted">
                      {new Date(item.purchase_date).toLocaleDateString()}
                    </span>
                  </div>
                )}

                {item.purchase_location && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-muted" />
                    <span className="text-muted">{item.purchase_location}</span>
                  </div>
                )}

                {item.condition && (
                  <div className="mt-2">
                    <span className="inline-block px-2 py-1 bg-surface-secondary text-muted text-xs rounded capitalize">
                      {item.condition}
                    </span>
                  </div>
                )}
              </div>

              {/* Notes */}
              {item.notes && (
                <div className="mt-3 pt-3 border-t border-border">
                  <p className="text-xs text-muted line-clamp-2">{item.notes}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Link to Full Gear Page */}
      <div className="mt-8 text-center">
        <Link
          href="/gear"
          className="text-accent hover:underline font-medium"
        >
          View full gear management page →
        </Link>
      </div>
    </div>
  )
}
