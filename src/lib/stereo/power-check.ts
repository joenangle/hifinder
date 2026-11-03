// Stereo Builder declared-inputs power check (PRD 6.2 to 6.4, 7.2, 7.6).
// Turns a system (speaker specs, amp specs, room/seat profile) into either a
// verdict with its working, or the exact list of values still missing. The UI
// renders the outcome as-is, so this module owns all result content. Power math
// lives in ./power and is never reimplemented here.

import {
  parseSpeakerAmpSpecs,
  parseSpeakerSpecs,
  parseSystemProfile,
  type Acoustics,
  type RoomPresetId,
  type SpeakerAmpSpecs,
  type SpeakerSpecs,
  type SystemProfile,
  type Trust,
} from './specs'
import {
  levelAtSeatPerWatt,
  powerVerdict,
  resolveAmpPower,
  sensitivityPerWatt,
  type PowerVerdict,
  type ResolvedAmpPower,
  type SeatLevel,
} from './power'

export type InputId =
  | 'speakers.sensitivity_db'
  | 'speakers.nominal_impedance_ohms'
  | 'amp.power_w_8ohm'
  | 'amp.power_w_4ohm'
  | 'seat.distance_m'
  | 'room.size'
  | 'room.acoustics'

export interface MissingInput {
  id: InputId
  label: string
  hint: string
}
export interface WorkingRow {
  step: string
  value: string
  trust: Trust | 'modeled'
}
export interface Assumption {
  // 'speakers.placement' and 'speakers.directivity' are reserved and unused:
  // directivity Q = 2 is a model constant, not an assumption chip.
  id: InputId | 'speakers.placement' | 'speakers.directivity'
  text: string
}

export const LOUDNESS_TIERS = [
  { id: 'quiet', label: 'Quiet', peakDb: 65, feel: 'Late night, conversation easy over it' },
  { id: 'background', label: 'Background', peakDb: 75, feel: 'Music while working or cooking' },
  { id: 'normal', label: 'Normal', peakDb: 85, feel: 'Focused listening at a comfortable level' },
  { id: 'loud', label: 'Loud', peakDb: 95, feel: 'Turned up for a favorite record' },
  { id: 'club', label: 'Club', peakDb: 105, feel: 'Party or club level, rare at home' },
] as const

/** Tier boundaries: below 70 Quiet, below 80 Background, below 90 Normal, below 100 Loud, else Club. */
export function tierFor(peakDb: number): (typeof LOUDNESS_TIERS)[number] {
  if (peakDb < 70) return LOUDNESS_TIERS[0]
  if (peakDb < 80) return LOUDNESS_TIERS[1]
  if (peakDb < 90) return LOUDNESS_TIERS[2]
  if (peakDb < 100) return LOUDNESS_TIERS[3]
  return LOUDNESS_TIERS[4]
}

export const ROOM_PRESETS: Record<
  RoomPresetId,
  { label: string; length_m: number; width_m: number; height_m: number }
> = {
  small_bedroom: { label: 'Small bedroom', length_m: 3.5, width_m: 3, height_m: 2.4 },
  office: { label: 'Office', length_m: 3, width_m: 3, height_m: 2.4 },
  living_room: { label: 'Medium living room', length_m: 5, width_m: 4, height_m: 2.6 },
  large_open_plan: { label: 'Large open-plan room', length_m: 8, width_m: 6, height_m: 2.7 },
}

export const AMP_ONLY_CAVEAT = 'This checks the amp. Small speakers may distort or compress before this level.'

const DEFAULT_PRESET: RoomPresetId = 'living_room'
const DEFAULT_ACOUSTICS: Acoustics = 'average'
const DEFAULT_DISTANCE_M = 3
const ACOUSTICS_LABEL: Record<Acoustics, string> = { lively: 'Lively', average: 'Average', damped: 'Damped' }

/** Declared inputs, in table order. Drives `missing` labels and hints. */
const DECLARED: Record<'sensitivity' | 'impedance' | 'amp' | 'room' | 'acoustics' | 'distance', MissingInput> = {
  sensitivity: {
    id: 'speakers.sensitivity_db',
    label: 'Speaker sensitivity',
    hint: 'Usually on the back panel or in the manual, written like "87 dB (2.83 V/1 m)".',
  },
  impedance: {
    id: 'speakers.nominal_impedance_ohms',
    label: 'Speaker impedance',
    hint: 'Usually on the back panel or in the manual, written like "8 Ω" or "4 Ω nominal".',
  },
  amp: {
    id: 'amp.power_w_8ohm',
    label: 'Amp power',
    hint: 'In the amp\'s specs, written like "50 W per channel into 8 Ω". Add the 4 Ω figure too if it is listed.',
  },
  room: {
    id: 'room.size',
    label: 'Room size',
    hint: 'Length, width and height in meters, or pick the closest room type.',
  },
  acoustics: {
    id: 'room.acoustics',
    label: 'Room acoustics',
    hint: 'Lively (bare floors and walls), average, or damped (thick carpet, heavy curtains, lots of furniture).',
  },
  distance: {
    id: 'seat.distance_m',
    label: 'Listening distance',
    hint: 'Measure from your seat to the speakers, in meters.',
  },
}

