'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronRight } from 'lucide-react'
import { BudgetSliderEnhanced } from '@/components/BudgetSliderEnhanced'
import { useBudgetState } from '@/hooks/useBudgetState'

interface OnboardingState {
  // Core preferences
  experience: string | null
  budget: number
  budgetRange: { min: number; max: number }

  // Product selection - independent toggles
  wantRecommendations: {
    cans: boolean       // Over-ear headphones
    iems: boolean       // In-ear monitors
    dac: boolean
    amp: boolean
    combo: boolean
  }

  // Existing gear
  hasExistingGear: boolean | null
  existingGear: {
    headphones: boolean
    dac: boolean
    amp: boolean
    combo: boolean
  }

  // Usage & preferences
  primaryUsage: string | null
  soundSignature: string | null

  // Additional context
  listeningSpace: string | null
  powerNeeds: string | null
}

// Step component for each section
function StepSection({
  stepNumber,
  title,
  subtitle,
  isActive,
  isCompleted,
  children
}: {
  stepNumber: number
  title: string
  subtitle?: string
  isActive: boolean
  isCompleted: boolean
  children: React.ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)

  // Auto-scroll when section becomes active
  useEffect(() => {
    if (isActive && ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [isActive])

  return (
    <div
      ref={ref}
      className={`
        border rounded-xl mb-4 transition-all duration-300 ease-in-out
        ${isActive ? 'border-accent-primary bg-surface-primary shadow-lg' :
          isCompleted ? 'border-border-secondary bg-surface-primary' :
          'border-border-tertiary bg-surface-secondary opacity-60'}
      `}
    >
      <div className="p-6">
        <div className="flex items-start gap-4 mb-4">
          <div className={`
            flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
            transition-all duration-300
            ${isCompleted ? 'bg-accent-primary text-white' :
              isActive ? 'bg-accent-primary/20 text-accent-primary' :
              'bg-surface-elevated text-text-tertiary'}
          `}>
            {isCompleted ? <Check className="w-4 h-4" /> : stepNumber}
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
            {subtitle && <p className="text-sm text-text-secondary mt-1">{subtitle}</p>}
          </div>
        </div>

        <div className={`
          ml-12 transition-all duration-300 ease-in-out overflow-hidden
          ${(isActive || isCompleted) ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'}
        `}>
          {(isActive || isCompleted) && children}
        </div>
      </div>
    </div>
  )
}

// Option card component with better visual feedback
function OptionCard({
  selected,
  onClick,
  children,
  icon,
  description,
  disabled = false
}: {
  selected: boolean
  onClick: () => void
  children: React.ReactNode
  icon?: React.ReactNode
  description?: string
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative p-4 rounded-lg border-2 transition-all text-left w-full overflow-hidden
        ${disabled ? 'opacity-50 cursor-not-allowed' :
          selected
            ? 'border-accent-primary bg-accent-primary/10 shadow-md dark:bg-accent-primary/20'
            : 'border-border-secondary hover:border-border-primary hover:bg-surface-hover'}
      `}
    >
      {icon && (
        <div className={`mb-2 ${selected ? 'text-accent-primary' : 'text-accent-primary'}`}>
          {icon}
        </div>
      )}
      <div className={`font-medium ${selected ? 'text-text-primary' : 'text-text-primary'}`}>
        {children}
      </div>
      {description && (
        <div className={`text-sm mt-1 ${selected ? 'text-text-secondary' : 'text-text-secondary'}`}>
          {description}
        </div>
      )}
      {selected && (
        <div className="absolute top-2 right-2 transition-transform duration-200 scale-100">
          <Check className="w-5 h-5 text-accent-primary" />
        </div>
      )}
    </button>
  )
}

export default function OnboardingV2() {
  const router = useRouter()
  const { budget, handleBudgetChange, displayBudget } = useBudgetState({
    initialBudget: 300,
    minBudget: 20,
    maxBudget: 10000,
    enableAnalytics: true,
    enablePersistence: true
  })

  const [state, setState] = useState<OnboardingState>({
    experience: null,
    budget: budget,
    budgetRange: { min: Math.max(50, budget * 0.8), max: Math.min(10000, budget * 1.2) },
    wantRecommendations: {
      cans: false,
      iems: false,
      dac: false,
      amp: false,
      combo: false
    },
    hasExistingGear: null,
    existingGear: {
      headphones: false,
      dac: false,
      amp: false,
      combo: false
    },
    primaryUsage: null,
    soundSignature: null,
    listeningSpace: null,
    powerNeeds: null
  })

  // Update budget in state when it changes
  useEffect(() => {
    setState(prev => ({ ...prev, budget: budget }))
  }, [budget])

  // Determine which steps are completed
  const steps = {
    experience: state.experience !== null,
    products: Object.values(state.wantRecommendations).some(v => v),
    budget: true, // Always considered complete since it has a default
    // For beginners/intermediates, usage sets sound signature automatically
    // For enthusiasts, they choose sound signature directly
    preferences: state.experience === 'enthusiast'
      ? state.soundSignature !== null
      : state.primaryUsage !== null,
  }

  // Determine current active step
  const getCurrentStep = () => {
    if (!steps.experience) return 1
    if (!steps.products) return 2
    if (!steps.preferences) return 3
    return 4 // All complete, show budget
  }

  const currentStep = getCurrentStep()
  const allComplete = steps.experience && steps.products && steps.preferences
  const [isTransitioning, setIsTransitioning] = useState(false)

  // Auto-scroll to budget section when all steps complete
  useEffect(() => {
    if (allComplete) {
      const budgetSection = document.getElementById('budget-section')
      if (budgetSection) {
        budgetSection.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }
  }, [allComplete])

  // Handle final submission with transition state
  const handleGetRecommendations = () => {
    setIsTransitioning(true)

    // Show transition state for 2 seconds before navigating
    setTimeout(() => {
      // Convert new model (cans/iems separate) to old model (headphones + headphoneType)
      const wantsHeadphones = state.wantRecommendations.cans || state.wantRecommendations.iems
      const headphoneType = state.wantRecommendations.cans && state.wantRecommendations.iems ? 'both' :
                           state.wantRecommendations.cans ? 'cans' :
                           state.wantRecommendations.iems ? 'iems' : 'both'

      const params = new URLSearchParams({
        experience: state.experience || 'intermediate',
        budget: state.budget.toString(),
        budgetRangeMin: '20', // Fixed percentage
        budgetRangeMax: '10', // Fixed percentage
        headphoneType: headphoneType,
        wantRecommendationsFor: JSON.stringify({
          headphones: wantsHeadphones,
          dac: state.wantRecommendations.dac,
          amp: state.wantRecommendations.amp,
          combo: state.wantRecommendations.combo
        }),
        existingGear: JSON.stringify({
          ...state.existingGear,
          specificModels: { headphones: '', dac: '', amp: '', combo: '' }
        }),
        usage: state.primaryUsage || 'music',
        usageRanking: JSON.stringify([state.primaryUsage || 'music']),
        excludedUsages: JSON.stringify([]),
        sound: state.soundSignature || 'neutral',
      })

      // Scroll to top before navigation
      window.scrollTo({ top: 0, behavior: 'instant' })

      // Navigate with a flag indicating chat should be available
      router.push(`/recommendations?${params.toString()}&enableChat=true`)
    }, 2000)
  }

  return (
    <div className="min-h-screen bg-background-primary py-8">
      <div className="max-w-3xl mx-auto px-4">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Find Your Perfect Audio Setup
          </h1>
          <p className="text-text-secondary">
            Quick questions to personalize your recommendations
          </p>
        </div>

        {/* Progress indicator */}
        <div className="flex gap-1 mb-8 max-w-md mx-auto">
          {[1, 2, 3].map(step => (
            <div
              key={step}
              className={`
                h-1 flex-1 rounded-full transition-all duration-300
                ${step < currentStep ? 'bg-accent-primary' :
                  step === currentStep ? 'bg-accent-primary/50 animate-pulse' :
                  'bg-border-tertiary'}
              `}
            />
          ))}
        </div>

        {/* Step 1: Experience Level - 3 columns */}
        <StepSection
          stepNumber={1}
          title="👤 Experience Level"
          subtitle="How familiar are you with hi-fi audio?"
          isActive={currentStep === 1}
          isCompleted={steps.experience}
        >
          <div className="grid grid-cols-3 gap-3">
            <OptionCard
              selected={state.experience === 'beginner'}
              onClick={() => setState({ ...state, experience: 'beginner' })}
              description="New to quality audio"
            >
              🌱 Beginner
            </OptionCard>
            <OptionCard
              selected={state.experience === 'intermediate'}
              onClick={() => setState({ ...state, experience: 'intermediate' })}
              description="Some knowledge"
            >
              🎯 Intermediate
            </OptionCard>
            <OptionCard
              selected={state.experience === 'enthusiast'}
              onClick={() => setState({ ...state, experience: 'enthusiast' })}
              description="Expert level"
            >
              🔥 Enthusiast
            </OptionCard>
          </div>
        </StepSection>

        {/* Step 2: Product Selection - Simplified to 5 pills */}
        <StepSection
          stepNumber={2}
          title="🎧 What You Need"
          subtitle="Select all components you're interested in (budget will be allocated automatically)"
          isActive={currentStep === 2}
          isCompleted={steps.products}
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <OptionCard
              selected={state.wantRecommendations.cans}
              onClick={() => setState({
                ...state,
                wantRecommendations: {
                  ...state.wantRecommendations,
                  cans: !state.wantRecommendations.cans
                }
              })}
              description="Over-ear"
            >
              🎧 Headphones
            </OptionCard>
            <OptionCard
              selected={state.wantRecommendations.iems}
              onClick={() => setState({
                ...state,
                wantRecommendations: {
                  ...state.wantRecommendations,
                  iems: !state.wantRecommendations.iems
                }
              })}
              description="In-ear monitors"
            >
              🎵 IEMs
            </OptionCard>
            <OptionCard
              selected={state.wantRecommendations.dac}
              onClick={() => setState({
                ...state,
                wantRecommendations: {
                  ...state.wantRecommendations,
                  dac: !state.wantRecommendations.dac
                }
              })}
              description="Digital to Analog"
            >
              📊 DAC
            </OptionCard>
            <OptionCard
              selected={state.wantRecommendations.amp}
              onClick={() => setState({
                ...state,
                wantRecommendations: {
                  ...state.wantRecommendations,
                  amp: !state.wantRecommendations.amp
                }
              })}
              description="Power for headphones"
            >
              ⚡ Amplifier
            </OptionCard>
            <OptionCard
              selected={state.wantRecommendations.combo}
              onClick={() => setState({
                ...state,
                wantRecommendations: {
                  ...state.wantRecommendations,
                  combo: !state.wantRecommendations.combo
                }
              })}
              description="All-in-one solution"
            >
              🎯 DAC/Amp Combo
            </OptionCard>
          </div>
        </StepSection>

        {/* Step 3: Conditional Preferences - Usage for beginners/intermediates, Sound for enthusiasts */}
        {state.experience !== 'enthusiast' ? (
          <StepSection
            stepNumber={3}
            title="🎯 Primary Usage"
            subtitle="How will you mainly use your audio system?"
            isActive={currentStep === 3}
            isCompleted={steps.preferences}
          >
            <div className="grid grid-cols-2 gap-3">
              <OptionCard
                selected={state.primaryUsage === 'music'}
                onClick={() => setState({
                  ...state,
                  primaryUsage: 'music',
                  soundSignature: 'neutral' // Accurate reproduction for critical listening
                })}
                description="Critical listening"
              >
                🎵 Music
              </OptionCard>
              <OptionCard
                selected={state.primaryUsage === 'gaming'}
                onClick={() => setState({
                  ...state,
                  primaryUsage: 'gaming',
                  soundSignature: 'fun' // V-shaped for excitement and spatial cues
                })}
                description="Competitive & immersive"
              >
                🎮 Gaming
              </OptionCard>
              <OptionCard
                selected={state.primaryUsage === 'movies'}
                onClick={() => setState({
                  ...state,
                  primaryUsage: 'movies',
                  soundSignature: 'fun' // V-shaped for cinematic impact
                })}
                description="Cinema experience"
              >
                🎬 Movies & TV
              </OptionCard>
              <OptionCard
                selected={state.primaryUsage === 'work'}
                onClick={() => setState({
                  ...state,
                  primaryUsage: 'work',
                  soundSignature: 'neutral' // Clear voice reproduction
                })}
                description="Calls & productivity"
              >
                💼 Work from Home
              </OptionCard>
              <OptionCard
                selected={state.primaryUsage === 'studio'}
                onClick={() => setState({
                  ...state,
                  primaryUsage: 'studio',
                  soundSignature: 'neutral' // Accurate monitoring
                })}
                description="Production & mixing"
              >
                🎚️ Studio/Production
              </OptionCard>
              <OptionCard
                selected={state.primaryUsage === 'travel'}
                onClick={() => setState({
                  ...state,
                  primaryUsage: 'travel',
                  soundSignature: 'warm' // Fatigue-free for long sessions
                })}
                description="On-the-go listening"
              >
                ✈️ Travel/Commute
              </OptionCard>
            </div>
          </StepSection>
        ) : (
          <StepSection
            stepNumber={3}
            title="🔊 Sound Preference"
            subtitle="What kind of sound do you enjoy?"
            isActive={currentStep === 3}
            isCompleted={steps.preferences}
          >
            <div className="grid grid-cols-2 gap-3">
              <OptionCard
                selected={state.soundSignature === 'neutral'}
                onClick={() => setState({
                  ...state,
                  soundSignature: 'neutral',
                  primaryUsage: 'music' // Still set usage for backend compatibility
                })}
                description="Accurate, uncolored"
              >
                ⚖️ Neutral/Reference
              </OptionCard>
              <OptionCard
                selected={state.soundSignature === 'warm'}
                onClick={() => setState({
                  ...state,
                  soundSignature: 'warm',
                  primaryUsage: 'music' // Still set usage for backend compatibility
                })}
                description="Rich bass, smooth"
              >
                🔥 Warm & Musical
              </OptionCard>
              <OptionCard
                selected={state.soundSignature === 'bright'}
                onClick={() => setState({
                  ...state,
                  soundSignature: 'bright',
                  primaryUsage: 'music' // Still set usage for backend compatibility
                })}
                description="Detailed treble, clarity"
              >
                ✨ Bright & Analytical
              </OptionCard>
              <OptionCard
                selected={state.soundSignature === 'fun'}
                onClick={() => setState({
                  ...state,
                  soundSignature: 'fun',
                  primaryUsage: 'music' // Still set usage for backend compatibility
                })}
                description="V-shaped, exciting"
              >
                🎉 Fun & Engaging
              </OptionCard>
            </div>
          </StepSection>
        )}

        {/* Step 4: Budget - Using simple slider */}
        {allComplete && !isTransitioning && (
          <div id="budget-section">
            <StepSection
              stepNumber={4}
              title="💰 Budget Range"
              subtitle="Set your comfortable spending range"
              isActive={true}
              isCompleted={true}
            >
              <div className="space-y-8">
                <BudgetSliderEnhanced
                  budget={budget}
                  displayBudget={displayBudget}
                  onChange={handleBudgetChange}
                  variant="simple"
                  showInput={true}
                  showLabels={true}
                />

                {/* Continue button */}
                <button
                  onClick={handleGetRecommendations}
                  className="
                    w-full py-5 px-8 bg-orange-500 text-white text-lg font-bold rounded-xl
                    hover:bg-orange-600 transition-all duration-200
                    flex items-center justify-center gap-2 shadow-lg
                    transform hover:scale-[1.02] active:scale-[0.98]
                    dark:bg-orange-600 dark:hover:bg-orange-700
                  "
                >
                  Continue to Recommendations
                  <ChevronRight className="w-6 h-6" />
                </button>

                <p className="text-center text-sm text-text-secondary">
                  You&apos;ll be able to fine-tune your results and explore used listings
                </p>
              </div>
            </StepSection>
          </div>
        )}

        {/* Transition/Loading State */}
        {isTransitioning && (
          <div className="fixed inset-0 bg-background-primary/95 backdrop-blur-sm z-50 flex items-center justify-center">
            <div className="text-center space-y-6 max-w-md px-4">
              <div className="animate-pulse">
                <div className="w-20 h-20 bg-accent-primary/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-4xl">🎧</span>
                </div>
              </div>

              <h2 className="text-2xl font-bold text-text-primary">
                Finding Your Perfect Audio Match...
              </h2>

              <div className="space-y-2">
                <p className="text-text-secondary">
                  Analyzing {Object.values(state.wantRecommendations).filter(Boolean).length} component types
                </p>
                <p className="text-text-secondary">
                  Optimizing for {state.primaryUsage || 'music'} listening
                </p>
                <p className="text-text-secondary">
                  Within your ${displayBudget} budget
                </p>
              </div>

              <div className="flex justify-center gap-2">
                <div className="w-2 h-2 bg-accent-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-accent-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-accent-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Skip link for returning users */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/recommendations')}
            className="text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            Skip setup and browse all products →
          </button>
        </div>
      </div>
    </div>
  )
}