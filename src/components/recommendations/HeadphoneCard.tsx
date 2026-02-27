'use client'

import { memo } from 'react'
import { ExpertAnalysisPanel } from '@/components/ExpertAnalysisPanel'
import { WishlistButton } from '@/components/WishlistButton'
import { PriceHistoryBadge } from '@/components/recommendations/PriceHistoryBadge'
import { PriceTrendIndicator } from '@/components/recommendations/PriceTrendIndicator'

interface AudioComponent {
  id: string
  brand: string
  name: string
  category: string
  price_new: number | null
  price_used_min: number | null
  price_used_max: number | null
  impedance?: number | null
  matchScore?: number
  sound_signature?: string | null
  crinacle_sound_signature?: string | null
  expert_grade_numeric?: number
  value_rating?: number
  fit?: string | null
  manufacturer_url?: string | null
  usedListingsCount?: number
  crin_tone?: string | null
  crin_tech?: string | null
  crin_rank?: number | null
  amplificationAssessment?: {
    difficulty: 'easy' | 'moderate' | 'demanding' | 'very_demanding' | 'unknown'
    explanation: string
    estimatedSensitivity?: number
  }
}

interface HeadphoneCardProps {
  headphone: AudioComponent
  isSelected: boolean
  onToggleSelection: (id: string) => void
  isTechnicalChamp: boolean
  isToneChamp: boolean
  isBudgetChamp: boolean
  onFindUsed?: (componentId: string, componentName: string) => void
  onViewDetails?: (id: string) => void
  expandAllExperts?: boolean
  isFirstCardHint?: boolean
}

const fmt = (amount: number) => `$${Math.round(amount).toLocaleString()}`

const gradeColor = (grade: string) => {
  const first = grade.charAt(0)
  if (first === 'S') return 'text-amber-500 dark:text-amber-400'
  if (first === 'A') return 'text-emerald-600 dark:text-emerald-400'
  if (first === 'B') return 'text-sky-600 dark:text-sky-400'
  if (first === 'C') return 'text-orange-500 dark:text-orange-400'
  return 'text-tertiary'
}

