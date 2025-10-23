'use client'

import { memo } from 'react'
import { Sparkles, Search, Settings, Lightbulb, LightbulbOff } from 'lucide-react'

export type BrowseMode = 'guided' | 'explore' | 'advanced'

interface BrowseModeSelectorProps {
  currentMode: BrowseMode
  onModeChange: (mode: BrowseMode) => void
  tooltipsEnabled?: boolean
  onTooltipToggle?: () => void
}

const BrowseModeSelectorComponent = ({
  currentMode,
  onModeChange,
  tooltipsEnabled = false,
  onTooltipToggle
}: BrowseModeSelectorProps) => {
  const modes = [
    {
      id: 'guided' as BrowseMode,
      icon: Sparkles,
      title: 'Show me top picks',
      description: '3-5 highly-rated results that just work',
      bestFor: 'Quick decisions, trusted recommendations'
    },
    {
      id: 'explore' as BrowseMode,
      icon: Search,
      title: 'Let me explore',
      description: '5-8 results with filtering controls',
      bestFor: 'Comparing results, researching features'
    },
    {
      id: 'advanced' as BrowseMode,
      icon: Settings,
      title: 'Full control mode',
      description: '10+ results with advanced filters',
      bestFor: 'Deep research, specific requirements'
    }
  ]

  return (
    <div className="card p-4 mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-text-secondary">
          How would you like to browse?
        </h3>
        {onTooltipToggle && (
          <button
            onClick={onTooltipToggle}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all
              ${tooltipsEnabled
                ? 'bg-accent-primary/10 text-accent-primary border border-accent-primary/30'
                : 'bg-surface-secondary text-text-secondary border border-border-default hover:border-border-primary'
              }
            `}
            title={tooltipsEnabled ? 'Hide tooltips' : 'Show tooltips'}
          >
            {tooltipsEnabled ? (
              <>
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Tooltips On</span>
              </>
            ) : (
              <>
                <LightbulbOff className="w-3.5 h-3.5" />
                <span>Tooltips Off</span>
              </>
            )}
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {modes.map((mode) => {
          const Icon = mode.icon
          const isActive = currentMode === mode.id

          return (
            <button
              key={mode.id}
              onClick={() => onModeChange(mode.id)}
              style={{
                borderWidth: '2px',
                borderColor: isActive
                  ? 'var(--browse-mode-border-active)'
                  : 'var(--browse-mode-border-inactive)',
                backgroundColor: isActive
                  ? 'var(--browse-mode-bg-active)'
                  : 'var(--browse-mode-bg-inactive)'
              }}
              className="text-left p-4 rounded-lg transition-all hover:border-[var(--browse-mode-border-hover)]"
            >
              <div className="flex items-start gap-3">
                <Icon
                  className="w-5 h-5 mt-0.5 flex-shrink-0"
                  style={{
                    color: isActive
                      ? 'var(--browse-mode-icon-active)'
                      : 'var(--browse-mode-icon-inactive)'
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div
                    className="font-semibold text-sm mb-1"
                    style={{
                      color: isActive
                        ? 'var(--browse-mode-title-active)'
                        : 'var(--browse-mode-title-inactive)'
                    }}
                  >
                    {mode.title}
                  </div>
                  <div
                    className="text-xs mb-2"
                    style={{ color: 'var(--browse-mode-description)' }}
                  >
                    {mode.description}
                  </div>
                  <div
                    className="text-xs"
                    style={{ color: 'var(--browse-mode-bestfor)' }}
                  >
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
