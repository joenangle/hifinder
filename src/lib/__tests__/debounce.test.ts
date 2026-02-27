import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { debounce } from '../debounce'

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('debounce', () => {
  it('delays function execution by the specified time', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 200)

    debounced()
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(199)
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(1)
    expect(fn).toHaveBeenCalledOnce()
  })

  it('resets the timer on subsequent calls', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 200)

    debounced()
    vi.advanceTimersByTime(150)

    debounced() // Reset timer
    vi.advanceTimersByTime(150)
    expect(fn).not.toHaveBeenCalled() // Only 150ms since last call

    vi.advanceTimersByTime(50)
    expect(fn).toHaveBeenCalledOnce()
  })

  it('passes arguments to the debounced function', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('hello', 42)
    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledWith('hello', 42)
  })

  it('uses the latest arguments when called multiple times', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced('first')
    debounced('second')
    debounced('third')

    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledOnce()
    expect(fn).toHaveBeenCalledWith('third')
  })

  it('cancel() prevents the function from being called', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    debounced.cancel()

    vi.advanceTimersByTime(200)
    expect(fn).not.toHaveBeenCalled()
  })

  it('cancel() is a no-op when no timer is pending', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    // Cancel without ever calling debounced — should not throw
    expect(() => debounced.cancel()).not.toThrow()
  })

  it('can be called again after cancel', () => {
    const fn = vi.fn()
    const debounced = debounce(fn, 100)

    debounced()
    debounced.cancel()

    debounced()
    vi.advanceTimersByTime(100)

    expect(fn).toHaveBeenCalledOnce()
  })
})
