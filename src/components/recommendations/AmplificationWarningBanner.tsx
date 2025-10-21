'use client'

import { memo } from 'react'

interface AudioComponent {
  id: string
  name: string
}

interface AmplificationWarningBannerProps {
  selectedNeedAmp: AudioComponent[]
  wantRecommendationsFor: {
    headphones: boolean
    dac: boolean
    amp: boolean
    combo: boolean
  }
  onAddAmplification: () => void
}

const AmplificationWarningBannerComponent = ({
  selectedNeedAmp,
  wantRecommendationsFor,
  onAddAmplification
}: AmplificationWarningBannerProps) => {
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
      </div>
    </div>
  )
}

export const AmplificationWarningBanner = memo(AmplificationWarningBannerComponent)
