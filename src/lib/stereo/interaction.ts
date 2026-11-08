// Amp–speaker interaction: how the amp's output impedance plus the speaker
// cable shape the frequency response (PRD §13 item 2; advanced-mode plan, Task 3).
//
// The amp's output impedance and the cable (together Z_src) form a voltage
// divider with the speaker. A speaker's impedance changes with frequency, so
// the level at each frequency changes too:
//
//   ΔdB(f) = 20·log10( Z_spk(f) / (Z_spk(f) + Z_src) )
//
// Damping factor is just the same quantity quoted backwards: DF = Z_ref / Z_out.
// Stereophile measures this directly as the response into a simulated speaker
// load, e.g. https://stereophile.com/content/primaluna-prologue-premium-power-amplifier-measurements
// (±3.1 dB from the 8 Ω tap) versus
// https://stereophile.com/content/simaudio-moon-i-1-integrated-amplifier-measurements
// (minimal change, output impedance well under 1 Ω).

import type { ImpedancePoint } from './specs'

const log10 = Math.log10

/**
 * Below this span the shift is treated as no audible change. A conservative
 * line at half the low end of the broad-resonance detection range (see
 * TONAL_NOTE_DB); it is not itself a measured threshold.
 */
export const TONAL_INAUDIBLE_DB = 0.5
/**
 * Toole & Olive, "The Modification of Timbre by Resonances: Perception and
 * Measurement", JAES 36(3), 1988 (https://www.aes.org/e-lib/browse.cfm?elib=5163):
 * broad, low-Q resonances are detectable at about 1 to 2 dB above the average
 * level, narrow ones at about 10 dB. Taken secondhand from audioXpress,
 * "Testing Loudspeakers: Which Measurements Matter, Part 1"
 * (https://audioxpress.com/article/testing-loudspeakers-which-measurements-matter-part-1);
 * check the paper's figure. Divider shifts follow the impedance curve, so they
 * are exactly this broad, low-Q kind.
 */
export const TONAL_NOTE_DB = 1
export const TONAL_CLEAR_DB = 2

/**
 * Annealed copper at 20 °C, the IACS 100% conductivity definition.
 * With the AWG diameter formula this gives 16 AWG ≈ 13.2 mΩ/m, matching
 * HyperPhysics' table (https://hyperphysics.gsu.edu/hbase/Tables/wirega.html).
 */
export const COPPER_RESISTIVITY_OHM_M = 1.7241e-8

/** Reference load for damping factor when a spec doesn't say. */
export const DAMPING_FACTOR_REF_OHMS = 8

/** Output impedance from a damping factor quoted at `refOhms`. */
export function outputImpedanceFromDampingFactor(df: number, refOhms = DAMPING_FACTOR_REF_OHMS): number {
  return refOhms / df
}

/**
 * AWG diameter in mm: d = 0.127 × 92^((36 − n)/39).
 * https://web.physics.ucsb.edu/~phys13BH/w2014/awg.pdf
 */
export function awgDiameterMm(awg: number): number {
  return 0.127 * 92 ** ((36 - awg) / 39)
}

/** Resistance of a copper run there and back (two conductors of `lengthM`). */
export function cableLoopResistanceOhms(lengthM: number, awg: number): number {
  const radiusM = awgDiameterMm(awg) / 2000
  const area = Math.PI * radiusM * radiusM
  return (2 * lengthM * COPPER_RESISTIVITY_OHM_M) / area
}

/** Level change from the divider at one speaker impedance (always ≤ 0 dB). */
export function dividerDb(zSpeaker: number, zSource: number): number {
  return 20 * log10(zSpeaker / (zSpeaker + zSource))
}

/** The effective damping factor at the speaker's nominal impedance, cable included. */
export function effectiveDampingFactor(nominalOhms: number, zSource: number): number {
  return nominalOhms / zSource
}

export interface DeviationPoint {
  hz: number
  db: number
}
export interface ResponseDeviation {
  /** Per point, relative to the curve's mean shift, so 0 dB means "as loud as on average". */
  points: DeviationPoint[]
  spanDb: number
  peak: DeviationPoint
  dip: DeviationPoint
}

/**
 * Predicted response change across a measured impedance curve. The mean is a
 * plain average of the points, so the shape depends on where the curve was
 * sampled; measured curves are dense enough that this doesn't matter in practice.
 */
export function responseDeviation(curve: ImpedancePoint[], zSource: number): ResponseDeviation {
  const raw = curve.map((p) => ({ hz: p.hz, db: dividerDb(p.ohms, zSource) }))
  const mean = raw.reduce((sum, p) => sum + p.db, 0) / raw.length
  const points = raw.map((p) => ({ hz: p.hz, db: p.db - mean }))
  const peak = points.reduce((a, b) => (b.db > a.db ? b : a))
  const dip = points.reduce((a, b) => (b.db < a.db ? b : a))
  return { points, spanDb: peak.db - dip.db, peak, dip }
}

export interface SpanBound {
  spanDb: number
  /** True unless both the lowest and highest impedance are known. */
  isLowerBound: boolean
}

/**
 * Without a curve: the span between the impedance points we do know. The true
 * span is at least this, because the curve may reach further than the points.
 */
export function deviationSpanBound(
  speaker: { nominalOhms: number; minOhms?: number; maxOhms?: number },
  zSource: number
): SpanBound {
  const known = [speaker.nominalOhms, speaker.minOhms, speaker.maxOhms].filter(
    (z): z is number => z !== undefined
  )
  const dbs = known.map((z) => dividerDb(z, zSource))
  return {
    spanDb: Math.max(...dbs) - Math.min(...dbs),
    isLowerBound: speaker.minOhms === undefined || speaker.maxOhms === undefined,
  }
}
