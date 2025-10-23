'use client'

import { memo } from 'react'
import { Tooltip } from '@/components/Tooltip'
import { FilterButton } from '@/components/FilterButton'
import { FILTER_TOOLTIPS } from '@/lib/tooltips'
import type { BrowseMode } from './BrowseModeSelector'

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
  browseMode: BrowseMode
  filterCounts?: FilterCounts
  onTypeFilterChange: (filter: 'cans' | 'iems') => void
  onEquipmentToggle: (type: 'dac' | 'amp' | 'combo') => void
  onSoundFilterChange: (filter: 'neutral' | 'warm' | 'bright' | 'fun') => void
}

const FiltersSectionComponent = ({
  typeFilters,
  soundFilters,
  wantRecommendationsFor,
  guidedModeEnabled,
  browseMode,
  filterCounts,
  onTypeFilterChange,
  onEquipmentToggle,
  onSoundFilterChange
}: FiltersSectionProps) => {
  // Progressive disclosure: hide filters in guided mode
  const showEquipmentFilters = browseMode !== 'guided'
  const showSoundFilters = true // Always show sound filters (but with simplified labels in guided mode)

  // Simplified labels for guided mode
  const getSoundLabel = (signature: string) => {
    if (browseMode === 'guided') {
      const simplifiedLabels = {
        neutral: 'Balanced',
        warm: 'Bass-focused',
        bright: 'Treble-focused',
        fun: 'Exciting'
      }
      return simplifiedLabels[signature as keyof typeof simplifiedLabels] || signature
    }
    // Standard labels for explore/advanced modes
    const standardLabels = {
      neutral: 'Neutral',
      warm: 'Warm',
      bright: 'Bright',
      fun: 'V-Shaped'
    }
    return standardLabels[signature as keyof typeof standardLabels] || signature
  }

  return (
    <div className="filter-card-compact">
      <Tooltip
        content={guidedModeEnabled ? FILTER_TOOLTIPS.general.refineSearch : ''}
        position="bottom"
      >
        <h3 className="filter-title-compact">Refine Your Search</h3>
      </Tooltip>

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
            icon="🎵"
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
