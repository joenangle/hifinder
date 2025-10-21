'use client'

import { useState, useEffect } from 'react'

const STORAGE_KEYS = {
  HAS_VISITED: 'hifinder_has_visited',
  GUIDED_MODE: 'hifinder_guided_mode_enabled',
  WELCOME_DISMISSED: 'hifinder_welcome_dismissed'
}

export function useGuidedMode() {
  const [isFirstVisit, setIsFirstVisit] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [guidedModeEnabled, setGuidedModeEnabled] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    // Check if user has visited before
    const hasVisited = localStorage.getItem(STORAGE_KEYS.HAS_VISITED)
    const welcomeDismissed = localStorage.getItem(STORAGE_KEYS.WELCOME_DISMISSED)
    const guidedMode = localStorage.getItem(STORAGE_KEYS.GUIDED_MODE)

    const firstVisit = !hasVisited
    setIsFirstVisit(firstVisit)

    // Show welcome banner for first-time visitors or if they haven't dismissed it
    setShowWelcome(firstVisit || (!welcomeDismissed && !hasVisited))

    // Enable guided mode if it's the first visit or if user previously enabled it
    setGuidedModeEnabled(firstVisit || guidedMode === 'true')

    // Mark as visited
    if (firstVisit) {
      localStorage.setItem(STORAGE_KEYS.HAS_VISITED, 'true')
    }

    setIsLoaded(true)
  }, [])

  const dismissWelcome = () => {
    localStorage.setItem(STORAGE_KEYS.WELCOME_DISMISSED, 'true')
    setShowWelcome(false)
  }

  const enableGuidedMode = () => {
    localStorage.setItem(STORAGE_KEYS.GUIDED_MODE, 'true')
    setGuidedModeEnabled(true)
  }

  const disableGuidedMode = () => {
    localStorage.setItem(STORAGE_KEYS.GUIDED_MODE, 'false')
    setGuidedModeEnabled(false)
  }

  const toggleGuidedMode = () => {
    if (guidedModeEnabled) {
      disableGuidedMode()
    } else {
      enableGuidedMode()
    }
  }

  return {
    isFirstVisit,
    showWelcome,
    guidedModeEnabled,
    isLoaded,
    dismissWelcome,
    enableGuidedMode,
    disableGuidedMode,
    toggleGuidedMode
  }
}
