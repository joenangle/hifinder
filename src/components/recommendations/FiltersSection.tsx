'use client'

import { memo } from 'react'
import { Tooltip } from '@/components/Tooltip'
import { FilterButton } from '@/components/FilterButton'
import { FILTER_TOOLTIPS } from '@/lib/tooltips'

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
  onTypeFilterChange: (filter: 'cans' | 'iems') => void
  onEquipmentToggle: (type: 'dac' | 'amp' | 'combo') => void
  onSoundFilterChange: (filter: 'neutral' | 'warm' | 'bright' | 'fun') => void
}

const FiltersSectionComponent = ({
  typeFilters,
  soundFilters,
  wantRecommendationsFor,
  guidedModeEnabled,
  onTypeFilterChange,
  onEquipmentToggle,
  onSoundFilterChange
}: FiltersSectionProps) => {
  return (
    <div className="filter-card-compact">
      <Tooltip
        content={guidedModeEnabled ? FILTER_TOOLTIPS.general.refineSearch : ''}
        position="bottom"
      >
        <h3 className="filter-title-compact">Refine Your Search</h3>
      </Tooltip>

      {/* Equipment Type Row */}
      <div className="filter-row">
        <span className="filter-label-compact">Equipment</span>
        <div className="filter-buttons-compact">
          <FilterButton
            active={typeFilters.includes('cans')}
            onClick={() => onTypeFilterChange('cans')}
            icon="🎧"
            label="Headphones"
            activeClass="active-purple"
            tooltip={FILTER_TOOLTIPS.equipment.headphones}
            showTooltip={guidedModeEnabled}
          />

          <FilterButton
            active={typeFilters.includes('iems')}
            onClick={() => onTypeFilterChange('iems')}
            icon="🎵"
            label="IEMs"
            activeClass="active-indigo"
            tooltip={FILTER_TOOLTIPS.equipment.iems}
            showTooltip={guidedModeEnabled}
          />

          <FilterButton
            active={wantRecommendationsFor.dac}
            onClick={() => onEquipmentToggle('dac')}
            icon="🔄"
            label="DACs"
            activeClass="active-green"
            tooltip={FILTER_TOOLTIPS.equipment.dacs}
            showTooltip={guidedModeEnabled}
          />

          <FilterButton
            active={wantRecommendationsFor.amp}
            onClick={() => onEquipmentToggle('amp')}
            icon="⚡"
            label="Amps"
            activeClass="active-amber"
            tooltip={FILTER_TOOLTIPS.equipment.amps}
            showTooltip={guidedModeEnabled}
          />

          <FilterButton
            active={wantRecommendationsFor.combo}
            onClick={() => onEquipmentToggle('combo')}
            icon="🔗"
            label="Combos"
            activeClass="active-blue"
            tooltip={FILTER_TOOLTIPS.equipment.combos}
            showTooltip={guidedModeEnabled}
          />
        </div>
      </div>

      {/* Sound Signature Row */}
      <div className="filter-row">
        <span className="filter-label-compact">Sound</span>
        <div className="filter-buttons-compact">
          <FilterButton
            active={soundFilters.includes('neutral')}
            onClick={() => onSoundFilterChange('neutral')}
            icon="⚖️"
            label="Neutral"
            activeClass="active-neutral"
            tooltip={FILTER_TOOLTIPS.sound.neutral}
            showTooltip={guidedModeEnabled}
          />

          <FilterButton
            active={soundFilters.includes('warm')}
            onClick={() => onSoundFilterChange('warm')}
            icon="🔥"
            label="Warm"
            activeClass="active-warm"
            tooltip={FILTER_TOOLTIPS.sound.warm}
            showTooltip={guidedModeEnabled}
          />

          <FilterButton
            active={soundFilters.includes('bright')}
            onClick={() => onSoundFilterChange('bright')}
            icon="✨"
            label="Bright"
            activeClass="active-bright"
            tooltip={FILTER_TOOLTIPS.sound.bright}
            showTooltip={guidedModeEnabled}
          />

          <FilterButton
            active={soundFilters.includes('fun')}
            onClick={() => onSoundFilterChange('fun')}
            icon="🎉"
            label="V-Shaped"
            activeClass="active-fun"
            tooltip={FILTER_TOOLTIPS.sound.fun}
            showTooltip={guidedModeEnabled}
          />
        </div>
      </div>
    </div>
  )
}

export const FiltersSection = memo(FiltersSectionComponent)
