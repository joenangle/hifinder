'use client'

import { memo, useState, useEffect } from 'react'
import { ExpertAnalysisPanel, CompactExpertBadge } from '@/components/ExpertAnalysisPanel'

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
  crinacle_sound_signature?: string
  expert_grade_numeric?: number
  value_rating?: number
  fit?: string
  manufacturer_url?: string | null
  usedListingsCount?: number
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
  browseMode?: 'guided' | 'explore' | 'advanced'
}

const formatBudgetUSD = (amount: number) => {
  return `$${Math.round(amount).toLocaleString()}`
}

const HeadphoneCardComponent = ({
  headphone,
  isSelected,
  onToggleSelection,
  isTechnicalChamp,
  isToneChamp,
  isBudgetChamp,
  onFindUsed,
  browseMode
}: HeadphoneCardProps) => {
  return (
    <div
      className={`card-interactive ${isSelected ? 'card-interactive-selected' : ''}`}
      onClick={() => onToggleSelection(headphone.id)}
    >
      {/* Name (Brand + Model) and Price on same line */}
      <div className="flex items-baseline justify-between mb-1">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-lg text-text-primary dark:text-text-primary">
              {headphone.brand} {headphone.name}
            </h3>
            {headphone.manufacturer_url && (
              <a
                href={headphone.manufacturer_url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-text-tertiary hover:text-accent-primary dark:text-text-tertiary dark:hover:text-accent-primary transition-colors flex-shrink-0"
                title="View on manufacturer website"
                aria-label={`View ${headphone.brand} ${headphone.name} on manufacturer website`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            )}
          </div>
          {/* Compact Expert Badge */}
          <CompactExpertBadge component={headphone} />
        </div>
        <div className="text-right ml-4">
          <div className="text-xs text-text-tertiary dark:text-text-tertiary mb-0.5">
            Used Estimate:
          </div>
          <div className="text-lg font-bold text-accent-primary dark:text-accent-primary whitespace-nowrap">
            {formatBudgetUSD(headphone.price_used_min || 0)}-{formatBudgetUSD(headphone.price_used_max || 0)}
          </div>
          <PriceHistoryBadge componentId={headphone.id} />
        </div>
      </div>

      {/* Match Score */}
      {headphone.matchScore && (
        <div className="mb-2">
          <span
            className="text-base font-bold text-orange-400 dark:text-orange-400/90 cursor-help"
            title={`Match Score: ${headphone.matchScore}%\n\n${
              headphone.matchScore >= 85 ? '⭐⭐⭐⭐⭐ Excellent Match - Perfect for your preferences and budget' :
              headphone.matchScore >= 75 ? '⭐⭐⭐⭐ Great Match - Strong fit for your needs' :
              headphone.matchScore >= 65 ? '⭐⭐⭐ Good Match - Solid option worth considering' :
              headphone.matchScore >= 55 ? '⭐⭐ Fair Match - May work but consider alternatives' :
              '⭐ Weak Match - Better options available'
            }\n\nBased on: Price fit (45%) + Sound signature (45%) + Quality bonuses (10%)`}
          >
            Match: {headphone.matchScore}% {
              headphone.matchScore >= 85 ? '⭐⭐⭐⭐⭐' :
              headphone.matchScore >= 75 ? '⭐⭐⭐⭐' :
              headphone.matchScore >= 65 ? '⭐⭐⭐' :
              headphone.matchScore >= 55 ? '⭐⭐' :
              '⭐'
            }
          </span>
        </div>
      )}

      {/* MSRP and Champion Badges */}
      <div className="flex items-center justify-between mb-2">
        {headphone.price_new && (
          <div className="text-xs text-text-tertiary dark:text-text-tertiary">
            MSRP: {formatBudgetUSD(headphone.price_new)}
          </div>
        )}
        {(isTechnicalChamp || isToneChamp || isBudgetChamp) && (
          <div className="flex flex-wrap gap-1 justify-end">
            {isTechnicalChamp && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-300 dark:bg-orange-400/60 text-orange-900 dark:text-orange-100 text-xs font-semibold rounded-full">
                🏆 Top Tech
              </span>
            )}
            {isToneChamp && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-300 dark:bg-amber-400/60 text-amber-900 dark:text-amber-100 text-xs font-semibold rounded-full">
                👂 Best Match
              </span>
            )}
            {isBudgetChamp && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-200 dark:bg-orange-400/50 text-orange-900 dark:text-orange-100 text-xs font-semibold rounded-full">
                💰 Value
              </span>
            )}
          </div>
        )}
      </div>

      {/* Compact metadata row */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-text-secondary dark:text-text-secondary mb-2">
        {headphone.amplificationAssessment && headphone.amplificationAssessment.difficulty !== 'unknown' && (
          <span className="inline-flex items-center gap-1">
            ⚡ {headphone.amplificationAssessment.difficulty === 'easy' ? 'Easy to Drive' :
               headphone.amplificationAssessment.difficulty === 'moderate' ? 'Moderate Power' :
               headphone.amplificationAssessment.difficulty === 'demanding' ? 'Needs Good Amp' :
               'Needs Powerful Amp'}
          </span>
        )}
        {(headphone.crinacle_sound_signature || (headphone.sound_signature && headphone.sound_signature !== 'neutral')) && (
          <>
            <span>|</span>
            <span>Sound: {headphone.crinacle_sound_signature || headphone.sound_signature}</span>
          </>
        )}
        {headphone.impedance && (
          <>
            <span>|</span>
            <span>{headphone.impedance}Ω</span>
          </>
        )}
        {headphone.fit && headphone.category !== 'iems' && (
          <>
            <span>|</span>
            <span>{headphone.fit}</span>
          </>
        )}
      </div>

      <ExpertAnalysisPanel component={headphone} browseMode={browseMode} />

      {/* Find Used Button - Only show if listings exist */}
      {onFindUsed && (headphone.usedListingsCount ?? 0) > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation() // Prevent card selection toggle
            onFindUsed(headphone.id, `${headphone.brand} ${headphone.name}`)
          }}
          className="mt-3 w-full px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-2"
        >
          <span>🔍</span>
          <span>
            View {headphone.usedListingsCount} Used Listing{headphone.usedListingsCount !== 1 ? 's' : ''}
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

export const HeadphoneCard = memo(HeadphoneCardComponent)
