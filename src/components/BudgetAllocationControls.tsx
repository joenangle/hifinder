'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Settings, RotateCcw } from 'lucide-react'

export interface ComponentBudget {
  amount: number
  percentage: number
  rangeMin?: number  // Optional per-component range override
  rangeMax?: number  // Optional per-component range override
}

export interface BudgetAllocation {
  headphones?: ComponentBudget
  dac?: ComponentBudget
  amp?: ComponentBudget
  combo?: ComponentBudget
}

interface BudgetAllocationControlsProps {
  totalBudget: number
  allocation: BudgetAllocation
  onChange: (allocation: BudgetAllocation) => void
  globalRangeMin: number  // Global -20%
  globalRangeMax: number  // Global +10%
  wantRecommendationsFor: {
    headphones: boolean
    dac: boolean
    amp: boolean
    combo: boolean
  }
}

const COMPONENT_LABELS = {
  headphones: '🎧 Headphones',
  dac: '🔌 DAC',
  amp: '📻 Amplifier',
  combo: '🎛️ DAC/Amp Combo'
}

const COMPONENT_COLORS = {
  headphones: '#8B5CF6',  // Purple
  dac: '#10B981',          // Green
  amp: '#F59E0B',          // Amber
  combo: '#3B82F6'         // Blue
}

