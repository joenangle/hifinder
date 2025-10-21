'use client'

import { Tooltip } from './Tooltip'

interface FilterButtonProps {
  active: boolean
  onClick: () => void
  icon: string
  label: string
  activeClass?: string
  tooltip?: React.ReactNode
  showTooltip?: boolean
}

export function FilterButton({
  active,
  onClick,
  icon,
  label,
  activeClass = '',
  tooltip,
  showTooltip = false
}: FilterButtonProps) {
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
