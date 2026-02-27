'use client'

import { useState, useRef, useEffect, memo } from 'react'
import { createPortal } from 'react-dom'

interface TooltipContent {
  title?: string
  description?: string
  details?: string
}

interface TooltipProps {
  content: string | TooltipContent
  children: React.ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  className?: string
}

const TooltipComponent = ({
  content,
  children,
  position = 'top',
  delay = 200,
  className = ''
}: TooltipProps) => {
  const [isVisible, setIsVisible] = useState(false)
  const [shouldRender, setShouldRender] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const triggerRef = useRef<HTMLDivElement>(null)

  const updateTooltipPosition = () => {
    if (!triggerRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipOffset = 8 // 8px gap between trigger and tooltip

    let top = 0
    let left = 0

    switch (position) {
      case 'top':
        top = triggerRect.top - tooltipOffset
        left = triggerRect.left + triggerRect.width / 2
        break
      case 'bottom':
        top = triggerRect.bottom + tooltipOffset
        left = triggerRect.left + triggerRect.width / 2
        break
      case 'left':
        top = triggerRect.top + triggerRect.height / 2
        left = triggerRect.left - tooltipOffset
        break
      case 'right':
        top = triggerRect.top + triggerRect.height / 2
        left = triggerRect.right + tooltipOffset
        break
    }

    setTooltipPosition({ top, left })
  }

  const handleMouseEnter = () => {
    // Don't show tooltip if content is empty
    if (!content || (typeof content === 'string' && content.trim() === '')) {
      return
    }

    timeoutRef.current = setTimeout(() => {
      updateTooltipPosition()
      setShouldRender(true)
      // Small delay for fade-in animation
      setTimeout(() => setIsVisible(true), 10)
    }, delay)
  }

  const handleMouseLeave = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
    // Wait for fade-out animation before unmounting
    setTimeout(() => setShouldRender(false), 150)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  // Update position on scroll or resize
  useEffect(() => {
    if (!shouldRender) return

    const handlePositionUpdate = () => updateTooltipPosition()
    window.addEventListener('scroll', handlePositionUpdate, true)
    window.addEventListener('resize', handlePositionUpdate)

    return () => {
      window.removeEventListener('scroll', handlePositionUpdate, true)
      window.removeEventListener('resize', handlePositionUpdate)
    }
  }, [shouldRender, position])

  const getTransformOrigin = () => {
    switch (position) {
      case 'top':
        return 'translate(-50%, -100%)'
      case 'bottom':
        return 'translate(-50%, 0%)'
      case 'left':
        return 'translate(-100%, -50%)'
      case 'right':
        return 'translate(0%, -50%)'
      default:
        return 'translate(-50%, -100%)'
    }
  }

  const arrowPositionClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 -mt-[1px]',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-[1px]',
    left: 'left-full top-1/2 -translate-y-1/2 -ml-[1px]',
    right: 'right-full top-1/2 -translate-y-1/2 -mr-[1px]'
  }

  const arrowBorderClasses = {
    top: 'border-t-[var(--surface-elevated)]',
    bottom: 'border-b-[var(--surface-elevated)]',
    left: 'border-l-[var(--surface-elevated)]',
    right: 'border-r-[var(--surface-elevated)]'
  }

  const tooltipContent = shouldRender && typeof document !== 'undefined' ? (
    createPortal(
      <div
        className={`
          fixed z-[99999]
          transition-opacity duration-150
          ${isVisible ? 'opacity-100' : 'opacity-0'}
        `}
        style={{
          top: `${tooltipPosition.top}px`,
          left: `${tooltipPosition.left}px`,
          transform: getTransformOrigin(),
          pointerEvents: 'none'
        }}
      >
        <div className="bg-surface-elevated border border-border rounded-lg shadow-2xl px-3 py-2 max-w-xs backdrop-blur-sm">
          <div className="text-sm text-primary whitespace-normal">
            {typeof content === 'string' ? (
              content
            ) : (
              <>
                {content.description && (
                  <p className="font-medium mb-1">{content.description}</p>
                )}
                {content.details && (
                  <p className="text-xs text-secondary">{content.details}</p>
                )}
              </>
            )}
          </div>
        </div>
        {/* Arrow */}
        <div
          className={`
            absolute w-0 h-0 ${arrowPositionClasses[position]} ${arrowBorderClasses[position]}
            border-[6px] border-transparent
          `}
        />
      </div>,
      document.body
    )
  ) : null

  const handleTouch = () => {
    if (!content || (typeof content === 'string' && content.trim() === '')) return

    if (shouldRender) {
      // Dismiss if already visible
      handleMouseLeave()
    } else {
      updateTooltipPosition()
      setShouldRender(true)
      setTimeout(() => setIsVisible(true), 10)
    }
  }

  // Dismiss tooltip on outside click (touch devices)
  useEffect(() => {
    if (!shouldRender) return

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (triggerRef.current && !triggerRef.current.contains(e.target as Node)) {
        handleMouseLeave()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('touchstart', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('touchstart', handleClickOutside)
    }
  }, [shouldRender])

  return (
    <div
      ref={triggerRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleMouseEnter}
      onBlur={handleMouseLeave}
      onClick={handleTouch}
      onTouchStart={handleTouch}
      tabIndex={0}
      role="button"
    >
      {children}
      {tooltipContent}
    </div>
  )
}

// Memoize to prevent unnecessary re-renders
export const Tooltip = memo(TooltipComponent)
