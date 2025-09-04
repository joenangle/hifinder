'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'

// Types
interface Preferences {
  experience: string
  budget: number
  budgetRange: {
    minPercent: number  // Percentage below budget (e.g., 20 for -20%)
    maxPercent: number  // Percentage above budget (e.g., 10 for +10%)
  }
  headphoneType: string
  wantRecommendationsFor: {
    headphones: boolean
    dac: boolean
    amp: boolean
    combo: boolean
  }
  existingGear: {
    headphones: boolean
    dac: boolean
    amp: boolean
    combo: boolean
    specificModels: {
      headphones: string
      dac: string
      amp: string
      combo: string
    }
  }
  // DAC/Amp specific preferences
  powerNeeds: string // 'low', 'medium', 'high', 'unknown'
  connectivity: string[] // ['usb', 'optical', 'coaxial', 'balanced', 'rca']
  usageContext: string // 'desktop', 'portable', 'both'
  existingHeadphones: string // For amp/dac buyers - what headphones they'll drive
  optimizeAroundHeadphones: string // For users with existing headphones - which ones to optimize for
  
  usage: string
  usageRanking: string[]
  excludedUsages: string[]
  soundSignature: string
}

// Usage Ranking Component  
interface UsageRankingStepProps {
  preferences: Preferences
  setPreferences: (prefs: Preferences) => void
}

