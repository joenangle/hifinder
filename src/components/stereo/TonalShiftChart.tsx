import { TONAL_INAUDIBLE_DB, type DeviationPoint } from '@/lib/stereo/interaction'

// Fixed scale, never autoscaled, so a 0.3 dB wiggle can't look dramatic.
const RANGE_DB = 3
const MIN_HZ = 20
const MAX_HZ = 20000
const W = 520
const H = 160
const LEFT = 44
const TOP = 16

const x = (hz: number) => {
  const f = Math.min(MAX_HZ, Math.max(MIN_HZ, hz))
  return LEFT + ((Math.log10(f) - Math.log10(MIN_HZ)) / (Math.log10(MAX_HZ) - Math.log10(MIN_HZ))) * W
}
const y = (db: number) => TOP + ((RANGE_DB - Math.max(-RANGE_DB, Math.min(RANGE_DB, db))) / (2 * RANGE_DB)) * H
const fmtHz = (hz: number) => (hz >= 1000 ? `${Number((hz / 1000).toFixed(1))} kHz` : `${Math.round(hz)} Hz`)
const signed = (db: number) => `${db >= 0 ? '+' : '−'}${Math.abs(db).toFixed(1)} dB`

const TICKS = [
  { hz: 20, label: '20' },
  { hz: 100, label: '100' },
  { hz: 1000, label: '1k' },
  { hz: 10000, label: '10k' },
  { hz: 20000, label: '20k Hz' },
]

/** Predicted response change across frequency, with a table carrying the same data. */
export function TonalShiftChart({ points, peak, dip }: { points: DeviationPoint[]; peak: DeviationPoint; dip: DeviationPoint }) {
  const band = TONAL_INAUDIBLE_DB / 2
  const summary = `Predicted change in frequency response with this amp, 20 Hz to 20 kHz: highest ${signed(peak.db)} near ${fmtHz(peak.hz)}, lowest ${signed(dip.db)} near ${fmtHz(dip.hz)}.`
  return (
    <figure className="m-0 flex flex-col gap-1.5">
      <svg role="img" aria-label={summary} viewBox={`0 0 ${LEFT + W + 16} ${TOP + H + 28}`} className="block w-full">
        <rect x={LEFT} y={y(band)} width={W} height={y(-band) - y(band)} fill="var(--success)" opacity="0.14" />
        <line x1={LEFT} y1={y(0)} x2={LEFT + W} y2={y(0)} stroke="var(--border-default)" />
        <line x1={LEFT} y1={TOP} x2={LEFT} y2={TOP + H} stroke="var(--border-default)" />
        <line x1={LEFT} y1={TOP + H} x2={LEFT + W} y2={TOP + H} stroke="var(--border-default)" />
        {[RANGE_DB, 0, -RANGE_DB].map((db) => (
          <text key={db} x={LEFT - 6} y={y(db) + 4} fontSize="10" textAnchor="end" fill="var(--text-secondary)">
            {db > 0 ? `+${db}` : db === 0 ? '0' : `−${-db} dB`}
          </text>
        ))}
        {TICKS.map((t) => (
          <text
            key={t.hz}
            x={x(t.hz)}
            y={TOP + H + 16}
            fontSize="10"
            textAnchor={t.hz === MAX_HZ ? 'end' : 'middle'}
            fill="var(--text-secondary)"
          >
            {t.label}
          </text>
        ))}
        <text x={LEFT + W - 6} y={y(band) - 5} fontSize="10" textAnchor="end" fill="var(--text-secondary)">
          Below audibility
        </text>
        <polyline
          fill="none"
          stroke="var(--accent-hover)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          points={points.map((p) => `${x(p.hz).toFixed(1)},${y(p.db).toFixed(1)}`).join(' ')}
        />
        {[peak, dip].map((p) => (
          <g key={p.hz}>
            <circle cx={x(p.hz)} cy={y(p.db)} r="4" fill="var(--accent-hover)" />
            <text x={x(p.hz) + 7} y={y(p.db) + (p === peak ? -6 : 14)} fontSize="11" fontWeight="600" fill="var(--text-primary)">
              {signed(p.db)}
            </text>
          </g>
        ))}
      </svg>
      <figcaption className="text-xs text-[var(--text-secondary)]">
        From the speakers&apos; impedance curve and the amp&apos;s output impedance plus your cable. Fixed ±{RANGE_DB} dB scale.
      </figcaption>
      <details>
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-semibold text-[var(--accent-hover)]">
          Chart data as a table
        </summary>
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--border-subtle)] text-xs uppercase tracking-[0.05em] text-[var(--text-secondary)]">
              <th scope="col" className="py-2 pr-3 font-semibold">Frequency</th>
              <th scope="col" className="py-2 font-semibold">Change</th>
            </tr>
          </thead>
          <tbody>
            {points.map((p) => (
              <tr key={p.hz} className="border-b border-[var(--border-subtle)]">
                <td className="py-2 pr-3 text-[var(--text-primary)]">{fmtHz(p.hz)}</td>
                <td className="py-2 text-[var(--text-primary)]">{signed(p.db)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  )
}
