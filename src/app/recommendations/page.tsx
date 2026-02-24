'use client'

import React, { Suspense } from 'react'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Component, UsedListing } from '@/types'
import { UsedListingsSection } from '@/components/UsedListingsSection'
import { BudgetSlider } from '@/components/BudgetSlider'
import { useDebounce } from '@/hooks/useDebounce'
import { StackBuilderModal } from '@/components/StackBuilderModal'
import { Tooltip } from '@/components/Tooltip'
import { useGuidedMode } from '@/hooks/useGuidedMode'
import { FILTER_TOOLTIPS } from '@/lib/tooltips'
import { HeadphoneCard } from '@/components/recommendations/HeadphoneCard'
import { SignalGearCard } from '@/components/recommendations/SignalGearCard'
import { SelectedSystemSummary } from '@/components/recommendations/SelectedSystemSummary'
import { FiltersSection } from '@/components/recommendations/FiltersSection'
import { AmplificationWarningBanner } from '@/components/recommendations/AmplificationWarningBanner'
import { BudgetAllocationControls, BudgetAllocation } from '@/components/BudgetAllocationControls'
import { ComparisonBar } from '@/components/ComparisonBar'
import { ComparisonModal } from '@/components/ComparisonModal'

// Lazy load guided mode components for better code splitting
const WelcomeBanner = dynamic(() => import('@/components/WelcomeBanner').then(mod => ({ default: mod.WelcomeBanner })), {
  ssr: false
})

// No longer need mapping functions - browseMode is used directly in API

// Extended Component interface for audio specifications
interface AudioComponent extends Component {
  avgPrice: number
  synergyScore?: number
  matchScore?: number
  priceFitScore?: number
  compatibilityScore?: number
  powerAdequacy?: number
  amplificationAssessment?: {
    difficulty: 'easy' | 'moderate' | 'demanding' | 'very_demanding' | 'unknown';
    explanation: string;
    estimatedSensitivity?: number;
  }
  // Expert analysis fields (additional fields not in Component interface)
  tone_grade?: string
  technical_grade?: string
  expert_grade_numeric?: number
  crinacle_comments?: string
  value_rating?: number
  // Note: crinacle_sound_signature, driver_type, fit, and crinacle_rank are inherited from Component
}

