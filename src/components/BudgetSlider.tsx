'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import './BudgetSlider.css'

interface BudgetSliderProps {
  budget: number
  displayBudget?: number
  onChange: (value: number) => void
  onChangeComplete?: (value: number) => void
  isUpdating?: boolean
  variant?: 'simple' | 'advanced' | 'dual-range'
  userExperience?: 'beginner' | 'intermediate' | 'enthusiast'
  showInput?: boolean
  showLabels?: boolean
  showItemCount?: boolean
  itemCount?: number
  minBudget?: number
  maxBudget?: number
  budgetRangeMin?: number
  budgetRangeMax?: number
  onRangeChange?: (min: number, max: number) => void
  className?: string
}

// Convert budget value to linear slider position
const budgetToSlider = (budget: number, minBudget: number = 20, maxBudget: number = 3000) => {
  if (budget <= minBudget) return 0
  if (budget >= maxBudget) return 100
  // Logarithmic scale for better distribution
  return ((Math.log(budget) - Math.log(minBudget)) / (Math.log(maxBudget) - Math.log(minBudget))) * 100
}

// Convert linear slider position to budget value with smart rounding
const sliderToBudget = (sliderValue: number, minBudget: number = 20, maxBudget: number = 3000) => {
  if (sliderValue <= 0) return minBudget
  if (sliderValue >= 100) return maxBudget

  // Inverse logarithmic scale
  const rawBudget = Math.exp(Math.log(minBudget) + (sliderValue / 100) * (Math.log(maxBudget) - Math.log(minBudget)))

  // Smart rounding: snap to logical increments
  if (rawBudget >= 1000) {
    return Math.round(rawBudget / 100) * 100
  } else if (rawBudget >= 400) {
    return Math.round(rawBudget / 50) * 50
  } else if (rawBudget >= 100) {
    return Math.round(rawBudget / 25) * 25
  } else {
    return Math.round(rawBudget / 10) * 10
  }
}

// Format budget with proper currency formatting
const formatBudget = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

