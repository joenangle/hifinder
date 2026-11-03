// Stereo Builder spec and profile types, plus tolerant parsers.
// Parsers are total: unknown or malformed input never throws; invalid fields
// are dropped (specs) or nulled (profile). Ranges are inclusive.

export type Trust = 'measured' | 'claimed' | 'user' | 'assumed'
export interface SpecValue<T> {
  value: T
  trust: Trust
  source_url?: string | null
}

export type SensitivityRef = '1W' | '2.83V' | 'unknown'
export interface ReviewLink {
  outlet: string
  url: string
  kind: 'measurement' | 'listening' | 'pairing'
}

export interface SpeakerSpecs {
  sensitivity_db?: SpecValue<number>
  sensitivity_ref?: SpecValue<SensitivityRef>
  nominal_impedance_ohms?: SpecValue<number>
  min_impedance_ohms?: SpecValue<number>
  f3_hz?: SpecValue<number>
  directivity_q?: SpecValue<number>
  review_links?: ReviewLink[]
}

export type PowerRatingKind = 'continuous' | 'peak' | 'unknown'
export interface SpeakerAmpSpecs {
  subtype?: 'integrated' | 'power' | 'receiver'
  power_w_8ohm?: SpecValue<number>
  power_w_4ohm?: SpecValue<number>
  power_rating?: {
    kind: PowerRatingKind
    thd_pct?: number
    channels_driven?: 'all' | 'two' | 'one' | 'unknown'
  }
  outputs?: { sub_out?: boolean; pre_out?: boolean; phono?: boolean }
  review_links?: ReviewLink[]
}

export type Acoustics = 'lively' | 'average' | 'damped'
export type RoomPresetId = 'small_bedroom' | 'office' | 'living_room' | 'large_open_plan'
export interface SystemProfile {
  room: { length_m: number; width_m: number; height_m: number } | null
  room_preset: RoomPresetId | null
  acoustics: Acoustics | null
  distance_m: number | null
  near_wall: boolean | null
  target_peak_db: number
}

type Range = readonly [number, number]

/** Inclusive valid ranges for parsed numeric fields. */
export const SPEC_RANGES = {
  sensitivity_db: [70, 110],
  impedance_ohms: [1, 32],
  min_impedance_ohms: [1, 32],
  power_w: [0.1, 5000],
  f3_hz: [10, 500],
  directivity_q: [1, 20],
  thd_pct: [0, 100],
  distance_m: [0.3, 20],
  room_dimension_m: [1.5, 50],
  target_peak_db: [60, 110],
} as const satisfies Record<string, Range>

export const DEFAULT_TARGET_PEAK_DB = 85

const TRUSTS: readonly Trust[] = ['measured', 'claimed', 'user', 'assumed']
const SENSITIVITY_REFS: readonly SensitivityRef[] = ['1W', '2.83V', 'unknown']
const REVIEW_KINDS: readonly ReviewLink['kind'][] = ['measurement', 'listening', 'pairing']
const POWER_KINDS: readonly PowerRatingKind[] = ['continuous', 'peak', 'unknown']
const CHANNELS_DRIVEN = ['all', 'two', 'one', 'unknown'] as const
const AMP_SUBTYPES = ['integrated', 'power', 'receiver'] as const
const ROOM_PRESETS: readonly RoomPresetId[] = ['small_bedroom', 'office', 'living_room', 'large_open_plan']
const ACOUSTICS: readonly Acoustics[] = ['lively', 'average', 'damped']

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x)
}

function inEnum<T extends string>(list: readonly T[], x: unknown): x is T {
  return typeof x === 'string' && (list as readonly string[]).includes(x)
}

function inRange(x: unknown, [lo, hi]: Range): x is number {
  return typeof x === 'number' && Number.isFinite(x) && x >= lo && x <= hi
}

function parseSpecValue(raw: unknown, valid: (v: unknown) => boolean): SpecValue<never> | undefined {
  if (!isRecord(raw) || !valid(raw.value) || !inEnum(TRUSTS, raw.trust)) return undefined
  const out: SpecValue<unknown> = { value: raw.value, trust: raw.trust }
  if (typeof raw.source_url === 'string' || raw.source_url === null) out.source_url = raw.source_url
  return out as SpecValue<never>
}

function numericSpec(raw: unknown, range: Range): SpecValue<number> | undefined {
  return parseSpecValue(raw, (v) => inRange(v, range))
}

function parseReviewLinks(raw: unknown): ReviewLink[] | undefined {
  if (!Array.isArray(raw)) return undefined
  const links: ReviewLink[] = []
  for (const l of raw) {
    if (
      isRecord(l) &&
      typeof l.outlet === 'string' && l.outlet.trim() !== '' &&
      typeof l.url === 'string' && /^https?:\/\//i.test(l.url) &&
      inEnum(REVIEW_KINDS, l.kind)
    ) {
      links.push({ outlet: l.outlet, url: l.url, kind: l.kind })
    }
  }
  return links.length > 0 ? links : undefined
}

