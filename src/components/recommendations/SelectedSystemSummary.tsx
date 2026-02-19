'use client'

import { memo, useMemo } from 'react'
import { Music, MonitorSpeaker, Zap, Headphones, ChevronRight, ChevronDown } from 'lucide-react'
import { Tooltip } from '@/components/Tooltip'
import { parsePowerSpec, calculatePowerAtImpedance, assessAmplificationFromImpedance } from '@/lib/audio-calculations'

interface AudioComponent {
  id: string
  name: string
  brand?: string
  category?: string
  price_used_min?: number | null
  price_used_max?: number | null
  impedance?: number | null
  needs_amp?: boolean | null
  power_output?: string | null
  amplification_difficulty?: string | null
}

interface SelectedSystemSummaryProps {
  selectedHeadphones: AudioComponent[]
  selectedDacs: AudioComponent[]
  selectedAmps: AudioComponent[]
  selectedCombos: AudioComponent[]
  budget: number
  remainingBudget: number
  onBuildStack: () => void
  onClearAll: () => void
}

const formatPrice = (amount: number) => `$${Math.round(amount).toLocaleString()}`

const avgPrice = (item: AudioComponent) =>
  Math.round(((item.price_used_min || 0) + (item.price_used_max || 0)) / 2)

// Power compatibility analysis between amp and headphones
type CompatLevel = 'excellent' | 'good' | 'marginal' | 'underpowered' | 'unknown'

interface PowerCompat {
  level: CompatLevel
  color: string
  label: string
  detail: string
}

function analyzePowerCompat(
  headphones: AudioComponent[],
  amps: AudioComponent[],
  combos: AudioComponent[]
): PowerCompat | null {
  if (headphones.length === 0) return null

  const hp = headphones[0]
  const amp = amps[0] || combos[0]
  const hpImpedance = hp.impedance

  // No headphone impedance data
  if (!hpImpedance) {
    return { level: 'unknown', color: 'text-muted', label: '?', detail: 'No impedance data available for power analysis' }
  }

  // No amp/combo selected — show what the headphones need
  if (!amp) {
    const assessment = assessAmplificationFromImpedance(hpImpedance, hp.needs_amp ?? null, hp.name, hp.brand)
    if (assessment.difficulty === 'easy') {
      return { level: 'good', color: 'text-green-500', label: 'Easy drive', detail: `${hpImpedance}Ω — runs well from any source` }
    }
    if (assessment.difficulty === 'moderate') {
      return { level: 'marginal', color: 'text-yellow-500', label: 'Amp helps', detail: `${hpImpedance}Ω — a dedicated amp improves dynamics` }
    }
    return { level: 'underpowered', color: 'text-red-500', label: 'Needs amp', detail: `${hpImpedance}Ω — requires dedicated amplification` }
  }

  // Amp selected — calculate power at headphone impedance
  const spec = parsePowerSpec(amp.power_output ?? undefined)
  if (!spec) {
    return { level: 'unknown', color: 'text-muted', label: '—', detail: 'No power spec available for this amp' }
  }

  const powerAtZ = calculatePowerAtImpedance(spec.power_mW, spec.reference_impedance, hpImpedance)
  // Estimate power needed (conservative: assume ~100dB sensitivity → ~10mW for easy, more for demanding)
  const estimatedNeed = hpImpedance >= 300 ? 50 : hpImpedance >= 150 ? 20 : hpImpedance >= 80 ? 10 : 5
  const ratio = powerAtZ / estimatedNeed

  if (ratio >= 4) {
    return { level: 'excellent', color: 'text-green-500', label: `${Math.round(powerAtZ)}mW`, detail: `${Math.round(powerAtZ)}mW at ${hpImpedance}Ω — excellent headroom (${ratio.toFixed(1)}x)` }
  }
  if (ratio >= 2) {
    return { level: 'good', color: 'text-green-500', label: `${Math.round(powerAtZ)}mW`, detail: `${Math.round(powerAtZ)}mW at ${hpImpedance}Ω — good headroom (${ratio.toFixed(1)}x)` }
  }
  if (ratio >= 1) {
    return { level: 'marginal', color: 'text-yellow-500', label: `${Math.round(powerAtZ)}mW`, detail: `${Math.round(powerAtZ)}mW at ${hpImpedance}Ω — adequate but limited headroom` }
  }
  return { level: 'underpowered', color: 'text-red-500', label: `${Math.round(powerAtZ)}mW`, detail: `${Math.round(powerAtZ)}mW at ${hpImpedance}Ω — may struggle with demanding passages` }
}