// Short format for tick marks
const formatBudgetShort = (amount: number) => {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(amount % 1000 === 0 ? 0 : 1)}K`
  }
  return `$${amount}`
}

// Get budget tier name and color
const getBudgetTier = (budget: number) => {
  if (budget <= 100) return { name: 'Budget', color: '#22c55e' }
  if (budget <= 400) return { name: 'Entry Level', color: '#3b82f6' }
  if (budget <= 1000) return { name: 'Mid Range', color: '#8b5cf6' }
  if (budget <= 3000) return { name: 'High End', color: '#f59e0b' }
  return { name: 'Summit-Fi', color: '#ef4444' }
}


// Dynamic tick marks based on current value and range - responsive to viewport
const getDynamicTicks = (min: number, max: number, currentValue: number) => {
  const allTicks = [20, 50, 100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000, 10000]
  const emphasizedTicks = [100, 500, 1000, 3000]

  // Get viewport-specific tick sets that ensure good spacing
  const getViewportTicks = () => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth < 640) {
        // Mobile: Use well-spaced ticks prioritizing key values
        return [50, 100, 500, 1000, 3000]
      }
      if (window.innerWidth < 768) {
        // Small tablet: Add a few more ticks
        return [50, 100, 200, 500, 1000, 2000, 3000]
      }
      if (window.innerWidth < 1024) {
        // Large tablet: More ticks but still well-spaced
        return [50, 100, 200, 300, 500, 750, 1000, 1500, 2000, 3000]
      }
      // Desktop: Show all ticks
      return allTicks
    }
    return [50, 100, 200, 500, 1000, 2000, 3000] // default server-side
  }

  const viewportTicks = getViewportTicks()

  return viewportTicks
    .filter(tick => tick >= min && tick <= max)
    .map(tick => {
      const distance = Math.abs(Math.log(tick) - Math.log(currentValue))
      const maxDistance = Math.log(max) - Math.log(min)
      const relativeDistance = distance / maxDistance
      const isEmphasized = emphasizedTicks.includes(tick)

      return {
        value: tick,
        label: formatBudgetShort(tick),
        position: budgetToSlider(tick, min, max),
        visible: true, // All selected ticks are visible
        emphasized: isEmphasized,
        opacity: Math.max(0.4, 1 - relativeDistance * 1.2)
      }
    })
    .sort((a, b) => a.value - b.value) // Sort by value for consistent positioning
}

export function BudgetSlider({
  budget,
  displayBudget,
  onChange,
  onChangeComplete,
  isUpdating: _isUpdating = false, // Unused but part of API
  variant = 'advanced',
  userExperience = 'intermediate',
  showInput = true,
  showLabels: _showLabels = true, // Unused but part of API
  showItemCount: _showItemCount = false, // Unused but part of API
  itemCount: _itemCount = 0, // Unused but part of API
  minBudget = 20,
  maxBudget = 10000,
  budgetRangeMin = 20,
  budgetRangeMax = 10,
  onRangeChange,
  className = ''
}: BudgetSliderProps) {
  const [localBudget, setLocalBudget] = useState(displayBudget || budget)
  const [budgetInputValue, setBudgetInputValue] = useState(localBudget.toString())
  const [showTooltip, setShowTooltip] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  const [showRangeAdjust, setShowRangeAdjust] = useState(false) // Collapsed by default to save vertical space
  const [isDualRange, setIsDualRange] = useState(false)
  const [rangeMin, setRangeMin] = useState(Math.max(minBudget, Math.round(budget * (1 - budgetRangeMin / 100))))
  const [rangeMax, setRangeMax] = useState(Math.min(maxBudget, Math.round(budget * (1 + budgetRangeMax / 100))))
  const sliderRef = useRef<HTMLInputElement>(null)

  // Determine if dual-range should be available based on user experience
  const shouldShowDualRangeOption = userExperience === 'enthusiast' || variant === 'dual-range'
  // Force simple mode when variant is explicitly set to "simple"
  const effectiveVariant = variant === 'simple' ? 'simple' : (isDualRange && shouldShowDualRangeOption ? 'dual-range' : variant)

  // Update local budget when external budget changes
  useEffect(() => {
    if (!isDragging) {
      setLocalBudget(displayBudget || budget)
      setBudgetInputValue((displayBudget || budget).toString())
    }
  }, [budget, displayBudget, isDragging])

  // Calculate search range
  const searchMin = Math.max(minBudget, Math.round(localBudget * (1 - budgetRangeMin / 100)))
  const searchMax = Math.round(localBudget * (1 + budgetRangeMax / 100))

  // Get current tier
  const currentTier = getBudgetTier(localBudget)

  // Get dynamic tick marks with viewport responsiveness
  const [_viewportWidth, setViewportWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1024)

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => setViewportWidth(window.innerWidth)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const ticks = useMemo(
    () => getDynamicTicks(minBudget, maxBudget, localBudget),
    [minBudget, maxBudget, localBudget]
  )

  // Handle slider change with immediate visual feedback
  const handleSliderChange = (sliderValue: number) => {
    const newBudget = sliderToBudget(sliderValue, minBudget, maxBudget)
    setLocalBudget(newBudget)
    setBudgetInputValue(newBudget.toString())
    onChange(newBudget)
  }

  // Handle dual-range slider changes
  const handleRangeMinChange = (sliderValue: number) => {
    const newMin = sliderToBudget(sliderValue, minBudget, maxBudget)
    const clampedMin = Math.min(newMin, rangeMax - 50) // Keep minimum gap
    setRangeMin(clampedMin)
    if (onRangeChange) {
      onRangeChange(clampedMin, rangeMax)
    }
  }

  const handleRangeMaxChange = (sliderValue: number) => {
    const newMax = sliderToBudget(sliderValue, minBudget, maxBudget)
    const clampedMax = Math.max(newMax, rangeMin + 50) // Keep minimum gap
    setRangeMax(clampedMax)
    if (onRangeChange) {
      onRangeChange(rangeMin, clampedMax)
    }
  }

  // Handle slider interaction states
  const handleSliderStart = () => {
    setIsDragging(true)
    setShowTooltip(true)
  }

  const handleSliderEnd = () => {
    setIsDragging(false)
    setShowTooltip(false)
    if (onChangeComplete) {
      onChangeComplete(localBudget)
    }
  }

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!sliderRef.current || e.target !== sliderRef.current) return

    let newBudget = localBudget

    switch(e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        e.preventDefault()
        newBudget = Math.max(minBudget, localBudget - (e.shiftKey ? 100 : 10))
        break
      case 'ArrowRight':
      case 'ArrowUp':
        e.preventDefault()
        newBudget = Math.min(maxBudget, localBudget + (e.shiftKey ? 100 : 10))
        break
      case 'Home':
        e.preventDefault()
        newBudget = minBudget
        break
      case 'End':
        e.preventDefault()
        newBudget = maxBudget
        break
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
        e.preventDefault()
        const presets = [100, 300, 500, 1000, 2000]
        newBudget = presets[parseInt(e.key) - 1]
        break
      default:
        return
    }

    setLocalBudget(newBudget)
    setBudgetInputValue(newBudget.toString())
    onChange(newBudget)
    if (onChangeComplete) {
      onChangeComplete(newBudget)
    }
  }, [localBudget, minBudget, maxBudget, onChange, onChangeComplete])

  useEffect(() => {
    const slider = sliderRef.current
    if (slider) {
      slider.addEventListener('keydown', handleKeyDown)
      return () => slider.removeEventListener('keydown', handleKeyDown)
    }
  }, [handleKeyDown])

  // Handle input change
  const handleInputChange = (value: string) => {
    setBudgetInputValue(value)
    const numValue = parseInt(value)
    if (!isNaN(numValue) && numValue >= minBudget && numValue <= maxBudget) {
      setLocalBudget(numValue)
      onChange(numValue)
    }
  }

  const handleInputBlur = () => {
    setBudgetInputValue(localBudget.toString())
    if (onChangeComplete) {
      onChangeComplete(localBudget)
    }
  }

  // Memoize slider position
  const sliderPosition = useMemo(
    () => budgetToSlider(localBudget, minBudget, maxBudget),
    [localBudget, minBudget, maxBudget]
  )

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Consolidated budget display - single line */}
        <div className="flex items-center justify-center gap-2 mb-0">
          <span className="text-xs font-semibold shrink-0 mr-1" style={{ color: 'var(--accent-primary)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Budget</span>
        {/* Budget amount */}
        {effectiveVariant === 'dual-range' ? (
          <h3 className="text-2xl font-bold" style={{ color: currentTier.color }}>
            {`${formatBudget(rangeMin)} - ${formatBudget(rangeMax)}`}
          </h3>
        ) : (
          <div className="flex items-center gap-1">
            <span className="text-2xl font-bold" style={{ color: currentTier.color }}>$</span>
            <input
              type="number"
              value={budgetInputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onBlur={handleInputBlur}
              className="budget-number-input text-2xl font-bold bg-transparent border-none outline-none focus:ring-1 focus:ring-blue-500 focus:ring-opacity-50 rounded px-1 w-24"
              style={{ color: currentTier.color }}
              min={minBudget}
              max={maxBudget}
              aria-label="Budget amount"
            />
          </div>
        )}

        {/* Tier label with search range - inline */}
        <button
          onClick={() => setShowRangeAdjust(!showRangeAdjust)}
          className="text-xs text-secondary hover:text-primary transition-colors whitespace-nowrap"
        >
          <span className="font-medium" style={{ color: currentTier.color }}>{currentTier.name}</span>
          <span className="text-secondary">
            {effectiveVariant === 'dual-range'
              ? `: ${formatBudget(rangeMin)}-${formatBudget(rangeMax)}`
              : `: ${formatBudget(searchMin)}-${formatBudget(searchMax)}`
            }
          </span>
        </button>

        <button
          onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
          className="p-1 rounded hover:bg-surface-hover transition-colors"
          title="Keyboard shortcuts"
        >
          <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      </div>

      {/* Dual-range toggle for enthusiasts (right-aligned) */}
      {shouldShowDualRangeOption && variant !== 'simple' && (
        <div className="flex justify-end -mt-2 mb-2">
          <button
            onClick={() => setIsDualRange(!isDualRange)}
            className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
              isDualRange
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : 'bg-surface-secondary text-secondary hover:bg-surface-hover'
            }`}
            title={isDualRange ? 'Switch to single budget' : 'Set budget range'}
          >
            {isDualRange ? 'Range Mode' : 'Single Budget'}
          </button>
        </div>
      )}

      {/* Range adjustment panel */}
      {showRangeAdjust && variant !== 'simple' && (
        <div className="bg-surface-secondary rounded-lg p-3 space-y-2">
          <div>
            <label className="text-xs font-medium text-secondary">Below budget: -{budgetRangeMin}%</label>
            <input
              type="range"
              min="0"
              max="50"
              value={budgetRangeMin}
              onChange={(e) => {
                const newMin = parseInt(e.target.value)
                // Update the parent component's budget range state
                if (onRangeChange) {
                  const newRangeMin = Math.max(minBudget, Math.round(localBudget * (1 - newMin / 100)))
                  const newRangeMax = Math.round(localBudget * (1 + budgetRangeMax / 100))
                  onRangeChange(newRangeMin, newRangeMax)
                }
              }}
              className="range-adjustment-slider"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-secondary">Above budget: +{budgetRangeMax}%</label>
            <input
              type="range"
              min="0"
              max="50"
              value={budgetRangeMax}
              onChange={(e) => {
                const newMax = parseInt(e.target.value)
                // Update the parent component's budget range state
                if (onRangeChange) {
                  const newRangeMin = Math.max(minBudget, Math.round(localBudget * (1 - budgetRangeMin / 100)))
                  const newRangeMax = Math.round(localBudget * (1 + newMax / 100))
                  onRangeChange(newRangeMin, newRangeMax)
                }
              }}
              className="range-adjustment-slider"
            />
          </div>
        </div>
      )}

      {/* Slider container */}
      <div className="slider-container">
        {/* Floating tooltip */}
        {showTooltip && (
          <div
            className="slider-tooltip"
            style={{ left: `${sliderPosition}%`, opacity: 1, visibility: 'visible' }}
          >
            {formatBudget(localBudget)}
          </div>
        )}

        {/* Tick marks */}
        <div className="absolute w-full h-full pointer-events-none">
          {ticks.map(tick => (
            <div
              key={tick.value}
              className="absolute top-1/2 transform -translate-y-1/2"
              style={{
                left: `${tick.position}%`,
                opacity: tick.visible ? tick.opacity : 0,
                transition: 'opacity 0.3s'
              }}
            >
              <div className={`h-2 w-px mx-auto ${tick.emphasized ? 'bg-primary' : 'bg-secondary'}`} />
              {tick.visible && (
                <span
                  className={`absolute top-1 text-[10px] ${tick.emphasized ? 'text-primary font-medium' : 'text-secondary'} whitespace-nowrap`}
                  style={{
                    left: tick.position <= 5 ? '0' : tick.position >= 95 ? 'auto' : '50%',
                    right: tick.position >= 95 ? '0' : 'auto',
                    transform: tick.position <= 5 || tick.position >= 95 ? 'none' : 'translateX(-50%)'
                  }}
                >
                  {tick.label}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Slider track and input */}
        <div className="relative h-6 w-full flex items-center">
          {effectiveVariant === 'dual-range' ? (
            <>
              {/* Dual-range sliders */}
              <div className="slider-track" />

              {/* Range fill between thumbs */}
              <div
                className="dual-range-highlight"
                style={{
                  left: `${budgetToSlider(rangeMin, minBudget, maxBudget)}%`,
                  width: `${budgetToSlider(rangeMax, minBudget, maxBudget) - budgetToSlider(rangeMin, minBudget, maxBudget)}%`
                }}
              />

              {/* Min range slider */}
              <input
                type="range"
                min="0"
                max="100"
                value={budgetToSlider(rangeMin, minBudget, maxBudget)}
                onChange={(e) => handleRangeMinChange(parseInt(e.target.value))}
                onMouseDown={handleSliderStart}
                onMouseUp={handleSliderEnd}
                onTouchStart={handleSliderStart}
                onTouchEnd={handleSliderEnd}
                className="dual-range-slider"
                aria-label="Minimum budget"
                aria-valuemin={minBudget}
                aria-valuemax={maxBudget}
                aria-valuenow={rangeMin}
              />

              {/* Max range slider */}
              <input
                type="range"
                min="0"
                max="100"
                value={budgetToSlider(rangeMax, minBudget, maxBudget)}
                onChange={(e) => handleRangeMaxChange(parseInt(e.target.value))}
                onMouseDown={handleSliderStart}
                onMouseUp={handleSliderEnd}
                onTouchStart={handleSliderStart}
                onTouchEnd={handleSliderEnd}
                className="dual-range-slider"
                aria-label="Maximum budget"
                aria-valuemin={minBudget}
                aria-valuemax={maxBudget}
                aria-valuenow={rangeMax}
              />

            </>
          ) : (
            <>
              {/* Gradient track background */}
              <div className="slider-track" />

              {/* Single budget slider */}
              <input
                ref={sliderRef}
                type="range"
                min="0"
                max="100"
                value={sliderPosition}
                onChange={(e) => handleSliderChange(parseInt(e.target.value))}
                onMouseDown={handleSliderStart}
                onMouseUp={handleSliderEnd}
                onTouchStart={handleSliderStart}
                onTouchEnd={handleSliderEnd}
                className="single-budget-slider"
                style={{
                  '--thumb-color': currentTier.color
                } as React.CSSProperties}
                aria-label="Budget slider"
                aria-valuemin={minBudget}
                aria-valuemax={maxBudget}
                aria-valuenow={localBudget}
              />
            </>
          )}
        </div>
      </div>

      {/* Dual-range input controls only */}
      {showInput && effectiveVariant === 'dual-range' && (
        <div className="flex justify-center items-center gap-2 text-sm">
          <span className="text-secondary">$</span>
          <input
            type="number"
            value={rangeMin}
            onChange={(e) => {
              const newMin = parseInt(e.target.value) || minBudget
              const clampedMin = Math.min(newMin, rangeMax - 50)
              setRangeMin(clampedMin)
              if (onRangeChange) onRangeChange(clampedMin, rangeMax)
            }}
            className="w-20 px-2 py-1 border border-border rounded focus:outline-none focus:border-blue-500"
            min={minBudget}
            max={maxBudget}
          />
          <span className="text-secondary">-</span>
          <input
            type="number"
            value={rangeMax}
            onChange={(e) => {
              const newMax = parseInt(e.target.value) || maxBudget
              const clampedMax = Math.max(newMax, rangeMin + 50)
              setRangeMax(clampedMax)
              if (onRangeChange) onRangeChange(rangeMin, clampedMax)
            }}
            className="w-20 px-2 py-1 border border-border rounded focus:outline-none focus:border-blue-500"
            min={minBudget}
            max={maxBudget}
          />
        </div>
      )}

      {/* Keyboard shortcuts help */}
      {showKeyboardHelp && (
        <div className="bg-surface-secondary rounded-lg p-3 text-xs space-y-1">
          <div className="font-medium text-primary mb-2">Keyboard Shortcuts:</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-secondary">
            <div>←/→: ±$10</div>
            <div>Shift+←/→: ±$100</div>
            <div>1-5: Jump to presets</div>
            <div>Home/End: Min/Max</div>
          </div>
        </div>
      )}

    </div>
  )
}