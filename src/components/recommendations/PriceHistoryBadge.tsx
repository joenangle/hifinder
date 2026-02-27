'use client'

import { useState, useEffect, memo } from 'react'
import { useBatchPriceHistory } from '@/hooks/useBatchPriceHistory'

interface PriceStats {
  count: number
  median: number
}

// ── Individual-fetch fallback (kept for components rendered outside the
//    BatchPriceHistoryProvider, e.g. MarketplaceListingCard) ─────────────

const priceCache = new Map<string, PriceStats | null>()
const pendingRequests = new Map<string, Promise<PriceStats | null>>()

function fetchPriceStats(componentId: string): Promise<PriceStats | null> {
  if (priceCache.has(componentId)) {
    return Promise.resolve(priceCache.get(componentId)!)
  }

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

// ── Badge component ────────────────────────────────────────────────────────

const PriceHistoryBadgeComponent = ({ componentId }: { componentId: string }) => {
  const { data: batchData, isBatched } = useBatchPriceHistory(componentId)

  // Fallback state for individual fetching (only used when NOT inside a provider)
  const [fallbackStats, setFallbackStats] = useState<PriceStats | null>(() => {
    return priceCache.get(componentId) ?? null
  })

  useEffect(() => {
    // If we're inside the batch provider, skip individual fetching
    if (isBatched) return

    let cancelled = false
    fetchPriceStats(componentId).then(stats => {
      if (!cancelled) setFallbackStats(stats)
    })
    return () => { cancelled = true }
  }, [componentId, isBatched])

  // Determine which data source to use
  let stats: PriceStats | null = null

  if (isBatched) {
    // Using batch provider
    if (batchData === undefined) {
      // Still loading
      return null
    }
    stats = batchData
      ? { count: batchData.count, median: batchData.median }
      : null
  } else {
    // Fallback: individual fetch
    stats = fallbackStats
  }

  if (!stats) return null

  return (
    <div className="text-[10px] text-tertiary mt-0.5 tabular-nums">
      {stats.count} sales &middot; med. ${Math.round(stats.median)}
    </div>
  )
}

export const PriceHistoryBadge = memo(PriceHistoryBadgeComponent)

/** Get cached price stats (non-null only after PriceHistoryBadge has rendered for this ID) */
export function getCachedPriceStats(componentId: string): PriceStats | null {
  return priceCache.get(componentId) ?? null
}
