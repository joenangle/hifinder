'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [preferences, setPreferences] = useState({
    experience: '',
    budget: 300,
    headphoneType: '',
    existingGear: {
      headphones: false,
      dac: false,
      amp: false,
      combo: false
    },
    usage: '',
    soundSignature: ''
  })
  const [budgetInputValue, setBudgetInputValue] = useState('300')
  const [budgetError, setBudgetError] = useState('')
  const router = useRouter()

const handleBudgetSliderChange = (value: number) => {
  setPreferences({...preferences, budget: value})
  setBudgetInputValue(value.toString())
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
  
  if (numValue < 100) {
    setBudgetError('Minimum budget is $100')
    return
  }
  
  if (numValue > 1500) {
    setBudgetError('Maximum budget is $1500')
    return
  }
  
  // Valid value
  setBudgetError('')
  setPreferences({...preferences, budget: numValue})
}

const isStepValid = () => {
  switch (step) {
    case 1: return !!preferences.experience
    case 2: return true // Existing gear can be all false (starting fresh)
    case 3: return !!preferences.headphoneType
    case 4: return true // Budget always has default value
    case 5: return !!preferences.usage
    case 6: return !!preferences.soundSignature
    case 7: return true // Summary step
    default: return false
  }
}

const handleNext = () => {
  if (!isStepValid()) return
  
  if (step < 7) {
    setStep(step + 1)
  } else {
    // Navigate to recommendations with all preferences
    const params = new URLSearchParams({
      experience: preferences.experience,
      budget: preferences.budget.toString(),
      headphoneType: preferences.headphoneType,
      existingGear: JSON.stringify(preferences.existingGear),
      usage: preferences.usage,
      sound: preferences.soundSignature
    })
    router.push(`/recommendations?${params.toString()}`)
  }
}

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header with Home Link */}
        <div className="mb-6">
          <Link href="/" className="text-gray-400 hover:text-white inline-flex items-center gap-2 text-sm">
            ← Back to Home
          </Link>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm mb-2">
            <span>Step {step} of 7</span>
            <span>{Math.round(step * 14.29)}% Complete</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all"
              style={{ width: `${step * 14.29}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-gray-800 rounded-lg p-8">
          {step === 1 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">What&apos;s your audio experience?</h2>
              <p className="text-gray-400 mb-6">This helps us recommend the right gear and explain things at your level</p>
              <div className="space-y-4">
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
                    className={`w-full p-6 rounded-lg text-left transition-all ${
                      preferences.experience === option.id 
                        ? 'bg-blue-600 border-2 border-blue-400 ring-1 ring-blue-300' 
                        : 'bg-gray-700 hover:bg-gray-600 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-lg">{option.title}</h3>
                      {preferences.experience === option.id && <span className="text-blue-300">✓</span>}
                    </div>
                    <p className="text-gray-300 mb-2">{option.description}</p>
                    <p className="text-sm text-gray-500 italic">{option.examples}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {step === 2 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">What gear do you already have?</h2>
              <p className="text-gray-400 mb-6">Check what you already own so we can focus your budget on what you need</p>
              <div className="space-y-4">
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
                    className={`rounded-lg p-4 border-2 transition-all ${
                      preferences.existingGear[component.key]
                        ? 'bg-blue-900/30 border-blue-500/50'
                        : 'bg-gray-700 border-gray-600'
                    }`}
                  >
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={preferences.existingGear[component.key]}
                        onChange={(e) => setPreferences({
                          ...preferences,
                          existingGear: {
                            ...preferences.existingGear,
                            [component.key]: e.target.checked
                          }
                        })}
                        className="mt-1 w-5 h-5 text-blue-600 bg-gray-600 border-gray-500 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{component.label}</h3>
                        <p className="text-gray-300 text-sm">{component.description}</p>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-400">
                  💡 <strong>Don't have anything?</strong> Leave all unchecked and we'll recommend a complete setup within your budget.
                </p>
              </div>
            </div>
          )}
          
          {step === 3 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">What type of headphones do you prefer?</h2>
              <p className="text-gray-400 mb-6">Choose the style that appeals to you most</p>
              <div className="space-y-4">
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
                    className={`w-full p-6 rounded-lg text-left transition-all ${
                      preferences.headphoneType === option.value 
                        ? 'bg-blue-600 border-2 border-blue-400 ring-1 ring-blue-300' 
                        : 'bg-gray-700 hover:bg-gray-600 border-2 border-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-lg">{option.label}</h3>
                      {preferences.headphoneType === option.value && <span className="text-blue-300">✓</span>}
                    </div>
                    <p className="text-gray-300 mb-2">{option.description}</p>
                    <p className="text-sm text-gray-500 italic">{option.pros}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {step === 4 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">What&apos;s your budget?</h2>
              <p className="text-gray-400 mb-6">We&apos;ll recommend gear that fits your budget (maximum $1500)</p>
              
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Budget: ${preferences.budget}</label>
                <input 
                  type="range" 
                  min="100" 
                  max="1500" 
                  value={preferences.budget}
                  onChange={(e) => handleBudgetSliderChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-sm text-gray-400 mt-1">
                  <span>$100</span>
                  <span>$1500</span>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Or enter exact amount:</label>
                <input 
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={budgetInputValue}
                  onFocus={handleBudgetInputFocus}
                  onBlur={handleBudgetInputBlur}
                  onChange={(e) => handleBudgetInputChange(e.target.value)}
                  className="w-full p-3 bg-gray-700 border border-gray-600 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  placeholder="Enter budget amount"
                  min="100"
                  max="1500"
                />
                {budgetError && (
                  <p className="text-red-400 text-sm mt-1">{budgetError}</p>
                )}
              </div>
              
              <div className="bg-gray-700/50 rounded-lg p-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>Budget Tiers:</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className={`flex justify-between ${preferences.budget <= 400 ? 'text-blue-300 font-medium' : 'text-gray-400'}`}>
                    <span>Entry Level</span>
                    <span>$100 - $400</span>
                  </div>
                  <div className={`flex justify-between ${preferences.budget > 400 && preferences.budget <= 800 ? 'text-blue-300 font-medium' : 'text-gray-400'}`}>
                    <span>Mid Range</span>
                    <span>$400 - $800</span>
                  </div>
                  <div className={`flex justify-between ${preferences.budget > 800 ? 'text-blue-300 font-medium' : 'text-gray-400'}`}>
                    <span>High End</span>
                    <span>$800+</span>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {step === 5 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">How will you use them?</h2>
              <div className="space-y-2">
                {['Music', 'Gaming', 'Movies', 'Work'].map(use => (
                  <button 
                    key={use}
                    onClick={() => setPreferences({...preferences, usage: use.toLowerCase()})}
                    className={`w-full p-3 rounded ${
                      preferences.usage === use.toLowerCase() 
                        ? 'bg-blue-600' 
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                  >
                    {use}
                  </button>
                ))}
              </div>
            </div>
          )}
          
          
          {step === 6 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Sound preference?</h2>
              <p className="text-gray-400 mb-6">Choose the sound signature that appeals to you most</p>
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
                    onClick={() => setPreferences({...preferences, soundSignature: option.value})}
                    className={`w-full p-4 rounded text-left ${
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
          
          {step === 7 && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Ready for recommendations!</h2>
              <div className="space-y-4">
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="font-semibold mb-2">Your Preferences:</h3>
                  <div className="text-sm space-y-1 text-gray-300">
                    <p><span className="font-medium">Experience:</span> {preferences.experience}</p>
                    <p><span className="font-medium">Budget:</span> ${preferences.budget}</p>
                    <p><span className="font-medium">Type:</span> {preferences.headphoneType === 'cans' ? 'Over/On-Ear' : 'In-Ear Monitors'}</p>
                    <p><span className="font-medium">Existing Gear:</span> {
                      Object.entries(preferences.existingGear)
                        .filter(([_, has]) => has)
                        .map(([key, _]) => key)
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
        <div className="flex justify-between mt-8">
          <button 
            onClick={() => setStep(Math.max(1, step - 1))}
            className={`px-6 py-3 rounded ${
              step === 1 
                ? 'bg-gray-700 opacity-50 cursor-not-allowed' 
                : 'bg-gray-700 hover:bg-gray-600'
            }`}
            disabled={step === 1}
          >
            Back
          </button>
          
          <button 
            onClick={handleNext}
            disabled={!isStepValid()}
            className={`px-6 py-3 rounded font-medium transition-all ${
              isStepValid()
                ? 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                : 'bg-gray-600 opacity-50 cursor-not-allowed'
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
  )
}