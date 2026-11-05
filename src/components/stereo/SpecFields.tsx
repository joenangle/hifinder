'use client'

import { useId, type ReactNode } from 'react'
import type { MissingInput } from '@/lib/stereo/power-check'
import {
  SPEC_RANGES,
  type PowerRatingKind,
  type SensitivityRef,
  type SpecValue,
  type SpeakerAmpSpecs,
  type SpeakerSpecs,
  type Trust,
} from '@/lib/stereo/specs'
import { catalogValue, mergeOverrides, pickSpecs, resetField, type GearPick, type GearRole } from './GearChooser'
import {
  DecimalInput,
  RATING_OPTIONS,
  RadioGroup,
  SENSITIVITY_REF_OPTIONS,
  fieldLabelClass,
  inputClass,
  type RadioOption,
} from './form-bits'

const TRUST_LABEL: Record<Trust, string> = {
  measured: 'Measured',
  claimed: 'Manufacturer spec',
  user: 'Your entry',
  assumed: 'Assumed',
}

const MISSING_FIELD: Record<string, string> = {
  'speakers.sensitivity_db': 'sensitivity_db',
  'speakers.nominal_impedance_ohms': 'nominal_impedance_ohms',
  'amp.power_w_8ohm': 'power_w_8ohm',
  'amp.power_w_4ohm': 'power_w_4ohm',
}

const missingClass = '!border-2 !border-[var(--accent-hover)]'

interface SpecFieldsProps {
  role: GearRole
  /** null until the user picks gear or types a first value (which creates "Your amplifier"/"Your speakers"). */
  pick: GearPick | null
  /** This tile's missing inputs; their fields are highlighted with the hint underneath. */
  missing: MissingInput[]
  onChange: (p: GearPick) => void
}

/**
 * The tile's numbers, always editable. Every valid value applies as it is
 * typed, so the verdict follows along; what you type is stored as your entry.
 */
