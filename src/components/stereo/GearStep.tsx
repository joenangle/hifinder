'use client'

import { useState } from 'react'
import { ArrowRight, SlidersHorizontal, Speaker } from 'lucide-react'
import type { MissingInput } from '@/lib/stereo/power-check'
import type { SourceSpecs } from '@/lib/stereo/specs'
import { GearChooser, type GearPick, type GearRole } from './GearChooser'
import { SourceTile } from './SourceTile'
import { SpecFields } from './SpecFields'
import { primaryButtonClass, secondaryButtonClass } from './form-bits'

export type { GearPick } from './GearChooser'

/** How many of each role the catalog holds. A null count (query failed) just drops the number. */
export type CatalogCounts = Partial<Record<GearRole, number | null>>

interface GearStepProps {
  speakers: GearPick | null
  amp: GearPick | null
  ampNote: string | null
  catalogCounts?: CatalogCounts
  missing: MissingInput[]
  /** Inputs only the secondary checks need (Advanced mode). */
  softMissing?: MissingInput[]
  advanced?: boolean
  source?: SourceSpecs | null
  onSourceChange?: (next: SourceSpecs) => void
  onChange: (role: GearRole, pick: GearPick) => void
}

const TILE_COPY: Record<GearRole, { title: string; action: string; plural: string }> = {
  amp: { title: 'Amplifier', action: 'Change amplifier', plural: 'amplifiers' },
  speakers: { title: 'Speakers (pair)', action: 'Change speakers', plural: 'speakers' },
}

const cardClass = 'rounded-xl border border-[var(--border-subtle)] bg-[var(--background-primary)]'

function pickName(pick: GearPick): string {
  return pick.kind === 'catalog'
    ? `${pick.item.brand} ${pick.item.name}`
    : [pick.brand, pick.name].filter(Boolean).join(' ')
}

function GearTile({
  role,
  pick,
  note,
  catalogCount,
  missing,
  softMissing,
  advanced,
  open,
  onToggle,
  onEdit,
}: {
  role: GearRole
  pick: GearPick | null
  note?: string | null
  catalogCount?: number | null
  missing: MissingInput[]
  softMissing: MissingInput[]
  advanced: boolean
  open: boolean
  onToggle: () => void
  onEdit: (p: GearPick) => void
}) {
  const copy = TILE_COPY[role]
  const Icon = role === 'amp' ? SlidersHorizontal : Speaker
  // Empty count means an empty or unreachable catalog: drop the number, keep the way in.
  const browseLabel = catalogCount ? `Browse ${catalogCount} ${copy.plural}` : `Browse ${copy.plural}`

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
          <span className="text-base font-bold text-[var(--text-primary)]">{pickName(pick)}</span>
        ) : (
          <>
            <span className="text-base font-bold text-[var(--text-primary)]">Nothing chosen yet</span>
            <span className="text-sm text-[var(--text-secondary)]">
              Pick yours from our list, or type the numbers below.
            </span>
          </>
        )}
        {note && <span className="text-sm text-[var(--text-secondary)]">{note}</span>}
      </div>

      {!pick && (
        <button type="button" aria-expanded={open} onClick={onToggle} className={`${primaryButtonClass} self-start`}>
          {open ? 'Done' : browseLabel}
        </button>
      )}

      <SpecFields role={role} pick={pick} missing={missing} softMissing={softMissing} advanced={advanced} onChange={onEdit} />

      {pick && (
        <button type="button" aria-expanded={open} onClick={onToggle} className={`${secondaryButtonClass} self-start`}>
          {open ? 'Done' : copy.action}
        </button>
      )}
    </div>
  )
}

export function GearStep({
  speakers,
  amp,
  ampNote,
  catalogCounts,
  missing,
  softMissing = [],
  advanced = false,
  source = null,
  onSourceChange,
  onChange,
}: GearStepProps) {
  const [openRole, setOpenRole] = useState<GearRole | null>(null)

  const missingFor = (role: GearRole) => missing.filter((m) => m.id.startsWith(`${role}.`))
  const softFor = (prefix: string) => softMissing.filter((m) => m.id.startsWith(`${prefix}.`))
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
          <p className="m-0 text-sm text-[var(--text-secondary)]">Change any number or swap any part, and the verdict updates as you go.</p>
        </div>
      </div>

      {/* Above the tiles: they are tall, so below them the list would open off screen. */}
      {openRole && (
        <GearChooser
          key={openRole}
          role={openRole}
          current={picks[openRole]}
          onPick={(p) => choose(openRole, p)}
          onClose={() => setOpenRole(null)}
        />
      )}

      <div className="flex flex-col items-stretch gap-3 md:flex-row">
        <GearTile
          role="amp"
          pick={amp}
          note={ampNote}
          catalogCount={catalogCounts?.amp}
          missing={missingFor('amp')}
          softMissing={softFor('amp')}
          advanced={advanced}
          open={openRole === 'amp'}
          onToggle={() => toggle('amp')}
          onEdit={(p) => onChange('amp', p)}
        />
        <ArrowRight aria-hidden="true" className="h-6 w-6 flex-none self-center rotate-90 text-[var(--text-secondary)] md:rotate-0" />
        <GearTile
          role="speakers"
          pick={speakers}
          catalogCount={catalogCounts?.speakers}
          missing={missingFor('speakers')}
          softMissing={softFor('speakers')}
          advanced={advanced}
          open={openRole === 'speakers'}
          onToggle={() => toggle('speakers')}
          onEdit={(p) => onChange('speakers', p)}
        />
      </div>
      {advanced && onSourceChange && (
        <SourceTile source={source} missing={softFor('source')} onChange={onSourceChange} />
      )}
    </section>
  )
}
