// Stereo Builder system checks beyond power: gain, tonal shift and hiss
// (advanced-mode plan, Task 4). Each is a declared-inputs runner like
// runPowerCheck: `ok` with its own working, `needs` naming the exact missing
// inputs, or `not_applicable` with the reason. They run independently, with
// one coupling: a source too weak to drive the amp caps the watts the power
// check uses. Math lives in ./gain, ./interaction and ./noise; the UI renders
// these outcomes as they come.

import { ampGainDb, GAIN_REFERENCE_OHMS, HIGH_GAIN_NOTE_DB, reachableWatts } from './gain'
import {
  cableLoopResistanceOhms,
  DAMPING_FACTOR_REF_OHMS,
  deviationSpanBound,
  effectiveDampingFactor,
  outputImpedanceFromDampingFactor,
  responseDeviation,
  TONAL_CLEAR_DB,
  TONAL_INAUDIBLE_DB,
  TONAL_NOTE_DB,
  type DeviationPoint,
} from './interaction'
import { HISS_MASKED_MARGIN_DB, hissAtSeat, noiseVoltsFromSnr, ROOM_BACKGROUND_DBA } from './noise'
import { resolveAmpPower, type SeatLevel } from './power'
import {
  runPowerCheck,
  type Assumption,
  type MissingInput,
  type PowerCheckOutcome,
  type WorkingRow,
} from './power-check'
import {
  parseSourceSpecs,
  parseSpeakerAmpSpecs,
  parseSpeakerSpecs,
  parseSystemProfile,
  type SourceKind,
  type SourceSpecs,
  type SpeakerAmpSpecs,
  type SpeakerSpecs,
  type SystemProfile,
  type Trust,
} from './specs'

export type CheckId = 'gain' | 'tonal' | 'hiss'
export type Severity = 'ok' | 'note' | 'problem'

export type CheckOutcome<D> =
  | {
      status: 'ok'
      severity: Severity
      headline: string
      /** One line for Simple mode, shown only when severity is 'problem'. */
      summary: string
      working: WorkingRow[]
      assumptions: Assumption[]
      notes: string[]
      detail: D
    }
  /** Always soft: a secondary check never blocks the page. */
  | { status: 'needs'; missing: MissingInput[] }
  | { status: 'not_applicable'; reason: string }

export interface GainDetail {
  gainDb: number
  sourceV: number
  reachableWatts: number
  ampWatts: number
  limited: boolean
  shortfallDb: number
  sourceTrust: Trust
}
export interface TonalDetail {
  outputImpedanceOhms: number
  /** True when the output impedance came from a "> N" damping factor, so it's an upper bound. */
  outputImpedanceAtMost: boolean
  cableOhms: number
  zSourceOhms: number
  spanDb: number
  isLowerBound: boolean
  effectiveDampingFactor: number
  curve?: DeviationPoint[]
  peak?: DeviationPoint
  dip?: DeviationPoint
}
export interface HissDetail {
  hissDb: SeatLevel
  noiseUv: number
  fromSnr: boolean
  backgroundDba: number
}

export interface SystemCheckInput {
  speakers: SpeakerSpecs | null
  amp: SpeakerAmpSpecs | null
  source: SourceSpecs | null
  profile: SystemProfile
  mode: 'simple' | 'advanced'
}
export interface SystemChecks {
  power: PowerCheckOutcome
  gain: CheckOutcome<GainDetail>
  tonal: CheckOutcome<TonalDetail>
  hiss: CheckOutcome<HissDetail>
}

/** Typical output impedance when only the topology is known. Tube and hybrid are never assumed. */
export const ASSUMED_OUTPUT_IMPEDANCE_OHMS = { solid_state: 0.05, class_d: 0.1 } as const
/** The cable assumed when none is entered: a common run of a common gauge. */
export const ASSUMED_CABLE = { length_m: 3, awg: 16 } as const

const SOURCE_LABEL: Record<SourceKind, string> = {
  dac: 'DAC',
  dac_balanced: 'balanced DAC',
  phono: 'phono stage',
  preamp: 'preamp',
  other: 'source',
}

