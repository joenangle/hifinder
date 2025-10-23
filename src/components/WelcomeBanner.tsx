'use client'

import { useState } from 'react'
import { X, Lightbulb, Sparkles } from 'lucide-react'

interface WelcomeBannerProps {
  onDismiss: () => void
  onEnableGuidedMode?: () => void
}

export function WelcomeBanner({ onDismiss, onEnableGuidedMode }: WelcomeBannerProps) {
  const [isVisible, setIsVisible] = useState(true)

  const handleDismiss = () => {
    setIsVisible(false)
    setTimeout(() => onDismiss(), 300) // Wait for fade-out animation
  }

  if (!isVisible) return null

  return (
    <div
      className={`
        card border-l-4 border-accent-primary mb-8 overflow-hidden
        transition-all duration-300 animate-in fade-in slide-in-from-top-4
        ${isVisible ? 'opacity-100' : 'opacity-0'}
      `}
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-accent-primary/10 dark:bg-accent-primary/20 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-accent-primary" />
          </div>

          {/* Content */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-2">
              <h3 className="heading-3 text-text-primary">
                Welcome to HiFinder! 👋
              </h3>
              <button
                onClick={handleDismiss}
                className="text-text-tertiary hover:text-text-primary transition-colors p-1 -mt-1"
                aria-label="Dismiss welcome message"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-text-secondary mb-4">
              We&apos;ve personalized these recommendations based on smart defaults. Use the filters below to refine your search:
            </p>

            {/* Quick tips */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="flex items-start gap-2">
                <div className="text-accent-primary mt-0.5">💰</div>
                <div>
                  <p className="text-sm font-medium text-text-primary">Adjust Your Budget</p>
                  <p className="text-xs text-text-secondary">Slide to see options in your price range</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="text-accent-primary mt-0.5">🎧</div>
                <div>
                  <p className="text-sm font-medium text-text-primary">Choose Equipment</p>
                  <p className="text-xs text-text-secondary">Toggle headphones, IEMs, DACs, or amps</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="text-accent-primary mt-0.5">👂</div>
                <div>
                  <p className="text-sm font-medium text-text-primary">Pick Sound Style</p>
                  <p className="text-xs text-text-secondary">Find your preferred sound signature</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3">
              {onEnableGuidedMode && (
                <button
                  onClick={() => {
                    onEnableGuidedMode()
                    handleDismiss()
                  }}
                  className="flex items-center gap-2 text-sm px-4 py-2 rounded-lg font-semibold transition-all bg-orange-600 hover:bg-orange-700 active:bg-orange-800 text-white dark:bg-orange-500 dark:hover:bg-orange-600 dark:active:bg-orange-700"
                >
                  <Lightbulb className="w-4 h-4" />
                  Enable Guided Mode
                </button>
              )}

              <button
                onClick={handleDismiss}
                className="button button-secondary text-sm"
              >
                Got it, let me explore
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
