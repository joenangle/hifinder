'use client'

import {
  SPEC_RANGES,
  type PowerRatingKind,
  type SensitivityRef,
  type SpeakerAmpSpecs,
  type SpeakerSpecs,
} from '@/lib/stereo/specs'
import { mergeOverrides, pickSpecs, type GearPick, type GearRole } from './GearChooser'
import { DecimalInput, RATING_OPTIONS, SENSITIVITY_REF_OPTIONS, fieldLabelClass, inputClass } from './form-bits'

interface SpecEditorProps {
  role: GearRole
  pick: GearPick
  onChange: (p: GearPick) => void
}

/**
 * Edit the current pick's numbers in place, prefilled, keeping its name. Every
 * valid value applies as it is typed, so "what if this amp had 2 W?" is one
 * edit away. Values typed here are stored as user entries, like any other.
 */
export function SpecEditor({ role, pick, onChange }: SpecEditorProps) {
  const specs = pickSpecs(pick)
  const set = (key: string, value: unknown) => onChange(mergeOverrides(role, pick, { [key]: { value } }))

  // Only hand-entered gear can drop a value: a catalog figure would come back on reload.
  const clear =
    pick.kind === 'custom'
      ? (key: keyof SpeakerAmpSpecs) => () => {
          const next = { ...(pick.specs as SpeakerAmpSpecs) }
          delete next[key]
          onChange({ ...pick, specs: next })
        }
      : undefined

  let fields
  if (role === 'speakers') {
    const s = specs as SpeakerSpecs
    fields = (
      <>
        <label className={fieldLabelClass}>
          Sensitivity (dB)
          <DecimalInput
            value={s.sensitivity_db?.value ?? null}
            range={SPEC_RANGES.sensitivity_db}
            onCommit={(n) => set('sensitivity_db', n)}
          />
        </label>
        <label className={fieldLabelClass}>
          Measured at
          <select
            value={s.sensitivity_ref?.value ?? 'unknown'}
            onChange={(e) => set('sensitivity_ref', e.target.value as SensitivityRef)}
            className={inputClass}
          >
            {SENSITIVITY_REF_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label className={fieldLabelClass}>
          Nominal impedance (Ω)
          <select
            value={s.nominal_impedance_ohms?.value ?? ''}
            onChange={(e) => set('nominal_impedance_ohms', Number(e.target.value))}
            className={inputClass}
          >
            {s.nominal_impedance_ohms === undefined && (
              <option value="" disabled>
                Choose one
              </option>
            )}
            {[4, 6, 8, 16].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </>
    )
  } else {
    const a = specs as SpeakerAmpSpecs
    fields = (
      <>
        <label className={fieldLabelClass}>
          Power into 8 Ω (W per channel)
          <DecimalInput
            value={a.power_w_8ohm?.value ?? null}
            range={SPEC_RANGES.power_w}
            onCommit={(n) => set('power_w_8ohm', n)}
          />
        </label>
        <label className={fieldLabelClass}>
          Power into 4 Ω, if listed
          <DecimalInput
            value={a.power_w_4ohm?.value ?? null}
            range={SPEC_RANGES.power_w}
            onCommit={(n) => set('power_w_4ohm', n)}
            onClear={clear?.('power_w_4ohm')}
          />
        </label>
        <label className={fieldLabelClass}>
          Kind of rating
          <select
            value={a.power_rating?.kind ?? 'unknown'}
            onChange={(e) =>
              onChange(
                mergeOverrides(role, pick, {
                  power_rating: { ...a.power_rating, kind: e.target.value as PowerRatingKind },
                }),
              )
            }
            className={inputClass}
          >
            {RATING_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      </>
    )
  }

  return (
    <div
      role="group"
      aria-label={role === 'speakers' ? 'Edit speaker specs' : 'Edit amplifier specs'}
      className="@container flex flex-col gap-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--background-secondary)] p-3.5"
    >
      <div className="grid grid-cols-1 gap-3 @lg:grid-cols-3">{fields}</div>
      <p className="m-0 text-[13px] leading-normal text-[var(--text-secondary)]">
        The verdict updates as you type. Changed values are labeled &quot;your entry&quot;.
      </p>
    </div>
  )
}
