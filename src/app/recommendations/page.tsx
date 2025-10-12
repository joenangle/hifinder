'use client'

import { Suspense } from 'react'
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Component, UsedListing } from '@/types'
import { UsedListingsSection } from '@/components/UsedListingsSection'
import { BudgetSliderEnhanced } from '@/components/BudgetSliderEnhanced'
import { useBudgetState } from '@/hooks/useBudgetState'
import { StackBuilderModal } from '@/components/StackBuilderModal'
import { ExpertAnalysisPanel } from '@/components/ExpertAnalysisPanel'

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
  // Component state
  const [headphones, setHeadphones] = useState<AudioComponent[]>([])
  const [dacs, setDacs] = useState<AudioComponent[]>([])
  const [amps, setAmps] = useState<AudioComponent[]>([])
  const [dacAmps, setDacAmps] = useState<AudioComponent[]>([])
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
        needsAmplification: recommendations.needsAmplification
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
          <h1 className="heading-1 mb-4">
            {getTitle()}
          </h1>
          <p className="text-lg text-secondary max-w-3xl mx-auto">
            {getDescription()}
          </p>
        </div>


        {/* Enhanced Budget Control */}
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

       {/* Compact Filters */}
        <div className="filter-card-compact">
          <h3 className="filter-title-compact">Refine Your Search</h3>
          
          {/* Equipment Type Row */}
          <div className="filter-row">
            <span className="filter-label-compact">Equipment</span>
            <div className="filter-buttons-compact">
              <button
                className={`toggle-compact ${typeFilters.includes('cans') ? 'active-purple' : ''}`}
                onClick={() => {
                  const newFilters = typeFilters.includes('cans')
                    ? typeFilters.filter(f => f !== 'cans')
                    : [...typeFilters, 'cans']
                  setTypeFilters(newFilters)
                  const newType = newFilters.length === 2 ? 'both' : newFilters.length === 1 ? newFilters[0] : 'both'
                  updatePreferences({
                    headphoneType: newType,
                    wantRecommendationsFor: {
                      ...wantRecommendationsFor,
                      headphones: newFilters.length > 0
                    }
                  })
                }}
              >
                <span>🎧</span>
                <span>Headphones</span>
              </button>
              
              <button
                className={`toggle-compact ${typeFilters.includes('iems') ? 'active-indigo' : ''}`}
                onClick={() => {
                  const newFilters = typeFilters.includes('iems')
                    ? typeFilters.filter(f => f !== 'iems')
                    : [...typeFilters, 'iems']
                  setTypeFilters(newFilters)
                  const newType = newFilters.length === 2 ? 'both' : newFilters.length === 1 ? newFilters[0] : 'both'
                  updatePreferences({
                    headphoneType: newType,
                    wantRecommendationsFor: {
                      ...wantRecommendationsFor,
                      headphones: newFilters.length > 0
                    }
                  })
                }}
              >
                <span>🎵</span>
                <span>IEMs</span>
              </button>
              
              <button
                className={`toggle-compact ${wantRecommendationsFor.dac ? 'active-green' : ''}`}
                onClick={() => {
                  updatePreferences({
                    wantRecommendationsFor: {
                      ...wantRecommendationsFor,
                      dac: !wantRecommendationsFor.dac
                    }
                  })
                }}
              >
                <span>🔄</span>
                <span>DACs</span>
              </button>
              
              <button
                className={`toggle-compact ${wantRecommendationsFor.amp ? 'active-amber' : ''}`}
                onClick={() => {
                  updatePreferences({
                    wantRecommendationsFor: {
                      ...wantRecommendationsFor,
                      amp: !wantRecommendationsFor.amp
                    }
                  })
                }}
              >
                <span>⚡</span>
                <span>Amps</span>
              </button>
              
              <button
                className={`toggle-compact ${wantRecommendationsFor.combo ? 'active-blue' : ''}`}
                onClick={() => {
                  updatePreferences({
                    wantRecommendationsFor: {
                      ...wantRecommendationsFor,
                      combo: !wantRecommendationsFor.combo
                    }
                  })
                }}
              >
                <span>🔗</span>
                <span>Combos</span>
              </button>
            </div>
          </div>
          
          {/* Sound Signature Row */}
          <div className="filter-row">
            <span className="filter-label-compact">Sound</span>
            <div className="filter-buttons-compact">
              <button
                className={`toggle-compact ${soundFilters.includes('neutral') ? 'active-neutral' : ''}`}
                onClick={() => {
                  const newFilters = soundFilters.includes('neutral')
                    ? soundFilters.filter(f => f !== 'neutral')
                    : [...soundFilters, 'neutral']
                  setSoundFilters(newFilters)
                  const newSignature = newFilters.length === 4 ? 'any' : newFilters.length === 1 ? newFilters[0] : 'any'
                  updatePreferences({ soundSignature: newSignature })
                }}
              >
                <span>⚖️</span>
                <span>Neutral</span>
              </button>
              
              <button
                className={`toggle-compact ${soundFilters.includes('warm') ? 'active-warm' : ''}`}
                onClick={() => {
                  const newFilters = soundFilters.includes('warm')
                    ? soundFilters.filter(f => f !== 'warm')
                    : [...soundFilters, 'warm']
                  setSoundFilters(newFilters)
                  const newSignature = newFilters.length === 4 ? 'any' : newFilters.length === 1 ? newFilters[0] : 'any'
                  updatePreferences({ soundSignature: newSignature })
                }}
              >
                <span>🔥</span>
                <span>Warm</span>
              </button>
              
              <button
                className={`toggle-compact ${soundFilters.includes('bright') ? 'active-bright' : ''}`}
                onClick={() => {
                  const newFilters = soundFilters.includes('bright')
                    ? soundFilters.filter(f => f !== 'bright')
                    : [...soundFilters, 'bright']
                  setSoundFilters(newFilters)
                  const newSignature = newFilters.length === 4 ? 'any' : newFilters.length === 1 ? newFilters[0] : 'any'
                  updatePreferences({ soundSignature: newSignature })
                }}
              >
                <span>✨</span>
                <span>Bright</span>
              </button>
              
              <button
                className={`toggle-compact ${soundFilters.includes('fun') ? 'active-fun' : ''}`}
                onClick={() => {
                  const newFilters = soundFilters.includes('fun')
                    ? soundFilters.filter(f => f !== 'fun')
                    : [...soundFilters, 'fun']
                  setSoundFilters(newFilters)
                  const newSignature = newFilters.length === 4 ? 'any' : newFilters.length === 1 ? newFilters[0] : 'any'
                  updatePreferences({ soundSignature: newSignature })
                }}
              >
                <span>🎉</span>
                <span>V-Shaped</span>
              </button>
            </div>
          </div>
        </div>

        {/* Amplification Warning Banner for Beginners/Intermediates */}
        {amplificationNeeds?.shouldShowWarning && (
          <div className="card p-6 border-l-4 border-yellow-500 bg-yellow-50" style={{ marginBottom: '32px' }}>
            <div className="flex items-start space-x-3">
              <div className="text-2xl">⚡</div>
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-800 mb-2">
                  Amplification Recommended
                </h3>
                <p className="text-yellow-700 mb-3">
                  {amplificationNeeds.selectedNeedAmp.length > 0
                    ? `Your selected headphones (${amplificationNeeds.selectedNeedAmp.map(h => h.name).join(', ')}) benefit from dedicated amplification for optimal performance.`
                    : `Some recommended headphones require amplification to reach their full potential.`
                  }
                </p>
                <button
                  onClick={() => {
                    updatePreferences({
                      wantRecommendationsFor: {
                        ...wantRecommendationsFor,
                        amp: true,
                        combo: true
                      }
                    })
                  }}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Add Amplifier & Combo Recommendations
                </button>
              </div>
            </div>
          </div>
        )}

        {/* System Overview */}
        {(selectedHeadphoneItems.length > 0 || selectedDacItems.length > 0 || selectedAmpItems.length > 0 || selectedDacAmpItems.length > 0) && (
          <div className="card p-6 mb-8 border-l-4 border-accent-primary">
            <h3 className="heading-3 text-center mb-4">Your Selected System</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {selectedHeadphoneItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
                  <div className="w-2 h-2 bg-accent-primary rounded-full"></div>
                  <div>
                    <p className="font-medium text-sm text-text-primary">{item.name}</p>
                    <p className="text-xs text-text-secondary" style={{ minWidth: '60px' }}>{formatBudgetUSD(Math.round(((item.price_used_min || 0) + (item.price_used_max || 0)) / 2))}</p>
                  </div>
                </div>
              ))}
              {selectedDacItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
                  <div className="w-2 h-2 bg-red-500 dark:bg-red-400 rounded-full"></div>
                  <div>
                    <p className="font-medium text-sm text-text-primary">{item.name}</p>
                    <p className="text-xs text-text-secondary" style={{ minWidth: '60px' }}>{formatBudgetUSD(Math.round(((item.price_used_min || 0) + (item.price_used_max || 0)) / 2))}</p>
                  </div>
                </div>
              ))}
              {selectedAmpItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
                  <div className="w-2 h-2 bg-amber-500 dark:bg-amber-400 rounded-full"></div>
                  <div>
                    <p className="font-medium text-sm text-text-primary">{item.name}</p>
                    <p className="text-xs text-text-secondary" style={{ minWidth: '60px' }}>{formatBudgetUSD(Math.round(((item.price_used_min || 0) + (item.price_used_max || 0)) / 2))}</p>
                  </div>
                </div>
              ))}
              {selectedDacAmpItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
                  <div className="w-2 h-2 bg-orange-500 dark:bg-orange-400 rounded-full"></div>
                  <div>
                    <p className="font-medium text-sm text-text-primary">{item.name}</p>
                    <p className="text-xs text-text-secondary" style={{ minWidth: '60px' }}>{formatBudgetUSD(Math.round(((item.price_used_min || 0) + (item.price_used_max || 0)) / 2))}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className={`pt-4 border-t border-border-default mt-4 rounded-lg p-4 ${
              totalSelectedPrice > budget * 1.1
                ? 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-800'
                : totalSelectedPrice > budget * 0.9
                ? 'bg-transparent border border-border-default'
                : 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800'
            }`}>
              <div className="text-center mb-4">
                <p className="text-xl font-bold text-text-primary mb-2">
                  ${Math.round(totalSelectedPrice).toLocaleString()}
                </p>
                <p className={`text-sm font-medium mb-1 ${
                  totalSelectedPrice > budget * 1.1
                    ? 'text-red-700 dark:text-red-400'
                    : totalSelectedPrice > budget * 0.9
                    ? 'text-text-secondary'
                    : 'text-green-700 dark:text-green-400'
                }`}>
                  {totalSelectedPrice <= budget ? 'Under' : 'Over'} budget by ${Math.abs(totalSelectedPrice - budget).toLocaleString()}
                </p>
                <p className="text-xs text-text-secondary">Est. System Cost</p>
              </div>

              {/* Build Stack Button */}
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowStackBuilder(true)}
                  className="button button-primary flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  Build Complete Stack
                </button>
                <button
                  onClick={() => {
                    // Clear all selections
                    setSelectedHeadphones([])
                    setSelectedDacs([])
                    setSelectedAmps([])
                    setSelectedDacAmps([])
                  }}
                  className="button button-secondary"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dynamic grid based on number of component types */}
        {(() => {
          const activeTypes = [
            wantRecommendationsFor.headphones && headphones.length > 0,
            wantRecommendationsFor.dac && dacs.length > 0,
            wantRecommendationsFor.amp && amps.length > 0,
            wantRecommendationsFor.combo && dacAmps.length > 0
          ].filter(Boolean).length

          const gridClass = activeTypes === 1
            ? 'grid grid-cols-1 gap-8 max-w-2xl mx-auto'
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
                <h2 className="heading-3 text-center mb-4 text-orange-900 dark:text-orange-100">
                  🎧 Headphones ({headphones.length} options)
                </h2>
              </div>
              <div className="p-6 space-y-3">
                {headphones.map((headphone) => {
                  const isTechnicalChamp = headphone.id === topTechnical.id && (topTechnical.expert_grade_numeric || 0) >= 3.3
                  const isToneChamp = headphone.id === topTone.id && (topTone.matchScore || 0) >= 85
                  const isBudgetChamp = headphone.id === topBudget.id && (topBudget.value_rating || 0) >= 4

                  return (
                  <div
                    key={headphone.id}
                    className={`card-interactive ${
                      selectedHeadphones.includes(headphone.id)
                        ? 'selected'
                        : ''
                    }`}
                    onClick={() => toggleHeadphoneSelection(headphone.id)}
                  >
                    {/* Header: Category and Match Score */}
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-xs font-semibold px-2 py-1 rounded ${
                        headphone.category === 'iems'
                          ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200'
                          : 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200'
                      }`}>
                        {headphone.category === 'iems' ? '🎵 IEM' : '🎧 Headphones'}
                      </span>
                      {headphone.matchScore && (
                        <span
                          className="text-base font-bold text-orange-600 dark:text-orange-400 cursor-help"
                          title={`Match Score: ${headphone.matchScore}%\n\n${
                            headphone.matchScore >= 85 ? '⭐⭐⭐⭐⭐ Excellent Match - Perfect for your preferences and budget' :
                            headphone.matchScore >= 75 ? '⭐⭐⭐⭐ Great Match - Strong fit for your needs' :
                            headphone.matchScore >= 65 ? '⭐⭐⭐ Good Match - Solid option worth considering' :
                            headphone.matchScore >= 55 ? '⭐⭐ Fair Match - May work but consider alternatives' :
                            '⭐ Weak Match - Better options available'
                          }\n\nBased on: Price fit (45%) + Sound signature (45%) + Quality bonuses (10%)`}
                        >
                          Match: {headphone.matchScore}% {
                            headphone.matchScore >= 85 ? '⭐⭐⭐⭐⭐' :
                            headphone.matchScore >= 75 ? '⭐⭐⭐⭐' :
                            headphone.matchScore >= 65 ? '⭐⭐⭐' :
                            headphone.matchScore >= 55 ? '⭐⭐' :
                            '⭐'
                          }
                        </span>
                      )}
                    </div>

                    {/* Champion Badges */}
                    {(isTechnicalChamp || isToneChamp || isBudgetChamp) && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {isTechnicalChamp && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-600 dark:bg-orange-500 text-white text-xs font-semibold rounded-full">
                            🏆 Top Tech
                          </span>
                        )}
                        {isToneChamp && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-600 dark:bg-amber-500 text-white text-xs font-semibold rounded-full">
                            🎵 Best Match
                          </span>
                        )}
                        {isBudgetChamp && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500 dark:bg-orange-400 text-white text-xs font-semibold rounded-full">
                            💰 Value
                          </span>
                        )}
                      </div>
                    )}

                    {/* Name (Brand + Model) and Price on same line */}
                    <div className="flex items-baseline justify-between mb-1">
                      <h3 className="font-semibold text-lg text-text-primary dark:text-text-primary">
                        {headphone.brand} {headphone.name}
                      </h3>
                      <div className="text-right ml-4">
                        <div className="text-lg font-bold text-accent-primary dark:text-accent-primary whitespace-nowrap">
                          {formatBudgetUSD(headphone.price_used_min || 0)}-{formatBudgetUSD(headphone.price_used_max || 0)}
                        </div>
                      </div>
                    </div>

                    {/* MSRP */}
                    {headphone.price_new && (
                      <div className="text-xs text-text-tertiary dark:text-text-tertiary mb-2">
                        MSRP: {formatBudgetUSD(headphone.price_new)}
                      </div>
                    )}

                    {/* Compact metadata row */}
                    <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary dark:text-text-secondary mb-2">
                      {headphone.amplificationAssessment && (
                        <span className="inline-flex items-center gap-1">
                          ⚡ {headphone.amplificationAssessment.difficulty === 'easy' ? 'Easy to Drive' :
                             headphone.amplificationAssessment.difficulty === 'moderate' ? 'Moderate Power' :
                             headphone.amplificationAssessment.difficulty === 'demanding' ? 'Needs Good Amp' :
                             headphone.amplificationAssessment.difficulty === 'very_demanding' ? 'Needs Powerful Amp' : 'Unknown'}
                        </span>
                      )}
                      {headphone.sound_signature && (
                        <>
                          <span>|</span>
                          <span>Sound: {headphone.sound_signature}</span>
                        </>
                      )}
                      {headphone.impedance && (
                        <>
                          <span>|</span>
                          <span>{headphone.impedance}Ω</span>
                        </>
                      )}
                      {headphone.fit && (
                        <>
                          <span>|</span>
                          <span>{headphone.fit}</span>
                        </>
                      )}
                    </div>

                    <ExpertAnalysisPanel component={headphone} />
                  </div>
                  )
                })}
              </div>
            </div>
                )
          })()}

          {/* DACs Section */}
          {wantRecommendationsFor.dac && dacs.length > 0 && (
            <div className="card overflow-hidden">
              <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-red-950/30 dark:to-orange-950/30 px-6 py-4 border-b border-orange-200 dark:border-orange-800/50">
                <h2 className="heading-3 text-center mb-4 text-orange-900 dark:text-orange-100">
                  🔄 DACs ({dacs.length} options)
                </h2>
              </div>
              <div className="p-6 space-y-3">
                {dacs.map((dac) => (
                  <div
                    key={dac.id}
                    className={`card-interactive ${
                      selectedDacs.includes(dac.id)
                        ? 'selected'
                        : ''
                    }`}
                    onClick={() => toggleDacSelection(dac.id)}
                  >
                    {/* Header with name and pricing */}
                    <div className="mb-3">
                      <h3 className="font-semibold text-lg text-text-primary dark:text-text-primary mb-1">{dac.brand} {dac.name}</h3>
                      <div className="flex justify-between items-baseline text-sm">
                        <span className="text-text-secondary dark:text-text-secondary">Used Est.: {formatBudgetUSD(dac.price_used_min || 0)}-{formatBudgetUSD(dac.price_used_max || 0)}</span>
                        {dac.price_new && (
                          <span className="text-text-tertiary dark:text-text-tertiary">MSRP: {formatBudgetUSD(dac.price_new)}</span>
                        )}
                      </div>
                    </div>

                    {/* Performance Section */}
                    {(dac.asr_sinad || dac.asr_review_url) && (
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold text-text-secondary dark:text-text-secondary uppercase tracking-wide mb-1">⚡ Performance</h4>
                        <div className="text-sm text-text-primary dark:text-text-primary">
                          {dac.asr_sinad && (
                            <div>• SINAD: {dac.asr_sinad} dB {
                              dac.asr_sinad >= 120 ? '(Excellent)' :
                              dac.asr_sinad >= 110 ? '(Very Good)' :
                              dac.asr_sinad >= 100 ? '(Good)' : '(Fair)'
                            }</div>
                          )}
                          {dac.asr_review_url && !dac.asr_sinad && (
                            <div>• ASR Review Available</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Connectivity Section */}
                    {(dac.input_types || dac.output_types) && (
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold text-text-secondary dark:text-text-secondary uppercase tracking-wide mb-1">🔌 Connectivity</h4>
                        <div className="text-sm text-text-primary dark:text-text-primary space-y-1">
                          {dac.input_types && (
                            <div>• Inputs: {Array.isArray(dac.input_types) ? dac.input_types.join(', ') : dac.input_types}</div>
                          )}
                          {dac.output_types && (
                            <div>• Outputs: {Array.isArray(dac.output_types) ? dac.output_types.join(', ') : dac.output_types}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Why Recommended */}
                    {dac.why_recommended && (
                      <div>
                        <h4 className="text-xs font-semibold text-text-secondary dark:text-text-secondary uppercase tracking-wide mb-1">💡 Why Recommended</h4>
                        <p className="text-sm text-text-secondary dark:text-text-secondary">{dac.why_recommended}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Amps Section */}
          {wantRecommendationsFor.amp && amps.length > 0 && (
            <div className="card overflow-hidden">
              <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/40 dark:to-yellow-950/30 px-6 py-4 border-b border-amber-200 dark:border-amber-800/50">
                <h2 className="heading-3 text-center mb-4 text-amber-900 dark:text-amber-100">
                  ⚡ Amplifiers ({amps.length} options)
                </h2>
              </div>
              <div className="p-6 space-y-3">
                {amps.map((amp) => (
                  <div
                    key={amp.id}
                    className={`card-interactive ${
                      selectedAmps.includes(amp.id)
                        ? 'selected'
                        : ''
                    }`}
                    onClick={() => toggleAmpSelection(amp.id)}
                  >
                    {/* Header with name and pricing */}
                    <div className="mb-3">
                      <h3 className="font-semibold text-lg text-text-primary dark:text-text-primary mb-1">{amp.brand} {amp.name}</h3>
                      <div className="flex justify-between items-baseline text-sm">
                        <span className="text-text-secondary dark:text-text-secondary">Used Est.: {formatBudgetUSD(amp.price_used_min || 0)}-{formatBudgetUSD(amp.price_used_max || 0)}</span>
                        {amp.price_new && (
                          <span className="text-text-tertiary dark:text-text-tertiary">MSRP: {formatBudgetUSD(amp.price_new)}</span>
                        )}
                      </div>
                    </div>

                    {/* Power Output Section */}
                    {(amp.power_output || (amp.powerAdequacy && amp.powerAdequacy > 0.5)) && (
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold text-text-secondary dark:text-text-secondary uppercase tracking-wide mb-1">⚡ Power Output</h4>
                        <div className="text-sm text-text-primary dark:text-text-primary space-y-1">
                          {amp.power_output && (
                            <div>• {amp.power_output}</div>
                          )}
                          {amp.powerAdequacy && amp.powerAdequacy > 0.5 && (
                            <div>• Power Match: {Math.round(amp.powerAdequacy * 100)}% {
                              amp.powerAdequacy >= 0.9 ? '(Perfect)' :
                              amp.powerAdequacy >= 0.7 ? '(Good)' : '(Adequate)'
                            }</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Performance Section */}
                    {(amp.asr_sinad || amp.asr_review_url) && (
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold text-text-secondary dark:text-text-secondary uppercase tracking-wide mb-1">📊 Performance</h4>
                        <div className="text-sm text-text-primary dark:text-text-primary">
                          {amp.asr_sinad && (
                            <div>• SINAD: {amp.asr_sinad} dB {
                              amp.asr_sinad >= 110 ? '(Excellent)' :
                              amp.asr_sinad >= 100 ? '(Very Good)' :
                              amp.asr_sinad >= 90 ? '(Good)' : '(Fair)'
                            }</div>
                          )}
                          {amp.asr_review_url && !amp.asr_sinad && (
                            <div>• ASR Review Available</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Connectivity Section */}
                    {(amp.input_types || amp.output_types) && (
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold text-text-secondary dark:text-text-secondary uppercase tracking-wide mb-1">🔌 Connectivity</h4>
                        <div className="text-sm text-text-primary dark:text-text-primary space-y-1">
                          {amp.input_types && (
                            <div>• Inputs: {Array.isArray(amp.input_types) ? amp.input_types.join(', ') : amp.input_types}</div>
                          )}
                          {amp.output_types && (
                            <div>• Outputs: {Array.isArray(amp.output_types) ? amp.output_types.join(', ') : amp.output_types}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Why Recommended */}
                    {amp.why_recommended && (
                      <div>
                        <h4 className="text-xs font-semibold text-text-secondary dark:text-text-secondary uppercase tracking-wide mb-1">💡 Why Recommended</h4>
                        <p className="text-sm text-text-secondary dark:text-text-secondary">{amp.why_recommended}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Combo Units Section */}
          {wantRecommendationsFor.combo && dacAmps.length > 0 && (
            <div className="card overflow-hidden">
              <div className="bg-gradient-to-r from-orange-50 via-amber-50 to-yellow-50 dark:from-orange-950/30 dark:via-amber-950/30 dark:to-yellow-950/30 px-6 py-4 border-b border-orange-200 dark:border-orange-800/50">
                <h2 className="heading-3 text-center mb-4 text-orange-900 dark:text-orange-100">
                  🎯 DAC/Amp Combos ({dacAmps.length} options)
                </h2>
              </div>
              <div className="p-6 space-y-3">
                {dacAmps.map((combo) => (
                  <div
                    key={combo.id}
                    className={`card-interactive ${
                      selectedDacAmps.includes(combo.id)
                        ? 'selected'
                        : ''
                    }`}
                    onClick={() => toggleDacAmpSelection(combo.id)}
                  >
                    {/* Header with name and pricing */}
                    <div className="mb-3">
                      <h3 className="font-semibold text-lg text-text-primary dark:text-text-primary mb-1">{combo.brand} {combo.name}</h3>
                      <div className="flex justify-between items-baseline text-sm">
                        <span className="text-text-secondary dark:text-text-secondary">Used Est.: {formatBudgetUSD(combo.price_used_min || 0)}-{formatBudgetUSD(combo.price_used_max || 0)}</span>
                        {combo.price_new && (
                          <span className="text-text-tertiary dark:text-text-tertiary">MSRP: {formatBudgetUSD(combo.price_new)}</span>
                        )}
                      </div>
                    </div>

                    {/* Performance Section (combines DAC + Amp specs) */}
                    {(combo.asr_sinad || combo.power_output || (combo.powerAdequacy && combo.powerAdequacy > 0.5)) && (
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold text-text-secondary dark:text-text-secondary uppercase tracking-wide mb-1">⚡ Performance</h4>
                        <div className="text-sm text-text-primary dark:text-text-primary space-y-1">
                          {combo.asr_sinad && (
                            <div>• DAC SINAD: {combo.asr_sinad} dB {
                              combo.asr_sinad >= 120 ? '(Excellent)' :
                              combo.asr_sinad >= 110 ? '(Very Good)' :
                              combo.asr_sinad >= 100 ? '(Good)' : '(Fair)'
                            }</div>
                          )}
                          {combo.power_output && (
                            <div>• Amp Power: {combo.power_output}</div>
                          )}
                          {combo.powerAdequacy && combo.powerAdequacy > 0.5 && (
                            <div>• Power Match: {Math.round(combo.powerAdequacy * 100)}% {
                              combo.powerAdequacy >= 0.9 ? '(Perfect)' :
                              combo.powerAdequacy >= 0.7 ? '(Good)' : '(Adequate)'
                            }</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Connectivity Section */}
                    {(combo.input_types || combo.output_types) && (
                      <div className="mb-3">
                        <h4 className="text-xs font-semibold text-text-secondary dark:text-text-secondary uppercase tracking-wide mb-1">🔌 Connectivity</h4>
                        <div className="text-sm text-text-primary dark:text-text-primary space-y-1">
                          {combo.input_types && (
                            <div>• Inputs: {Array.isArray(combo.input_types) ? combo.input_types.join(', ') : combo.input_types}</div>
                          )}
                          {combo.output_types && (
                            <div>• Outputs: {Array.isArray(combo.output_types) ? combo.output_types.join(', ') : combo.output_types}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Why Recommended */}
                    {combo.why_recommended && (
                      <div>
                        <h4 className="text-xs font-semibold text-text-secondary dark:text-text-secondary uppercase tracking-wide mb-1">💡 Why Recommended</h4>
                        <p className="text-sm text-text-secondary dark:text-text-secondary">{combo.why_recommended}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
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


        {/* Back to Onboarding */}
        <div className="mt-12 mb-8 text-center">
          <Link
            href="/onboarding-v2"
            className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            ← Adjust Preferences
          </Link>
        </div>
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