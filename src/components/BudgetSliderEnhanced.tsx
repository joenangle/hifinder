'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'

interface BudgetSliderEnhancedProps {
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

// Get gradient background showing logarithmic scale
const getGradientBackground = (value: number, min: number, max: number) => {
  const position = budgetToSlider(value, min, max)
  const stops = [
    { pos: 0, color: '#22c55e' },     // Green (Budget)
    { pos: budgetToSlider(100, min, max), color: '#3b82f6' },   // Blue (Entry)
    { pos: budgetToSlider(400, min, max), color: '#8b5cf6' },   // Purple (Mid)
    { pos: budgetToSlider(1000, min, max), color: '#f59e0b' },  // Orange (High)
    { pos: budgetToSlider(3000, min, max), color: '#ef4444' },  // Red (Summit)
  ].filter(s => s.pos >= 0 && s.pos <= 100)

  const gradient = stops.map(s => `${s.color} ${s.pos}%`).join(', ')
  const filled = `linear-gradient(to right, ${gradient})`
  const track = `linear-gradient(to right, ${gradient})`

  return {
    background: track,
    '--slider-filled': filled,
    '--slider-position': `${position}%`
  } as React.CSSProperties
}

// Dynamic tick marks based on current value and range with responsive breakpoints
const getDynamicTicks = (min: number, max: number, currentValue: number, screenSize: 'mobile' | 'tablet' | 'desktop' = 'desktop') => {
  const allTicks = [20, 50, 100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000, 10000]

  // Progressive tick density based on screen size
  const mobileTicks = [50, 100, 300, 500, 1000, 2000, 5000]      // Phone: 7 max
  const tabletTicks = [50, 100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000]  // Tablet: 11 max
  const desktopTicks = allTicks  // Desktop: 13 max

  const relevantTicks = screenSize === 'mobile' ? mobileTicks :
                       screenSize === 'tablet' ? tabletTicks :
                       desktopTicks

  const candidateTicks = relevantTicks
    .filter(tick => tick >= min && tick <= max)
    .map(tick => {
      const distance = Math.abs(Math.log(tick) - Math.log(currentValue))
      const maxDistance = Math.log(max) - Math.log(min)
      const relativeDistance = distance / maxDistance

      // Responsive key ticks and visibility thresholds
      const isKeyTick = screenSize === 'mobile'
        ? [100, 500, 1000, 2000].includes(tick)
        : screenSize === 'tablet'
        ? [100, 300, 500, 1000, 2000, 3000].includes(tick)
        : [100, 500, 1000, 3000].includes(tick)

      const visibilityThreshold = screenSize === 'mobile' ? 0.25 :
                                 screenSize === 'tablet' ? 0.35 :
                                 0.4

      return {
        value: tick,
        label: formatBudgetShort(tick),
        position: budgetToSlider(tick, min, max),
        rawVisible: relativeDistance < visibilityThreshold || isKeyTick,
        emphasized: isKeyTick,
        distance: relativeDistance,
        opacity: Math.max(0.3, 1 - relativeDistance * 1.5)
      }
    })

  // Filter ticks to prevent overlap by ensuring minimum spacing
  const minSpacing = screenSize === 'mobile' ? 12 : screenSize === 'tablet' ? 8 : 6  // minimum % separation
  const finalTicks = []

  // Always include key ticks first
  const keyTicks = candidateTicks.filter(t => t.emphasized && t.rawVisible)
  finalTicks.push(...keyTicks)

  // Add other visible ticks if they don't overlap
  const otherTicks = candidateTicks
    .filter(t => !t.emphasized && t.rawVisible)
    .sort((a, b) => a.distance - b.distance)  // Sort by proximity to current value

  for (const tick of otherTicks) {
    const hasOverlap = finalTicks.some(existing =>
      Math.abs(existing.position - tick.position) < minSpacing
    )
    if (!hasOverlap) {
      finalTicks.push(tick)
    }
  }

  return finalTicks.map(tick => ({
    value: tick.value,
    label: tick.label,
    position: tick.position,
    visible: true,
    emphasized: tick.emphasized,
    opacity: tick.opacity
  }))
}

export function BudgetSliderEnhanced({
  budget,
  displayBudget,
  onChange,
  onChangeComplete,
  isUpdating = false,
  variant = 'advanced',
  userExperience = 'intermediate',
  showInput = true,
  showLabels = true,
  showItemCount = false,
  itemCount = 0,
  minBudget = 20,
  maxBudget = 10000,
  budgetRangeMin = 20,
  budgetRangeMax = 10,
  onRangeChange,
  className = ''
}: BudgetSliderEnhancedProps) {
  const [localBudget, setLocalBudget] = useState(displayBudget || budget)
  const [budgetInputValue, setBudgetInputValue] = useState(localBudget.toString())
  const [showTooltip, setShowTooltip] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  const [showRangeAdjust, setShowRangeAdjust] = useState(false)
  const [isDualRange, setIsDualRange] = useState(false)
  const [rangeMin, setRangeMin] = useState(Math.max(minBudget, Math.round(budget * (1 - budgetRangeMin / 100))))
  const [rangeMax, setRangeMax] = useState(Math.round(budget * (1 + budgetRangeMax / 100)))
  const [screenSize, setScreenSize] = useState<'mobile' | 'tablet' | 'desktop'>('desktop')
  const sliderRef = useRef<HTMLInputElement>(null)

  // Responsive breakpoint detection
  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth
      if (width < 640) {        // Tailwind's sm breakpoint (phones)
        setScreenSize('mobile')
      } else if (width < 1024) { // Tailwind's lg breakpoint (tablets/iPad)
        setScreenSize('tablet')
      } else {                  // Desktop
        setScreenSize('desktop')
      }
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

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

  // Get dynamic tick marks
  const ticks = useMemo(
    () => getDynamicTicks(minBudget, maxBudget, localBudget, screenSize),
    [minBudget, maxBudget, localBudget, screenSize]
  )

  // Throttled slider change for smooth scrolling
  const handleSliderChange = useCallback((sliderValue: number) => {
    const newBudget = memoizedSliderToBudget(sliderValue)
    setLocalBudget(newBudget)
    setBudgetInputValue(newBudget.toString())

    // Use requestAnimationFrame for smooth updates
    requestAnimationFrame(() => {
      onChange(newBudget)
    })
  }, [memoizedSliderToBudget, onChange])

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

  // Memoize conversion functions
  const memoizedBudgetToSlider = useCallback(
    (budget: number) => budgetToSlider(budget, minBudget, maxBudget),
    [minBudget, maxBudget]
  )

  const memoizedSliderToBudget = useCallback(
    (sliderValue: number) => sliderToBudget(sliderValue, minBudget, maxBudget),
    [minBudget, maxBudget]
  )

  // Memoize slider position
  const sliderPosition = useMemo(
    () => memoizedBudgetToSlider(localBudget),
    [localBudget, memoizedBudgetToSlider]
  )

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Header with budget display and item count */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
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
                className="text-2xl font-bold bg-transparent border-none outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 rounded px-1 w-24"
                style={{ color: currentTier.color }}
                min={minBudget}
                max={maxBudget}
                aria-label="Budget amount"
              />
            </div>
          )}
          <button
            onClick={() => setShowKeyboardHelp(!showKeyboardHelp)}
            className="p-1 rounded hover:bg-gray-100 transition-colors"
            title="Keyboard shortcuts"
          >
            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </button>
        </div>

        {showItemCount && (
          <div className="text-sm text-gray-600">
            {isUpdating ? (
              <span className="flex items-center gap-1">
                <span className="animate-spin h-3 w-3 border-2 border-gray-400 border-t-transparent rounded-full" />
                Updating...
              </span>
            ) : (
              <span>{itemCount} items available</span>
            )}
          </div>
        )}
      </div>

      {/* Search range display with dual-range toggle for enthusiasts */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <button
          onClick={() => setShowRangeAdjust(!showRangeAdjust)}
          className="flex items-center gap-1 hover:text-gray-700 transition-colors"
        >
          <span>
            {effectiveVariant === 'dual-range'
              ? `Range ${formatBudget(rangeMin)}-${formatBudget(rangeMax)}`
              : `Searching ${formatBudget(searchMin)}-${formatBudget(searchMax)}`
            }
          </span>
          {effectiveVariant !== 'dual-range' && (
            <span className="text-[10px]">({budgetRangeMin}%/+{budgetRangeMax}%)</span>
          )}
          <svg
            className={`w-3 h-3 transition-transform ${showRangeAdjust ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          {shouldShowDualRangeOption && variant !== 'simple' && (
            <button
              onClick={() => setIsDualRange(!isDualRange)}
              className={`px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                isDualRange
                  ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={isDualRange ? 'Switch to single budget' : 'Set budget range'}
            >
              {isDualRange ? 'Range Mode' : 'Single Budget'}
            </button>
          )}
          <span className="font-medium" style={{ color: currentTier.color }}>{currentTier.name}</span>
        </div>
      </div>

      {/* Range adjustment panel */}
      {showRangeAdjust && variant !== 'simple' && (
        <div className="bg-gray-50 rounded-lg p-3 space-y-2">
          <div>
            <label className="text-xs font-medium text-gray-600">Below budget: -{budgetRangeMin}%</label>
            <input
              type="range"
              min="0"
              max="50"
              value={budgetRangeMin}
              className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-0 [&::-webkit-slider-thumb]:h-0 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-0 [&::-moz-range-thumb]:h-0 [&::-moz-range-thumb]:border-0"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600">Above budget: +{budgetRangeMax}%</label>
            <input
              type="range"
              min="0"
              max="50"
              value={budgetRangeMax}
              className="w-full h-1 bg-gray-300 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-0 [&::-webkit-slider-thumb]:h-0 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-0 [&::-moz-range-thumb]:h-0 [&::-moz-range-thumb]:border-0"
            />
          </div>
        </div>
      )}

      {/* Slider container */}
      <div className="relative py-8">
        {/* Floating tooltip */}
        {showTooltip && (
          <div
            className="absolute -top-2 transform -translate-x-1/2 pointer-events-none z-20 transition-all duration-75"
            style={{ left: `${sliderPosition}%` }}
          >
            <div className="bg-gray-900 text-white text-sm font-bold px-3 py-1.5 rounded-md whitespace-nowrap">
              {formatBudget(localBudget)}
              <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-gray-900 rotate-45" />
            </div>
          </div>
        )}

        {/* Tick marks */}
        <div className="absolute w-full h-full pointer-events-none">
          {ticks.map(tick => (
            <div
              key={tick.value}
              className="absolute top-1/2 transform -translate-y-1/2 -translate-x-1/2"
              style={{
                left: `${tick.position}%`,
                opacity: tick.visible ? tick.opacity : 0,
                transition: 'opacity 0.3s'
              }}
            >
              <div className={`h-2 w-px mx-auto ${tick.emphasized ? 'bg-gray-600 dark:bg-gray-400' : 'bg-gray-400 dark:bg-gray-500'}`} />
              {tick.visible && (
                <span className={`absolute top-4 left-1/2 transform -translate-x-1/2 text-[10px] ${tick.emphasized ? 'text-gray-800 dark:text-gray-200 font-semibold' : 'text-gray-600 dark:text-gray-300'} whitespace-nowrap text-center`}>
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
              <div
                className="absolute w-full h-3 rounded-lg"
                style={getGradientBackground(localBudget, minBudget, maxBudget)}
              />

              {/* Range fill between thumbs */}
              <div
                className="absolute h-3 bg-blue-500 bg-opacity-30 rounded-lg"
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
                className="absolute w-full h-3 rounded-lg appearance-none cursor-pointer touch-manipulation focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-0 [&::-webkit-slider-thumb]:h-0 [&::-webkit-slider-thumb]:opacity-0 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-0 [&::-moz-range-thumb]:h-0 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:opacity-0 [&::-ms-thumb]:appearance-none [&::-ms-thumb]:w-0 [&::-ms-thumb]:h-0 [&::-ms-thumb]:opacity-0 bg-transparent"
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
                className="absolute w-full h-3 rounded-lg appearance-none cursor-pointer touch-manipulation focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-0 [&::-webkit-slider-thumb]:h-0 [&::-webkit-slider-thumb]:opacity-0 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-0 [&::-moz-range-thumb]:h-0 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:opacity-0 [&::-ms-thumb]:appearance-none [&::-ms-thumb]:w-0 [&::-ms-thumb]:h-0 [&::-ms-thumb]:opacity-0 bg-transparent"
                aria-label="Maximum budget"
                aria-valuemin={minBudget}
                aria-valuemax={maxBudget}
                aria-valuenow={rangeMax}
              />

              {/* Custom thumbs for dual-range */}
              <div
                className="absolute w-5 h-5 bg-white rounded-full shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${budgetToSlider(rangeMin, minBudget, maxBudget)}%`,
                  top: '50%',
                  border: '3px solid #3b82f6',
                  transition: isDragging ? 'none' : 'all 0.2s'
                }}
              />
              <div
                className="absolute w-5 h-5 bg-white rounded-full shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${budgetToSlider(rangeMax, minBudget, maxBudget)}%`,
                  top: '50%',
                  border: '3px solid #3b82f6',
                  transition: isDragging ? 'none' : 'all 0.2s'
                }}
              />
            </>
          ) : (
            <>
              {/* Gradient track background */}
              <div
                className="absolute w-full h-3 rounded-lg"
                style={getGradientBackground(localBudget, minBudget, maxBudget)}
              />

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
                className="absolute w-full h-3 bg-transparent rounded-lg appearance-none cursor-pointer touch-manipulation focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-0 [&::-webkit-slider-thumb]:h-0 [&::-webkit-slider-thumb]:opacity-0 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-0 [&::-moz-range-thumb]:h-0 [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:opacity-0 [&::-ms-thumb]:appearance-none [&::-ms-thumb]:w-0 [&::-ms-thumb]:h-0 [&::-ms-thumb]:opacity-0"
                aria-label="Budget slider"
                aria-valuemin={minBudget}
                aria-valuemax={maxBudget}
                aria-valuenow={localBudget}
              />

              {/* Custom thumb for single budget */}
              <div
                className="absolute w-6 h-6 bg-white rounded-full shadow-lg pointer-events-none"
                style={{
                  left: `calc(${sliderPosition}% - 12px)`,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  border: `4px solid ${currentTier.color}`,
                  transition: isDragging ? 'none' : 'left 0.1s ease-out, border-color 0.2s ease'
                }}
              />
            </>
          )}
        </div>
      </div>

      {/* Dual-range input controls only */}
      {showInput && effectiveVariant === 'dual-range' && (
        <div className="flex justify-center items-center gap-2 text-sm">
          <span className="text-gray-400">$</span>
          <input
            type="number"
            value={rangeMin}
            onChange={(e) => {
              const newMin = parseInt(e.target.value) || minBudget
              const clampedMin = Math.min(newMin, rangeMax - 50)
              setRangeMin(clampedMin)
              if (onRangeChange) onRangeChange(clampedMin, rangeMax)
            }}
            className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            min={minBudget}
            max={maxBudget}
          />
          <span className="text-gray-400">-</span>
          <input
            type="number"
            value={rangeMax}
            onChange={(e) => {
              const newMax = parseInt(e.target.value) || maxBudget
              const clampedMax = Math.max(newMax, rangeMin + 50)
              setRangeMax(clampedMax)
              if (onRangeChange) onRangeChange(rangeMin, clampedMax)
            }}
            className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            min={minBudget}
            max={maxBudget}
          />
        </div>
      )}

      {/* Keyboard shortcuts help */}
      {showKeyboardHelp && (
        <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
          <div className="font-medium text-gray-700 mb-2">Keyboard Shortcuts:</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-600">
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