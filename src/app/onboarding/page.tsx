'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Types
interface Preferences {
  experience: string
  budget: number
  headphoneType: string
  existingGear: {
    headphones: boolean
    dac: boolean
    amp: boolean
    combo: boolean
  }
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
              ${dragOverIndex === index ? 'border-blue-400 bg-blue-900/20' : 'border-gray-600 bg-gray-700'}
              ${draggedIndex === index ? 'opacity-50' : ''}
              ${index === 0 ? 'border-blue-500 bg-blue-900/30' : ''}
              hover:border-gray-500 transition-all touch-manipulation
            `}
          >
            <div className="flex items-center gap-4">
              <div className="flex flex-col items-center text-xs text-gray-400 min-w-[60px]">
                <span className="font-medium">{getRankLabel(index)}</span>
                <span>#{index + 1}</span>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="text-gray-400">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M2 4h12M2 8h12M2 12h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="font-medium text-white">{use}</span>
              </div>
            </div>

            {/* Control buttons */}
            <div className="flex gap-1">
              <button
                onClick={() => index > 0 && moveItem(index, index - 1)}
                disabled={index === 0}
                className="p-2 rounded text-gray-400 hover:text-white hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation"
                aria-label="Move up"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M8 2l-4 4h8l-4-4zM8 14l-4-4h8l-4 4z" />
                </svg>
              </button>
              <button
                onClick={() => index < preferences.usageRanking.length - 1 && moveItem(index, index + 1)}
                disabled={index === preferences.usageRanking.length - 1}
                className="p-2 rounded text-gray-400 hover:text-white hover:bg-gray-600 disabled:opacity-30 disabled:cursor-not-allowed touch-manipulation"
                aria-label="Move down"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" transform="rotate(180)">
                  <path d="M8 2l-4 4h8l-4-4zM8 14l-4-4h8l-4 4z" />
                </svg>
              </button>
              <button
                onClick={() => excludeUseCase(use)}
                className="p-2 rounded text-red-400 hover:text-red-300 hover:bg-red-900/20 touch-manipulation"
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
          <h3 className="text-lg font-medium text-gray-300 mb-3">Excluded Use Cases</h3>
          <div className="space-y-8">
            {preferences.excludedUsages.map(excludedUse => (
              <div
                key={excludedUse}
                className="flex items-center justify-between p-3 rounded-lg border border-red-800 bg-red-900/10"
              >
                <div className="flex items-center gap-3">
                  <div className="text-red-400">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M4 4l8 8m0-8l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <span className="text-gray-300 line-through">{excludedUse}</span>
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
    usage: '',
    usageRanking: [] as string[],
    excludedUsages: [] as string[],
    soundSignature: ''
  })
  const [budgetInputValue, setBudgetInputValue] = useState('100')
  const [budgetError, setBudgetError] = useState('')
  const router = useRouter()

// Format budget with US comma styling
const formatBudget = (budget: number) => {
  return budget.toLocaleString('en-US')
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
  const budget = sliderToBudget(sliderValue)
  setPreferences({...preferences, budget})
  setBudgetInputValue(budget.toString())
  setBudgetError('')
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
    case 4: return !!preferences.headphoneType
    case 5: return true // Budget always has default value
    case 6: return preferences.usageRanking.length > 0
    case 7: return !!preferences.soundSignature
    case 8: return true // Summary step
    default: return false
  }
}

const handleNext = () => {
  if (!isStepValid()) return
  
  if (step < 8) {
    setStep(step + 1)
  } else {
    // Navigate to recommendations with all preferences
    const params = new URLSearchParams({
      experience: preferences.experience,
      budget: preferences.budget.toString(),
      headphoneType: preferences.headphoneType,
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
      `}</style>
      <div className="page-container p-12">
      <div className="max-w-2xl mx-auto">
        {/* Header with Home Link */}
        <div className="mb-16">
          <Link href="/" className="text-secondary hover:text-primary inline-flex items-center gap-2 text-sm">
            ← Back to Home
          </Link>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-16">
          <div className="flex justify-between text-sm mb-4">
            <span>Step {step} of 8</span>
            <span>{Math.round((step / 8) * 100)}% Complete</span>
          </div>
          <div className="w-full bg-surface-secondary rounded-full h-2">
            <div 
              className="bg-accent h-2 rounded-full transition-all"
              style={{ width: `${(step / 8) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="card">
          {step === 1 && (
            <div>
              <h2 className="heading-2 mb-6">What&apos;s your audio experience?</h2>
              <p className="text-secondary mb-16">This helps us recommend the right gear and explain things at your level</p>
              <div className="space-y-16">
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
                    className={`card-interactive ${
                      preferences.experience === option.id 
                        ? 'card-interactive-selected' 
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="heading-3">{option.title}</h3>
                      {preferences.experience === option.id && <span className="text-blue-300">✓</span>}
                    </div>
                    <p className="text-secondary mb-4">{option.description}</p>
                    <p className="text-sm text-gray-500 italic">{option.examples}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {step === 2 && (
            <div>
              <h2 className="heading-2 mb-6">What do you want recommendations for?</h2>
              <p className="text-secondary mb-16">Select the components you&apos;d like us to recommend for your system</p>
              <div className="space-y-16">
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
                    className="card-interactive flex items-center justify-between"
                  >
                    <div>
                      <h3 className="font-medium">{component.label}</h3>
                      <p className="text-sm text-secondary">{component.description}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.wantRecommendationsFor[component.key as keyof typeof preferences.wantRecommendationsFor]}
                        onChange={(e) => setPreferences({
                          ...preferences,
                          wantRecommendationsFor: {
                            ...preferences.wantRecommendationsFor,
                            [component.key]: e.target.checked
                          }
                        })}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-gray-600 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {step === 3 && (
            <div>
              <h2 className="heading-2 mb-6">What gear do you already have?</h2>
              <p className="text-secondary mb-16">Check what you already own so we can focus your budget on what you need</p>
              <div className="space-y-16">
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
                    className={`card-interactive ${
                      preferences.existingGear[component.key as keyof typeof preferences.existingGear]
                        ? 'card-interactive-selected'
                        : ''
                    }`}
                  >
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.existingGear[component.key as keyof typeof preferences.existingGear]}
                        onChange={(e) => setPreferences({
                          ...preferences,
                          existingGear: {
                            ...preferences.existingGear,
                            [component.key as keyof typeof preferences.existingGear]: e.target.checked
                          }
                        })}
                        className="mt-1 w-5 h-5 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <h3 className="heading-3">{component.label}</h3>
                        <p className="text-gray-300 text-sm">{component.description}</p>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-400">
                  💡 <strong>Don&apos;t have anything?</strong> Leave all unchecked and we&apos;ll recommend a complete setup within your budget.
                </p>
              </div>
            </div>
          )}
          
          {step === 4 && (
            <div>
              <h2 className="heading-2 mb-6">What type of headphones do you prefer?</h2>
              <p className="text-secondary mb-16">Choose the style that appeals to you most</p>
              <div className="space-y-16">
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
                    className={`w-full p-4 rounded-lg text-left transition-all ${
                      preferences.headphoneType === option.value 
                        ? 'bg-blue-600 border-2 border-blue-400 ring-1 ring-blue-300' 
                        : 'bg-gray-700 hover:bg-gray-600 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="heading-3">{option.label}</h3>
                      {preferences.headphoneType === option.value && <span className="text-blue-300">✓</span>}
                    </div>
                    <p className="text-secondary mb-4">{option.description}</p>
                    <p className="text-sm text-gray-500 italic">{option.pros}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {step === 5 && (
            <div>
              <h2 className="heading-2 mb-6">What&apos;s your budget?</h2>
              <p className="text-secondary mb-16">We&apos;ll recommend gear that fits your budget (maximum $10,000 USD)</p>
              
              <div className="mb-16">
                <label className="block text-sm font-medium mb-4">Budget: ${formatBudget(preferences.budget)} USD</label>
                <div className="relative">
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    step="1"
                    value={budgetToSlider(preferences.budget)}
                    onChange={(e) => handleBudgetSliderChange(parseInt(e.target.value))}
                    className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer relative z-10 budget-slider"
                    style={{
                      background: `linear-gradient(to right, 
                        #93c5fd 0%, #93c5fd ${Math.min(budgetToSlider(100), budgetToSlider(preferences.budget))}%,
                        #60a5fa ${budgetToSlider(100)}%, #60a5fa ${Math.min(budgetToSlider(400), budgetToSlider(preferences.budget))}%,
                        #3b82f6 ${budgetToSlider(400)}%, #3b82f6 ${Math.min(budgetToSlider(1000), budgetToSlider(preferences.budget))}%,
                        #2563eb ${budgetToSlider(1000)}%, #2563eb ${Math.min(budgetToSlider(3000), budgetToSlider(preferences.budget))}%,
                        #1d4ed8 ${budgetToSlider(3000)}%, #1d4ed8 ${budgetToSlider(preferences.budget)}%,
                        #374151 ${budgetToSlider(preferences.budget)}%, #374151 100%)`
                    }}
                  />
                  {/* Enhanced current position indicator */}
                  <div 
                    className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2 pointer-events-none z-20"
                    style={{ left: `${budgetToSlider(preferences.budget)}%` }}
                  >
                    <div className="w-6 h-6 bg-white border-3 border-blue-600 rounded-full shadow-lg flex items-center justify-center">
                      <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
                    </div>
                  </div>
                  {/* Tier breakpoint indicators */}
                  <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                    <div className="absolute top-1/2 transform -translate-y-1/2 w-1 h-4 bg-white rounded" style={{ left: `${budgetToSlider(100)}%` }}></div>
                    <div className="absolute top-1/2 transform -translate-y-1/2 w-1 h-4 bg-white rounded" style={{ left: `${budgetToSlider(400)}%` }}></div>
                    <div className="absolute top-1/2 transform -translate-y-1/2 w-1 h-4 bg-white rounded" style={{ left: `${budgetToSlider(1000)}%` }}></div>
                    <div className="absolute top-1/2 transform -translate-y-1/2 w-1 h-4 bg-white rounded" style={{ left: `${budgetToSlider(3000)}%` }}></div>
                  </div>
                </div>
                <div className="flex justify-between text-sm text-gray-400 mt-2">
                  <span>$20</span>
                  <span className="text-blue-300">$100</span>
                  <span className="text-blue-400">$400</span>
                  <span className="text-blue-500">$1K</span>
                  <span className="text-blue-600">$3K</span>
                  <span>$10K</span>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium mb-4">Or enter exact amount:</label>
                <input 
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={budgetInputValue}
                  onFocus={handleBudgetInputFocus}
                  onBlur={handleBudgetInputBlur}
                  onChange={(e) => handleBudgetInputChange(e.target.value)}
                  className="input"
                  placeholder="Enter budget amount"
                  min="20"
                  max="10000"
                />
                {budgetError && (
                  <p className="text-red-400 text-sm mt-1">{budgetError}</p>
                )}
              </div>
              
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex justify-between text-sm mb-4">
                  <span>Budget Tiers:</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className={`flex justify-between ${preferences.budget <= 100 ? 'text-blue-300 font-medium' : 'text-gray-400'}`}>
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-300 rounded"></div>
                      Budget
                    </span>
                    <span>$20 - $100 USD</span>
                  </div>
                  <div className={`flex justify-between ${preferences.budget > 100 && preferences.budget <= 400 ? 'text-blue-400 font-medium' : 'text-gray-400'}`}>
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-400 rounded"></div>
                      Entry Level
                    </span>
                    <span>$100 - $400 USD</span>
                  </div>
                  <div className={`flex justify-between ${preferences.budget > 400 && preferences.budget <= 1000 ? 'text-blue-500 font-medium' : 'text-gray-400'}`}>
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-500 rounded"></div>
                      Mid Range
                    </span>
                    <span>$400 - $1,000 USD</span>
                  </div>
                  <div className={`flex justify-between ${preferences.budget > 1000 && preferences.budget <= 3000 ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-600 rounded"></div>
                      High End
                    </span>
                    <span>$1,000 - $3,000 USD</span>
                  </div>
                  <div className={`flex justify-between ${preferences.budget > 3000 ? 'text-blue-800 font-medium' : 'text-gray-400'}`}>
                    <span className="flex items-center gap-2">
                      <div className="w-3 h-3 bg-blue-800 rounded"></div>
                      Summit-Fi
                    </span>
                    <span>$3,000+ USD</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {step === 6 && (
            <div>
              {preferences.usageRanking.length === 0 ? (
                <div>
                  <h2 className="heading-2 mb-6">How will you primarily use them?</h2>
                  <p className="text-secondary mb-16">Choose your main use case first</p>
                  <div className="space-y-16">
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
                        className="w-full p-2 rounded bg-gray-700 hover:bg-gray-600 transition-colors"
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
          
          
          {step === 7 && (
            <div>
              <h2 className="heading-2 mb-6">Sound preference?</h2>
              <p className="text-secondary mb-16">Choose the sound signature that appeals to you most</p>
              <div className="space-y-16">
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
                    className={`w-full p-3 rounded text-left ${
                      preferences.soundSignature === option.value 
                        ? 'bg-blue-600 border-2 border-blue-400' 
                        : 'bg-gray-700 hover:bg-gray-600 border-2 border-transparent'
                    }`}
                  >
                    <div className="font-semibold">{option.label}</div>
                    <div className="text-sm text-gray-300 mt-1">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {step === 8 && (
            <div>
              <h2 className="heading-2 mb-6">Ready for recommendations!</h2>
              <div className="space-y-16">
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold mb-4">Your Preferences:</h3>
                  <div className="text-sm space-y-1 text-gray-300">
                    <p><span className="font-medium">Experience:</span> {preferences.experience}</p>
                    <p><span className="font-medium">Budget:</span> ${preferences.budget}</p>
                    <p><span className="font-medium">Type:</span> {preferences.headphoneType === 'cans' ? 'Over/On-Ear' : 'In-Ear Monitors'}</p>
                    <p><span className="font-medium">Existing Gear:</span> {
                      Object.entries(preferences.existingGear)
                        .filter(([, has]) => has)
                        .map(([key]) => key)
                        .join(', ') || 'Starting fresh'
                    }</p>
                    <p><span className="font-medium">Usage:</span> {preferences.usage}</p>
                    <p><span className="font-medium">Sound:</span> {preferences.soundSignature}</p>
                  </div>
                </div>
                <p className="text-gray-400">
                  We&apos;ll recommend gear that matches your experience level and show you exactly what you need to get started.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-20">
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
             !isStepValid() && step === 3 ? 'Select Headphone Type' :
             !isStepValid() && step === 4 ? 'Select Existing Gear' :
             !isStepValid() && step === 5 ? 'Select Usage' :
             !isStepValid() && step === 6 ? 'Select Sound Preference' :
             step === 7 ? 'See Recommendations' : 'Next'}
          </button>
        </div>
      </div>
      </div>
    </>
  )
}