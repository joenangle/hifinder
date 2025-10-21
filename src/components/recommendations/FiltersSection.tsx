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

          <button
            className={`toggle-compact ${typeFilters.includes('iems') ? 'active-indigo' : ''}`}
            onClick={() => onTypeFilterChange('iems')}
          >
            <span>🎵</span>
            <span>IEMs</span>
          </button>

          <button
            className={`toggle-compact ${wantRecommendationsFor.dac ? 'active-green' : ''}`}
            onClick={() => onEquipmentToggle('dac')}
          >
            <span>🔄</span>
            <span>DACs</span>
          </button>

          <button
            className={`toggle-compact ${wantRecommendationsFor.amp ? 'active-amber' : ''}`}
            onClick={() => onEquipmentToggle('amp')}
          >
            <span>⚡</span>
            <span>Amps</span>
          </button>

          <button
            className={`toggle-compact ${wantRecommendationsFor.combo ? 'active-blue' : ''}`}
            onClick={() => onEquipmentToggle('combo')}
          >
            <span>🔗</span>
            <span>Combos</span>
          </button>
        </div>
      </div>

      {/* Sound Signature Row */}
      <div className="filter-row">
        <span className="filter-label-compact">Sound</span>
        <div className="filter-buttons-compact">
          <button
            className={`toggle-compact ${soundFilters.includes('neutral') ? 'active-neutral' : ''}`}
            onClick={() => onSoundFilterChange('neutral')}
          >
            <span>⚖️</span>
            <span>Neutral</span>
          </button>

          <button
            className={`toggle-compact ${soundFilters.includes('warm') ? 'active-warm' : ''}`}
            onClick={() => onSoundFilterChange('warm')}
          >
            <span>🔥</span>
            <span>Warm</span>
          </button>

          <button
            className={`toggle-compact ${soundFilters.includes('bright') ? 'active-bright' : ''}`}
            onClick={() => onSoundFilterChange('bright')}
          >
            <span>✨</span>
            <span>Bright</span>
          </button>

          <button
            className={`toggle-compact ${soundFilters.includes('fun') ? 'active-fun' : ''}`}
            onClick={() => onSoundFilterChange('fun')}
          >
            <span>🎉</span>
            <span>V-Shaped</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export const FiltersSection = memo(FiltersSectionComponent)
