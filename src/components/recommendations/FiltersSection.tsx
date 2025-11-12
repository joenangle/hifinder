'use client'

import { memo } from 'react'
import { Tooltip } from '@/components/Tooltip'
import { FilterButton } from '@/components/FilterButton'
import { FILTER_TOOLTIPS } from '@/lib/tooltips'

interface FilterCounts {
  sound: Record<string, number>
  equipment: {
    cans: number
    iems: number
    dacs: number
    amps: number
    combos: number
  }
}

interface FiltersSectionProps {
  typeFilters: string[]
  soundFilters: string[]
  wantRecommendationsFor: {
    headphones: boolean
    dac: boolean
    amp: boolean
    combo: boolean
  }
  guidedModeEnabled: boolean
  filterCounts?: FilterCounts
  resultCounts?: {
    cans: number
    iems: number
    dacs: number
    amps: number
    combos: number
  }
  onTypeFilterChange: (filter: 'cans' | 'iems') => void
  onEquipmentToggle: (type: 'dac' | 'amp' | 'combo') => void
  onSoundFilterChange: (filter: 'neutral' | 'warm' | 'bright' | 'fun') => void
}

const FiltersSectionComponent = ({
  typeFilters,
  soundFilters,
  wantRecommendationsFor,
  guidedModeEnabled,
  filterCounts,
  resultCounts,
  onTypeFilterChange,
  onEquipmentToggle,
  onSoundFilterChange
}: FiltersSectionProps) => {
  // Always show all filters (simplified experience)
  const showEquipmentFilters = true
  const showSoundFilters = true

  // Calculate total results
  const totalResults = (resultCounts?.cans || 0) +
                       (resultCounts?.iems || 0) +
                       (resultCounts?.dacs || 0) +
                       (resultCounts?.amps || 0) +
                       (resultCounts?.combos || 0)

  // Standard labels for all modes
  const getSoundLabel = (signature: string) => {
    const standardLabels = {
      neutral: 'Neutral',
      warm: 'Warm',
      bright: 'Bright',
      fun: 'V-Shaped'
    }
    return standardLabels[signature as keyof typeof standardLabels] || signature
  }

  // Build results breakdown text
  const getResultsBreakdown = () => {
    const parts: string[] = []
    if (resultCounts?.cans) parts.push(`${resultCounts.cans} headphones`)
    if (resultCounts?.iems) parts.push(`${resultCounts.iems} IEMs`)
    if (resultCounts?.dacs) parts.push(`${resultCounts.dacs} DACs`)
    if (resultCounts?.amps) parts.push(`${resultCounts.amps} amps`)
    if (resultCounts?.combos) parts.push(`${resultCounts.combos} combos`)
    return parts.join(', ')
  }

  return (
    <div className="filter-card-compact">
      <div className="flex items-center justify-between mb-4">
        <Tooltip
          content={guidedModeEnabled ? FILTER_TOOLTIPS.general.refineSearch : ''}
          position="bottom"
        >
          <h3 className="filter-title-compact mb-0">Refine Your Search</h3>
        </Tooltip>

        {/* Results Summary - Top Right */}
        {totalResults > 0 && (
          <div className="text-sm text-text-secondary">
            <span className="font-semibold text-text-primary">{totalResults} results</span>
            {getResultsBreakdown() && (
              <span className="text-text-tertiary"> ({getResultsBreakdown()})</span>
            )}
          </div>
        )}
      </div>

      {/* Equipment Type Row - Hidden in guided mode */}
      {showEquipmentFilters && (
        <div className="filter-row">
          <span className="filter-label-compact">Equipment</span>
          <div className="filter-buttons-compact">
          <FilterButton
            active={typeFilters.includes('cans')}
            onClick={() => onTypeFilterChange('cans')}
            icon="🎧"
            label="Headphones"
            count={filterCounts?.equipment.cans}
            activeClass="active-purple"
            tooltip={FILTER_TOOLTIPS.equipment.headphones}
            showTooltip={guidedModeEnabled}
          />

          <FilterButton
            active={typeFilters.includes('iems')}
            onClick={() => onTypeFilterChange('iems')}
            icon="👂"
            label="IEMs"
            count={filterCounts?.equipment.iems}
            activeClass="active-indigo"
            tooltip={FILTER_TOOLTIPS.equipment.iems}
            showTooltip={guidedModeEnabled}
          />

          <FilterButton
            active={wantRecommendationsFor.dac}
            onClick={() => onEquipmentToggle('dac')}
            icon="🔄"
            label="DACs"
            count={filterCounts?.equipment.dacs}
            activeClass="active-green"
            tooltip={FILTER_TOOLTIPS.equipment.dacs}
            showTooltip={guidedModeEnabled}
          />

          <FilterButton
            active={wantRecommendationsFor.amp}
            onClick={() => onEquipmentToggle('amp')}
            icon="⚡"
            label="Amps"
            count={filterCounts?.equipment.amps}
            activeClass="active-amber"
            tooltip={FILTER_TOOLTIPS.equipment.amps}
            showTooltip={guidedModeEnabled}
          />

          <FilterButton
            active={wantRecommendationsFor.combo}
            onClick={() => onEquipmentToggle('combo')}
            icon="🔗"
            label="Combos"
            count={filterCounts?.equipment.combos}
            activeClass="active-blue"
            tooltip={FILTER_TOOLTIPS.equipment.combos}
            showTooltip={guidedModeEnabled}
          />
        </div>
      </div>
      )}

      {/* Sound Signature Row */}
      {showSoundFilters && (
        <div className="filter-row">
          <span className="filter-label-compact">Sound Preference</span>
          <div className="filter-buttons-compact">
            <FilterButton
              active={soundFilters.includes('neutral')}
              onClick={() => onSoundFilterChange('neutral')}
              icon="⚖️"
              label={getSoundLabel('neutral')}
              count={filterCounts?.sound.neutral}
              activeClass="active-neutral"
              tooltip={FILTER_TOOLTIPS.sound.neutral}
              showTooltip={guidedModeEnabled}
            />

            <FilterButton
              active={soundFilters.includes('warm')}
              onClick={() => onSoundFilterChange('warm')}
              icon="🔥"
              label={getSoundLabel('warm')}
              count={filterCounts?.sound.warm}
              activeClass="active-warm"
              tooltip={FILTER_TOOLTIPS.sound.warm}
              showTooltip={guidedModeEnabled}
            />

            <FilterButton
              active={soundFilters.includes('bright')}
              onClick={() => onSoundFilterChange('bright')}
              icon="✨"
              label={getSoundLabel('bright')}
              count={filterCounts?.sound.bright}
              activeClass="active-bright"
              tooltip={FILTER_TOOLTIPS.sound.bright}
              showTooltip={guidedModeEnabled}
            />

            <FilterButton
              active={soundFilters.includes('fun')}
              onClick={() => onSoundFilterChange('fun')}
              icon="🎉"
              label={getSoundLabel('fun')}
              count={filterCounts?.sound.fun}
              activeClass="active-fun"
              tooltip={FILTER_TOOLTIPS.sound.fun}
              showTooltip={guidedModeEnabled}
            />
          </div>
        </div>
      )}
    </div>
  )
}

export const FiltersSection = memo(FiltersSectionComponent)