export function parseSpeakerSpecs(json: unknown): SpeakerSpecs {
  const out: SpeakerSpecs = {}
  if (!isRecord(json)) return out
  const set = <K extends keyof SpeakerSpecs>(k: K, v: SpeakerSpecs[K]) => {
    if (v !== undefined) out[k] = v
  }
  set('sensitivity_db', numericSpec(json.sensitivity_db, SPEC_RANGES.sensitivity_db))
  set('sensitivity_ref', parseSpecValue(json.sensitivity_ref, (v) => inEnum(SENSITIVITY_REFS, v)))
  set('nominal_impedance_ohms', numericSpec(json.nominal_impedance_ohms, SPEC_RANGES.impedance_ohms))
  set('min_impedance_ohms', numericSpec(json.min_impedance_ohms, SPEC_RANGES.min_impedance_ohms))
  set('f3_hz', numericSpec(json.f3_hz, SPEC_RANGES.f3_hz))
  set('directivity_q', numericSpec(json.directivity_q, SPEC_RANGES.directivity_q))
  set('review_links', parseReviewLinks(json.review_links))
  return out
}

function parsePowerRating(raw: unknown): SpeakerAmpSpecs['power_rating'] {
  if (!isRecord(raw) || !inEnum(POWER_KINDS, raw.kind)) return undefined
  const out: NonNullable<SpeakerAmpSpecs['power_rating']> = { kind: raw.kind }
  if (inRange(raw.thd_pct, SPEC_RANGES.thd_pct)) out.thd_pct = raw.thd_pct
  if (inEnum(CHANNELS_DRIVEN, raw.channels_driven)) out.channels_driven = raw.channels_driven
  return out
}

function parseOutputs(raw: unknown): SpeakerAmpSpecs['outputs'] {
  if (!isRecord(raw)) return undefined
  const out: NonNullable<SpeakerAmpSpecs['outputs']> = {}
  if (typeof raw.sub_out === 'boolean') out.sub_out = raw.sub_out
  if (typeof raw.pre_out === 'boolean') out.pre_out = raw.pre_out
  if (typeof raw.phono === 'boolean') out.phono = raw.phono
  return Object.keys(out).length > 0 ? out : undefined
}

export function parseSpeakerAmpSpecs(json: unknown): SpeakerAmpSpecs {
  const out: SpeakerAmpSpecs = {}
  if (!isRecord(json)) return out
  const set = <K extends keyof SpeakerAmpSpecs>(k: K, v: SpeakerAmpSpecs[K]) => {
    if (v !== undefined) out[k] = v
  }
  set('subtype', inEnum(AMP_SUBTYPES, json.subtype) ? json.subtype : undefined)
  set('power_w_8ohm', numericSpec(json.power_w_8ohm, SPEC_RANGES.power_w))
  set('power_w_4ohm', numericSpec(json.power_w_4ohm, SPEC_RANGES.power_w))
  set('power_rating', parsePowerRating(json.power_rating))
  set('outputs', parseOutputs(json.outputs))
  set('review_links', parseReviewLinks(json.review_links))
  return out
}

function parseRoom(raw: unknown): SystemProfile['room'] {
  if (!isRecord(raw)) return null
  const { length_m, width_m, height_m } = raw
  const r = SPEC_RANGES.room_dimension_m
  if (inRange(length_m, r) && inRange(width_m, r) && inRange(height_m, r)) {
    return { length_m, width_m, height_m }
  }
  return null
}

export function parseSystemProfile(json: unknown): SystemProfile {
  const j = isRecord(json) ? json : {}
  const [peakLo, peakHi] = SPEC_RANGES.target_peak_db
  const peak =
    typeof j.target_peak_db === 'number' && Number.isFinite(j.target_peak_db)
      ? Math.min(peakHi, Math.max(peakLo, Math.round(j.target_peak_db)))
      : DEFAULT_TARGET_PEAK_DB
  return {
    room: parseRoom(j.room),
    room_preset: inEnum(ROOM_PRESETS, j.room_preset) ? j.room_preset : null,
    acoustics: inEnum(ACOUSTICS, j.acoustics) ? j.acoustics : null,
    distance_m: inRange(j.distance_m, SPEC_RANGES.distance_m) ? j.distance_m : null,
    near_wall: typeof j.near_wall === 'boolean' ? j.near_wall : null,
    target_peak_db: peak,
  }
}

/**
 * Layer user overrides over catalog specs. Each override value is stamped
 * `trust: 'user'` (and `source_url: null`) before parsing, so overrides need
 * no trust field and cannot claim a higher one. An overridden field replaces
 * the catalog field wholesale; everything else keeps its own trust. Junk
 * overrides are dropped by the parser and leave the catalog untouched.
 */
export function applyOverrides<T extends object>(
  catalog: T,
  overrides: unknown,
  parse: (j: unknown) => T,
): T {
  if (!isRecord(overrides)) return catalog
  const stamped: Record<string, unknown> = {}
  for (const [key, raw] of Object.entries(overrides)) {
    stamped[key] = isRecord(raw) && 'value' in raw ? { ...raw, trust: 'user', source_url: null } : raw
  }
  return { ...catalog, ...parse(stamped) }
}
