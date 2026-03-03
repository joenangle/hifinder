import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGuidedMode } from '../useGuidedMode'

describe('useGuidedMode', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('enables guided mode by default', () => {
    const { result } = renderHook(() => useGuidedMode())
    expect(result.current.guidedModeEnabled).toBe(true)
  })

  it('respects stored disabled preference', () => {
    localStorage.setItem('hifinder_guided_mode_enabled', 'false')
    const { result } = renderHook(() => useGuidedMode())
    expect(result.current.guidedModeEnabled).toBe(false)
  })

  it('toggleGuidedMode flips the state', () => {
    const { result } = renderHook(() => useGuidedMode())

    expect(result.current.guidedModeEnabled).toBe(true)

    act(() => {
      result.current.toggleGuidedMode()
    })

    expect(result.current.guidedModeEnabled).toBe(false)
    expect(localStorage.getItem('hifinder_guided_mode_enabled')).toBe('false')

    act(() => {
      result.current.toggleGuidedMode()
    })

    expect(result.current.guidedModeEnabled).toBe(true)
    expect(localStorage.getItem('hifinder_guided_mode_enabled')).toBe('true')
  })
})
