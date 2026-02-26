'use client'

import { memo, useState } from 'react'

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
  const [isDismissed, setIsDismissed] = useState(false)

  if (isDismissed) {
    return null
  }

  return (
    <div className="flex items-center gap-3 py-3 px-4 border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/40 rounded-r" style={{ marginBottom: '12px' }}>
      <span className="text-lg flex-shrink-0">⚡</span>
      <span className="text-sm font-medium text-amber-900 dark:text-amber-200 flex-1" style={{ color: 'var(--text-primary)' }}>
        Some recommendations benefit from external amplification
      </span>
      <button
        onClick={onAddAmplification}
        className={`px-3 py-1.5 rounded text-xs font-semibold transition-colors whitespace-nowrap flex-shrink-0 ${
          amplificationEnabled
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-amber-600 hover:bg-amber-700 text-white'
        }`}
        title={amplificationEnabled ? 'Hide amplification suggestions' : 'Show amplification suggestions'}
      >
        {amplificationEnabled ? '✓ Amps On' : 'Show Amps'}
      </button>
      <button
        onClick={() => setIsDismissed(true)}
        className="p-1 rounded hover:bg-amber-200/50 dark:hover:bg-amber-800/30 transition-colors flex-shrink-0"
        aria-label="Dismiss warning"
      >
        <svg
          className="w-4 h-4 text-amber-700 dark:text-amber-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  )
}

export const AmplificationWarningBanner = memo(AmplificationWarningBannerComponent)
