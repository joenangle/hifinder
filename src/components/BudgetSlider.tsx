'use client'

import { useState } from 'react'

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

// Convert linear slider position to budget value
const sliderToBudget = (sliderValue: number, maxBudget: number = 3000) => {
  const minBudget = 20
  if (sliderValue <= 0) return minBudget
  if (sliderValue >= 100) return maxBudget
  // Inverse logarithmic scale
  return Math.round(Math.exp(Math.log(minBudget) + (sliderValue / 100) * (Math.log(maxBudget) - Math.log(minBudget))))
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
  const [isDragging, setIsDragging] = useState(false)
  const [budgetInputValue, setBudgetInputValue] = useState(budget.toString())

  const handleSliderChange = (sliderValue: number) => {
    const newBudget = sliderToBudget(sliderValue, maxBudget)
    onBudgetChange(newBudget)
    setBudgetInputValue(newBudget.toString())
  }

  const handleInputChange = (value: string) => {
    setBudgetInputValue(value)
    const numValue = parseInt(value)
    if (!isNaN(numValue) && numValue >= minBudget && numValue <= maxBudget) {
      onBudgetChange(numValue)
    }
  }

  const handleMouseDown = () => setIsDragging(true)
  const handleMouseUp = () => setIsDragging(false)

  if (variant === 'simple') {
    return (
      <div className={`space-y-4 ${className}`}>
        <div>
          <input
            type="range"
            min={budgetToSlider(minBudget)}
            max={budgetToSlider(maxBudget)}
            value={budgetToSlider(budget, maxBudget)}
            onChange={(e) => handleSliderChange(parseInt(e.target.value))}
            className="budget-slider w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer"
          />
          {showLabels && (
            <div className="flex justify-between text-xs text-secondary mt-1">
              <span>${minBudget}</span>
              <span className="font-semibold">${budget}</span>
              <span>${maxBudget}+</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Advanced variant with gradient and custom styling
  return (
    <div className={`space-y-4 ${className}`}>
      <div className="relative">
        <div className="relative h-3 w-full">
          <input
            type="range"
            min="0"
            max="100"
            value={budgetToSlider(budget, maxBudget)}
            onChange={(e) => handleSliderChange(parseInt(e.target.value))}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onTouchStart={handleMouseDown}
            onTouchEnd={handleMouseUp}
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
            className="absolute w-6 h-6 bg-white border-4 border-accent rounded-full shadow-lg pointer-events-none"
            style={{
              left: `calc(${budgetToSlider(budget)}% - 12px)`,
              top: '-6px',
            }}
          />
        </div>
      </div>
      
      {showLabels && (
        <div className="flex justify-between items-center text-sm text-tertiary mt-3">
          <span className="flex-shrink-0">${minBudget} USD</span>
          {showInput && (
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
          )}
          <span className="flex-shrink-0">${maxBudget}+ USD</span>
        </div>
      )}
    </div>
  )
}