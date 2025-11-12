'use client'

import React, { Suspense } from 'react'
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Component, UsedListing } from '@/types'
import { UsedListingsSection } from '@/components/UsedListingsSection'
import { BudgetSlider } from '@/components/BudgetSlider'
import { useBudgetState } from '@/hooks/useBudgetState'
import { StackBuilderModal } from '@/components/StackBuilderModal'
import { Tooltip } from '@/components/Tooltip'
import { useGuidedMode } from '@/hooks/useGuidedMode'
import { FILTER_TOOLTIPS } from '@/lib/tooltips'
import { HeadphoneCard } from '@/components/recommendations/HeadphoneCard'
import { SignalGearCard } from '@/components/recommendations/SignalGearCard'
import { SelectedSystemSummary } from '@/components/recommendations/SelectedSystemSummary'
import { FiltersSection } from '@/components/recommendations/FiltersSection'
import { AmplificationWarningBanner } from '@/components/recommendations/AmplificationWarningBanner'
import { BrowseModeSelector, BrowseMode } from '@/components/recommendations/BrowseModeSelector'
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
  // Expert analysis fields
  crinacle_sound_signature?: string
  tone_grade?: string
  technical_grade?: string
  expert_grade_numeric?: number
  crinacle_comments?: string
  driver_type?: string
  fit?: string
  crinacle_rank?: number
  value_rating?: number
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
  const [loading, setLoading] = useState(true)
  const [, setError] = useState<string | null>(null)
  const [, setShowAmplification] = useState(false)

  // Selection state
  const [selectedCans, setSelectedCans] = useState<string[]>([])
  const [selectedIems, setSelectedIems] = useState<string[]>([])
  const [selectedDacs, setSelectedDacs] = useState<string[]>([])
  const [selectedAmps, setSelectedAmps] = useState<string[]>([])
  const [selectedDacAmps, setSelectedDacAmps] = useState<string[]>([])

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

  // Browse mode state - maps to experience level internally
  const [browseMode, setBrowseMode] = useState<BrowseMode>('explore') // Default to explore mode

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

  // User preferences state - make them editable
  const [userPrefs, setUserPrefs] = useState(() => {
    const wantRecsRaw = JSON.parse(searchParams.get('wantRecommendationsFor') || '{"headphones":true,"dac":false,"amp":false,"combo":false}')

    // Fix inconsistent state on initial load
    const headphoneTypesParam = searchParams.get('headphoneTypes')
    let hasHeadphoneTypes = false
    if (headphoneTypesParam) {
      try {
        const types = JSON.parse(headphoneTypesParam)
        hasHeadphoneTypes = Array.isArray(types) && types.length > 0
      } catch {
        hasHeadphoneTypes = false
      }
    }

    if (hasHeadphoneTypes && !wantRecsRaw.headphones) {
      wantRecsRaw.headphones = true
    }

    // Map old experience param to browseMode for backward compatibility
    let browseModeFromUrl = searchParams.get('browseMode') || searchParams.get('experience') || 'explore'
    if (browseModeFromUrl === 'beginner') browseModeFromUrl = 'guided'
    if (browseModeFromUrl === 'intermediate') browseModeFromUrl = 'explore'
    if (browseModeFromUrl === 'enthusiast') browseModeFromUrl = 'advanced'

    return {
      browseMode: browseModeFromUrl as BrowseMode,
      budget: parseInt(searchParams.get('budget') || '250'),
      budgetRangeMin: parseInt(searchParams.get('budgetRangeMin') || '20'),  // Default -20%
      budgetRangeMax: parseInt(searchParams.get('budgetRangeMax') || '10'),  // Default +10%
      headphoneType: searchParams.get('headphoneType') || 'both', // Show both for quick-start
      wantRecommendationsFor: wantRecsRaw,
      existingGear: JSON.parse(searchParams.get('existingGear') || '{"headphones":false,"dac":false,"amp":false,"combo":false,"specificModels":{"headphones":"","dac":"","amp":"","combo":""}}'),
      usage: searchParams.get('usage') || 'music',
      usageRanking: JSON.parse(searchParams.get('usageRanking') || '[]'),
      excludedUsages: JSON.parse(searchParams.get('excludedUsages') || '[]'),
      soundSignature: searchParams.get('soundSignature') || 'any' // Show all for quick-start
    }
  })

  // Debounced values for API calls (prevents excessive fetching)
  const [debouncedBudget, setDebouncedBudget] = useState(userPrefs.budget)
  const [debouncedPrefs, setDebouncedPrefs] = useState(userPrefs)

  // Enhanced budget state management with debouncing and analytics
  const budgetState = useBudgetState({
    initialBudget: userPrefs.budget,
    minBudget: 20,
    maxBudget: 10000,
    budgetRangeMin: userPrefs.budgetRangeMin,
    budgetRangeMax: userPrefs.budgetRangeMax,
    onBudgetChange: (newBudget) => {
      setUserPrefs(prev => ({ ...prev, budget: newBudget }))
    },
    enableAnalytics: true,
    enablePersistence: true
  })

  // Debounce budget changes (1 second delay for budget slider)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedBudget(budgetState.budget)
    }, 1000)

    return () => clearTimeout(timer)
  }, [budgetState.budget])

  // Update debounced prefs immediately for filter changes (no delay)
  // Budget changes are still debounced separately above
  useEffect(() => {
    setDebouncedPrefs(userPrefs)
  }, [userPrefs])
  
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
  
  // Sync state with URL parameters when they change
  useEffect(() => {
    const wantRecsRaw = JSON.parse(searchParams.get('wantRecommendationsFor') || '{"headphones":true,"dac":false,"amp":false,"combo":false}')

    // Fix inconsistent state: if headphoneTypes has values but wantRecommendationsFor.headphones is false, correct it
    const headphoneTypesParam = searchParams.get('headphoneTypes')
    let hasHeadphoneTypes = false
    if (headphoneTypesParam) {
      try {
        const types = JSON.parse(headphoneTypesParam)
        hasHeadphoneTypes = Array.isArray(types) && types.length > 0
      } catch {
        hasHeadphoneTypes = false
      }
    }

    // Reconcile inconsistent state
    if (hasHeadphoneTypes && !wantRecsRaw.headphones) {
      wantRecsRaw.headphones = true
    }

    // Compute headphoneType from URL param or derive from typeFilters default
    const headphoneTypesFromUrl = searchParams.get('headphoneTypes')
    let computedHeadphoneType: 'cans' | 'iems' | 'both' = 'both' // Default to both
    if (headphoneTypesFromUrl) {
      try {
        const types = JSON.parse(headphoneTypesFromUrl)
        if (Array.isArray(types)) {
          computedHeadphoneType = types.length === 2 ? 'both' : types.length === 1 ? types[0] : 'both'
        }
      } catch {
        computedHeadphoneType = 'both'
      }
    }

    // Map old experience param to browseMode for backward compatibility
    let browseModeFromUrl = searchParams.get('browseMode') || searchParams.get('experience') || 'explore'
    if (browseModeFromUrl === 'beginner') browseModeFromUrl = 'guided'
    if (browseModeFromUrl === 'intermediate') browseModeFromUrl = 'explore'
    if (browseModeFromUrl === 'enthusiast') browseModeFromUrl = 'advanced'

    const urlPrefs = {
      browseMode: browseModeFromUrl as BrowseMode,
      budget: parseInt(searchParams.get('budget') || '300'),
      budgetRangeMin: parseInt(searchParams.get('budgetRangeMin') || '20'),  // Default -20%
      budgetRangeMax: parseInt(searchParams.get('budgetRangeMax') || '10'),  // Default +10%
      headphoneType: searchParams.get('headphoneType') || computedHeadphoneType,
      wantRecommendationsFor: wantRecsRaw,
      existingGear: JSON.parse(searchParams.get('existingGear') || '{"headphones":false,"dac":false,"amp":false,"combo":false,"specificModels":{"headphones":"","dac":"","amp":"","combo":""}}'),
      usage: searchParams.get('usage') || 'music',
      usageRanking: JSON.parse(searchParams.get('usageRanking') || '[]'),
      excludedUsages: JSON.parse(searchParams.get('excludedUsages') || '[]'),
      soundSignature: searchParams.get('soundSignature') || searchParams.get('sound') || 'neutral' // Support both new and legacy params
    }
    setUserPrefs(urlPrefs)
  }, [searchParams])

  // Extract values for convenience (using budget from enhanced state)
  const { wantRecommendationsFor, soundSignature } = userPrefs
  // browseMode is managed separately in state (line 111)
  const budget = budgetState.budget // For UI display (immediate updates)
  const budgetForAPI = debouncedBudget // For API calls (debounced)

  // Extract debounced values for API calls
  const {
    browseMode: debouncedBrowseMode,
    budgetRangeMin: debouncedBudgetRangeMin,
    budgetRangeMax: debouncedBudgetRangeMax,
    headphoneType: debouncedHeadphoneType,
    wantRecommendationsFor: debouncedWantRecommendationsFor,
    existingGear: debouncedExistingGear,
    usage: debouncedUsage,
    usageRanking: debouncedUsageRanking,
    excludedUsages: debouncedExcludedUsages,
    soundSignature: debouncedSoundSignature
  } = debouncedPrefs

  // Update URL when preferences change
  const updatePreferences = useCallback((newPrefs: Partial<typeof userPrefs>) => {
    setUserPrefs(prev => ({ ...prev, ...newPrefs }))
  }, [])

  // Sync URL with state changes - separate effect to avoid setState-in-render
  useEffect(() => {
    const params = new URLSearchParams()
    // Note: experience is derived from browseMode, not stored in URL
    params.set('budget', userPrefs.budget.toString())
    params.set('budgetRangeMin', userPrefs.budgetRangeMin.toString())
    params.set('budgetRangeMax', userPrefs.budgetRangeMax.toString())
    params.set('headphoneType', userPrefs.headphoneType)
    params.set('headphoneTypes', JSON.stringify(typeFilters))
    params.set('soundSignatures', JSON.stringify(soundFilters))
    params.set('wantRecommendationsFor', JSON.stringify(userPrefs.wantRecommendationsFor))
    params.set('existingGear', JSON.stringify(userPrefs.existingGear))
    params.set('usage', userPrefs.usage)
    params.set('usageRanking', JSON.stringify(userPrefs.usageRanking))
    params.set('excludedUsages', JSON.stringify(userPrefs.excludedUsages))
    params.set('sound', userPrefs.soundSignature)

    router.push(`/recommendations?${params.toString()}`, { scroll: false })
  }, [userPrefs, typeFilters, soundFilters, router])

  // Handle browse mode changes
  const handleBrowseModeChange = useCallback((newMode: BrowseMode) => {
    setBrowseMode(newMode)
    updatePreferences({ browseMode: newMode })
  }, [updatePreferences])



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

  // ===== MOVED TO API - RECOMMENDATIONS LOGIC NOW SERVER-SIDE =====

  // Main recommendation fetching logic using new API
  const fetchRecommendations = useCallback(async () => {
    console.log('🎯 Fetching recommendations via API for:', debouncedWantRecommendationsFor)

    setLoading(true)
    setError(null)

    try {
      // Build URL parameters for recommendations API using debounced values
      const params = new URLSearchParams({
        browseMode: debouncedBrowseMode,
        budget: budgetForAPI.toString(),
        budgetRangeMin: debouncedBudgetRangeMin.toString(),
        budgetRangeMax: debouncedBudgetRangeMax.toString(),
        headphoneType: debouncedHeadphoneType,
        wantRecommendationsFor: JSON.stringify(debouncedWantRecommendationsFor),
        existingGear: JSON.stringify(debouncedExistingGear),
        usage: debouncedUsage,
        usageRanking: JSON.stringify(debouncedUsageRanking),
        excludedUsages: JSON.stringify(debouncedExcludedUsages),
        soundSignatures: JSON.stringify(soundFilters), // Send selected filters array
        sound: debouncedSoundSignature // Keep legacy param for backward compatibility
      })

      // Add custom budget allocation if in Full Control mode
      if (browseMode === 'advanced' && customBudgetAllocation) {
        params.set('customBudgetAllocation', JSON.stringify(customBudgetAllocation))
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
      
      console.log('✅ Recommendations received:', {
        cans: recommendations.cans?.length || 0,
        iems: recommendations.iems?.length || 0,
        dacs: recommendations.dacs?.length || 0,
        amps: recommendations.amps?.length || 0,
        combos: recommendations.combos?.length || 0,
        needsAmplification: recommendations.needsAmplification,
        budgetAllocation: recommendations.budgetAllocation
      })

      // Debug: Log current state values for troubleshooting
      console.log('🔍 Frontend State Check:', {
        wantRecommendationsFor,
        'wantRecommendationsFor.headphones': wantRecommendationsFor?.headphones,
        'cans.length': recommendations.cans?.length || 0,
        'iems.length': recommendations.iems?.length || 0,
        'separate sections': !!recommendations.cans && !!recommendations.iems
      })

      // Set recommendations - API always returns separate cans and iems arrays
      setCans(recommendations.cans || [])
      setIems(recommendations.iems || [])
      setDacs(recommendations.dacs || [])
      setBudgetAllocation(recommendations.budgetAllocation || {})
      setAmps(recommendations.amps || [])
      setDacAmps(recommendations.combos || [])
      setShowAmplification(recommendations.needsAmplification || false)

      // Debug logging for IEMs
      console.log('✅ Recommendations received:', {
        cans: recommendations.cans?.length || 0,
        iems: recommendations.iems?.length || 0,
        dacs: recommendations.dacs?.length || 0,
        amps: recommendations.amps?.length || 0,
        combos: recommendations.combos?.length || 0,
        needsAmplification: recommendations.needsAmplification,
        budgetAllocation: recommendations.budgetAllocation
      })
      console.log('🔍 IEMs detailed check:', {
        iemsReceived: recommendations.iems,
        iemsCount: recommendations.iems?.length || 0,
        currentSoundFilters: soundFilters,
        currentTypeFilters: typeFilters,
        wantRecommendationsFor: wantRecommendationsFor
      })

      // Initialize custom budget allocation if not already set (first load)
      if (!customBudgetAllocation && recommendations.budgetAllocation) {
        const allocation: BudgetAllocation = {}
        const totalBudget = budgetForAPI

        Object.entries(recommendations.budgetAllocation).forEach(([component, amount]) => {
          if (typeof amount === 'number') {
            allocation[component as keyof BudgetAllocation] = {
              amount,
              percentage: (amount / totalBudget) * 100,
              rangeMin: debouncedBudgetRangeMin,
              rangeMax: debouncedBudgetRangeMax
            }
          }
        })

        setCustomBudgetAllocation(allocation)
      }
      
      // Check if we got any results
      const headphoneResults = (recommendations.cans?.length || 0) +
                               (recommendations.iems?.length || 0)
      const totalResults = headphoneResults +
                          (recommendations.dacs?.length || 0) +
                          (recommendations.amps?.length || 0) +
                          (recommendations.combos?.length || 0)

      console.log('🔍 Frontend results check:', {
        cans: recommendations.cans?.length || 0,
        iems: recommendations.iems?.length || 0,
        dacs: recommendations.dacs?.length || 0,
        amps: recommendations.amps?.length || 0,
        combos: recommendations.combos?.length || 0,
        totalResults,
        wantRecommendationsFor
      })

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
      setLoading(false)
    }
  }, [debouncedBrowseMode, budgetForAPI, debouncedBudgetRangeMin, debouncedBudgetRangeMax, debouncedHeadphoneType, debouncedWantRecommendationsFor, debouncedExistingGear, debouncedUsage, debouncedUsageRanking, debouncedExcludedUsages, soundFilters, browseMode, customBudgetAllocation])

  // Fetch filter counts - use stable strings instead of array references
  const fetchFilterCounts = useCallback(async () => {
    try {
      // Derive active filters inside the callback to avoid dependency issues
      const activeEquipment = typeFilters.filter(Boolean)

      const params = new URLSearchParams({
        budget: budgetForAPI.toString(),
        rangeMin: debouncedBudgetRangeMin.toString(),
        rangeMax: debouncedBudgetRangeMax.toString(),
        // Send current filters so counts reflect intersections
        equipment: activeEquipment.join(','),
        soundSignatures: soundFilters.join(','),
        // Send wantRecommendationsFor for budget allocation
        wantRecommendationsFor: JSON.stringify(debouncedWantRecommendationsFor)
      })

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
  }, [budgetForAPI, debouncedBudgetRangeMin, debouncedBudgetRangeMax, typeFilters, soundFilters, debouncedWantRecommendationsFor])

  // Initial fetch on mount + when fetchRecommendations changes
  useEffect(() => {
    fetchRecommendations()
  }, [fetchRecommendations])

  // Fetch filter counts when budget changes
  useEffect(() => {
    fetchFilterCounts()
  }, [fetchFilterCounts])

  // Also ensure initial fetch happens immediately on mount
  useEffect(() => {
    fetchRecommendations()
    fetchFilterCounts()
  }, []) // Run once on mount

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  // Used listings fetch effect
  const fetchUsedListings = useCallback(async () => {
    if (!showMarketplace) return

    const allComponents = [...cans, ...iems, ...dacs, ...amps, ...dacAmps]
    const componentIds = allComponents.map(c => c.id)
    
    console.log('Fetching used listings for components:', componentIds.length)
    
    if (componentIds.length === 0) return
    
    try {
      const response = await fetch(`/api/used-listings?component_ids=${componentIds.join(',')}&limit=200`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }
      
      const groupedListings: {[componentId: string]: UsedListing[]} = await response.json()
      console.log('Fetched listings for', Object.keys(groupedListings).length, 'components')
      
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

  // Selection toggle functions
  const toggleCansSelection = (id: string) => {
    setSelectedCans(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  const toggleIemsSelection = (id: string) => {
    setSelectedIems(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  const toggleDacSelection = (id: string) => {
    setSelectedDacs(prev =>
      prev.includes(id)
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  const toggleAmpSelection = (id: string) => {
    setSelectedAmps(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  const toggleDacAmpSelection = (id: string) => {
    setSelectedDacAmps(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  // Calculate total for selected items
  const selectedHeadphoneItems = [
    ...cans.filter(h => selectedCans.includes(h.id)),
    ...iems.filter(h => selectedIems.includes(h.id))
  ]
  const selectedDacItems = dacs.filter(d => selectedDacs.includes(d.id))
  const selectedAmpItems = amps.filter(a => selectedAmps.includes(a.id))
  const selectedDacAmpItems = dacAmps.filter(da => selectedDacAmps.includes(da.id))

  const _totalSelectedPrice = [ // Reserved for future budget tracking
    ...selectedHeadphoneItems.map(item => ((item.price_used_min || 0) + (item.price_used_max || 0)) / 2),
    ...selectedDacItems.map(item => ((item.price_used_min || 0) + (item.price_used_max || 0)) / 2),
    ...selectedAmpItems.map(item => ((item.price_used_min || 0) + (item.price_used_max || 0)) / 2),
    ...selectedDacAmpItems.map(item => ((item.price_used_min || 0) + (item.price_used_max || 0)) / 2)
  ].reduce((sum, price) => sum + price, 0)

  // Combine all selected items for comparison view
  const comparisonItems = [
    ...selectedHeadphoneItems,
    ...selectedDacItems,
    ...selectedAmpItems,
    ...selectedDacAmpItems
  ]

  // Handlers for comparison view
  const handleClearAllComparisons = useCallback(() => {
    setSelectedCans([])
    setSelectedIems([])
    setSelectedDacs([])
    setSelectedAmps([])
    setSelectedDacAmps([])
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

  // Determine initial display limit based on browse mode
  const getInitialLimit = () => {
    if (browseMode === 'guided') return 5
    if (browseMode === 'explore') return 8
    return 15 // advanced
  }

  const initialLimit = getInitialLimit()

  // Get display arrays with show more logic
  const getDisplayItems = <T,>(items: T[], showAll: boolean): T[] => {
    if (showAll || items.length <= initialLimit) return items
    return items.slice(0, initialLimit)
  }

  const displayCans = getDisplayItems(cans, showAllCans)
  const displayIems = getDisplayItems(iems, showAllIems)
  const displayDacs = getDisplayItems(dacs, showAllDacs)
  const displayAmps = getDisplayItems(amps, showAllAmps)
  const displayDacAmps = getDisplayItems(dacAmps, showAllCombos)

  // Debug: Log show more button visibility
  console.log('Show More Debug:', {
    initialLimit,
    browseMode,
    cans: { total: cans.length, display: displayCans.length, showButton: !showAllCans && cans.length > initialLimit },
    iems: { total: iems.length, display: displayIems.length, showButton: !showAllIems && iems.length > initialLimit },
    dacs: { total: dacs.length, display: displayDacs.length, showButton: !showAllDacs && dacs.length > initialLimit },
    amps: { total: amps.length, display: displayAmps.length, showButton: !showAllAmps && amps.length > initialLimit },
    combos: { total: dacAmps.length, display: displayDacAmps.length, showButton: !showAllCombos && dacAmps.length > initialLimit }
  })

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

    if (browseMode === 'guided') {
      return totalItems > 0
        ? `We've selected ${totalItems} highly-rated, easy-to-use options in your budget range. These are safe choices that work great out of the box.`
        : "We're finding the best highly-rated, easy-to-use options for your budget."
    } else if (browseMode === 'explore') {
      return totalItems > 0
        ? `Here are ${totalItems} excellent options that balance performance and value. Each offers something different - consider your priorities.`
        : "Finding excellent options that balance performance and value for your setup."
    } else {
      return "A curated selection of high-performance components. Consider synergies between components and your specific sonic preferences."
    }
  }

  // Show technical specs for explore/advanced users
  const shouldShowTechnicalSpecs = () => {
    return browseMode === 'explore' || browseMode === 'advanced'
  }

  // Amplification detection for guided/explore users
  const getAmplificationNeeds = () => {
    // Only show for guided and explore modes
    if (browseMode === 'advanced') return null

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
    updatePreferences({
      headphoneType: newType,
      ...(wasWantingHeadphones !== nowWantingHeadphones ? {
        wantRecommendationsFor: {
          ...wantRecommendationsFor,
          headphones: nowWantingHeadphones
        }
      } : {})
    })
  }, [typeFilters, wantRecommendationsFor, updatePreferences])

  const handleEquipmentToggle = useCallback((type: 'dac' | 'amp' | 'combo') => {
    updatePreferences({
      wantRecommendationsFor: {
        ...wantRecommendationsFor,
        [type]: !wantRecommendationsFor[type]
      }
    })
  }, [wantRecommendationsFor, updatePreferences])

  const handleSoundFilterChange = useCallback((filter: 'neutral' | 'warm' | 'bright' | 'fun') => {
    // Multi-select behavior with toggle (checkbox-style)
    setSoundFilters(prev => {
      const newFilters = prev.includes(filter)
        ? prev.filter(f => f !== filter)
        : [...prev, filter]

      // Ensure at least one filter is always selected
      return newFilters.length === 0 ? [filter] : newFilters
    })
    // Update preferences with first selected filter for backward compatibility
    updatePreferences({ soundSignature: filter })
  }, [updatePreferences])

  const handleAddAmplification = useCallback(() => {
    updatePreferences({
      wantRecommendationsFor: {
        ...wantRecommendationsFor,
        amp: true,
        combo: true
      }
    })
  }, [wantRecommendationsFor, updatePreferences])

  // Handle custom budget allocation changes
  const handleBudgetAllocationChange = useCallback((allocation: BudgetAllocation) => {
    setCustomBudgetAllocation(allocation)
  }, [])

  // Handle "Find Used" button click
  const handleFindUsed = useCallback((componentId: string, _componentName: string) => {
    // Open used market section
    setShowMarketplace(true)
    // Set focused component to filter listings
    setFocusedComponentId(componentId)
  }, [])

  // Scroll to used market section after it renders
  useEffect(() => {
    if (showMarketplace && focusedComponentId) {
      // Use requestAnimationFrame to ensure DOM has updated
      requestAnimationFrame(() => {
        const usedMarketSection = document.querySelector('[data-marketplace-section]')
        if (usedMarketSection) {
          usedMarketSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
        }
      })
    }
  }, [showMarketplace, focusedComponentId])

  // Show initial loading screen only on first mount
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false)

  useEffect(() => {
    if (!loading && !hasLoadedOnce) {
      setHasLoadedOnce(true)
    }
  }, [loading, hasLoadedOnce])

  if (loading && !hasLoadedOnce) {
    return (
      <div className="page-container">
        <div className="text-center mt-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mb-4 mx-auto"></div>
          <p className="text-secondary">Building your personalized recommendations...</p>
        </div>
      </div>
    )
  }


  return (
    <div className="page-container">
      <div className="max-w-none mx-auto px-4 sm:px-6 lg:px-8" style={{ width: '95%', maxWidth: '1400px' }}>
        <div className="text-center mb-8">
          <h1 className="heading-1 mb-4">
            {getTitle()}
          </h1>
          <p className="text-lg text-secondary max-w-3xl mx-auto">
            {getDescription()}
          </p>
        </div>

        {/* Welcome Banner for First-Time Users */}
        {showWelcome && guidedModeLoaded && (
          <WelcomeBanner
            onDismiss={dismissWelcome}
            onEnableGuidedMode={enableGuidedMode}
          />
        )}

        {/* Browse Mode Selector with Tooltip Toggle */}
        <BrowseModeSelector
          currentMode={browseMode}
          onModeChange={handleBrowseModeChange}
          tooltipsEnabled={guidedModeEnabled}
          onTooltipToggle={toggleGuidedMode}
        />

        {/* Enhanced Budget Control */}
        <Tooltip
          content={guidedModeEnabled ? FILTER_TOOLTIPS.budget : ''}
          position="bottom"
          className="w-full"
        >
          <div className="card p-4" style={{ marginBottom: '24px', width: '100%' }} data-budget-slider>
            <BudgetSlider
              budget={budgetState.budget}
              displayBudget={budgetState.displayBudget}
              onChange={budgetState.handleBudgetChange}
              onChangeComplete={budgetState.handleBudgetChangeComplete}
              isUpdating={budgetState.isUpdating}
              variant="simple"
              userExperience={browseMode === 'guided' ? 'beginner' : browseMode === 'explore' ? 'intermediate' : 'enthusiast'}
              showInput={true}
              showLabels={true}
              showItemCount={true}
              itemCount={cans.length + iems.length + dacs.length + amps.length + dacAmps.length}
              minBudget={20}
              maxBudget={10000}
              budgetRangeMin={userPrefs.budgetRangeMin}
              budgetRangeMax={userPrefs.budgetRangeMax}
              className="w-full" // Ensure this is set
            />
          </div>
        </Tooltip>

        {/* Budget Allocation Controls - only in Full Control mode */}
        {browseMode === 'advanced' && customBudgetAllocation && (
          <div data-budget-allocation>
            <BudgetAllocationControls
              totalBudget={budgetState.budget}
              allocation={customBudgetAllocation}
              onChange={handleBudgetAllocationChange}
              globalRangeMin={userPrefs.budgetRangeMin}
              globalRangeMax={userPrefs.budgetRangeMax}
              wantRecommendationsFor={wantRecommendationsFor}
            />
          </div>
        )}

       {/* Compact Filters */}
        <FiltersSection
          typeFilters={typeFilters}
          soundFilters={soundFilters}
          wantRecommendationsFor={wantRecommendationsFor}
          guidedModeEnabled={guidedModeEnabled}
          browseMode={browseMode}
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
        />

        {/* Amplification Warning Banner for Beginners/Intermediates */}
        {amplificationNeeds?.shouldShowWarning && (
          <AmplificationWarningBanner
            selectedNeedAmp={amplificationNeeds.selectedNeedAmp}
            onAddAmplification={handleAddAmplification}
          />
        )}

        {/* System Overview */}
        <SelectedSystemSummary
          selectedHeadphones={selectedHeadphoneItems}
          selectedDacs={selectedDacItems}
          selectedAmps={selectedAmpItems}
          selectedCombos={selectedDacAmpItems}
          budget={budget}
          onBuildStack={() => setShowStackBuilder(true)}
          onClearAll={() => {
            setSelectedCans([])
            setSelectedIems([])
            setSelectedDacs([])
            setSelectedAmps([])
            setSelectedDacAmps([])
          }}
        />

        {/* Dynamic grid based on number of component types */}
        {(() => {
          // Check for separate cans/iems or combined headphones
          // Always show separate sections for cans and iems
          const hasCans = wantRecommendationsFor.headphones && cans.length > 0
          const hasIems = wantRecommendationsFor.headphones && iems.length > 0
          const hasDacs = wantRecommendationsFor.dac && dacs.length > 0
          const hasAmps = wantRecommendationsFor.amp && amps.length > 0
          const hasCombos = wantRecommendationsFor.combo && dacAmps.length > 0
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
                className={`${gridClass} transition-opacity duration-300 ${loading && hasLoadedOnce ? 'opacity-60' : 'opacity-100'}`}
              >
              {/* Separate Headphones (Cans) Section */}
              {hasCans && (() => {
                // Identify top performers for cans
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

                return (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b dark:border-purple-700/30 bg-gradient-to-b from-purple-300 to-purple-200 dark:from-purple-400/80 dark:to-purple-300/80 rounded-t-xl">
                <h2 className="text-lg font-semibold text-center text-white">
                  🎧 Headphones
                </h2>
                <div className="text-center mt-0.5">
                  <span className="text-xs text-white">
                    {cans.length} options
                    {budgetAllocation.headphones && Object.keys(budgetAllocation).length > 1 && (
                      <> • Budget: {formatBudgetUSD(budgetAllocation.headphones)}</>
                    )}
                  </span>
                </div>
              </div>
              <div className="p-4 flex flex-col gap-[5px]">
                {displayCans.map((headphone) => {
                  const isTechnicalChamp = headphone.id === topTechnical.id && (topTechnical.expert_grade_numeric || 0) >= 3.3
                  const isToneChamp = headphone.id === topTone.id && (topTone.matchScore || 0) >= 85
                  const isBudgetChamp = headphone.id === topBudget.id && (topBudget.value_rating || 0) >= 4

                  return (
                    <HeadphoneCard
                      key={headphone.id}
                      headphone={headphone}
                      isSelected={selectedCans.includes(headphone.id)}
                      onToggleSelection={toggleCansSelection}
                      isTechnicalChamp={isTechnicalChamp}
                      isToneChamp={isToneChamp}
                      isBudgetChamp={isBudgetChamp}
                      onFindUsed={handleFindUsed}
                      browseMode={browseMode}
                    />
                  )
                })}

                {/* Show More Button */}
                {!showAllCans && cans.length > initialLimit && (
                  <button
                    onClick={() => setShowAllCans(true)}
                    className="mt-2 py-2 px-4 text-sm font-medium text-accent-primary hover:text-accent-secondary transition-colors border border-accent-primary/30 hover:border-accent-primary rounded-lg"
                  >
                    Show {cans.length - initialLimit} more headphones
                  </button>
                )}
              </div>
            </div>
                )
          })()}

              {/* Separate IEMs Section */}
              {hasIems && (() => {
                // Identify top performers for iems
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

                return (
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b dark:border-indigo-700/30 bg-gradient-to-b from-indigo-300 to-indigo-200 dark:from-indigo-400/80 dark:to-indigo-300/80 rounded-t-xl">
                <h2 className="text-lg font-semibold text-center text-white">
                  👂 IEMs
                </h2>
                <div className="text-center mt-0.5">
                  <span className="text-xs text-white">
                    {iems.length} options
                    {budgetAllocation.headphones && Object.keys(budgetAllocation).length > 1 && (
                      <> • Budget: {formatBudgetUSD(budgetAllocation.headphones)}</>
                    )}
                  </span>
                </div>
              </div>
              <div className="p-4 flex flex-col gap-[5px]">
                {displayIems.map((headphone) => {
                  const isTechnicalChamp = headphone.id === topTechnical.id && (topTechnical.expert_grade_numeric || 0) >= 3.3
                  const isToneChamp = headphone.id === topTone.id && (topTone.matchScore || 0) >= 85
                  const isBudgetChamp = headphone.id === topBudget.id && (topBudget.value_rating || 0) >= 4

                  return (
                    <HeadphoneCard
                      key={headphone.id}
                      headphone={headphone}
                      isSelected={selectedIems.includes(headphone.id)}
                      onToggleSelection={toggleIemsSelection}
                      isTechnicalChamp={isTechnicalChamp}
                      isToneChamp={isToneChamp}
                      isBudgetChamp={isBudgetChamp}
                      onFindUsed={handleFindUsed}
                      browseMode={browseMode}
                    />
                  )
                })}

                {/* Show More Button */}
                {!showAllIems && iems.length > initialLimit && (
                  <button
                    onClick={() => setShowAllIems(true)}
                    className="mt-2 py-2 px-4 text-sm font-medium text-accent-primary hover:text-accent-secondary transition-colors border border-accent-primary/30 hover:border-accent-primary rounded-lg"
                  >
                    Show {iems.length - initialLimit} more IEMs
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
                  <div className="card overflow-hidden">
                    {dacs.length > 0 ? (
                      <>
                        <div className="px-4 py-3 border-b dark:border-emerald-700/30 bg-gradient-to-b from-emerald-300 to-emerald-200 dark:from-emerald-400/80 dark:to-emerald-300/80 rounded-t-xl">
                          <h2 className="text-lg font-semibold text-center text-white">
                            🔄 DACs
                          </h2>
                          <div className="text-center mt-0.5">
                            <span className="text-xs text-white">
                              {dacs.length} options
                              {budgetAllocation.dac && Object.keys(budgetAllocation).length > 1 && (
                                <> • Budget: {formatBudgetUSD(budgetAllocation.dac)}</>
                              )}
                            </span>
                          </div>
                        </div>
                        <div className="p-4 flex flex-col gap-[5px]">
                          {displayDacs.map((dac) => (
                            <SignalGearCard
                              key={dac.id}
                              component={dac}
                              isSelected={selectedDacs.includes(dac.id)}
                              onToggleSelection={toggleDacSelection}
                              type="dac"
                              onFindUsed={handleFindUsed}
                              browseMode={browseMode}
                            />
                          ))}

                          {/* Show More Button */}
                          {!showAllDacs && dacs.length > initialLimit && (
                            <button
                              onClick={() => setShowAllDacs(true)}
                              className="mt-2 py-2 px-4 text-sm font-medium text-accent-primary hover:text-accent-secondary transition-colors border border-accent-primary/30 hover:border-accent-primary rounded-lg"
                            >
                              Show {dacs.length - initialLimit} more DACs
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
                        <div className="text-4xl mb-3">🔄</div>
                        <h3 className="text-lg font-semibold text-text-primary mb-2">No DACs Found</h3>
                        <p className="text-sm text-text-secondary mb-2">
                          No matching DAC results within the allocated budget range.
                          {budgetAllocation.dac === 0 && (
                            <span className="block mt-1 text-text-tertiary">
                              (Budget was reallocated because no DACs were available in this price range)
                            </span>
                          )}
                        </p>
                        <span className="text-sm text-accent-primary hover:underline font-medium">
                          → Click to adjust budget allocation
                        </span>
                      </button>
                    )}
                  </div>
                )}

          {/* Amps Section */}
          {wantRecommendationsFor.amp && (
            <div className="card overflow-hidden">
              {amps.length > 0 ? (
                <>
                  <div className="px-4 py-3 border-b dark:border-amber-700/30 bg-gradient-to-b from-amber-300 to-amber-200 dark:from-amber-400/80 dark:to-amber-300/80 rounded-t-xl">
                    <h2 className="text-lg font-semibold text-center text-white">
                      ⚡ Amplifiers
                    </h2>
                    <div className="text-center mt-0.5">
                      <span className="text-xs text-white">
                        {amps.length} options
                        {budgetAllocation.amp && Object.keys(budgetAllocation).length > 1 && (
                          <> • Budget: {formatBudgetUSD(budgetAllocation.amp)}</>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 flex flex-col gap-[5px]">
                    {displayAmps.map((amp) => (
                      <SignalGearCard
                        key={amp.id}
                        component={amp}
                        isSelected={selectedAmps.includes(amp.id)}
                        onToggleSelection={toggleAmpSelection}
                        type="amp"
                        onFindUsed={handleFindUsed}
                        browseMode={browseMode}
                      />
                    ))}

                    {/* Show More Button */}
                    {!showAllAmps && amps.length > initialLimit && (
                      <button
                        onClick={() => setShowAllAmps(true)}
                        className="mt-2 py-2 px-4 text-sm font-medium text-accent-primary hover:text-accent-secondary transition-colors border border-accent-primary/30 hover:border-accent-primary rounded-lg"
                      >
                        Show {amps.length - initialLimit} more amps
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
                  <div className="text-4xl mb-3">⚡</div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">No Amplifiers Found</h3>
                  <p className="text-sm text-text-secondary mb-2">
                    No matching amplifier results within the allocated budget range.
                    {budgetAllocation.amp === 0 && (
                      <span className="block mt-1 text-text-tertiary">
                        (Budget was reallocated because no amplifiers were available in this price range)
                      </span>
                    )}
                  </p>
                  <span className="text-sm text-accent-primary hover:underline font-medium">
                    → Click to adjust budget allocation
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Combo Units Section */}
          {wantRecommendationsFor.combo && (
            <div className="card overflow-hidden">
              {dacAmps.length > 0 ? (
                <>
                  <div className="px-4 py-3 border-b dark:border-blue-700/30 bg-gradient-to-b from-blue-300 to-blue-200 dark:from-blue-400/80 dark:to-blue-300/80 rounded-t-xl">
                    <h2 className="text-lg font-semibold text-center text-white">
                      🎯 DAC/Amp Combos
                    </h2>
                    <div className="text-center mt-0.5">
                      <span className="text-xs text-white">
                        {dacAmps.length} options
                        {budgetAllocation.combo && Object.keys(budgetAllocation).length > 1 && (
                          <> • Budget: {formatBudgetUSD(budgetAllocation.combo)}</>
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 flex flex-col gap-[5px]">
                    {displayDacAmps.map((combo) => (
                      <SignalGearCard
                        key={combo.id}
                        component={combo}
                        isSelected={selectedDacAmps.includes(combo.id)}
                        onToggleSelection={toggleDacAmpSelection}
                        type="combo"
                        onFindUsed={handleFindUsed}
                        browseMode={browseMode}
                      />
                    ))}

                    {/* Show More Button */}
                    {!showAllCombos && dacAmps.length > initialLimit && (
                      <button
                        onClick={() => setShowAllCombos(true)}
                        className="mt-2 py-2 px-4 text-sm font-medium text-accent-primary hover:text-accent-secondary transition-colors border border-accent-primary/30 hover:border-accent-primary rounded-lg"
                      >
                        Show {dacAmps.length - initialLimit} more combos
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
                  <div className="text-4xl mb-3">🎯</div>
                  <h3 className="text-lg font-semibold text-text-primary mb-2">No DAC/Amp Combos Found</h3>
                  <p className="text-sm text-text-secondary mb-2">
                    No matching DAC/amp combo results within the allocated budget range.
                    {budgetAllocation.combo === 0 && (
                      <span className="block mt-1 text-text-tertiary">
                        (Budget was reallocated because no combos were available in this price range)
                      </span>
                    )}
                  </p>
                  <span className="text-sm text-accent-primary hover:underline font-medium">
                    → Click to adjust budget allocation
                  </span>
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
            onClick={() => {
              console.log('Toggling used market:', !showMarketplace)
              setShowMarketplace(!showMarketplace)
            }}
            className="px-6 py-3 rounded-lg font-semibold text-lg transition-all bg-orange-400 hover:bg-orange-500 active:bg-orange-600 text-white dark:bg-orange-400 dark:hover:bg-orange-500 dark:active:bg-orange-600"
          >
            {showMarketplace ? 'Hide' : 'Show'} Marketplace Listings
          </button>
        </div>

        {/* Used Listings */}
        {showMarketplace && (() => {
          // Filter to only show selected items if any are selected
          const hasSelections = selectedCans.length > 0 || selectedIems.length > 0 ||
                                selectedDacs.length > 0 || selectedAmps.length > 0 || selectedDacAmps.length > 0

          const componentsToShow = hasSelections
            ? [
                ...cans.filter(h => selectedCans.includes(h.id)),
                ...iems.filter(h => selectedIems.includes(h.id)),
                ...dacs.filter(d => selectedDacs.includes(d.id)),
                ...amps.filter(a => selectedAmps.includes(a.id)),
                ...dacAmps.filter(da => selectedDacAmps.includes(da.id))
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
                  onChange={(e) => setUserPrefs({...userPrefs, budget: parseInt(e.target.value)})}
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
                      onClick={() => setUserPrefs({
                        ...userPrefs,
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
                      onClick={() => setUserPrefs({...userPrefs, soundSignature: sig})}
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
                        setUserPrefs({...userPrefs, wantRecommendationsFor: updated})
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
        onSaveStack={async (stackName, components) => {
          // TODO: Implement actual stack saving
          console.log('Saving stack:', stackName, components)
          // For now, just close the modal
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