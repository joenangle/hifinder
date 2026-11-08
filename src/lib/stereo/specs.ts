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

export interface ImpedancePoint {
  hz: number
  ohms: number
}
/** A compression sweep result: at a dense-signal level (dB SPL at 1 m, one speaker), the worst band's loss. */
export interface CompressionPoint {
  level_db_1m: number
  worst_db: number
}
export type MaxSplMethod = 'aes75' | 'iec_splmax' | 'manufacturer' | 'unknown'
export type LevelKind = 'peak' | 'continuous' | 'unknown'
export type PowerHandlingKind = 'continuous' | 'program' | 'peak' | 'unknown'

export interface SpeakerSpecs {
  sensitivity_db?: SpecValue<number>
  sensitivity_ref?: SpecValue<SensitivityRef>
  /**
   * True when the maker quotes sensitivity measured in a listening room (Klipsch
   * does), so the figure already includes room reinforcement. Catalog-only.
   */
  sensitivity_in_room?: SpecValue<boolean>
  nominal_impedance_ohms?: SpecValue<number>
  min_impedance_ohms?: SpecValue<number>
  /** The highest point of the impedance curve, usually the bass resonance peak. */
  max_impedance_ohms?: SpecValue<number>
  /** Measured magnitude curve. Catalog-only in this release. */
  impedance_curve?: SpecValue<ImpedancePoint[]>
  f3_hz?: SpecValue<number>
  directivity_q?: SpecValue<number>
  /** Maximum SPL at 1 m for one speaker, with how it was measured. */
  max_spl_db?: SpecValue<number> & { method: MaxSplMethod; kind: LevelKind }
  /** Compression sweep results (e.g. Erin's Audio Corner at 96 and 102 dB). Catalog-only. */
  compression?: SpecValue<CompressionPoint[]>
  /** Rated power handling: a survival rating, not a clean-output rating. */
  power_handling_w?: SpecValue<number> & { kind: PowerHandlingKind }
  review_links?: ReviewLink[]
}

export type PowerRatingKind = 'continuous' | 'peak' | 'unknown'
export type AmpTopology = 'solid_state' | 'class_d' | 'tube' | 'hybrid'
export type SnrRef = 'rated' | '1W' | 'unknown'
export interface SpeakerAmpSpecs {
  subtype?: 'integrated' | 'power' | 'receiver'
  topology?: AmpTopology
  power_w_8ohm?: SpecValue<number>
  power_w_4ohm?: SpecValue<number>
  power_rating?: {
    kind: PowerRatingKind
    thd_pct?: number
    channels_driven?: 'all' | 'two' | 'one' | 'unknown'
  }
  outputs?: { sub_out?: boolean; pre_out?: boolean; phono?: boolean }
  output_impedance_ohms?: SpecValue<number>
  /**
   * Stored as the source states it. `ref_ohms` defaults to 8. `lower_bound`
   * marks a "> N" rating, which bounds output impedance from above.
   */
  damping_factor?: SpecValue<number> & { ref_ohms?: number; at_hz?: number; lower_bound?: boolean }
  /** Input volts for rated output. */
  input_sensitivity_v?: SpecValue<number>
  /** Voltage gain; the alternative to input sensitivity. */
  gain_db?: SpecValue<number>
  /** Output noise, A-weighted when the spec says so. */
  output_noise_uv?: SpecValue<number>
  snr_db?: SpecValue<number> & { ref: SnrRef }
  review_links?: ReviewLink[]
}

export type SourceKind = 'dac' | 'dac_balanced' | 'phono' | 'preamp' | 'other'
export interface SourceSpecs {
  kind?: SourceKind
  /** Maximum output voltage (volts RMS). */
  output_v?: SpecValue<number>
  has_volume?: boolean
}

/** Typical maximum outputs for the source presets. Phono has none: it varies too much to preset. */
export const SOURCE_PRESET_V: Partial<Record<SourceKind, number>> = { dac: 2, dac_balanced: 4 }

/** A catalog row as served by the public stereo catalog search. */
export interface StereoCatalogItem {
  id: string
  brand: string
  name: string
  category: 'speakers' | 'speaker_amp'
  specs: SpeakerSpecs | SpeakerAmpSpecs
}