export function SpecFields({ role, pick, missing, onChange }: SpecFieldsProps) {
  const uid = useId()
  const specs: SpeakerSpecs | SpeakerAmpSpecs = pick ? pickSpecs(pick) : {}
  const missingFor = (key: string) => missing.find((m) => MISSING_FIELD[m.id] === key)
  const set = (key: string, value: unknown) => onChange(mergeOverrides(role, pick, { [key]: { value } }))

  /** Under each field: the hint when we need it, else where the number came from (catalog gear only). */
  function footer(key: string): { id: string; node: ReactNode } | null {
    const id = `${uid}-${key}`
    const need = missingFor(key)
    if (need) {
      return { id, node: <span className="text-[var(--text-primary)]">{need.hint}</span> }
    }
    if (pick?.kind !== 'catalog') return null
    const current = specs[key as keyof typeof specs] as SpecValue<unknown> | undefined
    if (!current || typeof current !== 'object' || !('trust' in current)) return null
    const original = catalogValue(pick, key) as SpecValue<unknown> | undefined
    const edited = current.trust === 'user' && original !== undefined
    const inRoomRating = key === 'sensitivity_db' && (specs as SpeakerSpecs).sensitivity_in_room?.value === true
    return {
      id,
      node: (
        <>
          {inRoomRating && (
            <span className="block text-[var(--text-primary)]">
              {pick.item.brand} quotes this in a listening room, so it already includes room reinforcement. We take
              out about 3 dB so your room isn&apos;t counted twice.
            </span>
          )}
          {TRUST_LABEL[current.trust]}
          {edited && (
            <>
              {' · '}
              <button
                type="button"
                onClick={() => onChange(resetField(pick, key))}
                className="border-0 bg-transparent p-0 font-semibold text-[var(--accent-hover)] underline"
              >
                Reset to {String(original.value)}
              </button>
            </>
          )}
        </>
      ),
    }
  }

  // A plain function, not a component: a component defined here would be a new type each
  // render, remounting the input (and dropping focus) on every keystroke.
  function field(label: string, k: string, control: (describedBy?: string) => ReactNode) {
    const foot = footer(k)
    return (
      <div key={k} className="flex flex-col gap-1">
        <label className={fieldLabelClass}>
          {label}
          {control(foot?.id)}
        </label>
        {foot && (
          <span id={foot.id} className="text-xs leading-snug text-[var(--text-secondary)]">
            {foot.node}
          </span>
        )}
      </div>
    )
  }

  function radioField<T extends string>(
    legend: string,
    k: string,
    options: readonly RadioOption<T>[],
    value: T,
    onSelect: (v: T) => void,
  ) {
    const foot = footer(k)
    return (
      <div key={k} className="flex flex-col gap-1">
        <RadioGroup legend={legend} name={`${uid}-${k}`} options={options} value={value} onChange={onSelect} />
        {foot && <span className="text-xs leading-snug text-[var(--text-secondary)]">{foot.node}</span>}
      </div>
    )
  }

  function decimalInput(
    key: string,
    range: readonly [number, number],
    placeholder: string,
    describedBy: string | undefined,
    clearable = false,
  ) {
    const v = specs[key as keyof typeof specs] as SpecValue<number> | undefined
    return (
      <DecimalInput
        value={v?.value ?? null}
        range={range}
        placeholder={placeholder}
        onCommit={(n) => set(key, n)}
        onClear={clearable && pick ? () => onChange(resetField(pick, key)) : undefined}
        aria-describedby={describedBy}
        className={`${inputClass} ${missingFor(key) ? missingClass : ''}`}
      />
    )
  }

  let fields: ReactNode
  if (role === 'speakers') {
    const s = specs as SpeakerSpecs
    fields = (
      <>
        {field('Sensitivity (dB)', 'sensitivity_db', (d) =>
          decimalInput('sensitivity_db', SPEC_RANGES.sensitivity_db, 'e.g. 87', d),
        )}
        {field('Impedance (Ω)', 'nominal_impedance_ohms', (d) =>
          decimalInput('nominal_impedance_ohms', SPEC_RANGES.impedance_ohms, 'e.g. 8', d),
        )}
        {radioField<SensitivityRef>(
          'Sensitivity measured at',
          'sensitivity_ref',
          SENSITIVITY_REF_OPTIONS,
          s.sensitivity_ref?.value ?? 'unknown',
          (v) => set('sensitivity_ref', v),
        )}
      </>
    )
  } else {
    const a = specs as SpeakerAmpSpecs
    fields = (
      <>
        {field('Power into 8 Ω (W per channel)', 'power_w_8ohm', (d) =>
          decimalInput('power_w_8ohm', SPEC_RANGES.power_w, 'e.g. 50', d),
        )}
        {field('Power into 4 Ω, if listed', 'power_w_4ohm', (d) =>
          decimalInput('power_w_4ohm', SPEC_RANGES.power_w, 'Optional', d, true),
        )}
        {radioField<PowerRatingKind>(
          'Kind of rating',
          'power_rating',
          RATING_OPTIONS,
          a.power_rating?.kind ?? 'unknown',
          (kind) => onChange(mergeOverrides(role, pick, { power_rating: { ...a.power_rating, kind } })),
        )}
      </>
    )
  }

  return (
    <div
      role="group"
      aria-label={role === 'speakers' ? 'Speaker specs' : 'Amplifier specs'}
      className="@container flex flex-col gap-3"
    >
      {missing.length > 0 && (
        <p className="m-0 text-sm leading-normal text-[var(--text-primary)]">
          {missing.length === 1 ? `We need ${missing[0].label.toLowerCase()}.` : 'We need the highlighted values.'}{' '}
          <span className="text-[var(--text-secondary)]">They change the answer by several dB, so we won&apos;t guess.</span>
        </p>
      )}
      <div className="grid grid-cols-1 gap-3 @lg:grid-cols-3">{fields}</div>
    </div>
  )
}
