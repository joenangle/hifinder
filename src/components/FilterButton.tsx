'use client'

import { memo } from 'react'
import { Tooltip } from './Tooltip'

interface TooltipContent {
  title?: string
  description?: string
  details?: string
}

interface FilterButtonProps {
  active: boolean
  onClick: () => void
  icon: string
  label: string
  count?: number
  activeClass?: string
  tooltip?: string | TooltipContent
  showTooltip?: boolean
}

const FilterButtonComponent = ({
  active,
  onClick,
  icon,
  label,
  count,
  activeClass = '',
  tooltip,
  showTooltip = false
}: FilterButtonProps) => {
  const button = (
    <button
      className={`toggle-compact ${active ? activeClass : ''}`}
      onClick={onClick}
    >
      <span>{icon}</span>
      <span className="flex items-center gap-1">
        <span>{label}</span>
        {(count !== undefined && count !== null) && (
          <span className="ml-0.5 px-1.5 py-0.5 rounded-md bg-black/5 dark:bg-white/10 text-[10px] font-semibold tabular-nums">
            {count}
          </span>
        )}
      </span>
    </button>
  )

  if (showTooltip && tooltip) {
    return (
      <Tooltip content={tooltip} position="top">
        {button}
      </Tooltip>
    )
  }

  return button
}

// Memoize to prevent unnecessary re-renders
export const FilterButton = memo(FilterButtonComponent)
