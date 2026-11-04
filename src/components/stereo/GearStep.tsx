'use client'

import { useState } from 'react'
import { ArrowRight, SlidersHorizontal, Speaker } from 'lucide-react'
import type { MissingInput } from '@/lib/stereo/power-check'
import { GearChooser, type GearPick, type GearRole } from './GearChooser'
import { SpecFields } from './SpecFields'
import { secondaryButtonClass } from './form-bits'

export type { GearPick } from './GearChooser'

interface GearStepProps {
  speakers: GearPick | null
  amp: GearPick | null
  ampNote: string | null
  missing: MissingInput[]
  onChange: (role: GearRole, pick: GearPick) => void
}

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

function GearTile({
  role,
  pick,
  note,
  missing,
  open,
  onToggle,
  onEdit,
}: {
  role: GearRole
  pick: GearPick | null
  note?: string | null
  missing: MissingInput[]
  open: boolean
  onToggle: () => void
  onEdit: (p: GearPick) => void
}) {
  const copy = TILE_COPY[role]
  const Icon = role === 'amp' ? SlidersHorizontal : Speaker

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
              Pick from the catalog, or type the numbers below.
            </span>
          </>
        )}
        {note && <span className="text-sm text-[var(--text-secondary)]">{note}</span>}
      </div>

      <SpecFields role={role} pick={pick} missing={missing} onChange={onEdit} />

      <button type="button" aria-expanded={open} onClick={onToggle} className={`${secondaryButtonClass} self-start`}>
        {open ? 'Done' : copy.action}
      </button>
    </div>
  )
}

export function GearStep({ speakers, amp, ampNote, missing, onChange }: GearStepProps) {
  const [openRole, setOpenRole] = useState<GearRole | null>(null)

  const missingFor = (role: GearRole) => missing.filter((m) => m.id.startsWith(`${role}.`))
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

      <div className="flex flex-col items-stretch gap-3 md:flex-row">
        <GearTile
          role="amp"
          pick={amp}
          note={ampNote}
          missing={missingFor('amp')}
          open={openRole === 'amp'}
          onToggle={() => toggle('amp')}
          onEdit={(p) => onChange('amp', p)}
        />
        <ArrowRight aria-hidden="true" className="h-6 w-6 flex-none self-center rotate-90 text-[var(--text-secondary)] md:rotate-0" />
        <GearTile
          role="speakers"
          pick={speakers}
          missing={missingFor('speakers')}
          open={openRole === 'speakers'}
          onToggle={() => toggle('speakers')}
          onEdit={(p) => onChange('speakers', p)}
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
