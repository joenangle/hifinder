'use client'

import { memo, useRef, useState } from 'react'
import { Zap, Check, X } from 'lucide-react'

interface AudioComponent {
  id: string
  name: string
}

interface AmplificationWarningBannerProps {
  selectedNeedAmp: AudioComponent[]
  onAddAmplification: () => void
  amplificationEnabled?: boolean
}

const AmplificationWarningBannerComponent = ({
  selectedNeedAmp,
  onAddAmplification,
  amplificationEnabled = false
}: AmplificationWarningBannerProps) => {
  // Track which set of demanding-headphone IDs the user dismissed.
  // When the set changes (a new demanding HP is added), re-show the warning.
  const dismissedSnapshot = useRef<string>('')
  const [, forceRerender] = useState(0)

  const currentSnapshot = selectedNeedAmp.map(c => c.id).sort().join(',')
  const isDismissed = currentSnapshot !== '' && dismissedSnapshot.current === currentSnapshot

  if (isDismissed) {
    return null
  }

  return (
    <div className="flex items-center gap-3 py-3 px-4 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 mb-3">
      <Zap className="w-5 h-5 text-amber-700 dark:text-amber-400 shrink-0" aria-hidden="true" />
      <span className="text-sm font-medium text-amber-900 dark:text-amber-200 flex-1">
        Some recommendations benefit from external amplification
      </span>
      <button
        onClick={onAddAmplification}
        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
          amplificationEnabled
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-amber-600 hover:bg-amber-700 text-white'
        }`}
        title={amplificationEnabled ? 'Hide amplification suggestions' : 'Show amplification suggestions'}
      >
        {amplificationEnabled && <Check className="w-3.5 h-3.5" aria-hidden="true" />}
        {amplificationEnabled ? 'Amps On' : 'Show Amps'}
      </button>
      <button
        onClick={() => {
          dismissedSnapshot.current = currentSnapshot
          forceRerender(n => n + 1)
        }}
        className="p-1 rounded hover:bg-amber-200/50 dark:hover:bg-amber-800/30 transition-colors shrink-0"
        aria-label="Dismiss warning"
      >
        <X className="w-4 h-4 text-amber-700 dark:text-amber-400" aria-hidden="true" />
      </button>
    </div>
  )
}

export const AmplificationWarningBanner = memo(AmplificationWarningBannerComponent)
