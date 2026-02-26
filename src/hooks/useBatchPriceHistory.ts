'use client'

import {
  createContext,
  useContext,
  useSyncExternalStore,
} from 'react'

// ── Types ──────────────────────────────────────────────────────────────────

export interface BatchPriceStats {
  count: number
  median: number
  min: number
  max: number
  trend: 'up' | 'down' | 'stable' | null
}

type PriceDataState = BatchPriceStats | null | undefined
// undefined = not yet loaded, null = loaded but insufficient data

// ── Store (singleton per provider instance) ────────────────────────────────

/**
 * A lightweight external store that batches component ID requests,
 * deduplicates them, and fetches price history in a single API call.
 *
 * Components subscribe to individual component IDs and only re-render
 * when their specific data changes.
 */
export class BatchPriceHistoryStore {
  private data = new Map<string, PriceDataState>()
  private pendingIds = new Set<string>()
  private batchTimer: ReturnType<typeof setTimeout> | null = null
  private listeners = new Set<() => void>()

  private readonly BATCH_DELAY_MS = 50
  private readonly MAX_IDS_PER_REQUEST = 100

  /** Register a component ID for batch fetching. */
  request(componentId: string): void {
    // Already have data (or explicitly null = no data)
    if (this.data.has(componentId)) return

    this.pendingIds.add(componentId)
    this.scheduleBatch()
  }

  /** Get current data for a component ID. */
  get(componentId: string): PriceDataState {
    return this.data.get(componentId)
  }

  /** Subscribe to store changes (used by useSyncExternalStore). */
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Snapshot getter for useSyncExternalStore. Returns the Map reference which
   *  changes identity on every update so React can detect changes. */
  getSnapshot = (): Map<string, PriceDataState> => {
    return this.data
  }

  // ── Private ──────────────────────────────────────────────────────────

  private notify(): void {
    // Create a new Map reference so useSyncExternalStore detects the change
    this.data = new Map(this.data)
    for (const listener of this.listeners) {
      listener()
    }
  }

  private scheduleBatch(): void {
    if (this.batchTimer !== null) return
    this.batchTimer = setTimeout(() => {
      this.batchTimer = null
      this.flush()
    }, this.BATCH_DELAY_MS)
  }

  private flush(): void {
    if (this.pendingIds.size === 0) return

    const ids = Array.from(this.pendingIds)
    this.pendingIds.clear()

    // Split into chunks if we ever exceed the limit
    const chunks: string[][] = []
    for (let i = 0; i < ids.length; i += this.MAX_IDS_PER_REQUEST) {
      chunks.push(ids.slice(i, i + this.MAX_IDS_PER_REQUEST))
    }

    // Fire all chunk requests (usually just one)
    for (const chunk of chunks) {
      this.fetchChunk(chunk)
    }
  }

  private async fetchChunk(ids: string[]): Promise<void> {
    try {
      const response = await fetch(
        `/api/components/price-history/batch?ids=${ids.join(',')}`
      )

      if (!response.ok) {
        // On error, mark all as null so badges don't spin forever
        for (const id of ids) {
          this.data.set(id, null)
        }
        this.notify()
        return
      }

      const result: Record<string, BatchPriceStats | null> = await response.json()

      for (const id of ids) {
        const entry = result[id]
        // entry is either { count, median, ... } or null
        this.data.set(id, entry ?? null)
      }

      this.notify()
    } catch {
      // Network error — mark all as null
      for (const id of ids) {
        this.data.set(id, null)
      }
      this.notify()
    }
  }
}

// ── React Context ──────────────────────────────────────────────────────────

export const BatchPriceHistoryContext =
  createContext<BatchPriceHistoryStore | null>(null)

/**
 * Hook for PriceHistoryBadge to consume batch price data.
 *
 * When used inside a <BatchPriceHistoryProvider>, this registers the
 * component ID into the batch queue and returns data once available.
 *
 * Returns:
 *  - undefined while loading
 *  - null if no data (fewer than 3 sales)
 *  - BatchPriceStats when data is available
 *
 * If no provider is found (component rendered outside the batch context),
 * returns `undefined` so the badge can fall back to individual fetching.
 */
export function useBatchPriceHistory(
  componentId: string
): { data: PriceDataState; isBatched: boolean } {
  const store = useContext(BatchPriceHistoryContext)

  // Always call hooks unconditionally (rules of hooks)
  const storeSnapshot = useSyncExternalStore(
    store?.subscribe ?? noopSubscribe,
    store?.getSnapshot ?? emptySnapshot,
    store?.getSnapshot ?? emptySnapshot
  )

  if (!store) {
    return { data: undefined, isBatched: false }
  }

  // Register this ID for fetching (idempotent — no-ops if already requested)
  store.request(componentId)

  const data = storeSnapshot.get(componentId)
  return { data, isBatched: true }
}

// ── Fallback stubs for when there is no provider ───────────────────────────

const EMPTY_MAP = new Map<string, PriceDataState>()

function noopSubscribe(): () => void {
  return () => {}
}

function emptySnapshot(): Map<string, PriceDataState> {
  return EMPTY_MAP
}
