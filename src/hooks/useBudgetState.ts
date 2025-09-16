import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { debounce } from 'lodash'

interface BudgetStateOptions {
  initialBudget: number
  minBudget?: number
  maxBudget?: number
  budgetRangeMin?: number
  budgetRangeMax?: number
  onBudgetChange?: (budget: number) => void
  enableAnalytics?: boolean
  enablePersistence?: boolean
  userId?: string
}

interface BudgetAnalytics {
  sessionStart: number
  interactionCount: number
  budgetRange: { min: number; max: number }
  tierChanges: Array<{ from: string; to: string; timestamp: number }>
}

interface ItemCount {
  headphones: number
  dacs: number
  amps: number
  combos: number
  total: number
}

export function useBudgetState({
  initialBudget,
  minBudget = 20,
  maxBudget = 10000,
  budgetRangeMin = 20,
  budgetRangeMax = 10,
  onBudgetChange,
  enableAnalytics = false,
  enablePersistence = true,
  userId
}: BudgetStateOptions) {
  const router = useRouter()

  // State
  const [budget, setBudget] = useState(initialBudget)
  const [displayBudget, setDisplayBudget] = useState(initialBudget)
  const [isUpdating, setIsUpdating] = useState(false)
  const [itemCount, setItemCount] = useState<ItemCount | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Refs for tracking
  const abortControllerRef = useRef<AbortController | null>(null)
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const analyticsRef = useRef<BudgetAnalytics>({
    sessionStart: Date.now(),
    interactionCount: 0,
    budgetRange: { min: initialBudget, max: initialBudget },
    tierChanges: []
  })

  // Load persisted budget on mount
  useEffect(() => {
    if (!enablePersistence) return

    const loadPersistedBudget = async () => {
      try {
        // Only use localStorage if initial budget is the default (300)
        // This ensures URL parameters take precedence over localStorage
        if (initialBudget === 300) {
          const localBudget = localStorage.getItem('lastBudget')
          if (localBudget) {
            const parsed = parseInt(localBudget)
            if (parsed >= minBudget && parsed <= maxBudget) {
              setBudget(parsed)
              setDisplayBudget(parsed)
            }
          }
        }

        // Then check user profile if signed in
        if (userId) {
          // TODO: Implement user profile budget loading
          // const userBudget = await getUserPreferredBudget(userId)
          // if (userBudget) {
          //   setBudget(userBudget)
          //   setDisplayBudget(userBudget)
          // }
        }
      } catch (error) {
        console.error('Failed to load persisted budget:', error)
      }
    }

    loadPersistedBudget()
  }, [enablePersistence, minBudget, maxBudget, userId])

  // Analytics tracking
  const trackBudgetChange = useCallback((oldBudget: number, newBudget: number) => {
    if (!enableAnalytics) return

    const analytics = analyticsRef.current
    analytics.interactionCount++
    analytics.budgetRange.min = Math.min(analytics.budgetRange.min, newBudget)
    analytics.budgetRange.max = Math.max(analytics.budgetRange.max, newBudget)

    // Track tier changes
    const getTier = (budget: number) => {
      if (budget <= 100) return 'Budget'
      if (budget <= 400) return 'Entry'
      if (budget <= 1000) return 'Mid'
      if (budget <= 3000) return 'High'
      return 'Summit'
    }

    const oldTier = getTier(oldBudget)
    const newTier = getTier(newBudget)

    if (oldTier !== newTier) {
      analytics.tierChanges.push({
        from: oldTier,
        to: newTier,
        timestamp: Date.now()
      })

      // Send tier change event
      if (typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', 'budget_tier_change', {
          from_tier: oldTier,
          to_tier: newTier,
          new_budget: newBudget
        })
      }
    }
  }, [enableAnalytics])

  // Persistence with debouncing
  const persistBudget = useMemo(
    () => debounce(async (budget: number) => {
      if (!enablePersistence) return

      try {
        // Always save to localStorage
        localStorage.setItem('lastBudget', budget.toString())

        // Save to user profile if signed in
        if (userId) {
          // TODO: Implement user profile budget saving
          // await updateUserPreferredBudget(userId, budget)
        }
      } catch (error) {
        console.error('Failed to persist budget:', error)
      }
    }, 2000),
    [enablePersistence, userId]
  )

  // Fetch item counts with caching
  const fetchItemCount = useCallback(async (budget: number, signal?: AbortSignal) => {
    try {
      const params = new URLSearchParams({
        budget: budget.toString(),
        rangeMin: budgetRangeMin.toString(),
        rangeMax: budgetRangeMax.toString()
      })

      const response = await fetch(`/api/components/count?${params}`, { signal })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      setItemCount(data)
      setError(null)
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        return // Request was cancelled
      }
      console.error('Error fetching item count:', error)
      setError('Failed to fetch item count')
    }
  }, [budgetRangeMin, budgetRangeMax])

  // Debounced fetch function
  const debouncedFetch = useMemo(
    () => debounce((budget: number) => {
      fetchItemCount(budget, abortControllerRef.current?.signal)
    }, 300),
    [fetchItemCount]
  )

  // Update URL without navigation
  const updateURL = useCallback((budget: number) => {
    const url = new URL(window.location.href)
    url.searchParams.set('budget', budget.toString())

    // Use replace to avoid adding to history
    router.replace(url.pathname + url.search, { scroll: false })
  }, [router])

  // Debounced URL update
  const debouncedURLUpdate = useMemo(
    () => debounce((budget: number) => {
      updateURL(budget)
      setIsUpdating(false)
    }, 500),
    [updateURL]
  )

  // Handle budget change (immediate visual feedback)
  const handleBudgetChange = useCallback((newBudget: number) => {
    const oldBudget = budget

    setDisplayBudget(newBudget)
    setIsUpdating(true)

    // Track analytics
    trackBudgetChange(oldBudget, newBudget)

    // Cancel previous requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    // Clear existing timeouts
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
    }

    // Set new debounced updates
    updateTimeoutRef.current = setTimeout(() => {
      setBudget(newBudget)
      if (onBudgetChange) {
        onBudgetChange(newBudget)
      }
      persistBudget(newBudget)
    }, 300)

    // Debounced API calls and URL updates
    debouncedFetch(newBudget)
    debouncedURLUpdate(newBudget)
  }, [budget, trackBudgetChange, onBudgetChange, persistBudget, debouncedFetch, debouncedURLUpdate])

  // Handle final budget change (when user stops interacting)
  const handleBudgetChangeComplete = useCallback((finalBudget: number) => {
    // Immediate updates for final value
    setBudget(finalBudget)
    setDisplayBudget(finalBudget)

    // Cancel debounced operations and apply immediately
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current)
    }

    if (onBudgetChange) {
      onBudgetChange(finalBudget)
    }

    persistBudget(finalBudget)
    updateURL(finalBudget)
    fetchItemCount(finalBudget)

    setIsUpdating(false)

    // Send analytics event
    if (enableAnalytics && typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'budget_selection_complete', {
        budget: finalBudget,
        session_interactions: analyticsRef.current.interactionCount
      })
    }
  }, [onBudgetChange, persistBudget, updateURL, fetchItemCount, enableAnalytics])

  // Initial item count fetch
  useEffect(() => {
    fetchItemCount(budget)
  }, []) // Only run once on mount

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cancel pending requests
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // Clear timeouts
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current)
      }

      // Send session summary analytics
      if (enableAnalytics && typeof window !== 'undefined' && window.gtag) {
        const analytics = analyticsRef.current
        const sessionDuration = Date.now() - analytics.sessionStart

        window.gtag('event', 'budget_session_complete', {
          session_duration_ms: sessionDuration,
          total_interactions: analytics.interactionCount,
          budget_range_explored: analytics.budgetRange,
          tier_changes: analytics.tierChanges.length,
          final_budget: budget
        })
      }
    }
  }, [enableAnalytics, budget])

  return {
    budget,
    displayBudget,
    isUpdating,
    itemCount,
    error,
    handleBudgetChange,
    handleBudgetChangeComplete
  }
}