const DECLARED = {
  sourceV: {
    id: 'source.output_v',
    label: 'Source output',
    hint: 'On the source\'s spec sheet as maximum output, like "2 V RMS". Phono stage output depends on the cartridge.',
  },
  ampSensitivity: {
    id: 'amp.input_sensitivity_v',
    label: 'Amp input sensitivity',
    hint: 'In the amp\'s specs as input sensitivity ("1.5 V for rated output") or as gain in dB.',
  },
  outputImpedance: {
    id: 'amp.output_impedance_ohms',
    label: 'Amp output impedance',
    hint: "Stereophile's measurements list it; manuals often give damping factor instead, which works too.",
  },
  noise: {
    id: 'amp.noise',
    label: 'Amp noise',
    hint: 'In the amp\'s specs as signal-to-noise ratio ("SNR 95 dB") or output noise in µV.',
  },
} as const satisfies Record<string, MissingInput>

const fmt = (n: number) => String(Number(n.toFixed(1)))
const fmtW = (w: number) => (w < 10 ? w.toFixed(1) : String(Math.round(w)))
const fmtOhms = (z: number) => (z < 0.1 ? z.toFixed(2) : fmt(z))
const fmtHz = (hz: number) => (hz >= 1000 ? `${fmt(hz / 1000)} kHz` : `${Math.round(hz)} Hz`)
const signed = (db: number) => `${db >= 0 ? '+' : '−'}${Math.abs(db).toFixed(1)} dB`

function hasSource(source: SourceSpecs): boolean {
  return source.kind !== undefined || source.output_v !== undefined
}

export function runGainCheck(
  speakers: SpeakerSpecs,
  amp: SpeakerAmpSpecs,
  source: SourceSpecs
): CheckOutcome<GainDetail> {
  if (!hasSource(source)) {
    return { status: 'not_applicable', reason: 'No source added. Add your DAC, phono stage or preamp to check gain.' }
  }
  if (amp.subtype === 'integrated' && source.kind === 'preamp') {
    return { status: 'not_applicable', reason: 'An integrated amp has its own preamp, so this pairing has no gain to match.' }
  }
  const nominal = speakers.nominal_impedance_ohms?.value
  const resolved = nominal !== undefined ? resolveAmpPower(amp, nominal, speakers.min_impedance_ohms?.value) : null
  if (!resolved || nominal === undefined) {
    return { status: 'not_applicable', reason: "Add the amp's power and the speakers' impedance first." }
  }

  const missing: MissingInput[] = []
  if (!source.output_v) missing.push(DECLARED.sourceV)
  // Sensitivity is quoted for rated output, normally the 8 Ω rating.
  const ratingW = amp.power_w_8ohm?.value ?? amp.power_w_4ohm?.value
  const ratingOhms = amp.power_w_8ohm ? GAIN_REFERENCE_OHMS : 4
  if (!amp.gain_db && !(amp.input_sensitivity_v && ratingW !== undefined)) missing.push(DECLARED.ampSensitivity)
  if (missing.length > 0) return { status: 'needs', missing }

  const sourceV = source.output_v!.value
  const gainDb = amp.gain_db ? amp.gain_db.value : ampGainDb(ratingW!, amp.input_sensitivity_v!.value, ratingOhms)
  const reach = reachableWatts(sourceV, gainDb, resolved.watts, nominal)
  const name = SOURCE_LABEL[source.kind ?? 'other']
  const severity: Severity = !reach.limited ? 'ok' : reach.shortfallDb >= 1 ? 'problem' : 'note'

  const headline = reach.limited
    ? `Your ${name}'s ${fmt(sourceV)} V only drives this amp to about ${fmtW(reach.watts)} W of its ${fmtW(resolved.watts)} W (${fmt(reach.shortfallDb)} dB short).`
    : `Your ${name} can drive this amp to full power.`
  const notes: string[] = []
  if (reach.limited) {
    notes.push('The power result above already uses the reachable power. A source with more output, or a preamp, gets the rest.')
  }
  if (gainDb > HIGH_GAIN_NOTE_DB && source.has_volume !== true && amp.subtype === 'power') {
    notes.push('This amp has a lot of gain, so volume will sit low and small knob movements make big changes.')
  }
  const sensRow: WorkingRow = amp.gain_db
    ? { step: 'Amp gain', value: `${fmt(gainDb)} dB`, trust: amp.gain_db.trust }
    : {
        step: 'Amp input sensitivity',
        value: `${fmt(amp.input_sensitivity_v!.value)} V for ${fmtW(ratingW!)} W into ${ratingOhms} Ω → ${fmt(gainDb)} dB gain`,
        trust: amp.input_sensitivity_v!.trust,
      }
  return {
    status: 'ok',
    severity,
    headline,
    summary: `Your ${name} can't drive this amp to full power.`,
    working: [
      { step: 'Source output', value: `${fmt(sourceV)} V`, trust: source.output_v!.trust },
      sensRow,
      {
        step: 'Power the source can reach',
        value: `${fmtW(reach.watts)} W of ${fmtW(resolved.watts)} W into ${fmt(nominal)} Ω`,
        trust: 'modeled',
      },
    ],
    assumptions: [],
    notes,
    detail: {
      gainDb,
      sourceV,
      reachableWatts: reach.watts,
      ampWatts: resolved.watts,
      limited: reach.limited,
      shortfallDb: reach.shortfallDb,
      sourceTrust: source.output_v!.trust,
    },
  }
}

