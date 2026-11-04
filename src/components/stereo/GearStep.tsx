'use client'

import { useState } from 'react'
import { ArrowRight, SlidersHorizontal, Speaker } from 'lucide-react'
import type { MissingInput } from '@/lib/stereo/power-check'
import {
  SPEC_RANGES,
  applyOverrides,
  parseSpeakerAmpSpecs,
  parseSpeakerSpecs,
  type PowerRatingKind,
  type SensitivityRef,
  type SpeakerAmpSpecs,
  type SpeakerSpecs,
  type Trust,
} from '@/lib/stereo/specs'
import { GearChooser, specLine, type GearPick, type GearRole } from './GearChooser'
import {
  RATING_OPTIONS,
  RadioGroup,
  fieldLabelClass,
  inputClass,
  parseDecimal,
  primaryButtonClass,
  secondaryButtonClass,
  type RadioOption,
} from './form-bits'

export type { GearPick } from './GearChooser'

interface GearStepProps {
  speakers: GearPick | null
  amp: GearPick | null
  ampNote: string | null
  missing: MissingInput[]
  onChange: (role: GearRole, pick: GearPick) => void
}

const TRUST_LABEL: Record<Trust, string> = {
  measured: 'Measured',
  claimed: 'Manufacturer spec',
  user: 'Your entry',
  assumed: 'Assumed',
}

const PROMPT_REF_OPTIONS: readonly RadioOption<SensitivityRef>[] = [
  { value: '2.83V', label: '2.83 V / 1 m' },
  { value: '1W', label: '1 W / 1 m' },
  { value: 'unknown', label: "Not sure (we'll show both)" },
]

const IMPEDANCE_OPTIONS = ['4', '6', '8', '16'].map((n) => ({ value: n, label: `${n} Ω` }))

const TILE_COPY: Record<GearRole, { title: string; action: string }> = {
  amp: { title: 'Amplifier', action: 'Change amplifier' },
  speakers: { title: 'Speakers (pair)', action: 'Change speakers' },
}

const cardClass = 'rounded-xl border border-[var(--border-subtle)] bg-[var(--background-primary)]'

function pickName(pick: GearPick): string {
  return pick.kind === 'catalog'
    ? `${pick.item.brand} ${pick.item.name}`
    : [pick.brand, pick.name].filter(Boolean).join(' ')
}

function pickSpecs(pick: GearPick): SpeakerSpecs | SpeakerAmpSpecs {
  return pick.kind === 'catalog' ? pick.item.specs : pick.specs
}

function pickTrustLabel(role: GearRole, pick: GearPick): string | null {
  if (pick.kind === 'custom') return TRUST_LABEL.user
  const specs = pick.item.specs
  const lead =
    role === 'speakers'
      ? (specs as SpeakerSpecs).sensitivity_db
      : ((specs as SpeakerAmpSpecs).power_w_8ohm ?? (specs as SpeakerAmpSpecs).power_w_4ohm)
  return lead ? TRUST_LABEL[lead.trust] : null
}

/** Layer the user's answers over the tile's current pick without touching other fields' trust. */
function mergeOverrides(role: GearRole, pick: GearPick | null, overrides: Record<string, unknown>): GearPick {
  const parse = role === 'speakers' ? parseSpeakerSpecs : parseSpeakerAmpSpecs
  const base: GearPick = pick ?? {
    kind: 'custom',
    brand: '',
    name: role === 'speakers' ? 'Your speakers' : 'Your amplifier',
    specs: {},
  }
  const layer = (specs: SpeakerSpecs | SpeakerAmpSpecs) => applyOverrides(specs, overrides, parse)
  return base.kind === 'catalog'
    ? { kind: 'catalog', item: { ...base.item, specs: layer(base.item.specs) } }
    : { ...base, specs: layer(base.specs) }
}

