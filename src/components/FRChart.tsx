'use client'

import { useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceArea, ReferenceLine,
} from 'recharts'
import {
  type FRCurve, FR_BANDS, FR_TICKS, formatFrequency, normalizeTo1kHz, interpretFR,
} from '@/lib/fr-utils'

interface FRChartProps {
  curves: FRCurve[]
  mode: 'detail' | 'comparison'
  showBands?: boolean
  source?: string
  height?: number
  className?: string
}

// Band fill colors (opacity controlled via fillOpacity prop)
const BAND_COLORS = [
  '#8b5cf6', '#6366f1', '#3b82f6',
  '#14b8a6', '#f59e0b', '#ef4444',
]

interface FRTooltipPayloadItem {
  name: string
  value: number
  color: string
  dataKey: string
}

function DetailTooltip({ active, payload, label }: {
  active?: boolean
  payload?: FRTooltipPayloadItem[]
  label?: number
}) {
  if (!active || !payload?.length || label == null) return null
  return (
    <div className="bg-surface-elevated border border-border rounded-lg p-2 shadow-lg text-sm">
      <div className="font-semibold text-foreground">{formatFrequency(label)} Hz</div>
      <div className="text-muted">{payload[0].value.toFixed(1)} dB</div>
    </div>
  )
}

function ComparisonTooltip({ active, payload, label }: {
  active?: boolean
  payload?: FRTooltipPayloadItem[]
  label?: number
}) {
  if (!active || !payload?.length || label == null) return null
  return (
    <div className="bg-surface-elevated border border-border rounded-lg p-2 shadow-lg text-sm">
      <div className="font-semibold text-foreground mb-1">{formatFrequency(label)} Hz</div>
      {payload.map((entry) => (
        <div key={entry.dataKey} className="flex items-center gap-2">
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted">{entry.name}:</span>
          <span className="text-foreground">{entry.value?.toFixed(1) ?? '--'} dB</span>
        </div>
      ))}
    </div>
  )
}

export function FRChart({
  curves,
  mode,
  showBands = true,
  source,
  height,
  className,
}: FRChartProps) {
  if (mode === 'detail') {
    return <DetailChart curves={curves} showBands={showBands} source={source} height={height} className={className} />
  }

  return (
    <ComparisonChart
      curves={curves}
      showBands={showBands}
      height={height}
      className={className}
    />
  )
}

// --- Detail Mode ---