export function runTonalCheck(
  speakers: SpeakerSpecs,
  amp: SpeakerAmpSpecs,
  profile: SystemProfile
): CheckOutcome<TonalDetail> {
  const nominal = speakers.nominal_impedance_ohms?.value
  if (nominal === undefined) return { status: 'not_applicable', reason: "Add the speakers' impedance first." }

  const assumptions: Assumption[] = []
  const notes: string[] = []
  let zOut: number
  let zOutAtMost = false
  let zOutRow: WorkingRow
  if (amp.output_impedance_ohms) {
    zOut = amp.output_impedance_ohms.value
    zOutRow = { step: 'Amp output impedance', value: `${fmtOhms(zOut)} Ω`, trust: amp.output_impedance_ohms.trust }
  } else if (amp.damping_factor) {
    const df = amp.damping_factor
    const ref = df.ref_ohms ?? DAMPING_FACTOR_REF_OHMS
    zOut = outputImpedanceFromDampingFactor(df.value, ref)
    zOutAtMost = df.lower_bound === true
    const at = df.at_hz ? ` at ${fmtHz(df.at_hz)}` : ''
    zOutRow = {
      step: 'Amp output impedance',
      value: `${zOutAtMost ? 'at most ' : ''}${fmtOhms(zOut)} Ω (converted from damping factor ${zOutAtMost ? 'over ' : ''}${fmt(df.value)} at ${fmt(ref)} Ω${at})`,
      trust: df.trust,
    }
  } else if (amp.topology === 'solid_state' || amp.topology === 'class_d') {
    zOut = ASSUMED_OUTPUT_IMPEDANCE_OHMS[amp.topology]
    const label = amp.topology === 'solid_state' ? 'solid-state' : 'class-D'
    assumptions.push({ id: 'amp.output_impedance_ohms', text: `Assumed a typical ${label} output impedance (about ${fmtOhms(zOut)} Ω).` })
    zOutRow = { step: 'Amp output impedance', value: `about ${fmtOhms(zOut)} Ω (typical ${label})`, trust: 'assumed' }
    if (amp.topology === 'class_d') {
      notes.push("Some class-D amps' treble changes with the speaker load; this check covers the bass and midrange.")
    }
  } else {
    // Tube, hybrid or unknown: typical values span 0.5 to 4 Ω, so a guess would decide the verdict.
    return { status: 'needs', missing: [DECLARED.outputImpedance] }
  }

  const given = profile.cable
  const length = given?.length_m ?? ASSUMED_CABLE.length_m
  const awg = given?.awg ?? ASSUMED_CABLE.awg
  if (given?.length_m == null || given?.awg == null) {
    assumptions.push({ id: 'cable.run', text: `Assumed ${fmt(length)} m of ${awg} AWG speaker cable.` })
  }
  const cableOhms = cableLoopResistanceOhms(length, awg)
  const zSrc = zOut + cableOhms
  const dfEff = effectiveDampingFactor(nominal, zSrc)

  const curve = speakers.impedance_curve
  let spanDb: number
  let isLowerBound: boolean
  let detailCurve: Pick<TonalDetail, 'curve' | 'peak' | 'dip'> = {}
  let impedanceRow: WorkingRow
  if (curve) {
    const dev = responseDeviation(curve.value, zSrc)
    spanDb = dev.spanDb
    isLowerBound = false
    detailCurve = { curve: dev.points, peak: dev.peak, dip: dev.dip }
    const zs = curve.value.map((p) => p.ohms)
    impedanceRow = {
      step: 'Speaker impedance curve',
      value: `${fmt(Math.min(...zs))} to ${fmt(Math.max(...zs))} Ω across ${curve.value.length} points`,
      trust: curve.trust,
    }
  } else {
    const min = speakers.min_impedance_ohms
    const max = speakers.max_impedance_ohms
    const bound = deviationSpanBound({ nominalOhms: nominal, minOhms: min?.value, maxOhms: max?.value }, zSrc)
    spanDb = bound.spanDb
    isLowerBound = bound.isLowerBound
    const parts = [`${fmt(nominal)} Ω nominal`, min && `lowest ${fmt(min.value)} Ω`, max && `highest ${fmt(max.value)} Ω`]
    impedanceRow = {
      step: 'Speaker impedance',
      value: parts.filter(Boolean).join(', '),
      trust: (min ?? max ?? speakers.nominal_impedance_ohms)!.trust,
    }
  }

  const severity: Severity = spanDb < TONAL_INAUDIBLE_DB ? 'ok' : spanDb < TONAL_CLEAR_DB ? 'note' : 'problem'
  const phrase =
    severity === 'ok'
      ? 'No audible change'
      : spanDb < TONAL_NOTE_DB
        ? 'A subtle change in tonal balance'
        : severity === 'note'
          ? 'A noticeable change in tonal balance'
          : 'A clear change in tonal balance'
  let headline: string
  if (detailCurve.peak && detailCurve.dip && severity !== 'ok') {
    headline = `${phrase}: about ${signed(detailCurve.peak.db)} around ${fmtHz(detailCurve.peak.hz)} and ${signed(detailCurve.dip.db)} around ${fmtHz(detailCurve.dip.hz)}.`
  } else if (severity === 'ok' && isLowerBound) {
    headline = `${phrase} from the impedance points we know (${fmt(spanDb)} dB). The full impedance curve would confirm it.`
  } else {
    headline = `${phrase}: ${isLowerBound ? 'at least' : 'about'} ${fmt(spanDb)} dB across the speakers' impedance range.`
  }
  if (isLowerBound && severity !== 'ok') {
    notes.push("Without the speakers' full impedance curve this is a floor: the bass peak usually adds more.")
  }
  if (zOutAtMost) notes.push('The damping factor is quoted as a minimum, so the shift is at most this.')
  notes.push(
    `Damping factor is ${DAMPING_FACTOR_REF_OHMS} Ω ÷ the amp's output impedance. Above about 20 to 50, its effect on frequency response and bass is too small to hear. This system's effective damping factor is ${dfEff < 10 ? fmt(dfEff) : Math.round(dfEff)}, counting the cable.`
  )
  if (severity !== 'ok') notes.push('This is a change in sound, not damage. Many listeners choose it on purpose.')

  return {
    status: 'ok',
    severity,
    headline,
    summary: 'With this amp, these speakers will sound noticeably different.',
    working: [
      zOutRow,
      {
        step: 'Speaker cable, there and back',
        value: `${fmtOhms(cableOhms)} Ω (${fmt(length)} m of ${awg} AWG copper)`,
        trust: given?.length_m != null && given?.awg != null ? 'user' : 'assumed',
      },
      impedanceRow,
      { step: 'Effective damping factor', value: dfEff < 10 ? fmt(dfEff) : String(Math.round(dfEff)), trust: 'modeled' },
      { step: 'Response span', value: `${isLowerBound ? 'at least ' : ''}${fmt(spanDb)} dB`, trust: 'modeled' },
    ],
    assumptions,
    notes,
    detail: {
      outputImpedanceOhms: zOut,
      outputImpedanceAtMost: zOutAtMost,
      cableOhms,
      zSourceOhms: zSrc,
      spanDb,
      isLowerBound,
      effectiveDampingFactor: dfEff,
      ...detailCurve,
    },
  }
}