function UsageRankingStep({ preferences, setPreferences }: UsageRankingStepProps) {
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    if (draggedIndex === null) return

    const newRanking = [...preferences.usageRanking]
    const draggedItem = newRanking[draggedIndex]
    
    // Remove dragged item
    newRanking.splice(draggedIndex, 1)
    // Insert at new position
    newRanking.splice(dropIndex, 0, draggedItem)

    setPreferences({
      ...preferences,
      usageRanking: newRanking,
      usage: newRanking[0].toLowerCase() // Keep primary as first item
    })

    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const moveItem = (fromIndex: number, toIndex: number) => {
    const newRanking = [...preferences.usageRanking]
    const item = newRanking.splice(fromIndex, 1)[0]
    newRanking.splice(toIndex, 0, item)
    
    setPreferences({
      ...preferences,
      usageRanking: newRanking,
      usage: newRanking[0].toLowerCase()
    })
  }

  const excludeUseCase = (useCase: string) => {
    const newRanking = preferences.usageRanking.filter(u => u !== useCase)
    const newExcluded = [...preferences.excludedUsages, useCase]
    
    setPreferences({
      ...preferences,
      usageRanking: newRanking,
      excludedUsages: newExcluded,
      usage: newRanking.length > 0 ? newRanking[0].toLowerCase() : ''
    })
  }

  const includeUseCase = (useCase: string) => {
    const newExcluded = preferences.excludedUsages.filter(u => u !== useCase)
    const newRanking = [...preferences.usageRanking, useCase]
    
    setPreferences({
      ...preferences,
      usageRanking: newRanking,
      excludedUsages: newExcluded,
      usage: newRanking[0].toLowerCase()
    })
  }

  const getRankLabel = (index: number) => {
    switch(index) {
      case 0: return 'Primary'
      case 1: return 'Secondary' 
      case 2: return 'Occasional'
      case 3: return 'Rare'
      default: return ''
    }
  }

  return (
    <div>
      <h2 className="heading-2 mb-4">Rank your use cases</h2>
      <p className="text-secondary mb-16">
        Drag to reorder by priority, or use the arrow buttons
      </p>
      
      <div className="space-y-8">
        {preferences.usageRanking.map((use, index) => (
          <div
            key={use}
            draggable
            onDragStart={(e) => handleDragStart(e, index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            className={`
              flex items-center justify-between p-4 rounded-lg border-2 cursor-move
              ${dragOverIndex === index ? 'border-accent bg-accent-subtle' : 'border-default bg-tertiary'}
              ${draggedIndex === index ? 'opacity-50' : ''}
              ${index === 0 ? 'border-accent bg-accent-subtle' : ''}
              hover:border-accent transition-all touch-manipulation
            `}
          >
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center text-xs text-tertiary min-w-[60px]">
                <span className="font-medium">{getRankLabel(index)}</span>
                <span>#{index + 1}</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="text-tertiary">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="font-medium text-primary">{use}</span>
              </div>
            </div>

            {/* Control buttons */}
            <div className="flex gap-1">
              <button
                onClick={() => index > 0 && moveItem(index, index - 1)}
                disabled={index === 0}
                className="p-2 rounded text-tertiary hover:text-primary hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation"
                aria-label="Move up"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 2l-4 4h8l-4-4zM8 14l-4-4h8l-4 4z" />
                </svg>
              </button>
              <button
                onClick={() => index < preferences.usageRanking.length - 1 && moveItem(index, index + 1)}
                disabled={index === preferences.usageRanking.length - 1}
                className="p-2 rounded text-tertiary hover:text-primary hover:bg-secondary disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation"
                aria-label="Move down"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" transform="rotate(180)">
                  <path d="M8 2l-4 4h8l-4-4zM8 14l-4-4h8l-4 4z" />
                </svg>
              </button>
              <button
                onClick={() => excludeUseCase(use)}
                className="p-2 rounded text-error hover:text-error hover:bg-error-light touch-manipulation"
                aria-label="Exclude this use case"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M4 4l8 8m0-8l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Excluded use cases */}
      {preferences.excludedUsages.length > 0 && (
        <div className="mt-6">
          <h3 className="text-lg font-medium text-secondary mb-3">Excluded Use Cases</h3>
          <div className="space-y-8">
            {preferences.excludedUsages.map(excludedUse => (
              <div
                key={excludedUse}
                className="flex items-center justify-between p-3 rounded-lg border border-error bg-error-light"
              >
                <div className="flex items-center gap-3">
                  <div className="text-error">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M4 4l8 8m0-8l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <span className="text-secondary line-through">{excludedUse}</span>
                </div>
                <button
                  onClick={() => includeUseCase(excludedUse)}
                  className="button button-secondary text-sm"
                >
                  Include
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card mt-6">
        <p className="text-sm text-secondary">
          💡 <strong>Your primary use case</strong> will have the most influence on recommendations. 
          Secondary and occasional uses are also considered, while excluded uses are ignored.
        </p>
      </div>
    </div>
  )
}

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [preferences, setPreferences] = useState({
    experience: '',
    budget: 100,
    budgetRange: {
      minPercent: 20, // Default -20% below budget
      maxPercent: 10  // Default +10% above budget
    },
    headphoneType: '',
    wantRecommendationsFor: {
      headphones: true,
      dac: false,
      amp: false,
      combo: false
    },
    existingGear: {
      headphones: false,
      dac: false,
      amp: false,
      combo: false,
      specificModels: {
        headphones: '',
        dac: '',
        amp: '',
        combo: ''
      }
    },
    // DAC/Amp specific preferences
    powerNeeds: '',
    connectivity: [] as string[],
    usageContext: '',
    existingHeadphones: '',
    optimizeAroundHeadphones: '',
    
    usage: '',
    usageRanking: [] as string[],
    excludedUsages: [] as string[],
    soundSignature: ''
  })
  const [budgetInputValue, setBudgetInputValue] = useState('100')
  const [budgetError, setBudgetError] = useState('')
  const [isDragging, setIsDragging] = useState(false)
  
  // Headphone selection state
  const [brands, setBrands] = useState<string[]>([])
  const [models, setModels] = useState<{[brand: string]: string[]}>({})
  const [selectedBrand, setSelectedBrand] = useState('')
  const [selectedModel, setSelectedModel] = useState('')
  const [loadingBrands, setLoadingBrands] = useState(false)
  const [loadingModels, setLoadingModels] = useState(false)
  
  // Optimization headphone selection state (for existing headphones)
  const [optimizeBrands, setOptimizeBrands] = useState<string[]>([])
  const [optimizeModels, setOptimizeModels] = useState<{[brand: string]: string[]}>({})
  const [selectedOptimizeBrand, setSelectedOptimizeBrand] = useState('')
  const [selectedOptimizeModel, setSelectedOptimizeModel] = useState('')
  const [loadingOptimizeBrands, setLoadingOptimizeBrands] = useState(false)
  const [loadingOptimizeModels, setLoadingOptimizeModels] = useState(false)
  
  const router = useRouter()

// Fetch brands when needed
useEffect(() => {
  // Fetch brands for DAC/amp questions
  if (step === 5 && needsAmpDacQuestions()) {
    fetchBrands()
  }
  // Fetch brands for existing headphone optimization
  if (step === 4 && hasExistingHeadphones() && needsHeadphoneQuestions()) {
    fetchOptimizeBrands()
  }
}, [step])

// Helper functions to determine which questions to show
const needsHeadphoneQuestions = () => {
  return preferences.wantRecommendationsFor.headphones || preferences.wantRecommendationsFor.combo
}

const hasExistingHeadphones = () => {
  return preferences.existingGear.headphones
}

const needsAmpDacQuestions = () => {
  return preferences.wantRecommendationsFor.dac || preferences.wantRecommendationsFor.amp || preferences.wantRecommendationsFor.combo
}

// Fetch headphone brands from Supabase
const fetchBrands = async () => {
  if (brands.length > 0) return // Already loaded
  
  setLoadingBrands(true)
  try {
    const { data, error } = await supabase
      .from('components')
      .select('brand')
      .in('category', ['cans', 'iems'])
      .order('brand')
    
    if (error) throw error
    
    const uniqueBrands = [...new Set(data.map(item => item.brand))].filter(Boolean)
    setBrands(uniqueBrands)
  } catch (error) {
    console.error('Error fetching brands:', error)
  } finally {
    setLoadingBrands(false)
  }
}

// Fetch models for a specific brand
const fetchModels = async (brand: string) => {
  if (models[brand]) return // Already loaded for this brand
  
  setLoadingModels(true)
  try {
    const { data, error } = await supabase
      .from('components')
      .select('name')
      .eq('brand', brand)
      .in('category', ['cans', 'iems'])
      .order('name')
    
    if (error) throw error
    
    const brandModels = data.map(item => item.name).filter(Boolean)
    setModels(prev => ({ ...prev, [brand]: brandModels }))
  } catch (error) {
    console.error('Error fetching models:', error)
  } finally {
    setLoadingModels(false)
  }
}

// Handle brand selection
const handleBrandSelect = (brand: string) => {
  setSelectedBrand(brand)
  setSelectedModel('') // Reset model selection
  if (brand) {
    fetchModels(brand)
  }
}

// Handle model selection and update preferences
const handleModelSelect = (model: string) => {
  setSelectedModel(model)
  const fullName = selectedBrand && model ? `${selectedBrand} ${model}` : ''
  setPreferences({...preferences, existingHeadphones: fullName})
}

// Fetch brands for optimization headphones
const fetchOptimizeBrands = async () => {
  if (optimizeBrands.length > 0) return // Already loaded
  
  setLoadingOptimizeBrands(true)
  try {
    const { data, error } = await supabase
      .from('components')
      .select('brand')
      .in('category', ['cans', 'iems'])
      .order('brand')
    
    if (error) throw error
    
    const uniqueBrands = [...new Set(data.map(item => item.brand))].filter(Boolean)
    setOptimizeBrands(uniqueBrands)
  } catch (error) {
    console.error('Error fetching optimize brands:', error)
  } finally {
    setLoadingOptimizeBrands(false)
  }
}

// Fetch models for optimization brand
const fetchOptimizeModels = async (brand: string) => {
  if (optimizeModels[brand]) return // Already loaded for this brand
  
  setLoadingOptimizeModels(true)
  try {
    const { data, error } = await supabase
      .from('components')
      .select('name')
      .eq('brand', brand)
      .in('category', ['cans', 'iems'])
      .order('name')
    
    if (error) throw error
    
    const brandModels = data.map(item => item.name).filter(Boolean)
    setOptimizeModels(prev => ({ ...prev, [brand]: brandModels }))
  } catch (error) {
    console.error('Error fetching optimize models:', error)
  } finally {
    setLoadingOptimizeModels(false)
  }
}

// Handle optimization brand selection
const handleOptimizeBrandSelect = (brand: string) => {
  setSelectedOptimizeBrand(brand)
  setSelectedOptimizeModel('') // Reset model selection
  if (brand) {
    fetchOptimizeModels(brand)
  }
}

// Handle optimization model selection
const handleOptimizeModelSelect = (model: string) => {
  setSelectedOptimizeModel(model)
  const fullName = selectedOptimizeBrand && model ? `${selectedOptimizeBrand} ${model}` : ''
  setPreferences({...preferences, optimizeAroundHeadphones: fullName})
}

// Format budget with US comma styling
const formatBudget = (budget: number) => {
  return budget.toLocaleString('en-US')
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

// Convert linear slider position to logarithmic budget value
const sliderToBudget = (sliderValue: number) => {
  // Slider range: 0-100, Budget range: $20-$10000
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
  setPreferences({...preferences, budget: newBudget})
  setBudgetInputValue(newBudget.toString())
  setBudgetError('')
}

const handleBudgetSliderMouseDown = () => {
  setIsDragging(true)
}

const handleBudgetSliderMouseUp = () => {
  setIsDragging(false)
}

const handleBudgetInputFocus = () => {
  setBudgetInputValue('')
}

const handleBudgetInputBlur = () => {
  if (budgetInputValue === '') {
    setBudgetInputValue(preferences.budget.toString())
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
  setPreferences({...preferences, budget: numValue})
}

const isStepValid = () => {
  switch (step) {
    case 1: return !!preferences.experience
    case 2: return Object.values(preferences.wantRecommendationsFor).some(v => v) // At least one component selected
    case 3: return true // Existing gear can be all false (starting fresh)
    case 4: 
      // If headphones selected AND they have existing headphones, validate optimization selection
      if (needsHeadphoneQuestions() && hasExistingHeadphones()) {
        return !!preferences.optimizeAroundHeadphones
      }
      // If headphones selected but no existing headphones, validate headphone type
      return needsHeadphoneQuestions() ? !!preferences.headphoneType : true
    case 5: return true // Budget always has default value
    case 6: return true // Basic requirements are set with defaults
    default: return false
  }
}

const getMaxSteps = () => {
  // New streamlined flow: 1(experience) + 2(components) + 3(existing gear) + 4(headphone type/optimization) + 5(setup) + 6(usage & sound) = 6 steps
  let maxSteps = 6
  
  // Step 4 only shows if headphones are selected
  if (!needsHeadphoneQuestions()) {
    maxSteps -= 1 // Skip headphone step
  }
  
  return maxSteps
}

const getActualStepNumber = () => {
  // Calculate actual step number for progress display
  let actualStep = step
  
  // If we're past step 4 but don't need headphone questions, subtract 1
  if (step > 4 && !needsHeadphoneQuestions()) {
    actualStep -= 1
  }
  
  // If we're past step 5 but don't need amp/dac questions, subtract 1
  if (step > 5 && !needsAmpDacQuestions()) {
    actualStep -= 1
  }
  
  // If we're past step 9 but don't need headphone questions, subtract 1
  if (step > 9 && !needsHeadphoneQuestions()) {
    actualStep -= 1
  }
  
  return actualStep
}

const handleNext = () => {
  if (!isStepValid()) return
  
  let nextStep = step + 1
  
  // Skip logic for streamlined flow
  if (step === 3 && !needsHeadphoneQuestions()) {
    nextStep = 5 // Skip headphone type step (4) to setup step (5)
  }
  
  if (nextStep <= getMaxSteps()) {
    setStep(nextStep)
  } else {
    // Navigate to recommendations with all preferences
    const params = new URLSearchParams({
      experience: preferences.experience,
      budget: preferences.budget.toString(),
      budgetRangeMin: preferences.budgetRange.minPercent.toString(),
      budgetRangeMax: preferences.budgetRange.maxPercent.toString(),
      headphoneType: preferences.headphoneType,
      powerNeeds: preferences.powerNeeds,
      connectivity: JSON.stringify(preferences.connectivity),
      usageContext: preferences.usageContext,
      existingHeadphones: preferences.existingHeadphones,
      optimizeAroundHeadphones: preferences.optimizeAroundHeadphones,
      wantRecommendationsFor: JSON.stringify(preferences.wantRecommendationsFor),
      existingGear: JSON.stringify(preferences.existingGear),
      usage: preferences.usage,
      usageRanking: JSON.stringify(preferences.usageRanking),
      excludedUsages: JSON.stringify(preferences.excludedUsages),
      sound: preferences.soundSignature
    })
    router.push(`/recommendations?${params.toString()}`)
  }
}

  return (
    <>
      <style jsx>{`
        /* Hide default slider thumb */
        .budget-slider::-webkit-slider-thumb {
          appearance: none;
          height: 0;
          width: 0;
        }
        .budget-slider::-moz-range-thumb {
          appearance: none;
          height: 0;
          width: 0;
          border: none;
          background: transparent;
        }
        .budget-slider::-ms-thumb {
          appearance: none;
          height: 0;
          width: 0;
        }
        
        /* Budget input container styling */
        .budget-input-container {
          position: relative;
          display: inline-block;
        }
        .currency-symbol {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          font-weight: bold;
          pointer-events: none;
          z-index: 1;
        }
      `}</style>
      <div className="page-container">
      <div className="max-w-2xl w-full mx-auto flex flex-col" style={{ minHeight: '100vh' }}>
        {/* Header with Home Link and Progress */}
        <div className="mb-4 pb-4 border-b border-subtle">
          <Link href="/" className="text-secondary hover:text-primary inline-flex items-center gap-2 text-sm mb-3">
            ← Back to Home
          </Link>
          
          {/* Progress Bar */}
          <div role="progressbar" aria-valuenow={getActualStepNumber()} aria-valuemin={1} aria-valuemax={getMaxSteps()} aria-label="Onboarding progress" className="mb-3">
            <div className="flex justify-between text-sm mb-2">
              <span>Step {getActualStepNumber()} of {getMaxSteps()}</span>
              <span>{Math.round((getActualStepNumber() / getMaxSteps()) * 100)}% Complete</span>
            </div>
            <div className="w-full bg-secondary rounded-full h-2">
              <div 
                className="bg-accent h-2 rounded-full transition-all"
                style={{ width: `${(getActualStepNumber() / getMaxSteps()) * 100}%` }}
                aria-label={`${Math.round((getActualStepNumber() / getMaxSteps()) * 100)}% complete`}
              />
            </div>
          </div>
          
          {/* Step Navigation */}
          <div className="flex justify-between">
            <button 
              onClick={() => setStep(Math.max(1, step - 1))}
              className={`button ${
                step === 1 
                  ? 'button-secondary' 
                  : 'button-secondary'
              }`}
              disabled={step === 1}
            >
              Back
            </button>
            
            <button 
              onClick={handleNext}
              disabled={!isStepValid()}
              className={`button ${
                isStepValid()
                  ? 'button-primary'
                  : 'button-secondary'
              }`}
            >
              {!isStepValid() && step === 1 ? 'Select Experience Level' :
               !isStepValid() && step === 2 ? 'Select Components' :
               !isStepValid() && step === 4 && needsHeadphoneQuestions() ? 'Select Headphone Type' :
               !isStepValid() && step === 5 ? 'Complete Setup Details' :
               !isStepValid() && step === 6 ? 'Complete Preferences' :
               step >= getMaxSteps() ? 'See Recommendations' : 'Next'}
            </button>
          </div>
        </div>

        {/* Main Content Area - Top aligned */}
        <div className="flex-1 flex items-start justify-center py-4">
          <div className="card animate-fadeIn w-full">
          {step === 1 && (
            <div role="group" aria-labelledby="experience-heading">
              <h2 id="experience-heading" className="heading-2 mb-3">What&apos;s your audio experience?</h2>
              <p className="text-secondary mb-4">This helps us recommend the right gear and explain things at your level</p>
              <div 
                role="radiogroup" 
                aria-labelledby="experience-heading"
                style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
              >
                {[
                  {
                    id: 'beginner',
                    title: '🌱 New to Audio',
                    description: 'I want to understand the basics',
                    examples: 'Currently using phone earbuds, confused by terminology'
                  },
                  {
                    id: 'intermediate',
                    title: '🎧 Some Experience', 
                    description: 'I know the basics, ready to upgrade',
                    examples: 'Owned a few headphones, understand impedance basics'
                  },
                  {
                    id: 'enthusiast',
                    title: '🔬 Audio Enthusiast',
                    description: 'I want detailed specs and options',
                    examples: 'Multiple headphones owned, understand measurements'
                  }
                ].map(option => (
                  <button 
                    key={option.id}
                    onClick={() => setPreferences({...preferences, experience: option.id})}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault()
                        setPreferences({...preferences, experience: option.id})
                      }
                    }}
                    className={`card-interactive p-3 ${
                      preferences.experience === option.id 
                        ? 'card-interactive-selected' 
                        : ''
                    }`}
                    style={{ padding: '0.75rem' }}
                    role="radio"
                    aria-checked={preferences.experience === option.id}
                    aria-describedby={`experience-${option.id}-desc`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="heading-3">{option.title}</h3>
                      {preferences.experience === option.id && <span className="text-accent">✓</span>}
                    </div>
                    <p className="text-secondary mb-2">{option.description}</p>
                    <p 
                      id={`experience-${option.id}-desc`}
                      className="text-sm text-tertiary italic"
                    >
                      {option.examples}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {step === 2 && (
            <div>
              <h2 className="heading-2 mb-4">What do you want recommendations for?</h2>
              <p className="text-secondary mb-6">Select the components you&apos;d like us to recommend for your system</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {[
                  {
                    key: 'headphones',
                    label: '🎧 Headphones/IEMs',
                    description: 'Over-ear headphones or in-ear monitors'
                  },
                  {
                    key: 'dac',
                    label: '🔄 Standalone DAC',
                    description: 'Digital-to-analog converter (separate unit)'
                  },
                  {
                    key: 'amp',
                    label: '⚡ Headphone Amplifier',
                    description: 'Dedicated headphone amplifier (separate unit)'
                  },
                  {
                    key: 'combo',
                    label: '🎯 DAC/Amp Combo',
                    description: 'All-in-one DAC and amplifier device'
                  }
                ].map(component => (
                  <div 
                    key={component.key}
                    className={`card-interactive flex items-center justify-between cursor-pointer ${
                      preferences.wantRecommendationsFor[component.key as keyof typeof preferences.wantRecommendationsFor]
                        ? 'card-interactive-selected'
                        : ''
                    }`}
                    onClick={() => setPreferences({
                      ...preferences,
                      wantRecommendationsFor: {
                        ...preferences.wantRecommendationsFor,
                        [component.key]: !preferences.wantRecommendationsFor[component.key as keyof typeof preferences.wantRecommendationsFor]
                      }
                    })}
                  >
                    <div>
                      <h3 className="font-semibold text-foreground">{component.label}</h3>
                      <p className="text-sm text-muted font-medium">{component.description}</p>
                    </div>
                    <div className="relative inline-flex items-center pointer-events-none">
                      <input
                        type="checkbox"
                        checked={preferences.wantRecommendationsFor[component.key as keyof typeof preferences.wantRecommendationsFor]}
                        onChange={() => {}} // Handled by parent div onClick
                        className="sr-only peer"
                        tabIndex={-1}
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {step === 3 && (
            <div>
              <h2 className="heading-2 mb-4">What gear do you already have?</h2>
              <p className="text-secondary mb-6">Check what you already own so we can focus your budget on what you need</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {[
                  {
                    key: 'headphones',
                    label: '🎧 Headphones/IEMs',
                    description: 'Any headphones or in-ear monitors you currently use'
                  },
                  {
                    key: 'dac',
                    label: '🔄 Standalone DAC',
                    description: 'Digital-to-analog converter (separate from amp)'
                  },
                  {
                    key: 'amp',
                    label: '⚡ Headphone Amplifier',
                    description: 'Dedicated headphone amp (separate from DAC)'
                  },
                  {
                    key: 'combo',
                    label: '🎯 DAC/Amp Combo Unit',
                    description: 'All-in-one DAC and amplifier device'
                  }
                ].map(component => (
                  <div 
                    key={component.key}
                    className={`card-interactive cursor-pointer ${
                      preferences.existingGear[component.key as keyof typeof preferences.existingGear]
                        ? 'card-interactive-selected'
                        : ''
                    }`}
                    onClick={() => setPreferences({
                      ...preferences,
                      existingGear: {
                        ...preferences.existingGear,
                        [component.key as keyof Omit<typeof preferences.existingGear, 'specificModels'>]: !preferences.existingGear[component.key as keyof Omit<typeof preferences.existingGear, 'specificModels'>]
                      }
                    })}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        checked={preferences.existingGear[component.key as keyof Omit<typeof preferences.existingGear, 'specificModels'>] as boolean}
                        onChange={() => {}} // Handled by parent div onClick
                        className="mt-1 w-5 h-5 text-accent bg-tertiary border-subtle rounded focus:ring-accent-subtle pointer-events-none"
                        tabIndex={-1}
                      />
                      <div className="flex-1">
                        <h3 className="font-semibold text-base mb-1">{component.label}</h3>
                        <p className="text-secondary text-sm">{component.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 bg-tertiary rounded-lg">
                <p className="text-sm text-tertiary">
                  💡 <strong>Don&apos;t have anything?</strong> Leave all unchecked and we&apos;ll recommend a complete setup within your budget.
                </p>
              </div>
            </div>
          )}
          
          {step === 4 && needsHeadphoneQuestions() && !hasExistingHeadphones() && (
            <div>
              <h2 className="heading-2 mb-6">What type of headphones do you prefer?</h2>
              <p className="text-secondary mb-8">Choose the style that appeals to you most</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {[
                  {
                    value: 'cans',
                    label: '🎧 Over/On-Ear Headphones',
                    description: 'Traditional headphones that go over or on your ears',
                    pros: 'Comfortable for long sessions, great soundstage, easy to drive'
                  },
                  {
                    value: 'iems', 
                    label: '🎵 In-Ear Monitors (IEMs)',
                    description: 'Earphones that go inside your ear canal',
                    pros: 'Portable, excellent isolation, detailed sound'
                  }
                ].map(option => (
                  <button 
                    key={option.value}
                    onClick={() => setPreferences({...preferences, headphoneType: option.value})}
                    className={`card-interactive ${
                      preferences.headphoneType === option.value 
                        ? 'card-interactive-selected' 
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="heading-3">{option.label}</h3>
                      {preferences.headphoneType === option.value && <span className="text-accent">✓</span>}
                    </div>
                    <p className="text-secondary mb-4">{option.description}</p>
                    <p className="text-sm text-tertiary italic">{option.pros}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {step === 4 && needsHeadphoneQuestions() && hasExistingHeadphones() && (
            <div>
              <h2 className="heading-2 mb-6">Which headphones do you want to optimize around?</h2>
              <p className="text-secondary mb-8">Since you have existing headphones, tell us which ones you want to build your system around</p>
              
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                  {/* Brand Selection */}
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-2">Brand</label>
                    <select
                      value={selectedOptimizeBrand}
                      onChange={(e) => handleOptimizeBrandSelect(e.target.value)}
                      disabled={loadingOptimizeBrands}
                      className="input w-full"
                    >
                      <option value="">
                        {loadingOptimizeBrands ? 'Loading brands...' : 'Select brand'}
                      </option>
                      {optimizeBrands.map(brand => (
                        <option key={brand} value={brand}>{brand}</option>
                      ))}
                    </select>
                  </div>
                  
                  {/* Model Selection */}
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-2">Model</label>
                    <select
                      value={selectedOptimizeModel}
                      onChange={(e) => handleOptimizeModelSelect(e.target.value)}
                      disabled={!selectedOptimizeBrand || loadingOptimizeModels}
                      className="input w-full"
                    >
                      <option value="">
                        {!selectedOptimizeBrand ? 'Select brand first' : 
                         loadingOptimizeModels ? 'Loading models...' : 
                         'Select model'}
                      </option>
                      {selectedOptimizeBrand && optimizeModels[selectedOptimizeBrand]?.map(model => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                {/* Selected headphones display */}
                {preferences.optimizeAroundHeadphones && (
                  <div className="p-4 bg-accent-subtle rounded-lg">
                    <p className="text-sm font-medium text-accent">
                      Optimizing around: {preferences.optimizeAroundHeadphones}
                    </p>
                    <p className="text-xs text-secondary mt-1">
                      We'll recommend DACs, amps, and other headphones that complement these
                    </p>
                  </div>
                )}
                
                {/* Manual entry fallback */}
                <div>
                  <details className="group">
                    <summary className="text-sm text-secondary cursor-pointer hover:text-primary">
                      Can't find your headphones? Enter manually
                    </summary>
                    <div className="mt-3">
                      <input 
                        type="text"
                        value={preferences.optimizeAroundHeadphones}
                        onChange={(e) => {
                          setPreferences({...preferences, optimizeAroundHeadphones: e.target.value})
                          // Clear selections when manually entering
                          setSelectedOptimizeBrand('')
                          setSelectedOptimizeModel('')
                        }}
                        className="input w-full"
                        placeholder="e.g., Sennheiser HD600, Beyerdynamic DT770, etc."
                      />
                    </div>
                  </details>
                </div>
              </div>
            </div>
          )}
          
          {step === 5 && (
            <div>
              <h2 className="heading-2 mb-4">Setup Details</h2>
              <p className="text-secondary mb-6">Let&apos;s configure your setup preferences</p>
              
              {/* Budget Section */}
              <div className="mb-8">
                <h3 className="heading-3 mb-4">What&apos;s your budget?</h3>
              <p className="text-secondary mb-8">We&apos;ll recommend gear that fits your budget (maximum $10,000 USD)</p>
              
              {/* Enhanced Budget Control */}
              <div className="card mb-8" style={{ minHeight: '140px', width: '100%', maxWidth: '100%' }}>
                <div className="relative" style={{ minHeight: '100px', width: '100%' }}>
                  {/* Budget Tier Labels */}
                  <div className="flex justify-between text-xs text-tertiary mb-3">
                    <span className={`text-center ${preferences.budget <= 100 ? 'font-bold text-primary' : ''}`} style={{ width: '60px' }}>Budget</span>
                    <span className={`text-center ${preferences.budget > 100 && preferences.budget <= 400 ? 'font-bold text-primary' : ''}`} style={{ width: '60px' }}>Entry</span>
                    <span className={`text-center ${preferences.budget > 400 && preferences.budget <= 1000 ? 'font-bold text-primary' : ''}`} style={{ width: '70px' }}>Mid Range</span>
                    <span className={`text-center ${preferences.budget > 1000 && preferences.budget <= 3000 ? 'font-bold text-primary' : ''}`} style={{ width: '60px' }}>High End</span>
                    <span className={`text-center ${preferences.budget > 3000 ? 'font-bold text-primary' : ''}`} style={{ width: '70px' }}>Summit-Fi</span>
                  </div>
                  
                  <div className="relative" style={{ width: '100%', height: '12px' }}>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={budgetToSlider(preferences.budget)}
                      onChange={(e) => handleBudgetSliderChange(parseInt(e.target.value))}
                      onMouseDown={handleBudgetSliderMouseDown}
                      onMouseUp={handleBudgetSliderMouseUp}
                      onTouchStart={handleBudgetSliderMouseDown}
                      onTouchEnd={handleBudgetSliderMouseUp}
                      className="w-full h-3 rounded-lg appearance-none cursor-pointer touch-manipulation budget-slider"
                      style={{
                        background: `linear-gradient(to right, #22c55e 0%, #eab308 25%, #f97316 50%, #ef4444 75%, #8b5cf6 100%)`,
                        boxShadow: 'none',
                        width: '100%',
                        position: 'absolute',
                        top: 0,
                        left: 0
                      }}
                    />
                    {/* Custom slider thumb */}
                    <div 
                      className="absolute w-6 h-6 bg-white border-4 border-accent rounded-full shadow-lg pointer-events-none"
                      style={{
                        left: `calc(${budgetToSlider(preferences.budget)}% - 12px)`,
                        top: '-6px',
                      }}
                    >
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-sm text-tertiary mt-3" style={{ minHeight: '40px' }}>
                    <span className="flex-shrink-0" style={{ width: '80px', textAlign: 'left' }}>$20 USD</span>
                    <div className="flex flex-col items-center flex-shrink-0">
                      <div className="budget-input-container">
                        <span className="currency-symbol text-inverse">$</span>
                        <input
                          type="number"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={budgetInputValue}
                          onChange={(e) => handleBudgetInputChange(e.target.value)}
                          onFocus={handleBudgetInputFocus}
                          onBlur={handleBudgetInputBlur}
                          className="pl-8 pr-6 py-2 rounded-full bg-accent text-inverse font-bold text-center border-0 focus:ring-2 focus:ring-accent-hover focus:outline-none"
                          style={{ width: '8rem', minWidth: '8rem', maxWidth: '8rem' }}
                          placeholder="Budget"
                        />
                      </div>
                    </div>
                    <span className="flex-shrink-0" style={{ width: '80px', textAlign: 'right' }}>$10,000 USD</span>
                  </div>
                  
                  {budgetError && (
                    <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2">
                      <p className="text-xs text-error bg-error-light border border-error rounded px-2 py-1">
                        {budgetError}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              </div>
            </div>
          )}
          
          {false && (
            <div>
              <h2 className="heading-2 mb-4">Tell us about your amplification needs</h2>
              <p className="text-secondary mb-8">This helps us recommend the right DAC and/or amplifier for your setup</p>
              
              <div className="space-y-8">
                {/* Existing Headphones */}
                <div>
                  <label className="block text-sm font-medium mb-4">What headphones will you be driving?</label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                    {/* Brand Selection */}
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-2">Brand</label>
                      <select
                        value={selectedBrand}
                        onChange={(e) => handleBrandSelect(e.target.value)}
                        disabled={loadingBrands}
                        className="input w-full"
                      >
                        <option value="">
                          {loadingBrands ? 'Loading brands...' : 'Select brand'}
                        </option>
                        {brands.map(brand => (
                          <option key={brand} value={brand}>{brand}</option>
                        ))}
                      </select>
                    </div>
                    
                    {/* Model Selection */}
                    <div>
                      <label className="block text-xs font-medium text-secondary mb-2">Model</label>
                      <select
                        value={selectedModel}
                        onChange={(e) => handleModelSelect(e.target.value)}
                        disabled={!selectedBrand || loadingModels}
                        className="input w-full"
                      >
                        <option value="">
                          {!selectedBrand ? 'Select brand first' : 
                           loadingModels ? 'Loading models...' : 
                           'Select model'}
                        </option>
                        {selectedBrand && models[selectedBrand]?.map(model => (
                          <option key={model} value={model}>{model}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {/* Selected headphones display */}
                  {preferences.existingHeadphones && (
                    <div className="mt-3 p-3 bg-accent-subtle rounded-lg">
                      <p className="text-sm font-medium text-accent">
                        Selected: {preferences.existingHeadphones}
                      </p>
                    </div>
                  )}
                  
                  {/* Manual entry fallback */}
                  <div className="mt-4">
                    <details className="group">
                      <summary className="text-sm text-secondary cursor-pointer hover:text-primary">
                        Can't find your headphones? Enter manually
                      </summary>
                      <div className="mt-3">
                        <input 
                          type="text"
                          value={preferences.existingHeadphones}
                          onChange={(e) => {
                            setPreferences({...preferences, existingHeadphones: e.target.value})
                            // Clear selections when manually entering
                            setSelectedBrand('')
                            setSelectedModel('')
                          }}
                          className="input w-full"
                          placeholder="e.g., Sennheiser HD600, Beyerdynamic DT770, etc."
                        />
                      </div>
                    </details>
                  </div>
                  
                  <p className="text-sm text-tertiary mt-2">This helps us determine power requirements</p>
                </div>

                {/* Power Requirements */}
                <div>
                  <h3 className="font-medium mb-4">How much power do you need?</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {[
                      {
                        value: 'low',
                        label: '🎧 Low Power',
                        description: 'IEMs, efficient headphones (most headphones under 150Ω)',
                        examples: 'HD58X, DT770 32Ω, most IEMs'
                      },
                      {
                        value: 'medium',
                        label: '⚡ Medium Power',
                        description: 'Mid-impedance headphones (150-300Ω)',
                        examples: 'HD600, HD650, DT880 250Ω'
                      },
                      {
                        value: 'high',
                        label: '🔥 High Power',
                        description: 'High-impedance, hard-to-drive headphones (300Ω+)',
                        examples: 'HD800, DT880 600Ω, T1'
                      },
                      {
                        value: 'unknown',
                        label: '🤷 Not Sure',
                        description: "I'll let you figure it out based on my headphones"
                      }
                    ].map(option => (
                      <button 
                        key={option.value}
                        onClick={() => setPreferences({...preferences, powerNeeds: option.value})}
                        className={`card-interactive text-left ${
                          preferences.powerNeeds === option.value 
                            ? 'card-interactive-selected' 
                            : ''
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium">{option.label}</h4>
                          {preferences.powerNeeds === option.value && <span className="text-accent">✓</span>}
                        </div>
                        <p className="text-secondary text-sm mb-2">{option.description}</p>
                        {option.examples && (
                          <p className="text-tertiary text-xs italic">Examples: {option.examples}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Usage Context */}
                <div>
                  <h3 className="font-medium mb-4">How will you use it?</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {[
                      {
                        value: 'desktop',
                        label: '🖥️ Desktop Setup',
                        description: 'Stays on my desk, size and portability not important'
                      },
                      {
                        value: 'portable',
                        label: '📱 Portable',
                        description: 'Need to take it with me, compact size important'
                      },
                      {
                        value: 'both',
                        label: '🔄 Both',
                        description: 'Sometimes desktop, sometimes portable'
                      }
                    ].map(option => (
                      <button 
                        key={option.value}
                        onClick={() => setPreferences({...preferences, usageContext: option.value})}
                        className={`card-interactive text-left ${
                          preferences.usageContext === option.value 
                            ? 'card-interactive-selected' 
                            : ''
                        }`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium">{option.label}</h4>
                          {preferences.usageContext === option.value && <span className="text-accent">✓</span>}
                        </div>
                        <p className="text-secondary text-sm">{option.description}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Connectivity */}
                <div>
                  <h3 className="font-medium mb-4">What connections do you need?</h3>
                  <p className="text-secondary text-sm mb-4">Select all that apply</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                    {[
                      { value: 'usb', label: 'USB', description: 'Computer/laptop connection' },
                      { value: 'optical', label: 'Optical (Toslink)', description: 'Digital optical input' },
                      { value: 'coaxial', label: 'Coaxial', description: 'Digital coaxial input' },
                      { value: 'balanced', label: 'Balanced (XLR)', description: 'Professional balanced connection' },
                      { value: 'rca', label: 'RCA', description: 'Analog stereo connection' },
                      { value: 'bluetooth', label: 'Bluetooth', description: 'Wireless connection' }
                    ].map(option => (
                      <div 
                        key={option.value}
                        className={`card-interactive cursor-pointer ${
                          preferences.connectivity.includes(option.value) 
                            ? 'card-interactive-selected' 
                            : ''
                        }`}
                        onClick={() => {
                          if (preferences.connectivity.includes(option.value)) {
                            setPreferences({
                              ...preferences,
                              connectivity: preferences.connectivity.filter(c => c !== option.value)
                            })
                          } else {
                            setPreferences({
                              ...preferences,
                              connectivity: [...preferences.connectivity, option.value]
                            })
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={preferences.connectivity.includes(option.value)}
                            onChange={() => {}} // Handled by parent div onClick
                            className="mt-1 w-4 h-4 text-accent bg-tertiary border-subtle rounded focus:ring-accent-subtle pointer-events-none"
                            tabIndex={-1}
                          />
                          <div className="flex-1">
                            <h4 className="font-medium text-sm">{option.label}</h4>
                            <p className="text-secondary text-xs">{option.description}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {step === 6 && (
            <div>
              <h2 className="heading-2 mb-4">Usage & Sound Preferences</h2>
              <p className="text-secondary mb-6">Tell us how you&apos;ll use your gear and your sound preferences</p>
              
              {/* Budget Range Settings */}
              <div className="mb-8">
                <h3 className="heading-3 mb-4">Budget Flexibility</h3>
                <p className="text-secondary mb-8">Adjust how strict you want the recommendations to be with your budget</p>
                
                <div className="space-y-8">
                {/* Budget Range Preview */}
                <div className="card p-6 bg-tertiary">
                  <h3 className="font-semibold mb-4">Current Range</h3>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-accent mb-2">
                      ${Math.max(20, Math.round(preferences.budget * (1 - preferences.budgetRange.minPercent / 100))).toLocaleString()} - ${Math.round(preferences.budget * (1 + preferences.budgetRange.maxPercent / 100)).toLocaleString()}
                    </div>
                    <div className="text-sm text-secondary">
                      Your ${preferences.budget.toLocaleString()} budget with -{preferences.budgetRange.minPercent}% to +{preferences.budgetRange.maxPercent}% flexibility
                    </div>
                  </div>
                </div>

                {/* Min Range Control */}
                <div>
                  <label className="block text-sm font-medium mb-4">
                    Minimum: {preferences.budgetRange.minPercent}% below budget
                  </label>
                  <input 
                    type="range" 
                    min="0" 
                    max="50" 
                    step="5"
                    value={preferences.budgetRange.minPercent}
                    onChange={(e) => setPreferences({
                      ...preferences,
                      budgetRange: {
                        ...preferences.budgetRange,
                        minPercent: parseInt(e.target.value)
                      }
                    })}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-tertiary mt-2">
                    <span>0% (strict)</span>
                    <span>25%</span>
                    <span>50% (very flexible)</span>
                  </div>
                </div>

                {/* Max Range Control */}
                <div>
                  <label className="block text-sm font-medium mb-4">
                    Maximum: {preferences.budgetRange.maxPercent}% above budget
                  </label>
                  <input 
                    type="range" 
                    min="0" 
                    max="50" 
                    step="5"
                    value={preferences.budgetRange.maxPercent}
                    onChange={(e) => setPreferences({
                      ...preferences,
                      budgetRange: {
                        ...preferences.budgetRange,
                        maxPercent: parseInt(e.target.value)
                      }
                    })}
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-tertiary mt-2">
                    <span>0% (strict)</span>
                    <span>25%</span>
                    <span>50% (very flexible)</span>
                  </div>
                </div>

                {/* Preset Buttons */}
                <div>
                  <h3 className="font-medium mb-4">Quick Presets</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-1">
                    <button
                      onClick={() => setPreferences({
                        ...preferences,
                        budgetRange: { minPercent: 10, maxPercent: 5 }
                      })}
                      className={`card-interactive text-center py-3 ${
                        preferences.budgetRange.minPercent === 10 && preferences.budgetRange.maxPercent === 5
                          ? 'card-interactive-selected'
                          : ''
                      }`}
                    >
                      <div className="font-medium">Strict</div>
                      <div className="text-sm text-secondary">-10% to +5%</div>
                    </button>
                    <button
                      onClick={() => setPreferences({
                        ...preferences,
                        budgetRange: { minPercent: 20, maxPercent: 10 }
                      })}
                      className={`card-interactive text-center py-3 ${
                        preferences.budgetRange.minPercent === 20 && preferences.budgetRange.maxPercent === 10
                          ? 'card-interactive-selected'
                          : ''
                      }`}
                    >
                      <div className="font-medium">Balanced</div>
                      <div className="text-sm text-secondary">-20% to +10%</div>
                    </button>
                    <button
                      onClick={() => setPreferences({
                        ...preferences,
                        budgetRange: { minPercent: 35, maxPercent: 25 }
                      })}
                      className={`card-interactive text-center py-3 ${
                        preferences.budgetRange.minPercent === 35 && preferences.budgetRange.maxPercent === 25
                          ? 'card-interactive-selected'
                          : ''
                      }`}
                    >
                      <div className="font-medium">Flexible</div>
                      <div className="text-sm text-secondary">-35% to +25%</div>
                    </button>
                  </div>
                </div>

                <div className="card p-4">
                  <p className="text-sm text-secondary">
                    💡 <strong>Balanced</strong> is recommended for most users. Strict gives you fewer but very targeted options, while flexible shows more variety but may stretch your budget.
                  </p>
                </div>
                </div>
              </div>
            </div>
          )}

          {false && (
            <div>
              {preferences.usageRanking.length === 0 ? (
                <div>
                  <h2 className="heading-2 mb-6">How will you primarily use them?</h2>
                  <p className="text-secondary mb-8">Choose your main use case first</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {['Music', 'Gaming', 'Movies', 'Work'].map(use => (
                      <button 
                        key={use}
                        onClick={() => {
                          const remaining: string[] = ['Music', 'Gaming', 'Movies', 'Work'].filter(u => u !== use)
                          setPreferences({
                            ...preferences, 
                            usage: use.toLowerCase(),
                            usageRanking: [use, ...remaining] as string[],
                            excludedUsages: [] as string[]
                          })
                        }}
                        className="w-full p-2 rounded card hover:border-accent transition-colors"
                      >
                        {use}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <UsageRankingStep 
                  preferences={preferences}
                  setPreferences={setPreferences}
                />
              )}
            </div>
          )}
          
          
          {false && (
            <div>
              <h2 className="heading-2 mb-6">Sound preference?</h2>
              <p className="text-secondary mb-8">Choose the sound signature that appeals to you most</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {[
                  { 
                    value: 'neutral', 
                    label: 'Neutral/Balanced', 
                    description: 'Accurate, well-balanced sound across all frequencies' 
                  },
                  { 
                    value: 'warm', 
                    label: 'Warm/Bass-heavy', 
                    description: 'Emphasized bass and lower mids for impactful sound' 
                  },
                  { 
                    value: 'bright', 
                    label: 'Bright/Detailed', 
                    description: 'Enhanced treble and clarity for analytical listening' 
                  },
                  { 
                    value: 'fun', 
                    label: 'V-shaped/Fun', 
                    description: 'Boosted bass and treble for exciting, energetic sound' 
                  }
                ].map(option => (
                  <button 
                    key={option.value}
                    onClick={() => setPreferences({...preferences, soundSignature: option.value})}
                    className={`card-interactive ${
                      preferences.soundSignature === option.value 
                        ? 'card-interactive-selected' 
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold">{option.label}</div>
                        <div className="text-sm text-secondary mt-1">{option.description}</div>
                      </div>
                      {preferences.soundSignature === option.value && (
                        <span className="text-accent">✓</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {false && (
            <div>
              <h2 className="heading-2 mb-6">Sound preference?</h2>
              <p className="text-secondary mb-8">Choose the sound signature that appeals to you most</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {[
                  { 
                    value: 'neutral', 
                    label: 'Neutral/Balanced', 
                    description: 'Accurate, well-balanced sound across all frequencies' 
                  },
                  { 
                    value: 'warm', 
                    label: 'Warm/Bass-heavy', 
                    description: 'Emphasized bass and lower mids for impactful sound' 
                  },
                  { 
                    value: 'bright', 
                    label: 'Bright/Detailed', 
                    description: 'Enhanced treble and clarity for analytical listening' 
                  },
                  { 
                    value: 'fun', 
                    label: 'V-shaped/Fun', 
                    description: 'Boosted bass and treble for exciting, energetic sound' 
                  }
                ].map(option => (
                  <button 
                    key={option.value}
                    onClick={() => setPreferences({...preferences, soundSignature: option.value})}
                    className={`card-interactive ${
                      preferences.soundSignature === option.value 
                        ? 'card-interactive-selected' 
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-semibold">{option.label}</div>
                        <div className="text-sm text-secondary mt-1">{option.description}</div>
                      </div>
                      {preferences.soundSignature === option.value && (
                        <span className="text-accent">✓</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {false && (
            <div>
              <h2 className="heading-2 mb-6">Ready for recommendations!</h2>
              <div className="space-y-6">
                <div className="card p-4">
                  <h3 className="font-semibold mb-4">Your Preferences:</h3>
                  <div className="text-sm space-y-1 text-secondary">
                    <p><span className="font-medium">Experience:</span> {preferences.experience}</p>
                    <p><span className="font-medium">Budget:</span> ${preferences.budget.toLocaleString()} (±{preferences.budgetRange.minPercent}%/-{preferences.budgetRange.maxPercent}%)</p>
                    <p><span className="font-medium">Looking for:</span> {
                      Object.entries(preferences.wantRecommendationsFor)
                        .filter(([, selected]) => selected)
                        .map(([component]) => component.charAt(0).toUpperCase() + component.slice(1))
                        .join(', ')
                    }</p>
                    {needsHeadphoneQuestions() && !hasExistingHeadphones() && (
                      <p><span className="font-medium">Headphone Type:</span> {preferences.headphoneType === 'cans' ? 'Over/On-Ear' : 'In-Ear Monitors'}</p>
                    )}
                    {needsHeadphoneQuestions() && hasExistingHeadphones() && preferences.optimizeAroundHeadphones && (
                      <p><span className="font-medium">Optimizing Around:</span> {preferences.optimizeAroundHeadphones}</p>
                    )}
                    {needsAmpDacQuestions() && (
                      <>
                        <p><span className="font-medium">Power Needs:</span> {preferences.powerNeeds}</p>
                        <p><span className="font-medium">Usage Context:</span> {preferences.usageContext}</p>
                        <p><span className="font-medium">Connectivity:</span> {preferences.connectivity.join(', ')}</p>
                        {preferences.existingHeadphones && (
                          <p><span className="font-medium">Existing Headphones:</span> {preferences.existingHeadphones}</p>
                        )}
                      </>
                    )}
                    <p><span className="font-medium">Existing Gear:</span> {
                      Object.entries(preferences.existingGear)
                        .filter(([, has]) => has)
                        .map(([key]) => key)
                        .join(', ') || 'Starting fresh'
                    }</p>
                    <p><span className="font-medium">Usage:</span> {preferences.usage}</p>
                    {needsHeadphoneQuestions() && preferences.soundSignature && (
                      <p><span className="font-medium">Sound:</span> {preferences.soundSignature}</p>
                    )}
                  </div>
                </div>
                <p className="text-tertiary">
                  We&apos;ll recommend gear that matches your experience level and show you exactly what you need to get started.
                </p>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
      </div>
    </>
  )
}