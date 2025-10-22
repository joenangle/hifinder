'use client'

import { Lightbulb, LightbulbOff } from 'lucide-react'

interface GuidedModeToggleProps {
  enabled: boolean
  onToggle: () => void
  className?: string
}

export function GuidedModeToggle({ enabled, onToggle, className = '' }: GuidedModeToggleProps) {
  return (
    <button
      onClick={onToggle}
      className={`
        flex items-center gap-2 px-6 py-3 rounded-lg border-2 transition-all
        ${enabled
          ? 'bg-accent-primary/10 border-accent-primary text-accent-primary dark:bg-accent-primary/20'
          : 'bg-surface-secondary border-border-default text-text-secondary hover:border-border-primary hover:text-text-primary'
        }
        ${className}
      `}
      title={enabled ? 'Disable helpful tooltips' : 'Enable helpful tooltips for beginners'}
    >
      {enabled ? (
        <>
          <Lightbulb className="w-5 h-5" />
          <span className="text-base font-medium">Guided Mode On</span>
        </>
      ) : (
        <>
          <LightbulbOff className="w-5 h-5" />
          <span className="text-base font-medium">Guided Mode Off</span>
        </>
      )}
    </button>
  )
}
