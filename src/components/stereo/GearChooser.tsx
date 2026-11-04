'use client'

import { useEffect, useState, type KeyboardEvent } from 'react'
import {
  SPEC_RANGES,
  applyOverrides,
  parseSpeakerAmpSpecs,
  parseSpeakerSpecs,
  type PowerRatingKind,
  type SensitivityRef,
  type SpeakerAmpSpecs,
  type SpeakerSpecs,
  type SpecValue,
  type StereoCatalogItem,
} from '@/lib/stereo/specs'
import {
  RATING_OPTIONS,
  RadioGroup,
  SENSITIVITY_REF_OPTIONS,
  fieldLabelClass,
  inputClass,
  parseDecimal,
  primaryButtonClass,
} from './form-bits'

export type GearRole = 'speakers' | 'amp'

export type GearPick =
  | {
      kind: 'catalog'
      item: StereoCatalogItem
      /** The catalog's own values, kept once the user's entries are layered into item.specs. */
      catalogSpecs?: SpeakerSpecs | SpeakerAmpSpecs
    }
  | { kind: 'custom'; brand: string; name: string; specs: SpeakerSpecs | SpeakerAmpSpecs }

/** A hand-entered value: user trust, no source. */
export const userValue = <T,>(value: T): SpecValue<T> => ({ value, trust: 'user', source_url: null })

export function pickSpecs(pick: GearPick): SpeakerSpecs | SpeakerAmpSpecs {
  return pick.kind === 'catalog' ? pick.item.specs : pick.specs
}

/** Layer the user's answers over the current pick without touching other fields' trust. */
export function mergeOverrides(role: GearRole, pick: GearPick | null, overrides: Record<string, unknown>): GearPick {
  const parse = role === 'speakers' ? parseSpeakerSpecs : parseSpeakerAmpSpecs
  const base: GearPick = pick ?? {
    kind: 'custom',
    brand: '',
    name: role === 'speakers' ? 'Your speakers' : 'Your amplifier',
    specs: {},
  }
  const layer = (specs: SpeakerSpecs | SpeakerAmpSpecs) => applyOverrides(specs, overrides, parse)
  return base.kind === 'catalog'
    ? {
        kind: 'catalog',
        item: { ...base.item, specs: layer(base.item.specs) },
        catalogSpecs: base.catalogSpecs ?? base.item.specs,
      }
    : { ...base, specs: layer(base.specs) }
}

/** The catalog's value for a field, whatever the user has typed over it. */
export function catalogValue(pick: GearPick, key: string): unknown {
  if (pick.kind !== 'catalog') return undefined
  return (pick.catalogSpecs ?? pick.item.specs)[key as keyof (SpeakerSpecs | SpeakerAmpSpecs)]
}

/** Drop the user's entry for a field: catalog gear gets its own value back, custom gear loses the value. */
export function resetField(pick: GearPick, key: string): GearPick {
  if (pick.kind === 'custom') {
    const specs: Record<string, unknown> = { ...pick.specs }
    delete specs[key]
    return { ...pick, specs: specs as SpeakerSpecs | SpeakerAmpSpecs }
  }
  const specs: Record<string, unknown> = { ...pick.item.specs }
  const original = catalogValue(pick, key)
  if (original === undefined) delete specs[key]
  else specs[key] = original
  return { ...pick, item: { ...pick.item, specs: specs as SpeakerSpecs | SpeakerAmpSpecs } }
}

const SEARCH_DEBOUNCE_MS = 250

/** One-line spec summary, e.g. "87 dB · 4 Ω" or "50 W into 8 Ω". */
export function specLine(role: GearRole, specs: SpeakerSpecs | SpeakerAmpSpecs): string {
  if (role === 'speakers') {
    const s = specs as SpeakerSpecs
    const parts: string[] = []
    if (s.sensitivity_db) parts.push(`${s.sensitivity_db.value} dB`)
    if (s.nominal_impedance_ohms) parts.push(`${s.nominal_impedance_ohms.value} Ω`)
    return parts.join(' · ')
  }
  const a = specs as SpeakerAmpSpecs
  const parts: string[] = []
  if (a.power_w_8ohm) parts.push(`${a.power_w_8ohm.value} W into 8 Ω`)
  if (a.power_w_4ohm) parts.push(`${a.power_w_4ohm.value} W into 4 Ω`)
  return parts.join(' · ')
}

