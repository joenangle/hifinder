'use client'

import { memo } from 'react'
import { Tooltip } from '@/components/Tooltip'
import { FILTER_TOOLTIPS } from '@/lib/tooltips'
import { BudgetAllocationControls, BudgetAllocation } from '@/components/BudgetAllocationControls'

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
  expandAllExperts?: boolean
  onToggleExpandExperts?: () => void
  onToggleGuidedMode?: () => void
  isMultiSelectMode?: boolean
  onToggleMultiSelect?: () => void
  totalBudget?: number
  budgetAllocation?: BudgetAllocation | null
  autoBudgetAllocation?: BudgetAllocation | null
  onBudgetAllocationChange?: (allocation: BudgetAllocation) => void
  budgetRangeMin?: number
  budgetRangeMax?: number
}

const Pill = ({
  active,
  onClick,
  label,
  count,
  tooltip,
  showTooltip,
  activeClass,
}: {
  active: boolean
  onClick: () => void
  label: string
  count?: number
  tooltip?: string
  showTooltip?: boolean
  activeClass?: string
}) => {
  const base =
    'inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-full text-xs border transition-all duration-150 cursor-pointer select-none'
  const inactive = 'font-medium text-secondary bg-primary hover:border-subtle hover:text-primary'

  const btn = (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`${base} ${active ? `font-semibold ${activeClass || 'border-accent text-accent bg-primary'}` : inactive}`}
    >
      {label}
      {count !== undefined && (
        <span className={`text-[10px] tabular-nums ${active ? 'opacity-80' : 'text-tertiary'}`}>
          {count}
        </span>
      )}
    </button>
  )

  if (showTooltip && tooltip) {
    return <Tooltip content={tooltip} position="top">{btn}</Tooltip>
  }
  return btn
}

const SOUND_ACTIVE: Record<string, string> = {
  neutral: 'border-slate-400 text-slate-700 bg-primary dark:text-slate-300 dark:border-slate-500',
  warm: 'border-amber-400 text-amber-700 bg-primary dark:text-amber-300 dark:border-amber-500',
  bright: 'border-sky-400 text-sky-700 bg-primary dark:text-sky-300 dark:border-sky-500',
  fun: 'border-pink-400 text-pink-700 bg-primary dark:text-pink-300 dark:border-pink-500',
}

