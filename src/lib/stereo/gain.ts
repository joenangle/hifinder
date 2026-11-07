// Gain matching: can the source drive the amp to its rated power?
// (advanced-mode plan, Task 3.)
//
// An amp rated P watts into R ohms needs √(P·R) volts at its output for full
// power. Its input sensitivity is the input voltage that produces that, so its
// voltage gain is G = √(P·R) / V_in. A source with maximum output V_s can push
// the amp to at most (V_s · G)² / Z watts into the speakers' impedance Z,
// which may be less than the amp's rating. Voltage gain of a solid-state amp
// barely changes with load, so a gain derived at 8 Ω applies at other loads.

const log10 = Math.log10

/** The load an amp's rating and input sensitivity usually refer to. */
export const GAIN_REFERENCE_OHMS = 8

/** Voltage gain in dB from a rating and the input sensitivity for that rating. */
export function ampGainDb(ratedWatts: number, inputSensitivityV: number, loadOhms = GAIN_REFERENCE_OHMS): number {
  return 20 * log10(Math.sqrt(ratedWatts * loadOhms) / inputSensitivityV)
}

/** Input volts needed for rated power, from a gain in dB. */
export function inputSensitivityFromGain(ratedWatts: number, gainDb: number, loadOhms = GAIN_REFERENCE_OHMS): number {
  return Math.sqrt(ratedWatts * loadOhms) / 10 ** (gainDb / 20)
}

export interface ReachablePower {
  watts: number
  /** True when the source, not the amp, sets the limit. */
  limited: boolean
  /** How far short of the amp's power, in dB (0 when not limited). */
  shortfallDb: number
}

/** The most power the source can make the amp deliver into `loadOhms`. */
export function reachableWatts(sourceV: number, gainDb: number, ampWatts: number, loadOhms: number): ReachablePower {
  const outV = sourceV * 10 ** (gainDb / 20)
  const sourceWatts = (outV * outV) / loadOhms
  if (sourceWatts >= ampWatts) return { watts: ampWatts, limited: false, shortfallDb: 0 }
  return { watts: sourceWatts, limited: true, shortfallDb: 10 * log10(ampWatts / sourceWatts) }
}

/**
 * Above this the volume knob sits very low with a full-level source, and small
 * movements make big changes. A usability note, not an audio threshold.
 */
export const HIGH_GAIN_NOTE_DB = 35
