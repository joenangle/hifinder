import { Check, AlertTriangle } from 'lucide-react'
import { averageFromPeak } from '@/lib/stereo/power'
import { tierFor, type Assumption, type LimitedBy, type PowerCheckOutcome, type WorkingRow } from '@/lib/stereo/power-check'
import type { VerdictKind } from '@/lib/stereo/power'

interface PowerResultPanelProps {
  outcome: PowerCheckOutcome
  targetPeakDb: number
  distanceM: number | null
  onEditAssumption?: (id: Assumption['id']) => void
  /** Simple mode: the single worst problem from the other checks, if any (decision D3). */
  problemLine?: string | null
  /** Open Advanced mode at that check. */
  onShowProblem?: () => void
}

const LIMITED_BY: Record<LimitedBy, string> = {
  amp: 'the amp',
  speakers: 'your speakers',
  source: 'your source',
}

/** The working behind a result: step, value and where each number came from. Shared by every check. */
export function WorkingTable({ rows, caption }: { rows: WorkingRow[]; caption?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-[var(--border-subtle)] text-xs uppercase tracking-[0.05em] text-[var(--text-secondary)]">
            <th scope="col" className="py-2.5 pr-3 font-semibold">Step</th>
            <th scope="col" className="py-2.5 pr-3 font-semibold">Value</th>
            <th scope="col" className="py-2.5 font-semibold">Source</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.step} className="border-b border-[var(--border-subtle)] align-top">
              <td className="py-3 pr-3 text-[var(--text-primary)]">{row.step}</td>
              <td className="py-3 pr-3 text-[var(--text-primary)]">{row.value}</td>
              <td className="py-3 text-[var(--text-secondary)]">{TRUST_LABEL[row.trust]}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// The meter reads in average dB, like the slider.
const METER_MIN_DB = 45
const METER_MAX_DB = 95

const TRUST_LABEL: Record<WorkingRow['trust'], string> = {
  measured: 'Measured',
  claimed: 'Manufacturer spec',
  user: 'Your entry',
  assumed: 'Assumed',
  modeled: 'Modeled',
}

const NEEDS_TITLE = 'We need your speakers\' sensitivity.'

const cardClass = 'rounded-xl border bg-[var(--background-primary)] border-[var(--border-subtle)]'
const eyebrowClass = 'text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]'

const pct = (db: number) => {
  const clamped = Math.min(METER_MAX_DB, Math.max(METER_MIN_DB, db))
  return ((clamped - METER_MIN_DB) / (METER_MAX_DB - METER_MIN_DB)) * 100
}

function dbRange({ low, high }: { low: number; high: number }): string {
  const [a, b] = [Math.round(low), Math.round(high)]
  return a === b ? String(a) : `${a}–${b}`
}

function isComfortable(kind: VerdictKind) {
  return kind === 'comfortable' || kind === 'comfortable_most_rooms'
}

function headlineFor(
  kind: VerdictKind,
  headroomInRoomDb: number,
  averages: { low: number; high: number }
): string {
  const spare = `About ${Math.round(headroomInRoomDb)} dB to spare at your seat.`
  switch (kind) {
    case 'comfortable':
      return spare
    case 'comfortable_most_rooms':
      return `${spare} It could run short if your room helps less than estimated.`
    case 'tight':
      return 'Under 3 dB to spare. Peaks will push this amp to its limit.'
    case 'runs_out':
      return `About ${Math.max(1, Math.round(-headroomInRoomDb))} dB short. It tops out around ${dbRange(averages)} dB average at your seat.`
  }
}

function Caveat({ children }: { children: string }) {
  return (
    <p className="m-0 rounded-lg bg-[var(--background-secondary)] px-3.5 py-3 text-sm leading-normal text-[var(--text-secondary)]">
      {children}
    </p>
  )
}

function ListeningColumn() {
  return (
    <section aria-labelledby="listeners-heading" className={`${cardClass} flex flex-col gap-2.5 px-6 py-5`}>
      <h2 id="listeners-heading" className="m-0 text-base font-bold text-[var(--text-primary)]">
        What listeners report
      </h2>
      <p className="m-0 text-sm leading-normal text-[var(--text-secondary)]">
        No linked reviews for this pairing yet. Listening reports are kept separate from the numbers above and never
        change the verdict.
      </p>
    </section>
  )
}

export function PowerResultPanel({
  outcome,
  targetPeakDb,
  distanceM,
  onEditAssumption,
  problemLine = null,
  onShowProblem,
}: PowerResultPanelProps) {
  if (outcome.status === 'needs') {
    const first = outcome.missing[0]
    const headline =
      first.id === 'speakers.sensitivity_db' ? NEEDS_TITLE : `We need ${first.label.toLowerCase()}.`
    return (
      <div className="flex flex-col gap-4">
        <div className={`${cardClass} flex flex-col gap-3.5 border-2 border-[var(--text-primary)] p-6`}>
          <span className={eyebrowClass}>Result for this system</span>
          <span className="self-start rounded-full border border-[var(--border-subtle)] bg-[var(--background-secondary)] px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)]">
            No verdict yet
          </span>
          <p className="m-0 text-[22px] font-bold leading-snug text-[var(--text-primary)]">{headline}</p>
          <p className="m-0 text-sm leading-normal text-[var(--text-secondary)]">
            It changes the answer by several dB, so we won&apos;t guess it.
          </p>
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {outcome.missing.map((m) => (
              <li key={m.id} className="text-sm leading-normal text-[var(--text-secondary)]">
                <span className="font-semibold text-[var(--text-primary)]">{m.label}</span>
                <span className="block">{m.hint}</span>
              </li>
            ))}
          </ul>
          <Caveat>{outcome.caveat}</Caveat>
        </div>
        <ListeningColumn />
      </div>
    )
  }

  const { verdict, reasons, notes, caveat, assumptions, working, sensitivityRange, limitedBy } = outcome
  const comfortable = isComfortable(verdict.kind)
  const tone = comfortable ? 'var(--success)' : 'var(--warning)'
  const peaks = verdict.maxCleanPeakDb
  const averages = { low: averageFromPeak(peaks.low), high: averageFromPeak(peaks.high) }
  const targetAverageDb = Math.round(averageFromPeak(targetPeakDb))
  const bandLeft = pct(averages.low)
  const bandWidth = Math.max(pct(averages.high) - bandLeft, 1)
  const VerdictIcon = comfortable ? Check : AlertTriangle

  return (
    <div className="flex flex-col gap-4">
      <div className={`${cardClass} flex flex-col gap-[18px] border-2 border-[var(--text-primary)] p-6`}>
        <div className="flex flex-col gap-1">
          <span className={eyebrowClass}>Result for this system</span>
          {distanceM !== null && (
            <span className="text-[13px] text-[var(--text-secondary)]">At {Number(distanceM.toFixed(1))} m from the speakers</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <span
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold text-[var(--text-primary)]"
            style={{
              borderColor: tone,
              backgroundColor: `color-mix(in srgb, ${tone} 16%, transparent)`,
            }}
          >
            <VerdictIcon aria-hidden="true" className="h-4 w-4" />
            {verdict.label}
          </span>
          <span className="text-[13px] text-[var(--text-secondary)]">
            Target: {tierFor(targetAverageDb).label} · {targetAverageDb} dB average at your seat
          </span>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className="m-0 text-[28px] font-bold leading-tight text-[var(--text-primary)]">
            {headlineFor(verdict.kind, verdict.headroomInRoomDb, averages)}
          </p>
          {assumptions.length > 0 && (
            <p className="m-0 text-sm text-[var(--text-secondary)]">Based on assumed values below.</p>
          )}
          {sensitivityRange && (
            <p className="m-0 text-sm text-[var(--text-secondary)]">
              Sensitivity reference not stated, so this shows the worse case.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <span className={eyebrowClass}>Max volume without clipping</span>
            <span className="text-2xl font-bold text-[var(--text-primary)]">About {dbRange(averages)} dB average</span>
            <span className="text-sm text-[var(--text-secondary)]">
              With clean peaks of {dbRange(peaks)} dB at your seat · Your target: {targetAverageDb} dB average
            </span>
            <span className="text-sm text-[var(--text-secondary)]">
              Limited by: <strong className="font-semibold text-[var(--text-primary)]">{LIMITED_BY[limitedBy]}</strong>
            </span>
          </div>
          <div data-testid="power-meter" aria-hidden="true" className="relative h-10">
            <div className="absolute inset-x-0 top-4 h-2 rounded-full bg-[var(--background-secondary)] ring-1 ring-[var(--border-subtle)]" />
            <div
              className="absolute top-4 h-2 rounded-full"
              style={{ left: `${bandLeft}%`, width: `${bandWidth}%`, backgroundColor: tone }}
            />
            <div
              className="absolute top-1.5 h-7 w-[3px] rounded-sm bg-[var(--text-primary)]"
              style={{ left: `${pct(targetAverageDb)}%` }}
            />
          </div>
          <div aria-hidden="true" className="flex justify-between text-xs text-[var(--text-secondary)]">
            <span>{METER_MIN_DB} dB</span>
            <span>{METER_MAX_DB} dB</span>
          </div>
        </div>

        <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
          {reasons.map((r) => (
            <li key={r} className="flex items-start gap-2.5 text-[15px] leading-normal text-[var(--text-primary)]">
              <span
                aria-hidden="true"
                className="mt-2 h-1.5 w-1.5 flex-none rounded-full bg-[var(--text-secondary)]"
              />
              <span>{r}</span>
            </li>
          ))}
        </ul>

        {notes.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-1.5 p-0">
            {notes.map((n) => (
              <li key={n} className="text-sm leading-normal text-[var(--text-secondary)]">
                {n}
              </li>
            ))}
          </ul>
        )}

        {problemLine && (
          <button
            type="button"
            onClick={onShowProblem}
            className="flex min-h-11 items-start gap-2.5 rounded-lg border border-[var(--warning)] px-3.5 py-3 text-left text-sm leading-normal text-[var(--text-primary)]"
            style={{ backgroundColor: 'color-mix(in srgb, var(--warning) 10%, transparent)' }}
          >
            <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 flex-none" />
            <span>
              {problemLine} <span className="font-semibold text-[var(--accent-hover)] underline">See it in Advanced</span>
            </span>
          </button>
        )}

        {caveat && <Caveat>{caveat}</Caveat>}

        {assumptions.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[13px] font-semibold text-[var(--text-secondary)]">We assumed</span>
            <div className="flex flex-wrap gap-2">
              {assumptions.map((a) =>
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
                )
              )}
            </div>
          </div>
        )}
      </div>

      <details open className={`${cardClass} px-6 py-3`}>
        <summary className="flex min-h-11 cursor-pointer items-center text-base font-bold text-[var(--text-primary)]">
          Summary Table
        </summary>
        <div className="pb-5">
          <WorkingTable rows={working} />
        </div>
      </details>

      <ListeningColumn />
    </div>
  )
}