export type Acoustics ='lively' | 'average' | 'damped'
export type RoomPresetId = 'small_bedroom' | 'office' | 'living_room' | 'large_open_plan'
export interface SystemProfile {
  room: { length_m: number; width_m: number; height_m: number } | null
  room_preset: RoomPresetId | null
  acoustics: Acoustics | null
  distance_m: number | null
  near_wall: boolean | null
  target_peak_db: number
  /** Speaker cable run per side. Either field may be unknown. */
  cable?: { length_m: number | null; awg: number | null } | null
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
  target_peak_db: [60, 115],
  output_impedance_ohms: [0.001, 20],
  damping_factor: [0.5, 10000],
  df_ref_ohms: [1, 32],
  curve_hz: [10, 40000],
  input_sensitivity_v: [0.05, 10],
  gain_db: [0, 60],
  output_noise_uv: [1, 100000],
  snr_db: [40, 140],
  source_output_v: [0.05, 20],
  cable_length_m: [0.3, 50],
  awg: [8, 24],
  max_spl_db: [70, 130],
  compression_level_db: [70, 130],
  compression_db: [0, 20],
  power_handling_w: [1, 5000],
} as const satisfies Record<string, Range>

/** The Normal tier: 75 dB average plus the music peak allowance (see MUSIC_PEAK_ALLOWANCE_DB). */
export const DEFAULT_TARGET_PEAK_DB = 90

const TRUSTS: readonly Trust[] = ['measured', 'claimed', 'user', 'assumed']
const SENSITIVITY_REFS: readonly SensitivityRef[] = ['1W', '2.83V', 'unknown']
const REVIEW_KINDS: readonly ReviewLink['kind'][] = ['measurement', 'listening', 'pairing']
const POWER_KINDS: readonly PowerRatingKind[] = ['continuous', 'peak', 'unknown']
const CHANNELS_DRIVEN = ['all', 'two', 'one', 'unknown'] as const
const AMP_SUBTYPES = ['integrated', 'power', 'receiver'] as const
const ROOM_PRESETS: readonly RoomPresetId[] = ['small_bedroom', 'office', 'living_room', 'large_open_plan']
const ACOUSTICS: readonly Acoustics[] = ['lively', 'average', 'damped']
const TOPOLOGIES: readonly AmpTopology[] = ['solid_state', 'class_d', 'tube', 'hybrid']
const SNR_REFS: readonly SnrRef[] = ['rated', '1W', 'unknown']
const SOURCE_KINDS: readonly SourceKind[] = ['dac', 'dac_balanced', 'phono', 'preamp', 'other']
const MAX_SPL_METHODS: readonly MaxSplMethod[] = ['aes75', 'iec_splmax', 'manufacturer', 'unknown']
const LEVEL_KINDS: readonly LevelKind[] = ['peak', 'continuous', 'unknown']
const HANDLING_KINDS: readonly PowerHandlingKind[] = ['continuous', 'program', 'peak', 'unknown']

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

/** At least 3 points, frequencies strictly increasing; anything else is dropped whole. */
function validCurve(v: unknown): v is ImpedancePoint[] {
  if (!Array.isArray(v) || v.length < 3) return false
  let lastHz = -Infinity
  for (const p of v) {
    if (!isRecord(p) || !inRange(p.hz, SPEC_RANGES.curve_hz) || !inRange(p.ohms, SPEC_RANGES.impedance_ohms)) return false
    if (p.hz <= lastHz) return false
    lastHz = p.hz
  }
  return true
}

function validCompression(v: unknown): v is CompressionPoint[] {
  return (
    Array.isArray(v) &&
    v.length > 0 &&
    v.every(
      (p) =>
        isRecord(p) &&
        inRange(p.level_db_1m, SPEC_RANGES.compression_level_db) &&
        inRange(p.worst_db, SPEC_RANGES.compression_db)
    )
  )
}

