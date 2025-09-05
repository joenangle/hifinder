'use client'

import { useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

function QuickStartContent() {
  const [headphoneType, setHeadphoneType] = useState('')
  const [soundSignature, setSoundSignature] = useState('')
  const router = useRouter()
  const searchParams = useSearchParams()
  
  // Get initial budget from URL params (set by budget cards)
  const initialBudget = parseInt(searchParams.get('budget') || '300')
  const [budget, setBudget] = useState(initialBudget)
  const [expandedBudgetRange, setExpandedBudgetRange] = useState(false)
  
  // Format budget with US currency formatting
  const formatBudgetUSD = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const getBudgetTier = (budget: number) => {
    if (budget <= 100) return 'Budget ($20 - $100 USD)'
    if (budget <= 400) return 'Entry Level ($100 - $400 USD)'
    if (budget <= 1000) return 'Mid Range ($400 - $1,000 USD)'
    return 'High End ($1,000 - $3,000+ USD)'
  }

  // Get budget range limits based on initial selection
  const getBudgetRangeLimits = (initialBudget: number) => {
    if (initialBudget <= 100) return { min: 20, max: 100 }
    if (initialBudget <= 400) return { min: 100, max: 400 }
    if (initialBudget <= 1000) return { min: 400, max: 1000 }
    return { min: 1000, max: 3000 }
  }

  const currentRange = getBudgetRangeLimits(initialBudget)
  const isOutsideRange = budget < currentRange.min || budget > currentRange.max

  // Convert linear slider position to logarithmic budget value (constrained or expanded)
  const sliderToBudget = (sliderValue: number, useExpandedRange = false) => {
    const minBudget = useExpandedRange ? 20 : currentRange.min
    const maxBudget = useExpandedRange ? 10000 : currentRange.max
    const minLog = Math.log(minBudget)
    const maxLog = Math.log(maxBudget)
    const scale = (maxLog - minLog) / 100
    return Math.round(Math.exp(minLog + scale * sliderValue))
  }

  // Convert budget value to linear slider position
  const budgetToSlider = (budget: number, useExpandedRange = false) => {
    const minBudget = useExpandedRange ? 20 : currentRange.min
    const maxBudget = useExpandedRange ? 10000 : currentRange.max
    const minLog = Math.log(minBudget)
    const maxLog = Math.log(maxBudget)
    const scale = (maxLog - minLog) / 100
    const clampedBudget = Math.max(minBudget, Math.min(maxBudget, budget))
    return Math.round((Math.log(clampedBudget) - minLog) / scale)
  }

  const handleBudgetSliderChange = (sliderValue: number) => {
    const newBudget = sliderToBudget(sliderValue, expandedBudgetRange)
    setBudget(newBudget)
  }


  const handleGetRecommendations = () => {
    if (!headphoneType || !soundSignature) return

    // Build minimal preferences for quick start flow
    const params = new URLSearchParams({
      experience: 'intermediate', // Default to intermediate
      budget: budget.toString(),
      budgetRangeMin: '20', // Default -20% below budget
      budgetRangeMax: '10', // Default +10% above budget
      headphoneType: headphoneType,
      wantRecommendationsFor: JSON.stringify({
        headphones: true,
        dac: false,
        amp: false,
        combo: false
      }),
      existingGear: JSON.stringify({
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
      }),
      usage: 'music', // Default to music
      usageRanking: JSON.stringify(['Music', 'Gaming', 'Movies', 'Work']),
      excludedUsages: JSON.stringify([]),
      sound: soundSignature
    })
    
    router.push(`/recommendations?${params.toString()}`)
  }

  const canProceed = headphoneType && soundSignature

  return (
    <div className="page-container">
      <div className="max-w-2xl w-full mx-auto flex flex-col" style={{ minHeight: '100vh', maxHeight: '100vh' }}>
        {/* Header */}
        <div className="mb-2 flex-shrink-0">
          <Link href="/" className="text-secondary hover:text-primary inline-flex items-center gap-2 text-sm">
            ← Back to Home
          </Link>
        </div>
        
        {/* Progress indicator */}
        <div className="mb-3 flex-shrink-0">
          <div className="text-center">
            <span className="text-sm text-secondary">Quick Start • {getBudgetTier(budget)}</span>
          </div>
        </div>

        {/* Main Content Area - Scrollable */}
        <div className="flex-1 overflow-y-auto py-2">
          <div className="card animate-fadeIn">
            
            {/* Budget Adjustment */}
            <div className="mb-6 border-b border-subtle pb-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold">Budget: {formatBudgetUSD(budget)}</h3>
                {isOutsideRange && !expandedBudgetRange && (
                  <button
                    onClick={() => setExpandedBudgetRange(true)}
                    className="text-xs text-accent hover:text-accent-hover font-medium px-2 py-1 rounded"
                  >
                    Expand Range
                  </button>
                )}
                {expandedBudgetRange && (
                  <button
                    onClick={() => {
                      setExpandedBudgetRange(false)
                      setBudget(initialBudget)
                    }}
                    className="text-xs text-secondary hover:text-primary font-medium px-2 py-1 rounded"
                  >
                    Reset to {getBudgetTier(initialBudget)}
                  </button>
                )}
              </div>
              
              <div className="relative mb-3">
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  step="1"
                  value={budgetToSlider(budget, expandedBudgetRange)}
                  onChange={(e) => handleBudgetSliderChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #FF6B35 0%, #FF6B35 ${budgetToSlider(budget, expandedBudgetRange)}%, #374151 ${budgetToSlider(budget, expandedBudgetRange)}%, #374151 100%)`
                  }}
                />
              </div>
              
              <div className="flex justify-between text-xs text-tertiary mb-2">
                <span>{formatBudgetUSD(expandedBudgetRange ? 20 : currentRange.min)}</span>
                <span className="text-accent font-medium">{getBudgetTier(budget)}</span>
                <span>{formatBudgetUSD(expandedBudgetRange ? 10000 : currentRange.max)}</span>
              </div>

              {isOutsideRange && !expandedBudgetRange && (
                <div className="bg-accent-subtle border border-accent rounded-lg p-2 mt-2">
                  <p className="text-xs text-secondary">
                    💡 You&apos;ve selected {formatBudgetUSD(budget)} which is outside the {getBudgetTier(initialBudget)} range. 
                    <button 
                      onClick={() => setExpandedBudgetRange(true)}
                      className="text-accent hover:text-accent-hover font-medium ml-1"
                    >
                      Expand range to see all options
                    </button>
                  </p>
                </div>
              )}
            </div>
            
            {/* Step 1: Headphone Type */}
            <div className="mb-6">
              <h2 className="heading-2 mb-3">What type of headphones do you prefer?</h2>
              <p className="text-secondary mb-4">Choose the style that appeals to you most</p>
              <div className="space-y-3">
                {[
                  {
                    value: 'cans',
                    label: '🎧 Over/On-Ear Headphones',
                    description: 'Traditional headphones that go over or on your ears',
                    pros: 'Comfortable for long sessions, great soundstage'
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
                    onClick={() => setHeadphoneType(option.value)}
                    className={`card-interactive w-full text-left ${
                      headphoneType === option.value 
                        ? 'card-interactive-selected' 
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="heading-3">{option.label}</h3>
                      {headphoneType === option.value && <span className="text-accent">✓</span>}
                    </div>
                    <p className="text-secondary mb-3">{option.description}</p>
                    <p className="text-sm text-tertiary italic">{option.pros}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Step 2: Sound Preference (only show if headphone type selected) */}
            {headphoneType && (
              <div className="mb-4">
                <h2 className="heading-2 mb-3">Sound preference?</h2>
                <p className="text-secondary mb-4">Choose the sound signature that appeals to you most</p>
                <div className="space-y-3">
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
                      onClick={() => setSoundSignature(option.value)}
                      className={`card-interactive w-full text-left ${
                        soundSignature === option.value 
                          ? 'card-interactive-selected' 
                          : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold mb-1">{option.label}</div>
                          <div className="text-sm text-secondary">{option.description}</div>
                        </div>
                        {soundSignature === option.value && (
                          <span className="text-accent">✓</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick note about defaults */}
            {canProceed && (
              <div className="bg-tertiary rounded-lg p-3 mb-4">
                <p className="text-sm text-secondary">
                  💡 We&apos;ll use smart defaults for other preferences to get you started quickly. 
                  You can always refine your recommendations later!
                </p>
              </div>
            )}

          </div>
        </div>

        {/* Navigation Buttons - Fixed Footer */}
        <div className="flex justify-between mt-3 py-3 flex-shrink-0 border-t border-subtle bg-primary">
          <Link 
            href="/"
            className="button button-secondary"
          >
            Back
          </Link>
          
          <button 
            onClick={handleGetRecommendations}
            disabled={!canProceed}
            className={`button ${
              canProceed
                ? 'button-primary'
                : 'button-secondary'
            }`}
          >
            {!headphoneType ? 'Select Headphone Type' :
             !soundSignature ? 'Select Sound Preference' :
             'Get My Recommendations →'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function QuickStartPage() {
  return (
    <Suspense fallback={<div className="flex justify-center items-center min-h-screen"><div className="animate-pulse">Loading...</div></div>}>
      <QuickStartContent />
    </Suspense>
  )
}