function MissingPrompt({
  role,
  missing,
  pick,
  isLast,
  onSubmit,
}: {
  role: GearRole
  missing: MissingInput
  pick: GearPick | null
  /** Nothing else is missing, so submitting this value produces the verdict. */
  isLast: boolean
  onSubmit: (p: GearPick) => void
}) {
  const [text, setText] = useState('')
  const [ref, setRef] = useState<SensitivityRef | null>(null)
  const [ohms, setOhms] = useState<string | null>(null)
  const [rating, setRating] = useState<PowerRatingKind | null>(null)

  const id = missing.id
  const isSensitivity = id === 'speakers.sensitivity_db'
  const isImpedance = id === 'speakers.nominal_impedance_ohms'
  const isAmp = id === 'amp.power_w_8ohm' || id === 'amp.power_w_4ohm'
  const title = isSensitivity ? "We need your speakers' sensitivity." : `We need ${missing.label.toLowerCase()}.`
  const fieldLabel = isSensitivity
    ? 'Sensitivity (dB)'
    : id === 'amp.power_w_4ohm'
      ? 'Power into 4 Ω (W per channel)'
      : 'Power into 8 Ω (W per channel)'

  function submit() {
    const overrides: Record<string, unknown> = {}
    if (isImpedance) {
      if (ohms === null) return
      overrides.nominal_impedance_ohms = { value: Number(ohms) }
    } else {
      const range = isSensitivity ? SPEC_RANGES.sensitivity_db : SPEC_RANGES.power_w
      const n = parseDecimal(text, range)
      if (n === null) return
      if (isSensitivity) {
        overrides.sensitivity_db = { value: n }
        overrides.sensitivity_ref = { value: ref ?? 'unknown' }
      } else {
        overrides[id === 'amp.power_w_4ohm' ? 'power_w_4ohm' : 'power_w_8ohm'] = { value: n }
        if (rating !== null) {
          const existing = pick ? (pickSpecs(pick) as SpeakerAmpSpecs).power_rating : undefined
          overrides.power_rating = { ...existing, kind: rating }
        }
      }
    }
    onSubmit(mergeOverrides(role, pick, overrides))
  }

  return (
    <form
      className="flex flex-col gap-3.5 rounded-lg border-2 border-[var(--accent-hover)] bg-[var(--background-primary)] p-4"
      onSubmit={(e) => {
        e.preventDefault()
        submit()
      }}
    >
      <p className="m-0 text-lg font-bold leading-snug text-[var(--text-primary)]">{title}</p>
      <p className="m-0 text-sm leading-normal text-[var(--text-secondary)]">
        It changes the answer by several dB, so we won&apos;t guess it.
      </p>
      <p className="m-0 text-sm leading-normal text-[var(--text-secondary)]">{missing.hint}</p>

      {isImpedance ? (
        <RadioGroup
          legend="Nominal impedance"
          name="prompt-impedance"
          options={IMPEDANCE_OPTIONS}
          value={ohms}
          onChange={setOhms}
        />
      ) : (
        <label className={fieldLabelClass}>
          {fieldLabel}
          <input
            type="text"
            inputMode="decimal"
            placeholder={isSensitivity ? 'e.g. 87' : 'e.g. 50'}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={inputClass}
          />
        </label>
      )}

      {isSensitivity && (
        <RadioGroup
          legend="What does the number say it's measured at?"
          name="prompt-sensitivity-ref"
          options={PROMPT_REF_OPTIONS}
          value={ref}
          onChange={setRef}
        />
      )}
      {isAmp && (
        <RadioGroup
          legend="What kind of rating is it?"
          name="prompt-power-rating"
          options={RATING_OPTIONS}
          value={rating}
          onChange={setRating}
        />
      )}

      <p className="m-0 text-[13px] leading-normal text-[var(--text-secondary)]">
        Saved to this system only, labeled &quot;your entry&quot;. It won&apos;t be shared.
      </p>
      <button type="submit" className={primaryButtonClass}>
        {isLast ? 'Show the verdict' : `Save ${missing.label.toLowerCase()}`}
      </button>
    </form>
  )
}

