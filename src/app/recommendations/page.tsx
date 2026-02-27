'use client'

import React, { Suspense } from 'react'
import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { Component, UsedListing } from '@/types'
import { BudgetSlider } from '@/components/BudgetSlider'
import { useDebounce } from '@/hooks/useDebounce'
import { Tooltip } from '@/components/Tooltip'
import { useGuidedMode } from '@/hooks/useGuidedMode'
import { FILTER_TOOLTIPS } from '@/lib/tooltips'
import { HeadphoneCard } from '@/components/recommendations/HeadphoneCard'
import { SignalGearCard } from '@/components/recommendations/SignalGearCard'
import { SelectedSystemSummary } from '@/components/recommendations/SelectedSystemSummary'
import { FiltersSection } from '@/components/recommendations/FiltersSection'
import { AmplificationWarningBanner } from '@/components/recommendations/AmplificationWarningBanner'
import { BudgetAllocationControls, BudgetAllocation } from '@/components/BudgetAllocationControls'
import { X } from 'lucide-react'
import { BatchPriceHistoryProvider } from '@/components/BatchPriceHistoryProvider'

// Lazy load components only shown on user interaction for better code splitting
const WelcomeBanner = dynamic(() => import('@/components/WelcomeBanner').then(mod => ({ default: mod.WelcomeBanner })), {
  ssr: false
})
const StackBuilderModal = dynamic(() => import('@/components/StackBuilderModal').then(mod => ({ default: mod.StackBuilderModal })), {
  ssr: false
})
const ComparisonBar = dynamic(() => import('@/components/ComparisonBar').then(mod => ({ default: mod.ComparisonBar })), {
  ssr: false
})
const ComparisonModal = dynamic(() => import('@/components/ComparisonModal').then(mod => ({ default: mod.ComparisonModal })), {
  ssr: false
})
const UsedListingsSection = dynamic(() => import('@/components/UsedListingsSection').then(mod => ({ default: mod.UsedListingsSection })), {
  ssr: false
})
const OwnedGearModal = dynamic(() => import('@/components/recommendations/OwnedGearModal').then(mod => ({ default: mod.OwnedGearModal })), {
  ssr: false
})
const ComponentDetailModal = dynamic(() => import('@/components/ComponentDetailModal').then(mod => ({ default: mod.ComponentDetailModal })), {
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
    isFirstVisit,
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

  // Owned gear state — gear the user already has (excluded from budget)
  const [ownedGear, setOwnedGear] = useState<Map<string, AudioComponent>>(new Map())
  const [showOwnedGearModal, setShowOwnedGearModal] = useState(false)

  // Preferences modal state
  const [showPreferencesModal, setShowPreferencesModal] = useState(false)

  // Component detail modal state
  const [detailComponent, setDetailComponent] = useState<AudioComponent | null>(null)

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

  // First-card interaction hint: tracks whether user has ever selected any card
  const [hasEverSelected, setHasEverSelected] = useState(() => {
    if (typeof window === 'undefined') return true // SSR safe — assume returning user
    return localStorage.getItem('hifinder_has_selected') === 'true'
  })

  const router = useRouter()
  const searchParams = useSearchParams()

  // Budget-focused flow detection (simplified preferences)
  const isBudgetFocused = searchParams.get('source') === 'quick-start' || (
    (searchParams.get('b') || searchParams.get('budget')) &&
    !searchParams.get('experience') &&
    !searchParams.get('type') && !searchParams.get('headphoneType')
  )

  // SIMPLIFIED STATE MANAGEMENT - Single source of truth pattern

  // Default values — used for parsing and for stripping defaults from URL
  const PREF_DEFAULTS = useMemo(() => ({
    budget: 250,
    budgetRangeMin: 20,
    budgetRangeMax: 10,
    headphoneType: 'both',
    wantRecommendationsFor: { headphones: true, dac: false, amp: false, combo: false },
    existingGear: { headphones: false, dac: false, amp: false, combo: false, specificModels: { headphones: '', dac: '', amp: '', combo: '' } },
    usage: 'music',
    usageRanking: [] as string[],
    excludedUsages: [] as string[],
    soundSignature: 'any'
  }), [])

  // Helper: read a param with short name fallback to legacy long name
  const getParam = useCallback((short: string, long: string) => {
    return searchParams.get(short) ?? searchParams.get(long)
  }, [searchParams])

  // Parse URL parameters - recompute when URL changes
  // Supports compact params (b, type, want, gear, use, ranked, exclude) with legacy fallback
  const initialPrefs = useMemo(() => {
    // Parse wantRecommendationsFor: compact "want=headphones,combo" or legacy JSON
    let wantRecsRaw = PREF_DEFAULTS.wantRecommendationsFor
    const wantCompact = searchParams.get('want')
    const wantLegacy = searchParams.get('wantRecommendationsFor')
    if (wantCompact) {
      const keys = wantCompact.split(',')
      wantRecsRaw = { headphones: keys.includes('headphones'), dac: keys.includes('dac'), amp: keys.includes('amp'), combo: keys.includes('combo') }
    } else if (wantLegacy) {
      try { wantRecsRaw = JSON.parse(wantLegacy) } catch { /* use default */ }
    }

    // Parse existingGear: compact "gear=headphones,dac" + "gearModels=headphones:HD650" or legacy JSON
    let existingGearRaw = PREF_DEFAULTS.existingGear
    const gearCompact = searchParams.get('gear')
    const gearLegacy = searchParams.get('existingGear')
    if (gearCompact) {
      const keys = gearCompact.split(',')
      const models = { headphones: '', dac: '', amp: '', combo: '' }
      const gearModelsParam = searchParams.get('gearModels')
      if (gearModelsParam) {
        gearModelsParam.split(',').forEach(entry => {
          const [k, v] = entry.split(':')
          if (k && v && k in models) models[k as keyof typeof models] = v
        })
      }
      existingGearRaw = {
        headphones: keys.includes('headphones'), dac: keys.includes('dac'),
        amp: keys.includes('amp'), combo: keys.includes('combo'),
        specificModels: models
      }
    } else if (gearLegacy) {
      try { existingGearRaw = JSON.parse(gearLegacy) } catch { /* use default */ }
    }

    // Parse arrays: compact comma-separated or legacy JSON
    const parseArray = (short: string, long: string): string[] => {
      const compact = searchParams.get(short)
      if (compact) return compact.split(',').filter(Boolean)
      const legacy = searchParams.get(long)
      if (legacy) { try { return JSON.parse(legacy) } catch { return [] } }
      return []
    }

    return {
      budget: parseInt(getParam('b', 'budget') || String(PREF_DEFAULTS.budget)),
      budgetRangeMin: parseInt(searchParams.get('budgetRangeMin') || String(PREF_DEFAULTS.budgetRangeMin)),
      budgetRangeMax: parseInt(searchParams.get('budgetRangeMax') || String(PREF_DEFAULTS.budgetRangeMax)),
      headphoneType: getParam('type', 'headphoneType') || PREF_DEFAULTS.headphoneType,
      wantRecommendationsFor: wantRecsRaw,
      existingGear: existingGearRaw,
      usage: getParam('use', 'usage') || PREF_DEFAULTS.usage,
      usageRanking: parseArray('ranked', 'usageRanking'),
      excludedUsages: parseArray('exclude', 'excludedUsages'),
      soundSignature: searchParams.get('soundSignature') || PREF_DEFAULTS.soundSignature
    }
  }, [searchParams, PREF_DEFAULTS, getParam]) // Re-parse when URL changes

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
        return ['cans', 'iems']
      }
    }
    // Support compact 'type' and legacy 'headphoneType' params
    const typeParam = searchParams.get('type') || searchParams.get('headphoneType')
    if (typeParam === 'cans') return ['cans']
    if (typeParam === 'iems') return ['iems']
    return ['cans', 'iems']
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
  // Uses compact param names and comma-separated lists to keep URLs short
  const updateURL = useCallback((updates: Partial<typeof userPrefs>) => {
    const merged = { ...userPrefs, ...updates }
    const params = new URLSearchParams()

    // Simple values — omit if default
    if (merged.budget !== PREF_DEFAULTS.budget) params.set('b', merged.budget.toString())
    if (merged.budgetRangeMin !== PREF_DEFAULTS.budgetRangeMin) params.set('budgetRangeMin', merged.budgetRangeMin.toString())
    if (merged.budgetRangeMax !== PREF_DEFAULTS.budgetRangeMax) params.set('budgetRangeMax', merged.budgetRangeMax.toString())
    if (merged.headphoneType !== PREF_DEFAULTS.headphoneType) params.set('type', merged.headphoneType)
    if (merged.usage !== PREF_DEFAULTS.usage) params.set('use', merged.usage)

    // wantRecommendationsFor → comma-separated truthy keys
    const wantKeys = Object.entries(merged.wantRecommendationsFor).filter(([, v]) => v).map(([k]) => k)
    const defaultWantKeys = Object.entries(PREF_DEFAULTS.wantRecommendationsFor).filter(([, v]) => v).map(([k]) => k)
    if (JSON.stringify(wantKeys) !== JSON.stringify(defaultWantKeys)) params.set('want', wantKeys.join(','))

    // existingGear → comma-separated truthy keys + gearModels for specific models
    const gearKeys = ['headphones', 'dac', 'amp', 'combo'].filter(k => merged.existingGear[k as keyof typeof merged.existingGear])
    if (gearKeys.length > 0) params.set('gear', gearKeys.join(','))
    const models = merged.existingGear.specificModels || { headphones: '', dac: '', amp: '', combo: '' }
    const modelEntries = Object.entries(models).filter(([, v]) => v).map(([k, v]) => `${k}:${v}`)
    if (modelEntries.length > 0) params.set('gearModels', modelEntries.join(','))

    // Arrays → comma-separated
    if (merged.usageRanking.length > 0) params.set('ranked', merged.usageRanking.join(','))
    if (merged.excludedUsages.length > 0) params.set('exclude', merged.excludedUsages.join(','))

    // Preserve non-pref params (source, headphoneTypes, soundSignatures)
    const preserve = ['source', 'headphoneTypes', 'soundSignatures']
    preserve.forEach(key => {
      const val = searchParams.get(key)
      if (val) params.set(key, val)
    })

    const qs = params.toString()
    router.push(qs ? `/recommendations?${qs}` : '/recommendations', { scroll: false })
  }, [router, searchParams, userPrefs, PREF_DEFAULTS])

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

      // Save search for dashboard "Recent Searches" (only on non-background fetches with results)
      if (!background && totalResults > 0) {
        try {
          const { saveSearch } = await import('@/lib/saved-searches')
          const typeLabel = typeFilters.join(' + ')
          const soundLabel = soundFilters.join(', ')
          const filters = `${typeLabel} · ${soundLabel} · ${totalResults} results`
          saveSearch(window.location.href, debouncedBudget, filters)
        } catch {}
      }

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
    userPrefs.budget, // Need for selectedItems budget shift calculation
    wantRecommendationsForKey // Triggers refetch when equipment toggles change (dac/amp/combo)
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

  // Scroll to top on mount + mark recommendations as visited for onboarding
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
    try { localStorage.setItem('hifinder_visited_recommendations', 'true') } catch {}
  }, [])

  // Track first-ever card selection for interaction hint
  useEffect(() => {
    if (hasEverSelected) return
    const totalSelected = selectedCans.size + selectedIems.size + selectedDacs.size + selectedAmps.size + selectedDacAmps.size
    if (totalSelected > 0) {
      setHasEverSelected(true)
      try { localStorage.setItem('hifinder_has_selected', 'true') } catch {}
    }
  }, [hasEverSelected, selectedCans, selectedIems, selectedDacs, selectedAmps, selectedDacAmps])

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

  // Owned gear handlers
  const addOwnedGear = useCallback((component: AudioComponent) => {
    setOwnedGear(prev => {
      const next = new Map(prev)
      next.set(component.id, component)
      return next
    })
  }, [])

  const removeOwnedGear = useCallback((id: string) => {
    setOwnedGear(prev => {
      const next = new Map(prev)
      next.delete(id)
      return next
    })
  }, [])

  // Derive owned items by category
  const ownedItems = useMemo(() => Array.from(ownedGear.values()), [ownedGear])
  const ownedIds = useMemo(() => new Set(ownedGear.keys()), [ownedGear])
  const ownedHeadphones = useMemo(() => ownedItems.filter(i => i.category === 'cans' || i.category === 'iems'), [ownedItems])
  const ownedDacs = useMemo(() => ownedItems.filter(i => i.category === 'dac'), [ownedItems])
  const ownedAmps = useMemo(() => ownedItems.filter(i => i.category === 'amp'), [ownedItems])
  const ownedCombos = useMemo(() => ownedItems.filter(i => i.category === 'dac_amp'), [ownedItems])

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

  // Memoize remaining budget info (used for display in SelectedSystemSummary)
  const hasAnySelections = useMemo(() => totalSelectedPrice > 0 || ownedItems.length > 0, [totalSelectedPrice, ownedItems])

  // A stack is "complete" when headphones are paired with signal processing
  // Includes both selected recommendations AND owned gear
  const isStackComplete = useMemo(() => {
    const hasHeadphones = selectedHeadphoneItems.length > 0 || ownedHeadphones.length > 0
    const hasCombo = selectedDacAmpItems.length > 0 || ownedCombos.length > 0
    const hasDac = selectedDacItems.length > 0 || ownedDacs.length > 0
    const hasAmp = selectedAmpItems.length > 0 || ownedAmps.length > 0
    // Headphones + combo = complete (combo provides both DAC and amp)
    // Headphones + DAC + amp = complete (separate components)
    return hasHeadphones && (hasCombo || (hasDac && hasAmp))
  }, [selectedHeadphoneItems, selectedDacAmpItems, selectedDacItems, selectedAmpItems, ownedHeadphones, ownedCombos, ownedDacs, ownedAmps])

  // API handles intelligent budget reallocation — no client-side filtering needed
  const filteredCans = cans
  const filteredIems = iems
  const filteredDacs = dacs
  const filteredAmps = amps
  const filteredDacAmps = dacAmps

  // Update selectedItemsForApi when selections change — triggers API re-fetch with smart budget reallocation
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
    setSelectedItemsForApi(items)
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

  // Amplification detection (memoized to avoid re-filtering on every render)
  const amplificationNeeds = useMemo(() => {
    const selectedHeadphonesThatNeedAmp = selectedHeadphoneItems.filter(hp => hp.needs_amp)
    const recommendedHeadphonesThatNeedAmp = [...cans, ...iems].filter(hp => hp.needs_amp)

    return {
      selectedNeedAmp: selectedHeadphonesThatNeedAmp,
      recommendedNeedAmp: recommendedHeadphonesThatNeedAmp,
      hasAmplification: wantRecommendationsFor.amp || wantRecommendationsFor.combo,
      shouldShowWarning: (selectedHeadphonesThatNeedAmp.length > 0 || recommendedHeadphonesThatNeedAmp.length > 0) && !wantRecommendationsFor.amp && !wantRecommendationsFor.combo
    }
  }, [selectedHeadphoneItems, cans, iems, wantRecommendationsFor.amp, wantRecommendationsFor.combo])

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

  // Handle "View Details" button click on cards
  const handleViewDetails = useCallback((id: string) => {
    const allComponents = [...cans, ...iems, ...dacs, ...amps, ...dacAmps]
    const comp = allComponents.find(c => c.id === id)
    if (comp) setDetailComponent(comp)
  }, [cans, iems, dacs, amps, dacAmps])

  // Unified selection helpers for the detail modal
  const isDetailComponentSelected = useCallback((id: string) => {
    return selectedCans.has(id) || selectedIems.has(id) || selectedDacs.has(id) || selectedAmps.has(id) || selectedDacAmps.has(id)
  }, [selectedCans, selectedIems, selectedDacs, selectedAmps, selectedDacAmps])

  const toggleDetailComponentSelection = useCallback((id: string) => {
    if (cans.find(c => c.id === id)) return toggleCansSelection(id)
    if (iems.find(c => c.id === id)) return toggleIemsSelection(id)
    if (dacs.find(c => c.id === id)) return toggleDacSelection(id)
    if (amps.find(c => c.id === id)) return toggleAmpSelection(id)
    if (dacAmps.find(c => c.id === id)) return toggleDacAmpSelection(id)
  }, [cans, iems, dacs, amps, dacAmps, toggleCansSelection, toggleIemsSelection, toggleDacSelection, toggleAmpSelection, toggleDacAmpSelection])

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
        <div style={{ background: 'var(--background-primary)' }}>
          {/* Skeleton budget slider area */}
          <div style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--background-secondary)', padding: '16px 0' }}>
            <div className="mx-auto px-4 sm:px-6 lg:px-8" style={{ width: '95%', maxWidth: '1400px' }}>
              <div className="skeleton h-10 w-full rounded-lg" />
            </div>
          </div>

          <div className="mx-auto px-4 sm:px-6 lg:px-8 py-6" style={{ width: '95%', maxWidth: '1400px' }}>
            {/* Skeleton filters bar */}
            <div className="mb-4 px-4 py-3 rounded-xl border bg-secondary">
              <div className="flex flex-wrap items-center gap-3">
                <div className="skeleton h-5 w-12 rounded" />
                {[72, 48, 52, 52, 60].map((w, i) => (
                  <div key={i} className="skeleton h-7 rounded-full" style={{ width: w }} />
                ))}
                <div className="skeleton h-5 w-px mx-2 hidden sm:block" />
                <div className="skeleton h-5 w-14 rounded" />
                {[56, 48, 52, 60].map((w, i) => (
                  <div key={`s${i}`} className="skeleton h-7 rounded-full" style={{ width: w }} />
                ))}
              </div>
            </div>

            {/* Skeleton result grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {[1, 2].map(col => (
                <div key={col} className="card overflow-hidden">
                  <div className="px-4 py-3 border-b flex justify-between">
                    <div className="skeleton h-4 w-20 rounded" />
                    <div className="skeleton h-4 w-16 rounded" />
                  </div>
                  <div className="p-4 flex flex-col gap-2">
                    {[1, 2, 3].map(row => (
                      <div key={row} className="rounded-xl border p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="skeleton h-5 w-40 rounded mb-1.5" />
                            <div className="skeleton h-3.5 w-24 rounded" />
                          </div>
                          <div className="skeleton h-6 w-14 rounded" />
                        </div>
                        <div className="flex gap-2 mt-2">
                          <div className="skeleton h-4 w-16 rounded" />
                          <div className="skeleton h-4 w-20 rounded" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-center text-sm text-tertiary mt-6 animate-pulse">Building your recommendations…</p>
          </div>
        </div>
      )
    }


  return (
    <BatchPriceHistoryProvider>
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

      <div className={`mx-auto px-4 sm:px-6 lg:px-8 py-6 ${comparisonItems.length > 0 ? 'pb-28' : ''}`} style={{ width: '95%', maxWidth: '1400px' }}>

       {/* Welcome banner for first-time visitors */}
       {showWelcome && (
         <WelcomeBanner
           onDismiss={dismissWelcome}
           onPickSound={() => {
             setIsMultiSelectMode(true)
             const soundEl = document.querySelector('[data-sound-filters]')
             soundEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
           }}
         />
       )}

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
          onToggleExpandExperts={isFirstVisit && showWelcome ? undefined : () => setExpandAllExperts(!expandAllExperts)}
          onToggleGuidedMode={toggleGuidedMode}
          isMultiSelectMode={isMultiSelectMode}
          onToggleMultiSelect={handleToggleMultiSelect}
          totalBudget={isFirstVisit && showWelcome ? undefined : debouncedBudget}
          budgetAllocation={customBudgetAllocation}
          autoBudgetAllocation={autoBudgetAllocation}
          onBudgetAllocationChange={isFirstVisit && showWelcome ? undefined : handleBudgetAllocationChange}
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
          ownedHeadphones={ownedHeadphones}
          ownedDacs={ownedDacs}
          ownedAmps={ownedAmps}
          ownedCombos={ownedCombos}
          budget={budget}
          remainingBudget={userPrefs.budget - totalSelectedPrice}
          isStackComplete={isStackComplete}
          onBuildStack={() => setShowStackBuilder(true)}
          onShowMarketplace={() => setShowMarketplace(true)}
          onAddOwnedGear={() => setShowOwnedGearModal(true)}
          onRemoveOwnedGear={removeOwnedGear}
          onRemoveItem={removeFromSelection}
          onClearAll={() => {
            setSelectedCans(new Map())
            setSelectedIems(new Map())
            setSelectedDacs(new Map())
            setSelectedAmps(new Map())
            setSelectedDacAmps(new Map())
            setOwnedGear(new Map())
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

          // First-card hint flag — only the very first card across all sections gets the hint
          let firstCardHintShown = false

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
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-accent border-t-transparent"></div>
                    <span className="text-sm text-secondary font-medium">Updating results...</span>
                  </div>
                </div>
              )}

              {/* Empty state when no categories have results — but not if the user already has a complete stack */}
              {activeTypes === 0 && hasLoadedOnce && !loading && !isStackComplete && (
                <div className="card p-12 text-center max-w-lg mx-auto">
                  <div className="text-4xl mb-4">🔍</div>
                  <h3 className="heading-3 mb-2">No results match your filters</h3>
                  <p className="text-secondary mb-6 text-sm">
                    Try increasing your budget, widening your sound signature preference, or enabling more equipment categories.
                  </p>
                  <button
                    onClick={() => {
                      const sliderEl = document.querySelector('[data-budget-slider]')
                      sliderEl?.scrollIntoView({ behavior: 'smooth', block: 'center' })
                    }}
                    className="button button-primary"
                  >
                    Adjust budget
                  </button>
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
                <div className="px-4 py-3 border-b flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase text-tertiary" style={{ letterSpacing: '0.1em' }}>
                    Headphones
                  </h2>
                  <span className="text-xs text-tertiary tabular-nums">
                    {filteredCans.length} results
                    {budgetAllocation.headphones && Object.keys(budgetAllocation).length > 1 ? ` · ${formatBudgetUSD(budgetAllocation.headphones)} budget` : ''}
                  </span>
                </div>
              <div className="p-4 flex flex-col gap-[5px]">
                {displayCans.map((headphone) => {
                  const isTechnicalChamp = !!(topTechnical && headphone.id === topTechnical.id && (topTechnical.expert_grade_numeric || 0) >= 3.3)
                  const isToneChamp = !!(topTone && headphone.id === topTone.id && (topTone.matchScore || 0) >= 85)
                  const isBudgetChamp = !!(topBudget && headphone.id === topBudget.id && (topBudget.value_rating || 0) >= 4)
                  const showHint = !firstCardHintShown && !hasEverSelected
                  if (showHint) firstCardHintShown = true

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
                      onViewDetails={handleViewDetails}
                      expandAllExperts={expandAllExperts}
                      isFirstCardHint={showHint}
                    />
                  )
                })}

                {/* Show More Button */}
                {!showAllCans && filteredCans.length > initialLimit && (
                  <button
                    onClick={() => setShowAllCans(true)}
                    className="mt-2 py-3 px-4 text-sm font-medium text-accent hover:text-accent-secondary transition-colors border border-accent/30 hover:border-accent rounded-lg hover:bg-accent/5"
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
                <div className="px-4 py-3 border-b flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase text-tertiary" style={{ letterSpacing: '0.1em' }}>
                    IEMs
                  </h2>
                  <span className="text-xs text-tertiary tabular-nums">
                    {filteredIems.length} results
                    {budgetAllocation.headphones && Object.keys(budgetAllocation).length > 1 ? ` · ${formatBudgetUSD(budgetAllocation.headphones)} budget` : ''}
                  </span>
                </div>
              <div className="p-4 flex flex-col gap-[5px]">
                {displayIems.map((headphone) => {
                  const isTechnicalChamp = !!(topTechnical && headphone.id === topTechnical.id && (topTechnical.expert_grade_numeric || 0) >= 3.3)
                  const isToneChamp = !!(topTone && headphone.id === topTone.id && (topTone.matchScore || 0) >= 85)
                  const isBudgetChamp = !!(topBudget && headphone.id === topBudget.id && (topBudget.value_rating || 0) >= 4)
                  const showHint = !firstCardHintShown && !hasEverSelected
                  if (showHint) firstCardHintShown = true

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
                      onViewDetails={handleViewDetails}
                      expandAllExperts={expandAllExperts}
                      isFirstCardHint={showHint}
                    />
                  )
                })}

                {/* Show More Button */}
                {!showAllIems && filteredIems.length > initialLimit && (
                  <button
                    onClick={() => setShowAllIems(true)}
                    className="mt-2 py-3 px-4 text-sm font-medium text-accent hover:text-accent-secondary transition-colors border border-accent/30 hover:border-accent rounded-lg hover:bg-accent/5"
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
                {/* DACs Section — hide empty fallback when stack is already complete */}
                  {wantRecommendationsFor.dac && (!isStackComplete || filteredDacs.length > 0) && (
                    <div className="card overflow-hidden border-t-2" style={{ borderTopColor: 'rgb(45 212 191)' }}>
                      {filteredDacs.length > 0 ? (
                        <>
                          <div className="px-4 py-3 border-b flex items-center justify-between">
                            <h2 className="text-xs font-semibold uppercase text-tertiary" style={{ letterSpacing: '0.1em' }}>
                              DACs
                            </h2>
                            <span className="text-xs text-tertiary tabular-nums">
                              {filteredDacs.length} results
                              {budgetAllocation.dac && Object.keys(budgetAllocation).length > 1 ? ` · ${formatBudgetUSD(budgetAllocation.dac)} budget` : ''}
                            </span>
                          </div>
                        <div className="p-4 flex flex-col gap-[5px]">
                          {displayDacs.map((dac) => {
                            const showHint = !firstCardHintShown && !hasEverSelected
                            if (showHint) firstCardHintShown = true
                            return (
                            <SignalGearCard
                              key={dac.id}
                              component={dac}
                              isSelected={selectedDacs.has(dac.id)}
                              onToggleSelection={toggleDacSelection}
                              type="dac"
                              onFindUsed={handleFindUsed}
                              onViewDetails={handleViewDetails}
                              expandAllExperts={expandAllExperts}
                              isFirstCardHint={showHint}
                            />
                            )
                          })}

                          {/* Show More Button */}
                          {!showAllDacs && filteredDacs.length > initialLimit && (
                            <button
                              onClick={() => setShowAllDacs(true)}
                              className="mt-2 py-3 px-4 text-sm font-medium text-accent hover:text-accent-secondary transition-colors border border-accent/30 hover:border-accent rounded-lg hover:bg-accent/5"
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
                          <h3 className="text-sm font-medium text-secondary mb-1">No DACs in range</h3>
                          <span className="text-xs text-accent hover:underline">Adjust budget allocation</span>
                        </button>
                    )}
                  </div>
                )}

          {/* Amps Section */}
          {wantRecommendationsFor.amp && (!isStackComplete || filteredAmps.length > 0) && (
              <div className="card overflow-hidden border-t-2" style={{ borderTopColor: 'rgb(251 191 36)' }}>
                {filteredAmps.length > 0 ? (
                  <>
                    <div className="px-4 py-3 border-b flex items-center justify-between">
                      <h2 className="text-xs font-semibold uppercase text-tertiary" style={{ letterSpacing: '0.1em' }}>
                        Amplifiers
                      </h2>
                      <span className="text-xs text-tertiary tabular-nums">
                        {filteredAmps.length} results
                        {budgetAllocation.amp && Object.keys(budgetAllocation).length > 1 ? ` · ${formatBudgetUSD(budgetAllocation.amp)} budget` : ''}
                      </span>
                    </div>
                  <div className="p-4 flex flex-col gap-[5px]">
                    {displayAmps.map((amp) => {
                      const showHint = !firstCardHintShown && !hasEverSelected
                      if (showHint) firstCardHintShown = true
                      return (
                      <SignalGearCard
                        key={amp.id}
                        component={amp}
                        isSelected={selectedAmps.has(amp.id)}
                        onToggleSelection={toggleAmpSelection}
                        type="amp"
                        onFindUsed={handleFindUsed}
                        onViewDetails={handleViewDetails}
                        expandAllExperts={expandAllExperts}
                        isFirstCardHint={showHint}
                      />
                      )
                    })}

                    {/* Show More Button */}
                    {!showAllAmps && filteredAmps.length > initialLimit && (
                      <button
                        onClick={() => setShowAllAmps(true)}
                        className="mt-2 py-3 px-4 text-sm font-medium text-accent hover:text-accent-secondary transition-colors border border-accent/30 hover:border-accent rounded-lg hover:bg-accent/5"
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
                    <h3 className="text-sm font-medium text-secondary mb-1">No amplifiers in range</h3>
                    <span className="text-xs text-accent hover:underline">Adjust budget allocation</span>
                  </button>
              )}
            </div>
          )}

          {/* Combo Units Section — hide empty fallback when stack is already complete */}
          {wantRecommendationsFor.combo && (!isStackComplete || filteredDacAmps.length > 0) && (
              <div className="card overflow-hidden border-t-2" style={{ borderTopColor: 'rgb(96 165 250)' }}>
                {filteredDacAmps.length > 0 ? (
                  <>
                    <div className="px-4 py-3 border-b flex items-center justify-between">
                      <h2 className="text-xs font-semibold uppercase text-tertiary" style={{ letterSpacing: '0.1em' }}>
                        DAC/Amp Combos
                      </h2>
                      <span className="text-xs text-tertiary tabular-nums">
                        {filteredDacAmps.length} results
                        {budgetAllocation.combo && Object.keys(budgetAllocation).length > 1 ? ` · ${formatBudgetUSD(budgetAllocation.combo)} budget` : ''}
                      </span>
                    </div>
                  <div className="p-4 flex flex-col gap-[5px]">
                    {displayDacAmps.map((combo) => {
                      const showHint = !firstCardHintShown && !hasEverSelected
                      if (showHint) firstCardHintShown = true
                      return (
                      <SignalGearCard
                        key={combo.id}
                        component={combo}
                        isSelected={selectedDacAmps.has(combo.id)}
                        onToggleSelection={toggleDacAmpSelection}
                        type="combo"
                        onFindUsed={handleFindUsed}
                        onViewDetails={handleViewDetails}
                        expandAllExperts={expandAllExperts}
                        isFirstCardHint={showHint}
                      />
                      )
                    })}

                    {/* Show More Button */}
                    {!showAllCombos && filteredDacAmps.length > initialLimit && (
                      <button
                        onClick={() => setShowAllCombos(true)}
                        className="mt-2 py-3 px-4 text-sm font-medium text-accent hover:text-accent-secondary transition-colors border border-accent/30 hover:border-accent rounded-lg hover:bg-accent/5"
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
                    <h3 className="text-sm font-medium text-secondary mb-1">No combos in range</h3>
                    <span className="text-xs text-accent hover:underline">Adjust budget allocation</span>
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
            className="px-6 py-3 rounded-lg font-semibold text-lg transition-colors bg-orange-400 hover:bg-orange-500 active:bg-orange-600 text-white dark:bg-orange-400 dark:hover:bg-orange-500 dark:active:bg-orange-600"
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
                  <p className="text-lg text-secondary">
                    No used market listings found for your selected items yet.
                  </p>
                  <p className="text-sm text-tertiary mt-2">
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
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-[8px] flex items-center justify-center p-4"
          style={{ zIndex: 'var(--z-modal, 40)' }}
          role="dialog"
          aria-modal="true"
          aria-label="Adjust Preferences"
          onClick={(e) => { if (e.target === e.currentTarget) setShowPreferencesModal(false) }}
        >
          <div className="bg-surface-card border rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-scaleIn">
            <div className="sticky top-0 bg-surface-card border-b px-6 py-4 rounded-t-xl z-10">
              <div className="flex justify-between items-center">
                <h2 className="heading-2">Adjust Preferences</h2>
                <button
                  onClick={() => setShowPreferencesModal(false)}
                  className="p-1.5 hover:bg-secondary rounded-md transition-colors"
                  aria-label="Close preferences"
                >
                  <X className="w-5 h-5 text-secondary" />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Budget Adjustment */}
              <div>
                <label className="block text-sm font-medium text-primary mb-2">
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
                <div className="flex justify-between text-xs text-tertiary mt-1">
                  <span>$20</span>
                  <span>$10,000</span>
                </div>
              </div>

              {/* Budget Range */}
              <div>
                <label className="block text-sm font-medium text-primary mb-3">
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
                      <div className="text-xs text-tertiary">{option.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Sound Signature */}
              <div>
                <label className="block text-sm font-medium text-primary mb-3">
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
                <label className="block text-sm font-medium text-primary mb-3">
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

            <div className="sticky bottom-0 bg-secondary px-6 py-4 border-t rounded-b-xl">
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
        ownedComponents={{
          headphones: ownedHeadphones,
          dacs: ownedDacs,
          amps: ownedAmps,
          combos: ownedCombos
        }}
        onRemoveComponent={removeFromSelection}
        onRemoveOwnedComponent={removeOwnedGear}
        onSaveStack={async (stackName, components) => {
          // Save handled inside StackBuilderModal with auth check
          setShowStackBuilder(false)
        }}
      />

      {/* Owned Gear Search Modal */}
      <OwnedGearModal
        isOpen={showOwnedGearModal}
        onClose={() => setShowOwnedGearModal(false)}
        onAddOwnedGear={(component) => addOwnedGear(component as AudioComponent)}
        ownedIds={ownedIds}
      />

      {/* Component Detail Modal */}
      {detailComponent && (
        <ComponentDetailModal
          component={detailComponent}
          isOpen={!!detailComponent}
          onClose={() => setDetailComponent(null)}
          isSelected={isDetailComponentSelected(detailComponent.id)}
          onToggleSelection={toggleDetailComponentSelection}
        />
      )}

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
    </BatchPriceHistoryProvider>
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