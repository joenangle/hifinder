'use client'

import { memo } from 'react'

interface AudioComponent {
  id: string
  name: string
  price_used_min?: number | null
  price_used_max?: number | null
}

interface SelectedSystemSummaryProps {
  selectedHeadphones: AudioComponent[]
  selectedDacs: AudioComponent[]
  selectedAmps: AudioComponent[]
  selectedCombos: AudioComponent[]
  budget: number
  onBuildStack: () => void
  onClearAll: () => void
}

const formatBudgetUSD = (amount: number) => {
  return `$${Math.round(amount).toLocaleString()}`
}

const SelectedSystemSummaryComponent = ({
  selectedHeadphones,
  selectedDacs,
  selectedAmps,
  selectedCombos,
  budget,
  onBuildStack,
  onClearAll
}: SelectedSystemSummaryProps) => {
  const totalSelectedPrice = [
    ...selectedHeadphones,
    ...selectedDacs,
    ...selectedAmps,
    ...selectedCombos
  ].reduce((sum, item) => {
    const avgPrice = ((item.price_used_min || 0) + (item.price_used_max || 0)) / 2
    return sum + avgPrice
  }, 0)

  const hasItems = selectedHeadphones.length > 0 || selectedDacs.length > 0 || selectedAmps.length > 0 || selectedCombos.length > 0

  if (!hasItems) return null

  return (
    <div className="card p-6 mb-8 border-l-4 border-accent-primary">
      <h3 className="heading-3 text-center mb-4">Your Selected System</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {selectedHeadphones.map(item => (
          <div key={item.id} className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
            <div className="w-2 h-2 bg-accent-primary rounded-full"></div>
            <div>
              <p className="font-medium text-sm text-text-primary">{item.name}</p>
              <p className="text-xs text-text-secondary" style={{ minWidth: '60px' }}>{formatBudgetUSD(Math.round(((item.price_used_min || 0) + (item.price_used_max || 0)) / 2))}</p>
            </div>
          </div>
        ))}
        {selectedDacs.map(item => (
          <div key={item.id} className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
            <div className="w-2 h-2 bg-red-500 dark:bg-red-400 rounded-full"></div>
            <div>
              <p className="font-medium text-sm text-text-primary">{item.name}</p>
              <p className="text-xs text-text-secondary" style={{ minWidth: '60px' }}>{formatBudgetUSD(Math.round(((item.price_used_min || 0) + (item.price_used_max || 0)) / 2))}</p>
            </div>
          </div>
        ))}
        {selectedAmps.map(item => (
          <div key={item.id} className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
            <div className="w-2 h-2 bg-amber-500 dark:bg-amber-400 rounded-full"></div>
            <div>
              <p className="font-medium text-sm text-text-primary">{item.name}</p>
              <p className="text-xs text-text-secondary" style={{ minWidth: '60px' }}>{formatBudgetUSD(Math.round(((item.price_used_min || 0) + (item.price_used_max || 0)) / 2))}</p>
            </div>
          </div>
        ))}
        {selectedCombos.map(item => (
          <div key={item.id} className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
            <div className="w-2 h-2 bg-orange-500 dark:bg-orange-400 rounded-full"></div>
            <div>
              <p className="font-medium text-sm text-text-primary">{item.name}</p>
              <p className="text-xs text-text-secondary" style={{ minWidth: '60px' }}>{formatBudgetUSD(Math.round(((item.price_used_min || 0) + (item.price_used_max || 0)) / 2))}</p>
            </div>
          </div>
        ))}
      </div>
      <div className={`pt-4 border-t border-border-default mt-4 rounded-lg p-4 ${
        totalSelectedPrice > budget * 1.1
          ? 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-800'
          : totalSelectedPrice > budget * 0.9
          ? 'bg-transparent border border-border-default'
          : 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800'
      }`}>
        <div className="text-center mb-4">
          <p className="text-xl font-bold text-text-primary mb-2">
            ${Math.round(totalSelectedPrice).toLocaleString()}
          </p>
          <p className={`text-sm font-medium mb-1 ${
            totalSelectedPrice > budget * 1.1
              ? 'text-red-700 dark:text-red-400'
              : totalSelectedPrice > budget * 0.9
              ? 'text-text-secondary'
              : 'text-green-700 dark:text-green-400'
          }`}>
            {totalSelectedPrice <= budget ? 'Under' : 'Over'} budget by ${Math.abs(totalSelectedPrice - budget).toLocaleString()}
          </p>
          <p className="text-xs text-text-secondary">Est. System Cost</p>
        </div>

        {/* Build Stack Button */}
        <div className="flex justify-center gap-3">
          <button
            onClick={onBuildStack}
            className="button button-primary flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Build Complete Stack
          </button>
          <button
            onClick={onClearAll}
            className="button button-secondary"
          >
            Clear All
          </button>
        </div>
      </div>
    </div>
  )
}

export const SelectedSystemSummary = memo(SelectedSystemSummaryComponent)
