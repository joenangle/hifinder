// Stereo Builder speaker power math (PRD sections 7.1 to 7.5).
//
// In-room model: Hopkins-Stryker direct + reverberant field,
//   L = Lw + 10*log10(Q/(4*pi*r^2) + 4/R),  R = S*a/(1-a)  (room constant),
// with Lw = S_1W - 10*log10(Q) + 10.99.
//
// Reference: Engineers Edge, "Converting Sound Power to Sound Pressure Formulas
// and Calculator",
// https://engineersedge.com/calculators/converting_sound_power_to_sound_pressure_15732.htm
// gives Lp = Lw + 10 log(Q/4*pi*r^2 + 4/R) + 10.3 with R = S*a/(1-a), in
// imperial units. The 10.3 dB is 10*log10(10.76), the ft^2 to m^2 conversion,
// so the constant is 0 in SI units, which is what this module uses. The
// diffuse-field term overstates levels in small furnished rooms, so the
// in-room figure is an estimate, not a bound. Hopkins-Stryker assumes a
// diffuse field and is less accurate in long or non-cubical rooms.

import type { Acoustics, SpeakerAmpSpecs } from './specs'

export const DEFAULT_DIRECTIVITY_Q = 2
export const PAIR_GAIN_DB = 3
export const ABSORPTION: Record<Acoustics, number> = { lively: 0.15, average: 0.25, damped: 0.4 }
export const PEAK_RATING_DERATE_DB = 3
export const LOW_IMPEDANCE_CAUTION_OHMS = 3.2
export const COMFORTABLE_MARGIN_DB = 3

/** A rating quoted at this THD or higher is treated like a peak rating. */
const HIGH_THD_PCT = 10
const log10 = Math.log10

/** Sensitivity normalized to dB SPL at 1 W / 1 m. */
export function sensitivityPerWatt(sensitivityDb: number, ref: '1W' | '2.83V', nominalOhms: number): number {
  return ref === '1W' ? sensitivityDb : sensitivityDb - 10 * log10(8 / nominalOhms)
}

export type AmpPowerBasis = 'rated' | 'eight_ohm_lower_bound'
export interface ResolvedAmpPower {
  watts: number
  ratedWatts: number
  basis: AmpPowerBasis
  derated: boolean
  conditionsUnknown: boolean
  lowImpedanceCaution: boolean
}

export function resolveAmpPower(
  amp: SpeakerAmpSpecs,
  speakerNominalOhms: number,
  speakerMinOhms?: number
): ResolvedAmpPower | null {
  const p8 = amp.power_w_8ohm?.value
  const p4 = amp.power_w_4ohm?.value
  let ratedWatts: number
  let basis: AmpPowerBasis
  if (speakerNominalOhms <= 4 && p4 !== undefined) {
    ratedWatts = p4
    basis = 'rated'
  } else if (p8 !== undefined) {
    if (speakerNominalOhms === 8) {
      ratedWatts = p8
      basis = 'rated'
    } else if (speakerNominalOhms > 8) {
      // Voltage-limited amp: P = V^2/R falls as impedance rises.
      ratedWatts = (p8 * 8) / speakerNominalOhms
      basis = 'eight_ohm_lower_bound'
    } else {
      ratedWatts = p8
      basis = 'eight_ohm_lower_bound'
    }
  } else {
    return null
  }

  const kind = amp.power_rating?.kind ?? 'unknown'
  const derated = kind === 'peak' || (amp.power_rating?.thd_pct ?? 0) >= HIGH_THD_PCT
  return {
    watts: derated ? ratedWatts * 10 ** (-PEAK_RATING_DERATE_DB / 10) : ratedWatts,
    ratedWatts,
    basis,
    derated,
    conditionsUnknown: kind === 'unknown',
    lowImpedanceCaution:
      speakerMinOhms !== undefined && speakerMinOhms < LOW_IMPEDANCE_CAUTION_OHMS && p4 === undefined,
  }
}

export interface SeatLevel {
  inRoom: number
  freeField: number
}