function DetailChart({
  curves,
  showBands,
  source,
  height,
  className,
}: {
  curves: FRCurve[]
  showBands?: boolean
  source?: string
  height?: number
  className?: string
}) {
  const [normalized, setNormalized] = useState(true)
  const curve = curves[0]
  if (!curve || curve.points.length === 0) return null

  const displayPoints = normalized ? normalizeTo1kHz(curve.points) : curve.points
  const data = displayPoints.map(([freq, db]) => ({ freq, db }))

  // Compute Y domain from data (manual loop to avoid stack overflow with spread)
  let minDb = Infinity, maxDb = -Infinity
  for (const d of data) {
    if (d.db < minDb) minDb = d.db
    if (d.db > maxDb) maxDb = d.db
  }
  const dbMin = Math.floor(minDb - 2)
  const dbMax = Math.ceil(maxDb + 2)

  // Generate plain-language interpretation
  const insights = interpretFR(curve.points)

  return (
    <div className={className}>
      {/* Normalize toggle */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-tertiary">Frequency response</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setNormalized(true)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              normalized
                ? 'bg-accent text-white'
                : 'bg-secondary text-tertiary hover:text-primary'
            }`}
          >
            Normalized
          </button>
          <button
            onClick={() => setNormalized(false)}
            className={`px-2 py-1 text-xs rounded transition-colors ${
              !normalized
                ? 'bg-accent text-white'
                : 'bg-secondary text-tertiary hover:text-primary'
            }`}
          >
            Raw
          </button>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={height || 360}>
        <LineChart data={data} margin={{ top: 10, right: 15, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #333)" strokeOpacity={0.5} />
          {showBands && FR_BANDS.map((band, i) => (
            <ReferenceArea
              key={band.name}
              x1={band.start}
              x2={band.end}
              fill={BAND_COLORS[i]}
              fillOpacity={0.06}
              label={{
                value: band.name,
                position: 'insideTopLeft',
                fontSize: 10,
                fill: 'var(--color-muted, #888)',
                offset: 4,
              }}
            />
          ))}
          {normalized && (
            <ReferenceLine
              y={0}
              stroke="var(--color-muted, #888)"
              strokeDasharray="6 3"
              strokeOpacity={0.5}
              label={{
                value: '1kHz ref',
                position: 'insideTopRight',
                fontSize: 10,
                fill: 'var(--color-muted, #888)',
              }}
            />
          )}
          <XAxis
            dataKey="freq"
            type="number"
            domain={[20, 20000]}
            scale="log"
            ticks={FR_TICKS}
            tickFormatter={formatFrequency}
            tick={{ fontSize: 11, fill: 'var(--color-muted, #888)' }}
            stroke="var(--color-border, #333)"
          />
          <YAxis
            type="number"
            domain={[dbMin, dbMax]}
            tickFormatter={(v: number) => `${v}dB`}
            tick={{ fontSize: 11, fill: 'var(--color-muted, #888)' }}
            stroke="var(--color-border, #333)"
            width={50}
          />
          <Tooltip
            content={<DetailTooltip />}
            cursor={{ strokeDasharray: '3 3', stroke: 'var(--color-muted, #888)' }}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="db"
            stroke={curve.color || 'var(--color-accent, #8b5cf6)'}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Source + interpretation */}
      <div className="mt-3 space-y-2">
        {source && (
          <p className="text-xs text-tertiary text-center">
            Measured by {source.charAt(0).toUpperCase() + source.slice(1)}
          </p>
        )}
        {insights.length > 0 && (
          <div className="p-3 bg-secondary rounded-lg">
            <p className="text-xs font-medium text-secondary mb-1.5">What you&apos;ll hear</p>
            <ul className="space-y-1">
              {insights.map((insight, i) => (
                <li key={i} className="text-xs text-secondary flex gap-2">
                  <span className="text-tertiary flex-shrink-0">·</span>
                  {insight}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

// --- Comparison Mode ---

function ComparisonChart({
  curves,
  showBands,
  height,
  className,
}: {
  curves: FRCurve[]
  showBands?: boolean
  height?: number
  className?: string
}) {
  const [normalized, setNormalized] = useState(true)
  if (curves.length === 0) return null

  // Apply normalization if needed
  const processedCurves = curves.map(c => ({
    ...c,
    points: normalized ? normalizeTo1kHz(c.points) : c.points,
  }))

  // Build merged dataset: use first curve's frequencies as base,
  // find closest match from other curves
  const baseCurve = processedCurves[0]
  const mergedData = baseCurve.points.map(([freq, db]) => {
    const row: Record<string, number> = { freq, [baseCurve.name]: db }
    for (let i = 1; i < processedCurves.length; i++) {
      const other = processedCurves[i]
      // Find closest frequency point in other curve
      let closestIdx = 0
      let closestDist = Math.abs(other.points[0][0] - freq)
      for (let j = 1; j < other.points.length; j++) {
        const dist = Math.abs(other.points[j][0] - freq)
        if (dist < closestDist) {
          closestDist = dist
          closestIdx = j
        }
      }
      row[other.name] = other.points[closestIdx][1]
    }
    return row
  })

  // Compute Y domain (manual loop to avoid stack overflow with spread)
  let minDb = Infinity, maxDb = -Infinity
  for (const row of mergedData) {
    for (const c of processedCurves) {
      const v = row[c.name]
      if (v != null) {
        if (v < minDb) minDb = v
        if (v > maxDb) maxDb = v
      }
    }
  }
  const dbMin = Math.floor(minDb - 2)
  const dbMax = Math.ceil(maxDb + 2)

  return (
    <div className={className}>
      {/* Normalize toggle */}
      <div className="flex items-center gap-1 mb-2 justify-end">
        <button
          onClick={() => setNormalized(true)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            normalized
              ? 'bg-accent text-accent-foreground'
              : 'bg-surface-secondary text-muted hover:text-foreground'
          }`}
        >
          Normalized
        </button>
        <button
          onClick={() => setNormalized(false)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            !normalized
              ? 'bg-accent text-accent-foreground'
              : 'bg-surface-secondary text-muted hover:text-foreground'
          }`}
        >
          Raw
        </button>
      </div>

      <ResponsiveContainer width="100%" height={height || 320}>
        <LineChart data={mergedData} margin={{ top: 10, right: 15, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #333)" strokeOpacity={0.5} />
          {showBands && FR_BANDS.map((band, i) => (
            <ReferenceArea
              key={band.name}
              x1={band.start}
              x2={band.end}
              fill={BAND_COLORS[i]}
              fillOpacity={0.04}
            />
          ))}
          <XAxis
            dataKey="freq"
            type="number"
            domain={[20, 20000]}
            scale="log"
            ticks={FR_TICKS}
            tickFormatter={formatFrequency}
            tick={{ fontSize: 11, fill: 'var(--color-muted, #888)' }}
            stroke="var(--color-border, #333)"
          />
          <YAxis
            type="number"
            domain={[dbMin, dbMax]}
            tickFormatter={(v: number) => `${v}dB`}
            tick={{ fontSize: 11, fill: 'var(--color-muted, #888)' }}
            stroke="var(--color-border, #333)"
            width={50}
          />
          <Tooltip
            content={<ComparisonTooltip />}
            cursor={{ strokeDasharray: '3 3', stroke: 'var(--color-muted, #888)' }}
            isAnimationActive={false}
          />
          {normalized && (
            <ReferenceLine
              y={0}
              stroke="var(--color-muted, #888)"
              strokeDasharray="6 3"
              strokeOpacity={0.5}
              label={{
                value: '1kHz ref',
                position: 'insideTopRight',
                fontSize: 10,
                fill: 'var(--color-muted, #888)',
              }}
            />
          )}
          {processedCurves.map((curve) => (
            <Line
              key={curve.name}
              type="monotone"
              dataKey={curve.name}
              name={curve.name}
              stroke={curve.color}
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 mt-2 text-xs text-muted">
        {processedCurves.map((curve) => (
          <div key={curve.name} className="flex items-center gap-1">
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ backgroundColor: curve.color }}
            />
            <span>{curve.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