export function runHissCheck(amp: SpeakerAmpSpecs, power: PowerCheckOutcome): CheckOutcome<HissDetail> {
  if (power.status !== 'ok') return { status: 'not_applicable', reason: 'Needs a power result first.' }

  let noiseV: number
  let fromSnr = false
  let noiseRow: WorkingRow
  const notes: string[] = []
  if (amp.output_noise_uv) {
    noiseV = amp.output_noise_uv.value * 1e-6
    noiseRow = { step: 'Amp output noise', value: `${fmt(amp.output_noise_uv.value)} µV`, trust: amp.output_noise_uv.trust }
  } else if (amp.snr_db) {
    const snr = amp.snr_db
    const ratedW = amp.power_w_8ohm?.value ?? amp.power_w_4ohm?.value
    const ratedOhms = amp.power_w_8ohm ? 8 : 4
    // An unstated reference is read as rated power: the highest noise voltage, so the worst case.
    const refW = snr.ref === '1W' ? 1 : ratedW
    if (refW === undefined) return { status: 'not_applicable', reason: "Add the amp's power rating to read its SNR." }
    const refOhms = snr.ref === '1W' ? 8 : ratedOhms
    noiseV = noiseVoltsFromSnr(snr.value, refW, refOhms)
    fromSnr = true
    const refText =
      snr.ref === '1W' ? 'at 1 W' : snr.ref === 'rated' ? 'at rated power' : 'reference not stated, read as rated power (worst case)'
    noiseRow = {
      step: 'Amp noise',
      value: `SNR ${fmt(snr.value)} dB ${refText} → ${Math.round(noiseV * 1e6)} µV`,
      trust: snr.trust,
    }
    if (snr.ref === 'unknown') notes.push("The SNR's reference isn't stated, so we read it the way that gives the most hiss.")
  } else {
    return { status: 'needs', missing: [DECLARED.noise] }
  }

  const hiss = hissAtSeat(power.seat.levelPerWattMax, noiseV, power.seat.nominalOhms)
  const below = ROOM_BACKGROUND_DBA - hiss.inRoom
  const severity: Severity =
    hiss.inRoom <= ROOM_BACKGROUND_DBA - HISS_MASKED_MARGIN_DB ? 'ok' : hiss.inRoom <= ROOM_BACKGROUND_DBA ? 'note' : 'problem'
  const headline =
    severity === 'ok'
      ? `Silent from your seat: about ${Math.round(below)} dB under a quiet room.`
      : severity === 'note'
        ? `Faint hiss possible in a very quiet room: about ${Math.round(hiss.inRoom)} dB at your seat.`
        : `You'll hear hiss between tracks: about ${Math.round(hiss.inRoom)} dB at your seat, ${Math.round(-below)} dB above a quiet room.`
  if (severity !== 'problem') notes.push("With your ear right at a tweeter, hiss can still be audible; this is at your seat.")
  if (amp.subtype === 'integrated' || amp.subtype === 'receiver') {
    notes.push('Noise specs are often measured at a low volume setting; hiss can rise with the volume knob.')
  }
  return {
    status: 'ok',
    severity,
    headline,
    summary: 'You may hear hiss from these speakers with this amp.',
    working: [
      noiseRow,
      { step: 'Hiss at your seat', value: `${fmt(hiss.inRoom)} dB in room, ${fmt(hiss.freeField)} dB free field`, trust: 'modeled' },
      { step: 'Quiet room for comparison', value: `${ROOM_BACKGROUND_DBA} dBA`, trust: 'modeled' },
    ],
    assumptions: [],
    notes,
    detail: { hissDb: hiss, noiseUv: noiseV * 1e6, fromSnr, backgroundDba: ROOM_BACKGROUND_DBA },
  }
}