function RecommendationsContent() {
  // Guided mode for first-time users
  const {
    showWelcome,
    guidedModeEnabled,
    isLoaded: guidedModeLoaded,
    dismissWelcome,
    enableGuidedMode,
    toggleGuidedMode
  } = useGuidedMode()

  // Component state
  const [cans, setCans] = useState<AudioComponent[]>([]) // Headphones (over-ear/on-ear)
  const [iems, setIems] = useState<AudioComponent[]>([]) // IEMs (in-ear monitors)
  const [dacs, setDacs] = useState<AudioComponent[]>([])
  const [amps, setAmps] = useState<AudioComponent[]>([])
  const [dacAmps, setDacAmps] = useState<AudioComponent[]>([])
  const [budgetAllocation, setBudgetAllocation] = useState<Record<string, number>>({})
  const [customBudgetAllocation, setCustomBudgetAllocation] = useState<BudgetAllocation | null>(null)
  const [autoBudgetAllocation, setAutoBudgetAllocation] = useState<BudgetAllocation | null>(null)
  const debouncedCustomBudgetAllocation = useDebounce(customBudgetAllocation, 300)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAmplification, setShowAmplification] = useState(false)

  // Selection state - store full objects so selections survive API re-fetches
  const [selectedCans, setSelectedCans] = useState<Map<string, AudioComponent>>(new Map())
  const [selectedIems, setSelectedIems] = useState<Map<string, AudioComponent>>(new Map())
  const [selectedDacs, setSelectedDacs] = useState<Map<string, AudioComponent>>(new Map())
  const [selectedAmps, setSelectedAmps] = useState<Map<string, AudioComponent>>(new Map())
  const [selectedDacAmps, setSelectedDacAmps] = useState<Map<string, AudioComponent>>(new Map())

  // Expert Analysis expansion state
  const [expandAllExperts, setExpandAllExperts] = useState(false)

  // Used market state
  const [usedListings, setUsedListings] = useState<{[componentId: string]: UsedListing[]}>({})
  const [showMarketplace, setShowMarketplace] = useState(false)
  const [focusedComponentId, setFocusedComponentId] = useState<string | null>(null)

  // Stack builder state
  const [showStackBuilder, setShowStackBuilder] = useState(false)

  // Preferences modal state
  const [showPreferencesModal, setShowPreferencesModal] = useState(false)

  // Filter counts state
  const [filterCounts, setFilterCounts] = useState<{
    sound: Record<string, number>
    equipment: {
      cans: number
      iems: number
      dacs: number
      amps: number
      combos: number
    }
  } | null>(null)

  // Browse mode removed - always use intermediate experience level

  // Comparison view state
  const [showComparisonView, setShowComparisonView] = useState(false)
  const [isComparisonBarExpanded, setIsComparisonBarExpanded] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()

  // Budget-focused flow detection (simplified preferences)
  const isBudgetFocused = searchParams.get('source') === 'quick-start' || (
    searchParams.get('budget') &&
    !searchParams.get('experience') &&
    !searchParams.get('headphoneType')
  )

  // SIMPLIFIED STATE MANAGEMENT - Single source of truth pattern

  // Parse URL parameters - recompute when URL changes
  const initialPrefs = useMemo(() => {
    const wantRecsRaw = JSON.parse(searchParams.get('wantRecommendationsFor') || '{"headphones":true,"dac":false,"amp":false,"combo":false}')

    return {
      budget: parseInt(searchParams.get('budget') || '250'),
      budgetRangeMin: parseInt(searchParams.get('budgetRangeMin') || '20'),
      budgetRangeMax: parseInt(searchParams.get('budgetRangeMax') || '10'),
      headphoneType: searchParams.get('headphoneType') || 'both',
      wantRecommendationsFor: wantRecsRaw,
      existingGear: JSON.parse(searchParams.get('existingGear') || '{"headphones":false,"dac":false,"amp":false,"combo":false,"specificModels":{"headphones":"","dac":"","amp":"","combo":""}}'),
      usage: searchParams.get('usage') || 'music',
      usageRanking: JSON.parse(searchParams.get('usageRanking') || '[]'),
      excludedUsages: JSON.parse(searchParams.get('excludedUsages') || '[]'),
      soundSignature: searchParams.get('soundSignature') || 'any'
    }
  }, [searchParams]) // Re-parse when URL changes

  // URL is the single source of truth - use initialPrefs directly
  const userPrefs = initialPrefs

  // Simple debouncing for API calls - debounce budget only
  const debouncedBudget = useDebounce(userPrefs.budget, 300)

  // Track selected items for background re-fetch (debounced to avoid spam)
  const [selectedItemsForApi, setSelectedItemsForApi] = useState<Array<{ id: string; category: string; avgPrice: number }>>([])
  const debouncedSelectedItems = useDebounce(selectedItemsForApi, 500)

  // Filter state for UI controls - now supporting multi-select
  const [typeFilters, setTypeFilters] = useState<string[]>(() => {
    const param = searchParams.get('headphoneTypes')
    if (param) {
      try {
        return JSON.parse(param)
      } catch {
        return ['cans', 'iems'] // Default to both if parsing fails
      }
    }
    // Legacy support for single headphoneType param
    const legacyType = searchParams.get('headphoneType')
    if (legacyType === 'cans') return ['cans']
    if (legacyType === 'iems') return ['iems']
    return ['cans', 'iems'] // Default to both
  })

  // Show more state for progressive disclosure
  const [showAllCans, setShowAllCans] = useState(false)
  const [showAllIems, setShowAllIems] = useState(false)
  const [showAllDacs, setShowAllDacs] = useState(false)
  const [showAllAmps, setShowAllAmps] = useState(false)
  const [showAllCombos, setShowAllCombos] = useState(false)

  const [soundFilters, setSoundFilters] = useState<string[]>(() => {
    const param = searchParams.get('soundSignatures')
    if (param) {
      try {
        const parsed = JSON.parse(param)
        return Array.isArray(parsed) && parsed.length > 0 ? parsed : ['neutral']
      } catch {
        return ['neutral'] // Default to neutral if parsing fails
      }
    }
    // Legacy support for single sound param
    const legacySound = searchParams.get('sound') // Keep for legacy support
    if (legacySound && legacySound !== 'any') return [legacySound]
    return ['neutral'] // Default to neutral
  })

  // Multi-select mode for sound signatures (defaults to single-select)
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false)

  // Extract values for convenience
  const { wantRecommendationsFor, soundSignature } = userPrefs
  const budget = userPrefs.budget // For UI display (immediate)
  // debouncedBudget used for API calls (300ms delay)

  // Update URL directly - URL is single source of truth
  const updateURL = useCallback((updates: Partial<typeof userPrefs>) => {
    const params = new URLSearchParams(searchParams.toString())

    // Update changed fields
    if (updates.budget !== undefined) params.set('budget', updates.budget.toString())
    if (updates.budgetRangeMin !== undefined) params.set('budgetRangeMin', updates.budgetRangeMin.toString())
    if (updates.budgetRangeMax !== undefined) params.set('budgetRangeMax', updates.budgetRangeMax.toString())
    if (updates.headphoneType !== undefined) params.set('headphoneType', updates.headphoneType)
    if (updates.wantRecommendationsFor !== undefined) params.set('wantRecommendationsFor', JSON.stringify(updates.wantRecommendationsFor))
    if (updates.existingGear !== undefined) params.set('existingGear', JSON.stringify(updates.existingGear))
    if (updates.usage !== undefined) params.set('usage', updates.usage)
    if (updates.usageRanking !== undefined) params.set('usageRanking', JSON.stringify(updates.usageRanking))
    if (updates.excludedUsages !== undefined) params.set('excludedUsages', JSON.stringify(updates.excludedUsages))

    router.push(`/recommendations?${params.toString()}`, { scroll: false })
  }, [router, searchParams])

  // Browse mode removed - no handler needed



  // Format budget with US currency formatting
  const formatBudgetUSD = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Get budget tier name and range

  // Create stable key for soundFilters to avoid infinite re-renders
  const soundFiltersKey = useMemo(() => [...soundFilters].sort().join(','), [soundFilters])

  // Create stable key for typeFilters to avoid infinite re-renders
  const typeFiltersKey = useMemo(() => [...typeFilters].sort().join(','), [typeFilters])

  // Create stable key for wantRecommendationsFor to detect component changes
  const wantRecommendationsForKey = useMemo(
    () => JSON.stringify(wantRecommendationsFor),
    [wantRecommendationsFor]
  )

  // PERFORMANCE: Memoize champion calculations for cans (recalc only when cans array changes)
  const cansChampions = useMemo(() => {
    if (cans.length === 0) return { topTechnical: null, topTone: null, topBudget: null }

    const topTechnical = cans.reduce((prev, current) => {
      const prevGrade = prev.expert_grade_numeric || 0
      const currGrade = current.expert_grade_numeric || 0
      return currGrade > prevGrade ? current : prev
    })

    const topTone = cans.reduce((prev, current) => {
      const prevScore = prev.matchScore || 0
      const currScore = current.matchScore || 0
      return currScore > prevScore ? current : prev
    })

    const topBudget = cans.reduce((prev, current) => {
      const prevValue = (prev.value_rating || 0) / (((prev.price_used_min || 0) + (prev.price_used_max || 0)) / 2 || 1)
      const currValue = (current.value_rating || 0) / (((current.price_used_min || 0) + (current.price_used_max || 0)) / 2 || 1)
      return currValue > prevValue ? current : prev
    })

    return { topTechnical, topTone, topBudget }
  }, [cans])

  // PERFORMANCE: Memoize champion calculations for IEMs (recalc only when iems array changes)
  const iemsChampions = useMemo(() => {
    if (iems.length === 0) return { topTechnical: null, topTone: null, topBudget: null }

    const topTechnical = iems.reduce((prev, current) => {
      const prevGrade = prev.expert_grade_numeric || 0
      const currGrade = current.expert_grade_numeric || 0
      return currGrade > prevGrade ? current : prev
    })

    const topTone = iems.reduce((prev, current) => {
      const prevScore = prev.matchScore || 0
      const currScore = current.matchScore || 0
      return currScore > prevScore ? current : prev
    })

    const topBudget = iems.reduce((prev, current) => {
      const prevValue = (prev.value_rating || 0) / (((prev.price_used_min || 0) + (prev.price_used_max || 0)) / 2 || 1)
      const currValue = (current.value_rating || 0) / (((current.price_used_min || 0) + (current.price_used_max || 0)) / 2 || 1)
      return currValue > prevValue ? current : prev
    })

    return { topTechnical, topTone, topBudget }
  }, [iems])

  // ===== MOVED TO API - RECOMMENDATIONS LOGIC NOW SERVER-SIDE =====

  // Main recommendation fetching logic using new API
  const fetchRecommendations = useCallback(async (background = false) => {
    if (!background) setLoading(true)
    setError(null)

    try {
      // Convert typeFilters to headphoneType format (use local state for immediate filtering)
      const headphoneType = typeFilters.length === 2 ? 'both' : typeFilters.length === 1 ? typeFilters[0] : 'both'

      // Build URL parameters for recommendations API
      const params = new URLSearchParams({
        budget: debouncedBudget.toString(), // Debounced for API performance
        budgetRangeMin: userPrefs.budgetRangeMin.toString(),
        budgetRangeMax: userPrefs.budgetRangeMax.toString(),
        headphoneType: headphoneType, // Use local state instead of URL state to avoid race condition
        wantRecommendationsFor: JSON.stringify(userPrefs.wantRecommendationsFor),
        existingGear: JSON.stringify(userPrefs.existingGear),
        usage: userPrefs.usage,
        usageRanking: JSON.stringify(userPrefs.usageRanking),
        excludedUsages: JSON.stringify(userPrefs.excludedUsages),
        soundSignatures: JSON.stringify(soundFilters)
      })

      // Add custom budget allocation if provided (using debounced value)
      if (debouncedCustomBudgetAllocation) {
        params.set('customBudgetAllocation', JSON.stringify(debouncedCustomBudgetAllocation))
      }

      // Add selected items for budget-aware re-ranking
      if (debouncedSelectedItems.length > 0) {
        params.set('selectedItems', JSON.stringify(debouncedSelectedItems))
      }

      const response = await fetch(`/api/recommendations/v2?${params.toString()}`)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `Server error (${response.status})`)
      }
      
      const recommendations = await response.json()
      
      // Validate response structure
      if (!recommendations || typeof recommendations !== 'object') {
        throw new Error('Invalid response format from recommendations API')
      }
      
      // Set recommendations - API always returns separate cans and iems arrays
      setCans(recommendations.cans || [])
      setIems(recommendations.iems || [])
      setDacs(recommendations.dacs || [])

      setBudgetAllocation(recommendations.budgetAllocation || {})
      setAmps(recommendations.amps || [])
      setDacAmps(recommendations.combos || [])
      setShowAmplification(recommendations.needsAmplification || false)

      // Store server's automatic allocation for display (but don't auto-use it)
      if (recommendations.budgetAllocation) {
        const allocation: BudgetAllocation = {}
        const totalBudget = debouncedBudget

        Object.entries(recommendations.budgetAllocation).forEach(([component, amount]) => {
          if (typeof amount === 'number') {
            allocation[component as keyof BudgetAllocation] = {
              amount,
              percentage: (amount / totalBudget) * 100,
              rangeMin: userPrefs.budgetRangeMin,
              rangeMax: userPrefs.budgetRangeMax
            }
          }
        })

        setAutoBudgetAllocation(allocation)
      }
      
      // Check if we got any results
      const headphoneResults = (recommendations.cans?.length || 0) +
                               (recommendations.iems?.length || 0)
      const totalResults = headphoneResults +
                          (recommendations.dacs?.length || 0) +
                          (recommendations.amps?.length || 0) +
                          (recommendations.combos?.length || 0)

    } catch (error) {
      console.error('Recommendations API error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Failed to load recommendations'
      setError(`Unable to load recommendations: ${errorMessage}`)

      // Fallback to empty state
      setCans([])
      setIems([])
      setDacs([])
      setAmps([])
      setDacAmps([])
      setShowAmplification(false)
    } finally {
      if (!background) setLoading(false)
    }
  }, [
    debouncedBudget,
    debouncedCustomBudgetAllocation,
    debouncedSelectedItems,
    userPrefs.budgetRangeMin,
    userPrefs.budgetRangeMax,
    userPrefs.usage,
    soundFiltersKey,
    typeFiltersKey, // Triggers refetch when type filters change (cans/IEMs)
    typeFilters, // Need actual array for headphoneType conversion
    userPrefs.budget // Need for selectedItems budget shift calculation
    // Removed JSON.stringify dependencies - they create new references every render
    // The API stringifies these internally, so changes are reflected in the request
  ])

  // Fetch filter counts - use stable strings instead of array references
  const fetchFilterCounts = useCallback(async () => {
    try {
      // Derive active filters inside the callback to avoid dependency issues
      const activeEquipment = typeFilters.filter(Boolean)

      const params = new URLSearchParams({
        budget: debouncedBudget.toString(),
        rangeMin: userPrefs.budgetRangeMin.toString(),
        rangeMax: userPrefs.budgetRangeMax.toString(),
        headphoneType: userPrefs.headphoneType,
        equipment: activeEquipment.join(','),
        soundSignatures: soundFiltersKey,
        wantRecommendationsFor: JSON.stringify(userPrefs.wantRecommendationsFor),
        existingGear: JSON.stringify(userPrefs.existingGear),
        usage: userPrefs.usage,
        usageRanking: JSON.stringify(userPrefs.usageRanking),
        excludedUsages: JSON.stringify(userPrefs.excludedUsages)
      })

      // Add custom budget allocation if provided (using debounced value)
      if (debouncedCustomBudgetAllocation) {
        params.set('customBudgetAllocation', JSON.stringify(debouncedCustomBudgetAllocation))
      }

      const response = await fetch(`/api/filters/counts?${params.toString()}`)

      if (!response.ok) {
        console.error('Failed to fetch filter counts:', response.status)
        return
      }

      const counts = await response.json()
      setFilterCounts(counts)
    } catch (error) {
      console.error('Error fetching filter counts:', error)
    }
  }, [
    debouncedBudget,
    debouncedCustomBudgetAllocation,
    userPrefs.budgetRangeMin,
    userPrefs.budgetRangeMax,
    userPrefs.headphoneType,
    userPrefs.usage,
    typeFiltersKey,
    soundFiltersKey
    // Removed JSON.stringify dependencies - they create new references every render
  ])

  // Clear custom budget allocation when budget or components change (prevents stale allocation)
  useEffect(() => {
    setCustomBudgetAllocation(null)
  }, [userPrefs.budget, wantRecommendationsForKey])

  // Track whether initial load is complete (for background re-fetch detection)
  const hasInitiallyLoaded = React.useRef(false)

  // Initial fetch on mount + when fetchRecommendations changes
  useEffect(() => {
    if (hasInitiallyLoaded.current && debouncedSelectedItems.length > 0) {
      // Background re-fetch: selections changed, don't show loading spinner
      fetchRecommendations(true)
    } else {
      fetchRecommendations(false)
      hasInitiallyLoaded.current = true
    }
  }, [fetchRecommendations]) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch filter counts when budget changes
  useEffect(() => {
    fetchFilterCounts()
  }, [fetchFilterCounts])

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  // Used listings fetch effect
  const fetchUsedListings = useCallback(async () => {
    if (!showMarketplace) return

    const allComponents = [...cans, ...iems, ...dacs, ...amps, ...dacAmps]
    const componentIds = allComponents.map(c => c.id)
    
    if (componentIds.length === 0) return
    
    try {
      const response = await fetch(`/api/used-listings?component_ids=${componentIds.join(',')}&limit=200`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      // API returns { listings: {...}, total, page, ... } so extract listings
      const groupedListings: {[componentId: string]: UsedListing[]} = data.listings || {}
      setUsedListings(groupedListings)
    } catch (error) {
      console.error('Error fetching used listings:', error)
      return
    }
  }, [showMarketplace, cans, iems, dacs, amps, dacAmps])
  
  // Used market data is now loaded inline in fetchUsedListings function above

  useEffect(() => {
    fetchUsedListings()
  }, [fetchUsedListings])

  // Selection toggle functions - store full component objects in Maps
  const toggleCansSelection = useCallback((id: string) => {
    setSelectedCans(prev => {
      const next = new Map(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        const component = cans.find(c => c.id === id)
        if (component) next.set(id, component)
      }
      return next
    })
  }, [cans])

  const toggleIemsSelection = useCallback((id: string) => {
    setSelectedIems(prev => {
      const next = new Map(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        const component = iems.find(c => c.id === id)
        if (component) next.set(id, component)
      }
      return next
    })
  }, [iems])

  const toggleDacSelection = useCallback((id: string) => {
    setSelectedDacs(prev => {
      const next = new Map(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        const component = dacs.find(c => c.id === id)
        if (component) next.set(id, component)
      }
      return next
    })
  }, [dacs])

  const toggleAmpSelection = useCallback((id: string) => {
    setSelectedAmps(prev => {
      const next = new Map(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        const component = amps.find(c => c.id === id)
        if (component) next.set(id, component)
      }
      return next
    })
  }, [amps])

  const toggleDacAmpSelection = useCallback((id: string) => {
    setSelectedDacAmps(prev => {
      const next = new Map(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        const component = dacAmps.find(c => c.id === id)
        if (component) next.set(id, component)
      }
      return next
    })
  }, [dacAmps])

  // Remove item from selection by id and category (used by SelectedSystemSummary and StackBuilderModal)
  const removeFromSelection = useCallback((id: string, category: string) => {
    switch (category) {
      case 'cans':
        setSelectedCans(prev => { const next = new Map(prev); next.delete(id); return next })
        break
      case 'iems':
        setSelectedIems(prev => { const next = new Map(prev); next.delete(id); return next })
        break
      case 'dacs':
        setSelectedDacs(prev => { const next = new Map(prev); next.delete(id); return next })
        break
      case 'amps':
        setSelectedAmps(prev => { const next = new Map(prev); next.delete(id); return next })
        break
      case 'combos':
        setSelectedDacAmps(prev => { const next = new Map(prev); next.delete(id); return next })
        break
    }
  }, [])

  // Derive selected items from Maps (memoized - survives API re-fetches)
  const selectedHeadphoneItems = useMemo(() => [
    ...Array.from(selectedCans.values()),
    ...Array.from(selectedIems.values())
  ], [selectedCans, selectedIems])

  const selectedDacItems = useMemo(() => Array.from(selectedDacs.values()), [selectedDacs])
  const selectedAmpItems = useMemo(() => Array.from(selectedAmps.values()), [selectedAmps])
  const selectedDacAmpItems = useMemo(() => Array.from(selectedDacAmps.values()), [selectedDacAmps])

  // Helper to get avg price of a component
  const getAvgPrice = (item: { price_used_min?: number | null; price_used_max?: number | null }) =>
    ((item.price_used_min || 0) + (item.price_used_max || 0)) / 2

  // Memoize all cost calculations to prevent cascading re-renders
  const { totalSelectedPrice, selectedHeadphoneCost, selectedDacCost, selectedAmpCost, selectedDacAmpCost } = useMemo(() => {
    const hpCost = selectedHeadphoneItems.reduce((sum, item) => sum + getAvgPrice(item), 0)
    const dacCost = selectedDacItems.reduce((sum, item) => sum + getAvgPrice(item), 0)
    const ampCost = selectedAmpItems.reduce((sum, item) => sum + getAvgPrice(item), 0)
    const dacAmpCost = selectedDacAmpItems.reduce((sum, item) => sum + getAvgPrice(item), 0)
    return {
      totalSelectedPrice: hpCost + dacCost + ampCost + dacAmpCost,
      selectedHeadphoneCost: hpCost,
      selectedDacCost: dacCost,
      selectedAmpCost: ampCost,
      selectedDacAmpCost: dacAmpCost
    }
  }, [selectedHeadphoneItems, selectedDacItems, selectedAmpItems, selectedDacAmpItems])

  // Memoize remaining budget and constraint flags
  const { hasAnySelections, remainingForHeadphones, remainingForDacs, remainingForAmps, remainingForCombos,
          isHeadphoneBudgetConstrained, isDacBudgetConstrained, isAmpBudgetConstrained, isComboBudgetConstrained } = useMemo(() => {
    const hasSelections = totalSelectedPrice > 0
    const remHeadphones = userPrefs.budget - selectedDacCost - selectedAmpCost - selectedDacAmpCost
    const remDacs = userPrefs.budget - selectedHeadphoneCost - selectedAmpCost - selectedDacAmpCost
    const remAmps = userPrefs.budget - selectedHeadphoneCost - selectedDacCost - selectedDacAmpCost
    const remCombos = userPrefs.budget - selectedHeadphoneCost - selectedDacCost - selectedAmpCost
    return {
      hasAnySelections: hasSelections,
      remainingForHeadphones: remHeadphones,
      remainingForDacs: remDacs,
      remainingForAmps: remAmps,
      remainingForCombos: remCombos,
      isHeadphoneBudgetConstrained: hasSelections && selectedHeadphoneItems.length === 0 && (selectedDacCost + selectedAmpCost + selectedDacAmpCost) > 0,
      isDacBudgetConstrained: hasSelections && selectedDacItems.length === 0 && (selectedHeadphoneCost + selectedAmpCost + selectedDacAmpCost) > 0,
      isAmpBudgetConstrained: hasSelections && selectedAmpItems.length === 0 && (selectedHeadphoneCost + selectedDacCost + selectedDacAmpCost) > 0,
      isComboBudgetConstrained: hasSelections && selectedDacAmpItems.length === 0 && (selectedHeadphoneCost + selectedDacCost + selectedAmpCost) > 0,
    }
  }, [totalSelectedPrice, userPrefs.budget, selectedHeadphoneCost, selectedDacCost, selectedAmpCost, selectedDacAmpCost, selectedHeadphoneItems.length, selectedDacItems.length, selectedAmpItems.length, selectedDacAmpItems.length])

  const filteredCans = useMemo(() => {
    if (!isHeadphoneBudgetConstrained) return cans
    return cans.filter(c => getAvgPrice(c) <= remainingForHeadphones * 1.1) // 10% grace
  }, [cans, isHeadphoneBudgetConstrained, remainingForHeadphones])

  const filteredIems = useMemo(() => {
    if (!isHeadphoneBudgetConstrained) return iems
    return iems.filter(c => getAvgPrice(c) <= remainingForHeadphones * 1.1)
  }, [iems, isHeadphoneBudgetConstrained, remainingForHeadphones])

  const filteredDacs = useMemo(() => {
    if (!isDacBudgetConstrained) return dacs
    return dacs.filter(d => getAvgPrice(d) <= remainingForDacs * 1.1)
  }, [dacs, isDacBudgetConstrained, remainingForDacs])

  const filteredAmps = useMemo(() => {
    if (!isAmpBudgetConstrained) return amps
    return amps.filter(a => getAvgPrice(a) <= remainingForAmps * 1.1)
  }, [amps, isAmpBudgetConstrained, remainingForAmps])

  const filteredDacAmps = useMemo(() => {
    if (!isComboBudgetConstrained) return dacAmps
    return dacAmps.filter(da => getAvgPrice(da) <= remainingForCombos * 1.1)
  }, [dacAmps, isComboBudgetConstrained, remainingForCombos])

  // Update selectedItemsForApi when selections change significantly (>30% budget shift)
  useEffect(() => {
    if (!hasAnySelections) {
      if (selectedItemsForApi.length > 0) setSelectedItemsForApi([])
      return
    }
    const items: Array<{ id: string; category: string; avgPrice: number }> = [
      ...selectedHeadphoneItems.map(h => ({ id: h.id, category: 'headphones', avgPrice: getAvgPrice(h) })),
      ...selectedDacItems.map(d => ({ id: d.id, category: 'dac', avgPrice: getAvgPrice(d) })),
      ...selectedAmpItems.map(a => ({ id: a.id, category: 'amp', avgPrice: getAvgPrice(a) })),
      ...selectedDacAmpItems.map(da => ({ id: da.id, category: 'combo', avgPrice: getAvgPrice(da) }))
    ]
    const totalSelected = items.reduce((sum, i) => sum + i.avgPrice, 0)
    // Only trigger background re-fetch if selections consume >30% of total budget
    if (totalSelected / userPrefs.budget > 0.3) {
      setSelectedItemsForApi(items)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHeadphoneItems, selectedDacItems, selectedAmpItems, selectedDacAmpItems])

  // Combine all selected items for comparison view (memoized)
  const comparisonItems = useMemo(() => [
    ...selectedHeadphoneItems,
    ...selectedDacItems,
    ...selectedAmpItems,
    ...selectedDacAmpItems
  ], [selectedHeadphoneItems, selectedDacItems, selectedAmpItems, selectedDacAmpItems])

  // Handlers for comparison view
  const handleClearAllComparisons = useCallback(() => {
    setSelectedCans(new Map())
    setSelectedIems(new Map())
    setSelectedDacs(new Map())
    setSelectedAmps(new Map())
    setSelectedDacAmps(new Map())
    setIsComparisonBarExpanded(false)
  }, [])

  const handleOpenComparisonModal = useCallback(() => {
    setShowComparisonView(true)
  }, [])

  // Get budget range label
  const getBudgetRangeLabel = (budget: number) => {
    if (budget <= 100) return 'Budget'
    if (budget <= 400) return 'Entry Level'
    if (budget <= 1000) return 'Mid Range'
    if (budget <= 3000) return 'High End'
    return 'Summit-Fi'
  }

  // Fixed display limit (always use intermediate level)
  const initialLimit = 5

  // Get display arrays with show more logic
  const getDisplayItems = <T,>(items: T[], showAll: boolean): T[] => {
    if (showAll || items.length <= initialLimit) return items
    return items.slice(0, initialLimit)
  }

  const displayCans = getDisplayItems(filteredCans, showAllCans)
  const displayIems = getDisplayItems(filteredIems, showAllIems)
  const displayDacs = getDisplayItems(filteredDacs, showAllDacs)
  const displayAmps = getDisplayItems(filteredAmps, showAllAmps)
  const displayDacAmps = getDisplayItems(filteredDacAmps, showAllCombos)



  // Dynamic title and description 
  const getTitle = () => {
    if (isBudgetFocused) {
      return `${getBudgetRangeLabel(budget)} Audio Gear Under ${formatBudgetUSD(budget)}`
    }
    return "Your Audio System Recommendations"
  }

  const getDescription = () => {
    if (isBudgetFocused) {
      return `Here are highly-rated headphones and IEMs in your ${formatBudgetUSD(budget)} budget range. Use the filters below to narrow results by type and sound signature.`
    }

    const totalItems = cans.length + iems.length + dacs.length + amps.length + dacAmps.length

    return totalItems > 0
      ? `Here are ${totalItems} excellent options that balance performance and value. Each offers something different - consider your priorities.`
      : "Finding excellent options that balance performance and value for your setup."
  }

  // Amplification detection
  const getAmplificationNeeds = () => {
    const selectedHeadphonesThatNeedAmp = selectedHeadphoneItems.filter(hp => hp.needs_amp)
    const recommendedHeadphonesThatNeedAmp = [...cans, ...iems].filter(hp => hp.needs_amp)

    return {
      selectedNeedAmp: selectedHeadphonesThatNeedAmp,
      recommendedNeedAmp: recommendedHeadphonesThatNeedAmp,
      hasAmplification: wantRecommendationsFor.amp || wantRecommendationsFor.combo,
      shouldShowWarning: (selectedHeadphonesThatNeedAmp.length > 0 || recommendedHeadphonesThatNeedAmp.length > 0) && !wantRecommendationsFor.amp && !wantRecommendationsFor.combo
    }
  }

  const amplificationNeeds = getAmplificationNeeds()

  // Filter handlers
  const handleTypeFilterChange = useCallback((filter: 'cans' | 'iems') => {
    const newFilters = typeFilters.includes(filter)
      ? typeFilters.filter(f => f !== filter)
      : [...typeFilters, filter]
    setTypeFilters(newFilters)
    const newType = newFilters.length === 2 ? 'both' : newFilters.length === 1 ? newFilters[0] : 'both'
    const wasWantingHeadphones = typeFilters.length > 0
    const nowWantingHeadphones = newFilters.length > 0
    updateURL({
      headphoneType: newType,
      ...(wasWantingHeadphones !== nowWantingHeadphones ? {
        wantRecommendationsFor: {
          ...wantRecommendationsFor,
          headphones: nowWantingHeadphones
        }
      } : {})
    })
  }, [typeFilters, wantRecommendationsFor, updateURL])

  const handleEquipmentToggle = useCallback((type: 'dac' | 'amp' | 'combo') => {
    updateURL({
      wantRecommendationsFor: {
        ...wantRecommendationsFor,
        [type]: !wantRecommendationsFor[type]
      }
    })
  }, [wantRecommendationsFor, updateURL])

  const handleSoundFilterChange = useCallback((filter: 'neutral' | 'warm' | 'bright' | 'fun') => {
    if (isMultiSelectMode) {
      // Multi-select behavior: toggle (checkbox-style)
      setSoundFilters(prev => {
        const newFilters = prev.includes(filter)
          ? prev.filter(f => f !== filter)
          : [...prev, filter]

        // Ensure at least one filter is always selected
        return newFilters.length === 0 ? [filter] : newFilters
      })
    } else {
      // Single-select behavior: replace previous selection
      setSoundFilters([filter])
    }
    // Update preferences with selected filter for backward compatibility
    updateURL({ soundSignature: filter })
  }, [isMultiSelectMode, updateURL])

  const handleToggleMultiSelect = useCallback(() => {
    setIsMultiSelectMode(prev => !prev)
  }, [])

  const handleAddAmplification = useCallback(() => {
    // Toggle amplification on/off
    const isCurrentlyEnabled = wantRecommendationsFor.amp || wantRecommendationsFor.combo
    updateURL({
      wantRecommendationsFor: {
        ...wantRecommendationsFor,
        amp: !isCurrentlyEnabled,
        combo: !isCurrentlyEnabled
      }
    })
  }, [wantRecommendationsFor, updateURL])

  // Handle custom budget allocation changes
  const handleBudgetAllocationChange = useCallback((allocation: BudgetAllocation) => {
    setCustomBudgetAllocation(allocation)
  }, [])

  // Handle "Find Used" button click
  const handleFindUsed = useCallback((componentId: string, componentName: string) => {
    // Open used market section
    setShowMarketplace(true)
    // Set focused component to filter listings
    setFocusedComponentId(componentId)
  }, [usedListings])

  // Scroll to used market section after it renders
  useEffect(() => {
    if (showMarketplace && focusedComponentId && usedListings[focusedComponentId]) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        const usedMarketSection = document.querySelector('[data-marketplace-section]')

        if (usedMarketSection) {
          usedMarketSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      })
    }
  }, [showMarketplace, focusedComponentId, usedListings])

  // Show initial loading screen only on first mount
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

  useEffect(() => {
    if (!loading && !hasLoadedOnce) {
      setHasLoadedOnce(true)
    }
  }, [loading, hasLoadedOnce])

    if (loading && !hasLoadedOnce) {
      return (
        <div className="page-container" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
          <div style={{ textAlign: 'center' }}>
            <div className="animate-spin rounded-full h-8 w-8 mx-auto mb-4" style={{ border: '2px solid var(--border-default)', borderTopColor: 'var(--accent-primary)' }} />
            <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Building your recommendations…</p>
          </div>
        </div>
      )
    }


  return (
    <>
      <div style={{ background: 'var(--background-primary)' }}>

      {/* ── Page header strip ── */}
      <div style={{ position: 'relative', overflow: 'hidden', borderBottom: '1px solid var(--border-subtle)', background: 'var(--background-secondary)', padding: '16px 0' }}>
        {/* Grid texture */}
        <div aria-hidden style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(var(--border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--border-subtle) 1px, transparent 1px)', backgroundSize: '48px 48px', opacity: 0.4, pointerEvents: 'none' }} />
        <div aria-hidden style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse 80% 100% at 50% 0%, var(--background-secondary) 50%, transparent 100%)', pointerEvents: 'none' }} />
        <div className="mx-auto px-4 sm:px-6 lg:px-8" style={{ width: '95%', maxWidth: '1400px', position: 'relative', zIndex: 1 }}>
            <div data-budget-slider>
                <Tooltip content={guidedModeEnabled ? FILTER_TOOLTIPS.budget : ''} position="bottom" className="w-full">
                  <BudgetSlider
                    budget={budget}
                    onChange={(newBudget) => updateURL({ budget: newBudget })}
                    variant="simple"
                    userExperience="intermediate"
                    showInput={true}
                    showLabels={true}
                    showItemCount={true}
                    itemCount={cans.length + iems.length + dacs.length + amps.length + dacAmps.length}
                    minBudget={20}
                    maxBudget={10000}
                    budgetRangeMin={userPrefs.budgetRangeMin}
                    budgetRangeMax={userPrefs.budgetRangeMax}
                    className="w-full"
                  />
                </Tooltip>
                </div>
            </div>
        </div>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6" style={{ width: '95%', maxWidth: '1400px' }}>

       {/* Compact Filters (includes budget allocation controls) */}
        <FiltersSection
          typeFilters={typeFilters}
          soundFilters={soundFilters}
          wantRecommendationsFor={wantRecommendationsFor}
          guidedModeEnabled={guidedModeEnabled}
          filterCounts={filterCounts || undefined}
          resultCounts={{
            cans: cans.length,
            iems: iems.length,
            dacs: dacs.length,
            amps: amps.length,
            combos: dacAmps.length
          }}
          onTypeFilterChange={handleTypeFilterChange}
          onEquipmentToggle={handleEquipmentToggle}
          onSoundFilterChange={handleSoundFilterChange}
          expandAllExperts={expandAllExperts}
          onToggleExpandExperts={() => setExpandAllExperts(!expandAllExperts)}
          onToggleGuidedMode={toggleGuidedMode}
          isMultiSelectMode={isMultiSelectMode}
          onToggleMultiSelect={handleToggleMultiSelect}
          totalBudget={debouncedBudget}
          budgetAllocation={customBudgetAllocation}
          autoBudgetAllocation={autoBudgetAllocation}
          onBudgetAllocationChange={handleBudgetAllocationChange}
          budgetRangeMin={userPrefs.budgetRangeMin}
          budgetRangeMax={userPrefs.budgetRangeMax}
        />

        {/* Amplification Warning Banner for Beginners/Intermediates */}
        {amplificationNeeds?.shouldShowWarning && (
          <AmplificationWarningBanner
            selectedNeedAmp={amplificationNeeds.selectedNeedAmp}
            onAddAmplification={handleAddAmplification}
            amplificationEnabled={wantRecommendationsFor.amp || wantRecommendationsFor.combo}
          />
        )}

        {/* System Overview */}
        <SelectedSystemSummary
          selectedHeadphones={selectedHeadphoneItems}
          selectedDacs={selectedDacItems}
          selectedAmps={selectedAmpItems}
          selectedCombos={selectedDacAmpItems}
          budget={budget}
          remainingBudget={userPrefs.budget - totalSelectedPrice}
          onBuildStack={() => setShowStackBuilder(true)}
          onRemoveItem={removeFromSelection}
          onClearAll={() => {
            setSelectedCans(new Map())
            setSelectedIems(new Map())
            setSelectedDacs(new Map())
            setSelectedAmps(new Map())
            setSelectedDacAmps(new Map())
          }}
        />

        {/* Error Display */}
        {error && (
          <div className="card p-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 mb-6">
            <p className="text-red-800 dark:text-red-200 font-medium">⚠️ {error}</p>
          </div>
        )}

        {/* Dynamic grid based on number of component types */}
        {(() => {
          // Check for separate cans/iems or combined headphones
          // Always show separate sections for cans and iems
          const hasCans = wantRecommendationsFor.headphones && filteredCans.length > 0
          const hasIems = wantRecommendationsFor.headphones && filteredIems.length > 0
          const hasDacs = wantRecommendationsFor.dac && filteredDacs.length > 0
          const hasAmps = wantRecommendationsFor.amp && filteredAmps.length > 0
          const hasCombos = wantRecommendationsFor.combo && filteredDacAmps.length > 0
          const hasSignalGear = hasDacs || hasAmps || hasCombos

          const activeTypes = [
            hasCans,
            hasIems,
            hasDacs,
            hasAmps,
            hasCombos
          ].filter(Boolean).length

          // Special layout: headphones + signal gear → 2 columns (headphones | signal gear stacked)
          const useStackedLayout = (hasCans || hasIems) && hasSignalGear && activeTypes >= 2

          const gridClass = activeTypes === 1
            ? 'grid grid-cols-1 gap-8 max-w-2xl mx-auto'
            : useStackedLayout
            ? 'grid grid-cols-1 lg:grid-cols-2 gap-8'
            : activeTypes === 2
            ? 'grid grid-cols-1 lg:grid-cols-2 gap-8'
            : 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8'

          return (
            <div className="relative">
              {/* Loading overlay - appears during updates but doesn't block interaction */}
              {loading && hasLoadedOnce && (
                <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none">
                  <div className="bg-gradient-to-b from-background-primary/95 to-transparent py-3 px-4 rounded-lg shadow-sm flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-accent-primary border-t-transparent"></div>
                    <span className="text-sm text-text-secondary font-medium">Updating results...</span>
                  </div>
                </div>
              )}

              {/* Results grid with smooth opacity transition */}
              <div
                className={`${gridClass} transition-opacity duration-300 ${loading && hasLoadedOnce ? 'opacity-90' : 'opacity-100'}`}
              >
              {/* Separate Headphones (Cans) Section */}
              {hasCans && (() => {
                // Use memoized champion calculations for better performance
                const { topTechnical, topTone, topBudget } = cansChampions

                  return (
              <div className="card overflow-hidden border-t-2" style={{ borderTopColor: 'rgb(167 139 250)' }}>
                <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase text-text-tertiary" style={{ letterSpacing: '0.1em' }}>
                    Headphones
                  </h2>
                  <span className="text-xs text-text-tertiary tabular-nums">
                    {filteredCans.length} results
                    {isHeadphoneBudgetConstrained ? ` · ${formatBudgetUSD(remainingForHeadphones)} remaining` : budgetAllocation.headphones && Object.keys(budgetAllocation).length > 1 ? ` · ${formatBudgetUSD(budgetAllocation.headphones)} budget` : ''}
                  </span>
                </div>
              <div className="p-4 flex flex-col gap-[5px]">
                {displayCans.map((headphone) => {
                  const isTechnicalChamp = !!(topTechnical && headphone.id === topTechnical.id && (topTechnical.expert_grade_numeric || 0) >= 3.3)
                  const isToneChamp = !!(topTone && headphone.id === topTone.id && (topTone.matchScore || 0) >= 85)
                  const isBudgetChamp = !!(topBudget && headphone.id === topBudget.id && (topBudget.value_rating || 0) >= 4)

                  return (
                    <HeadphoneCard
                      key={headphone.id}
                      headphone={headphone}
                      isSelected={selectedCans.has(headphone.id)}
                      onToggleSelection={toggleCansSelection}
                      isTechnicalChamp={isTechnicalChamp}
                      isToneChamp={isToneChamp}
                      isBudgetChamp={isBudgetChamp}
                      onFindUsed={handleFindUsed}
                      expandAllExperts={expandAllExperts}
                    />
                  )
                })}

                {/* Show More Button */}
                {!showAllCans && filteredCans.length > initialLimit && (
                  <button
                    onClick={() => setShowAllCans(true)}
                    className="mt-2 py-2 px-4 text-sm font-medium text-accent-primary hover:text-accent-secondary transition-colors border border-accent-primary/30 hover:border-accent-primary rounded-lg"
                  >
                    Show {filteredCans.length - initialLimit} more headphones
                  </button>
                )}
              </div>
            </div>
                )
          })()}

              {/* Separate IEMs Section */}
              {hasIems && (() => {
                // Use memoized champion calculations for better performance
                const { topTechnical, topTone, topBudget } = iemsChampions

                  return (
              <div className="card overflow-hidden border-t-2" style={{ borderTopColor: 'rgb(129 140 248)' }}>
                <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase text-text-tertiary" style={{ letterSpacing: '0.1em' }}>
                    IEMs
                  </h2>
                  <span className="text-xs text-text-tertiary tabular-nums">
                    {filteredIems.length} results
                    {isHeadphoneBudgetConstrained ? ` · ${formatBudgetUSD(remainingForHeadphones)} remaining` : budgetAllocation.headphones && Object.keys(budgetAllocation).length > 1 ? ` · ${formatBudgetUSD(budgetAllocation.headphones)} budget` : ''}
                  </span>
                </div>
              <div className="p-4 flex flex-col gap-[5px]">
                {displayIems.map((headphone) => {
                  const isTechnicalChamp = !!(topTechnical && headphone.id === topTechnical.id && (topTechnical.expert_grade_numeric || 0) >= 3.3)
                  const isToneChamp = !!(topTone && headphone.id === topTone.id && (topTone.matchScore || 0) >= 85)
                  const isBudgetChamp = !!(topBudget && headphone.id === topBudget.id && (topBudget.value_rating || 0) >= 4)

                  return (
                    <HeadphoneCard
                      key={headphone.id}
                      headphone={headphone}
                      isSelected={selectedIems.has(headphone.id)}
                      onToggleSelection={toggleIemsSelection}
                      isTechnicalChamp={isTechnicalChamp}
                      isToneChamp={isToneChamp}
                      isBudgetChamp={isBudgetChamp}
                      onFindUsed={handleFindUsed}
                      expandAllExperts={expandAllExperts}
                    />
                  )
                })}

                {/* Show More Button */}
                {!showAllIems && filteredIems.length > initialLimit && (
                  <button
                    onClick={() => setShowAllIems(true)}
                    className="mt-2 py-2 px-4 text-sm font-medium text-accent-primary hover:text-accent-secondary transition-colors border border-accent-primary/30 hover:border-accent-primary rounded-lg"
                  >
                    Show {filteredIems.length - initialLimit} more IEMs
                  </button>
                )}
              </div>
            </div>
                )
          })()}

          {/* Signal gear (DACs, Amps, Combos) - Stack when with headphones */}
          {(() => {
            const SignalGearWrapper = useStackedLayout ? 'div' : React.Fragment
            const wrapperProps = useStackedLayout ? { className: "space-y-8" } : {}

            return (
              <SignalGearWrapper {...wrapperProps}>
                {/* DACs Section */}
                  {wantRecommendationsFor.dac && (
                    <div className="card overflow-hidden border-t-2" style={{ borderTopColor: 'rgb(45 212 191)' }}>
                      {filteredDacs.length > 0 ? (
                        <>
                          <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
                            <h2 className="text-xs font-semibold uppercase text-text-tertiary" style={{ letterSpacing: '0.1em' }}>
                              DACs
                            </h2>
                            <span className="text-xs text-text-tertiary tabular-nums">
                              {filteredDacs.length} results
                              {isDacBudgetConstrained ? ` · ${formatBudgetUSD(remainingForDacs)} remaining` : budgetAllocation.dac && Object.keys(budgetAllocation).length > 1 ? ` · ${formatBudgetUSD(budgetAllocation.dac)} budget` : ''}
                            </span>
                          </div>
                        <div className="p-4 flex flex-col gap-[5px]">
                          {displayDacs.map((dac) => (
                            <SignalGearCard
                              key={dac.id}
                              component={dac}
                              isSelected={selectedDacs.has(dac.id)}
                              onToggleSelection={toggleDacSelection}
                              type="dac"
                              onFindUsed={handleFindUsed}
                              expandAllExperts={expandAllExperts}
                            />
                          ))}

                          {/* Show More Button */}
                          {!showAllDacs && filteredDacs.length > initialLimit && (
                            <button
                              onClick={() => setShowAllDacs(true)}
                              className="mt-2 py-2 px-4 text-sm font-medium text-accent-primary hover:text-accent-secondary transition-colors border border-accent-primary/30 hover:border-accent-primary rounded-lg"
                            >
                              Show {filteredDacs.length - initialLimit} more DACs
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                        <button
                          onClick={() => {
                            const sliderEl = document.querySelector('[data-budget-slider]')
                            sliderEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                          }}
                          className="p-6 text-center hover:bg-surface-secondary/50 transition-colors w-full"
                        >
                          <h3 className="text-sm font-medium text-text-secondary mb-1">No DACs in range</h3>
                          <span className="text-xs text-accent-primary hover:underline">Adjust budget allocation</span>
                        </button>
                    )}
                  </div>
                )}

          {/* Amps Section */}
          {wantRecommendationsFor.amp && (
              <div className="card overflow-hidden border-t-2" style={{ borderTopColor: 'rgb(251 191 36)' }}>
                {filteredAmps.length > 0 ? (
                  <>
                    <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
                      <h2 className="text-xs font-semibold uppercase text-text-tertiary" style={{ letterSpacing: '0.1em' }}>
                        Amplifiers
                      </h2>
                      <span className="text-xs text-text-tertiary tabular-nums">
                        {filteredAmps.length} results
                        {isAmpBudgetConstrained ? ` · ${formatBudgetUSD(remainingForAmps)} remaining` : budgetAllocation.amp && Object.keys(budgetAllocation).length > 1 ? ` · ${formatBudgetUSD(budgetAllocation.amp)} budget` : ''}
                      </span>
                    </div>
                  <div className="p-4 flex flex-col gap-[5px]">
                    {displayAmps.map((amp) => (
                      <SignalGearCard
                        key={amp.id}
                        component={amp}
                        isSelected={selectedAmps.has(amp.id)}
                        onToggleSelection={toggleAmpSelection}
                        type="amp"
                        onFindUsed={handleFindUsed}
                        expandAllExperts={expandAllExperts}
                      />
                    ))}

                    {/* Show More Button */}
                    {!showAllAmps && filteredAmps.length > initialLimit && (
                      <button
                        onClick={() => setShowAllAmps(true)}
                        className="mt-2 py-2 px-4 text-sm font-medium text-accent-primary hover:text-accent-secondary transition-colors border border-accent-primary/30 hover:border-accent-primary rounded-lg"
                      >
                        Show {filteredAmps.length - initialLimit} more amps
                      </button>
                    )}
                  </div>
                </>
              ) : (
                  <button
                    onClick={() => {
                      const sliderEl = document.querySelector('[data-budget-slider]')
                      sliderEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }}
                    className="p-6 text-center hover:bg-surface-secondary/50 transition-colors w-full"
                  >
                    <h3 className="text-sm font-medium text-text-secondary mb-1">No amplifiers in range</h3>
                    <span className="text-xs text-accent-primary hover:underline">Adjust budget allocation</span>
                  </button>
              )}
            </div>
          )}

          {/* Combo Units Section */}
          {wantRecommendationsFor.combo && (
              <div className="card overflow-hidden border-t-2" style={{ borderTopColor: 'rgb(96 165 250)' }}>
                {filteredDacAmps.length > 0 ? (
                  <>
                    <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
                      <h2 className="text-xs font-semibold uppercase text-text-tertiary" style={{ letterSpacing: '0.1em' }}>
                        DAC/Amp Combos
                      </h2>
                      <span className="text-xs text-text-tertiary tabular-nums">
                        {filteredDacAmps.length} results
                        {isComboBudgetConstrained ? ` · ${formatBudgetUSD(remainingForCombos)} remaining` : budgetAllocation.combo && Object.keys(budgetAllocation).length > 1 ? ` · ${formatBudgetUSD(budgetAllocation.combo)} budget` : ''}
                      </span>
                    </div>
                  <div className="p-4 flex flex-col gap-[5px]">
                    {displayDacAmps.map((combo) => (
                      <SignalGearCard
                        key={combo.id}
                        component={combo}
                        isSelected={selectedDacAmps.has(combo.id)}
                        onToggleSelection={toggleDacAmpSelection}
                        type="combo"
                        onFindUsed={handleFindUsed}
                        expandAllExperts={expandAllExperts}
                      />
                    ))}

                    {/* Show More Button */}
                    {!showAllCombos && filteredDacAmps.length > initialLimit && (
                      <button
                        onClick={() => setShowAllCombos(true)}
                        className="mt-2 py-2 px-4 text-sm font-medium text-accent-primary hover:text-accent-secondary transition-colors border border-accent-primary/30 hover:border-accent-primary rounded-lg"
                      >
                        Show {filteredDacAmps.length - initialLimit} more combos
                      </button>
                    )}
                  </div>
                </>
              ) : (
                  <button
                    onClick={() => {
                      const sliderEl = document.querySelector('[data-budget-slider]')
                      sliderEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }}
                    className="p-6 text-center hover:bg-surface-secondary/50 transition-colors w-full"
                  >
                    <h3 className="text-sm font-medium text-text-secondary mb-1">No combos in range</h3>
                    <span className="text-xs text-accent-primary hover:underline">Adjust budget allocation</span>
                  </button>
              )}
            </div>
          )}
              </SignalGearWrapper>
            )
          })()}
              </div>
            </div>
          )
        })()}

        {/* Used Market Toggle */}
        <div className="mt-12 mb-8 text-center">
          <button
            onClick={() => setShowMarketplace(!showMarketplace)}
            className="px-6 py-3 rounded-lg font-semibold text-lg transition-all bg-orange-400 hover:bg-orange-500 active:bg-orange-600 text-white dark:bg-orange-400 dark:hover:bg-orange-500 dark:active:bg-orange-600"
          >
            {showMarketplace ? 'Hide' : 'Show'} Marketplace Listings
          </button>
        </div>

        {/* Used Listings */}
        {showMarketplace && (() => {
          // Filter to only show selected items if any are selected
          const hasSelections = selectedCans.size > 0 || selectedIems.size > 0 ||
                                selectedDacs.size > 0 || selectedAmps.size > 0 || selectedDacAmps.size > 0

          const componentsToShow = hasSelections
            ? [
                ...Array.from(selectedCans.values()),
                ...Array.from(selectedIems.values()),
                ...Array.from(selectedDacs.values()),
                ...Array.from(selectedAmps.values()),
                ...Array.from(selectedDacAmps.values())
              ]
            : [...cans, ...iems, ...dacs, ...amps, ...dacAmps]

          const listingsToDisplay = componentsToShow.map(component => {
            const componentListings = usedListings[component.id] || []
            return { component, listings: componentListings }
          }).filter(item => item.listings.length > 0)

          if (listingsToDisplay.length === 0 && hasSelections) {
            return (
              <div className="mt-12 text-center">
                <div className="card p-8 max-w-2xl mx-auto">
                  <p className="text-lg text-text-secondary">
                    No used market listings found for your selected items yet.
                  </p>
                  <p className="text-sm text-text-tertiary mt-2">
                    Check back later or try selecting different equipment.
                  </p>
                </div>
              </div>
            )
          }

          if (listingsToDisplay.length === 0) {
            return null
          }

          // Filter by focused component if set
          const filteredListings = focusedComponentId
            ? listingsToDisplay.filter(({ component }) => component.id === focusedComponentId)
            : listingsToDisplay

          return (
            <div className="mt-12 space-y-8" data-marketplace-section>
              <div className="text-center mb-6">
                <h2 className="heading-3 mb-2">
                  {focusedComponentId
                    ? 'Used Listings for Selected Item'
                    : hasSelections
                    ? 'Used Listings for Selected Items'
                    : 'Marketplace Listings'}
                </h2>
                {focusedComponentId && (
                  <button
                    onClick={() => setFocusedComponentId(null)}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    ← Show all listings
                  </button>
                )}
              </div>
              {filteredListings.map(({ component, listings }) => (
                <UsedListingsSection
                  key={component.id}
                  component={component}
                  listings={listings}
                />
              ))}
            </div>
          )
        })()}


      </div>

      {/* Preferences Adjustment Modal */}
      {showPreferencesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex justify-between items-center">
                <h2 className="heading-2">Adjust Preferences</h2>
                <button
                  onClick={() => setShowPreferencesModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Budget Adjustment */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Budget: ${userPrefs.budget}
                </label>
                <input
                  type="range"
                  min="20"
                  max="10000"
                  step="10"
                  value={userPrefs.budget}
                  onChange={(e) => updateURL({ budget: parseInt(e.target.value) })}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>$20</span>
                  <span>$10,000</span>
                </div>
              </div>

              {/* Budget Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Budget Flexibility
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {[
                    { label: 'Strict', min: 10, max: 5, desc: '±10% range' },
                    { label: 'Balanced', min: 20, max: 10, desc: '±20% range' },
                    { label: 'Flexible', min: 35, max: 25, desc: '±35% range' }
                  ].map((option) => (
                    <button
                      key={option.label}
                      onClick={() => updateURL({
                        budgetRangeMin: option.min,
                        budgetRangeMax: option.max
                      })}
                      className={`card-interactive text-center py-3 ${
                        userPrefs.budgetRangeMin === option.min && userPrefs.budgetRangeMax === option.max
                          ? 'card-interactive-selected'
                          : ''
                      }`}
                    >
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-gray-500">{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sound Signature */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Sound Signature
                </label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {['any', 'warm', 'neutral', 'bright'].map((sig) => (
                    <button
                      key={sig}
                      onClick={() => updateURL({ soundSignature: sig })}
                      className={`card-interactive text-center py-2 ${
                        userPrefs.soundSignature === sig ? 'card-interactive-selected' : ''
                      }`}
                    >
                      {sig.charAt(0).toUpperCase() + sig.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Component Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Get Recommendations For
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: 'headphones', label: '🎧 Headphones' },
                    { key: 'dac', label: '🎚️ DACs' },
                    { key: 'amp', label: '🔊 Amplifiers' },
                    { key: 'combo', label: '📦 DAC/Amp Combos' }
                  ].map((component) => (
                    <button
                      key={component.key}
                      onClick={() => {
                        const updated = {...userPrefs.wantRecommendationsFor}
                        updated[component.key as keyof typeof updated] = !updated[component.key as keyof typeof updated]
                        updateURL({ wantRecommendationsFor: updated })
                      }}
                      className={`card-interactive text-left py-3 px-4 ${
                        userPrefs.wantRecommendationsFor[component.key as keyof typeof userPrefs.wantRecommendationsFor]
                          ? 'card-interactive-selected'
                          : ''
                      }`}
                    >
                      {component.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-200">
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowPreferencesModal(false)}
                  className="button button-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowPreferencesModal(false)
                    fetchRecommendations()
                  }}
                  className="button button-primary"
                >
                  Get New Recommendations
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stack Builder Modal */}
      <StackBuilderModal
        isOpen={showStackBuilder}
        onClose={() => setShowStackBuilder(false)}
        selectedComponents={{
          headphones: selectedHeadphoneItems,
          dacs: selectedDacItems,
          amps: selectedAmpItems,
          combos: selectedDacAmpItems
        }}
        onRemoveComponent={removeFromSelection}
        onSaveStack={async (stackName, components) => {
          // Save handled inside StackBuilderModal with auth check
          setShowStackBuilder(false)
        }}
      />

      {/* Comparison Bar - Shows when items are selected */}
      {comparisonItems.length > 0 && (
        <ComparisonBar
          items={comparisonItems}
          isExpanded={isComparisonBarExpanded}
          onToggleExpand={() => setIsComparisonBarExpanded(!isComparisonBarExpanded)}
          onViewFullComparison={handleOpenComparisonModal}
          onClearAll={handleClearAllComparisons}
        />
      )}

      {/* Comparison Modal - Full side-by-side comparison */}
      {showComparisonView && (
        <ComparisonModal
          items={comparisonItems}
          onClose={() => setShowComparisonView(false)}
        />
          )}
        </div>
    </>
  )
}

export default function RecommendationsPage() {
  return (
    <Suspense fallback={
      <div className="page-container">
        <div className="text-center mt-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
        </div>
      </div>
    }>
      <RecommendationsContent />
    </Suspense>
  )
}