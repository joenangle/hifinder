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
    <div className="flex items-center gap-2 py-2 px-4 border-l-4 border-yellow-500 bg-yellow-100 dark:bg-yellow-900/30 rounded-r" style={{ marginBottom: '12px' }}>
      <span className="text-lg flex-shrink-0">⚡</span>
      <span className="text-sm text-yellow-900 dark:text-yellow-200 flex-1">
        Some recommendations benefit from external amplification
      </span>
      <button
        onClick={onAddAmplification}
        className={`px-3 py-1 rounded text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
          amplificationEnabled
            ? 'bg-green-600 hover:bg-green-700 text-white'
            : 'bg-yellow-600 hover:bg-yellow-700 text-white'
        }`}
        title={amplificationEnabled ? 'Hide amplification suggestions' : 'Show amplification suggestions'}
      >
        {amplificationEnabled ? '✓ Amps On' : 'Show Amps'}
      </button>
      <button
        onClick={() => setIsDismissed(true)}
        className="text-yellow-800 dark:text-yellow-300 hover:text-yellow-950 dark:hover:text-yellow-100 transition-colors flex-shrink-0"
        aria-label="Dismiss warning"
      >
        <svg
          className="w-4 h-4"
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
