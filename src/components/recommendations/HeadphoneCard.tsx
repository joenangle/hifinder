'use client'

import { memo } from 'react'
import Image from 'next/image'
import { Headphones, Ear } from 'lucide-react'
import { ExpertAnalysisPanel } from '@/components/recommendations/ExpertAnalysisPanel'
import { WishlistButton } from '@/components/WishlistButton'
import { PriceHistoryBadge } from '@/components/recommendations/PriceHistoryBadge'
import { PriceTrendIndicator } from '@/components/recommendations/PriceTrendIndicator'

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
            ? (isCans ? 'bg-violet-500 text-white' : 'bg-indigo-500 text-white')
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

      {/* Horizontal layout: image left, info right */}
      <div className="flex items-start gap-3 pr-10">
        {/* Product image — natural aspect ratio */}
        <div className="flex-shrink-0 w-20 sm:w-24 rounded-lg bg-secondary flex items-center justify-center overflow-hidden self-start">
          {headphone.image_url ? (
            <Image
              src={headphone.image_url}
              alt={`${headphone.brand} ${headphone.name}`}
              width={96}
              height={96}
              className="w-full h-auto object-contain max-h-28 min-h-12"
            />
          ) : isCans ? (
            <div className="py-4">
              <Headphones className="w-8 h-8 text-tertiary" />
            </div>
          ) : (
            <div className="py-4">
              <Ear className="w-8 h-8 text-tertiary" />
            </div>
          )}
        </div>

        {/* Info column */}
        <div className="flex-1 min-w-0">
          {/* Row 1: Champion badges + name */}
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

          {/* Row 2: Grades + rank + match% */}
          {(hasGrades || headphone.matchScore) && (
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
              {headphone.crin_rank && (
                <span className="text-tertiary text-xs">
                  #{headphone.crin_rank}
                </span>
              )}
              {headphone.matchScore && (
                <span className="ml-auto text-xs text-tertiary tabular-nums">
                  {headphone.matchScore}% match
                </span>
              )}
            </div>
          )}

          {/* Row 3: Price + MSRP */}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-sm font-bold text-primary tabular-nums">
              {fmt(headphone.price_used_min || 0)}–{fmt(headphone.price_used_max || 0)}
            </span>
            <span className="text-[10px] text-tertiary">used est.</span>
            {headphone.price_new && (
              <span className="text-xs text-tertiary">
                MSRP {fmt(headphone.price_new)}
              </span>
            )}
            <PriceHistoryBadge componentId={headphone.id} />
            <PriceTrendIndicator componentId={headphone.id} />
          </div>

          {/* Row 4: Attribute pills */}
          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-secondary">
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
          </div>

          {/* Row 5: Expert quote (always visible, inline) */}
          <ExpertAnalysisPanel component={headphone} inline forceExpanded={expandAllExperts} />

          {/* Row 6: Actions */}
          <div className="mt-1.5 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
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
