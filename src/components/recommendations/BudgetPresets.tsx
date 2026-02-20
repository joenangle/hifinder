'use client'

interface BudgetPresetsProps {
  currentBudget: number
  onSelect: (budget: number) => void
}

const PRESETS = [
  { budget: 100, label: 'Budget', description: 'Best budget options' },
  { budget: 250, label: 'Entry Level', description: 'Sweet spot for value' },
  { budget: 500, label: 'Mid Range', description: 'Significant quality jump' },
  { budget: 1000, label: 'High End', description: 'Diminishing returns territory' },
]

export function BudgetPresets({ currentBudget, onSelect }: BudgetPresetsProps) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {PRESETS.map((preset) => {
        const isActive = currentBudget >= preset.budget * 0.8 && currentBudget <= preset.budget * 1.2
        return (
          <button
            key={preset.budget}
            onClick={() => onSelect(preset.budget)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              isActive
                ? 'bg-blue-600 text-white'
                : 'bg-surface-secondary text-secondary hover:bg-surface-hover hover:text-primary'
            }`}
            title={preset.description}
          >
            {preset.label} ${preset.budget}
          </button>
        )
      })}
    </div>
  )
}