/** Run every check. Gain runs first because a weak source caps the power check. */
export function runSystemChecks(input: SystemCheckInput): SystemChecks {
  const speakers = parseSpeakerSpecs(input.speakers)
  const amp = parseSpeakerAmpSpecs(input.amp)
  const source = parseSourceSpecs(input.source)
  const profile = parseSystemProfile(input.profile)

  const gain = runGainCheck(speakers, amp, source)
  const sourceLimit =
    gain.status === 'ok' && gain.detail.limited
      ? { watts: gain.detail.reachableWatts, sourceV: gain.detail.sourceV, trust: gain.detail.sourceTrust }
      : undefined
  const power = runPowerCheck({ speakers, amp, profile, mode: input.mode, sourceLimit })
  return {
    power,
    gain,
    tonal: runTonalCheck(speakers, amp, profile),
    hiss: runHissCheck(amp, power),
  }
}

const PROBLEM_ORDER: CheckId[] = ['gain', 'hiss', 'tonal']

/** The single worst secondary problem, for Simple mode's one line (decision D3). */
export function worstProblem(checks: SystemChecks): { id: CheckId; summary: string } | null {
  for (const id of PROBLEM_ORDER) {
    const c = checks[id]
    if (c.status === 'ok' && c.severity === 'problem') return { id, summary: c.summary }
  }
  return null
}
