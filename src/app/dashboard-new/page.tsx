'use client'

import { useSession } from 'next-auth/react'
import { redirect, useSearchParams } from 'next/navigation'
import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { LayoutDashboard, Package, Heart, Bell, Layers } from 'lucide-react'
import { WishlistTab } from '@/components/dashboard/WishlistTab'
import { AlertsTab } from '@/components/dashboard/AlertsTab'
import { GearTab } from '@/components/dashboard/GearTab'

// Tab type
type DashboardTab = 'overview' | 'gear' | 'wishlist' | 'alerts' | 'stacks'

function DashboardContent() {
  const { data: session, status } = useSession()
  const searchParams = useSearchParams()
  const [activeTab, setActiveTab] = useState<DashboardTab>('overview')

  // Redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      redirect('/api/auth/signin?callbackUrl=/dashboard')
    }
  }, [status])

  // Set active tab from URL
  useEffect(() => {
    const tab = searchParams.get('tab') as DashboardTab
    if (tab && ['overview', 'gear', 'wishlist', 'alerts', 'stacks'].includes(tab)) {
      setActiveTab(tab)
    }
  }, [searchParams])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    )
  }

  if (!session) return null

  return (
    <div className="min-h-screen bg-surface">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
          <p className="text-muted">Manage your gear collection, wishlist, and alerts</p>
        </div>

        {/* Tabs */}
        <div className="border-b border-border mb-8">
          <nav className="flex space-x-8 overflow-x-auto">
            <TabButton
              icon={<LayoutDashboard className="w-4 h-4" />}
              label="Overview"
              isActive={activeTab === 'overview'}
              onClick={() => setActiveTab('overview')}
              href="/dashboard?tab=overview"
            />
            <TabButton
              icon={<Package className="w-4 h-4" />}
              label="My Gear"
              isActive={activeTab === 'gear'}
              onClick={() => setActiveTab('gear')}
              href="/dashboard?tab=gear"
            />
            <TabButton
              icon={<Heart className="w-4 h-4" />}
              label="Wishlist"
              isActive={activeTab === 'wishlist'}
              onClick={() => setActiveTab('wishlist')}
              href="/dashboard?tab=wishlist"
            />
            <TabButton
              icon={<Bell className="w-4 h-4" />}
              label="Price Alerts"
              isActive={activeTab === 'alerts'}
              onClick={() => setActiveTab('alerts')}
              href="/dashboard?tab=alerts"
            />
            <TabButton
              icon={<Layers className="w-4 h-4" />}
              label="Stacks"
              isActive={activeTab === 'stacks'}
              onClick={() => setActiveTab('stacks')}
              href="/dashboard?tab=stacks"
            />
          </nav>
        </div>

        {/* Tab Content */}
        <div className="pb-12">
          {activeTab === 'overview' && <OverviewTab setActiveTab={setActiveTab} />}
          {activeTab === 'gear' && <GearTab />}
          {activeTab === 'wishlist' && <WishlistTab />}
          {activeTab === 'alerts' && <AlertsTab />}
          {activeTab === 'stacks' && <StacksTab />}
        </div>
      </div>
    </div>
  )
}

