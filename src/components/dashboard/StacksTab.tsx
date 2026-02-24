'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Layers } from 'lucide-react'
import Link from 'next/link'
import { StackWithGear, StackComponentData, getStackComponentData, purposeIcons } from '@/lib/stacks'
import { getCategoryLabel, getCategoryColor, getCategoryEmoji } from '@/lib/gear-utils'
import { StackItemDetailModal } from '@/components/StackItemDetailModal'

const fmt = (amount: number) => `$${Math.round(amount).toLocaleString()}`

export function StacksTab() {
  const { data: session } = useSession()
  const [stacks, setStacks] = useState<StackWithGear[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedItem, setSelectedItem] = useState<StackComponentData | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  const loadStacks = useCallback(async () => {
    if (!session?.user?.id) return
    setLoading(true)
    try {
      const res = await fetch('/api/stacks')
      if (res.ok) {
        const data = await res.json()
        setStacks(data)
      }
    } catch (error) {
      console.error('Error fetching stacks:', error)
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id])

  useEffect(() => {
    if (session?.user?.id) {
      loadStacks()
    }
  }, [session?.user?.id, loadStacks])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    )
  }

  if (stacks.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center p-3 bg-orange-500/10 rounded-2xl mb-4">
          <Layers className="w-12 h-12 text-orange-500" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">No stacks yet</h2>
        <p className="text-muted mb-6 max-w-md mx-auto">
          Organize your audio gear into purposeful setups like desktop rigs, portable kits, or gaming stations.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link href="/gear?tab=stacks" className="button button-primary">
            Create Your First Stack
          </Link>
          <Link href="/recommendations" className="button button-secondary">
            Get Recommendations
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          My Stacks ({stacks.length})
        </h2>
        <Link
          href="/gear?tab=stacks"
          className="text-sm font-medium text-accent hover:text-accent-hover transition-colors"
        >
          Manage Stacks
        </Link>
      </div>

      {/* Stack Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {stacks.map(stack => {
          const components = stack.stack_components || []
          let totalValue = 0
          components.forEach(sc => {
            const d = getStackComponentData(sc)
            if (d.price_used_min && d.price_used_max) {
              totalValue += (d.price_used_min + d.price_used_max) / 2
            } else if (d.price_new) {
              totalValue += d.price_new * 0.7
            }
          })

          return (
            <div key={stack.id} className="card p-5 hover:border-accent/50 transition-colors">
              {/* Stack header */}
              <div className="flex items-start justify-between mb-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-foreground truncate">{stack.name}</h3>
                    {stack.purpose && stack.purpose !== 'general' && (
                      <span className="text-xs px-2 py-0.5 rounded-full capitalize bg-surface-secondary text-muted whitespace-nowrap">
                        {purposeIcons[stack.purpose]} {stack.purpose}
                      </span>
                    )}
                  </div>
                  {stack.description && (
                    <p className="text-sm text-muted mt-1 line-clamp-1">{stack.description}</p>
                  )}
                </div>
              </div>

              {/* Quick stats */}
              <div className="flex gap-4 text-sm text-muted mb-4">
                <span>{components.length} {components.length === 1 ? 'item' : 'items'}</span>
                {totalValue > 0 && <span>~{fmt(totalValue)} value</span>}
              </div>

              {/* Component list */}
              <div className="space-y-1.5">
                {components.slice(0, 5).map(sc => {
                  const d = getStackComponentData(sc)
                  const catColor = getCategoryColor(d.category)
                  const price = d.price_used_min && d.price_used_max
                    ? Math.round((d.price_used_min + d.price_used_max) / 2)
                    : d.price_new ? Math.round(d.price_new) : null
                  return (
                    <div
                      key={sc.id}
                      className="flex items-center gap-2 text-sm p-1.5 rounded cursor-pointer hover:bg-surface-hover transition-colors"
                      onClick={() => {
                        setSelectedItem(d)
                        setShowDetail(true)
                      }}
                    >
                      <span className="text-sm">{getCategoryEmoji(d.category)}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${catColor.bg} ${catColor.text}`}>
                        {getCategoryLabel(d.category)}
                      </span>
                      <span className="text-foreground truncate flex-1">
                        {d.brand} {d.name}
                      </span>
                      {price && (
                        <span className="text-xs text-muted whitespace-nowrap">
                          ~{fmt(price)}
                        </span>
                      )}
                    </div>
                  )
                })}
                {components.length > 5 && (
                  <p className="text-xs text-muted pl-7">+{components.length - 5} more</p>
                )}
                {components.length === 0 && (
                  <p className="text-sm text-muted italic">No items in this stack</p>
                )}
              </div>

              {/* Link to manage */}
              <div className="mt-4 pt-3 border-t border-border">
                <Link
                  href="/gear?tab=stacks"
                  className="text-xs font-medium text-accent hover:text-accent-hover transition-colors"
                >
                  Edit stack
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* Stack Item Detail Modal */}
      <StackItemDetailModal
        isOpen={showDetail}
        onClose={() => {
          setShowDetail(false)
          setSelectedItem(null)
        }}
        data={selectedItem}
      />
    </div>
  )
}
