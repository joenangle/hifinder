'use client'

import { memo } from 'react'
import { Sparkles, Search, Settings } from 'lucide-react'

export type BrowseMode = 'guided' | 'explore' | 'advanced'

interface BrowseModeSelectorProps {
  currentMode: BrowseMode
  onModeChange: (mode: BrowseMode) => void
}

const BrowseModeSelectorComponent = ({
  currentMode,
  onModeChange
}: BrowseModeSelectorProps) => {
  const modes = [
    {
      id: 'guided' as BrowseMode,
      icon: Sparkles,
      title: 'Show me top picks',
      description: '3-5 highly-rated options that just work',
      bestFor: 'Quick decisions, trusted recommendations'
    },
    {
      id: 'explore' as BrowseMode,
      icon: Search,
      title: 'Let me explore',
      description: '5-8 options with filtering controls',
      bestFor: 'Comparing options, researching features'
    },
    {
      id: 'advanced' as BrowseMode,
      icon: Settings,
      title: 'Full control mode',
      description: '10+ options with advanced filters',
      bestFor: 'Deep research, specific requirements'
    }
  ]

  return (
    <div className="card p-4 mb-6">
      <h3 className="text-sm font-semibold text-text-secondary mb-3">
        How would you like to browse?
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {modes.map((mode) => {
          const Icon = mode.icon
          const isActive = currentMode === mode.id

          return (
            <button
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              className={`
                text-left p-4 rounded-lg border-2 transition-all
                ${
                  isActive
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
                    : 'border-border-default hover:border-orange-300 dark:hover:border-orange-700'
                }
              `}
            >
              <div className="flex items-start gap-3">
                <Icon
                  className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
                    isActive ? 'text-orange-600 dark:text-orange-400' : 'text-text-secondary'
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-sm mb-1 ${
                    isActive ? 'text-orange-900 dark:text-orange-100' : 'text-text-primary'
                  }`}>
                    {mode.title}
                  </div>
                  <div className="text-xs text-text-secondary mb-2">
                    {mode.description}
                  </div>
                  <div className="text-xs text-text-tertiary">
                    Best for: {mode.bestFor}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export const BrowseModeSelector = memo(BrowseModeSelectorComponent)
