'use client'

import { memo } from 'react'
import { ExpertAnalysisPanel } from '@/components/ExpertAnalysisPanel'

interface AudioComponent {
  id: string
  brand: string
  name: string
  category: string
  price_new?: number
  price_used_min?: number
  price_used_max?: number
  impedance?: number
  matchScore?: number
  sound_signature?: string
  crinacle_sound_signature?: string
  expert_grade_numeric?: number
  value_rating?: number
  fit?: string
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
  isBudgetChamp
}: HeadphoneCardProps) => {
  return (
    <div
      className={`card-interactive ${isSelected ? 'selected' : ''}`}
      onClick={() => onToggleSelection(headphone.id)}
    >
      {/* Header: Category and Match Score */}
      <div className="flex items-center justify-between mb-2">
        <span className={`text-xs font-semibold px-2 py-1 rounded ${
          headphone.category === 'iems'
            ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200'
            : 'bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200'
        }`}>
          {headphone.category === 'iems' ? '🎵 IEM' : '🎧 Headphones'}
        </span>
        {headphone.matchScore && (
          <span
            className="text-base font-bold text-orange-600 dark:text-orange-400 cursor-help"
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
        )}
      </div>

      {/* Champion Badges */}
      {(isTechnicalChamp || isToneChamp || isBudgetChamp) && (
        <div className="flex flex-wrap gap-1 mb-3">
          {isTechnicalChamp && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-600 dark:bg-orange-500 text-white text-xs font-semibold rounded-full">
              🏆 Top Tech
            </span>
          )}
          {isToneChamp && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-600 dark:bg-amber-500 text-white text-xs font-semibold rounded-full">
              🎵 Best Match
            </span>
          )}
          {isBudgetChamp && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500 dark:bg-orange-400 text-white text-xs font-semibold rounded-full">
              💰 Value
            </span>
          )}
        </div>
      )}

      {/* Name (Brand + Model) and Price on same line */}
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="font-semibold text-lg text-text-primary dark:text-text-primary">
          {headphone.brand} {headphone.name}
        </h3>
        <div className="text-right ml-4">
          <div className="text-lg font-bold text-accent-primary dark:text-accent-primary whitespace-nowrap">
            {formatBudgetUSD(headphone.price_used_min || 0)}-{formatBudgetUSD(headphone.price_used_max || 0)}
          </div>
        </div>
      </div>

      {/* MSRP */}
      {headphone.price_new && (
        <div className="text-xs text-text-tertiary dark:text-text-tertiary mb-2">
          MSRP: {formatBudgetUSD(headphone.price_new)}
        </div>
      )}

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
        {headphone.fit && (
          <>
            <span>|</span>
            <span>{headphone.fit}</span>
          </>
        )}
      </div>

      <ExpertAnalysisPanel component={headphone} />
    </div>
  )
}

export const HeadphoneCard = memo(HeadphoneCardComponent)
