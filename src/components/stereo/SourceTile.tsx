'use client'

import { Disc3 } from 'lucide-react'
import type { MissingInput } from '@/lib/stereo/power-check'
import { SOURCE_PRESET_V, SPEC_RANGES, type SourceKind, type SourceSpecs } from '@/lib/stereo/specs'
import { userValue } from './GearChooser'
import { AdvancedTag, DecimalInput, fieldLabelClass, inputClass } from './form-bits'

const PRESETS: readonly { kind: SourceKind; label: string }[] = [
  { kind: 'dac', label: 'DAC or streamer (2 V)' },
  { kind: 'dac_balanced', label: 'Balanced DAC (4 V)' },
  { kind: 'phono', label: 'Phono stage' },
  { kind: 'preamp', label: 'Preamp' },
]

const NAME: Record<SourceKind, string> = {
  dac: 'DAC or streamer',
  dac_balanced: 'Balanced DAC',
  phono: 'Phono stage',
  preamp: 'Preamp',
  other: 'Source',
}

interface SourceTileProps {
  source: SourceSpecs | null
  /** The gain check's soft needs (only the source output belongs here). */
  missing: MissingInput[]
  onChange: (next: SourceSpecs) => void
}

/** The source feeding the amp, for the gain check. Hand-entered only: there is no source catalog. */
export function SourceTile({ source, missing, onChange }: SourceTileProps) {
  const s = source ?? {}
  const needOutput = missing.find((m) => m.id === 'source.output_v')

  function choose(kind: SourceKind) {
    const preset = SOURCE_PRESET_V[kind]
    // A preset sets its typical voltage; phono output varies too much to preset, so it asks instead.
    const output_v = preset !== undefined ? userValue(preset) : kind === 'phono' ? undefined : s.output_v
    onChange({ ...s, kind, output_v })
  }

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--background-primary)] p-4">
      <div className="flex items-center gap-2.5">
        <Disc3 aria-hidden="true" className="h-6 w-6 text-[var(--accent-hover)]" />
        <span className="text-xs font-semibold uppercase tracking-[0.06em] text-[var(--text-secondary)]">
          Source
          <AdvancedTag />
        </span>
      </div>
      <div className="flex flex-col gap-0.5">
        <span className="text-base font-bold text-[var(--text-primary)]">{s.kind ? NAME[s.kind] : 'No source yet'}</span>
        <span className="text-sm text-[var(--text-secondary)]">
          {s.kind ? 'Entered by you' : 'Add what feeds the amp to check it can drive it to full power.'}
        </span>
      </div>
      <div role="group" aria-label="Source type" className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.kind}
            type="button"
            aria-pressed={s.kind === p.kind}
            onClick={() => choose(p.kind)}
            className={`min-h-11 rounded-full border px-3.5 text-sm text-[var(--text-primary)] ${
              s.kind === p.kind
                ? 'border-[var(--text-primary)] font-semibold shadow-[inset_0_0_0_1px_var(--text-primary)]'
                : 'border-[var(--border-subtle)] bg-[var(--background-primary)]'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 items-end gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <label className={fieldLabelClass}>
            Maximum output (V)
            <DecimalInput
              value={s.output_v?.value ?? null}
              range={SPEC_RANGES.source_output_v}
              placeholder="e.g. 2"
              onCommit={(n) => onChange({ ...s, output_v: userValue(n) })}
              aria-describedby="stereo-source-output-help"
              className={`${inputClass} ${needOutput ? '!border-dashed !border-[var(--text-secondary)]' : ''}`}
            />
          </label>
          <span id="stereo-source-output-help" className="text-xs leading-snug text-[var(--text-secondary)]">
            {needOutput ? `Add to check gain. ${needOutput.hint}` : s.output_v ? 'Your entry' : 'On the spec sheet as maximum output.'}
          </span>
        </div>
        <label className="flex min-h-11 items-center gap-2.5 text-[15px] text-[var(--text-primary)]">
          <input
            type="checkbox"
            className="h-[18px] w-[18px]"
            checked={s.has_volume === true}
            onChange={(e) => onChange({ ...s, has_volume: e.target.checked })}
          />
          Has its own volume control
        </label>
      </div>
    </div>
  )
}
