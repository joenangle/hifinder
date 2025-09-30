'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronRight, Headphones, Music, Volume2, Zap, Globe, Home } from 'lucide-react'
import { BudgetSliderEnhanced } from '@/components/BudgetSliderEnhanced'
import { useBudgetState } from '@/hooks/useBudgetState'

interface OnboardingState {
  // Core preferences
  experience: string | null
  budget: number
  budgetRange: { min: number; max: number }

  // Product selection
  headphoneType: string | null
  wantRecommendations: {
    headphones: boolean
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
  return (
    <div
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

// Option card component
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
        relative p-4 rounded-lg border-2 transition-all text-left w-full
        ${disabled ? 'opacity-50 cursor-not-allowed' :
          selected
            ? 'border-accent-primary bg-accent-primary/10 transform scale-[1.02]'
            : 'border-border-secondary hover:border-border-primary hover:bg-surface-hover hover:transform hover:scale-[1.01]'}
      `}
    >
      {icon && (
        <div className="mb-2 text-accent-primary">
          {icon}
        </div>
      )}
      <div className="font-medium text-text-primary">
        {children}
      </div>
      {description && (
        <div className="text-sm text-text-secondary mt-1">
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
  const {
    budget,
    budgetRange,
    updateBudget,
    updateBudgetRange
  } = useBudgetState()

  const [state, setState] = useState<OnboardingState>({
    experience: null,
    budget: budget,
    budgetRange: { min: budgetRange.min, max: budgetRange.max },
    headphoneType: null,
    wantRecommendations: {
      headphones: false,
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

  // Determine which steps are completed
  const steps = {
    experience: state.experience !== null,
    products: Object.values(state.wantRecommendations).some(v => v),
    budget: true, // Always considered complete since it has a default
    existingGear: state.hasExistingGear !== null,
    usage: state.primaryUsage !== null,
    sound: state.soundSignature !== null,
  }

  // Determine current active step (only one at a time for cleaner UX)
  const getCurrentStep = () => {
    if (!steps.experience) return 1
    if (!steps.products) return 2
    if (!steps.existingGear) return 3
    if (!steps.usage) return 4
    if (!steps.sound) return 5
    return 6 // All complete, show budget
  }

  const currentStep = getCurrentStep()
  const allComplete = steps.experience && steps.products && steps.existingGear && steps.usage && steps.sound

  // Handle final submission
  const handleGetRecommendations = () => {
    const params = new URLSearchParams({
      experience: state.experience || 'intermediate',
      budget: state.budget.toString(),
      budgetRangeMin: ((budget - state.budgetRange.min) / budget * 100).toString(),
      budgetRangeMax: ((state.budgetRange.max - budget) / budget * 100).toString(),
      headphoneType: state.headphoneType || 'both',
      wantRecommendationsFor: JSON.stringify(state.wantRecommendations),
      existingGear: JSON.stringify({
        ...state.existingGear,
        specificModels: { headphones: '', dac: '', amp: '', combo: '' }
      }),
      usage: state.primaryUsage || 'music',
      usageRanking: JSON.stringify([state.primaryUsage || 'music']),
      excludedUsages: JSON.stringify([]),
      sound: state.soundSignature || 'neutral',
    })

    // Navigate with a flag indicating chat should be available
    router.push(`/recommendations?${params.toString()}&enableChat=true`)
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
          {[1, 2, 3, 4, 5].map(step => (
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

        {/* Step 1: Experience Level */}
        <StepSection
          stepNumber={1}
          title="Experience Level"
          subtitle="How familiar are you with hi-fi audio?"
          isActive={currentStep === 1}
          isCompleted={steps.experience}
        >
          <div className="grid grid-cols-2 gap-3">
            <OptionCard
              selected={state.experience === 'beginner'}
              onClick={() => setState({ ...state, experience: 'beginner' })}
              description="New to quality audio"
            >
              Complete Beginner
            </OptionCard>
            <OptionCard
              selected={state.experience === 'intermediate'}
              onClick={() => setState({ ...state, experience: 'intermediate' })}
              description="Some knowledge"
            >
              Some Experience
            </OptionCard>
            <OptionCard
              selected={state.experience === 'enthusiast'}
              onClick={() => setState({ ...state, experience: 'enthusiast' })}
              description="Deep understanding"
            >
              Enthusiast
            </OptionCard>
            <OptionCard
              selected={state.experience === 'audiophile'}
              onClick={() => setState({ ...state, experience: 'audiophile' })}
              description="Expert level"
            >
              Audiophile
            </OptionCard>
          </div>
        </StepSection>

        {/* Step 2: Product Selection */}
        <StepSection
          stepNumber={2}
          title="What You Need"
          subtitle="Select all components you're interested in"
          isActive={currentStep === 2}
          isCompleted={steps.products}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <OptionCard
                selected={state.wantRecommendations.headphones}
                onClick={() => setState({
                  ...state,
                  wantRecommendations: {
                    ...state.wantRecommendations,
                    headphones: !state.wantRecommendations.headphones
                  },
                  headphoneType: state.wantRecommendations.headphones ? null : 'both'
                })}
                icon={<Headphones className="w-5 h-5" />}
              >
                Headphones/IEMs
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
                DAC
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
                Amplifier
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
                DAC/Amp Combo
              </OptionCard>
            </div>

            {/* Sub-question for headphone type */}
            {state.wantRecommendations.headphones && (
              <div className="pl-4 border-l-2 border-accent-primary/20 transition-all duration-300">
                <p className="text-sm text-text-secondary mb-2">Headphone preference:</p>
                <div className="grid grid-cols-3 gap-2">
                  <OptionCard
                    selected={state.headphoneType === 'cans'}
                    onClick={() => setState({ ...state, headphoneType: 'cans' })}
                  >
                    Over-ear
                  </OptionCard>
                  <OptionCard
                    selected={state.headphoneType === 'iems'}
                    onClick={() => setState({ ...state, headphoneType: 'iems' })}
                  >
                    IEMs
                  </OptionCard>
                  <OptionCard
                    selected={state.headphoneType === 'both'}
                    onClick={() => setState({ ...state, headphoneType: 'both' })}
                  >
                    Both
                  </OptionCard>
                </div>
              </div>
            )}
          </div>
        </StepSection>

        {/* Step 3: Existing Gear */}
        <StepSection
          stepNumber={3}
          title="Your Current Setup"
          subtitle="Do you have any existing audio gear?"
          isActive={currentStep === 3}
          isCompleted={steps.existingGear}
        >
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <OptionCard
                selected={state.hasExistingGear === false}
                onClick={() => setState({
                  ...state,
                  hasExistingGear: false,
                  existingGear: {
                    headphones: false,
                    dac: false,
                    amp: false,
                    combo: false
                  }
                })}
                icon={<Zap className="w-5 h-5" />}
                description="Building from scratch"
              >
                Starting Fresh
              </OptionCard>
              <OptionCard
                selected={state.hasExistingGear === true}
                onClick={() => setState({ ...state, hasExistingGear: true })}
                description="Upgrading my system"
              >
                I Have Gear
              </OptionCard>
            </div>

            {state.hasExistingGear && (
              <div className="pl-4 border-l-2 border-accent-primary/20 transition-all duration-300">
                <p className="text-sm text-text-secondary mb-2">What do you already have?</p>
                <div className="grid grid-cols-2 gap-2">
                  <OptionCard
                    selected={state.existingGear.headphones}
                    onClick={() => setState({
                      ...state,
                      existingGear: {
                        ...state.existingGear,
                        headphones: !state.existingGear.headphones
                      }
                    })}
                  >
                    Headphones
                  </OptionCard>
                  <OptionCard
                    selected={state.existingGear.dac}
                    onClick={() => setState({
                      ...state,
                      existingGear: {
                        ...state.existingGear,
                        dac: !state.existingGear.dac
                      }
                    })}
                  >
                    DAC
                  </OptionCard>
                  <OptionCard
                    selected={state.existingGear.amp}
                    onClick={() => setState({
                      ...state,
                      existingGear: {
                        ...state.existingGear,
                        amp: !state.existingGear.amp
                      }
                    })}
                  >
                    Amplifier
                  </OptionCard>
                  <OptionCard
                    selected={state.existingGear.combo}
                    onClick={() => setState({
                      ...state,
                      existingGear: {
                        ...state.existingGear,
                        combo: !state.existingGear.combo
                      }
                    })}
                  >
                    Combo Unit
                  </OptionCard>
                </div>
              </div>
            )}
          </div>
        </StepSection>

        {/* Step 4: Primary Usage */}
        <StepSection
          stepNumber={4}
          title="Primary Usage"
          subtitle="How will you mainly use your audio system?"
          isActive={currentStep === 4}
          isCompleted={steps.usage}
        >
          <div className="grid grid-cols-2 gap-3">
            <OptionCard
              selected={state.primaryUsage === 'music'}
              onClick={() => setState({ ...state, primaryUsage: 'music' })}
              icon={<Music className="w-5 h-5" />}
              description="Critical listening"
            >
              Music
            </OptionCard>
            <OptionCard
              selected={state.primaryUsage === 'gaming'}
              onClick={() => setState({ ...state, primaryUsage: 'gaming' })}
              description="Competitive & immersive"
            >
              Gaming
            </OptionCard>
            <OptionCard
              selected={state.primaryUsage === 'movies'}
              onClick={() => setState({ ...state, primaryUsage: 'movies' })}
              description="Cinema experience"
            >
              Movies & TV
            </OptionCard>
            <OptionCard
              selected={state.primaryUsage === 'work'}
              onClick={() => setState({ ...state, primaryUsage: 'work' })}
              icon={<Home className="w-5 h-5" />}
              description="Calls & productivity"
            >
              Work from Home
            </OptionCard>
            <OptionCard
              selected={state.primaryUsage === 'studio'}
              onClick={() => setState({ ...state, primaryUsage: 'studio' })}
              description="Production & mixing"
            >
              Studio/Production
            </OptionCard>
            <OptionCard
              selected={state.primaryUsage === 'travel'}
              onClick={() => setState({ ...state, primaryUsage: 'travel' })}
              icon={<Globe className="w-5 h-5" />}
              description="On-the-go listening"
            >
              Travel/Commute
            </OptionCard>
          </div>
        </StepSection>

        {/* Step 5: Sound Signature */}
        <StepSection
          stepNumber={5}
          title="Sound Preference"
          subtitle="What kind of sound do you enjoy?"
          isActive={currentStep === 5}
          isCompleted={steps.sound}
        >
          <div className="grid grid-cols-2 gap-3">
            <OptionCard
              selected={state.soundSignature === 'neutral'}
              onClick={() => setState({ ...state, soundSignature: 'neutral' })}
              icon={<Volume2 className="w-5 h-5" />}
              description="Accurate, uncolored"
            >
              Neutral/Reference
            </OptionCard>
            <OptionCard
              selected={state.soundSignature === 'warm'}
              onClick={() => setState({ ...state, soundSignature: 'warm' })}
              description="Rich bass, smooth"
            >
              Warm & Musical
            </OptionCard>
            <OptionCard
              selected={state.soundSignature === 'bright'}
              onClick={() => setState({ ...state, soundSignature: 'bright' })}
              description="Detailed treble, clarity"
            >
              Bright & Analytical
            </OptionCard>
            <OptionCard
              selected={state.soundSignature === 'fun'}
              onClick={() => setState({ ...state, soundSignature: 'fun' })}
              description="V-shaped, exciting"
            >
              Fun & Engaging
            </OptionCard>
          </div>
        </StepSection>

        {/* Step 6: Budget (Always visible once other steps complete) */}
        {allComplete && (
          <StepSection
            stepNumber={6}
            title="Budget Range"
            subtitle="Set your comfortable spending range"
            isActive={true}
            isCompleted={true}
          >
            <div className="space-y-4">
              <BudgetSliderEnhanced
                budget={state.budget}
                budgetRange={state.budgetRange}
                onBudgetChange={(value) => {
                  setState({ ...state, budget: value })
                  updateBudget(value)
                }}
                onRangeChange={(range) => {
                  setState({ ...state, budgetRange: range })
                  updateBudgetRange(range)
                }}
              />
              <div className="flex justify-between text-sm text-text-secondary">
                <span>Flexible range: ${state.budgetRange.min} - ${state.budgetRange.max}</span>
                <span className="font-medium">Target: ${state.budget}</span>
              </div>
            </div>
          </StepSection>
        )}

        {/* Get Recommendations Button */}
        {allComplete && (
          <div className="mt-8 transition-all duration-300">
            <button
              onClick={handleGetRecommendations}
              className="
                w-full py-4 bg-accent-primary text-white font-semibold rounded-xl
                hover:bg-accent-primary/90 transition-all duration-200
                flex items-center justify-center gap-2 shadow-lg
                transform hover:scale-[1.02] active:scale-[0.98]
              "
            >
              Get My Personalized Recommendations
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Teaser for chat refinement */}
            <p className="text-center text-sm text-text-secondary mt-4">
              You'll be able to refine your results with our AI assistant
            </p>
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