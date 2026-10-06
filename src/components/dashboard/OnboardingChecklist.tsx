'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import {
  CheckCircle,
  Circle,
  Package,
  Heart,
  Bell,
  Layers,
  Search,
  X
} from 'lucide-react'

interface ChecklistItem {
  id: string
  label: string
  description: string
  icon: React.ReactNode
  done: boolean
  action: { type: 'link'; href: string } | { type: 'tab'; tab: string }
}

export function OnboardingChecklist({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { data: session } = useSession()
  const [items, setItems] = useState<ChecklistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Check if user has dismissed the checklist
    const wasDismissed = localStorage.getItem('hifinder_checklist_dismissed')
    if (wasDismissed) {
      setDismissed(true)
      setLoading(false)
      return
    }

    if (!session?.user?.id) return

    const checkProgress = async () => {
      const response = await fetch('/api/user/activity', { credentials: 'include' })
      if (!response.ok) {
        setLoading(false)
        return
      }
      const { counts } = await response.json() as {
        counts: { gear: number; wishlist: number; alerts: number; stacks: number }
      }

      const hasGear = counts.gear > 0
      const hasWishlist = counts.wishlist > 0
      const hasAlerts = counts.alerts > 0
      const hasStacks = counts.stacks > 0
      const hasVisitedRecs = !!localStorage.getItem('hifinder_visited_recommendations')

      setItems([
        {
          id: 'recs',
          label: 'Get your first recommendations',
          description: 'Set your budget and preferences',
          icon: <Search className="w-4 h-4" />,
          done: hasVisitedRecs,
          action: { type: 'link', href: '/recommendations' }
        },
        {
          id: 'gear',
          label: 'Add gear to your collection',
          description: 'Track what you own',
          icon: <Package className="w-4 h-4" />,
          done: hasGear,
          action: { type: 'link', href: '/gear' }
        },
        {
          id: 'wishlist',
          label: 'Save an item to your wishlist',
          description: 'Bookmark gear you want',
          icon: <Heart className="w-4 h-4" />,
          done: hasWishlist,
          action: { type: 'tab', tab: 'wishlist' }
        },
        {
          id: 'alert',
          label: 'Set up a price alert',
          description: 'Get notified of deals',
          icon: <Bell className="w-4 h-4" />,
          done: hasAlerts,
          action: { type: 'tab', tab: 'alerts' }
        },
        {
          id: 'stack',
          label: 'Create your first stack',
          description: 'Build your ideal audio system',
          icon: <Layers className="w-4 h-4" />,
          done: hasStacks,
          action: { type: 'link', href: '/gear?tab=stacks' }
        }
      ])

      setLoading(false)
    }

    checkProgress()
  }, [session?.user?.id])

  const handleDismiss = () => {
    localStorage.setItem('hifinder_checklist_dismissed', 'true')
    setDismissed(true)
  }

  if (loading || dismissed) return null

  const completedCount = items.filter(i => i.done).length
  const allDone = completedCount === items.length

  // Auto-dismiss if everything is done
  if (allDone) return null

  const progressPct = (completedCount / items.length) * 100

  return (
    <div className="card p-6 border-accent/30">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Get Started</h3>
          <p className="text-sm text-muted">{completedCount} of {items.length} completed</p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-muted hover:text-foreground transition-colors"
          title="Dismiss checklist"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-surface-secondary rounded-full mb-4 overflow-hidden">
        <div
          className="h-full bg-accent rounded-full transition-[width] duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="space-y-1">
        {items.map(item => {
          const content = (
            <div
              className={`flex items-center gap-3 p-2.5 rounded-lg transition-colors ${
                item.done
                  ? 'opacity-60'
                  : 'hover:bg-surface-secondary cursor-pointer'
              }`}
            >
              {item.done ? (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : (
                <Circle className="w-5 h-5 text-muted flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${item.done ? 'line-through text-muted' : 'text-foreground'}`}>
                  {item.label}
                </p>
                <p className="text-xs text-muted">{item.description}</p>
              </div>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                item.done ? 'text-muted' : 'text-accent bg-accent/10'
              }`}>
                {item.icon}
              </div>
            </div>
          )

          if (item.done) return <div key={item.id}>{content}</div>

          if (item.action.type === 'link') {
            return <Link key={item.id} href={item.action.href}>{content}</Link>
          }

          const tabAction = item.action
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(tabAction.tab)}
              className="w-full text-left"
            >
              {content}
            </button>
          )
        })}
      </div>
    </div>
  )
}
