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
  activeClass?: string
  tooltip?: string | TooltipContent
  showTooltip?: boolean
}

const FilterButtonComponent = ({
  active,
  onClick,
  icon,
  label,
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
      <span>{label}</span>
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