// Connector arrow between chain nodes
function ChainArrow({ compat, vertical }: { compat?: PowerCompat | null; vertical?: boolean }) {
  const dotColor = compat
    ? compat.level === 'excellent' || compat.level === 'good' ? 'bg-green-500'
      : compat.level === 'marginal' ? 'bg-yellow-500'
      : compat.level === 'underpowered' ? 'bg-red-500'
      : 'bg-gray-400'
    : 'bg-border'

  const arrow = vertical ? (
    <div className="flex flex-col items-center py-1">
      <div className="w-px h-3 bg-border" />
      {compat ? (
        <Tooltip content={compat.detail}>
          <div className={`w-2.5 h-2.5 rounded-full ${dotColor} ring-2 ring-surface-elevated cursor-help`} />
        </Tooltip>
      ) : (
        <div className={`w-2 h-2 rounded-full ${dotColor}`} />
      )}
      <div className="w-px h-3 bg-border" />
      <ChevronDown className="w-3 h-3 text-muted -mt-1" />
    </div>
  ) : (
    <div className="flex items-center px-1">
      <div className="h-px w-3 bg-border" />
      {compat ? (
        <Tooltip content={compat.detail}>
          <div className={`w-2.5 h-2.5 rounded-full ${dotColor} ring-2 ring-surface-elevated cursor-help flex-shrink-0`} />
        </Tooltip>
      ) : (
        <div className={`w-2 h-2 rounded-full ${dotColor} flex-shrink-0`} />
      )}
      <div className="h-px w-3 bg-border" />
      <ChevronRight className="w-3 h-3 text-muted -ml-1 flex-shrink-0" />
    </div>
  )

  return arrow
}

