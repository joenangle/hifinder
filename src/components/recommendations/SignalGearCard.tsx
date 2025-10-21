'use client'

import { memo } from 'react'

interface AudioComponent {
  id: string
  brand: string
  name: string
  category: string
  price_new?: number
  price_used_min?: number
  price_used_max?: number
  asr_sinad?: number
  asr_review_url?: string
  input_types?: string | string[]
  output_types?: string | string[]
  why_recommended?: string
  power_output_mw?: number
  thd_n?: number
}

interface SignalGearCardProps {
  component: AudioComponent
  isSelected: boolean
  onToggleSelection: (id: string) => void
  type: 'dac' | 'amp' | 'combo'
}

const formatBudgetUSD = (amount: number) => {
  return `$${Math.round(amount).toLocaleString()}`
}

const TYPE_CONFIG = {
  dac: {
    icon: '🔄',
    label: 'DAC',
    bgClass: 'bg-red-100 dark:bg-red-900/50',
    textClass: 'text-red-800 dark:text-red-200'
  },
  amp: {
    icon: '⚡',
    label: 'Amplifier',
    bgClass: 'bg-amber-100 dark:bg-amber-900/50',
    textClass: 'text-amber-800 dark:text-amber-200'
  },
  combo: {
    icon: '🔗',
    label: 'DAC/Amp Combo',
    bgClass: 'bg-orange-100 dark:bg-orange-900/50',
    textClass: 'text-orange-800 dark:text-orange-200'
  }
} as const

const SignalGearCardComponent = ({
  component,
  isSelected,
  onToggleSelection,
  type
}: SignalGearCardProps) => {
  const config = TYPE_CONFIG[type]

  return (
    <div
      className={`card-interactive ${isSelected ? 'selected' : ''}`}
      onClick={() => onToggleSelection(component.id)}
    >
      {/* Header: Category badge */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-semibold px-2 py-1 rounded ${config.bgClass} ${config.textClass}`}>
          {config.icon} {config.label}
        </span>
      </div>

      {/* Name (Brand + Model) and Price on same line */}
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="font-semibold text-lg text-text-primary dark:text-text-primary">
          {component.brand} {component.name}
        </h3>
        <div className="text-right ml-4">
          <div className="text-lg font-bold text-accent-primary dark:text-accent-primary whitespace-nowrap">
            {formatBudgetUSD(component.price_used_min || 0)}-{formatBudgetUSD(component.price_used_max || 0)}
          </div>
        </div>
      </div>

      {/* MSRP */}
      {component.price_new && (
        <div className="text-xs text-text-tertiary dark:text-text-tertiary mb-2">
          MSRP: {formatBudgetUSD(component.price_new)}
        </div>
      )}

      {/* Performance Section */}
      {(component.asr_sinad || component.asr_review_url || component.power_output_mw || component.thd_n) && (
        <div className="mb-3">
          <h4 className="text-xs font-semibold text-text-secondary dark:text-text-secondary uppercase tracking-wide mb-1">⚡ Performance</h4>
          <div className="text-sm text-text-primary dark:text-text-primary">
            {component.asr_sinad && (
              <div>• SINAD: {component.asr_sinad} dB {
                component.asr_sinad >= 120 ? '(Excellent)' :
                component.asr_sinad >= 110 ? '(Very Good)' :
                component.asr_sinad >= 100 ? '(Good)' : '(Fair)'
              }</div>
            )}
            {component.power_output_mw && (
              <div>• Power: {component.power_output_mw} mW</div>
            )}
            {component.thd_n && (
              <div>• THD+N: {component.thd_n}%</div>
            )}
            {component.asr_review_url && !component.asr_sinad && (
              <div>• ASR Review Available</div>
            )}
          </div>
        </div>
      )}

      {/* Connectivity Section */}
      {(component.input_types || component.output_types) && (
        <div className="mb-3">
          <h4 className="text-xs font-semibold text-text-secondary dark:text-text-secondary uppercase tracking-wide mb-1">🔌 Connectivity</h4>
          <div className="text-sm text-text-primary dark:text-text-primary space-y-1">
            {component.input_types && (
              <div>• Inputs: {Array.isArray(component.input_types) ? component.input_types.join(', ') : component.input_types}</div>
            )}
            {component.output_types && (
              <div>• Outputs: {Array.isArray(component.output_types) ? component.output_types.join(', ') : component.output_types}</div>
            )}
          </div>
        </div>
      )}

      {/* Why Recommended */}
      {component.why_recommended && (
        <div>
          <h4 className="text-xs font-semibold text-text-secondary dark:text-text-secondary uppercase tracking-wide mb-1">💡 Why Recommended</h4>
          <p className="text-sm text-text-secondary dark:text-text-secondary">{component.why_recommended}</p>
        </div>
      )}
    </div>
  )
}

export const SignalGearCard = memo(SignalGearCardComponent)
