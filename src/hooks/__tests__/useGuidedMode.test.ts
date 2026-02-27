import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useGuidedMode } from '../useGuidedMode'

describe('useGuidedMode', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('detects first visit when no localStorage data', () => {
    const { result } = renderHook(() => useGuidedMode())

    expect(result.current.isFirstVisit).toBe(true)
    expect(result.current.showWelcome).toBe(true)
    expect(result.current.isLoaded).toBe(true)
  })

  it('marks as visited on first render', () => {
    renderHook(() => useGuidedMode())
    expect(localStorage.getItem('hifinder_has_visited')).toBe('true')
  })

  it('detects returning visitor', () => {
    localStorage.setItem('hifinder_has_visited', 'true')
    const { result } = renderHook(() => useGuidedMode())

    expect(result.current.isFirstVisit).toBe(false)
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

  it('dismissWelcome persists and hides banner', () => {
    const { result } = renderHook(() => useGuidedMode())

    expect(result.current.showWelcome).toBe(true)

    act(() => {
      result.current.dismissWelcome()
    })

    expect(result.current.showWelcome).toBe(false)
    expect(localStorage.getItem('hifinder_welcome_dismissed')).toBe('true')
  })

  it('does not show welcome if already dismissed', () => {
    localStorage.setItem('hifinder_has_visited', 'true')
    localStorage.setItem('hifinder_welcome_dismissed', 'true')
    const { result } = renderHook(() => useGuidedMode())

    expect(result.current.showWelcome).toBe(false)
  })
})
