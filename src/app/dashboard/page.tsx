import { Metadata } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { supabaseServer } from '@/lib/supabase-server'
import {Package, TrendingDown, TrendingUp, Layers, Heart, Bell, Plus, Search, AlertCircle } from 'lucide-react'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Dashboard | HiFinder',
  description: 'Your personal audio gear dashboard',
}

async function getDashboardData(userId: string) {
  // Fetch gear with components
  const { data: gear } = await supabaseServer
    .from('user_gear')
    .select(`
      *,
      components (
        id, name, brand, category, price_new, price_used_min, price_used_max,
        image_url
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })

  // Fetch stacks
  const { data: stacks } = await supabaseServer
    .from('user_stacks')
    .select('id, name, purpose')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  // Fetch wishlist
  const { data: wishlist } = await supabaseServer
    .from('wishlists')
    .select(`
      id,
      created_at,
      components (
        id, name, brand, category, price_new, price_used_min, price_used_max,
        image_url
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(3)

  // Fetch active alerts
  const { data: alerts } = await supabaseServer
    .from('price_alerts')
    .select('id, component_id, target_price, alert_type, is_active, components(name, brand)')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(3)

  // Calculate stats
  const totalPaid = (gear || []).reduce((sum, item) => sum + (item.purchase_price || 0), 0)
  const currentValue = (gear || []).reduce((sum, item) => {
    const component = item.components
    if (component?.price_used_min && component?.price_used_max) {
      return sum + (component.price_used_min + component.price_used_max) / 2
    }
    return sum + (item.purchase_price || 0)
  }, 0)

  const depreciation = totalPaid > 0 ? ((totalPaid - currentValue) / totalPaid) * 100 : 0

  return {
    gear: gear || [],
    stacks: stacks || [],
    wishlist: wishlist || [],
    alerts: alerts || [],
    stats: {
      totalItems: gear?.length || 0,
      totalValue: currentValue,
      totalPaid,
      depreciation,
      stackCount: stacks?.length || 0,
      wishlistCount: wishlist?.length || 0,
      activeAlerts: alerts?.length || 0,
    }
  }
}

function formatPrice(price: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price)
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/api/auth/signin?callbackUrl=/dashboard')
  }

  const data = await getDashboardData(session.user.id)
  const { stats, gear, stacks, wishlist, alerts } = data

  const firstName = session.user.name?.split(' ')[0] || 'there'

  return (
    <div className="min-h-screen bg-surface-base">
      <div className="page-container py-8">
        {/* Welcome Header */}
        <div className="mb-8">
          <h1 className="heading-1 mb-2">
            Welcome back, {firstName}!
          </h1>
          <p className="text-text-secondary">
            Here&apos;s your audio collection overview
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Items */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-accent-primary/10 rounded-lg">
                <Package className="w-5 h-5 text-accent-primary" />
              </div>
            </div>
            <p className="text-2xl font-bold text-text-primary mb-1">
              {stats.totalItems}
            </p>
            <p className="text-sm text-text-secondary">Components</p>
          </div>

          {/* Collection Value */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-2">
              <div className={`p-2 rounded-lg ${
                stats.depreciation > 0
                  ? 'bg-red-500/10'
                  : 'bg-green-500/10'
              }`}>
                {stats.depreciation > 0 ? (
                  <TrendingDown className="w-5 h-5 text-red-500" />
                ) : (
                  <TrendingUp className="w-5 h-5 text-green-500" />
                )}
              </div>
            </div>
            <p className="text-2xl font-bold text-text-primary mb-1">
              {formatPrice(stats.totalValue)}
            </p>
            <p className="text-sm text-text-secondary truncate">
              Current Value {stats.depreciation !== 0 && (
                <span className={stats.depreciation > 0 ? 'text-red-500' : 'text-green-500'}>
                  ({stats.depreciation > 0 ? '-' : '+'}{Math.abs(stats.depreciation).toFixed(1)}%)
                </span>
              )}
            </p>
          </div>

          {/* Stacks */}
          <Link href="/gear?tab=stacks" className="card p-6 hover:border-border-focus transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Layers className="w-5 h-5 text-purple-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-text-primary mb-1">
              {stats.stackCount}
            </p>
            <p className="text-sm text-text-secondary">Stacks</p>
          </Link>

          {/* Wishlist */}
          <Link href="/wishlist" className="card p-6 hover:border-border-focus transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 bg-pink-500/10 rounded-lg">
                <Heart className="w-5 h-5 text-pink-500" />
              </div>
            </div>
            <p className="text-2xl font-bold text-text-primary mb-1">
              {stats.wishlistCount}
            </p>
            <p className="text-sm text-text-secondary">Wishlist Items</p>
          </Link>
        </div>

        {/* Quick Actions */}
        <div className="card p-6 mb-8">
          <h2 className="heading-3 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link
              href="/gear"
              className="flex items-center gap-3 p-4 bg-surface-hover hover:bg-surface-elevated rounded-lg border border-border-subtle hover:border-border-default transition-all"
            >
              <div className="p-2 bg-accent-primary/10 rounded-lg">
                <Plus className="w-5 h-5 text-accent-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary">Add Gear</p>
                <p className="text-xs text-text-tertiary">Expand collection</p>
              </div>
            </Link>

            <Link
              href="/gear?tab=stacks"
              className="flex items-center gap-3 p-4 bg-surface-hover hover:bg-surface-elevated rounded-lg border border-border-subtle hover:border-border-default transition-all"
            >
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Layers className="w-5 h-5 text-purple-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary">Build Stack</p>
                <p className="text-xs text-text-tertiary">Organize gear</p>
              </div>
            </Link>

            <Link
              href="/used-market"
              className="flex items-center gap-3 p-4 bg-surface-hover hover:bg-surface-elevated rounded-lg border border-border-subtle hover:border-border-default transition-all"
            >
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Search className="w-5 h-5 text-blue-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary">Browse Market</p>
                <p className="text-xs text-text-tertiary">Find deals</p>
              </div>
            </Link>

            <Link
              href="/alerts"
              className="flex items-center gap-3 p-4 bg-surface-hover hover:bg-surface-elevated rounded-lg border border-border-subtle hover:border-border-default transition-all"
            >
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Bell className="w-5 h-5 text-orange-500" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-text-primary">Set Alert</p>
                <p className="text-xs text-text-tertiary">Track prices</p>
              </div>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Gear */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-3">Recent Gear</h2>
              <Link
                href="/gear"
                className="text-sm text-accent-primary hover:text-accent-secondary transition-colors"
              >
                View All
              </Link>
            </div>
            {gear.length > 0 ? (
              <div className="space-y-3">
                {gear.slice(0, 3).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg"
                  >
                    <div className="w-12 h-12 bg-surface-elevated rounded-lg flex items-center justify-center">
                      <Package className="w-6 h-6 text-text-tertiary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-text-primary truncate">
                        {item.components ?
                          `${item.components.brand} ${item.components.name}` :
                          item.custom_name || 'Custom Item'
                        }
                      </p>
                      <p className="text-sm text-text-tertiary">
                        {item.purchase_price ? formatPrice(item.purchase_price) : 'Not specified'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Package className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
                <p className="text-text-secondary mb-3">No gear yet</p>
                <Link
                  href="/gear"
                  className="text-sm text-accent-primary hover:text-accent-secondary"
                >
                  Add your first item
                </Link>
              </div>
            )}
          </div>

          {/* Wishlist Preview */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-3">Wishlist</h2>
              <Link
                href="/wishlist"
                className="text-sm text-accent-primary hover:text-accent-secondary transition-colors"
              >
                View All
              </Link>
            </div>
            {wishlist.length > 0 ? (
              <div className="space-y-3">
                {wishlist.map((item) => {
                  const component = Array.isArray(item.components) ? item.components[0] : item.components
                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg"
                    >
                      <div className="w-12 h-12 bg-surface-elevated rounded-lg flex items-center justify-center">
                        <Heart className="w-6 h-6 text-pink-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary truncate">
                          {component?.brand} {component?.name}
                        </p>
                        <p className="text-sm text-text-tertiary">
                          {component?.price_used_min && component?.price_used_max
                            ? `${formatPrice(component.price_used_min)} - ${formatPrice(component.price_used_max)}`
                            : component?.price_new
                            ? formatPrice(component.price_new)
                            : 'Price varies'}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <Heart className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
                <p className="text-text-secondary mb-3">No wishlist items yet</p>
                <Link
                  href="/recommendations"
                  className="text-sm text-accent-primary hover:text-accent-secondary"
                >
                  Browse recommendations
                </Link>
              </div>
            )}
          </div>

          {/* Active Alerts */}
          <div className="card p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="heading-3">Active Price Alerts</h2>
              <Link
                href="/alerts"
                className="text-sm text-accent-primary hover:text-accent-secondary transition-colors"
              >
                View All
              </Link>
            </div>
            {alerts.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {alerts.map((alert) => {
                  const component = Array.isArray(alert.components) ? alert.components[0] : alert.components
                  return (
                    <div
                      key={alert.id}
                      className="flex items-start gap-3 p-3 bg-surface-hover rounded-lg"
                    >
                      <div className="p-2 bg-orange-500/10 rounded-lg">
                        <Bell className="w-4 h-4 text-orange-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-text-primary text-sm truncate">
                          {component?.brand} {component?.name}
                        </p>
                        <p className="text-xs text-text-tertiary">
                          {alert.alert_type === 'below' ? '≤' : alert.alert_type === 'exact' ? '=' : '~'} {formatPrice(alert.target_price)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <AlertCircle className="w-12 h-12 text-text-tertiary mx-auto mb-3" />
                <p className="text-text-secondary mb-3">No active alerts</p>
                <Link
                  href="/alerts"
                  className="text-sm text-accent-primary hover:text-accent-secondary"
                >
                  Create your first alert
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