const EQUIP_ACTIVE: Record<string, string> = {
  cans: 'border-violet-400 text-violet-700 bg-primary dark:text-violet-300 dark:border-violet-500',
  iems: 'border-indigo-400 text-indigo-700 bg-primary dark:text-indigo-300 dark:border-indigo-500',
  dac: 'border-teal-400 text-teal-700 bg-primary dark:text-teal-300 dark:border-teal-500',
  amp: 'border-amber-500 text-amber-700 bg-primary dark:text-amber-300 dark:border-amber-500',
  combo: 'border-blue-400 text-blue-700 bg-primary dark:text-blue-300 dark:border-blue-500',
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
  onSoundFilterChange,
  expandAllExperts,
  onToggleExpandExperts,
  onToggleGuidedMode,
  isMultiSelectMode = false,
  onToggleMultiSelect,
  totalBudget,
  budgetAllocation,
  autoBudgetAllocation,
  onBudgetAllocationChange,
  budgetRangeMin = 20,
  budgetRangeMax = 10
}: FiltersSectionProps) => {
  const totalResults =
    (resultCounts?.cans || 0) +
    (resultCounts?.iems || 0) +
    (resultCounts?.dacs || 0) +
    (resultCounts?.amps || 0) +
    (resultCounts?.combos || 0)

  return (
    <div className="mb-4 px-4 py-3 rounded-xl border bg-secondary">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">

        {/* Equipment group */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-tertiary uppercase tracking-wider mr-1 min-w-[5rem]">
            Type
          </span>
          <Pill
            active={typeFilters.includes('cans')}
            onClick={() => onTypeFilterChange('cans')}
            label="Headphones"
            count={filterCounts?.equipment.cans}
            tooltip={FILTER_TOOLTIPS.equipment.headphones.description}
            showTooltip={guidedModeEnabled}
            activeClass={EQUIP_ACTIVE.cans}
          />
          <Pill
            active={typeFilters.includes('iems')}
            onClick={() => onTypeFilterChange('iems')}
            label="IEMs"
            count={filterCounts?.equipment.iems}
            tooltip={FILTER_TOOLTIPS.equipment.iems.description}
            showTooltip={guidedModeEnabled}
            activeClass={EQUIP_ACTIVE.iems}
          />
          <Pill
            active={wantRecommendationsFor.dac}
            onClick={() => onEquipmentToggle('dac')}
            label="DACs"
            count={filterCounts?.equipment.dacs}
            tooltip={FILTER_TOOLTIPS.equipment.dacs.description}
            showTooltip={guidedModeEnabled}
            activeClass={EQUIP_ACTIVE.dac}
          />
          <Pill
            active={wantRecommendationsFor.amp}
            onClick={() => onEquipmentToggle('amp')}
            label="Amps"
            count={filterCounts?.equipment.amps}
            tooltip={FILTER_TOOLTIPS.equipment.amps.description}
            showTooltip={guidedModeEnabled}
            activeClass={EQUIP_ACTIVE.amp}
          />
          <Pill
            active={wantRecommendationsFor.combo}
            onClick={() => onEquipmentToggle('combo')}
            label="Combos"
            count={filterCounts?.equipment.combos}
            tooltip={FILTER_TOOLTIPS.equipment.combos.description}
            showTooltip={guidedModeEnabled}
            activeClass={EQUIP_ACTIVE.combo}
          />
        </div>

        {/* Divider */}
        <div className="hidden sm:block h-5 w-px bg-border-default" />

        {/* Sound signature group */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[11px] font-medium text-tertiary uppercase tracking-wider mr-1 min-w-[5rem]">
            Sound
          </span>
          {(['neutral', 'warm', 'bright', 'fun'] as const).map(sig => (
            <Pill
              key={sig}
              active={soundFilters.includes(sig)}
              onClick={() => onSoundFilterChange(sig)}
              label={sig === 'fun' ? 'V-Shaped' : sig.charAt(0).toUpperCase() + sig.slice(1)}
              count={filterCounts?.sound[sig]}
              tooltip={FILTER_TOOLTIPS.sound[sig]?.description}
              showTooltip={guidedModeEnabled}
              activeClass={SOUND_ACTIVE[sig]}
            />
          ))}
        </div>

        {/* Right side: result count + utility toggles */}
        <div className="ml-auto flex items-center gap-3 text-xs text-tertiary">
          {totalResults > 0 && (
            <span className="tabular-nums">
              <span className="font-semibold text-primary">{totalResults}</span> results
            </span>
          )}
          {onToggleExpandExperts && (
            <button
              onClick={onToggleExpandExperts}
              className="text-tertiary hover:text-primary transition-colors"
              title={expandAllExperts ? 'Collapse expert analysis' : 'Expand expert analysis'}
            >
              {expandAllExperts ? 'Collapse analysis' : 'Expand analysis'}
            </button>
          )}
        </div>
      </div>

      {/* Budget allocation — below the filter row if active */}
      {totalBudget && onBudgetAllocationChange && (
        <div className="mt-3 pt-3 border-t">
          <BudgetAllocationControls
            totalBudget={totalBudget}
            allocation={budgetAllocation || autoBudgetAllocation || {}}
            onChange={onBudgetAllocationChange}
            globalRangeMin={budgetRangeMin}
            globalRangeMax={budgetRangeMax}
            wantRecommendationsFor={wantRecommendationsFor}
          />
        </div>
      )}
    </div>
  )
}

export const FiltersSection = memo(FiltersSectionComponent)
