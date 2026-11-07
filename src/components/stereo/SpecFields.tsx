'use client'

import { useId, useState, type ReactNode } from 'react'
import type { MissingInput } from '@/lib/stereo/power-check'
import {
  SPEC_RANGES,
  type AmpTopology,
  type LevelKind,
  type MaxSplMethod,
  type PowerHandlingKind,
  type PowerRatingKind,
  type SensitivityRef,
  type SnrRef,
  type SpecValue,
  type SpeakerAmpSpecs,
  type SpeakerSpecs,
  type Trust,
} from '@/lib/stereo/specs'
import { catalogValue, mergeOverrides, pickSpecs, resetField, type GearPick, type GearRole } from './GearChooser'
import {
  AdvancedTag,
  DecimalInput,
  RATING_OPTIONS,
  RadioGroup,
  SENSITIVITY_REF_OPTIONS,
  SelectField,
  UnitSwitch,
  fieldLabelClass,
  inputClass,
  type RadioOption,
} from './form-bits'

const TOPOLOGY_OPTIONS: readonly RadioOption<AmpTopology>[] = [
  { value: 'solid_state', label: 'Solid state' },
  { value: 'class_d', label: 'Class D' },
  { value: 'tube', label: 'Tube' },
  { value: 'hybrid', label: 'Hybrid' },
]
const SNR_REF_OPTIONS: readonly RadioOption<SnrRef>[] = [
  { value: 'unknown', label: 'Not stated' },
  { value: 'rated', label: 'Rated power' },
  { value: '1W', label: '1 W' },
]
const MAX_SPL_METHOD_OPTIONS: readonly RadioOption<MaxSplMethod>[] = [
  { value: 'unknown', label: 'Not sure' },
  { value: 'manufacturer', label: "Maker's spec" },
  { value: 'aes75', label: 'AES75 test' },
  { value: 'iec_splmax', label: 'IEC 60268-21 test' },
]
const LEVEL_KIND_OPTIONS: readonly RadioOption<LevelKind>[] = [
  { value: 'unknown', label: 'Not sure' },
  { value: 'peak', label: 'Peak' },
  { value: 'continuous', label: 'Continuous' },
]
const HANDLING_KIND_OPTIONS: readonly RadioOption<PowerHandlingKind>[] = [
  { value: 'unknown', label: 'Not stated' },
  { value: 'continuous', label: 'Continuous / RMS' },
  { value: 'program', label: 'Program' },
  { value: 'peak', label: 'Peak' },
]

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
  'amp.output_impedance_ohms': 'output_impedance_ohms',
  'amp.input_sensitivity_v': 'input_sensitivity_v',
  'amp.noise': 'snr_db',
}

/** What a secondary check is for, in "Add to check …" footers. */
const SOFT_PURPOSE: Record<string, string> = {
  'amp.output_impedance_ohms': 'tonal shift',
  'amp.input_sensitivity_v': 'gain',
  'amp.noise': 'hiss',
}

const missingClass = '!border-2 !border-[var(--accent-hover)]'
const softMissingClass = '!border-dashed !border-[var(--text-secondary)]'

interface SpecFieldsProps {
  role: GearRole
  /** null until the user picks gear or types a first value (which creates "Your amplifier"/"Your speakers"). */
  pick: GearPick | null
  /** This tile's missing inputs; their fields are highlighted with the hint underneath. */
  missing: MissingInput[]
  /** Inputs only the secondary checks need: a muted outline and "Add to check …", never "We need". */
  softMissing?: MissingInput[]
  /** Show the Advanced-only fields. */
  advanced?: boolean
  onChange: (p: GearPick) => void
}

/**
 * The tile's numbers, always editable. Every valid value applies as it is
 * typed, so the verdict follows along; what you type is stored as your entry.
 */
