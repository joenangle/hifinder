'use client'

import { memo } from 'react'
import Image from 'next/image'
import { Headphones, Ear } from 'lucide-react'
import { ExpertAnalysisPanel } from '@/components/recommendations/ExpertAnalysisPanel'
import { WishlistButton } from '@/components/WishlistButton'
import { PriceAlertButton } from '@/components/PriceAlertButton'
import { deriveReasonChips, REASON_CHIP_CLASSES } from '@/lib/recommendation-reasons'

interface AudioComponent {
  id: string
  brand: string
  name: string
  category: string
  image_url?: string | null
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
  crin_value?: number | null
  asr_sinad?: number | null
  valueScore?: number
  signatureScoreDisplay?: number
  proximityScoreDisplay?: number
  liquidityBonusDisplay?: number
  expertScoreDisplay?: number
  avgPrice?: number
  hasThinExpertData?: boolean
  priceTrendDirection?: string | null
  priceTrendConfidence?: string | null
  priceTrendPercentage?: number | null
  why_recommended?: string | null
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
  onViewDetails,
  expandAllExperts = false,
  isFirstCardHint = false
}: HeadphoneCardProps) => {
  const hasGrades = headphone.crin_tone || headphone.crin_tech || headphone.crin_rank
  const soundSig = headphone.crinacle_sound_signature || headphone.sound_signature
  const ampDifficulty = headphone.amplificationAssessment?.difficulty
  const isCans = headphone.category !== 'iems'
  const reasonChips = deriveReasonChips(headphone)

  const selectedStyle = 'border-accent bg-accent/5 dark:bg-accent/10 shadow-[0_0_0_3px_rgba(204,78,37,0.12),0_2px_8px_rgba(204,78,37,0.10)]'
  const hoverStyle = 'hover:border-accent/20 hover:shadow-sm'

  return (
    <div
      role="article"
      aria-label={`${headphone.brand} ${headphone.name}`}
      tabIndex={0}
      title="View details"
      className={`card-interactive group relative rounded-xl border cursor-pointer px-3 py-2.5 ${
        isSelected
          ? selectedStyle
          : `bg-surface-card ${hoverStyle}`
      }`}
      onClick={() => onViewDetails?.(headphone.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onViewDetails?.(headphone.id) } }}
    >
      {/* Selection button — top right */}
      <button
        type="button"
        aria-label={isSelected ? `Remove ${headphone.brand} ${headphone.name} from stack` : `Add ${headphone.brand} ${headphone.name} to stack`}
        className={`absolute top-2.5 right-3 z-10 w-8 h-8 rounded-full flex items-center justify-center transition-[color,background-color,opacity] duration-200 ${
          isSelected
            ? 'bg-accent text-white hover:bg-accent-hover'
            : isFirstCardHint
            ? 'border-2 border-accent text-accent opacity-100 animate-hint-pulse'
            : 'bg-transparent text-tertiary opacity-60 hover:opacity-100 border-2'
        }`}
        onClick={(e) => { e.stopPropagation(); onToggleSelection(headphone.id) }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onToggleSelection(headphone.id) } }}
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
        <div className={`flex-shrink-0 rounded-xl bg-secondary flex items-center justify-center overflow-hidden ${
          headphone.image_url ? 'w-1/4 sm:w-1/3' : 'w-8'
        }`}>
          {headphone.image_url ? (
            <Image
              src={headphone.image_url}
              alt={`${headphone.brand} ${headphone.name}`}
              width={160}
              height={160}
              className="w-full h-full object-contain p-1 rounded-md"
            />
          ) : isCans ? (
            <Headphones className="w-5 h-5 text-tertiary" />
          ) : (
            <Ear className="w-5 h-5 text-tertiary" />
          )}
        </div>

        {/* Info column */}
        <div className="flex-1 min-w-0">
          {/* Row 1: Badges + name + match% */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {isTechnicalChamp && (
              <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-amber-500 text-white dark:bg-amber-600">
                Top Tech
              </span>
            )}
            {isToneChamp && (
              <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-sky-500 text-white dark:bg-sky-600">
                Best Match
              </span>
            )}
            {isBudgetChamp && !isTechnicalChamp && (
              <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-emerald-500 text-white dark:bg-emerald-600">
                Best Value
              </span>
            )}
            <h3 className="font-semibold text-base text-primary leading-snug truncate">
              <span className="font-normal text-secondary">{headphone.brand} </span>
              {headphone.name}
            </h3>
            {headphone.matchScore && (
              <span className="ml-auto flex-shrink-0 text-sm font-semibold text-accent tabular-nums">
                {headphone.matchScore}%
              </span>
            )}
          </div>

          {/* Row 2: Grades */}
          {hasGrades && (
            <div className="flex items-center gap-2 mt-0.5 text-sm">
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

          {/* Row 3: Price */}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm font-bold text-primary tabular-nums">
              {fmt(headphone.price_used_min || 0)}–{fmt(headphone.price_used_max || 0)}
            </span>
            {headphone.price_new && (
              <span className="text-xs text-tertiary">
                MSRP {fmt(headphone.price_new)}
              </span>
            )}
          </div>

          {/* Row 4: Key attributes */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-secondary">
            {soundSig && soundSig !== 'neutral' && (
              <span className="px-2 py-0.5 rounded-full border border-subtle bg-secondary capitalize">
                {soundSig}
              </span>
            )}
            {headphone.fit && headphone.category !== 'iems' && (
              <span className="px-2 py-0.5 rounded-full border border-subtle bg-secondary capitalize">
                {headphone.fit}
              </span>
            )}
            {ampDifficulty && ampDifficulty !== 'unknown' && ampDifficulty !== 'easy' && (
              <span className={`px-2 py-0.5 rounded-full border text-xs ${
                ampDifficulty === 'moderate' ? 'border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400' :
                'border-red-200 dark:border-red-900 text-red-700 dark:text-red-400'
              }`}>
                {ampDifficulty === 'moderate' ? 'moderate power' :
                 ampDifficulty === 'demanding' ? 'needs amp' : 'needs powerful amp'}
              </span>
            )}
          </div>

          {/* Row 5: Why recommended (Crinacle-sourced editorial reason) */}
          {headphone.why_recommended && (
            <p className="mt-1 text-xs text-tertiary leading-snug line-clamp-2">
              {headphone.why_recommended}
            </p>
          )}

          {/* Row 6: Expert quote (always visible, inline) */}
          <ExpertAnalysisPanel component={headphone} inline forceExpanded={expandAllExperts} />

          {/* Row 6: Actions */}
          <div className="mt-1.5 flex items-center gap-2">
            {(headphone.usedListingsCount ?? 0) > 0 && (
              <a
                href={`/marketplace?component_id=${headphone.id}&name=${encodeURIComponent(`${headphone.brand} ${headphone.name}`)}`}
                onClick={(e) => e.stopPropagation()}
                className="text-xs font-medium text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
              >
                {headphone.usedListingsCount} used listing{headphone.usedListingsCount !== 1 ? 's' : ''}
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </a>
            )}
            <div className="ml-auto flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <PriceAlertButton
                componentId={headphone.id}
                avgPrice={
                  headphone.price_used_min != null && headphone.price_used_max != null
                    ? (headphone.price_used_min + headphone.price_used_max) / 2
                    : headphone.price_new ?? headphone.price_used_min ?? headphone.price_used_max ?? 0
                }
                priceFloor={headphone.price_used_min}
              />
              <WishlistButton componentId={headphone.id} className="px-2 py-1" showText={false} />
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

export const HeadphoneCard = memo(HeadphoneCardComponent)
