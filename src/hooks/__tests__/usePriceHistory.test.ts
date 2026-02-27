import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { usePriceHistory } from '../usePriceHistory'

const mockData = {
  component_id: 'comp1',
  statistics: { count: 5, min: 100, max: 300, median: 200, avg: 210 },
  sales: [
    { price: 200, condition: 'Excellent', date_sold: '2026-01-15', source: 'reverb', url: 'https://example.com' },
  ],
}

beforeEach(() => {
  vi.restoreAllMocks()
})

describe('usePriceHistory', () => {
  it('returns initial state before fetch', () => {
    // Don't let fetch resolve yet
    vi.spyOn(global, 'fetch').mockImplementation(() => new Promise(() => {}))

    const { result } = renderHook(() => usePriceHistory('comp1'))

    expect(result.current.data).toBeNull()
    expect(result.current.loading).toBe(true)
    expect(result.current.error).toBeNull()
  })

  it('fetches price history for a component', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response)

    const { result } = renderHook(() => usePriceHistory('comp1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.data).toEqual(mockData)
    expect(result.current.error).toBeNull()
    expect(global.fetch).toHaveBeenCalledWith('/api/components/comp1/price-history?days=90')
  })

  it('handles HTTP errors', async () => {
    vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: false,
      status: 500,
    } as Response)

    const { result } = renderHook(() => usePriceHistory('comp1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('HTTP 500')
    expect(result.current.data).toBeNull()
  })

  it('handles network errors', async () => {
    vi.spyOn(global, 'fetch').mockRejectedValue(new Error('Network failure'))

    const { result } = renderHook(() => usePriceHistory('comp1'))

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
    })

    expect(result.current.error).toBe('Network failure')
  })

  it('does not fetch when componentId is null', () => {
    vi.spyOn(global, 'fetch')

    const { result } = renderHook(() => usePriceHistory(null))

    expect(result.current.loading).toBe(false)
    expect(result.current.data).toBeNull()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('does not fetch when disabled', () => {
    vi.spyOn(global, 'fetch')

    const { result } = renderHook(() => usePriceHistory('comp1', false))

    expect(result.current.loading).toBe(false)
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('refetches when componentId changes', async () => {
    const fetchSpy = vi.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response)

    const { rerender } = renderHook(
      ({ id }) => usePriceHistory(id),
      { initialProps: { id: 'comp1' } }
    )

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })

    rerender({ id: 'comp2' })

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2)
    })

    expect(fetchSpy).toHaveBeenLastCalledWith('/api/components/comp2/price-history?days=90')
  })

  it('ignores stale responses after unmount', async () => {
    let resolvePromise: (value: Response) => void
    vi.spyOn(global, 'fetch').mockImplementation(
      () => new Promise<Response>((resolve) => { resolvePromise = resolve })
    )

    const { result, unmount } = renderHook(() => usePriceHistory('comp1'))

    expect(result.current.loading).toBe(true)

    unmount()

    // Resolve after unmount — should not throw
    resolvePromise!({
      ok: true,
      json: () => Promise.resolve(mockData),
    } as Response)
  })
})
