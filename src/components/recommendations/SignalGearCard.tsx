'use client'

import { useState, useEffect } from 'react'
import { ExpertAnalysisPanel } from '@/components/ExpertAnalysisPanel'

interface AudioComponent {
  id: string
  brand: string
  name: string
  category: string
  price_new: number | null
  price_used_min: number | null
  price_used_max: number | null
  asr_sinad?: number | null
  asr_review_url?: string | null
  manufacturer_url?: string | null
  usedListingsCount?: number
  input_types?: string | string[]
  output_types?: string | string[]
  why_recommended?: string
  power_output_mw?: number
  thd_n?: number
  // ASR expert data (for ExpertAnalysisPanel compatibility)
  crin_comments?: string  // Will use for ASR review summary
  driver_type?: string    // Not used for signal gear but keeps interface compatible
}

interface SignalGearCardProps {
  component: AudioComponent
  isSelected: boolean
  onToggleSelection: (id: string) => void
  type: 'dac' | 'amp' | 'combo'
  onFindUsed?: (componentId: string, componentName: string) => void
  expandAllExperts?: boolean
}

const formatBudgetUSD = (amount: number) => {
  return `$${Math.round(amount).toLocaleString()}`
}

const TYPE_CONFIG = {
  dac: {
    icon: '🔄',
    label: 'DAC',
    bgClass: 'bg-emerald-50/50 dark:bg-emerald-900/20',
    textClass: 'text-emerald-600 dark:text-emerald-400'
  },
  amp: {
    icon: '⚡',
    label: 'Amplifier',
    bgClass: 'bg-amber-50/50 dark:bg-amber-900/20',
    textClass: 'text-amber-600 dark:text-amber-400'
  },
  combo: {
    icon: '🔗',
    label: 'DAC/Amp Combo',
    bgClass: 'bg-blue-50/50 dark:bg-blue-900/20',
    textClass: 'text-blue-600 dark:text-blue-400'
  }
} as const

const SignalGearCardComponent = ({
  component,
  isSelected,
  onToggleSelection,
  type,
  onFindUsed,
  expandAllExperts = false
}: SignalGearCardProps) => {
  const config = TYPE_CONFIG[type]

  return (
    <div
      className={`card-interactive ${isSelected ? 'card-interactive-selected' : ''}`}
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
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg text-text-primary dark:text-text-primary">
              {component.brand} {component.name}
            </h3>
            {component.manufacturer_url && (
              <a
                href={component.manufacturer_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-text-tertiary hover:text-accent-primary dark:text-text-tertiary dark:hover:text-accent-primary transition-colors flex-shrink-0"
                title="View on manufacturer website"
                aria-label={`View ${component.brand} ${component.name} on manufacturer website`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        </div>
        <div className="text-right ml-4">
          <div className="text-lg font-bold text-accent-primary dark:text-accent-primary whitespace-nowrap">
            {formatBudgetUSD(component.price_used_min || 0)}-{formatBudgetUSD(component.price_used_max || 0)}
          </div>
          <PriceHistoryBadge componentId={component.id} />
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
        <div className="mb-2">
          <h4 className="text-xs font-semibold text-text-secondary dark:text-text-secondary uppercase tracking-wide mb-1">💡 Why Recommended</h4>
          <p className="text-sm text-text-secondary dark:text-text-secondary">{component.why_recommended}</p>
        </div>
      )}

      {/* Expert Analysis Panel - Shows ASR measurements and technical details */}
      <ExpertAnalysisPanel component={component} forceExpanded={expandAllExperts} />

      {/* Find Used Button - Only show if listings exist */}
      {onFindUsed && (component.usedListingsCount ?? 0) > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation() // Prevent card selection toggle
            onFindUsed(component.id, `${component.brand} ${component.name}`)
          }}
          className="mt-3 w-full px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-2"
        >
          <span>🔍</span>
          <span>
            View {component.usedListingsCount} Used Listing{component.usedListingsCount !== 1 ? 's' : ''}
          </span>
        </button>
      )}
    </div>
  )
}

// Price History Badge - shows recent sales data if available
const PriceHistoryBadge = ({ componentId }: { componentId: string }) => {
  const [priceStats, setPriceStats] = useState<{ count: number; median: number } | null>(null)

  useEffect(() => {
    // Fetch price history stats
    fetch(`/api/components/${componentId}/price-history?days=90`)
      .then(res => res.json())
      .then(data => {
        if (data.statistics && data.statistics.count >= 3) {
          setPriceStats({
            count: data.statistics.count,
            median: data.statistics.median
          })
        }
      })
      .catch(() => {
        // Silently fail - not critical
      })
  }, [componentId])

  if (!priceStats) return null

  return (
    <div className="text-xs text-text-tertiary dark:text-text-tertiary mt-1">
      {priceStats.count} recent sales · median ${Math.round(priceStats.median)}
    </div>
  )
}

export const SignalGearCard = SignalGearCardComponent
