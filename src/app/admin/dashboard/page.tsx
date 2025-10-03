'use client'

import { useEffect, useState } from 'react'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { useRouter } from 'next/navigation'

interface AffiliateStats {
  summary: {
    totalClicks: number
    totalRevenue: number
    confirmedRevenue: number
    conversionRate: string
    days: number
  }
  platformStats: Record<string, { clicks: number; revenue: number }>
  sourceStats: Record<string, number>
  topComponents: Array<{
    id: string
    name: string
    brand: string
    total_clicks: number
    total_conversions: number
    total_commission: number
    conversion_rate: number
  }>
  recentClicks: Array<any>
  recentRevenue: Array<any>
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AffiliateStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeRange, setTimeRange] = useState('30')
  const [platform, setPlatform] = useState<string>('all')

  const supabase = createClientComponentClient()
  const router = useRouter()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (!loading && !error) {
      fetchStats()
    }
  }, [timeRange, platform])

  async function checkAuth() {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        router.push('/admin/login')
        return
      }

      // Check if user is admin
      const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL
      if (session.user.email !== adminEmail) {
        setError('Access denied. Admin only.')
        return
      }

      setLoading(false)
      fetchStats()
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  async function fetchStats() {
    try {
      const { data: { session } } = await supabase.auth.getSession()

      const params = new URLSearchParams({
        days: timeRange,
        ...(platform !== 'all' && { platform })
      })

      const response = await fetch(`/api/admin/affiliate-stats?${params}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch stats')
      }

      const data = await response.json()
      setStats(data)
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 text-lg">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            Go Home
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Affiliate Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Track your affiliate performance and revenue
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>

          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="all">All Platforms</option>
            <option value="ebay">eBay</option>
            <option value="amazon">Amazon</option>
          </select>

          <button
            onClick={fetchStats}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            Refresh
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            title="Total Clicks"
            value={stats?.summary.totalClicks.toLocaleString() || '0'}
            icon="👆"
          />
          <StatCard
            title="Total Revenue"
            value={`$${stats?.summary.totalRevenue.toFixed(2) || '0.00'}`}
            icon="💰"
            subtitle={`$${stats?.summary.confirmedRevenue.toFixed(2) || '0.00'} confirmed`}
          />
          <StatCard
            title="Conversion Rate"
            value={`${stats?.summary.conversionRate || '0.00'}%`}
            icon="📈"
          />
          <StatCard
            title="Time Range"
            value={`${stats?.summary.days || 30} days`}
            icon="📅"
          />
        </div>

        {/* Platform Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Platform Performance
            </h2>
            <div className="space-y-3">
              {stats?.platformStats && Object.entries(stats.platformStats).map(([platform, data]) => (
                <div key={platform} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">
                      {platform === 'ebay' ? '🛒' : platform === 'amazon' ? '📦' : '🔗'}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white capitalize">
                      {platform}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {data.clicks} clicks
                    </div>
                    <div className="font-semibold text-green-600 dark:text-green-400">
                      ${data.revenue.toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Traffic Sources
            </h2>
            <div className="space-y-3">
              {stats?.sourceStats && Object.entries(stats.sourceStats).map(([source, clicks]) => (
                <div key={source} className="flex justify-between items-center">
                  <span className="font-medium text-gray-900 dark:text-white capitalize">
                    {source.replace('_', ' ')}
                  </span>
                  <span className="text-gray-600 dark:text-gray-400">
                    {clicks} clicks
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Components */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm mb-8">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Top Performing Components
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Component
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Clicks
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Conversions
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Conv. Rate
                  </th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600 dark:text-gray-400">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats?.topComponents.slice(0, 10).map((component) => (
                  <tr key={component.id} className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-3 px-4">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {component.brand} {component.name}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                      {component.total_clicks}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                      {component.total_conversions || 0}
                    </td>
                    <td className="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                      {component.conversion_rate?.toFixed(1) || '0.0'}%
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-green-600 dark:text-green-400">
                      ${component.total_commission?.toFixed(2) || '0.00'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recent Clicks
            </h2>
            <div className="space-y-2">
              {stats?.recentClicks.map((click) => (
                <div key={click.id} className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-medium capitalize">{click.platform}</span> •{' '}
                  {click.source.replace('_', ' ')} •{' '}
                  {new Date(click.clicked_at).toLocaleString()}
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Recent Revenue
            </h2>
            <div className="space-y-2">
              {stats?.recentRevenue.map((revenue) => (
                <div key={revenue.id} className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400 capitalize">
                    {revenue.platform} • {revenue.status}
                  </span>
                  <span className="font-semibold text-green-600 dark:text-green-400">
                    ${revenue.commission_amount?.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, subtitle }: {
  title: string
  value: string
  icon: string
  subtitle?: string
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</span>
        <span className="text-2xl">{icon}</span>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      {subtitle && (
        <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">{subtitle}</div>
      )}
    </div>
  )
}
