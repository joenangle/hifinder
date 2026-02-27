'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import {
  Package,
  Heart,
  Bell,
  Layers,
  Clock,
  ExternalLink
} from 'lucide-react'

interface ActivityItem {
  id: string
  type: 'gear_added' | 'wishlist_added' | 'alert_created' | 'alert_triggered' | 'stack_created'
  title: string
  subtitle?: string
  timestamp: string
  link?: { tab?: string; href?: string; label?: string }
}

export function RecentActivityFeed({ setActiveTab }: { setActiveTab: (tab: string) => void }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session?.user?.id) return

    const fetchActivity = async () => {
      const userId = session.user.id
      const items: ActivityItem[] = []

      // Fetch recent gear additions
      const { data: gear } = await supabase
        .from('user_gear')
        .select('id, created_at, components(brand, name, category)')
        .eq('user_id', userId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(5)

      if (gear) {
        for (const item of gear) {
          const comp = item.components as unknown as { brand: string; name: string; category: string } | null
          items.push({
            id: `gear-${item.id}`,
            type: 'gear_added',
            title: comp ? `Added ${comp.brand} ${comp.name}` : 'Added gear to collection',
            subtitle: comp?.category,
            timestamp: item.created_at,
            link: { href: '/gear' }
          })
        }
      }

      // Fetch recent wishlist additions
      const { data: wishlist } = await supabase
        .from('wishlists')
        .select('id, created_at, components(brand, name)')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(5)

      if (wishlist) {
        for (const item of wishlist) {
          const comp = item.components as unknown as { brand: string; name: string } | null
          items.push({
            id: `wish-${item.id}`,
            type: 'wishlist_added',
            title: comp ? `Saved ${comp.brand} ${comp.name}` : 'Added item to wishlist',
            timestamp: item.created_at,
            link: { tab: 'wishlist' }
          })
        }
      }

      // Fetch recent alert triggers
      const { data: alertHist } = await supabase
        .from('alert_history')
        .select('id, triggered_at, listing_title, listing_price, user_viewed')
        .eq('user_id', userId)
        .order('triggered_at', { ascending: false })
        .limit(5)

      if (alertHist) {
        for (const item of alertHist) {
          items.push({
            id: `alert-${item.id}`,
            type: 'alert_triggered',
            title: `Alert match: ${item.listing_title}`,
            subtitle: `$${Math.round(item.listing_price)}${!item.user_viewed ? ' (unread)' : ''}`,
            timestamp: item.triggered_at,
            link: { tab: 'alerts' }
          })
        }
      }

      // Fetch recent stacks
      const { data: stacks } = await supabase
        .from('user_stacks')
        .select('id, name, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(3)

      if (stacks) {
        for (const item of stacks) {
          items.push({
            id: `stack-${item.id}`,
            type: 'stack_created',
            title: `Created stack "${item.name}"`,
            timestamp: item.created_at,
            link: { href: '/gear?tab=stacks' }
          })
        }
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