export function BudgetAllocationControls({
  totalBudget,
  allocation,
  onChange,
  globalRangeMin,
  globalRangeMax,
  wantRecommendationsFor
}: BudgetAllocationControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [editingComponent, setEditingComponent] = useState<string | null>(null)

  // Get active components
  const activeComponents = Object.entries(wantRecommendationsFor)
    .filter(([, wanted]) => wanted)
    .map(([comp]) => comp)

  // Calculate totals
  const totalAllocated = activeComponents.reduce((sum, comp) => {
    return sum + (allocation[comp as keyof BudgetAllocation]?.amount || 0)
  }, 0)

  const totalPercentage = activeComponents.reduce((sum, comp) => {
    return sum + (allocation[comp as keyof BudgetAllocation]?.percentage || 0)
  }, 0)

  const isValid = Math.abs(totalPercentage - 100) < 0.01  // Allow for rounding errors

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  // Handle percentage change
  const handlePercentageChange = (component: string, newPercentage: number) => {
    const newAmount = Math.round((newPercentage / 100) * totalBudget)

    const updatedAllocation = {
      ...allocation,
      [component]: {
        ...allocation[component as keyof BudgetAllocation],
        amount: newAmount,
        percentage: newPercentage
      }
    }

    onChange(updatedAllocation)
  }

  // Handle amount change (reserved for future use)
  const _handleAmountChange = (component: string, newAmount: number) => {
    const newPercentage = (newAmount / totalBudget) * 100

    const updatedAllocation = {
      ...allocation,
      [component]: {
        ...allocation[component as keyof BudgetAllocation],
        amount: newAmount,
        percentage: newPercentage
      }
    }

    onChange(updatedAllocation)
  }

  // Reset to smart defaults
  const handleResetToDefaults = () => {
    // Use the default allocation ratios
    const priceRatios: Record<string, number> = {
      headphones: 0.5,
      dac: 0.2,
      amp: 0.2,
      combo: 0.35
    }

    const totalRatio = activeComponents.reduce((sum, comp) => {
      return sum + (priceRatios[comp] || 0.25)
    }, 0)

    const newAllocation: BudgetAllocation = {}
    activeComponents.forEach(component => {
      const ratio = priceRatios[component] || 0.25
      const percentage = (ratio / totalRatio) * 100
      const amount = Math.round((percentage / 100) * totalBudget)

      newAllocation[component as keyof BudgetAllocation] = {
        amount,
        percentage,
        rangeMin: allocation[component as keyof BudgetAllocation]?.rangeMin,
        rangeMax: allocation[component as keyof BudgetAllocation]?.rangeMax
      }
    })

    onChange(newAllocation)
  }

  return (
    <div className="card p-4 mb-6">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left hover:opacity-80 transition-opacity"
      >
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-secondary" />
          <h3 className="text-sm font-semibold text-secondary">
            Budget Allocation
            {!isExpanded && (
              <span className="ml-2 text-xs font-normal text-tertiary">
                (click to customize)
              </span>
            )}
          </h3>
        </div>
        <div className="flex items-center gap-3">
          {!isExpanded && (
            <span className="text-sm text-secondary">
              Auto: {formatCurrency(totalBudget)}
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-secondary" />
          ) : (
            <ChevronDown className="w-5 h-5 text-secondary" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-4 space-y-4">
          {/* Component allocations */}
          {activeComponents.map((component) => {
            const budget = allocation[component as keyof BudgetAllocation]
            if (!budget) return null

            const color = COMPONENT_COLORS[component as keyof typeof COMPONENT_COLORS]
            const label = COMPONENT_LABELS[component as keyof typeof COMPONENT_LABELS]

            const rangeMin = budget.rangeMin ?? globalRangeMin
            const rangeMax = budget.rangeMax ?? globalRangeMax
            const searchMin = Math.max(20, Math.round(budget.amount * (1 - rangeMin / 100)))
            const searchMax = Math.round(budget.amount * (1 + rangeMax / 100))

            return (
              <div key={component} className="space-y-2">
                {/* Component label and amount */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color }}>
                    {label}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{formatCurrency(budget.amount)}</span>
                    <span className="text-xs text-tertiary">({budget.percentage.toFixed(0)}%)</span>
                  </div>
                </div>

                {/* Percentage slider */}
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="1"
                    value={budget.percentage}
                    onChange={(e) => handlePercentageChange(component, parseFloat(e.target.value))}
                    className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, ${color} 0%, ${color} ${budget.percentage}%, #E5E7EB ${budget.percentage}%, #E5E7EB 100%)`
                    }}
                  />
                  <button
                    onClick={() => setEditingComponent(editingComponent === component ? null : component)}
                    className="p-1 rounded hover:bg-surface-secondary transition-colors"
                    title="Customize range"
                  >
                    <Settings className="w-4 h-4 text-tertiary" />
                  </button>
                </div>

                {/* Search range display */}
                <div className="text-xs text-tertiary">
                  Search range: {formatCurrency(searchMin)} to {formatCurrency(searchMax)}
                  {(budget.rangeMin !== undefined || budget.rangeMax !== undefined) && (
                    <span className="ml-2 text-accent">
                      (custom: -{rangeMin}% to +{rangeMax}%)
                    </span>
                  )}
                </div>

                {/* Custom range controls (when editing) */}
                {editingComponent === component && (
                  <div className="mt-2 p-3 bg-surface-secondary rounded-lg space-y-3">
                    <p className="text-xs font-medium text-secondary">
                      Custom Search Range
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-secondary">Min:</span>
                        <span className="text-xs font-medium">-{rangeMin}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        step="5"
                        value={rangeMin}
                        onChange={(e) => {
                          const updatedAllocation = {
                            ...allocation,
                            [component]: {
                              ...budget,
                              rangeMin: parseFloat(e.target.value)
                            }
                          }
                          onChange(updatedAllocation)
                        }}
                        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-gradient-to-r from-red-400 to-gray-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-secondary">Max:</span>
                        <span className="text-xs font-medium">+{rangeMax}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        step="5"
                        value={rangeMax}
                        onChange={(e) => {
                          const updatedAllocation = {
                            ...allocation,
                            [component]: {
                              ...budget,
                              rangeMax: parseFloat(e.target.value)
                            }
                          }
                          onChange(updatedAllocation)
                        }}
                        className="w-full h-1.5 rounded-lg appearance-none cursor-pointer bg-gradient-to-r from-gray-300 to-green-400"
                      />
                    </div>
                    <button
                      onClick={() => {
                        const updatedAllocation = {
                          ...allocation,
                          [component]: {
                            amount: budget.amount,
                            percentage: budget.percentage,
                            rangeMin: undefined,
                            rangeMax: undefined
                          }
                        }
                        onChange(updatedAllocation)
                      }}
                      className="text-xs text-accent hover:underline"
                    >
                      Reset to global range
                    </button>
                  </div>
                )}
              </div>
            )
          })}

          {/* Total and actions */}
          <div className="pt-4 border-t">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold">Total:</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold">{formatCurrency(totalAllocated)}</span>
                <span className="text-xs text-tertiary">
                  ({totalPercentage.toFixed(0)}%)
                </span>
                {!isValid && (
                  <span className="text-xs text-red-600 font-medium">
                    ⚠️ Must equal 100%
                  </span>
                )}
                {isValid && totalAllocated === totalBudget && (
                  <span className="text-xs text-green-600 font-medium">✓</span>
                )}
              </div>
            </div>

            <button
              onClick={handleResetToDefaults}
              className="flex items-center gap-2 text-sm text-accent hover:underline"
            >
              <RotateCcw className="w-4 h-4" />
              Reset to Smart Defaults
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
