'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'
import type { CheckId, CheckOutcome, GainDetail, HissDetail, Severity, SystemChecks, TonalDetail } from '@/lib/stereo/checks'
import { TONAL_CLEAR_DB, TONAL_INAUDIBLE_DB, TONAL_NOTE_DB } from '@/lib/stereo/interaction'
import { HISS_MASKED_MARGIN_DB } from '@/lib/stereo/noise'
import type { Assumption } from '@/lib/stereo/power-check'
import { WorkingTable } from './PowerResultPanel'
import { TonalShiftChart } from './TonalShiftChart'

type AnyCheck = CheckOutcome<GainDetail> | CheckOutcome<TonalDetail> | CheckOutcome<HissDetail>
type State = Severity | 'needs' | 'not_applicable'

const TITLE: Record<CheckId, string> = { gain: 'Gain', tonal: 'Tonal shift', hiss: 'Hiss' }
const PILL: Record<State, { label: string; tone: string | null }> = {
  problem: { label: 'Problem', tone: 'var(--warning)' },
  note: { label: 'Worth knowing', tone: 'var(--warning)' },
  needs: { label: 'Needs info', tone: null },
  ok: { label: 'OK', tone: 'var(--success)' },
  not_applicable: { label: 'Not checked', tone: null },
}
const ORDER: State[] = ['problem', 'note', 'needs', 'ok', 'not_applicable']

const stateOf = (c: AnyCheck): State => (c.status === 'ok' ? c.severity : c.status)

interface SystemChecksPanelProps {
  checks: SystemChecks
  /** Open and scroll to a check (from Simple mode's problem line). A new object each time. */
  revealRequest?: { id: CheckId } | null
  onEditAssumption?: (id: Assumption['id']) => void
}

function Pill({ state }: { state: State }) {
  const { label, tone } = PILL[state]
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[13px] font-semibold text-[var(--text-primary)]"
      style={
        tone
          ? { borderColor: tone, backgroundColor: `color-mix(in srgb, ${tone} ${state === 'note' ? 8 : 14}%, transparent)` }
          : { borderColor: 'var(--border-default)' }
      }
    >
      {label}
    </span>
  )
}

