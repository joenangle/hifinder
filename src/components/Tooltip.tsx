'use client'

import { useState, useRef, useEffect, memo } from 'react'

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
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
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

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2'
  }

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-background-primary dark:border-t-surface-elevated',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-background-primary dark:border-b-surface-elevated',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-background-primary dark:border-l-surface-elevated',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-background-primary dark:border-r-surface-elevated'
  }

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}

      {shouldRender && (
        <div
          className={`
            absolute z-50 ${positionClasses[position]}
            transition-opacity duration-150
            ${isVisible ? 'opacity-100' : 'opacity-0'}
          `}
          style={{ pointerEvents: 'none' }}
        >
          <div className="bg-background-primary dark:bg-surface-elevated border border-border-default rounded-lg shadow-xl px-3 py-2 max-w-xs">
            <div className="text-sm text-text-primary whitespace-normal">
              {typeof content === 'string' ? (
                content
              ) : (
                <>
                  {content.description && (
                    <p className="font-medium mb-1">{content.description}</p>
                  )}
                  {content.details && (
                    <p className="text-xs text-text-secondary">{content.details}</p>
                  )}
                </>
              )}
            </div>
          </div>
          {/* Arrow */}
          <div
            className={`
              absolute w-0 h-0 ${arrowClasses[position]}
              border-4 border-transparent
            `}
          />
        </div>
      )}
    </div>
  )
}

// Memoize to prevent unnecessary re-renders
export const Tooltip = memo(TooltipComponent)
