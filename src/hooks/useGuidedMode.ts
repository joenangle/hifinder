'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEY = 'hifinder_guided_mode_enabled'

export function useGuidedMode() {
  const [guidedModeEnabled, setGuidedModeEnabled] = useState(false)

  useEffect(() => {
    const guidedMode = localStorage.getItem(STORAGE_KEY)
    // Enable tooltips by default (when not explicitly disabled)
    setGuidedModeEnabled(guidedMode === null || guidedMode !== 'false')
  }, [])

  const toggleGuidedMode = () => {
    const next = !guidedModeEnabled
    localStorage.setItem(STORAGE_KEY, next ? 'true' : 'false')
    setGuidedModeEnabled(next)
  }

  return {
    guidedModeEnabled,
    toggleGuidedMode
  }
}
