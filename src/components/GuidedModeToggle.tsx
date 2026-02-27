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
        flex items-center gap-2 px-6 py-3 rounded-lg border-2 transition-[color,background-color,border-color]
        ${enabled
          ? 'bg-accent/10 border-accent text-accent dark:bg-accent/20'
          : 'bg-surface-secondary text-secondary hover:border-primary hover:text-primary'
        }
        ${className}
      `}
      title={enabled ? 'Hide tooltips' : 'Show helpful tooltips'}
    >
      {enabled ? (
        <>
          <Lightbulb className="w-5 h-5" />
          <span className="text-base font-medium">Tooltips On</span>
        </>
      ) : (
        <>
          <LightbulbOff className="w-5 h-5" />
          <span className="text-base font-medium">Tooltips Off</span>
        </>
      )}
    </button>
  )
}