export type PowerCheckOutcome =
  | {
      status: 'ok'
      verdict: PowerVerdict
      ampPower: ResolvedAmpPower
      working: WorkingRow[]
      assumptions: Assumption[]
      reasons: string[]
      notes: string[]
      caveat: string
      sensitivityRange: boolean
    }
  | { status: 'needs'; missing: MissingInput[]; caveat: string }

export interface PowerCheckInput {
  speakers: SpeakerSpecs | null
  amp: SpeakerAmpSpecs | null
  profile: SystemProfile
  mode: 'simple' | 'advanced'
}

/** One decimal at most, trailing zero dropped: 3 -> "3", 2.46 -> "2.5". */
const fmt = (n: number) => String(Number(n.toFixed(1)))
const fmtWatts = (w: number) => (w < 10 ? w.toFixed(1) : String(Math.round(w)))

export function runPowerCheck(input: PowerCheckInput): PowerCheckOutcome {
  // Re-parse everything so raw junk degrades to "missing", never NaN/Infinity.
  const speakers = parseSpeakerSpecs(input.speakers)
  const amp = parseSpeakerAmpSpecs(input.amp)
  const profile = parseSystemProfile(input.profile)
  const simple = input.mode === 'simple'

  const sens = speakers.sensitivity_db
  const imp = speakers.nominal_impedance_ohms
  const ampPower = imp
    ? resolveAmpPower(amp, imp.value, speakers.min_impedance_ohms?.value)
    : null

  const presetDims = profile.room_preset ? ROOM_PRESETS[profile.room_preset] : null
  const roomGiven = profile.room ?? presetDims
  const roomDims = roomGiven ?? (simple ? ROOM_PRESETS[DEFAULT_PRESET] : null)
  const acoustics = profile.acoustics ?? (simple ? DEFAULT_ACOUSTICS : null)
  const distance = profile.distance_m ?? (simple ? DEFAULT_DISTANCE_M : null)

  const missing: MissingInput[] = []
  if (!sens) missing.push(DECLARED.sensitivity)
  if (!imp) missing.push(DECLARED.impedance)
  // Without an impedance we can't resolve the rating; only flag the amp when it has no rating at all.
  const ampHasAnyRating = amp.power_w_8ohm !== undefined || amp.power_w_4ohm !== undefined
  if (imp ? !ampPower : !ampHasAnyRating) missing.push(DECLARED.amp)
  if (!roomDims) missing.push(DECLARED.room)
  if (!acoustics) missing.push(DECLARED.acoustics)
  if (distance === null) missing.push(DECLARED.distance)
  if (missing.length > 0) return { status: 'needs', missing, caveat: AMP_ONLY_CAVEAT }

  // Everything below is defined: the checks above returned otherwise.
  const sensitivity = sens!
  const nominal = imp!.value
  const resolved = ampPower!
  const room = { length_m: roomDims!.length_m, width_m: roomDims!.width_m, height_m: roomDims!.height_m }
  const acousticsId = acoustics!
  const distanceM = distance!

  const refValue = speakers.sensitivity_ref?.value ?? 'unknown'
  const refs: ('1W' | '2.83V')[] = refValue === 'unknown' ? ['1W', '2.83V'] : [refValue]
  const cases = refs.map((ref) => {
    const sens1W = sensitivityPerWatt(sensitivity.value, ref, nominal)
    const level = levelAtSeatPerWatt(sens1W, distanceM, room, acousticsId)
    return { ref, sens1W, level, verdict: powerVerdict(profile.target_peak_db, level, resolved.watts) }
  })
  const worst = cases.reduce((a, b) => (b.verdict.headroomInRoomDb < a.verdict.headroomInRoomDb ? b : a))
  const sensitivityRange = cases.length > 1
  const verdict: PowerVerdict = sensitivityRange
    ? {
        ...worst.verdict,
        maxCleanPeakDb: {
          low: Math.min(...cases.map((c) => c.verdict.maxCleanPeakDb.low)),
          high: Math.max(...cases.map((c) => c.verdict.maxCleanPeakDb.high)),
        },
      }
    : worst.verdict
  const level: SeatLevel = worst.level

  const ampSpec =
    nominal <= 4 && amp.power_w_4ohm ? amp.power_w_4ohm : amp.power_w_8ohm ?? amp.power_w_4ohm!
  const ampCaveats = [
    resolved.derated ? '(optimistic rating)' : '',
    resolved.conditionsUnknown ? '(conditions not stated)' : '',
    resolved.basis === 'eight_ohm_lower_bound' ? '(8 Ω rating, conservative)' : '',
  ].filter(Boolean)

  const sensValue = (() => {
    const db = fmt(sensitivity.value)
    if (refValue === '1W') return `${db} dB at 1 W → ${worst.sens1W.toFixed(1)} dB/W`
    if (refValue === '2.83V') return `${db} dB at 2.83 V → ${worst.sens1W.toFixed(1)} dB/W`
    const [w1, v283] = [
      sensitivityPerWatt(sensitivity.value, '1W', nominal),
      sensitivityPerWatt(sensitivity.value, '2.83V', nominal),
    ]
    return `${db} dB, reference not stated → ${v283.toFixed(1)} dB/W if 2.83 V, ${w1.toFixed(1)} dB/W if 1 W`
  })()

  const roomTrust: Trust = roomGiven ? 'user' : 'assumed'
  const needRange = [verdict.requiredWattsInRoom, verdict.requiredWattsFreeField].sort((a, b) => a - b)
  const working: WorkingRow[] = [
    { step: 'Speaker sensitivity', value: sensValue, trust: sensitivity.trust },
    { step: 'Speaker nominal impedance', value: `${fmt(nominal)} Ω`, trust: imp!.trust },
    {
      step: 'Amp power at the speakers\' impedance',
      value: [`${fmtWatts(resolved.watts)} W into ${fmt(nominal)} Ω`, ...ampCaveats].join(' '),
      trust: ampSpec.trust,
    },
    {
      step: 'Room size',
      value: `${fmt(room.length_m)} × ${fmt(room.width_m)} × ${fmt(room.height_m)} m`,
      trust: roomTrust,
    },
    { step: 'Room acoustics', value: ACOUSTICS_LABEL[acousticsId], trust: profile.acoustics ? 'user' : 'assumed' },
    {
      step: 'Listening distance',
      value: `${fmt(distanceM)} m`,
      trust: profile.distance_m !== null ? 'user' : 'assumed',
    },
    { step: 'In-room level at 1 W', value: `${level.inRoom.toFixed(1)} dB at the seat`, trust: 'modeled' },
    { step: 'Free-field level at 1 W', value: `${level.freeField.toFixed(1)} dB at the seat`, trust: 'modeled' },
    {
      step: 'Power needed',
      value: `${fmtWatts(needRange[0])} to ${fmtWatts(needRange[1])} W for ${profile.target_peak_db} dB peaks`,
      trust: 'modeled',
    },
  ]

  const assumptions: Assumption[] = []
  if (!roomGiven) {
    const p = ROOM_PRESETS[DEFAULT_PRESET]
    assumptions.push({
      id: 'room.size',
      text: `Assumed a medium living room (${fmt(p.length_m)} × ${fmt(p.width_m)} × ${fmt(p.height_m)} m).`,
    })
  }
  if (!profile.acoustics) assumptions.push({ id: 'room.acoustics', text: 'Assumed average acoustics.' })
  if (profile.distance_m === null) {
    assumptions.push({ id: 'seat.distance_m', text: `Assumed you sit about ${DEFAULT_DISTANCE_M} m from the speakers.` })
  }

  const dbPerW = Math.round(worst.sens1W)
  const efficiency =
    worst.sens1W >= 88
      ? `Your speakers are efficient (${dbPerW} dB/W)`
      : worst.sens1W <= 85
        ? `Your speakers need more power than most (${dbPerW} dB/W)`
        : `Your speakers have average sensitivity (${dbPerW} dB/W)`
  const distanceReason =
    distanceM < 2.5
      ? `You sit close (${fmt(distanceM)} m)`
      : distanceM > 3.5
        ? `You sit far back (${fmt(distanceM)} m)`
        : `You sit at a typical distance (${fmt(distanceM)} m)`

  const notes: string[] = []
  if (resolved.derated) {
    notes.push(
      "Claimed (optimistic rating): this amp's power is quoted as peak or at high distortion, so we counted 3 dB less."
    )
  }
  if (resolved.conditionsUnknown && verdict.kind === 'tight') {
    notes.push("The amp's rating conditions aren't stated, so this result could be optimistic.")
  }
  if (resolved.basis === 'eight_ohm_lower_bound') {
    notes.push('4 Ω rating not known; many amps deliver more into 4 Ω, but not all.')
  }
  if (resolved.lowImpedanceCaution) {
    notes.push('Low impedance dips: check the amp is rated for 4 Ω loads.')
  }
  if (profile.near_wall === true) {
    notes.push("Speakers near a wall get extra bass, which this check doesn't model yet.")
  }

  return {
    status: 'ok',
    verdict,
    ampPower: resolved,
    working,
    assumptions,
    reasons: [efficiency, distanceReason],
    notes,
    caveat: AMP_ONLY_CAVEAT,
    sensitivityRange,
  }
}
