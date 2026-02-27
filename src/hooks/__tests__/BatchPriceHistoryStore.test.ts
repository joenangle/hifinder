import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { BatchPriceHistoryStore } from '../useBatchPriceHistory'

beforeEach(() => {
  vi.useFakeTimers()
  vi.restoreAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('BatchPriceHistoryStore', () => {
  it('starts with undefined for unknown component IDs', () => {
    const store = new BatchPriceHistoryStore()
    expect(store.get('comp1')).toBeUndefined()
  })

  it('batches requests and fetches after delay', async () => {
    const mockResponse = {
      comp1: { count: 5, median: 200, min: 100, max: 300, trend: 'stable' },
      comp2: { count: 3, median: 150, min: 100, max: 200, trend: 'down' },
    }

    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response)

    const store = new BatchPriceHistoryStore()

    store.request('comp1')
    store.request('comp2')

    // Not yet fetched
    expect(global.fetch).not.toHaveBeenCalled()

    // Advance past batch delay (50ms)
    vi.advanceTimersByTime(50)

    // Wait for the fetch promise to resolve
    await vi.runAllTimersAsync()

    expect(global.fetch).toHaveBeenCalledTimes(1)
    const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0]
    expect(url).toContain('/api/components/price-history/batch?ids=')
    expect(url).toContain('comp1')
    expect(url).toContain('comp2')

    expect(store.get('comp1')).toEqual(mockResponse.comp1)
    expect(store.get('comp2')).toEqual(mockResponse.comp2)
  })

  it('deduplicates requests for the same ID', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ comp1: { count: 5, median: 200, min: 100, max: 300, trend: null } }),
    } as Response)

    const store = new BatchPriceHistoryStore()

    store.request('comp1')
    store.request('comp1')
    store.request('comp1')

    await vi.runAllTimersAsync()

    const url = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string
    // comp1 should appear only once in the URL
    const ids = new URL(url, 'http://localhost').searchParams.get('ids')!.split(',')
    expect(ids.filter((id: string) => id === 'comp1')).toHaveLength(1)
  })

  it('skips request for already-loaded IDs', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ comp1: { count: 5, median: 200, min: 100, max: 300, trend: null } }),
    } as Response)

    const store = new BatchPriceHistoryStore()

    store.request('comp1')
    await vi.runAllTimersAsync()

    expect(global.fetch).toHaveBeenCalledTimes(1)

    // Request same ID again — should not trigger another fetch
    store.request('comp1')
    await vi.runAllTimersAsync()

    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('notifies subscribers on data change', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ comp1: null }),
    } as Response)

    const store = new BatchPriceHistoryStore()
    const listener = vi.fn()

    store.subscribe(listener)
    store.request('comp1')

    await vi.runAllTimersAsync()

    expect(listener).toHaveBeenCalled()
  })

  it('unsubscribe removes listener', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ comp1: null }),
    } as Response)

    const store = new BatchPriceHistoryStore()
    const listener = vi.fn()

    const unsubscribe = store.subscribe(listener)
    unsubscribe()

    store.request('comp1')
    await vi.runAllTimersAsync()

    expect(listener).not.toHaveBeenCalled()
  })

  it('getSnapshot returns a new Map reference after update', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ comp1: null }),
    } as Response)

    const store = new BatchPriceHistoryStore()
    const snapshotBefore = store.getSnapshot()

    store.request('comp1')
    await vi.runAllTimersAsync()

    const snapshotAfter = store.getSnapshot()
    expect(snapshotBefore).not.toBe(snapshotAfter) // Different reference
  })

  it('marks all IDs as null on HTTP error', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
    } as Response)

    const store = new BatchPriceHistoryStore()

    store.request('comp1')
    store.request('comp2')

    await vi.runAllTimersAsync()

    expect(store.get('comp1')).toBeNull()
    expect(store.get('comp2')).toBeNull()
  })

  it('marks all IDs as null on network error', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network error'))

    const store = new BatchPriceHistoryStore()

    store.request('comp1')
    store.request('comp2')

    await vi.runAllTimersAsync()

    expect(store.get('comp1')).toBeNull()
    expect(store.get('comp2')).toBeNull()
  })

  it('handles null entries in the response (< 3 sales)', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        comp1: { count: 5, median: 200, min: 100, max: 300, trend: 'up' },
        comp2: null,
      }),
    } as Response)

    const store = new BatchPriceHistoryStore()

    store.request('comp1')
    store.request('comp2')

    await vi.runAllTimersAsync()

    expect(store.get('comp1')).toEqual({ count: 5, median: 200, min: 100, max: 300, trend: 'up' })
    expect(store.get('comp2')).toBeNull()
  })
})
