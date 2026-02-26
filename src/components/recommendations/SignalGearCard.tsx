'use client'

import { memo } from 'react'
import { ExpertAnalysisPanel } from '@/components/ExpertAnalysisPanel'
import { WishlistButton } from '@/components/WishlistButton'
import { PriceHistoryBadge } from '@/components/recommendations/PriceHistoryBadge'

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
  power_output?: string
  thd_n?: number
  crin_comments?: string
  driver_type?: string | null
  powerMatchScore?: number
  powerMatchExplanation?: string
}

interface SignalGearCardProps {
  component: AudioComponent
  isSelected: boolean
  onToggleSelection: (id: string) => void
  type: 'dac' | 'amp' | 'combo'
  onFindUsed?: (componentId: string, componentName: string) => void
  expandAllExperts?: boolean
}

const fmt = (amount: number) => `$${Math.round(amount).toLocaleString()}`

const TYPE_LABEL = {
  dac: 'DAC',
  amp: 'Amp',
  combo: 'DAC/Amp',
} as const

const SignalGearCardComponent = ({
  component,
  isSelected,
  onToggleSelection,
  type,
  onFindUsed,
  expandAllExperts = false
}: SignalGearCardProps) => {
  const inputs = component.input_types
    ? (Array.isArray(component.input_types) ? component.input_types : [component.input_types])
    : []
  const outputs = component.output_types
    ? (Array.isArray(component.output_types) ? component.output_types : [component.output_types])
    : []

  const powerMatch = component.powerMatchScore
  const hasMeasurements = component.asr_sinad || component.power_output_mw || component.power_output || component.thd_n

    const SELECTED_STYLE = {
      dac:   'border-teal-400 bg-teal-50 dark:bg-teal-900/20 shadow-[0_0_0_3px_rgba(45,212,191,0.12),0_2px_8px_rgba(45,212,191,0.08)]',
      amp:   'border-amber-400 bg-amber-50 dark:bg-amber-900/20 shadow-[0_0_0_3px_rgba(251,191,36,0.12),0_2px_8px_rgba(251,191,36,0.08)]',
      combo: 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-[0_0_0_3px_rgba(96,165,250,0.12),0_2px_8px_rgba(96,165,250,0.08)]',
    }
    const HOVER_STYLE = {
      dac:   'hover:border-teal-300 hover:shadow-sm',
      amp:   'hover:border-amber-300 hover:shadow-sm',
      combo: 'hover:border-blue-300 hover:shadow-sm',
    }

    const SELECTED_COLOR = { dac: 'bg-teal-500', amp: 'bg-amber-500', combo: 'bg-blue-500' }

    return (
      <div
        role="button"
        aria-pressed={isSelected}
        tabIndex={0}
        title={isSelected ? 'Click to remove from your system' : 'Click to add to your system'}
        className={`card-interactive group relative rounded-xl border cursor-pointer px-4 py-3 ${
          isSelected
            ? SELECTED_STYLE[type]
            : `border-border-default bg-surface-card ${HOVER_STYLE[type]}`
        }`}
        onClick={() => onToggleSelection(component.id)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleSelection(component.id) } }}
      >
        {/* Selection affordance icon */}
        <div className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
          isSelected
            ? `${SELECTED_COLOR[type]} text-white`
            : 'bg-transparent text-text-tertiary opacity-0 group-hover:opacity-100 border border-border-default'
        }`}>
          {isSelected ? (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
            </svg>
          )}
        </div>
      {/* Row 1: Type label + name + price (pr-8 clears the selection affordance icon) */}
      <div className="flex items-start justify-between gap-3 mb-2 pr-8">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
              {TYPE_LABEL[type]}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-base text-text-primary leading-snug">
              <span className="font-normal text-text-secondary">{component.brand} </span>
              {component.name}
            </h3>
            {component.manufacturer_url && (
              <a
                href={component.manufacturer_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex-shrink-0 text-text-tertiary hover:text-accent-primary transition-colors"
                title="Manufacturer page"
                aria-label={`${component.brand} ${component.name} manufacturer page (opens in new tab)`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        </div>

        <div className="text-right flex-shrink-0">
          <div className="text-base font-bold text-text-primary tabular-nums">
            {fmt(component.price_used_min || 0)}–{fmt(component.price_used_max || 0)}
          </div>
          <div className="text-[10px] text-text-tertiary leading-none mt-0.5">used est.</div>
          <PriceHistoryBadge componentId={component.id} />
        </div>
      </div>

      {/* Row 2: Key measurements + compatibility */}
      {(hasMeasurements || powerMatch !== undefined) && (
        <div className="flex flex-wrap items-center gap-3 mb-2 text-sm">
          {component.asr_sinad && (
            <span className="text-text-secondary tabular-nums">
              SINAD <span className="font-semibold text-text-primary">{component.asr_sinad}</span>
              <span className="text-xs text-text-tertiary ml-1">
                {component.asr_sinad >= 120 ? 'excellent' : component.asr_sinad >= 110 ? 'very good' : component.asr_sinad >= 100 ? 'good' : 'fair'}
              </span>
            </span>
          )}
          {(component.power_output || component.power_output_mw) && (
            <span className="text-text-secondary">
              <span className="font-semibold text-text-primary">{component.power_output || `${component.power_output_mw}mW`}</span>
            </span>
          )}
          {powerMatch !== undefined && (
            <span className={`text-xs font-medium ${
              powerMatch >= 0.9 ? 'text-emerald-600 dark:text-emerald-400' :
              powerMatch >= 0.6 ? 'text-amber-600 dark:text-amber-400' :
              'text-red-600 dark:text-red-400'
            }`}>
              {powerMatch >= 0.9 ? 'Excellent pairing' : powerMatch >= 0.6 ? 'Adequate' : 'May struggle'}
            </span>
          )}
        </div>
      )}

      {/* Row 3: Attribute pills */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-text-secondary">
        {inputs.slice(0, 3).map(i => (
          <span key={i} className="px-2 py-0.5 rounded-full border border-border-subtle bg-background-secondary">
            {i}
          </span>
        ))}
        {outputs.slice(0, 2).map(o => (
          <span key={o} className="px-2 py-0.5 rounded-full border border-border-subtle bg-background-secondary">
            {o} out
          </span>
        ))}
        {component.price_new && (
          <span className="text-text-tertiary ml-auto">
            MSRP {fmt(component.price_new)}
          </span>
        )}
      </div>

      {/* Why recommended — subtle, below pills */}
      {component.why_recommended && (
        <p className="mt-2 text-xs text-text-tertiary leading-snug line-clamp-2">
          {component.why_recommended}
        </p>
      )}

      <ExpertAnalysisPanel component={component} forceExpanded={expandAllExperts} />

      {/* Action row */}
      <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {onFindUsed && (component.usedListingsCount ?? 0) > 0 && (
          <button
            onClick={() => onFindUsed(component.id, `${component.brand} ${component.name}`)}
            className="text-xs font-medium text-accent-primary hover:text-accent-hover transition-colors flex items-center gap-1"
          >
            {component.usedListingsCount} used listing{component.usedListingsCount !== 1 ? 's' : ''}
            <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
        <div className="ml-auto">
          <WishlistButton componentId={component.id} className="px-2 py-1" showText={false} />
        </div>
      </div>
    </div>
  )
}

export const SignalGearCard = memo(SignalGearCardComponent)
