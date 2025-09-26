'use client'

interface FilterToggleButtonProps {
  label: string
  icon: string
  active: boolean
  onClick: () => void
  color: 'purple' | 'indigo' | 'green' | 'amber' | 'blue' | 'neutral' | 'warm' | 'bright' | 'fun'
  badge?: string
}

export function FilterToggleButton({ 
  label, 
  icon, 
  active, 
  onClick, 
  color,
  badge = active ? 'ON' : 'OFF'
}: FilterToggleButtonProps) {
  const colorClasses = {
    purple: 'var(--ui-purple)',
    indigo: 'var(--ui-indigo)',
    green: 'var(--ui-green)',
    amber: 'var(--ui-amber)',
    blue: 'var(--ui-blue)',
    neutral: 'var(--ui-neutral)',
    warm: 'var(--ui-warm)',
    bright: 'var(--ui-bright)',
    fun: 'var(--ui-fun)'
  }

  const bgColor = colorClasses[color]
  
  return (
    <button
      onClick={onClick}
      className="filter-toggle-btn"
      style={{
        '--btn-color': bgColor,
        backgroundColor: active ? `color-mix(in srgb, ${bgColor} 15%, transparent)` : 'var(--background-secondary)',
        borderColor: active ? bgColor : 'var(--border-default)',
        color: active ? bgColor : 'var(--text-secondary)'
      } as React.CSSProperties}
    >
      <div className="flex items-center gap-2">
        <span className="text-base">{icon}</span>
        <span className="text-sm font-medium">{label}</span>
      </div>
      <span 
        className="filter-toggle-badge"
        style={{
          backgroundColor: active ? `color-mix(in srgb, ${bgColor} 20%, transparent)` : 'var(--background-tertiary)',
          color: active ? bgColor : 'var(--text-tertiary)'
        }}
      >
        {badge}
      </span>
    </button>
  )
}