/** Level at the seat for 1 W per speaker. `speakers` defaults to a pair. */
export function levelAtSeatPerWatt(
  sens1W: number,
  distanceM: number,
  room: { length_m: number; width_m: number; height_m: number },
  acoustics: Acoustics,
  opts: { q?: number; speakers?: 1 | 2 } = {}
): SeatLevel {
  const q = opts.q ?? DEFAULT_DIRECTIVITY_Q
  const pair = (opts.speakers ?? 2) === 2 ? PAIR_GAIN_DB : 0
  const { length_m: l, width_m: w, height_m: h } = room
  const surface = 2 * (l * w + l * h + w * h)
  const a = ABSORPTION[acoustics]
  const roomConstant = (surface * a) / (1 - a)
  const lw = sens1W - 10 * log10(q) + 10.99
  return {
    freeField: sens1W - 20 * log10(distanceM) + pair,
    inRoom: lw + 10 * log10(q / (4 * Math.PI * distanceM * distanceM) + 4 / roomConstant) + pair,
  }
}

/**
 * Reference room for "in-room" sensitivity ratings: a medium living room with
 * average acoustics (the medium living room preset). Klipsch quotes some
 * sensitivities "in an average listening room", so the figure already holds
 * that room's reinforcement at 1 m.
 */
export const IN_ROOM_RATING_REFERENCE = {
  room: { length_m: 5, width_m: 4, height_m: 2.6 },
  acoustics: 'average' as Acoustics,
}

/**
 * Room reinforcement baked into an in-room sensitivity rating: what this model
 * itself adds at 1 m in the reference room (≈2.7 dB). Subtracting it gives an
 * anechoic estimate, so the user's own room is counted once, not twice.
 */
export function inRoomRatingGainDb(): number {
  const { room, acoustics } = IN_ROOM_RATING_REFERENCE
  const one = levelAtSeatPerWatt(0, 1, room, acoustics, { speakers: 1 })
  return one.inRoom - one.freeField
}

/**
 * How far music's peaks rise above its average level. People think of volume
 * as an average, but amps clip on peaks, so the page takes an average and the
 * model sizes the amp for average + this allowance. Tom Martin, "Dynamic Range
 * and Choosing Amplifier Power", The Absolute Sound (2026): recorded music is
 * commonly 12-20 dB; pop 12-14, rock and modern country 14-16, acoustic jazz
 * 20-22, orchestral 24-26. 15 dB is a mid-range planning figure.
 * https://www.theabsolutesound.com/articles/dynamic-range-and-choosing-amplifier-power/
 */
export const MUSIC_PEAK_ALLOWANCE_DB = 15

export const peakFromAverage = (averageDb: number) => averageDb + MUSIC_PEAK_ALLOWANCE_DB
export const averageFromPeak = (peakDb: number) => peakDb - MUSIC_PEAK_ALLOWANCE_DB

export type VerdictKind = 'comfortable' | 'comfortable_most_rooms' | 'tight' | 'runs_out'
export const VERDICT_LABELS: Record<VerdictKind, string> = {
  comfortable: 'Comfortable',
  comfortable_most_rooms: 'Comfortable in most rooms',
  tight: 'Tight',
  runs_out: 'Runs out',
}

export interface PowerVerdict {
  kind: VerdictKind
  label: string
  headroomInRoomDb: number
  headroomFreeFieldDb: number
  requiredWattsInRoom: number
  requiredWattsFreeField: number
  maxCleanPeakDb: { low: number; high: number }
}

export function powerVerdict(targetPeakDb: number, level: SeatLevel, ampWatts: number): PowerVerdict {
  const requiredWattsInRoom = 10 ** ((targetPeakDb - level.inRoom) / 10)
  const requiredWattsFreeField = 10 ** ((targetPeakDb - level.freeField) / 10)
  const headroomInRoomDb = 10 * log10(ampWatts / requiredWattsInRoom)
  const headroomFreeFieldDb = 10 * log10(ampWatts / requiredWattsFreeField)
  const kind: VerdictKind =
    headroomInRoomDb >= COMFORTABLE_MARGIN_DB
      ? headroomFreeFieldDb >= 0
        ? 'comfortable'
        : 'comfortable_most_rooms'
      : headroomInRoomDb >= 0
        ? 'tight'
        : 'runs_out'
  const ampDb = 10 * log10(ampWatts)
  return {
    kind,
    label: VERDICT_LABELS[kind],
    headroomInRoomDb,
    headroomFreeFieldDb,
    requiredWattsInRoom,
    requiredWattsFreeField,
    maxCleanPeakDb: { low: level.freeField + ampDb, high: level.inRoom + ampDb },
  }
}
