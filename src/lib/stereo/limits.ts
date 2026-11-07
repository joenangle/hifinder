// Speaker limits: how loud can the speakers themselves play cleanly?
// (PRD §13 item 1; advanced-mode plan, Task 10.)
//
// Evidence, best first (the first one present wins, and the working names it):
//   1. Measured max SPL (AES75-2022, https://aes2.org/?p=18749, or IEC 60268-21
//      SPLmax, which ignores distortion: see the IOA 2022 paper,
//      https://pub.ioa.org.uk/conference-proceeding/reproduced-sound-2022-vol44-pt3/j-hipperson-comparison-of-splmax-using-aes75-and-multitone-distortion--mtd--methods).
//   2. A compression sweep, such as Erin's Audio Corner's 96 and 102 dB runs
//      (e.g. https://erinsaudiocorner.com/loudspeakers/elac_db63/). It brackets
//      the limit between the loudest clean level and the first that compresses.
//   3. The maker's max SPL.
//   4. Power handling, the weakest: a survival rating, not a clean-output one.
//
// Convention: peaks are the amp's problem and averages are the driver's heat
// problem, so every limit here is an average level at 1 m for one speaker.

import { MUSIC_PEAK_ALLOWANCE_DB } from './power'
import type { PowerHandlingKind, SpeakerSpecs, Trust } from './specs'

const log10 = Math.log10

/**
 * A sweep level whose worst band compresses by more than this is past the
 * speaker's clean limit. From the AES75 revision draft's "3 dB compression
 * anywhere" criterion, as reported from the task group chair's talk
 * (https://aesmelbourne.org.au/?p=7481). A draft, not the published standard.
 */
export const SPEAKER_COMPRESSION_LIMIT_DB = 3

/**
 * Program and peak ratings relative to continuous power: EAW's tests use a
 * 6 dB crest factor with program at +3 dB
 * (https://eaw.com/wp-content/uploads/2020/12/Power_Handling.pdf; see also
 * https://support.teufel.de/hc/en-us/articles/360007857679). An unstated kind
 * is read as peak, the most optimistic rating, so it gets the largest derate.
 */
export const POWER_HANDLING_DERATE_DB: Record<PowerHandlingKind, number> = {
  continuous: 0,
  program: 3,
  peak: 6,
  unknown: 6,
}

export type LimitBasis = 'measured_max_spl' | 'compression_sweep' | 'rated_max_spl' | 'power_handling'
/**
 * estimate: one figure. at_least: clean up to here, not tested louder.
 * at_most: compresses here, not tested quieter. range: clean at low, compresses at high.
 */
export type LimitBound = 'estimate' | 'at_least' | 'at_most' | 'range'

export interface SpeakerLimit {
  /** Clean average output at 1 m for one speaker. Equal ends unless bound is 'range'. */
  averageDb1m: { low: number; high: number }
  basis: LimitBasis
  trust: Trust
  bound: LimitBound
  source_url?: string | null
  /** Human-readable account of where the figure came from, for the working. */
  detail: string
}

const fmt = (n: number) => String(Number(n.toFixed(1)))

/** Resolve the speakers' clean limit from the best evidence present, or null. */
export function resolveSpeakerLimit(s: SpeakerSpecs, sens1W: number): SpeakerLimit | null {
  const spl = s.max_spl_db
  const one = (v: number) => ({ low: v, high: v })

  if (spl && (spl.method === 'aes75' || spl.method === 'iec_splmax')) {
    // An unknown kind is read as peak: the lower average, so the safer reading.
    const avg = spl.kind === 'continuous' ? spl.value : spl.value - MUSIC_PEAK_ALLOWANCE_DB
    const method = spl.method === 'aes75' ? 'AES75' : 'IEC 60268-21'
    return {
      averageDb1m: one(avg),
      basis: 'measured_max_spl',
      trust: spl.trust,
      bound: 'estimate',
      source_url: spl.source_url,
      detail: `${method} max SPL ${fmt(spl.value)} dB${spl.kind === 'continuous' ? '' : ' peak'} at 1 m`,
    }
  }

  const sweep = s.compression
  if (sweep) {
    const levels = [...sweep.value].sort((a, b) => a.level_db_1m - b.level_db_1m)
    const clean = levels.filter((p) => p.worst_db <= SPEAKER_COMPRESSION_LIMIT_DB)
    const compressed = levels.filter((p) => p.worst_db > SPEAKER_COMPRESSION_LIMIT_DB)
    const floor = clean.length ? clean[clean.length - 1].level_db_1m : null
    const ceiling = compressed.length ? compressed[0].level_db_1m : null
    const runs = levels.map((p) => `${fmt(p.worst_db)} dB at ${fmt(p.level_db_1m)} dB`).join(', ')
    const base = { basis: 'compression_sweep' as const, trust: sweep.trust, source_url: sweep.source_url }
    const detail = `Compression sweep at 1 m: ${runs}`
    if (floor !== null && ceiling !== null && ceiling > floor) {
      return { ...base, averageDb1m: { low: floor, high: ceiling }, bound: 'range', detail }
    }
    if (ceiling !== null && floor === null) return { ...base, averageDb1m: one(ceiling), bound: 'at_most', detail }
    if (floor !== null) return { ...base, averageDb1m: one(floor), bound: 'at_least', detail }
  }

  if (spl) {
    const avg = spl.kind === 'continuous' ? spl.value : spl.value - MUSIC_PEAK_ALLOWANCE_DB
    return {
      averageDb1m: one(avg),
      basis: 'rated_max_spl',
      trust: spl.trust,
      bound: 'estimate',
      source_url: spl.source_url,
      detail: `Rated max SPL ${fmt(spl.value)} dB${spl.kind === 'continuous' ? '' : ' (read as peak)'} at 1 m`,
    }
  }

  const handling = s.power_handling_w
  if (handling) {
    const derate = POWER_HANDLING_DERATE_DB[handling.kind]
    const continuousW = handling.value * 10 ** (-derate / 10)
    const kind = handling.kind === 'unknown' ? 'kind not stated' : handling.kind
    return {
      averageDb1m: one(sens1W + 10 * log10(continuousW)),
      basis: 'power_handling',
      trust: handling.trust,
      bound: 'estimate',
      source_url: handling.source_url,
      detail: `Power handling ${fmt(handling.value)} W (${kind}), counted as ${fmt(continuousW)} W continuous`,
    }
  }

  return null
}
