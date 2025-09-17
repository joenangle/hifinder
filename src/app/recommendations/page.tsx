'use client'

import { Suspense } from 'react'
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Component, UsedListing } from '@/types'
import { UsedListingsSection } from '@/components/UsedListingsSection'
import { BudgetSliderEnhanced } from '@/components/BudgetSliderEnhanced'
import { useBudgetState } from '@/hooks/useBudgetState'
import { AmplificationBadge } from '@/components/AmplificationIndicator'
import { StackBuilderModal } from '@/components/StackBuilderModal'

// Extended Component interface for audio specifications
interface AudioComponent extends Component {
  avgPrice: number
  synergyScore?: number
  compatibilityScore?: number
  powerAdequacy?: number
  amplificationAssessment?: {
    difficulty: 'easy' | 'moderate' | 'demanding' | 'very_demanding' | 'unknown';
    explanation: string;
    estimatedSensitivity?: number;
  }
}

function RecommendationsContent() {
  // Component state
  const [headphones, setHeadphones] = useState<AudioComponent[]>([])
  const [dacs, setDacs] = useState<AudioComponent[]>([])
  const [amps, setAmps] = useState<AudioComponent[]>([])
  const [dacAmps, setDacAmps] = useState<AudioComponent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAmplification, setShowAmplification] = useState(false)

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
  const [userPrefs, setUserPrefs] = useState({
    experience: searchParams.get('experience') || 'intermediate',
    budget: parseInt(searchParams.get('budget') || '300'),
    budgetRangeMin: parseInt(searchParams.get('budgetRangeMin') || '20'),  // Default -20%
    budgetRangeMax: parseInt(searchParams.get('budgetRangeMax') || '10'),  // Default +10%
    headphoneType: searchParams.get('headphoneType') || 'both', // Show both for quick-start
    wantRecommendationsFor: JSON.parse(searchParams.get('wantRecommendationsFor') || '{"headphones":true,"dac":false,"amp":false,"combo":false}'),
    existingGear: JSON.parse(searchParams.get('existingGear') || '{"headphones":false,"dac":false,"amp":false,"combo":false,"specificModels":{"headphones":"","dac":"","amp":"","combo":""}}'),
    usage: searchParams.get('usage') || 'music',
    usageRanking: JSON.parse(searchParams.get('usageRanking') || '[]'),
    excludedUsages: JSON.parse(searchParams.get('excludedUsages') || '[]'),
    soundSignature: searchParams.get('sound') || 'any' // Show all for quick-start
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
    const legacySound = searchParams.get('sound')
    if (legacySound && legacySound !== 'any') return [legacySound]
    return ['neutral', 'warm', 'bright', 'fun'] // Default to all
  })
  
  // Sync state with URL parameters when they change
  useEffect(() => {
    const urlPrefs = {
      experience: searchParams.get('experience') || 'intermediate',
      budget: parseInt(searchParams.get('budget') || '300'),
      budgetRangeMin: parseInt(searchParams.get('budgetRangeMin') || '20'),  // Default -20%
      budgetRangeMax: parseInt(searchParams.get('budgetRangeMax') || '10'),  // Default +10%
      headphoneType: searchParams.get('headphoneType') || 'cans',
      wantRecommendationsFor: JSON.parse(searchParams.get('wantRecommendationsFor') || '{"headphones":true,"dac":false,"amp":false,"combo":false}'),
      existingGear: JSON.parse(searchParams.get('existingGear') || '{"headphones":false,"dac":false,"amp":false,"combo":false,"specificModels":{"headphones":"","dac":"","amp":"","combo":""}}'),
      usage: searchParams.get('usage') || 'music',
      usageRanking: JSON.parse(searchParams.get('usageRanking') || '[]'),
      excludedUsages: JSON.parse(searchParams.get('excludedUsages') || '[]'),
      soundSignature: searchParams.get('sound') || 'neutral'
    }
    setUserPrefs(urlPrefs)
  }, [searchParams])

  // Extract values for convenience (using budget from enhanced state)
  const { experience, budgetRangeMin, budgetRangeMax, headphoneType, wantRecommendationsFor, existingGear, usage, usageRanking, soundSignature } = userPrefs
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
        sound: debouncedSoundSignature
      })

      const response = await fetch(`/api/recommendations?${params.toString()}`)
      
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
      
      if (totalResults === 0) {
        setError('No recommendations found for your criteria. Try adjusting your budget or preferences.')
      }
      
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

  useEffect(() => {
    fetchRecommendations()
  }, [fetchRecommendations])

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

  if (error) {
    return (
      <div className="page-container">
        <div className="max-w-2xl mx-auto mt-20">
          <div className="card p-8 text-center">
            <div className="text-4xl mb-4">⚠️</div>
            <h2 className="heading-2 mb-4">Unable to Load Recommendations</h2>
            <p className="text-secondary mb-6">{error}</p>
            <div className="space-y-4">
              <button
                onClick={() => fetchRecommendations()}
                className="button button-primary mr-4"
              >
                Try Again
              </button>
              <button
                onClick={() => setShowPreferencesModal(true)}
                className="button button-secondary"
              >
                Adjust Preferences
              </button>
            </div>
            <div className="mt-6 text-sm text-tertiary">
              <p>Still having issues? Try adjusting your budget range or selecting different components.</p>
            </div>
          </div>
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

        {/* Amplification Warning Banner for Beginners/Intermediates */}
        {amplificationNeeds?.shouldShowWarning && (
          <div className="card mb-6 p-6 border-l-4 border-yellow-500 bg-yellow-50">
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

        {/* Enhanced Budget Control */}
        <div className="card mb-6 p-6">
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
            className="w-full"
          />
        </div>

        {/* Optional Filters */}
        <div className="card mb-10 p-6">
          <h3 className="heading-3 text-center mb-4">Refine Your Search</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Headphone & Audio Gear Toggles */}
            <div>
              <label className="block text-sm font-medium text-primary mb-3">Headphone & Audio Gear</label>

              {/* All/None toggle buttons */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => {
                    // Select all gear types
                    setTypeFilters(['cans', 'iems'])
                    updatePreferences({
                      headphoneType: 'both',
                      wantRecommendationsFor: {
                        dac: true,
                        amp: true,
                        combo: true
                      }
                    })
                  }}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-colors bg-blue-500 text-white hover:bg-blue-600"
                >
                  All
                </button>
                <button
                  onClick={() => {
                    // Deselect all gear types
                    setTypeFilters([])
                    updatePreferences({
                      headphoneType: 'both',
                      wantRecommendationsFor: {
                        headphones: false, // Also disable headphone recommendations when no types selected
                        dac: false,
                        amp: false,
                        combo: false
                      }
                    })
                  }}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-colors bg-gray-500 text-white hover:bg-gray-600"
                >
                  None
                </button>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    const newFilters = typeFilters.includes('cans')
                      ? typeFilters.filter(f => f !== 'cans')
                      : [...typeFilters, 'cans']
                    setTypeFilters(newFilters)
                    // Update userPrefs for backward compatibility
                    const newType = newFilters.length === 2 ? 'both' : newFilters.length === 1 ? newFilters[0] : 'both'
                    updatePreferences({
                      headphoneType: newType,
                      wantRecommendationsFor: {
                        ...wantRecommendationsFor,
                        headphones: newFilters.length > 0 // Enable headphones if any type is selected
                      }
                    })
                  }}
                  className={`
                    flex items-center gap-3 px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 w-full justify-between relative border-2
                    ${typeFilters.includes('cans')
                      ? 'bg-purple-600 text-white border-purple-600 shadow-md transform scale-[1.02]'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <span>🎧 Over-Ear Headphones</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    typeFilters.includes('cans')
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {typeFilters.includes('cans') ? 'ON' : 'OFF'}
                  </span>
                </button>
                <button
                  onClick={() => {
                    const newFilters = typeFilters.includes('iems')
                      ? typeFilters.filter(f => f !== 'iems')
                      : [...typeFilters, 'iems']
                    setTypeFilters(newFilters)
                    // Update userPrefs for backward compatibility
                    const newType = newFilters.length === 2 ? 'both' : newFilters.length === 1 ? newFilters[0] : 'both'
                    updatePreferences({
                      headphoneType: newType,
                      wantRecommendationsFor: {
                        ...wantRecommendationsFor,
                        headphones: newFilters.length > 0 // Enable headphones if any type is selected
                      }
                    })
                  }}
                  className={`
                    flex items-center gap-3 px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 w-full justify-between relative border-2
                    ${typeFilters.includes('iems')
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-[1.02]'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <span>🔊 In-Ear Monitors (IEMs)</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    typeFilters.includes('iems')
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {typeFilters.includes('iems') ? 'ON' : 'OFF'}
                  </span>
                </button>
                <button
                  onClick={() => {
                    updatePreferences({
                      wantRecommendationsFor: {
                        ...wantRecommendationsFor,
                        dac: !wantRecommendationsFor.dac
                      }
                    })
                  }}
                  className={`
                    flex items-center gap-3 px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 w-full justify-between relative border-2
                    ${wantRecommendationsFor.dac
                      ? 'bg-green-600 text-white border-green-600 shadow-md transform scale-[1.02]'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <span>🔄 DACs</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    wantRecommendationsFor.dac
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {wantRecommendationsFor.dac ? 'ON' : 'OFF'}
                  </span>
                </button>
                <button
                  onClick={() => {
                    updatePreferences({
                      wantRecommendationsFor: {
                        ...wantRecommendationsFor,
                        amp: !wantRecommendationsFor.amp
                      }
                    })
                  }}
                  className={`
                    flex items-center gap-3 px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 w-full justify-between relative border-2
                    ${wantRecommendationsFor.amp
                      ? 'bg-yellow-600 text-white border-yellow-600 shadow-md transform scale-[1.02]'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <span>⚡ Amplifiers</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    wantRecommendationsFor.amp
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {wantRecommendationsFor.amp ? 'ON' : 'OFF'}
                  </span>
                </button>
                <button
                  onClick={() => {
                    updatePreferences({
                      wantRecommendationsFor: {
                        ...wantRecommendationsFor,
                        combo: !wantRecommendationsFor.combo
                      }
                    })
                  }}
                  className={`
                    flex items-center gap-3 px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 w-full justify-between relative border-2
                    ${wantRecommendationsFor.combo
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-[1.02]'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <span>🔗 DAC/Amp Combos</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    wantRecommendationsFor.combo
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {wantRecommendationsFor.combo ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>
            </div>

            {/* Sound Signature Filter */}
            <div>
              <label className="block text-sm font-medium text-primary mb-3">Sound Signature</label>

              {/* All/None toggle buttons */}
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => {
                    // Select all sound signatures
                    setSoundFilters(['neutral', 'warm', 'bright', 'fun'])
                    updatePreferences({ soundSignature: 'any' })
                  }}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-colors bg-blue-500 text-white hover:bg-blue-600"
                >
                  All
                </button>
                <button
                  onClick={() => {
                    // Deselect all sound signatures
                    setSoundFilters([])
                    updatePreferences({ soundSignature: 'any' })
                  }}
                  className="px-3 py-1 rounded-full text-xs font-medium transition-colors bg-gray-500 text-white hover:bg-gray-600"
                >
                  None
                </button>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => {
                    const newFilters = soundFilters.includes('neutral')
                      ? soundFilters.filter(f => f !== 'neutral')
                      : [...soundFilters, 'neutral']
                    setSoundFilters(newFilters)
                    // Update userPrefs for backward compatibility
                    const newSignature = newFilters.length === 4 ? 'any' : newFilters.length === 1 ? newFilters[0] : 'any'
                    updatePreferences({ soundSignature: newSignature })
                  }}
                  className={`
                    flex items-center gap-3 px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 w-full justify-between relative border-2
                    ${soundFilters.includes('neutral')
                      ? 'bg-gray-600 text-white border-gray-600 shadow-md transform scale-[1.02]'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <span>⚖️ Neutral (Balanced)</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    soundFilters.includes('neutral')
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {soundFilters.includes('neutral') ? 'ON' : 'OFF'}
                  </span>
                </button>
                <button
                  onClick={() => {
                    const newFilters = soundFilters.includes('warm')
                      ? soundFilters.filter(f => f !== 'warm')
                      : [...soundFilters, 'warm']
                    setSoundFilters(newFilters)
                    // Update userPrefs for backward compatibility
                    const newSignature = newFilters.length === 4 ? 'any' : newFilters.length === 1 ? newFilters[0] : 'any'
                    updatePreferences({ soundSignature: newSignature })
                  }}
                  className={`
                    flex items-center gap-3 px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 w-full justify-between relative border-2
                    ${soundFilters.includes('warm')
                      ? 'bg-orange-600 text-white border-orange-600 shadow-md transform scale-[1.02]'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <span>🔥 Warm (Enhanced Bass)</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    soundFilters.includes('warm')
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {soundFilters.includes('warm') ? 'ON' : 'OFF'}
                  </span>
                </button>
                <button
                  onClick={() => {
                    const newFilters = soundFilters.includes('bright')
                      ? soundFilters.filter(f => f !== 'bright')
                      : [...soundFilters, 'bright']
                    setSoundFilters(newFilters)
                    // Update userPrefs for backward compatibility
                    const newSignature = newFilters.length === 4 ? 'any' : newFilters.length === 1 ? newFilters[0] : 'any'
                    updatePreferences({ soundSignature: newSignature })
                  }}
                  className={`
                    flex items-center gap-3 px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 w-full justify-between relative border-2
                    ${soundFilters.includes('bright')
                      ? 'bg-cyan-600 text-white border-cyan-600 shadow-md transform scale-[1.02]'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <span>✨ Bright (Enhanced Treble)</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    soundFilters.includes('bright')
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {soundFilters.includes('bright') ? 'ON' : 'OFF'}
                  </span>
                </button>
                <button
                  onClick={() => {
                    const newFilters = soundFilters.includes('fun')
                      ? soundFilters.filter(f => f !== 'fun')
                      : [...soundFilters, 'fun']
                    setSoundFilters(newFilters)
                    // Update userPrefs for backward compatibility
                    const newSignature = newFilters.length === 4 ? 'any' : newFilters.length === 1 ? newFilters[0] : 'any'
                    updatePreferences({ soundSignature: newSignature })
                  }}
                  className={`
                    flex items-center gap-3 px-6 py-3 rounded-full text-sm font-medium transition-all duration-200 w-full justify-between relative border-2
                    ${soundFilters.includes('fun')
                      ? 'bg-pink-600 text-white border-pink-600 shadow-md transform scale-[1.02]'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }
                  `}
                >
                  <span>🎉 Fun (V-Shaped)</span>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    soundFilters.includes('fun')
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {soundFilters.includes('fun') ? 'ON' : 'OFF'}
                  </span>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* System Overview */}
        {(selectedHeadphoneItems.length > 0 || selectedDacItems.length > 0 || selectedAmpItems.length > 0 || selectedDacAmpItems.length > 0) && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border-l-4 border-blue-500">
            <h3 className="heading-3 text-center mb-4">Your Selected System</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {selectedHeadphoneItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500" style={{ minWidth: '60px' }}>{formatBudgetUSD(Math.round(((item.price_used_min || 0) + (item.price_used_max || 0)) / 2))}</p>
                  </div>
                </div>
              ))}
              {selectedDacItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500" style={{ minWidth: '60px' }}>{formatBudgetUSD(Math.round(((item.price_used_min || 0) + (item.price_used_max || 0)) / 2))}</p>
                  </div>
                </div>
              ))}
              {selectedAmpItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500" style={{ minWidth: '60px' }}>{formatBudgetUSD(Math.round(((item.price_used_min || 0) + (item.price_used_max || 0)) / 2))}</p>
                  </div>
                </div>
              ))}
              {selectedDacAmpItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500" style={{ minWidth: '60px' }}>{formatBudgetUSD(Math.round(((item.price_used_min || 0) + (item.price_used_max || 0)) / 2))}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className={`pt-4 border-t border-gray-200 mt-4 rounded-lg p-4 ${
              totalSelectedPrice > budget * 1.1
                ? 'bg-gradient-to-br from-red-50 to-red-100 border border-red-200'
                : totalSelectedPrice > budget * 0.9
                ? 'bg-transparent border border-gray-200'
                : 'bg-gradient-to-br from-green-50 to-green-100 border border-green-200'
            }`}>
              <div className="text-center mb-4">
                <p className="text-xl font-bold text-gray-900 mb-2">
                  ${Math.round(totalSelectedPrice).toLocaleString()}
                </p>
                <p className={`text-sm font-medium mb-1 ${
                  totalSelectedPrice > budget * 1.1
                    ? 'text-red-700'
                    : totalSelectedPrice > budget * 0.9
                    ? 'text-gray-700'
                    : 'text-green-700'
                }`}>
                  {totalSelectedPrice <= budget ? 'Under' : 'Over'} budget by ${Math.abs(totalSelectedPrice - budget).toLocaleString()}
                </p>
                <p className="text-xs text-gray-600">Est. System Cost</p>
              </div>

              {/* Build Stack Button */}
              <div className="flex justify-center gap-3">
                <button
                  onClick={() => setShowStackBuilder(true)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm flex items-center gap-2"
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
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm"
                >
                  Clear All
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-10">
          {/* Headphones Section */}
          {/* TEMPORARY DEBUG: Show headphones if they exist, regardless of wantRecommendationsFor */}
          {(wantRecommendationsFor.headphones || true) && headphones.length > 0 && (
            <div className="card overflow-hidden">
              <div className="bg-accent-light px-6 py-4 border-b border-stroke">
                <h2 className="heading-3 text-center mb-4">
                  🎧 Headphones ({headphones.length} options)
                </h2>
              </div>
              <div className="p-6 space-y-5">
                {headphones.map((headphone) => (
                  <div 
                    key={headphone.id} 
                    className={`card-interactive ${
                      selectedHeadphones.includes(headphone.id) 
                        ? 'selected' 
                        : ''
                    }`}
                    onClick={() => toggleHeadphoneSelection(headphone.id)}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-primary">{headphone.name}</h3>
                      <div className="text-right" style={{ minWidth: '140px' }}>
                        <div className="text-sm font-medium text-accent">
                          {formatBudgetUSD(headphone.price_used_min || 0)}-{formatBudgetUSD(headphone.price_used_max || 0)}
                        </div>
                        {headphone.price_new && (
                          <div className="text-xs text-tertiary">
                            MSRP: {formatBudgetUSD(headphone.price_new)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <p className="text-sm text-secondary">{headphone.brand}</p>
                      {headphone.needs_amp && experience !== 'advanced' && (
                        <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full font-medium">
                          ⚡ Requires Amp
                        </span>
                      )}
                    </div>
                    
                    {/* Enhanced Amplification Assessment */}
                    {headphone.amplificationAssessment && (
                      <div className="mb-3">
                        <AmplificationBadge 
                          difficulty={headphone.amplificationAssessment.difficulty}
                          className="mb-2"
                        />
                        {shouldShowTechnicalSpecs() && (
                          <p className="text-xs text-gray-600 leading-relaxed">
                            {headphone.amplificationAssessment.explanation}
                          </p>
                        )}
                      </div>
                    )}
                    
                    {shouldShowTechnicalSpecs() && (
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                        {headphone.impedance && (
                          <div>Impedance: {headphone.impedance}Ω</div>
                        )}
                        {headphone.sound_signature && (
                          <div>Sound: {headphone.sound_signature}</div>
                        )}
                        {headphone.amplificationAssessment?.estimatedSensitivity && (
                          <div>Est. Sens: {headphone.amplificationAssessment.estimatedSensitivity} dB/mW</div>
                        )}
                        {headphone.synergyScore && (
                          <div>Match: {Math.round(headphone.synergyScore * 100)}%</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* DACs Section */}
          {wantRecommendationsFor.dac && dacs.length > 0 && (
            <div className="card overflow-hidden">
              <div className="bg-success-light px-6 py-4 border-b border-stroke">
                <h2 className="heading-3 text-center mb-4">
                  🔄 DACs ({dacs.length} options)
                </h2>
              </div>
              <div className="p-6 space-y-5">
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
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-primary">{dac.name}</h3>
                      <div className="text-right" style={{ minWidth: '140px' }}>
                        <div className="text-sm font-medium text-success">
                          {formatBudgetUSD(dac.price_used_min || 0)}-{formatBudgetUSD(dac.price_used_max || 0)}
                        </div>
                        {dac.price_new && (
                          <div className="text-xs text-tertiary">
                            MSRP: {formatBudgetUSD(dac.price_new)}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-secondary mb-2">{dac.brand}</p>
                    
                    {shouldShowTechnicalSpecs() && (
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                        {dac.sound_signature && (
                          <div>Sound: {dac.sound_signature}</div>
                        )}
                        {dac.compatibilityScore && (
                          <div>Compatibility: {Math.round(dac.compatibilityScore * 100)}%</div>
                        )}
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
              <div className="bg-warning-light px-6 py-4 border-b border-stroke">
                <h2 className="heading-3 text-center mb-4">
                  ⚡ Amplifiers ({amps.length} options)
                </h2>
              </div>
              <div className="p-6 space-y-5">
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
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-primary">{amp.name}</h3>
                      <div className="text-right" style={{ minWidth: '140px' }}>
                        <div className="text-sm font-medium text-warning">
                          {formatBudgetUSD(amp.price_used_min || 0)}-{formatBudgetUSD(amp.price_used_max || 0)}
                        </div>
                        {amp.price_new && (
                          <div className="text-xs text-tertiary">
                            MSRP: {formatBudgetUSD(amp.price_new)}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-secondary mb-2">{amp.brand}</p>
                    
                    {shouldShowTechnicalSpecs() && (
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                        {amp.sound_signature && (
                          <div>Sound: {amp.sound_signature}</div>
                        )}
                        {amp.compatibilityScore && (
                          <div>Compatibility: {Math.round(amp.compatibilityScore * 100)}%</div>
                        )}
                        {amp.powerAdequacy && (
                          <div>Power: {Math.round(amp.powerAdequacy * 100)}%</div>
                        )}
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
              <div className="bg-accent-light px-6 py-4 border-b border-stroke">
                <h2 className="heading-3 text-center mb-4">
                  🎯 DAC/Amp Combos ({dacAmps.length} options)
                </h2>
              </div>
              <div className="p-6 space-y-5">
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
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-primary">{combo.name}</h3>
                      <div className="text-right" style={{ minWidth: '140px' }}>
                        <div className="text-sm font-medium text-accent">
                          {formatBudgetUSD(combo.price_used_min || 0)}-{formatBudgetUSD(combo.price_used_max || 0)}
                        </div>
                        {combo.price_new && (
                          <div className="text-xs text-tertiary">
                            MSRP: {formatBudgetUSD(combo.price_new)}
                          </div>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-secondary mb-2">{combo.brand}</p>
                    
                    {shouldShowTechnicalSpecs() && (
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                        {combo.sound_signature && (
                          <div>Sound: {combo.sound_signature}</div>
                        )}
                        {combo.compatibilityScore && (
                          <div>Compatibility: {Math.round(combo.compatibilityScore * 100)}%</div>
                        )}
                        {combo.powerAdequacy && (
                          <div>Power: {Math.round(combo.powerAdequacy * 100)}%</div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Used Market Toggle */}
        <div className="mt-12 text-center">
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

        {/* System Builder Message */}
        {showAmplification && !wantRecommendationsFor.amp && !wantRecommendationsFor.combo && (
          <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <span className="text-2xl">💡</span>
              </div>
              <div className="ml-3">
                <h3 className="text-lg font-medium text-yellow-800">
                  Amplification Recommended
                </h3>
                <p className="mt-2 text-yellow-700">
                  Based on your selected headphones (high impedance or marked as needing amplification), 
                  we recommend adding a dedicated amplifier or DAC/amp combo to your system for optimal performance.
                </p>
                <Link 
                  href="/onboarding?step=2" 
                  className="mt-4 inline-block px-4 py-2 bg-yellow-200 text-yellow-800 rounded-md hover:bg-yellow-300 transition-colors"
                >
                  Update Component Preferences
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Back to Onboarding */}
        <div className="mt-12 text-center">
          <Link
            href="/onboarding"
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