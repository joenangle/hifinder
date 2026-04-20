'use client'

import { memo } from 'react'
import Image from 'next/image'
import { Cable, Disc3, Combine } from 'lucide-react'
import { ExpertAnalysisPanel } from '@/components/recommendations/ExpertAnalysisPanel'
import { WishlistButton } from '@/components/WishlistButton'
import { PriceAlertButton } from '@/components/PriceAlertButton'
import { PriceHistoryBadge } from '@/components/recommendations/PriceHistoryBadge'
import { PriceTrendIndicator } from '@/components/recommendations/PriceTrendIndicator'
import { deriveReasonChips, REASON_CHIP_CLASSES } from '@/lib/recommendation-reasons'

const TYPE_ICON = { dac: Disc3, amp: Cable, combo: Combine } as const

interface AudioComponent {
  id: string
  brand: string
  name: string
  category: string
  image_url?: string | null
  price_new: number | null
  price_used_min: number | null
  price_used_max: number | null
  asr_sinad?: number | null
  asr_review_url?: string | null
  manufacturer_url?: string | null
  usedListingsCount?: number
  crin_tone?: string | null
  crin_tech?: string | null
  matchScore?: number
  valueScore?: number
  signatureScoreDisplay?: number
  proximityScoreDisplay?: number
  liquidityBonusDisplay?: number
  expertScoreDisplay?: number
  avgPrice?: number
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
  onViewDetails?: (id: string) => void
  expandAllExperts?: boolean
  isFirstCardHint?: boolean
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
  onViewDetails,
  expandAllExperts = false,
  isFirstCardHint = false
}: SignalGearCardProps) => {
  const inputs = component.input_types
    ? (Array.isArray(component.input_types) ? component.input_types : [component.input_types])
    : []
  const outputs = component.output_types
    ? (Array.isArray(component.output_types) ? component.output_types : [component.output_types])
    : []

  const powerMatch = component.powerMatchScore
  const hasMeasurements = component.asr_sinad || component.power_output_mw || component.power_output || component.thd_n
  const reasonChips = deriveReasonChips(component)

  const SELECTED_STYLE = 'border-accent bg-accent/5 dark:bg-accent/10 shadow-[0_0_0_3px_rgba(204,78,37,0.12),0_2px_8px_rgba(204,78,37,0.10)]'
  const HOVER_STYLE = 'hover:border-accent/20 hover:shadow-sm'

  return (
    <div
      role="article"
      aria-label={`${component.brand} ${component.name}`}
      tabIndex={0}
      title="View details"
      className={`card-interactive group relative rounded-xl border cursor-pointer px-3 py-2.5 ${
        isSelected
          ? SELECTED_STYLE
          : `bg-surface-card ${HOVER_STYLE}`
      }`}
      onClick={() => onViewDetails?.(component.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onViewDetails?.(component.id) } }}
    >
      {/* Selection button — top right */}
      <button
        type="button"
        aria-label={isSelected ? `Remove ${component.brand} ${component.name} from stack` : `Add ${component.brand} ${component.name} to stack`}
        className={`absolute top-2.5 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-[color,background-color,opacity] duration-200 ${
          isSelected
            ? 'bg-accent text-white hover:bg-accent-hover'
            : isFirstCardHint
            ? 'border-2 border-accent text-accent opacity-100 animate-hint-pulse'
            : 'bg-transparent text-tertiary opacity-60 hover:opacity-100 border-2'
        }`}
        onClick={(e) => { e.stopPropagation(); onToggleSelection(component.id) }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onToggleSelection(component.id) } }}
      >
        {isSelected ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v12m6-6H6" />
          </svg>
        )}
      </button>

      {/* Horizontal layout: image left (1/3), info right (2/3) */}
      <div className="flex items-stretch gap-3 pr-10">
        {/* Product image — 1/3 width when image exists, narrow icon strip when not */}
        {(() => { const Icon = TYPE_ICON[type]; return (
          <div className={`flex-shrink-0 rounded-xl bg-secondary flex items-center justify-center overflow-hidden ${
            component.image_url ? 'w-1/4 sm:w-1/3' : 'w-8'
          }`}>
            {component.image_url ? (
              <Image
                src={component.image_url}
                alt={`${component.brand} ${component.name}`}
                width={160}
                height={160}
                className="w-full h-full object-contain p-1 rounded-md"
              />
            ) : (
              <Icon className="w-5 h-5 text-tertiary" />
            )}
          </div>
        ); })()}

        {/* Info column */}
        <div className="flex-1 min-w-0">
          {/* Row 1: Type label + name */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-tertiary">
              {TYPE_LABEL[type]}
            </span>
            <h3 className="font-semibold text-base text-primary leading-snug truncate">
              <span className="font-normal text-secondary">{component.brand} </span>
              {component.name}
            </h3>
            {component.manufacturer_url && (
              <a
                href={component.manufacturer_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex-shrink-0 text-tertiary hover:text-accent transition-colors"
                title="Manufacturer page"
                aria-label={`${component.brand} ${component.name} manufacturer page (opens in new tab)`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>

          {/* Row 2: Measurements + compatibility */}
          {(hasMeasurements || powerMatch !== undefined) && (
            <div className="flex flex-wrap items-center gap-2 mt-0.5 text-sm">
              {component.asr_sinad && (
                <span className="text-secondary tabular-nums">
                  SINAD <span className="font-semibold text-primary">{component.asr_sinad}</span>
                  <span className="text-xs text-tertiary ml-1">
                    {component.asr_sinad >= 120 ? 'excellent' : component.asr_sinad >= 110 ? 'very good' : component.asr_sinad >= 100 ? 'good' : 'fair'}
                  </span>
                </span>
              )}
              {(component.power_output || component.power_output_mw) && (
                <span className="text-secondary">
                  <span className="font-semibold text-primary">{component.power_output || `${component.power_output_mw}mW`}</span>
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

          {/* Row 2.5: Reason chips — small labels explaining why this ranks */}
          {reasonChips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 mt-1">
              {reasonChips.map(chip => (
                <span
                  key={chip.label}
                  title={chip.tooltip}
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${REASON_CHIP_CLASSES[chip.tone]}`}
                >
                  {chip.label}
                </span>
              ))}
            </div>
          )}

          {/* Row 3: Price + MSRP */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-sm font-bold text-primary tabular-nums">
              {fmt(component.price_used_min || 0)}–{fmt(component.price_used_max || 0)}
            </span>
            <span className="text-[10px] text-tertiary">used est.</span>
            {component.price_new && (
              <span className="text-xs text-tertiary">
                MSRP {fmt(component.price_new)}
              </span>
            )}
            <PriceHistoryBadge componentId={component.id} />
            <PriceTrendIndicator componentId={component.id} />
          </div>

          {/* Row 4: I/O pills */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-secondary">
            {inputs.slice(0, 3).map(i => (
              <span key={i} className="px-2 py-0.5 rounded-full border border-subtle bg-secondary">
                {i}
              </span>
            ))}
            {outputs.slice(0, 2).map(o => (
              <span key={o} className="px-2 py-0.5 rounded-full border border-subtle bg-secondary">
                {o} out
              </span>
            ))}
          </div>

          {/* Why recommended */}
          {component.why_recommended && (
            <p className="mt-1 text-xs text-tertiary leading-snug line-clamp-2">
              {component.why_recommended}
            </p>
          )}

          {/* Expert quote (inline) */}
          <ExpertAnalysisPanel component={component} inline forceExpanded={expandAllExperts} />

          {/* Actions */}
          <div className="mt-1.5 flex items-center gap-2">
            {(component.usedListingsCount ?? 0) > 0 && (
              <a
                href={`/marketplace?component_id=${component.id}&name=${encodeURIComponent(`${component.brand} ${component.name}`)}`}
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-medium text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
              >
                {component.usedListingsCount} used listing{component.usedListingsCount !== 1 ? 's' : ''}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            )}
            <div className="ml-auto flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <PriceAlertButton
                componentId={component.id}
                avgPrice={
                  component.price_used_min != null && component.price_used_max != null
                    ? (component.price_used_min + component.price_used_max) / 2
                    : component.price_new ?? component.price_used_min ?? component.price_used_max ?? 0
                }
                priceFloor={component.price_used_min}
              />
              <WishlistButton componentId={component.id} className="px-2 py-1" showText={false} />
            </div>
          </div>
        </div>
      </div>

      {isFirstCardHint && !isSelected && (
        <p className="text-xs text-accent text-center mt-2 animate-fadeIn">Tap card for details · <strong>+</strong> to add to stack</p>
      )}
    </div>
  )
}

export const SignalGearCard = memo(SignalGearCardComponent)