function GearTile({
  role,
  pick,
  note,
  prompt,
  promptIsLast,
  open,
  onToggle,
  onPrompt,
}: {
  role: GearRole
  pick: GearPick | null
  note?: string | null
  prompt: MissingInput | undefined
  promptIsLast: boolean
  open: boolean
  onToggle: () => void
  onPrompt: (p: GearPick) => void
}) {
  const copy = TILE_COPY[role]
  const Icon = role === 'amp' ? SlidersHorizontal : Speaker
  const trust = pick ? pickTrustLabel(role, pick) : null
  const specs = pick ? specLine(role, pickSpecs(pick)) : ''

  return (
    <div className={`${cardClass} flex min-w-0 flex-1 flex-col gap-3 p-4`}>
      <div className="flex items-center gap-2.5">
        <Icon aria-hidden="true" className="h-6 w-6 text-[var(--accent-hover)]" />
        <span className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-secondary)]">
          {copy.title}
        </span>
      </div>

      <div className="flex flex-col gap-0.5">
        {pick ? (
          <>
            <span className="text-base font-bold text-[var(--text-primary)]">{pickName(pick)}</span>
            {specs && <span className="text-sm text-[var(--text-secondary)]">{specs}</span>}
            {trust && <span className="text-xs text-[var(--text-secondary)]">{trust}</span>}
          </>
        ) : (
          <>
            <span className="text-base font-bold text-[var(--text-primary)]">Nothing chosen yet</span>
            <span className="text-sm text-[var(--text-secondary)]">Pick from the catalog or enter it yourself.</span>
          </>
        )}
        {note && <span className="text-sm text-[var(--text-secondary)]">{note}</span>}
      </div>

      {prompt && (
        <MissingPrompt key={prompt.id} role={role} missing={prompt} pick={pick} isLast={promptIsLast} onSubmit={onPrompt} />
      )}

      <button type="button" aria-expanded={open} onClick={onToggle} className={`${secondaryButtonClass} self-start`}>
        {open ? 'Done' : copy.action}
      </button>
    </div>
  )
}

export function GearStep({ speakers, amp, ampNote, missing, onChange }: GearStepProps) {
  const [openRole, setOpenRole] = useState<GearRole | null>(null)

  const promptFor = (role: GearRole) => missing.find((m) => m.id.startsWith(`${role}.`))
  const picks: Record<GearRole, GearPick | null> = { amp, speakers }

  const toggle = (role: GearRole) => setOpenRole((cur) => (cur === role ? null : role))
  const choose = (role: GearRole, pick: GearPick) => {
    onChange(role, pick)
    setOpenRole(null)
  }

  return (
    <section aria-label="Step 1: Your gear" className={`${cardClass} flex flex-col gap-4 p-5`}>
      <div className="flex items-start gap-3">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[var(--text-primary)] text-sm font-bold text-[var(--background-primary)]"
        >
          1
        </span>
        <div className="flex flex-col gap-0.5">
          <h2 className="m-0 text-xl font-bold text-[var(--text-primary)]">Your gear</h2>
          <p className="m-0 text-sm text-[var(--text-secondary)]">Swap any part and the verdict updates as you go.</p>
        </div>
      </div>

      <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
        <GearTile
          role="amp"
          pick={amp}
          note={ampNote}
          prompt={promptFor('amp')}
          promptIsLast={missing.length === 1}
          open={openRole === 'amp'}
          onToggle={() => toggle('amp')}
          onPrompt={(p) => onChange('amp', p)}
        />
        <ArrowRight aria-hidden="true" className="h-6 w-6 flex-none self-center rotate-90 text-[var(--text-secondary)] md:rotate-0" />
        <GearTile
          role="speakers"
          pick={speakers}
          prompt={promptFor('speakers')}
          promptIsLast={missing.length === 1}
          open={openRole === 'speakers'}
          onToggle={() => toggle('speakers')}
          onPrompt={(p) => onChange('speakers', p)}
        />
      </div>

      {openRole && (
        <GearChooser
          key={openRole}
          role={openRole}
          current={picks[openRole]}
          onPick={(p) => choose(openRole, p)}
          onClose={() => setOpenRole(null)}
        />
      )}
    </section>
  )
}
