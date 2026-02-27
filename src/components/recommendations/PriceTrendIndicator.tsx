'use client'

import { memo } from 'react'
import { useBatchPriceHistory } from '@/hooks/useBatchPriceHistory'

const PriceTrendIndicatorComponent = ({ componentId }: { componentId: string }) => {
  const { data: batchData, isBatched } = useBatchPriceHistory(componentId)

  // Only works inside batch provider (recommendation cards always are)
  if (!isBatched || !batchData || !batchData.trend) return null

  // Only show for actionable trends, not stable
  if (batchData.trend === 'stable') return null

  if (batchData.trend === 'down') {
    return (
      <div className="flex items-center gap-0.5 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </svg>
        Prices dropping
      </div>
    )
  }

  // trend === 'up'
  return (
    <div className="flex items-center gap-0.5 text-[10px] text-red-600 dark:text-red-400 font-medium mt-0.5">
      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
      Prices rising
    </div>
  )
}

export const PriceTrendIndicator = memo(PriceTrendIndicatorComponent)
