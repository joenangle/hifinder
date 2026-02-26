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
  ownedHeadphones?: AudioComponent[]
  ownedDacs?: AudioComponent[]
  ownedAmps?: AudioComponent[]
  ownedCombos?: AudioComponent[]
  budget: number
  remainingBudget: number
  isStackComplete?: boolean
  onBuildStack: () => void
  onShowMarketplace?: () => void
  onAddOwnedGear?: () => void
  onRemoveOwnedGear?: (id: string) => void
  onRemoveItem: (id: string, category: string) => void
  onClearAll: () => void
}

const formatBudgetUSD = (amount: number) => {
  return `$${Math.round(amount).toLocaleString()}`
}

const RemoveButton = ({ onClick, title }: { onClick: () => void; title?: string }) => (
  <button
    onClick={(e) => { e.stopPropagation(); onClick() }}
    className="ml-auto p-1 text-text-tertiary hover:text-red-500 dark:hover:text-red-400 transition-colors rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 flex-shrink-0"
    title={title || 'Remove from selection'}
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
  ownedHeadphones = [],
  ownedDacs = [],
  ownedAmps = [],
  ownedCombos = [],
  budget,
  remainingBudget,
  isStackComplete = false,
  onBuildStack,
  onShowMarketplace,
  onAddOwnedGear,
  onRemoveOwnedGear,
  onRemoveItem,
  onClearAll
}: SelectedSystemSummaryProps) => {
  // Only count selected (not owned) toward budget
  const totalSelectedPrice = [
    ...selectedHeadphones,
    ...selectedDacs,
    ...selectedAmps,
    ...selectedCombos
  ].reduce((sum, item) => {
    const avgPrice = ((item.price_used_min || 0) + (item.price_used_max || 0)) / 2
    return sum + avgPrice
  }, 0)

  const hasOwnedGear = ownedHeadphones.length > 0 || ownedDacs.length > 0 || ownedAmps.length > 0 || ownedCombos.length > 0
  const hasSelectedItems = selectedHeadphones.length > 0 || selectedDacs.length > 0 || selectedAmps.length > 0 || selectedCombos.length > 0
  const hasItems = hasSelectedItems || hasOwnedGear

  // Count filled categories (selected OR owned)
  const filledCategories = [
    selectedHeadphones.length > 0 || ownedHeadphones.length > 0,
    selectedDacs.length > 0 || ownedDacs.length > 0,
    selectedAmps.length > 0 || ownedAmps.length > 0,
    selectedCombos.length > 0 || ownedCombos.length > 0
  ].filter(Boolean).length

  const getHeadphoneCategory = (item: AudioComponent) => {
    if (item.category === 'iems') return 'iems'
    return 'cans'
  }

  // Render a selected (new purchase) item
  const SelectedItem = ({ item, color, onRemove }: { item: AudioComponent; color: string; onRemove: () => void }) => (
    <div className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
      <div className={`w-2 h-2 ${color} rounded-full flex-shrink-0`} />
      <div className="min-w-0">
        <p className="font-medium text-sm text-text-primary truncate">
          {item.brand ? `${item.brand} ${item.name}` : item.name}
        </p>
        <p className="text-xs text-text-secondary" style={{ minWidth: '60px' }}>
          {formatBudgetUSD(Math.round(((item.price_used_min || 0) + (item.price_used_max || 0)) / 2))}
        </p>
      </div>
      <RemoveButton onClick={onRemove} />
    </div>
  )

  // Render an owned gear item (visually distinct — no price toward budget)
  const OwnedItem = ({ item, onRemove }: { item: AudioComponent; onRemove: () => void }) => (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-border-default bg-transparent">
      <div className="w-2 h-2 bg-text-tertiary rounded-full flex-shrink-0 opacity-50" />
      <div className="min-w-0">
        <p className="font-medium text-sm text-text-secondary truncate">
          {item.brand ? `${item.brand} ${item.name}` : item.name}
        </p>
        <p className="text-xs text-text-tertiary">owned</p>
      </div>
      <RemoveButton onClick={onRemove} title="Remove owned gear" />
    </div>
  )

  // --- Empty-state scaffold: always visible so users understand the mental model ---
  if (!hasItems) {
    const EmptySlot = ({ label, icon }: { label: string; icon: React.ReactNode }) => (
      <div className="flex items-center gap-2.5 p-3 rounded-lg border border-dashed border-border-default bg-transparent">
        <div className="w-8 h-8 rounded-full bg-surface-hover flex items-center justify-center text-text-tertiary flex-shrink-0">
          {icon}
        </div>
        <div>
          <p className="text-sm font-medium text-text-tertiary">{label}</p>
          <p className="text-[11px] text-text-tertiary opacity-70">Click a card below to add</p>
        </div>
      </div>
    )

    return (
      <div className="card p-5 mb-8 border border-dashed border-border-default bg-transparent">
        <p className="text-sm font-medium text-text-secondary text-center mb-3">
          Build your audio system
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <EmptySlot
            label="Headphones"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>}
          />
          <EmptySlot
            label="DAC"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>}
          />
          <EmptySlot
            label="Amp"
            icon={<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>}
          />
        </div>
        <p className="text-xs text-text-tertiary text-center">
          Click any recommendation card to start building your system
        </p>
        {onAddOwnedGear && (
          <div className="text-center mt-2">
            <button
              onClick={onAddOwnedGear}
              className="text-xs text-text-tertiary hover:text-accent-primary transition-colors underline underline-offset-2"
            >
              Already own gear? Add it here
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="card p-6 mb-8 border-l-4 border-accent-primary">
      <h3 className="heading-3 text-center mb-4">Your Selected System</h3>

      {/* Component grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Selected items (new purchases) */}
        {selectedHeadphones.map(item => (
          <SelectedItem key={item.id} item={item} color="bg-accent-primary" onRemove={() => onRemoveItem(item.id, getHeadphoneCategory(item))} />
        ))}
        {selectedDacs.map(item => (
          <SelectedItem key={item.id} item={item} color="bg-red-500 dark:bg-red-400" onRemove={() => onRemoveItem(item.id, 'dacs')} />
        ))}
        {selectedAmps.map(item => (
          <SelectedItem key={item.id} item={item} color="bg-amber-500 dark:bg-amber-400" onRemove={() => onRemoveItem(item.id, 'amps')} />
        ))}
        {selectedCombos.map(item => (
          <SelectedItem key={item.id} item={item} color="bg-orange-500 dark:bg-orange-400" onRemove={() => onRemoveItem(item.id, 'combos')} />
        ))}

        {/* Owned gear (visually distinct) */}
        {ownedHeadphones.map(item => (
          <OwnedItem key={`owned-${item.id}`} item={item} onRemove={() => onRemoveOwnedGear?.(item.id)} />
        ))}
        {ownedDacs.map(item => (
          <OwnedItem key={`owned-${item.id}`} item={item} onRemove={() => onRemoveOwnedGear?.(item.id)} />
        ))}
        {ownedAmps.map(item => (
          <OwnedItem key={`owned-${item.id}`} item={item} onRemove={() => onRemoveOwnedGear?.(item.id)} />
        ))}
        {ownedCombos.map(item => (
          <OwnedItem key={`owned-${item.id}`} item={item} onRemove={() => onRemoveOwnedGear?.(item.id)} />
        ))}
      </div>

      {/* "Already own gear?" prompt — only show when no owned gear yet */}
      {!hasOwnedGear && onAddOwnedGear && (
        <div className="text-center mb-4">
          <button
            onClick={onAddOwnedGear}
            className="text-xs text-text-tertiary hover:text-accent-primary transition-colors underline underline-offset-2"
          >
            Already own a DAC, amp, or headphones? Add them here
          </button>
        </div>
      )}

      {/* Budget summary */}
      <div className={`pt-4 border-t border-border-default mt-4 rounded-lg p-4 ${
        totalSelectedPrice > budget * 1.1
          ? 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-800'
          : totalSelectedPrice > budget * 0.9
          ? 'bg-transparent border border-border-default'
          : 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800'
      }`}>
        <div className="text-center mb-4">
          <p className="text-xl font-bold text-text-primary mb-2">
            {hasSelectedItems ? `$${Math.round(totalSelectedPrice).toLocaleString()}` : 'No new purchases'}
          </p>
          {hasSelectedItems && (
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
              {!isStackComplete && filledCategories < 4 && remainingBudget > 0 && (
                <p className="text-sm font-medium text-accent-primary">
                  {formatBudgetUSD(remainingBudget)} remaining
                </p>
              )}
            </div>
          )}
          {hasSelectedItems && <p className="text-xs text-text-secondary">Est. System Cost (new purchases only)</p>}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col items-center gap-3">
          {isStackComplete && (
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
              Your system is complete — ready to save or shop!
            </p>
          )}
          <div className="flex flex-wrap justify-center gap-3">
            <button
              onClick={onBuildStack}
              className="button button-primary flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isStackComplete ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                )}
              </svg>
              {isStackComplete ? 'Save Stack' : 'Build Complete Stack'}
            </button>
            {isStackComplete && onShowMarketplace && (
              <button
                onClick={onShowMarketplace}
                className="button button-secondary flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Find Used Deals
              </button>
            )}
            {hasOwnedGear && onAddOwnedGear && (
              <button
                onClick={onAddOwnedGear}
                className="button button-secondary flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add More Gear
              </button>
            )}
            <button
              onClick={onClearAll}
              className="button button-secondary"
            >
              Clear All
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export const SelectedSystemSummary = memo(SelectedSystemSummaryComponent)