type CatalogResult = { q: string; items: StereoCatalogItem[] | null }

function CatalogTab({
  role,
  current,
  onPick,
  onManual,
}: {
  role: GearRole
  current: GearPick | null
  onPick: (p: GearPick) => void
  onManual: () => void
}) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [result, setResult] = useState<CatalogResult | null>(null)

  useEffect(() => {
    if (query === debounced) return
    const timer = setTimeout(() => setDebounced(query), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [query, debounced])

  useEffect(() => {
    const controller = new AbortController()
    fetch(`/api/stereo-catalog?role=${role}&q=${encodeURIComponent(debounced)}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`status ${res.status}`))))
      .then((body: { items?: StereoCatalogItem[] }) => {
        setResult({ q: debounced, items: Array.isArray(body.items) ? body.items : [] })
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return
        console.error('Stereo catalog search failed', err)
        setResult({ q: debounced, items: null })
      })
    return () => controller.abort()
  }, [role, debounced])

  const ready = result !== null && result.q === query ? result : null
  const currentId = current?.kind === 'catalog' ? current.item.id : null

  return (
    <div className="flex flex-col gap-3">
      <label className={fieldLabelClass}>
        Search by brand or model
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={role === 'speakers' ? 'e.g. KEF Q150' : 'e.g. Yamaha A-S301'}
          className={inputClass}
        />
      </label>

      <div className="flex flex-col gap-2" aria-busy={ready === null}>
        {ready === null ? (
          <p className="m-0 text-sm text-[var(--text-secondary)]">Loading...</p>
        ) : ready.items === null ? (
          <p role="alert" className="m-0 text-sm text-[var(--warning)]">
            We couldn&apos;t load the catalog. Try again, or enter it yourself.
          </p>
        ) : ready.items.length === 0 ? (
          <p className="m-0 text-sm text-[var(--text-secondary)]">No matches. Try fewer words, or enter it yourself.</p>
        ) : (
          ready.items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onPick({ kind: 'catalog', item })}
              className={`flex min-h-11 flex-col items-start gap-0.5 rounded-lg border bg-[var(--background-primary)] px-3.5 py-2.5 text-left ${
                item.id === currentId ? 'border-[var(--accent-hover)]' : 'border-[var(--border-subtle)]'
              }`}
            >
              <span className="text-[15px] font-semibold text-[var(--text-primary)]">
                {item.brand} {item.name}
              </span>
              <span className="text-[13px] text-[var(--text-secondary)]">{specLine(role, item.specs)}</span>
            </button>
          ))
        )}
      </div>

      <p className="m-0 text-sm text-[var(--text-secondary)]">
        Not listed?{' '}
        <button
          type="button"
          onClick={onManual}
          className="min-h-11 border-0 bg-transparent p-0 text-sm font-semibold text-[var(--accent-hover)] underline"
        >
          Enter it yourself
        </button>
        . Vintage and used gear is welcome.
      </p>
    </div>
  )
}

function ManualTab({ role, onPick }: { role: GearRole; onPick: (p: GearPick) => void }) {
  const [brand, setBrand] = useState('')
  const [model, setModel] = useState('')
  const [sensitivity, setSensitivity] = useState('')
  const [ref, setRef] = useState<SensitivityRef | null>(null)
  const [impedance, setImpedance] = useState('')
  const [power8, setPower8] = useState('')
  const [power4, setPower4] = useState('')
  const [rating, setRating] = useState<PowerRatingKind | null>(null)

  function buildSpecs(): SpeakerSpecs | SpeakerAmpSpecs {
    if (role === 'speakers') {
      const specs: SpeakerSpecs = {}
      const sens = parseDecimal(sensitivity, SPEC_RANGES.sensitivity_db)
      if (sens !== null) specs.sensitivity_db = userValue(sens)
      if (ref !== null) specs.sensitivity_ref = userValue(ref)
      const imp = parseDecimal(impedance, SPEC_RANGES.impedance_ohms)
      if (imp !== null) specs.nominal_impedance_ohms = userValue(imp)
      return specs
    }
    const specs: SpeakerAmpSpecs = {}
    const p8 = parseDecimal(power8, SPEC_RANGES.power_w)
    if (p8 !== null) specs.power_w_8ohm = userValue(p8)
    const p4 = parseDecimal(power4, SPEC_RANGES.power_w)
    if (p4 !== null) specs.power_w_4ohm = userValue(p4)
    if (rating !== null) specs.power_rating = { kind: rating }
    return specs
  }

  function submit() {
    const name = model.trim()
    if (name === '') return
    onPick({ kind: 'custom', brand: brand.trim(), name, specs: buildSpecs() })
  }

  return (
    <form
      className="flex flex-col gap-3.5"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className={fieldLabelClass}>
          Brand
          <input type="text" value={brand} onChange={(e) => setBrand(e.target.value)} className={inputClass} />
        </label>
        <label className={fieldLabelClass}>
          Model
          <input
            type="text"
            required
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className={inputClass}
          />
        </label>

        {role === 'speakers' ? (
          <>
            <label className={fieldLabelClass}>
              Sensitivity (dB)
              <input
                type="text"
                inputMode="decimal"
                placeholder="e.g. 87"
                value={sensitivity}
                onChange={(e) => setSensitivity(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={fieldLabelClass}>
              Nominal impedance (Ω)
              <select value={impedance} onChange={(e) => setImpedance(e.target.value)} className={inputClass}>
                <option value="">Not sure</option>
                {[4, 6, 8, 16].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </>
        ) : (
          <>
            <label className={fieldLabelClass}>
              Power into 8 Ω (W per channel)
              <input
                type="text"
                inputMode="decimal"
                placeholder="e.g. 50"
                value={power8}
                onChange={(e) => setPower8(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className={fieldLabelClass}>
              Power into 4 Ω, if listed
              <input
                type="text"
                inputMode="decimal"
                placeholder="Leave blank if not listed"
                value={power4}
                onChange={(e) => setPower4(e.target.value)}
                className={inputClass}
              />
            </label>
          </>
        )}
      </div>

      {role === 'speakers' ? (
        <RadioGroup
          legend="Sensitivity measured at"
          name="manual-sensitivity-ref"
          options={SENSITIVITY_REF_OPTIONS}
          value={ref}
          onChange={setRef}
        />
      ) : (
        <RadioGroup
          legend="What kind of rating is it?"
          name="manual-power-rating"
          options={RATING_OPTIONS}
          value={rating}
          onChange={setRating}
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className={primaryButtonClass}>
          Use these values
        </button>
        <span className="text-[13px] text-[var(--text-secondary)]">
          Leave anything blank you don&apos;t know. Saved to this system only, labeled &quot;your entry&quot;.
        </span>
      </div>
    </form>
  )
}

interface GearChooserProps {
  role: GearRole
  current: GearPick | null
  onPick: (p: GearPick) => void
  onClose: () => void
}

export function GearChooser({ role, current, onPick, onClose }: GearChooserProps) {
  const [tab, setTab] = useState<'catalog' | 'manual'>('catalog')
  const title = role === 'speakers' ? 'Choose your speakers' : 'Choose your amplifier'

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'Escape') onClose()
  }

  const tabClass = (active: boolean) =>
    `min-h-11 rounded-md border-0 px-4 text-sm font-semibold text-[var(--text-primary)] ${
      active ? 'bg-[var(--background-primary)] shadow-sm' : 'bg-transparent'
    }`

  return (
    <div
      onKeyDown={onKeyDown}
      className="flex flex-col gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--background-secondary)] p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="m-0 text-base font-bold text-[var(--text-primary)]">{title}</h3>
        <div
          role="tablist"
          aria-label="How to add it"
          className="flex gap-1 rounded-lg bg-[var(--background-secondary)] p-1 ring-1 ring-[var(--border-subtle)]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'catalog'}
            onClick={() => setTab('catalog')}
            className={tabClass(tab === 'catalog')}
          >
            Catalog
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'manual'}
            onClick={() => setTab('manual')}
            className={tabClass(tab === 'manual')}
          >
            Enter it yourself
          </button>
        </div>
      </div>

      {tab === 'catalog' ? (
        <CatalogTab role={role} current={current} onPick={onPick} onManual={() => setTab('manual')} />
      ) : (
        <ManualTab role={role} onPick={onPick} />
      )}
    </div>
  )
}