/** A horizontal bar with labeled markers, for the gain and hiss pictures. */
function Scale({ children, labels }: { children: ReactNode; labels: [string, string, string?] }) {
  return (
    <div aria-hidden="true" className="flex flex-col gap-1">
      <div className="relative h-2.5 rounded-full bg-[var(--background-tertiary)]">{children}</div>
      <div className="flex justify-between text-xs text-[var(--text-secondary)]">
        {labels.filter(Boolean).map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </div>
  )
}

function Picture({ id, check }: { id: CheckId; check: AnyCheck }) {
  if (check.status !== 'ok') return null
  if (id === 'tonal') {
    const d = check.detail as TonalDetail
    if (d.curve && d.peak && d.dip) return <TonalShiftChart points={d.curve} peak={d.peak} dip={d.dip} />
    const max = 4
    const at = (db: number) => `${(Math.min(db, max) / max) * 100}%`
    return (
      <Scale labels={[`0 · under ${TONAL_INAUDIBLE_DB} no change`, `${TONAL_NOTE_DB} noticeable · ${TONAL_CLEAR_DB} clear`, `${max} dB`]}>
        <div className="absolute inset-y-0 left-0 rounded-l-full bg-[var(--success)] opacity-30" style={{ width: at(TONAL_INAUDIBLE_DB) }} />
        <div className="absolute inset-y-0 left-0 rounded-full bg-[var(--accent-hover)]" style={{ width: at(d.spanDb) }} />
        {d.isLowerBound && (
          <div
            className="absolute inset-y-0 rounded-r-full"
            style={{
              left: at(d.spanDb),
              right: 0,
              background: 'repeating-linear-gradient(135deg, var(--accent-hover) 0 3px, transparent 3px 6px)',
              opacity: 0.5,
            }}
          />
        )}
      </Scale>
    )
  }
  if (id === 'gain') {
    const d = check.detail as GainDetail
    const share = Math.min(1, d.reachableWatts / d.ampWatts)
    return (
      <Scale labels={['0 W', `Reachable ${Math.round(d.reachableWatts)} W`, `Rated ${Math.round(d.ampWatts)} W`]}>
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${share * 100}%`, backgroundColor: d.limited ? 'var(--warning)' : 'var(--success)' }}
        />
      </Scale>
    )
  }
  const d = check.detail as HissDetail
  const max = 50
  const at = (db: number) => `${(Math.max(0, Math.min(db, max)) / max) * 100}%`
  return (
    <Scale labels={['0 dB', `Quiet room ${d.backgroundDba} dBA`, `${max} dB`]}>
      <div
        className="absolute inset-y-0 left-0 rounded-l-full bg-[var(--success)] opacity-30"
        style={{ width: at(d.backgroundDba - HISS_MASKED_MARGIN_DB) }}
      />
      <div className="absolute -top-1 h-[18px] w-0.5 bg-[var(--text-secondary)]" style={{ left: at(d.backgroundDba) }} />
      <div className="absolute -top-1.5 h-[22px] w-1 rounded-sm bg-[var(--text-primary)]" style={{ left: at(d.hissDb.inRoom) }} />
    </Scale>
  )
}

/** Advanced mode's other checks, one card each, problems first. */
export function SystemChecksPanel({ checks, revealRequest = null, onEditAssumption }: SystemChecksPanelProps) {
  const entries = (['gain', 'tonal', 'hiss'] as const)
    .map((id) => ({ id, check: checks[id] as AnyCheck, state: stateOf(checks[id] as AnyCheck) }))
    .sort((a, b) => ORDER.indexOf(a.state) - ORDER.indexOf(b.state))
  const [open, setOpen] = useState<Set<CheckId>>(() => new Set(entries.filter((e) => e.state === 'problem').map((e) => e.id)))
  const refs = useRef<Partial<Record<CheckId, HTMLDetailsElement | null>>>({})
  const [seen, setSeen] = useState(revealRequest)
  if (revealRequest !== seen) {
    setSeen(revealRequest)
    if (revealRequest) setOpen((o) => new Set(o).add(revealRequest.id))
  }
  useEffect(() => {
    if (revealRequest) refs.current[revealRequest.id]?.scrollIntoView?.({ block: 'start', behavior: 'smooth' })
  }, [revealRequest])

  const counts = ORDER.map((s) => [s, entries.filter((e) => e.state === s).length] as const).filter(([, n]) => n > 0)

  return (
    <section aria-labelledby="stereo-system-checks" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="stereo-system-checks" className="m-0 text-lg font-bold text-[var(--text-primary)]">
          System checks
        </h2>
        <span className="text-xs text-[var(--text-secondary)]">
          {counts.map(([s, n]) => `${n} ${PILL[s].label.toLowerCase()}`).join(' · ')}
        </span>
      </div>
      {entries.map(({ id, check, state }) => {
        const isOpen = open.has(id)
        const tone = PILL[state].tone
        return (
          <details
            key={id}
            ref={(el) => {
              refs.current[id] = el
            }}
            open={isOpen}
            onToggle={(e) => {
              const now = (e.currentTarget as HTMLDetailsElement).open
              if (now !== isOpen) {
                setOpen((o) => {
                  const next = new Set(o)
                  if (now) next.add(id)
                  else next.delete(id)
                  return next
                })
              }
            }}
            className={`rounded-xl border bg-[var(--background-primary)] px-5 py-1 ${state === 'needs' || state === 'not_applicable' ? 'border-dashed' : ''}`}
            style={{ borderColor: state === 'problem' && tone ? tone : 'var(--border-subtle)' }}
          >
            <summary className="flex min-h-[52px] cursor-pointer list-none flex-wrap items-center gap-2.5">
              <span className="font-bold text-[var(--text-primary)]">{TITLE[id]}</span>
              <Pill state={state} />
              {!isOpen && check.status === 'ok' && (
                <span className="text-sm text-[var(--text-secondary)]">{check.headline}</span>
              )}
            </summary>
            <div className="flex flex-col gap-3 pb-4">
              {check.status === 'not_applicable' && <p className="m-0 text-sm text-[var(--text-secondary)]">{check.reason}</p>}
              {check.status === 'needs' && (
                <div className="flex flex-col gap-1.5 text-sm text-[var(--text-primary)]">
                  <p className="m-0">
                    Add {check.missing.map((m) => m.label.toLowerCase()).join(' and ')} to check this. It never changes the
                    power result.
                  </p>
                  {check.missing.map((m) => (
                    <p key={m.id} className="m-0 text-[var(--text-secondary)]">
                      {m.hint}
                    </p>
                  ))}
                </div>
              )}
              {check.status === 'ok' && (
                <>
                  <p className="m-0 text-base font-semibold leading-snug text-[var(--text-primary)]">{check.headline}</p>
                  <Picture id={id} check={check} />
                  {check.notes.length > 0 && (
                    <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
                      {check.notes.map((n) => (
                        <li key={n} className="text-sm leading-normal text-[var(--text-secondary)]">
                          {n}
                        </li>
                      ))}
                    </ul>
                  )}
                  {check.assumptions.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {check.assumptions.map((a) =>
                        onEditAssumption ? (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => onEditAssumption(a.id)}
                            className="min-h-11 rounded-full border border-dashed border-[var(--accent-hover)] bg-[var(--background-primary)] px-3.5 text-left text-sm text-[var(--text-primary)]"
                          >
                            {a.text} · <span className="font-semibold text-[var(--accent-hover)]">Change</span>
                          </button>
                        ) : (
                          <span
                            key={a.id}
                            className="inline-flex min-h-11 items-center rounded-full border border-dashed border-[var(--border-subtle)] px-3.5 text-sm text-[var(--text-primary)]"
                          >
                            {a.text}
                          </span>
                        ),
                      )}
                    </div>
                  )}
                  <details>
                    <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-[var(--accent-hover)]">
                      How we worked this out
                    </summary>
                    <WorkingTable rows={check.working} caption={`${TITLE[id]} working`} />
                  </details>
                </>
              )}
            </div>
          </details>
        )
      })}
    </section>
  )
}
