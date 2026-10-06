'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  Package,
  Heart,
  Bell,
  Layers,
  Clock
} from 'lucide-react'

interface ActivityItem {
  id: string
  type: 'gear_added' | 'wishlist_added' | 'alert_created' | 'alert_triggered' | 'stack_created'
  title: string
  subtitle?: string
  timestamp: string
  link?: { tab?: string; href?: string; label?: string }
}

// Shape of `recent` from GET /api/user/activity
interface RecentActivity {
  gear: { id: string; created_at: string; components: { brand: string; name: string; category: string } | null }[]
  wishlist: { id: string; created_at: string; components: { brand: string; name: string } | null }[]
  alertHistory: { id: string; triggered_at: string; listing_title: string; listing_price: number; user_viewed: boolean }[]
  stacks: { id: string; name: string; created_at: string }[]
}

export function RecentActivityFeed({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.user?.id) return

    const fetchActivity = async () => {
      const items: ActivityItem[] = []

      const response = await fetch('/api/user/activity', { credentials: 'include' })
      if (!response.ok) {
        setLoading(false)
        return
      }
      const { recent } = await response.json() as { recent: RecentActivity }

      for (const item of recent.gear) {
        const comp = item.components
        items.push({
          id: `gear-${item.id}`,
          type: 'gear_added',
          title: comp ? `Added ${comp.brand} ${comp.name}` : 'Added gear to collection',
          subtitle: comp?.category,
          timestamp: item.created_at,
          link: { href: '/gear' }
        })
      }

      for (const item of recent.wishlist) {
        const comp = item.components
        items.push({
          id: `wish-${item.id}`,
          type: 'wishlist_added',
          title: comp ? `Saved ${comp.brand} ${comp.name}` : 'Added item to wishlist',
          timestamp: item.created_at,
          link: { tab: 'wishlist' }
        })
      }

      for (const item of recent.alertHistory) {
        items.push({
          id: `alert-${item.id}`,
          type: 'alert_triggered',
          title: `Alert match: ${item.listing_title}`,
          subtitle: `$${Math.round(item.listing_price)}${!item.user_viewed ? ' (unread)' : ''}`,
          timestamp: item.triggered_at,
          link: { tab: 'alerts' }
        })
      }

      for (const item of recent.stacks) {
        items.push({
          id: `stack-${item.id}`,
          type: 'stack_created',
          title: `Created stack "${item.name}"`,
          timestamp: item.created_at,
          link: { href: '/gear?tab=stacks' }
        })
      }

      // Sort all items by timestamp, most recent first
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      setActivities(items.slice(0, 8))
      setLoading(false)
    }

    fetchActivity()
  }, [session?.user?.id])

  const ICONS = {
    gear_added: <Package className="w-4 h-4" />,
    wishlist_added: <Heart className="w-4 h-4" />,
    alert_created: <Bell className="w-4 h-4" />,
    alert_triggered: <Bell className="w-4 h-4" />,
    stack_created: <Layers className="w-4 h-4" />
  }

  const COLORS = {
    gear_added: 'text-blue-500 bg-blue-500/10',
    wishlist_added: 'text-pink-500 bg-pink-500/10',
    alert_created: 'text-amber-500 bg-amber-500/10',
    alert_triggered: 'text-green-500 bg-green-500/10',
    stack_created: 'text-violet-500 bg-violet-500/10'
  }

  const formatRelativeTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return new Date(dateStr).toLocaleDateString()
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="flex items-center gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-surface-secondary" />
            <div className="flex-1">
              <div className="h-4 bg-surface-secondary rounded w-2/3 mb-1" />
              <div className="h-3 bg-surface-secondary rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-6">
        <Clock className="w-10 h-10 text-muted mx-auto mb-2" />
        <p className="text-muted text-sm">No activity yet. Start by adding gear or browsing recommendations.</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      {activities.map(activity => (
        <button
          key={activity.id}
          onClick={() => {
            if (activity.link?.href) {
              router.push(activity.link.href)
            } else if (activity.link?.tab) {
              setActiveTab(activity.link.tab)
            }
          }}
          className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-surface-secondary transition-colors text-left"
        >
          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${COLORS[activity.type]}`}>
            {ICONS[activity.type]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-foreground truncate">{activity.title}</p>
            {activity.subtitle && (
              <p className="text-xs text-muted capitalize">{activity.subtitle}</p>
            )}
          </div>
          <span className="text-xs text-muted flex-shrink-0 tabular-nums">
            {formatRelativeTime(activity.timestamp)}
          </span>
        </button>
      ))}
    </div>
  )
}