function listSpec<T>(raw: unknown, valid: (v: unknown) => v is T[], pick: (p: T) => T): SpecValue<T[]> | undefined {
  const spec = parseSpecValue(raw, valid) as SpecValue<T[]> | undefined
  return spec ? { ...spec, value: spec.value.map(pick) } : undefined
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
  set('sensitivity_in_room', parseSpecValue(json.sensitivity_in_room, (v) => typeof v === 'boolean'))
  set('nominal_impedance_ohms', numericSpec(json.nominal_impedance_ohms, SPEC_RANGES.impedance_ohms))
  set('min_impedance_ohms', numericSpec(json.min_impedance_ohms, SPEC_RANGES.min_impedance_ohms))
  set('max_impedance_ohms', numericSpec(json.max_impedance_ohms, SPEC_RANGES.impedance_ohms))
  set('impedance_curve', listSpec(json.impedance_curve, validCurve, (p) => ({ hz: p.hz, ohms: p.ohms })))
  set('f3_hz', numericSpec(json.f3_hz, SPEC_RANGES.f3_hz))
  set('directivity_q', numericSpec(json.directivity_q, SPEC_RANGES.directivity_q))
  const maxSpl = numericSpec(json.max_spl_db, SPEC_RANGES.max_spl_db)
  if (maxSpl && isRecord(json.max_spl_db)) {
    const r = json.max_spl_db
    set('max_spl_db', {
      ...maxSpl,
      method: inEnum(MAX_SPL_METHODS, r.method) ? r.method : 'unknown',
      kind: inEnum(LEVEL_KINDS, r.kind) ? r.kind : 'unknown',
    })
  }
  set(
    'compression',
    listSpec(json.compression, validCompression, (p) => ({ level_db_1m: p.level_db_1m, worst_db: p.worst_db }))
  )
  const handling = numericSpec(json.power_handling_w, SPEC_RANGES.power_handling_w)
  if (handling && isRecord(json.power_handling_w)) {
    const k = json.power_handling_w.kind
    set('power_handling_w', { ...handling, kind: inEnum(HANDLING_KINDS, k) ? k : 'unknown' })
  }
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
  set('topology', inEnum(TOPOLOGIES, json.topology) ? json.topology : undefined)
  set('power_w_8ohm', numericSpec(json.power_w_8ohm, SPEC_RANGES.power_w))
  set('power_w_4ohm', numericSpec(json.power_w_4ohm, SPEC_RANGES.power_w))
  set('power_rating', parsePowerRating(json.power_rating))
  set('outputs', parseOutputs(json.outputs))
  set('output_impedance_ohms', numericSpec(json.output_impedance_ohms, SPEC_RANGES.output_impedance_ohms))
  const df = numericSpec(json.damping_factor, SPEC_RANGES.damping_factor)
  if (df && isRecord(json.damping_factor)) {
    const r = json.damping_factor
    const spec: NonNullable<SpeakerAmpSpecs['damping_factor']> = { ...df }
    if (inRange(r.ref_ohms, SPEC_RANGES.df_ref_ohms)) spec.ref_ohms = r.ref_ohms
    if (inRange(r.at_hz, SPEC_RANGES.curve_hz)) spec.at_hz = r.at_hz
    if (r.lower_bound === true) spec.lower_bound = true
    set('damping_factor', spec)
  }
  set('input_sensitivity_v', numericSpec(json.input_sensitivity_v, SPEC_RANGES.input_sensitivity_v))
  set('gain_db', numericSpec(json.gain_db, SPEC_RANGES.gain_db))
  set('output_noise_uv', numericSpec(json.output_noise_uv, SPEC_RANGES.output_noise_uv))
  const snr = numericSpec(json.snr_db, SPEC_RANGES.snr_db)
  if (snr && isRecord(json.snr_db)) {
    const ref = json.snr_db.ref
    set('snr_db', { ...snr, ref: inEnum(SNR_REFS, ref) ? ref : 'unknown' })
  }
  set('review_links', parseReviewLinks(json.review_links))
  return out
}

export function parseSourceSpecs(json: unknown): SourceSpecs {
  const out: SourceSpecs = {}
  if (!isRecord(json)) return out
  if (inEnum(SOURCE_KINDS, json.kind)) out.kind = json.kind
  const v = numericSpec(json.output_v, SPEC_RANGES.source_output_v)
  if (v) out.output_v = v
  if (typeof json.has_volume === 'boolean') out.has_volume = json.has_volume
  return out
}

function parseCable(raw: unknown): SystemProfile['cable'] {
  if (!isRecord(raw)) return null
  const length_m = inRange(raw.length_m, SPEC_RANGES.cable_length_m) ? raw.length_m : null
  const awg = inRange(raw.awg, SPEC_RANGES.awg) && Number.isInteger(raw.awg) ? raw.awg : null
  return length_m === null && awg === null ? null : { length_m, awg }
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
  const cable = parseCable(j.cable)
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
    // Left out when unset, so profiles saved before cable existed parse unchanged.
    ...(cable ? { cable } : {}),
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
