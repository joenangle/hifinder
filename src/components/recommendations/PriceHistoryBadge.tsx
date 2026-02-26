'use client'

import { useState, useEffect, memo } from 'react'

interface PriceStats {
  count: number
  median: number
}

// Simple in-memory cache shared across all PriceHistoryBadge instances
// Prevents duplicate fetches when the same component appears in multiple views
const priceCache = new Map<string, PriceStats | null>()
const pendingRequests = new Map<string, Promise<PriceStats | null>>()

function fetchPriceStats(componentId: string): Promise<PriceStats | null> {
  // Return cached result immediately
  if (priceCache.has(componentId)) {
    return Promise.resolve(priceCache.get(componentId)!)
  }

  // Deduplicate in-flight requests
  if (pendingRequests.has(componentId)) {
    return pendingRequests.get(componentId)!
  }

  const request = fetch(`/api/components/${componentId}/price-history?days=90`)
    .then(res => res.json())
    .then(data => {
      const stats = data.statistics && data.statistics.count >= 3
        ? { count: data.statistics.count, median: data.statistics.median }
        : null
      priceCache.set(componentId, stats)
      pendingRequests.delete(componentId)
      return stats
    })
    .catch(() => {
      pendingRequests.delete(componentId)
      return null
    })

  pendingRequests.set(componentId, request)
  return request
}

const PriceHistoryBadgeComponent = ({ componentId }: { componentId: string }) => {
  const [priceStats, setPriceStats] = useState<PriceStats | null>(() => {
    // Initialize from cache synchronously if available
    return priceCache.get(componentId) ?? null
  })

  useEffect(() => {
    let cancelled = false
    fetchPriceStats(componentId).then(stats => {
      if (!cancelled) setPriceStats(stats)
    })
    return () => { cancelled = true }
  }, [componentId])

  if (!priceStats) return null

  return (
    <div className="text-[10px] text-text-tertiary mt-0.5 tabular-nums">
      {priceStats.count} sales · med. ${Math.round(priceStats.median)}
    </div>
  )
}

export const PriceHistoryBadge = memo(PriceHistoryBadgeComponent)
