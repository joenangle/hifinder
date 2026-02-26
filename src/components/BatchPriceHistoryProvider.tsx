'use client'

import { useRef, type ReactNode } from 'react'
import {
  BatchPriceHistoryContext,
  BatchPriceHistoryStore,
} from '@/hooks/useBatchPriceHistory'

/**
 * Provides a shared BatchPriceHistoryStore to all descendant PriceHistoryBadge
 * instances. Instead of each badge firing its own API request, they all register
 * their component IDs with this store, which debounces and batches them into a
 * single request.
 *
 * Usage:
 *   <BatchPriceHistoryProvider>
 *     <HeadphoneCard ... />
 *     <SignalGearCard ... />
 *   </BatchPriceHistoryProvider>
 */
export function BatchPriceHistoryProvider({ children }: { children: ReactNode }) {
  const storeRef = useRef<BatchPriceHistoryStore | null>(null)
  if (storeRef.current === null) {
    storeRef.current = new BatchPriceHistoryStore()
  }

  return (
    <BatchPriceHistoryContext.Provider value={storeRef.current}>
      {children}
    </BatchPriceHistoryContext.Provider>
  )
}
