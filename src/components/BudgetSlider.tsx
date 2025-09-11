'use client'

import { useState, useEffect, useMemo } from 'react'

interface BudgetSliderProps {
  budget: number
  onBudgetChange: (budget: number) => void
  className?: string
  variant?: 'simple' | 'advanced'
  showInput?: boolean
  showLabels?: boolean
  minBudget?: number
  maxBudget?: number
}

// Convert budget value to linear slider position  
const budgetToSlider = (budget: number, maxBudget: number = 3000) => {
  const minBudget = 20
  if (budget <= minBudget) return 0
  if (budget >= maxBudget) return 100
  // Logarithmic scale for better distribution
  return ((Math.log(budget) - Math.log(minBudget)) / (Math.log(maxBudget) - Math.log(minBudget))) * 100
}

// Convert linear slider position to budget value with smart rounding
const sliderToBudget = (sliderValue: number, maxBudget: number = 3000) => {
  const minBudget = 20
  if (sliderValue <= 0) return minBudget
  if (sliderValue >= 100) return maxBudget
  
  // Inverse logarithmic scale
  const rawBudget = Math.exp(Math.log(minBudget) + (sliderValue / 100) * (Math.log(maxBudget) - Math.log(minBudget)))
  
  // Smart rounding: snap to $50/$100 increments above $400
  if (rawBudget >= 400) {
    if (rawBudget >= 1000) {
      // Above $1000: round to nearest $100
      return Math.round(rawBudget / 100) * 100
    } else {
      // $400-$1000: round to nearest $50
      return Math.round(rawBudget / 50) * 50
    }
  }
  
  // Below $400: round to nearest $25
  return Math.round(rawBudget / 25) * 25
}

export function BudgetSlider({
  budget,
  onBudgetChange,
  className = '',
  variant = 'simple',
  showInput = false,
  showLabels = true,
  minBudget = 20,
  maxBudget = 3000
}: BudgetSliderProps) {
  const [budgetInputValue, setBudgetInputValue] = useState(budget.toString())

  // Update input value when budget changes externally
  useEffect(() => {
    setBudgetInputValue(budget.toString())
  }, [budget])

  const handleSliderChange = (sliderValue: number) => {
    const newBudget = sliderToBudget(sliderValue, maxBudget)
    onBudgetChange(newBudget)
  }

  const handleInputChange = (value: string) => {
    setBudgetInputValue(value)
    const numValue = parseInt(value)
    if (!isNaN(numValue) && numValue >= minBudget && numValue <= maxBudget) {
      onBudgetChange(numValue)
    }
  }

  // Memoize the budget pill to prevent unnecessary re-renders
  const budgetPill = useMemo(() => (
    <div className="flex justify-center mb-4">
      <div className="px-6 py-3 rounded-full shadow-lg" style={{
        backgroundColor: 'var(--accent-primary)',
        color: 'white'
      }}>
        <span className="text-2xl font-bold">${budget}</span>
      </div>
    </div>
  ), [budget])

  // Memoize slider position calculation
  const sliderPosition = useMemo(() => budgetToSlider(budget, maxBudget), [budget, maxBudget])

  if (variant === 'simple') {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Centered Budget Pill */}
        {budgetPill}
        
        <div className="relative">
          <div className="relative h-3 w-full">
            <input
              type="range"
              min="0"
              max="100"
              value={sliderPosition}
              onChange={(e) => handleSliderChange(parseInt(e.target.value))}
              className="w-full h-3 rounded-lg appearance-none cursor-pointer touch-manipulation budget-slider"
              style={{
                background: `linear-gradient(to right, #22c55e 0%, #eab308 25%, #f97316 50%, #ef4444 75%, #8b5cf6 100%)`,
                boxShadow: 'none',
                width: '100%',
                position: 'absolute',
                top: 0,
                left: 0
              }}
            />
            {/* Custom slider thumb */}
            <div 
              className="absolute w-6 h-6 bg-white rounded-full shadow-lg pointer-events-none"
              style={{
                left: `calc(${sliderPosition}% - 12px)`,
                top: '-6px',
                border: '4px solid var(--accent-primary)',
                zIndex: 10,
              }}
            />
          </div>
        </div>
        
        {showLabels && (
          <div className="flex justify-between text-xs text-secondary mt-1">
            <span>${minBudget}</span>
            <span className="text-sm opacity-60">${maxBudget}+</span>
          </div>
        )}
      </div>
    )
  }

  // Advanced variant with gradient and input
  return (
    <div className={`space-y-4 ${className}`}>
      {/* Centered Budget Pill */}
      {budgetPill}
      
      <div className="relative">
        <div className="relative h-3 w-full">
          <input
            type="range"
            min="0"
            max="100"
            value={sliderPosition}
            onChange={(e) => handleSliderChange(parseInt(e.target.value))}
            className="w-full h-3 rounded-lg appearance-none cursor-pointer touch-manipulation budget-slider"
            style={{
              background: `linear-gradient(to right, #22c55e 0%, #eab308 25%, #f97316 50%, #ef4444 75%, #8b5cf6 100%)`,
              boxShadow: 'none',
              width: '100%',
              position: 'absolute',
              top: 0,
              left: 0
            }}
          />
          {/* Custom slider thumb */}
          <div 
            className="absolute w-6 h-6 bg-white rounded-full shadow-lg pointer-events-none"
            style={{
              left: `calc(${sliderPosition}% - 12px)`,
              top: '-6px',
              border: '4px solid var(--accent-primary)',
              zIndex: 10,
            }}
          />
        </div>
      </div>
      
      {showLabels && (
        <div className="flex justify-between items-center text-sm text-tertiary mt-3">
          <span className="flex-shrink-0">${minBudget} USD</span>
          {showInput ? (
            <div className="flex flex-col items-center flex-shrink-0">
              <div className="budget-input-container">
                <span className="currency-symbol text-inverse">$</span>
                <input
                  type="number"
                  inputMode="numeric"
                  value={budgetInputValue}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onBlur={() => setBudgetInputValue(budget.toString())}
                  className="budget-input text-inverse"
                  style={{ width: '80px' }}
                />
              </div>
            </div>
          ) : (
            <span className="text-sm opacity-60">Current: ${budget}</span>
          )}
          <span className="flex-shrink-0">${maxBudget}+ USD</span>
        </div>
      )}
    </div>
  )
}