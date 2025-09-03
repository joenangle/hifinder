'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { Component, UsedListing } from '@/types'
import { UsedListingsSection } from '@/components/UsedListingsSection'

// Extended Component interface for audio specifications
interface AudioComponent extends Component {
  avgPrice: number
  synergyScore?: number
  compatibilityScore?: number
  powerAdequacy?: number
  powerRequirement?: 'very-low' | 'low' | 'medium' | 'high' | 'unknown'
}

function RecommendationsContent() {
  // Component state
  const [headphones, setHeadphones] = useState<AudioComponent[]>([])
  const [dacs, setDacs] = useState<AudioComponent[]>([])
  const [amps, setAmps] = useState<AudioComponent[]>([])
  const [dacAmps, setDacAmps] = useState<AudioComponent[]>([])
  const [loading, setLoading] = useState(true)
  const [showAmplification, setShowAmplification] = useState(false)
  
  // Selection state
  const [selectedHeadphones, setSelectedHeadphones] = useState<string[]>([])
  const [selectedDacs, setSelectedDacs] = useState<string[]>([])
  const [selectedAmps, setSelectedAmps] = useState<string[]>([])
  const [selectedDacAmps, setSelectedDacAmps] = useState<string[]>([])
  
  // Used market state
  const [usedListings, setUsedListings] = useState<{[componentId: string]: UsedListing[]}>({})
  const [showUsedMarket, setShowUsedMarket] = useState(false)
  
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // User preferences state - make them editable
  const [userPrefs, setUserPrefs] = useState({
    experience: searchParams.get('experience') || 'intermediate',
    budget: parseInt(searchParams.get('budget') || '300'),
    headphoneType: searchParams.get('headphoneType') || 'cans',
    wantRecommendationsFor: JSON.parse(searchParams.get('wantRecommendationsFor') || '{"headphones":true,"dac":false,"amp":false,"combo":false}'),
    existingGear: JSON.parse(searchParams.get('existingGear') || '{"headphones":false,"dac":false,"amp":false,"combo":false,"specificModels":{"headphones":"","dac":"","amp":"","combo":""}}'),
    usage: searchParams.get('usage') || 'music',
    usageRanking: JSON.parse(searchParams.get('usageRanking') || '[]'),
    excludedUsages: JSON.parse(searchParams.get('excludedUsages') || '[]'),
    soundSignature: searchParams.get('sound') || 'neutral'
  })
  
  // Sync state with URL parameters when they change
  useEffect(() => {
    const urlPrefs = {
      experience: searchParams.get('experience') || 'intermediate',
      budget: parseInt(searchParams.get('budget') || '300'),
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

  // Extract values for convenience
  const { experience, budget, headphoneType, wantRecommendationsFor, existingGear, usage, usageRanking, excludedUsages, soundSignature } = userPrefs

  // Update URL when preferences change
  const updatePreferences = (newPrefs: Partial<typeof userPrefs>) => {
    const updatedPrefs = { ...userPrefs, ...newPrefs }
    setUserPrefs(updatedPrefs)
    
    // Update URL params
    const params = new URLSearchParams()
    params.set('experience', updatedPrefs.experience)
    params.set('budget', updatedPrefs.budget.toString())
    params.set('headphoneType', updatedPrefs.headphoneType)
    params.set('wantRecommendationsFor', JSON.stringify(updatedPrefs.wantRecommendationsFor))
    params.set('existingGear', JSON.stringify(updatedPrefs.existingGear))
    params.set('usage', updatedPrefs.usage)
    params.set('usageRanking', JSON.stringify(updatedPrefs.usageRanking))
    params.set('excludedUsages', JSON.stringify(updatedPrefs.excludedUsages))
    params.set('sound', updatedPrefs.soundSignature)
    
    router.push(`/recommendations?${params.toString()}`, { scroll: false })
  }

  // Budget slider state and functions
  const [budgetInputValue, setBudgetInputValue] = useState(budget.toString())
  const [budgetError, setBudgetError] = useState('')

  // Convert linear slider position to logarithmic budget value
  const sliderToBudget = (sliderValue: number) => {
    const minLog = Math.log(20)
    const maxLog = Math.log(10000)
    const scale = (maxLog - minLog) / 100
    return Math.round(Math.exp(minLog + scale * sliderValue))
  }

  // Convert budget value to linear slider position  
  const budgetToSlider = (budget: number) => {
    const minLog = Math.log(20)
    const maxLog = Math.log(10000)
    const scale = (maxLog - minLog) / 100
    return Math.round((Math.log(budget) - minLog) / scale)
  }

  const handleBudgetSliderChange = (sliderValue: number) => {
    const newBudget = sliderToBudget(sliderValue)
    updatePreferences({ budget: newBudget })
    setBudgetInputValue(newBudget.toString())
    setBudgetError('')
  }

  const handleBudgetInputFocus = () => {
    setBudgetInputValue('')
  }

  const handleBudgetInputBlur = () => {
    if (budgetInputValue === '') {
      setBudgetInputValue(budget.toString())
    }
  }

  const handleBudgetInputChange = (value: string) => {
    setBudgetInputValue(value)
    
    if (value === '') {
      setBudgetError('')
      return
    }
    
    const numValue = parseInt(value)
    
    if (isNaN(numValue)) {
      setBudgetError('Please enter a valid number')
      return
    }
    
    if (numValue < 20) {
      setBudgetError('Minimum budget is $20')
      return
    }
    
    if (numValue > 10000) {
      setBudgetError('Maximum budget is $10,000')
      return
    }
    
    // Valid value
    setBudgetError('')
    updatePreferences({ budget: numValue })
  }

  // Format budget with commas
  const formatBudget = (budget: number) => {
    return budget.toLocaleString('en-US')
  }

  // Sync budgetInputValue with budget changes
  useEffect(() => {
    setBudgetInputValue(budget.toString())
  }, [budget])

  // ===== SYSTEM BUILDER CORE LOGIC =====
  
  // Smart budget allocation across requested components
  const allocateBudgetAcrossComponents = (totalBudget: number, requestedComponents: string[], existingGear: any) => {
    const allocation: Record<string, number> = {}
    
    // Typical price ratios for audio components (based on audiophile community wisdom)
    // Adjusted for upgrade scenarios where users already have some gear
    const priceRatios = {
      headphones: existingGear?.headphones ? 0.6 : 0.5,  // More budget for upgrades
      dac: existingGear?.dac ? 0.3 : 0.2,  
      amp: existingGear?.amp ? 0.35 : 0.25,
      combo: existingGear?.combo ? 0.5 : 0.4  
    }
    
    // If only one component requested, give it the full budget
    if (requestedComponents.length === 1) {
      allocation[requestedComponents[0]] = totalBudget
      console.log(`💰 Single component requested: ${requestedComponents[0]} gets full $${totalBudget}`)
      return allocation
    }
    
    // Calculate total ratio for requested components
    const totalRatio = requestedComponents.reduce((sum, comp) => sum + (priceRatios[comp as keyof typeof priceRatios] || 0.2), 0)
    
    // Allocate budget proportionally
    requestedComponents.forEach(component => {
      const ratio = priceRatios[component as keyof typeof priceRatios] || 0.2
      allocation[component] = Math.floor(totalBudget * (ratio / totalRatio))
    })
    
    console.log('💰 Budget allocation:', allocation)
    return allocation
  }

  // Calculate power requirement based on impedance and sensitivity
  const calculatePowerRequirement = (impedance: number | null, needsAmp: boolean | null): 'very-low' | 'low' | 'medium' | 'high' | 'unknown' => {
    if (needsAmp) return 'high'
    if (!impedance) return 'unknown'
    if (impedance >= 250) return 'high'
    if (impedance >= 150) return 'medium'  
    if (impedance >= 80) return 'low'
    return 'very-low'
  }

  // Calculate synergy score based on sound signature and usage
  const calculateSynergyScore = (headphone: Component, soundSig: string, primaryUsage: string | undefined): number => {
    let score = 0.5 // Base score
    
    // Sound signature matching
    if (headphone.sound_signature) {
      if (headphone.sound_signature === soundSig) score += 0.3
      else if (soundSig === 'neutral' && headphone.sound_signature === 'neutral') score += 0.2
    }
    
    // Usage case matching
    if (headphone.use_cases && primaryUsage) {
      const useCases = Array.isArray(headphone.use_cases) 
        ? headphone.use_cases 
        : (typeof headphone.use_cases === 'string' 
          ? headphone.use_cases.split(',').map((u: string) => u.trim().toLowerCase())
          : [])
      if (useCases.includes(primaryUsage.toLowerCase())) score += 0.2
    }
    
    return Math.min(1, score)
  }

  // Advanced headphone processing with audio specifications
  const processHeadphoneRecommendations = (headphones: Component[], budget: number, maxOptions: number): AudioComponent[] => {
    const primaryUsage = usageRanking[0]
    
    return headphones
      .map(h => ({
        ...h,
        avgPrice: ((h.price_used_min || 0) + (h.price_used_max || 0)) / 2,
        // Calculate power requirements (simplified)
        powerRequirement: calculatePowerRequirement(h.impedance, h.needs_amp),
        // Audio synergy score based on usage and sound signature
        synergyScore: calculateSynergyScore(h, soundSignature, primaryUsage)
      }))
      .filter((h, index, arr) => {
        // Remove duplicates
        const key = `${h.name}|${h.brand}`
        return arr.findIndex(item => `${item.name}|${item.brand}` === key) === index
      })
      .filter(h => {
        // More flexible price range to avoid gaps - show anything user might consider
        const minAcceptable = Math.max(10, budget * 0.15)  // Show very affordable options, min $10  
        const maxAcceptable = budget * 2.0  // Allow significant overage for quality items
        const isAffordable = (h.price_used_min || 0) <= budget * 1.2  // User can actually afford the minimum price
        const isReasonable = h.avgPrice <= maxAcceptable && h.avgPrice >= minAcceptable
        
        // Show if either affordable OR in reasonable range (to avoid gaps)
        return isAffordable || isReasonable
      })
      .sort((a, b) => {
        // Multi-factor scoring: price fit + synergy + specifications
        const aPriceFit = 1 - Math.abs(budget - a.avgPrice) / budget
        const bPriceFit = 1 - Math.abs(budget - b.avgPrice) / budget
        const aScore = aPriceFit * 0.6 + (a.synergyScore || 0.5) * 0.4
        const bScore = bPriceFit * 0.6 + (b.synergyScore || 0.5) * 0.4
        return bScore - aScore
      })
      .slice(0, maxOptions)
  }

  // Calculate compatibility between component and headphones
  const calculateCompatibilityScore = (component: Component, headphones: AudioComponent[], type: string): number => {
    if (headphones.length === 0) return 0.5 // Default when no headphones
    
    let score = 0.5 // Base score
    let matchCount = 0
    
    headphones.forEach(h => {
      let headphoneScore = 0.5
      
      // Impedance and power matching for amps
      if (type === 'amp' || type === 'combo') {
        if (h.impedance && typeof h.impedance === 'number') {
          // High impedance headphones need powerful amps
          if (h.impedance >= 250) {
            headphoneScore += 0.3 // Assume this amp can handle high impedance
          } else if (h.impedance >= 150) {
            headphoneScore += 0.2 // Medium impedance
          } else if (h.impedance < 80) {
            headphoneScore += 0.1 // Low impedance is easier to drive
          }
        }
      }
      
      // Sound signature synergy
      if (component.sound_signature && h.sound_signature) {
        if (component.sound_signature === h.sound_signature) {
          headphoneScore += 0.15
        } else if (
          (component.sound_signature === 'warm' && h.sound_signature === 'bright') ||
          (component.sound_signature === 'bright' && h.sound_signature === 'warm')
        ) {
          headphoneScore += 0.1 // Complementary signatures can work well
        }
      }
      
      score += headphoneScore
      matchCount++
    })
    
    return matchCount > 0 ? Math.min(1, score / matchCount) : 0.5
  }
  
  // Calculate power adequacy for driving headphones effectively
  const calculatePowerAdequacy = (component: Component, headphones: AudioComponent[], type: string): number => {
    if (headphones.length === 0) return 0.5
    if (type === 'dac') return 0.5 // DACs don't have power output
    
    let adequacyScore = 0
    let headphoneCount = 0
    
    headphones.forEach(h => {
      headphoneCount++
      
      // For unknown specs, give middle score
      if (!h.impedance || typeof h.impedance !== 'number') {
        adequacyScore += 0.5
        return
      }
      
      // Calculate recommended power based on impedance
      let recommendedPower = 10 // Base requirement
      
      if (h.impedance >= 300) recommendedPower = 250
      else if (h.impedance >= 150) recommendedPower = 100
      else if (h.impedance >= 80) recommendedPower = 50
      else if (h.impedance >= 32) recommendedPower = 25
      
      // Assume reasonable power output for scoring (would ideally come from specs)
      const assumedPowerOutput = type === 'combo' ? 100 : type === 'amp' ? 150 : 0
      
      if (assumedPowerOutput === 0) {
        adequacyScore += 0.5
        return
      }
      
      // Score based on power adequacy
      const powerRatio = assumedPowerOutput / recommendedPower
      
      if (powerRatio >= 2) adequacyScore += 1 // More than enough power
      else if (powerRatio >= 1) adequacyScore += 0.8 // Adequate power
      else if (powerRatio >= 0.5) adequacyScore += 0.6 // Somewhat adequate
      else if (powerRatio >= 0.25) adequacyScore += 0.3 // Barely adequate
      else adequacyScore += 0.1 // Insufficient power
    })
    
    return headphoneCount > 0 ? adequacyScore / headphoneCount : 0.5
  }

  // Process any audio component with impedance and power matching
  const processAudioComponents = (components: Component[], budget: number, headphones: AudioComponent[], type: string, maxOptions: number): AudioComponent[] => {
    return components
      .map(c => ({
        ...c,
        avgPrice: ((c.price_used_min || 0) + (c.price_used_max || 0)) / 2,
        // Calculate compatibility with headphones
        compatibilityScore: calculateCompatibilityScore(c, headphones, type),
        // Calculate power adequacy for headphones
        powerAdequacy: calculatePowerAdequacy(c, headphones, type)
      }))
      .filter((c, index, arr) => {
        // Remove duplicates
        const key = `${c.name}|${c.brand}`
        return arr.findIndex(item => `${item.name}|${item.brand}` === key) === index
      })
      .filter(c => {
        // Filter to show items in a reasonable price range for the budget
        const minAcceptable = budget * 0.3  // Don't show items too cheap
        const maxAcceptable = budget * 1.5  // Allow some overage for great matches
        return c.avgPrice >= minAcceptable && c.avgPrice <= maxAcceptable
      })
      .sort((a, b) => {
        // Multi-factor scoring: price fit + compatibility + power adequacy
        const aPriceFit = 1 - Math.abs(budget - a.avgPrice) / budget
        const bPriceFit = 1 - Math.abs(budget - b.avgPrice) / budget
        const aScore = aPriceFit * 0.4 + (a.compatibilityScore || 0.5) * 0.3 + (a.powerAdequacy || 0.5) * 0.3
        const bScore = bPriceFit * 0.4 + (b.compatibilityScore || 0.5) * 0.3 + (b.powerAdequacy || 0.5) * 0.3
        return bScore - aScore
      })
      .slice(0, maxOptions)
  }

  // Fetch DACs with impedance matching and synergy
  const fetchDACs = async (budget: number, headphones: AudioComponent[], maxOptions: number): Promise<AudioComponent[]> => {
    const minPrice = Math.floor(budget * 0.6)  // At least 60% of budget
    const maxPrice = Math.floor(budget * 1.5)  // Up to 150% of budget
    
    const { data: dacs, error } = await supabase
      .from('components')
      .select('*')
      .eq('category', 'dac')
      .lte('price_used_min', maxPrice)
      .gte('price_used_min', minPrice * 0.5)
      .order('price_used_min', { ascending: true })
      .limit(maxOptions * 3)
    
    if (error) {
      console.error('DAC query error:', error)
      return []
    }
    
    return processAudioComponents(dacs || [], budget, headphones, 'dac', maxOptions)
  }

  // Fetch AMPs with power matching  
  const fetchAMPs = async (budget: number, headphones: AudioComponent[], maxOptions: number): Promise<AudioComponent[]> => {
    const minPrice = Math.floor(budget * 0.6)  // At least 60% of budget
    const maxPrice = Math.floor(budget * 1.5)  // Up to 150% of budget
    
    const { data: amps, error } = await supabase
      .from('components')
      .select('*')
      .eq('category', 'amp')
      .lte('price_used_min', maxPrice)
      .gte('price_used_min', minPrice * 0.5)
      .order('price_used_min', { ascending: true })
      .limit(maxOptions * 3)
    
    if (error) {
      console.error('AMP query error:', error)
      return []
    }
    
    return processAudioComponents(amps || [], budget, headphones, 'amp', maxOptions)
  }

  // Fetch combo units with complete system matching
  const fetchCombos = async (budget: number, headphones: AudioComponent[], maxOptions: number): Promise<AudioComponent[]> => {
    const minPrice = Math.floor(budget * 0.6)  // At least 60% of budget  
    const maxPrice = Math.floor(budget * 1.5)  // Up to 150% of budget
    
    const { data: combos, error } = await supabase
      .from('components')
      .select('*')
      .eq('category', 'dac_amp')
      .lte('price_used_min', maxPrice)
      .gte('price_used_min', minPrice * 0.5)
      .order('price_used_min', { ascending: true })
      .limit(maxOptions * 3)
    
    if (error) {
      console.error('Combo query error:', error)
      return []
    }
    
    return processAudioComponents(combos || [], budget, headphones, 'combo', maxOptions)
  }

  // Main recommendation fetching logic
  useEffect(() => {
    const fetchRecommendations = async () => {
      console.log('🎯 SYSTEM BUILDER ACTIVE - Building recommendations based on:', wantRecommendationsFor)
      
      // Limit options based on experience level
      const maxOptions = experience === 'beginner' ? 3 : experience === 'intermediate' ? 5 : 10
      
      // SYSTEM BUILDER APPROACH: Allocate budget intelligently across requested components
      const requestedComponents = Object.entries(wantRecommendationsFor)
        .filter(([, wanted]) => wanted)
        .map(([component]) => component)
      
      console.log(`💰 Allocating $${budget} budget across:`, requestedComponents)
      
      // Smart budget allocation based on component priorities and typical price ratios
      const budgetAllocation = allocateBudgetAcrossComponents(budget, requestedComponents, existingGear)
      console.log('📊 Budget allocation:', budgetAllocation)
      
      // Fetch recommendations for each requested component type
      let finalHeadphones: AudioComponent[] = []
      let finalDacs: AudioComponent[] = []  
      let finalAmps: AudioComponent[] = []
      let finalDacAmps: AudioComponent[] = []
      
      // HEADPHONES - If requested (allow upgrades even if owned)
      if (wantRecommendationsFor.headphones) {
        const headphoneBudget = budgetAllocation.headphones || budget
        // More inclusive price range to avoid gaps
        const maxBudgetLimit = Math.floor(headphoneBudget * 1.5)  // Allow up to 50% over budget
        const minBudgetLimit = Math.max(10, Math.floor(headphoneBudget * 0.3))  // At least 30% of budget, min $10
        
        console.log(`🎧 Fetching headphones with budget: $${headphoneBudget} (inclusive range: $${minBudgetLimit}-$${maxBudgetLimit})`)
        
        // Get a broader range of items to avoid gaps
        const { data: headphonesData, error: headphonesError } = await supabase
          .from('components')
          .select('*')
          .eq('category', headphoneType)
          .or(`price_used_min.lte.${maxBudgetLimit},price_used_max.gte.${minBudgetLimit}`)  // Items user can afford OR reasonable range
          .order('price_used_min', { ascending: true })
          .limit(maxOptions * 5)  // Get more options for better filtering
        
        if (headphonesError && Object.keys(headphonesError).length > 0) {
          console.error('Headphones query error:', headphonesError)
          console.error('Query details - category:', headphoneType, 'maxBudgetLimit:', maxBudgetLimit, 'minBudgetLimit:', minBudgetLimit)
        } else {
          console.log(`📊 Found ${headphonesData?.length || 0} headphones in database query`)
          console.log('Sample prices:', headphonesData?.slice(0, 3).map(h => `${h.name}: $${h.price_used_min}-${h.price_used_max}`))
          
          // Advanced headphone filtering with audio specifications
          finalHeadphones = processHeadphoneRecommendations(headphonesData || [], headphoneBudget, maxOptions)
          
          console.log(`✅ After processing: ${finalHeadphones.length} headphones selected`)
          console.log('Final selections:', finalHeadphones.map(h => `${h.name}: $${h.avgPrice?.toFixed(0)}`))
        }
      }
      
      // DAC RECOMMENDATIONS - If requested (allow upgrades even if owned)
      if (wantRecommendationsFor.dac) {
        const dacBudget = budgetAllocation.dac || budget * 0.2
        console.log(`🔄 Fetching DACs with budget: $${dacBudget}`)
        
        finalDacs = await fetchDACs(dacBudget, finalHeadphones, maxOptions)
      }
      
      // AMP RECOMMENDATIONS - If requested (allow upgrades even if owned)  
      if (wantRecommendationsFor.amp) {
        const ampBudget = budgetAllocation.amp || budget * 0.25
        console.log(`⚡ Fetching AMPs with budget: $${ampBudget}`)
        
        finalAmps = await fetchAMPs(ampBudget, finalHeadphones, maxOptions)
      }
      
      // COMBO RECOMMENDATIONS - If requested (allow upgrades even if owned)
      if (wantRecommendationsFor.combo) {
        const comboBudget = budgetAllocation.combo || budget * 0.4
        console.log(`🎯 Fetching DAC/AMP combos with budget: $${comboBudget}`)
        
        finalDacAmps = await fetchCombos(comboBudget, finalHeadphones, maxOptions)
      }
      
      // Determine if amplification is needed based on headphones
      const needsAmplification = finalHeadphones.some(h => {
        if (h.needs_amp === true) return true
        if (h.impedance && typeof h.impedance === 'number' && h.impedance >= 150) return true
        return false
      })
      
      // Auto-suggest amplification if needed and not already covered
      if (needsAmplification && !((existingGear.dac && existingGear.amp) || existingGear.combo)) {
        console.log('🔊 High impedance headphones detected - amplification recommended')
        
        // If user hasn't requested amp gear, add basic suggestions
        if (!wantRecommendationsFor.amp && !wantRecommendationsFor.combo && !wantRecommendationsFor.dac) {
          const ampBudget = Math.min(300, budget * 0.3)
          const suggestedAmps = await fetchAMPs(ampBudget, finalHeadphones, 3)
          
          if (suggestedAmps.length > 0) {
            finalAmps = [...finalAmps, ...suggestedAmps]
          }
        }
      }
      
      // Set final recommendations
      setHeadphones(finalHeadphones)
      setDacs(finalDacs)
      setAmps(finalAmps)
      setDacAmps(finalDacAmps)
      setShowAmplification(needsAmplification)
      
      console.log('🎯 System builder recommendations complete:', {
        headphones: finalHeadphones.length,
        dacs: finalDacs.length,
        amps: finalAmps.length,
        combos: finalDacAmps.length,
        needsAmplification
      })
      
      setLoading(false)
    }

    fetchRecommendations()
  }, [budget, headphoneType, wantRecommendationsFor, existingGear, usage, soundSignature, experience, usageRanking])

  // Used listings fetch effect
  useEffect(() => {
    const fetchUsedListings = async () => {
      if (!showUsedMarket) return
      
      const allComponents = [...headphones, ...dacs, ...amps, ...dacAmps]
      const componentIds = allComponents.map(c => c.id)
      
      console.log('Fetching used listings for components:', componentIds.length)
      
      if (componentIds.length === 0) return
      
      const { data: listings, error } = await supabase
        .from('used_listings')
        .select('*')
        .in('component_id', componentIds)
        .order('price', { ascending: true })
        .limit(100)
      
      if (error) {
        console.error('Error fetching used listings:', error)
        return
      }
      
      console.log('Fetched listings:', listings?.length || 0)
      
      // Group listings by component ID
      const groupedListings: {[componentId: string]: UsedListing[]} = {}
      listings?.forEach(listing => {
        if (!groupedListings[listing.component_id]) {
          groupedListings[listing.component_id] = []
        }
        groupedListings[listing.component_id].push(listing)
      })
      
      console.log('Grouped listings:', Object.keys(groupedListings).length, 'components with listings')
      setUsedListings(groupedListings)
    }
    
    fetchUsedListings()
  }, [showUsedMarket, headphones, dacs, amps, dacAmps])

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

  // Dynamic description based on experience level
  const getDescription = () => {
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

  // Budget gradient color
  const getBudgetGradient = () => {
    if (budget <= 100) return 'from-green-400 to-green-600'
    if (budget <= 500) return 'from-blue-400 to-blue-600'
    if (budget <= 1500) return 'from-purple-400 to-purple-600'
    if (budget <= 5000) return 'from-orange-400 to-orange-600'
    return 'from-red-400 to-red-600'
  }

  if (loading) {
    return (
      <div className="page-container flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mb-4"></div>
          <p className="text-secondary">Building your personalized recommendations...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page-container">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h1 className="heading-1 mb-4">
            Your Audio System Recommendations
          </h1>
          <p className="text-lg text-secondary max-w-3xl mx-auto">
            {getDescription()}
          </p>
        </div>

        {/* Budget Control */}
        <div className="card mb-10">
          <div className="flex items-center justify-between mb-4">
            <h3 className="heading-4">Budget Control</h3>
            <div className="flex items-center gap-4">
              <div className="relative">
                <span className="text-sm text-gray-500">Budget</span>
                <input
                  type="text"
                  value={budgetInputValue}
                  onChange={(e) => handleBudgetInputChange(e.target.value)}
                  onFocus={handleBudgetInputFocus}
                  onBlur={handleBudgetInputBlur}
                  className="block w-24 text-right text-lg font-semibold border-0 border-b-2 border-gray-300 focus:border-blue-500 focus:ring-0 bg-transparent"
                  placeholder={budget.toString()}
                />
                {budgetError && (
                  <p className="absolute top-full mt-1 text-xs text-red-600">{budgetError}</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="relative mb-6">
            <input
              type="range"
              min="0"
              max="100"
              value={budgetToSlider(budget)}
              onChange={(e) => handleBudgetSliderChange(parseInt(e.target.value))}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #3B82F6 0%, #3B82F6 ${budgetToSlider(budget)}%, #E5E7EB ${budgetToSlider(budget)}%, #E5E7EB 100%)`
              }}
            />
            
            <div className="flex justify-between text-sm text-gray-500 mt-2">
              <span>$20</span>
              <span className={`px-3 py-1 rounded-full text-white font-medium bg-gradient-to-r ${getBudgetGradient()}`}>
                ${formatBudget(budget)}
              </span>
              <span>$10,000</span>
            </div>
          </div>
        </div>

        {/* System Overview */}
        {(selectedHeadphoneItems.length > 0 || selectedDacItems.length > 0 || selectedAmpItems.length > 0 || selectedDacAmpItems.length > 0) && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border-l-4 border-blue-500">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Your Selected System</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {selectedHeadphoneItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">${Math.round(((item.price_used_min || 0) + (item.price_used_max || 0)) / 2)}</p>
                  </div>
                </div>
              ))}
              {selectedDacItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">${Math.round(((item.price_used_min || 0) + (item.price_used_max || 0)) / 2)}</p>
                  </div>
                </div>
              ))}
              {selectedAmpItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">${Math.round(((item.price_used_min || 0) + (item.price_used_max || 0)) / 2)}</p>
                  </div>
                </div>
              ))}
              {selectedDacAmpItems.map(item => (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <div>
                    <p className="font-medium text-sm text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">${Math.round(((item.price_used_min || 0) + (item.price_used_max || 0)) / 2)}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">Total System Cost:</p>
              <p className="text-lg font-semibold text-gray-900">
                ${Math.round(totalSelectedPrice).toLocaleString()}
                <span className={`ml-2 text-sm ${totalSelectedPrice <= budget ? 'text-green-600' : 'text-red-600'}`}>
                  ({totalSelectedPrice <= budget ? 'Under' : 'Over'} budget by ${Math.abs(totalSelectedPrice - budget).toLocaleString()})
                </span>
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-10">
          {/* Headphones Section */}
          {wantRecommendationsFor.headphones && headphones.length > 0 && (
            <div className="card overflow-hidden">
              <div className="bg-accent-light px-6 py-4 border-b border-stroke">
                <h2 className="heading-3 flex items-center gap-2">
                  🎧 Headphones
                  <span className="text-sm font-normal text-secondary">({headphones.length} options)</span>
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
                      <span className="text-sm font-medium text-accent">
                        ${headphone.price_used_min}-${headphone.price_used_max}
                      </span>
                    </div>
                    <p className="text-sm text-secondary mb-2">{headphone.brand}</p>
                    
                    {shouldShowTechnicalSpecs() && (
                      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500">
                        {headphone.impedance && (
                          <div>Impedance: {headphone.impedance}Ω</div>
                        )}
                        {headphone.sound_signature && (
                          <div>Sound: {headphone.sound_signature}</div>
                        )}
                        {headphone.powerRequirement && (
                          <div>Power: {headphone.powerRequirement}</div>
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
                <h2 className="heading-3 flex items-center gap-2">
                  🔄 DACs
                  <span className="text-sm font-normal text-secondary">({dacs.length} options)</span>
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
                      <span className="text-sm font-medium text-success">
                        ${dac.price_used_min}-${dac.price_used_max}
                      </span>
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
                <h2 className="heading-3 flex items-center gap-2">
                  ⚡ Amplifiers
                  <span className="text-sm font-normal text-secondary">({amps.length} options)</span>
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
                      <span className="text-sm font-medium text-warning">
                        ${amp.price_used_min}-${amp.price_used_max}
                      </span>
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
                <h2 className="heading-3 flex items-center gap-2">
                  🎯 DAC/Amp Combos
                  <span className="text-sm font-normal text-secondary">({dacAmps.length} options)</span>
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
                      <span className="text-sm font-medium text-accent">
                        ${combo.price_used_min}-${combo.price_used_max}
                      </span>
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
            <h2 className="heading-2 text-center">Used Market Listings</h2>
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
            ← Adjust Your Preferences
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function RecommendationsPage() {
  return (
    <Suspense fallback={
      <div className="page-container flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent"></div>
      </div>
    }>
      <RecommendationsContent />
    </Suspense>
  )
}