export function SpecFields({ role, pick, missing, softMissing = [], advanced = false, onChange }: SpecFieldsProps) {
  const uid = useId()
  const specs: SpeakerSpecs | SpeakerAmpSpecs = pick ? pickSpecs(pick) : {}
  const a0 = specs as SpeakerAmpSpecs
  const [zUnit, setZUnit] = useState<'ohm' | 'df'>(!a0.output_impedance_ohms && a0.damping_factor ? 'df' : 'ohm')
  const [gainUnit, setGainUnit] = useState<'v' | 'db'>(!a0.input_sensitivity_v && a0.gain_db ? 'db' : 'v')
  const [noiseUnit, setNoiseUnit] = useState<'uv' | 'snr'>(a0.output_noise_uv && !a0.snr_db ? 'uv' : 'snr')
  const missingFor = (key: string) => missing.find((m) => MISSING_FIELD[m.id] === key)
  const softFor = (key: string) => softMissing.find((m) => MISSING_FIELD[m.id] === key)
  const set = (key: string, value: unknown, extra: Record<string, unknown> = {}) =>
    onChange(mergeOverrides(role, pick, { [key]: { ...extra, value } }))
  /** Change a qualifier (a reference, a method) of a value already entered. */
  const qualify = (key: string, extra: Record<string, unknown>) => {
    const current = specs[key as keyof typeof specs] as SpecValue<number> | undefined
    if (current) set(key, current.value, { ...current, ...extra })
  }

  /** Under each field: the hint when we need it, else where the number came from (catalog gear only). */
  function footer(key: string): { id: string; node: ReactNode } | null {
    const id = `${uid}-${key}`
    const need = missingFor(key)
    if (need) {
      return { id, node: <span className="text-[var(--text-primary)]">{need.hint}</span> }
    }
    const soft = softFor(key)
    if (soft) {
      return { id, node: <span>Add to check {SOFT_PURPOSE[soft.id] ?? 'this'}. {soft.hint}</span> }
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
  function field(label: ReactNode, k: string, control: (describedBy?: string) => ReactNode) {
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
    keepQualifiers = false,
    ariaLabel?: string,
  ) {
    const v = specs[key as keyof typeof specs] as SpecValue<number> | undefined
    return (
      <DecimalInput
        value={v?.value ?? null}
        range={range}
        placeholder={placeholder}
        onCommit={(n) => set(key, n, keepQualifiers && v ? { ...v } : {})}
        onClear={clearable && pick ? () => onChange(resetField(pick, key)) : undefined}
        aria-describedby={describedBy}
        aria-label={ariaLabel}
        className={`${inputClass} ${missingFor(key) ? missingClass : softFor(key) ? softMissingClass : ''}`}
      />
    )
  }

  /** A field whose unit can be switched; the switch sits outside the label so it doesn't steal focus. */
  function switchedField(
    label: string,
    k: string,
    unitSwitch: ReactNode,
    control: (describedBy: string | undefined, ariaLabel: string) => ReactNode,
  ) {
    const foot = footer(k)
    return (
      <div key={`switched-${label}`} className="flex flex-col gap-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span aria-hidden="true" className="text-[13px] text-[var(--text-secondary)]">
            {label}
            <AdvancedTag />
          </span>
          {unitSwitch}
        </div>
        {control(foot?.id, label)}
        {foot && (
          <span id={foot.id} className="text-xs leading-snug text-[var(--text-secondary)]">
            {foot.node}
          </span>
        )}
      </div>
    )
  }

  function advancedLabel(text: string) {
    return (
      <>
        {text}
        <AdvancedTag />
      </>
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
        {advanced && (
          <>
            {field(advancedLabel('Lowest impedance (Ω)'), 'min_impedance_ohms', (d) =>
              decimalInput('min_impedance_ohms', SPEC_RANGES.min_impedance_ohms, 'Optional', d, true),
            )}
            {field(advancedLabel('Highest impedance (Ω), usually the bass peak'), 'max_impedance_ohms', (d) =>
              decimalInput('max_impedance_ohms', SPEC_RANGES.impedance_ohms, 'Optional', d, true),
            )}
            {field(advancedLabel('Max SPL at 1 m (dB)'), 'max_spl_db', (d) =>
              decimalInput('max_spl_db', SPEC_RANGES.max_spl_db, 'Optional', d, true, true),
            )}
            {s.max_spl_db && (
              <>
                <SelectField
                  label="Max SPL measured how"
                  options={MAX_SPL_METHOD_OPTIONS}
                  value={s.max_spl_db.method}
                  onChange={(method) => qualify('max_spl_db', { method })}
                />
                <SelectField
                  label="Max SPL is"
                  options={LEVEL_KIND_OPTIONS}
                  value={s.max_spl_db.kind}
                  onChange={(kind) => qualify('max_spl_db', { kind })}
                />
              </>
            )}
            {field(advancedLabel('Power handling (W)'), 'power_handling_w', (d) =>
              decimalInput('power_handling_w', SPEC_RANGES.power_handling_w, 'Optional', d, true, true),
            )}
            {s.power_handling_w && (
              <SelectField
                label="Power handling rating"
                options={HANDLING_KIND_OPTIONS}
                value={s.power_handling_w.kind}
                onChange={(kind) => qualify('power_handling_w', { kind })}
              />
            )}
            {s.compression && (
              <p className="m-0 text-[13px] leading-normal text-[var(--text-primary)] @lg:col-span-3">
                <strong>Compression sweep ({TRUST_LABEL[s.compression.trust].toLowerCase()}):</strong>{' '}
                {s.compression.value.map((p) => `${p.worst_db} dB at ${p.level_db_1m} dB`).join(', ')}, at 1 m.
              </p>
            )}
          </>
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
        {advanced && (
          <>
            <SelectField
              label="Amp type"
              options={[{ value: '' as AmpTopology, label: 'Not sure' }, ...TOPOLOGY_OPTIONS]}
              value={a.topology ?? ('' as AmpTopology)}
              onChange={(topology) => {
                if (topology) onChange(mergeOverrides(role, pick, { topology }))
                else if (pick) onChange(resetField(pick, 'topology'))
              }}
            />
            {switchedField(
              zUnit === 'ohm' ? 'Output impedance (Ω)' : 'Damping factor (at 8 Ω)',
              zUnit === 'ohm' ? 'output_impedance_ohms' : 'damping_factor',
              <UnitSwitch
                label="Output unit"
                options={[
                  { value: 'ohm', label: 'Ω' },
                  { value: 'df', label: 'Damping factor' },
                ]}
                value={zUnit}
                onChange={setZUnit}
              />,
              (d, l) =>
                zUnit === 'ohm'
                  ? decimalInput('output_impedance_ohms', SPEC_RANGES.output_impedance_ohms, 'e.g. 0.1', d, true, false, l)
                  : decimalInput('damping_factor', SPEC_RANGES.damping_factor, 'e.g. 100', d, true, true, l),
            )}
            {switchedField(
              gainUnit === 'v' ? 'Input sensitivity (V for full power)' : 'Gain (dB)',
              gainUnit === 'v' ? 'input_sensitivity_v' : 'gain_db',
              <UnitSwitch
                label="Sensitivity unit"
                options={[
                  { value: 'v', label: 'V' },
                  { value: 'db', label: 'Gain dB' },
                ]}
                value={gainUnit}
                onChange={setGainUnit}
              />,
              (d, l) =>
                gainUnit === 'v'
                  ? decimalInput('input_sensitivity_v', SPEC_RANGES.input_sensitivity_v, 'e.g. 1.5', d, true, false, l)
                  : decimalInput('gain_db', SPEC_RANGES.gain_db, 'e.g. 29', d, true, false, l),
            )}
            {switchedField(
              noiseUnit === 'snr' ? 'Signal-to-noise ratio (dB)' : 'Output noise (µV)',
              noiseUnit === 'snr' ? 'snr_db' : 'output_noise_uv',
              <UnitSwitch
                label="Noise unit"
                options={[
                  { value: 'snr', label: 'SNR' },
                  { value: 'uv', label: 'µV' },
                ]}
                value={noiseUnit}
                onChange={setNoiseUnit}
              />,
              (d, l) =>
                noiseUnit === 'snr'
                  ? decimalInput('snr_db', SPEC_RANGES.snr_db, 'e.g. 95', d, true, true, l)
                  : decimalInput('output_noise_uv', SPEC_RANGES.output_noise_uv, 'e.g. 100', d, true, false, l),
            )}
            {noiseUnit === 'snr' && a.snr_db && (
              <SelectField
                label="SNR measured at"
                options={SNR_REF_OPTIONS}
                value={a.snr_db.ref}
                onChange={(ref) => qualify('snr_db', { ref })}
              />
            )}
            <p className="m-0 text-[13px] leading-normal text-[var(--text-secondary)] @lg:col-span-3">
              Stereophile&apos;s measurements list output impedance and input sensitivity. Manuals usually list damping
              factor and SNR.
            </p>
          </>
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
