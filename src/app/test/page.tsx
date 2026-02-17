'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'

interface ScraperStats {
  summary: {
    totalListings: number
    availableListings: number
    soldListings: number
    botConfirmedSales: number
    recentListings: number
  }
  bySource: Record<string, number>
  recentActivity: Array<{
    id: string
    title: string
    price: number
    status: string
    date_posted: string
    source: string
    seller_username: string
    avexchange_bot_confirmed: boolean
    url: string
  }>
}

export default function AdminDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [stats, setStats] = useState<ScraperStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  // Protect the page - redirect if not authenticated or not authorized
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login?callbackUrl=/test')
    } else if (status === 'authenticated' && session?.user?.email !== 'joenangle@gmail.com') {
      // Not authorized - redirect to home with error
      router.push('/?error=unauthorized')
    }
  }, [status, session, router])

  const fetchStats = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/admin/scraper-stats')
      if (!response.ok) throw new Error('Failed to fetch stats')
      const data = await response.json()
      setStats(data)
      setLastRefresh(new Date())
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status === 'authenticated') {
      fetchStats()
      const interval = setInterval(fetchStats, 30000)
      return () => clearInterval(interval)
    }
  }, [status])

  // Show loading while checking auth
  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
          <div className="text-gray-400">Checking authentication...</div>
        </div>
      </div>
    )
  }

  // Don't render anything if not authenticated or not authorized (will redirect)
  if (status === 'unauthenticated' || (status === 'authenticated' && session?.user?.email !== 'joenangle@gmail.com')) {
    return null
  }

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
          <div className="text-gray-400">Loading statistics...</div>
        </div>
      </div>
    )
  }

  if (error && !stats) {
    return (
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
          <div className="bg-red-900/20 border border-red-500 rounded-lg p-4">
            <p className="text-red-400">Error: {error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (!stats) return null

  const { summary, bySource, recentActivity } = stats

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
            <p className="text-gray-400">Last refreshed: {lastRefresh.toLocaleTimeString()}</p>
          </div>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 rounded-lg transition-colors"
          >
            {loading ? '🔄 Refreshing...' : '🔄 Refresh Now'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard title="Total Listings" value={summary.totalListings} icon="📊" color="bg-blue-900/30 border-blue-500" />
          <StatCard title="Available" value={summary.availableListings} icon="✅" color="bg-green-900/30 border-green-500" />
          <StatCard title="Sold" value={summary.soldListings} icon="💰" color="bg-purple-900/30 border-purple-500" />
          <StatCard
            title="Bot Verified"
            value={summary.botConfirmedSales}
            icon="🤖"
            color="bg-orange-900/30 border-orange-500"
            subtitle={`${((summary.botConfirmedSales / (summary.soldListings || 1)) * 100).toFixed(1)}% of sold`}
          />
          <StatCard title="Last 7 Days" value={summary.recentListings} icon="🕐" color="bg-cyan-900/30 border-cyan-500" />
        </div>

        <div className="bg-gray-800 rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">📡 Listings by Source</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(bySource).map(([source, count]) => (
              <div key={source} className="bg-gray-700 rounded p-4">
                <div className="text-2xl font-bold text-blue-400">{count}</div>
                <div className="text-sm text-gray-400 capitalize">{source.replace('_', ' ')}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">📋 Recent Listings (Last 20)</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-700">
                  <th className="pb-2">Title</th>
                  <th className="pb-2">Price</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Source</th>
                  <th className="pb-2">Seller</th>
                  <th className="pb-2">Bot Verified</th>
                  <th className="pb-2">Posted</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {recentActivity.map((listing) => (
                  <tr key={listing.id} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="py-3 pr-4">
                      <a
                        href={listing.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="max-w-md truncate block text-blue-400 hover:text-blue-300 hover:underline"
                      >
                        {listing.title}
                      </a>
                    </td>
                    <td className="py-3">{listing.price ? `$${listing.price}` : 'No price'}</td>
                    <td className="py-3"><StatusBadge status={listing.status} /></td>
                    <td className="py-3 capitalize text-gray-400">{listing.source.replace('_', ' ')}</td>
                    <td className="py-3 text-gray-400">{listing.seller_username || 'N/A'}</td>
                    <td className="py-3">
                      {listing.avexchange_bot_confirmed ? <span className="text-green-400">✅</span> : <span className="text-gray-600">—</span>}
                    </td>
                    <td className="py-3 text-gray-400">{new Date(listing.date_posted).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">🚀 Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ActionButton title="Run Reddit Scraper" description="Scrape new listings from r/AVexchange" command="node scripts/reddit-avexchange-scraper.js" />
            <ActionButton title="Monitor Bot Confirmations" description="Check existing listings for bot confirmations" command="node scripts/monitor-avexchange-confirmations.js --days 30" />
            <ActionButton title="View Logs" description="Check scraper logs and errors" command="tail -f logs/scraper.log" />
          </div>
        </div>
      </div>
    </div>
  )
}

function StatCard({ title, value, icon, color, subtitle }: { title: string; value: number; icon: string; color: string; subtitle?: string }) {
  return (
    <div className={`${color} border rounded-lg p-4`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        <span className="text-3xl font-bold">{value}</span>
      </div>
      <div className="text-sm text-gray-300">{title}</div>
      {subtitle && <div className="text-xs text-gray-500 mt-1">{subtitle}</div>}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors = {
    available: 'bg-green-900/50 text-green-400 border-green-500',
    sold: 'bg-purple-900/50 text-purple-400 border-purple-500',
    expired: 'bg-gray-700 text-gray-400 border-gray-600',
    removed: 'bg-red-900/50 text-red-400 border-red-500'
  }
  return <span className={`px-2 py-1 rounded text-xs border ${colors[status as keyof typeof colors] || colors.available}`}>{status}</span>
}

function ActionButton({ title, description, command }: { title: string; description: string; command: string }) {
  const handleCopy = () => {
    navigator.clipboard.writeText(command)
    alert(`Copied: ${command}`)
  }
  return (
    <div className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors">
      <h3 className="font-bold mb-1">{title}</h3>
      <p className="text-sm text-gray-400 mb-3">{description}</p>
      <button onClick={handleCopy} className="text-xs bg-gray-800 hover:bg-gray-900 px-3 py-1 rounded transition-colors">
        📋 Copy Command
      </button>
    </div>
  )
}
