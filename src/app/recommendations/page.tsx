'use client'

import React, { Suspense } from 'react'
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { Component, UsedListing } from '@/types'
import { UsedListingsSection } from '@/components/UsedListingsSection'
import { BudgetSliderEnhanced } from '@/components/BudgetSliderEnhanced'
import { useBudgetState } from '@/hooks/useBudgetState'
import { StackBuilderModal } from '@/components/StackBuilderModal'
import { ExpertAnalysisPanel } from '@/components/ExpertAnalysisPanel'
import { Tooltip } from '@/components/Tooltip'
import { FilterButton } from '@/components/FilterButton'
import { useGuidedMode } from '@/hooks/useGuidedMode'
import { FILTER_TOOLTIPS } from '@/lib/tooltips'
import { HeadphoneCard } from '@/components/recommendations/HeadphoneCard'
import { SignalGearCard } from '@/components/recommendations/SignalGearCard'
import { SelectedSystemSummary } from '@/components/recommendations/SelectedSystemSummary'
import { FiltersSection } from '@/components/recommendations/FiltersSection'
import { AmplificationWarningBanner } from '@/components/recommendations/AmplificationWarningBanner'

// Lazy load guided mode components for better code splitting
const WelcomeBanner = dynamic(() => import('@/components/WelcomeBanner').then(mod => ({ default: mod.WelcomeBanner })), {
  ssr: false
})
const GuidedModeToggle = dynamic(() => import('@/components/GuidedModeToggle').then(mod => ({ default: mod.GuidedModeToggle })), {
  ssr: false
})

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
  const [headphones, setHeadphones] = useState<AudioComponent[]>([])
  const [dacs, setDacs] = useState<AudioComponent[]>([])
  const [amps, setAmps] = useState<AudioComponent[]>([])
  const [dacAmps, setDacAmps] = useState<AudioComponent[]>([])
  const [budgetAllocation, setBudgetAllocation] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [, setError] = useState<string | null>(null)
  const [, setShowAmplification] = useState(false)

  // Selection state
  const [selectedHeadphones, setSelectedHeadphones] = useState<string[]>([])
  const [selectedDacs, setSelectedDacs] = useState<string[]>([])
  const [selectedAmps, setSelectedAmps] = useState<string[]>([])
  const [selectedDacAmps, setSelectedDacAmps] = useState<string[]>([])

  // Used market state
  const [usedListings, setUsedListings] = useState<{[componentId: string]: UsedListing[]}>({})
  const [showUsedMarket, setShowUsedMarket] = useState(false)

  // Stack builder state
  const [showStackBuilder, setShowStackBuilder] = useState(false)

  // Preferences modal state
  const [showPreferencesModal, setShowPreferencesModal] = useState(false)

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

    return {
      experience: searchParams.get('experience') || 'intermediate',
      budget: parseInt(searchParams.get('budget') || '300'),
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

  // Debounce all other preference changes (500ms delay for filters)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedPrefs(userPrefs)
    }, 500)

    return () => clearTimeout(timer)
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

  const [soundFilters, setSoundFilters] = useState<string[]>(() => {
    const param = searchParams.get('soundSignatures')
    if (param) {
      try {
        return JSON.parse(param)
      } catch {
        return ['neutral', 'warm', 'bright', 'fun'] // Default to all if parsing fails
      }
    }
    // Legacy support for single sound param
    const legacySound = searchParams.get('sound') // Keep for legacy support
    if (legacySound && legacySound !== 'any') return [legacySound]
    return ['neutral', 'warm', 'bright', 'fun'] // Default to all
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

    const urlPrefs = {
      experience: searchParams.get('experience') || 'intermediate',
      budget: parseInt(searchParams.get('budget') || '300'),
      budgetRangeMin: parseInt(searchParams.get('budgetRangeMin') || '20'),  // Default -20%
      budgetRangeMax: parseInt(searchParams.get('budgetRangeMax') || '10'),  // Default +10%
      headphoneType: searchParams.get('headphoneType') || 'cans',
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
  const { experience, wantRecommendationsFor, soundSignature } = userPrefs
  const budget = budgetState.budget // For UI display (immediate updates)
  const budgetForAPI = debouncedBudget // For API calls (debounced)

  // Extract debounced values for API calls
  const {
    experience: debouncedExperience,
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
  const updatePreferences = (newPrefs: Partial<typeof userPrefs>) => {
    const updatedPrefs = { ...userPrefs, ...newPrefs }
    setUserPrefs(updatedPrefs)
    
    // Update URL params
    const params = new URLSearchParams()
    params.set('experience', updatedPrefs.experience)
    params.set('budget', updatedPrefs.budget.toString())
    params.set('budgetRangeMin', updatedPrefs.budgetRangeMin.toString())
    params.set('budgetRangeMax', updatedPrefs.budgetRangeMax.toString())
    params.set('headphoneType', updatedPrefs.headphoneType)
    params.set('headphoneTypes', JSON.stringify(typeFilters))
    params.set('soundSignatures', JSON.stringify(soundFilters))
    params.set('wantRecommendationsFor', JSON.stringify(updatedPrefs.wantRecommendationsFor))
    params.set('existingGear', JSON.stringify(updatedPrefs.existingGear))
    params.set('usage', updatedPrefs.usage)
    params.set('usageRanking', JSON.stringify(updatedPrefs.usageRanking))
    params.set('excludedUsages', JSON.stringify(updatedPrefs.excludedUsages))
    params.set('sound', updatedPrefs.soundSignature)
    
    router.push(`/recommendations?${params.toString()}`, { scroll: false })
  }



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
        experience: debouncedExperience,
        budget: budgetForAPI.toString(),
        budgetRangeMin: debouncedBudgetRangeMin.toString(),
        budgetRangeMax: debouncedBudgetRangeMax.toString(),
        headphoneType: debouncedHeadphoneType,
        wantRecommendationsFor: JSON.stringify(debouncedWantRecommendationsFor),
        existingGear: JSON.stringify(debouncedExistingGear),
        usage: debouncedUsage,
        usageRanking: JSON.stringify(debouncedUsageRanking),
        excludedUsages: JSON.stringify(debouncedExcludedUsages),
        soundSignature: debouncedSoundSignature
      })

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
        headphones: recommendations.headphones?.length || 0,
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
        'headphones.length': recommendations.headphones?.length || 0,
        'will render headphones': wantRecommendationsFor?.headphones && (recommendations.headphones?.length || 0) > 0
      })

      // Set recommendations with fallbacks
      setHeadphones(recommendations.headphones || [])
      setDacs(recommendations.dacs || [])
      setBudgetAllocation(recommendations.budgetAllocation || {})
      setAmps(recommendations.amps || [])
      setDacAmps(recommendations.combos || [])
      setShowAmplification(recommendations.needsAmplification || false)
      
      // Check if we got any results
      const totalResults = (recommendations.headphones?.length || 0) +
                          (recommendations.dacs?.length || 0) +
                          (recommendations.amps?.length || 0) +
                          (recommendations.combos?.length || 0)

      console.log('🔍 Frontend results check:', {
        headphones: recommendations.headphones?.length || 0,
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
      setHeadphones([])
      setDacs([])
      setAmps([])
      setDacAmps([])
      setShowAmplification(false)
    } finally {
      setLoading(false)
    }
  }, [debouncedExperience, budgetForAPI, debouncedBudgetRangeMin, debouncedBudgetRangeMax, debouncedHeadphoneType, debouncedWantRecommendationsFor, debouncedExistingGear, debouncedUsage, debouncedUsageRanking, debouncedExcludedUsages, debouncedSoundSignature])

  // Initial fetch on mount + when fetchRecommendations changes
  useEffect(() => {
    fetchRecommendations()
  }, [fetchRecommendations])

  // Also ensure initial fetch happens immediately on mount
  useEffect(() => {
    fetchRecommendations()
  }, []) // Run once on mount

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [])

  // Used listings fetch effect
  const fetchUsedListings = useCallback(async () => {
    if (!showUsedMarket) return
    
    const allComponents = [...headphones, ...dacs, ...amps, ...dacAmps]
    const componentIds = allComponents.map(c => c.id)
    
    console.log('Fetching used listings for components:', componentIds.length)
    
    if (componentIds.length === 0) return
    
    try {
      const response = await fetch(`/api/used-listings?component_ids=${componentIds.join(',')}&limit=100`)
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
  }, [showUsedMarket, headphones, dacs, amps, dacAmps])
  
  // Used market data is now loaded inline in fetchUsedListings function above

  useEffect(() => {
    fetchUsedListings()
  }, [fetchUsedListings])

  // Selection toggle functions
  const toggleHeadphoneSelection = (id: string) => {
    setSelectedHeadphones(prev => 
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
  const selectedHeadphoneItems = headphones.filter(h => selectedHeadphones.includes(h.id))
  const selectedDacItems = dacs.filter(d => selectedDacs.includes(d.id))
  const selectedAmpItems = amps.filter(a => selectedAmps.includes(a.id))
  const selectedDacAmpItems = dacAmps.filter(da => selectedDacAmps.includes(da.id))

  const totalSelectedPrice = [
    ...selectedHeadphoneItems.map(item => ((item.price_used_min || 0) + (item.price_used_max || 0)) / 2),
    ...selectedDacItems.map(item => ((item.price_used_min || 0) + (item.price_used_max || 0)) / 2),
    ...selectedAmpItems.map(item => ((item.price_used_min || 0) + (item.price_used_max || 0)) / 2),
    ...selectedDacAmpItems.map(item => ((item.price_used_min || 0) + (item.price_used_max || 0)) / 2)
  ].reduce((sum, price) => sum + price, 0)

  // Get budget range label
  const getBudgetRangeLabel = (budget: number) => {
    if (budget <= 100) return 'Budget'
    if (budget <= 400) return 'Entry Level'  
    if (budget <= 1000) return 'Mid Range'
    if (budget <= 3000) return 'High End'
    return 'Summit-Fi'
  }

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
    
    if (experience === 'beginner') {
      return "We've selected 3 highly-rated, easy-to-use options in your budget range. These are safe choices that work great out of the box."
    } else if (experience === 'intermediate') {
      return "Here are 5 excellent options that balance performance and value. Each offers something different - consider your priorities."
    } else {
      return "A curated selection of high-performance components. Consider synergies between components and your specific sonic preferences."
    }
  }

  // Show technical specs for intermediate/enthusiast users
  const shouldShowTechnicalSpecs = () => {
    return experience === 'intermediate' || experience === 'enthusiast'
  }

  // Amplification detection for beginner/intermediate users
  const getAmplificationNeeds = () => {
    // Only show for beginners and intermediates
    if (experience === 'advanced') return null

    const selectedHeadphonesThatNeedAmp = selectedHeadphoneItems.filter(hp => hp.needs_amp)
    const recommendedHeadphonesThatNeedAmp = headphones.filter(hp => hp.needs_amp)

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
    const newFilters = soundFilters.includes(filter)
      ? soundFilters.filter(f => f !== filter)
      : [...soundFilters, filter]
    setSoundFilters(newFilters)
    const newSignature = newFilters.length === 4 ? 'any' : newFilters.length === 1 ? newFilters[0] : 'any'
    updatePreferences({ soundSignature: newSignature })
  }, [soundFilters, updatePreferences])

  const handleAddAmplification = useCallback(() => {
    updatePreferences({
      wantRecommendationsFor: {
        ...wantRecommendationsFor,
        amp: true,
        combo: true
      }
    })
  }, [wantRecommendationsFor, updatePreferences])

  if (loading) {
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
          <div className="flex items-center justify-center gap-4 mb-4">
            <h1 className="heading-1">
              {getTitle()}
            </h1>
            {guidedModeLoaded && (
              <GuidedModeToggle
                enabled={guidedModeEnabled}
                onToggle={toggleGuidedMode}
              />
            )}
          </div>
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

        {/* Enhanced Budget Control */}
        <Tooltip
          content={guidedModeEnabled ? FILTER_TOOLTIPS.budget : ''}
          position="bottom"
          className="w-full"
        >
          <div className="card p-6" style={{ marginBottom: '32px', width: '100%' }}>
            <BudgetSliderEnhanced
              budget={budgetState.budget}
              displayBudget={budgetState.displayBudget}
              onChange={budgetState.handleBudgetChange}
              onChangeComplete={budgetState.handleBudgetChangeComplete}
              isUpdating={budgetState.isUpdating}
              variant="simple"
              userExperience={userPrefs.experience as 'beginner' | 'intermediate' | 'enthusiast'}
              showInput={true}
              showLabels={true}
              showItemCount={true}
              itemCount={budgetState.itemCount?.total || 0}
              minBudget={20}
              maxBudget={10000}
              budgetRangeMin={userPrefs.budgetRangeMin}
              budgetRangeMax={userPrefs.budgetRangeMax}
              className="w-full" // Ensure this is set
            />
          </div>
        </Tooltip>

       {/* Compact Filters */}
        <FiltersSection
          typeFilters={typeFilters}
          soundFilters={soundFilters}
          wantRecommendationsFor={wantRecommendationsFor}
          guidedModeEnabled={guidedModeEnabled}
          onTypeFilterChange={handleTypeFilterChange}
          onEquipmentToggle={handleEquipmentToggle}
          onSoundFilterChange={handleSoundFilterChange}
        />

        {/* Amplification Warning Banner for Beginners/Intermediates */}
        {amplificationNeeds?.shouldShowWarning && (
          <AmplificationWarningBanner
            selectedNeedAmp={amplificationNeeds.selectedNeedAmp}
            wantRecommendationsFor={wantRecommendationsFor}
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
            setSelectedHeadphones([])
            setSelectedDacs([])
            setSelectedAmps([])
            setSelectedDacAmps([])
          }}
        />

        {/* Dynamic grid based on number of component types */}
        {(() => {
          const hasHeadphones = wantRecommendationsFor.headphones && headphones.length > 0
          const hasDacs = wantRecommendationsFor.dac && dacs.length > 0
          const hasAmps = wantRecommendationsFor.amp && amps.length > 0
          const hasCombos = wantRecommendationsFor.combo && dacAmps.length > 0
          const hasSignalGear = hasDacs || hasAmps || hasCombos

          const activeTypes = [hasHeadphones, hasDacs, hasAmps, hasCombos].filter(Boolean).length

          // Special layout: headphones + signal gear → 2 columns (headphones | signal gear stacked)
          const useStackedLayout = hasHeadphones && hasSignalGear && activeTypes >= 2

          const gridClass = activeTypes === 1
            ? 'grid grid-cols-1 gap-8 max-w-2xl mx-auto'
            : useStackedLayout
            ? 'grid grid-cols-1 lg:grid-cols-2 gap-8'
            : activeTypes === 2
            ? 'grid grid-cols-1 lg:grid-cols-2 gap-8'
            : 'grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8'

          return (
            <div className={gridClass}>
              {/* Headphones Section */}
              {/* Show headphones section (includes both headphones and IEMs) */}
              {wantRecommendationsFor.headphones && headphones.length > 0 && (() => {
                // Identify top performers
                const topTechnical = headphones.reduce((prev, current) => {
                  const prevGrade = prev.expert_grade_numeric || 0
                  const currGrade = current.expert_grade_numeric || 0
                  return currGrade > prevGrade ? current : prev
                })

                const topTone = headphones.reduce((prev, current) => {
                  const prevScore = prev.matchScore || 0
                  const currScore = current.matchScore || 0
                  return currScore > prevScore ? current : prev
                })

                const topBudget = headphones.reduce((prev, current) => {
                  const prevValue = (prev.value_rating || 0) / (((prev.price_used_min || 0) + (prev.price_used_max || 0)) / 2 || 1)
                  const currValue = (current.value_rating || 0) / (((current.price_used_min || 0) + (current.price_used_max || 0)) / 2 || 1)
                  return currValue > prevValue ? current : prev
                })

                return (
            <div className="card overflow-hidden">
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/40 dark:to-amber-950/40 px-6 py-4 border-b border-orange-200 dark:border-orange-800/50">
                <h2 className="heading-3 text-center text-orange-900 dark:text-orange-100">
                  🎧 Headphones & IEMs
                </h2>
                <div className="text-center mt-1">
                  <span className="text-sm text-orange-700 dark:text-orange-300">
                    {headphones.length} options
                    {budgetAllocation.headphones && Object.keys(budgetAllocation).length > 1 && (
                      <> • Budget: {formatBudgetUSD(budgetAllocation.headphones)}</>
                    )}
                  </span>
                </div>
              </div>
              <div className="p-6 space-y-3">
                {headphones.map((headphone) => {
                  const isTechnicalChamp = headphone.id === topTechnical.id && (topTechnical.expert_grade_numeric || 0) >= 3.3
                  const isToneChamp = headphone.id === topTone.id && (topTone.matchScore || 0) >= 85
                  const isBudgetChamp = headphone.id === topBudget.id && (topBudget.value_rating || 0) >= 4

                  return (
                    <HeadphoneCard
                      key={headphone.id}
                      headphone={headphone}
                      isSelected={selectedHeadphones.includes(headphone.id)}
                      onToggleSelection={toggleHeadphoneSelection}
                      isTechnicalChamp={isTechnicalChamp}
                      isToneChamp={isToneChamp}
                      isBudgetChamp={isBudgetChamp}
                    />
                  )
                })}
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
                {wantRecommendationsFor.dac && dacs.length > 0 && (
            <div className="card overflow-hidden">
              <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-red-950/30 dark:to-orange-950/30 px-6 py-4 border-b border-orange-200 dark:border-orange-800/50">
                <h2 className="heading-3 text-center text-orange-900 dark:text-orange-100">
                  🔄 DACs
                </h2>
                <div className="text-center mt-1">
                  <span className="text-sm text-orange-700 dark:text-orange-300">
                    {dacs.length} options
                    {budgetAllocation.dac && Object.keys(budgetAllocation).length > 1 && (
                      <> • Budget: {formatBudgetUSD(budgetAllocation.dac)}</>
                    )}
                  </span>
                </div>
              </div>
              <div className="p-6 space-y-3">
                {dacs.map((dac) => (
                  <SignalGearCard
                    key={dac.id}
                    component={dac}
                    isSelected={selectedDacs.includes(dac.id)}
                    onToggleSelection={toggleDacSelection}
                    type="dac"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Amps Section */}
          {wantRecommendationsFor.amp && amps.length > 0 && (
            <div className="card overflow-hidden">
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/30 px-6 py-4 border-b border-amber-200 dark:border-amber-800/50">
                <h2 className="heading-3 text-center text-amber-900 dark:text-amber-100">
                  ⚡ Amplifiers
                </h2>
                <div className="text-center mt-1">
                  <span className="text-sm text-amber-700 dark:text-amber-300">
                    {amps.length} options
                    {budgetAllocation.amp && Object.keys(budgetAllocation).length > 1 && (
                      <> • Budget: {formatBudgetUSD(budgetAllocation.amp)}</>
                    )}
                  </span>
                </div>
              </div>
              <div className="p-6 space-y-3">
                {amps.map((amp) => (
                  <SignalGearCard
                    key={amp.id}
                    component={amp}
                    isSelected={selectedAmps.includes(amp.id)}
                    onToggleSelection={toggleAmpSelection}
                    type="amp"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Combo Units Section */}
          {wantRecommendationsFor.combo && dacAmps.length > 0 && (
            <div className="card overflow-hidden">
              <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-950/30 dark:via-amber-950/30 dark:to-yellow-950/30 px-6 py-4 border-b border-orange-200 dark:border-orange-800/50">
                <h2 className="heading-3 text-center text-orange-900 dark:text-orange-100">
                  🎯 DAC/Amp Combos
                </h2>
                <div className="text-center mt-1">
                  <span className="text-sm text-orange-700 dark:text-orange-300">
                    {dacAmps.length} options
                    {budgetAllocation.combo && Object.keys(budgetAllocation).length > 1 && (
                      <> • Budget: {formatBudgetUSD(budgetAllocation.combo)}</>
                    )}
                  </span>
                </div>
              </div>
              <div className="p-6 space-y-3">
                {dacAmps.map((combo) => (
                  <SignalGearCard
                    key={combo.id}
                    component={combo}
                    isSelected={selectedDacAmps.includes(combo.id)}
                    onToggleSelection={toggleDacAmpSelection}
                    type="combo"
                  />
                ))}
              </div>
            </div>
          )}
              </SignalGearWrapper>
            )
          })()}
            </div>
          )
        })()}

        {/* Used Market Toggle */}
        <div className="mt-12 mb-8 text-center">
          <button
            onClick={() => {
              console.log('Toggling used market:', !showUsedMarket)
              setShowUsedMarket(!showUsedMarket)
            }}
            className="button button-primary button-lg"
          >
            {showUsedMarket ? 'Hide' : 'Show'} Used Market Listings
          </button>
        </div>

        {/* Used Listings */}
        {showUsedMarket && Object.keys(usedListings).length > 0 && (
          <div className="mt-12 space-y-8">
            <h2 className="heading-3 text-center mb-4">Used Market Listings</h2>
            {[...headphones, ...dacs, ...amps, ...dacAmps].map(component => {
              const componentListings = usedListings[component.id] || []
              if (componentListings.length === 0) return null
              
              return (
                <UsedListingsSection 
                  key={component.id}
                  component={component}
                  listings={componentListings}
                />
              )
            })}
          </div>
        )}


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