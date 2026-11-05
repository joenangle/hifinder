'use client'

import { Waves } from 'lucide-react'
import { MUSIC_PEAK_ALLOWANCE_DB, averageFromPeak } from '@/lib/stereo/power'
import { tierFor } from '@/lib/stereo/power-check'
import { SPEC_RANGES } from '@/lib/stereo/specs'
import { DecimalInput } from './form-bits'

interface LoudnessSliderProps {
  /** Average level at the seat. The model works in peaks; the page converts at the edge. */
  valueDb: number
  onChange: (db: number) => void
}

const RANGE = [
  averageFromPeak(SPEC_RANGES.target_peak_db[0]),
  averageFromPeak(SPEC_RANGES.target_peak_db[1]),
] as const
const [MIN_DB, MAX_DB] = RANGE
const TICKS = [55, 65, 75, 85, 95] as const

export function LoudnessSlider({ valueDb, onChange }: LoudnessSliderProps) {
  const tier = tierFor(valueDb)

  return (
    <section
      aria-label="Step 3: How loud you listen"
      className="flex flex-col gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--background-primary)] p-5"
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[var(--text-primary)] text-sm font-bold text-[var(--background-primary)]"
        >
          3
        </span>
        <h2 className="m-0 text-xl font-bold text-[var(--text-primary)]">How loud you listen</h2>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-secondary)]">Average volume</span>
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="flex items-baseline gap-1.5">
            <DecimalInput
              aria-label="Average volume at your seat, in dB"
              value={valueDb}
              range={RANGE}
              clampOnBlur
              onCommit={(db) => onChange(Math.round(db))}
              className="min-h-11 w-[72px] border-0 bg-transparent text-right text-[28px] font-bold text-[var(--text-primary)]"
            />
            <span className="text-base text-[var(--text-secondary)]">dB</span>
          </span>
          <span className="text-xl font-bold text-[var(--accent-hover)]">{tier.label}</span>
        </div>
        <span className="text-sm text-[var(--text-secondary)]">{tier.feel}</span>
      </div>

      <div className="flex flex-col gap-1">
        <input
          type="range"
          min={MIN_DB}
          max={MAX_DB}
          step={1}
          value={valueDb}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Average volume at your seat"
          aria-valuetext={`${valueDb} dB, ${tier.label}`}
          className="m-0 min-h-11 w-full cursor-pointer accent-[var(--accent-hover)]"
        />
        <div aria-hidden="true" className="relative h-5 text-xs text-[var(--text-secondary)]">
          {TICKS.map((t) => (
            <span
              key={t}
              className="absolute -translate-x-1/2"
              style={{ left: `${((t - MIN_DB) / (MAX_DB - MIN_DB)) * 100}%` }}
            >
              {t}
            </span>
          ))}
        </div>
        <div className="mt-2 flex items-start gap-2 text-sm leading-normal text-[var(--text-secondary)]">
          <Waves aria-hidden="true" className="mt-0.5 h-4 w-4 flex-none text-[var(--accent-hover)]" />
          <span>
            This is the average level at your seat. Music peaks run about {MUSIC_PEAK_ALLOWANCE_DB} dB higher, more for
            jazz and classical, and we size the amp for those peaks. Every +10 dB sounds about twice as loud and takes
            10× the amp power.
          </span>
        </div>
      </div>
    </section>
  )
}
