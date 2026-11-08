import { createParser, parseAsFloat, parseAsInteger, parseAsJson, parseAsString } from 'nuqs'
import {
  applyOverrides,
  DEFAULT_TARGET_PEAK_DB,
  parseSourceSpecs,
  parseSpeakerAmpSpecs,
  parseSpeakerSpecs,
  parseSystemProfile,
  SPEC_RANGES,
  type SourceSpecs,
  type SpeakerAmpSpecs,
  type SpeakerSpecs,
  type SystemProfile,
} from './specs'

// URL state for anonymous (not signed in) stereo systems. Only specs are
// stored for custom gear; custom brand and name are not carried in the URL.

const [PEAK_MIN, PEAK_MAX] = SPEC_RANGES.target_peak_db

const parseAsTargetPeak = createParser({
  parse(value: string): number | null {
    const n = parseInt(value, 10)
    if (!Number.isFinite(n)) return null
    return Math.min(PEAK_MAX, Math.max(PEAK_MIN, n))
  },
  serialize(value: number): string {
    return String(value)
  },
})

// Hand-entered specs are user entries whatever the JSON claims: running them
// through applyOverrides stamps trust: 'user' on every value, so a crafted URL
// cannot present itself as measured. Junk parses to {}.
const parseAsSpeakerSpecs = parseAsJson<SpeakerSpecs>((json) =>
  applyOverrides({}, json, parseSpeakerSpecs)
)
const parseAsAmpSpecs = parseAsJson<SpeakerAmpSpecs>((json) =>
  applyOverrides({}, json, parseSpeakerAmpSpecs)
)
const parseAsSourceSpecs = parseAsJson<SourceSpecs>((json) => applyOverrides({}, json, parseSourceSpecs))

/** `adv=1` turns on Advanced mode; anything else reads as off. */
const parseAsAdvanced = createParser({
  parse: (value: string) => value === '1',
  serialize: (value: boolean) => (value ? '1' : '0'),
})

export const stereoParams = {
  /** Catalog speaker and amp ids */
  spk: parseAsString,
  amp: parseAsString,
  /** Hand-entered speaker and amp specs */
  sx: parseAsSpeakerSpecs.withDefault({}).withOptions({ clearOnDefault: true }),
  ax: parseAsAmpSpecs.withDefault({}).withOptions({ clearOnDefault: true }),
  /** Hand-entered source specs (sources are never catalog items) */
  srx: parseAsSourceSpecs.withDefault({}).withOptions({ clearOnDefault: true }),
  /** Advanced mode */
  adv: parseAsAdvanced.withDefault(false).withOptions({ clearOnDefault: true }),
  /** Speaker cable length per side (m) and gauge (AWG), validated by profileFromParams */
  cl: parseAsFloat,
  cg: parseAsInteger,
  /** Room preset id, acoustics (validated by profileFromParams) */
  rp: parseAsString,
  ac: parseAsString,
  /** Room length, width, height (m) and listening distance (m) */
  l: parseAsFloat,
  w: parseAsFloat,
  h: parseAsFloat,
  d: parseAsFloat,
  /** Target peak level (dB), clamped 60-115 */
  db: parseAsTargetPeak
    .withDefault(DEFAULT_TARGET_PEAK_DB)
    .withOptions({ clearOnDefault: true }),
}

export interface StereoUrlParams {
  rp: string | null
  ac: string | null
  l: number | null
  w: number | null
  h: number | null
  d: number | null
  db: number
  cl?: number | null
  cg?: number | null
}

/** Build a SystemProfile from URL params; out-of-range or unknown values become null. */
export function profileFromParams(p: StereoUrlParams): SystemProfile {
  return parseSystemProfile({
    room:
      p.l !== null && p.w !== null && p.h !== null
        ? { length_m: p.l, width_m: p.w, height_m: p.h }
        : null,
    room_preset: p.rp,
    acoustics: p.ac,
    distance_m: p.d,
    target_peak_db: p.db,
    cable: p.cl != null || p.cg != null ? { length_m: p.cl ?? null, awg: p.cg ?? null } : null,
  })
}