// Tab button component
function TabButton({
  icon,
  label,
  isActive,
  onClick,
  href
}: {
  icon: React.ReactNode
  label: string
  isActive: boolean
  onClick: () => void
  href: string
}) {
  return (
    <Link
      href={href}
      onClick={(e) => {
        e.preventDefault()
        onClick()
      }}
      className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
        isActive
          ? 'border-accent text-accent'
          : 'border-transparent text-muted hover:text-foreground hover:border-border'
      }`}
    >
      {icon}
      {label}
    </Link>
  )
}

// Types for dashboard stats
interface DashboardStats {
  collection: {
    count: number
    totalInvested: number
    totalValue: number
    depreciation: number
  }
  wishlist: {
    count: number
  }
  alerts: {
    activeCount: number
    unreadMatches: number
  }
}

// Overview Tab - Summary of everything
function OverviewTab({ setActiveTab }: { setActiveTab: (tab: DashboardTab) => void }) {
  const { data: session } = useSession()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch('/api/user/dashboard/stats')
        if (res.ok) {
          const data = await res.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Error fetching dashboard stats:', error)
      } finally {
        setLoading(false)
      }
    }

    if (session?.user?.id) {
      fetchStats()
    }
  }, [session?.user?.id])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">Welcome back, {session?.user?.name || 'User'}!</h2>
        <p className="text-muted">Here&apos;s an overview of your audio gear ecosystem</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link
          href="/dashboard-new?tab=gear"
          className="card p-6 cursor-pointer hover:border-accent transition-colors"
          onClick={(e) => {
            e.preventDefault()
            setActiveTab('gear')
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted mb-1">Collection Items</p>
              <p className="text-3xl font-bold text-foreground">{stats?.collection?.count || 0}</p>
            </div>
            <Package className="w-8 h-8 text-accent" />
          </div>
        </Link>

        <Link
          href="/dashboard-new?tab=wishlist"
          className="card p-6 cursor-pointer hover:border-accent transition-colors"
          onClick={(e) => {
            e.preventDefault()
            setActiveTab('wishlist')
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted mb-1">Wishlist Items</p>
              <p className="text-3xl font-bold text-foreground">{stats?.wishlist?.count || 0}</p>
            </div>
            <Heart className="w-8 h-8 text-accent" />
          </div>
        </Link>

        <Link
          href="/dashboard-new?tab=alerts"
          className="card p-6 cursor-pointer hover:border-accent transition-colors"
          onClick={(e) => {
            e.preventDefault()
            setActiveTab('alerts')
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted mb-1">Active Alerts</p>
              <p className="text-3xl font-bold text-foreground">{stats?.alerts?.activeCount || 0}</p>
              {stats?.alerts && stats.alerts.unreadMatches > 0 && (
                <p className="text-xs text-accent mt-1">{stats.alerts.unreadMatches} new matches</p>
              )}
            </div>
            <Bell className="w-8 h-8 text-accent" />
          </div>
        </Link>

        <div className="card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted mb-1">Total Value</p>
              <p className="text-3xl font-bold text-foreground">
                {stats?.collection?.totalValue ? formatCurrency(stats.collection.totalValue) : '$0'}
              </p>
            </div>
            <Package className="w-8 h-8 text-accent" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/recommendations"
            className="p-4 border border-border rounded-lg hover:border-accent transition-colors text-center"
          >
            <Package className="w-6 h-6 mx-auto mb-2 text-accent" />
            <p className="font-medium text-foreground">Find Recommendations</p>
            <p className="text-sm text-muted">Discover new gear</p>
          </Link>

          <Link
            href="/marketplace"
            className="p-4 border border-border rounded-lg hover:border-accent transition-colors text-center"
          >
            <Heart className="w-6 h-6 mx-auto mb-2 text-accent" />
            <p className="font-medium text-foreground">Browse Used Market</p>
            <p className="text-sm text-muted">Find deals</p>
          </Link>

          <Link
            href="/dashboard-new?tab=alerts"
            onClick={(e) => {
              e.preventDefault()
              setActiveTab('alerts')
            }}
            className="p-4 border border-border rounded-lg hover:border-accent transition-colors text-center cursor-pointer"
          >
            <Bell className="w-6 h-6 mx-auto mb-2 text-accent" />
            <p className="font-medium text-foreground">Create Price Alert</p>
            <p className="text-sm text-muted">Get notified</p>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card p-6">
        <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
        <p className="text-muted text-center py-8">No recent activity</p>
      </div>
    </div>
  )
}

// GearTab, WishlistTab, and AlertsTab imported from components above

function StacksTab() {
  return (
    <div className="text-center py-12">
      <Layers className="w-16 h-16 mx-auto mb-4 text-muted" />
      <h2 className="text-xl font-semibold text-foreground mb-2">Stacks</h2>
      <p className="text-muted mb-6">This tab is under construction</p>
      <Link href="/gear?view=stacks" className="button button-primary">
        Go to Full Gear Page (Stacks View)
      </Link>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  )
}
