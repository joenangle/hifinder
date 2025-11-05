'use client'

import { memo, useState } from 'react'

interface AudioComponent {
  id: string
  name: string
}

interface AmplificationWarningBannerProps {
  selectedNeedAmp: AudioComponent[]
  onAddAmplification: () => void
}

const AmplificationWarningBannerComponent = ({
  selectedNeedAmp,
  onAddAmplification
}: AmplificationWarningBannerProps) => {
  const [isDismissed, setIsDismissed] = useState(false)

  if (isDismissed) {
    return null
  }

  return (
    <div className="card p-6 border-l-4 border-yellow-500 bg-yellow-50" style={{ marginBottom: '32px' }}>
      <div className="flex items-start space-x-3">
        <div className="text-2xl">⚡</div>
        <div className="flex-1">
          <h3 className="font-semibold text-yellow-800 mb-2">
            Amplification Recommended
          </h3>
          <p className="text-yellow-700 mb-3">
            {selectedNeedAmp.length > 0
              ? `Your selected headphones (${selectedNeedAmp.map(h => h.name).join(', ')}) benefit from dedicated amplification for optimal performance.`
              : `Some recommended headphones require amplification to reach their full potential.`
            }
          </p>
          <button
            onClick={onAddAmplification}
            className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
          >
            Add Amplifier & Combo Recommendations
          </button>
        </div>
        <button
          onClick={() => setIsDismissed(true)}
          className="text-yellow-700 hover:text-yellow-900 transition-colors ml-2 flex-shrink-0"
          aria-label="Dismiss warning"
        >
          <svg
            className="w-5 h-5"
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
    </div>
  )
}

export const AmplificationWarningBanner = memo(AmplificationWarningBannerComponent)
