'use client'

import { memo, useState, useEffect } from 'react'
import { ExpertAnalysisPanel, CompactExpertBadge } from '@/components/ExpertAnalysisPanel'
import { Tooltip } from '@/components/Tooltip'
import { WishlistButton } from '@/components/WishlistButton'

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
  crin_tone?: string
  crin_tech?: string
  crin_rank?: number
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
  expandAllExperts?: boolean
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
  expandAllExperts = false
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

      {/* Expert Grades - Prominent Display */}
      {(headphone.crin_tone || headphone.crin_tech || headphone.crin_rank) && (
        <div className="flex items-center gap-2 mb-2 text-sm">
          {headphone.crin_tone && (
            <span className={`font-semibold ${
              headphone.crin_tone.charAt(0) === 'S' ? 'text-yellow-600 dark:text-yellow-400' :
              headphone.crin_tone.charAt(0) === 'A' ? 'text-green-600 dark:text-green-400' :
              headphone.crin_tone.charAt(0) === 'B' ? 'text-blue-600 dark:text-blue-400' :
              headphone.crin_tone.charAt(0) === 'C' ? 'text-orange-600 dark:text-orange-400' :
              'text-red-600 dark:text-red-400'
            }`}>
              {headphone.crin_tone} Tone
            </span>
          )}
          {headphone.crin_tech && (
            <>
              {headphone.crin_tone && <span className="text-text-tertiary dark:text-text-tertiary">|</span>}
              <span className={`font-semibold ${
                headphone.crin_tech.charAt(0) === 'S' ? 'text-yellow-600 dark:text-yellow-400' :
                headphone.crin_tech.charAt(0) === 'A' ? 'text-green-600 dark:text-green-400' :
                headphone.crin_tech.charAt(0) === 'B' ? 'text-blue-600 dark:text-blue-400' :
                headphone.crin_tech.charAt(0) === 'C' ? 'text-orange-600 dark:text-orange-400' :
                'text-red-600 dark:text-red-400'
              }`}>
                {headphone.crin_tech} Tech
              </span>
            </>
          )}
          {headphone.crin_rank && (
            <>
              {(headphone.crin_tone || headphone.crin_tech) && <span className="text-text-tertiary dark:text-text-tertiary">|</span>}
              <span className="font-semibold text-accent-primary dark:text-accent-primary">
                Rank #{headphone.crin_rank}
              </span>
            </>
          )}
        </div>
      )}

      {/* Match Score - Option B: Breakdown Badges */}
      {headphone.matchScore && (
        <div className="mb-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-lg font-bold text-foreground dark:text-foreground">
              {headphone.matchScore}% Match
            </span>
            <div className="flex items-center gap-1">
              <Tooltip content="Price fits your budget range">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-600 dark:bg-green-900/30 text-white dark:text-green-300 text-xs font-medium rounded-full">
                  💰 Price Fit
                </span>
              </Tooltip>
              <Tooltip content="Matches your sound preference">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-600 dark:bg-blue-900/30 text-white dark:text-blue-300 text-xs font-medium rounded-full">
                  🎵 Sound Match
                </span>
              </Tooltip>
              <Tooltip content="Expert ratings and quality bonuses">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-purple-600 dark:bg-purple-900/30 text-white dark:text-purple-300 text-xs font-medium rounded-full">
                  ⭐ Quality
                </span>
              </Tooltip>
            </div>
          </div>
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
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-600 dark:bg-orange-400/60 text-white dark:text-orange-100 text-xs font-semibold rounded-full">
                🏆 Top Tech
              </span>
            )}
            {isToneChamp && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-600 dark:bg-amber-400/60 text-white dark:text-amber-100 text-xs font-semibold rounded-full">
                👂 Best Match
              </span>
            )}
            {isBudgetChamp && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-600 dark:bg-orange-400/50 text-white dark:text-orange-100 text-xs font-semibold rounded-full">
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

      <ExpertAnalysisPanel component={headphone} forceExpanded={expandAllExperts} />

      {/* Action Buttons */}
      <div className="mt-3 flex gap-2">
        {/* Find Used Button - Only show if listings exist */}
        {onFindUsed && (headphone.usedListingsCount ?? 0) > 0 && (
          <button
            onClick={(e) => {
              e.stopPropagation() // Prevent card selection toggle
              onFindUsed(headphone.id, `${headphone.brand} ${headphone.name}`)
            }}
            className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border border-blue-300 dark:border-blue-500 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors flex items-center justify-center gap-2"
          >
            <span>🔍</span>
            <span>
              View {headphone.usedListingsCount} Used Listing{headphone.usedListingsCount !== 1 ? 's' : ''}
            </span>
          </button>
        )}

        {/* Wishlist Button */}
        <div onClick={(e) => e.stopPropagation()}>
          <WishlistButton
            componentId={headphone.id}
            className="px-3 py-2"
            showText
          />
        </div>
      </div>
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
