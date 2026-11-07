// Hiss: is the amp's noise floor audible through these speakers at the seat?
// (advanced-mode plan, Task 3.)
//
// A noise voltage V_n into the speakers' impedance Z is P_n = V_n² / Z watts.
// The room model already gives the seat level for 1 W per speaker
// (levelAtSeatPerWatt, pair included: two channels' noise is uncorrelated and
// sums like the music does), so the hiss level is that plus 10·log10(P_n).

import type { SeatLevel } from './power'

const log10 = Math.log10

/**
 * A quiet room, the worst case for hiss. Homes measure about 30 to 40 dBA:
 * nonoise.org lists "Quiet Room 28-33" and "Typical Living Room 40"
 * (https://nonoise.org/library/household/index.htm), and Pearsons et al. (1977)
 * found home levels of 35 to 40 dBA (cited at https://auditory.org/mhonarc/2026/msg00010.html).
 */
export const ROOM_BACKGROUND_DBA = 30
/**
 * Hiss this far under the room's background adds only 0.4 dB to it (a power
 * sum). This is arithmetic, not a listening test. Hiss is treble-heavy and room
 * noise is bass-heavy, so it is optimistic for an ear right at a tweeter.
 */
export const HISS_MASKED_MARGIN_DB = 10

/** Noise voltage from an SNR quoted against `refWatts` into `loadOhms`. */
export function noiseVoltsFromSnr(snrDb: number, refWatts: number, loadOhms = 8): number {
  return Math.sqrt(refWatts * loadOhms) / 10 ** (snrDb / 20)
}

/** Hiss level at the seat, given the system's 1 W level at the seat. */
export function hissAtSeat(levelPerWatt: SeatLevel, noiseV: number, nominalOhms: number): SeatLevel {
  const offset = 10 * log10((noiseV * noiseV) / nominalOhms)
  return { inRoom: levelPerWatt.inRoom + offset, freeField: levelPerWatt.freeField + offset }
}
