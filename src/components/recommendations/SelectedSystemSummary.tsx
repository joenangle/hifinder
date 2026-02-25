'use client'

import { memo } from 'react'

interface AudioComponent {
  id: string
  name: string
  brand?: string
  category?: string
  price_used_min?: number | null
  price_used_max?: number | null
}

interface SelectedSystemSummaryProps {
  selectedHeadphones: AudioComponent[]
  selectedDacs: AudioComponent[]
  selectedAmps: AudioComponent[]
  selectedCombos: AudioComponent[]
  budget: number
  remainingBudget: number
  onBuildStack: () => void
  onRemoveItem: (id: string, category: string) => void
  onClearAll: () => void
}

const formatBudgetUSD = (amount: number) => {
  return `$${Math.round(amount).toLocaleString()}`
}

const RemoveButton = ({ onClick }: { onClick: () => void }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick() }}
    className="ml-auto p-1 text-text-tertiary hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
    title="Remove from selection"
  >
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  </button>
)

const SelectedSystemSummaryComponent = ({
  selectedHeadphones,
  selectedDacs,
  selectedAmps,
  selectedCombos,
  budget,
  remainingBudget,
  onBuildStack,
  onRemoveItem,
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

  // Count how many category slots are still empty
  const allCategories = [selectedHeadphones, selectedDacs, selectedAmps, selectedCombos]
  const filledCategories = allCategories.filter(arr => arr.length > 0).length
  const totalCategories = allCategories.length

  // Determine category for headphones (cans vs iems) based on the component's category field
  const getHeadphoneCategory = (item: AudioComponent) => {
    if (item.category === 'iems') return 'iems'
    return 'cans'
  }

  return (
    <div className="card p-6 mb-8 border-l-4 border-accent-primary">
      <h3 className="heading-3 text-center mb-4">Your Selected System</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {selectedHeadphones.map(item => (
          <div key={item.id} className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
            <div className="w-2 h-2 bg-accent-primary rounded-full flex-shrink-0"></div>
            <div className="min-w-0">
              <p className="font-medium text-sm text-text-primary truncate">{item.brand ? `${item.brand} ${item.name}` : item.name}</p>
              <p className="text-xs text-text-secondary" style={{ minWidth: '60px' }}>{formatBudgetUSD(Math.round(((item.price_used_min || 0) + (item.price_used_max || 0)) / 2))}</p>
            </div>
            <RemoveButton onClick={() => onRemoveItem(item.id, getHeadphoneCategory(item))} />
          </div>
        ))}
        {selectedDacs.map(item => (
          <div key={item.id} className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
            <div className="w-2 h-2 bg-red-500 dark:bg-red-400 rounded-full flex-shrink-0"></div>
            <div className="min-w-0">
              <p className="font-medium text-sm text-text-primary truncate">{item.brand ? `${item.brand} ${item.name}` : item.name}</p>
              <p className="text-xs text-text-secondary" style={{ minWidth: '60px' }}>{formatBudgetUSD(Math.round(((item.price_used_min || 0) + (item.price_used_max || 0)) / 2))}</p>
            </div>
            <RemoveButton onClick={() => onRemoveItem(item.id, 'dacs')} />
          </div>
        ))}
        {selectedAmps.map(item => (
          <div key={item.id} className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
            <div className="w-2 h-2 bg-amber-500 dark:bg-amber-400 rounded-full flex-shrink-0"></div>
            <div className="min-w-0">
              <p className="font-medium text-sm text-text-primary truncate">{item.brand ? `${item.brand} ${item.name}` : item.name}</p>
              <p className="text-xs text-text-secondary" style={{ minWidth: '60px' }}>{formatBudgetUSD(Math.round(((item.price_used_min || 0) + (item.price_used_max || 0)) / 2))}</p>
            </div>
            <RemoveButton onClick={() => onRemoveItem(item.id, 'amps')} />
          </div>
        ))}
        {selectedCombos.map(item => (
          <div key={item.id} className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
            <div className="w-2 h-2 bg-orange-500 dark:bg-orange-400 rounded-full flex-shrink-0"></div>
            <div className="min-w-0">
              <p className="font-medium text-sm text-text-primary truncate">{item.brand ? `${item.brand} ${item.name}` : item.name}</p>
              <p className="text-xs text-text-secondary" style={{ minWidth: '60px' }}>{formatBudgetUSD(Math.round(((item.price_used_min || 0) + (item.price_used_max || 0)) / 2))}</p>
            </div>
            <RemoveButton onClick={() => onRemoveItem(item.id, 'combos')} />
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
          <div className="flex items-center justify-center gap-4 mb-1">
            <p className={`text-sm font-medium ${
              totalSelectedPrice > budget * 1.1
                ? 'text-red-700 dark:text-red-400'
                : totalSelectedPrice > budget * 0.9
                ? 'text-text-secondary'
                : 'text-green-700 dark:text-green-400'
            }`}>
              {totalSelectedPrice <= budget ? 'Under' : 'Over'} budget by ${Math.abs(totalSelectedPrice - budget).toLocaleString()}
            </p>
            {filledCategories < totalCategories && remainingBudget > 0 && (
              <p className="text-sm font-medium text-accent-primary">
                {formatBudgetUSD(remainingBudget)} remaining
              </p>
            )}
          </div>
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
