'use client'

import { useState, type ReactNode } from 'react'
import type { PowerRatingKind, SensitivityRef } from '@/lib/stereo/specs'

export const inputClass =
  'min-h-11 w-full rounded-md border border-[var(--border-subtle)] bg-[var(--background-primary)] px-3 text-base text-[var(--text-primary)]'
export const fieldLabelClass = 'flex flex-col gap-1 text-[13px] text-[var(--text-secondary)]'
export const primaryButtonClass =
  'min-h-12 rounded-lg bg-[var(--accent-hover)] px-5 text-base font-semibold text-white'
export const secondaryButtonClass =
  'min-h-11 rounded-lg border border-[var(--border-subtle)] bg-[var(--background-primary)] px-4 text-sm font-semibold text-[var(--text-primary)]'

/**
 * Parse a hand-typed number. Trims, treats a comma as a decimal point, and
 * returns null for blank, non-finite or out-of-range input (never NaN).
 */
export function parseDecimal(raw: string, range?: readonly [number, number]): number | null {
  const text = raw.trim().replace(',', '.')
  if (text === '') return null
  const n = Number(text)
  if (!Number.isFinite(n)) return null
  if (range && (n < range[0] || n > range[1])) return null
  return n
}

interface DecimalInputProps {
  value: number | null
  range: readonly [number, number]
  onCommit: (n: number) => void
  /** Clamp to the range on blur instead of ignoring an out-of-range value. */
  clampOnBlur?: boolean
  className?: string
  placeholder?: string
  'aria-label'?: string
}

/**
 * Text input for decimals. While focused it shows exactly what was typed (so
 * "3." survives); a valid in-range value is committed as it is typed. On blur
 * the draft is dropped and the committed value shows again.
 */
export function DecimalInput({ value, range, onCommit, clampOnBlur, className, ...rest }: DecimalInputProps) {
  const [draft, setDraft] = useState<string | null>(null)
  const shown = draft ?? (value === null ? '' : String(Number(value.toFixed(2))))
  return (
    <input
      {...rest}
      type="text"
      inputMode="decimal"
      className={className ?? inputClass}
      value={shown}
      onChange={(e) => {
        setDraft(e.target.value)
        const n = parseDecimal(e.target.value, range)
        if (n !== null) onCommit(n)
      }}
      onBlur={() => {
        if (clampOnBlur && draft !== null) {
          const n = parseDecimal(draft)
          if (n !== null) onCommit(Math.min(range[1], Math.max(range[0], Math.round(n))))
        }
        setDraft(null)
      }}
    />
  )
}

export interface RadioOption<T extends string> {
  value: T
  label: string
}

export function RadioGroup<T extends string>({
  legend,
  name,
  options,
  value,
  onChange,
}: {
  legend: ReactNode
  name: string
  options: readonly RadioOption<T>[]
  value: T | null
  onChange: (v: T) => void
}) {
  return (
    <fieldset className="m-0 flex flex-col gap-2 border-0 p-0">
      <legend className="mb-2 p-0 text-[13px] text-[var(--text-secondary)]">{legend}</legend>
      {options.map((o) => (
        <label
          key={o.value}
          className="flex min-h-11 items-center gap-2.5 rounded-lg border border-[var(--border-subtle)] px-3 text-[15px] text-[var(--text-primary)]"
        >
          <input
            type="radio"
            name={name}
            className="h-[18px] w-[18px]"
            checked={value === o.value}
            onChange={() => onChange(o.value)}
          />
          {o.label}
        </label>
      ))}
    </fieldset>
  )
}

export const SENSITIVITY_REF_OPTIONS: readonly RadioOption<SensitivityRef>[] = [
  { value: '2.83V', label: '2.83 V / 1 m' },
  { value: '1W', label: '1 W / 1 m' },
  { value: 'unknown', label: 'Not sure' },
]

export const RATING_OPTIONS: readonly RadioOption<PowerRatingKind>[] = [
  { value: 'continuous', label: 'RMS / continuous' },
  { value: 'peak', label: 'Peak / max' },
  { value: 'unknown', label: 'Not stated' },
]