const HeadphoneCardComponent = ({
  headphone,
  isSelected,
  onToggleSelection,
  isTechnicalChamp,
  isToneChamp,
  isBudgetChamp,
  onFindUsed,
  onViewDetails,
  expandAllExperts = false,
  isFirstCardHint = false
}: HeadphoneCardProps) => {
  const hasGrades = headphone.crin_tone || headphone.crin_tech || headphone.crin_rank
  const soundSig = headphone.crinacle_sound_signature || headphone.sound_signature
  const ampDifficulty = headphone.amplificationAssessment?.difficulty

    const isCans = headphone.category !== 'iems'
    const selectedStyle = isCans
      ? 'border-violet-400 bg-violet-50 dark:bg-violet-900/20 shadow-[0_0_0_3px_rgba(139,92,246,0.12),0_2px_8px_rgba(139,92,246,0.08)]'
      : 'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 shadow-[0_0_0_3px_rgba(99,102,241,0.12),0_2px_8px_rgba(99,102,241,0.08)]'
    const hoverStyle = isCans
      ? 'hover:border-violet-300 hover:shadow-sm'
      : 'hover:border-indigo-300 hover:shadow-sm'

    return (
      <div
        role="button"
        aria-pressed={isSelected}
        tabIndex={0}
        title={isSelected ? 'Click to remove from your system' : 'Click to add to your system'}
        className={`card-interactive group relative rounded-xl border cursor-pointer px-4 py-3 ${
          isSelected
            ? selectedStyle
            : `bg-surface-card ${hoverStyle}`
        }`}
        onClick={() => onToggleSelection(headphone.id)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleSelection(headphone.id) } }}
      >
        {/* Selection affordance icon */}
        <div className={`absolute top-3 right-3 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-200 ${
          isSelected
            ? (isCans ? 'bg-violet-500 text-white' : 'bg-indigo-500 text-white')
            : isFirstCardHint
            ? 'border border-accent text-accent opacity-100 animate-hint-pulse'
            : 'bg-transparent text-tertiary opacity-0 group-hover:opacity-100 border'
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
        {/* Champion tags — inline above name, no absolute positioning */}
        {(isTechnicalChamp || isToneChamp || isBudgetChamp) && (
          <div className="flex gap-1 mb-1.5">
            {isTechnicalChamp && (
              <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500 text-white dark:bg-amber-600 dark:text-white">
                Top Tech
              </span>
            )}
            {isToneChamp && (
              <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-sky-500 text-white dark:bg-sky-600 dark:text-white">
                Best Match
              </span>
            )}
            {isBudgetChamp && !isTechnicalChamp && (
              <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-500 text-white dark:bg-emerald-600 dark:text-white">
                Best Value
              </span>
            )}
          </div>
        )}

        {/* Row 1: Name + price (pr-8 clears the selection affordance icon) */}
        <div className="flex items-start justify-between gap-3 mb-2 pr-8">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h3 className="font-semibold text-base text-primary leading-snug">
                <span className="font-normal text-secondary">{headphone.brand} </span>
                {headphone.name}
              </h3>
            {headphone.manufacturer_url && (
              <a
                href={headphone.manufacturer_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex-shrink-0 text-tertiary hover:text-accent transition-colors"
                title="Manufacturer page"
                aria-label={`${headphone.brand} ${headphone.name} manufacturer page (opens in new tab)`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
        </div>

        {/* Price — right aligned */}
        <div className="text-right flex-shrink-0">
          <div className="text-base font-bold text-primary tabular-nums">
            {fmt(headphone.price_used_min || 0)}–{fmt(headphone.price_used_max || 0)}
          </div>
          <div className="text-[10px] text-tertiary leading-none mt-0.5">used est.</div>
          <PriceHistoryBadge componentId={headphone.id} />
          <PriceTrendIndicator componentId={headphone.id} />
        </div>
      </div>

      {/* Row 2: Expert grades + rank */}
      {hasGrades && (
        <div className="flex items-center gap-3 mb-2 text-sm">
          {headphone.crin_tone && (
            <span className={`font-semibold tabular-nums ${gradeColor(headphone.crin_tone)}`}>
              {headphone.crin_tone} <span className="font-normal text-tertiary text-xs">tone</span>
            </span>
          )}
          {headphone.crin_tech && (
            <span className={`font-semibold tabular-nums ${gradeColor(headphone.crin_tech)}`}>
              {headphone.crin_tech} <span className="font-normal text-tertiary text-xs">tech</span>
            </span>
          )}
          {headphone.crin_rank && (
            <span className="text-tertiary text-xs">
              #{headphone.crin_rank} ranked
            </span>
          )}
          {headphone.matchScore && (
            <span className="ml-auto text-xs text-tertiary tabular-nums">
              {headphone.matchScore}% match
            </span>
          )}
        </div>
      )}

      {/* Row 3: Attribute pills */}
      <div className="flex flex-wrap items-center gap-1.5 text-xs text-secondary">
        {soundSig && soundSig !== 'neutral' && (
          <span className="px-2 py-0.5 rounded-full border border-subtle bg-secondary capitalize">
            {soundSig}
          </span>
        )}
        {headphone.impedance && (
          <span className="px-2 py-0.5 rounded-full border border-subtle bg-secondary">
            {headphone.impedance}Ω
          </span>
        )}
        {headphone.fit && headphone.category !== 'iems' && (
          <span className="px-2 py-0.5 rounded-full border border-subtle bg-secondary capitalize">
            {headphone.fit}
          </span>
        )}
        {ampDifficulty && ampDifficulty !== 'unknown' && (
          <span className={`px-2 py-0.5 rounded-full border text-xs ${
            ampDifficulty === 'easy' ? 'border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' :
            ampDifficulty === 'moderate' ? 'border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400' :
            'border-red-200 dark:border-red-900 text-red-700 dark:text-red-400'
          }`}>
            {ampDifficulty === 'easy' ? 'easy to drive' :
             ampDifficulty === 'moderate' ? 'moderate power' :
             ampDifficulty === 'demanding' ? 'needs amp' : 'needs powerful amp'}
          </span>
        )}
        {headphone.price_new && (
          <span className="text-tertiary ml-auto">
            MSRP {fmt(headphone.price_new)}
          </span>
        )}
      </div>

      {/* Expert panel — collapsible */}
      <ExpertAnalysisPanel component={headphone} forceExpanded={expandAllExperts} />

      {/* Action row */}
      <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
        {onFindUsed && (headphone.usedListingsCount ?? 0) > 0 && (
          <button
            onClick={() => onFindUsed(headphone.id, `${headphone.brand} ${headphone.name}`)}
            className="text-xs font-medium text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
          >
            {headphone.usedListingsCount} used listing{headphone.usedListingsCount !== 1 ? 's' : ''}
            <svg className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}
        <div className="ml-auto flex items-center gap-1">
          {onViewDetails && (
            <button
              onClick={() => onViewDetails(headphone.id)}
              className="p-1 text-tertiary hover:text-accent transition-colors rounded"
              title="View details"
              aria-label={`View details for ${headphone.brand} ${headphone.name}`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          )}
          <WishlistButton componentId={headphone.id} className="px-2 py-1" showText={false} />
        </div>
      </div>
      {isFirstCardHint && !isSelected && (
        <p className="text-xs text-accent text-center mt-2 animate-fadeIn">Click to add to your system</p>
      )}
    </div>
  )
}

export const HeadphoneCard = memo(HeadphoneCardComponent)
