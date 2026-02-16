'use client'

import { useState, useEffect } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts'

interface Sale {
  price: number
  condition: string
  date_sold: string
  source: string
  url: string
}

interface PriceStats {
  count: number
  min: number
  max: number
  median: number
  avg: number
}

interface PriceHistoryData {
  component_id: string
  statistics: PriceStats | null
  sales: Sale[]
}

interface PriceHistoryChartProps {
  componentId: string
  priceNew: number | null
}

const CONDITION_COLORS: Record<string, string> = {
  excellent: '#22c55e',
  very_good: '#84cc16',
  good: '#eab308',
  fair: '#f97316',
  parts_only: '#ef4444',
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatPrice(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

function sourceLabel(source: string) {
  switch (source) {
    case 'reddit_avexchange': return 'r/AVexchange'
    case 'reverb': return 'Reverb'
    case 'ebay': return 'eBay'
    case 'head_fi': return 'Head-Fi'
    default: return source
  }
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: Sale & { timestamp: number } }> }) {
  if (!active || !payload?.length) return null
  const sale = payload[0].payload
  return (
    <div className="bg-surface-elevated border border-border rounded-lg p-3 shadow-lg text-sm">
      <div className="font-semibold text-foreground">{formatPrice(sale.price)}</div>
      <div className="text-muted">
        {new Date(sale.date_sold).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric'
        })}
      </div>
      <div className="text-muted capitalize">{sale.condition?.replace('_', ' ') || 'Unknown'}</div>
      <div className="text-muted">{sourceLabel(sale.source)}</div>
    </div>
  )
}

export function PriceHistoryChart({ componentId, priceNew }: PriceHistoryChartProps) {
  const [data, setData] = useState<PriceHistoryData | null>(null)
  const [loading, setLoading] = useState(true)
  const [days, setDays] = useState(90)

  useEffect(() => {
    async function fetchPriceHistory() {
      setLoading(true)
      try {
        const res = await fetch(`/api/components/${componentId}/price-history?days=${days}`)
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      } catch (err) {
        console.error('Failed to fetch price history:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchPriceHistory()
  }, [componentId, days])

  if (loading) {
    return (
      <div className="p-4 bg-surface-secondary rounded-lg">
        <div className="h-48 flex items-center justify-center text-muted text-sm">
          Loading price history...
        </div>
      </div>
    )
  }

  if (!data || !data.sales.length) {
    return (
      <div className="p-4 bg-surface-secondary rounded-lg">
        <div className="h-24 flex items-center justify-center text-muted text-sm">
          No sold price data available yet
        </div>
      </div>
    )
  }

  const chartData = data.sales.map(s => ({
    ...s,
    timestamp: new Date(s.date_sold).getTime(),
  }))

  const stats = data.statistics!
  const minDate = Math.min(...chartData.map(d => d.timestamp))
  const maxDate = Math.max(...chartData.map(d => d.timestamp))
  const priceMin = Math.floor(stats.min * 0.85)
  const priceMax = Math.ceil((priceNew && priceNew > stats.max ? priceNew : stats.max) * 1.1)

  // Generate tick values for X axis
  const ticks: number[] = []
  const tickCount = Math.min(5, chartData.length)
  for (let i = 0; i < tickCount; i++) {
    ticks.push(minDate + (maxDate - minDate) * (i / (tickCount - 1 || 1)))
  }

  return (
    <div className="space-y-3">
      {/* Time range selector */}
      <div className="flex items-center gap-2 justify-end">
        {[30, 90, 180, 365].map(d => (
          <button
            key={d}
            onClick={() => setDays(d)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              days === d
                ? 'bg-accent text-accent-foreground'
                : 'bg-surface-secondary text-muted hover:text-foreground'
            }`}
          >
            {d <= 90 ? `${d}d` : d === 180 ? '6mo' : '1yr'}
          </button>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-surface-secondary rounded-lg p-3">
        <ResponsiveContainer width="100%" height={200}>
          <ScatterChart margin={{ top: 10, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #333)" />
            <XAxis
              type="number"
              dataKey="timestamp"
              domain={[minDate, maxDate]}
              ticks={ticks}
              tickFormatter={(ts: number) => formatDate(new Date(ts).toISOString())}
              tick={{ fontSize: 11, fill: 'var(--color-muted, #888)' }}
              stroke="var(--color-border, #333)"
            />
            <YAxis
              type="number"
              dataKey="price"
              domain={[priceMin, priceMax]}
              tickFormatter={(v: number) => `$${v}`}
              tick={{ fontSize: 11, fill: 'var(--color-muted, #888)' }}
              stroke="var(--color-border, #333)"
              width={55}
            />
            <Tooltip content={<CustomTooltip />} />
            {priceNew && (
              <ReferenceLine
                y={priceNew}
                stroke="#6366f1"
                strokeDasharray="6 3"
                label={{
                  value: `MSRP ${formatPrice(priceNew)}`,
                  position: 'right',
                  fontSize: 11,
                  fill: '#6366f1'
                }}
              />
            )}
            <ReferenceLine
              y={stats.median}
              stroke="#22c55e"
              strokeDasharray="3 3"
              label={{
                value: `Median ${formatPrice(stats.median)}`,
                position: 'left',
                fontSize: 11,
                fill: '#22c55e'
              }}
            />
            <Scatter
              data={chartData}
              fill="#f59e0b"
              shape={(props: { cx?: number; cy?: number; payload?: Sale & { timestamp: number } }) => {
                const { cx, cy, payload } = props
                if (!cx || !cy || !payload) return null
                const color = CONDITION_COLORS[payload.condition] || '#f59e0b'
                return <circle cx={cx} cy={cy} r={5} fill={color} fillOpacity={0.8} stroke={color} strokeWidth={1} />
              }}
            />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Stats summary */}
      <div className="grid grid-cols-4 gap-2 text-center">
        <div className="p-2 bg-surface-secondary rounded">
          <div className="text-xs text-muted">Sales</div>
          <div className="text-sm font-semibold text-foreground">{stats.count}</div>
        </div>
        <div className="p-2 bg-surface-secondary rounded">
          <div className="text-xs text-muted">Low</div>
          <div className="text-sm font-semibold text-foreground">{formatPrice(stats.min)}</div>
        </div>
        <div className="p-2 bg-surface-secondary rounded">
          <div className="text-xs text-muted">Median</div>
          <div className="text-sm font-semibold text-foreground">{formatPrice(stats.median)}</div>
        </div>
        <div className="p-2 bg-surface-secondary rounded">
          <div className="text-xs text-muted">High</div>
          <div className="text-sm font-semibold text-foreground">{formatPrice(stats.max)}</div>
        </div>
      </div>

      {/* Condition legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted">
        {Object.entries(CONDITION_COLORS).map(([condition, color]) => (
          <div key={condition} className="flex items-center gap-1">
            <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="capitalize">{condition.replace('_', ' ')}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
