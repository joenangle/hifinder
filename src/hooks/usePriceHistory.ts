import { useState, useEffect } from 'react'

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
  sales: Array<{
    price: number
    condition: string
    date_sold: string
    source: string
    url: string
  }>
}

export function usePriceHistory(componentId: string | null, enabled: boolean = true) {
  const [data, setData] = useState<PriceHistoryData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!componentId || !enabled) {
      return
    }

    let cancelled = false

    async function fetchPriceHistory() {
      setLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/components/${componentId}/price-history?days=90`)

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }

        const json = await response.json()

        if (!cancelled) {
          setData(json)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to fetch price history')
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    fetchPriceHistory()

    return () => {
      cancelled = true
    }
  }, [componentId, enabled])

  return { data, loading, error }
}