// Individual chain node (filled or empty slot)
function ChainNode({
  icon: Icon,
  label,
  items,
  emptyLabel,
  color,
  isComboSpan,
}: {
  icon: React.ElementType
  label: string
  items: AudioComponent[]
  emptyLabel: string
  color: string
  isComboSpan?: boolean
}) {
  const isEmpty = items.length === 0

  if (isEmpty) {
    return (
      <div className={`flex-1 min-w-0 border-2 border-dashed border-border rounded-lg p-2.5 text-center ${isComboSpan ? 'col-span-2' : ''}`}>
        <Icon className="w-4 h-4 text-muted mx-auto mb-1" />
        <p className="text-xs text-muted">{emptyLabel}</p>
      </div>
    )
  }

  return (
    <div className={`flex-1 min-w-0 ${isComboSpan ? 'col-span-2' : ''}`}>
      {items.map(item => (
        <div key={item.id} className={`border border-border rounded-lg p-2.5 bg-surface-hover`}>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${color} flex-shrink-0`} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">
                {item.brand ? `${item.brand} ` : ''}{item.name}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted">
                <span>{label}</span>
                {avgPrice(item) > 0 && (
                  <>
                    <span className="text-border">·</span>
                    <span>{formatPrice(avgPrice(item))}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

const SelectedSystemSummaryComponent = ({
  selectedHeadphones,
  selectedDacs,
  selectedAmps,
  selectedCombos,
  budget,
  remainingBudget,
  onBuildStack,
  onClearAll
}: SelectedSystemSummaryProps) => {
  const hasItems = selectedHeadphones.length > 0 || selectedDacs.length > 0 || selectedAmps.length > 0 || selectedCombos.length > 0

  if (!hasItems) return null

  const totalSelectedPrice = [
    ...selectedHeadphones,
    ...selectedDacs,
    ...selectedAmps,
    ...selectedCombos
  ].reduce((sum, item) => sum + avgPrice(item), 0)

  const allCategories = [selectedHeadphones, selectedDacs, selectedAmps, selectedCombos]
  const filledCategories = allCategories.filter(arr => arr.length > 0).length
  const totalCategories = allCategories.length

  // Power compatibility between amp/combo and headphones
  const powerCompat = useMemo(
    () => analyzePowerCompat(selectedHeadphones, selectedAmps, selectedCombos),
    [selectedHeadphones, selectedAmps, selectedCombos]
  )

  const hasCombo = selectedCombos.length > 0
  const hasSeparateDacAmp = selectedDacs.length > 0 || selectedAmps.length > 0

  return (
    <div className="card p-5 mb-8 border-l-4 border-accent-primary">
      <h3 className="heading-3 text-center mb-4">Your Audio Chain</h3>

      {/* Desktop: horizontal signal chain */}
      <div className="hidden md:flex items-center gap-0 mb-4">
        {/* Source */}
        <div className="flex-shrink-0 w-16 text-center">
          <div className="border border-border rounded-lg p-2 bg-surface-secondary">
            <Music className="w-4 h-4 text-muted mx-auto" />
            <p className="text-[10px] text-muted mt-0.5">Source</p>
          </div>
        </div>

        <ChainArrow />

        {/* DAC + Amp (or Combo spanning both) */}
        {hasCombo && !hasSeparateDacAmp ? (
          <>
            <ChainNode
              icon={MonitorSpeaker}
              label="DAC/Amp"
              items={selectedCombos}
              emptyLabel="DAC/Amp"
              color="bg-orange-500"
              isComboSpan
            />
          </>
        ) : (
          <>
            <ChainNode
              icon={MonitorSpeaker}
              label="DAC"
              items={selectedDacs}
              emptyLabel="Add DAC"
              color="bg-red-500"
            />
            <ChainArrow />
            <ChainNode
              icon={Zap}
              label="Amp"
              items={selectedAmps}
              emptyLabel="Add Amp"
              color="bg-amber-500"
            />
          </>
        )}

        <ChainArrow compat={powerCompat} />

        {/* Headphones */}
        <ChainNode
          icon={Headphones}
          label="Headphones"
          items={selectedHeadphones}
          emptyLabel="Add Headphones"
          color="bg-accent-primary"
        />
      </div>

      {/* Mobile: vertical signal chain */}
      <div className="flex flex-col items-center md:hidden mb-4">
        {/* Source */}
        <div className="w-full max-w-[200px]">
          <div className="border border-border rounded-lg p-2 bg-surface-secondary text-center">
            <Music className="w-4 h-4 text-muted mx-auto" />
            <p className="text-[10px] text-muted mt-0.5">Source</p>
          </div>
        </div>

        <ChainArrow vertical />

        {hasCombo && !hasSeparateDacAmp ? (
          <div className="w-full">
            <ChainNode icon={MonitorSpeaker} label="DAC/Amp" items={selectedCombos} emptyLabel="DAC/Amp" color="bg-orange-500" />
          </div>
        ) : (
          <>
            <div className="w-full">
              <ChainNode icon={MonitorSpeaker} label="DAC" items={selectedDacs} emptyLabel="Add DAC" color="bg-red-500" />
            </div>
            <ChainArrow vertical />
            <div className="w-full">
              <ChainNode icon={Zap} label="Amp" items={selectedAmps} emptyLabel="Add Amp" color="bg-amber-500" />
            </div>
          </>
        )}

        <ChainArrow compat={powerCompat} vertical />

        <div className="w-full">
          <ChainNode icon={Headphones} label="Headphones" items={selectedHeadphones} emptyLabel="Add Headphones" color="bg-accent-primary" />
        </div>
      </div>

      {/* Power compatibility callout */}
      {powerCompat && powerCompat.level !== 'unknown' && (
        <div className={`text-center text-xs mb-3 ${powerCompat.color}`}>
          {powerCompat.detail}
        </div>
      )}

      {/* Budget summary */}
      <div className={`pt-3 border-t border-border-default rounded-lg p-3 ${
        totalSelectedPrice > budget * 1.1
          ? 'bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border border-red-200 dark:border-red-800'
          : totalSelectedPrice > budget * 0.9
          ? 'bg-transparent border border-border-default'
          : 'bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-800'
      }`}>
        <div className="text-center mb-3">
          <p className="text-lg font-bold text-text-primary">
            {formatPrice(totalSelectedPrice)}
          </p>
          <div className="flex items-center justify-center gap-4 text-sm">
            <p className={`font-medium ${
              totalSelectedPrice > budget * 1.1
                ? 'text-red-700 dark:text-red-400'
                : totalSelectedPrice > budget * 0.9
                ? 'text-text-secondary'
                : 'text-green-700 dark:text-green-400'
            }`}>
              {totalSelectedPrice <= budget ? 'Under' : 'Over'} budget by {formatPrice(Math.abs(totalSelectedPrice - budget))}
            </p>
            {filledCategories < totalCategories && remainingBudget > 0 && (
              <p className="font-medium text-accent-primary">
                {formatPrice(remainingBudget)} remaining
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-center gap-3">
          <button onClick={onBuildStack} className="button button-primary flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Build Complete Stack
          </button>
          <button onClick={onClearAll} className="button button-secondary">
            Clear All
          </button>
        </div>
      </div>
    </div>
  )
}

export const SelectedSystemSummary = memo(SelectedSystemSummaryComponent)
