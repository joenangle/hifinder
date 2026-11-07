import { describe, it, expect } from 'vitest'
import { runGainCheck, runHissCheck, runSystemChecks, runTonalCheck, worstProblem, type SystemCheckInput } from '../stereo/checks'
import { runPowerCheck, AMP_ONLY_CAVEAT } from '../stereo/power-check'
import { resolveSpeakerLimit, POWER_HANDLING_DERATE_DB } from '../stereo/limits'
import type { SourceSpecs, SpeakerAmpSpecs, SpeakerSpecs, SystemProfile } from '../stereo/specs'

const sv = <T,>(value: T, trust: 'claimed' | 'measured' | 'user' = 'claimed') => ({ value, trust })

const speakers = (over: Partial<SpeakerSpecs> = {}): SpeakerSpecs => ({
  sensitivity_db: sv(87),
  sensitivity_ref: sv('2.83V' as const),
  nominal_impedance_ohms: sv(8),
  ...over,
})
const amp = (over: Partial<SpeakerAmpSpecs> = {}): SpeakerAmpSpecs => ({
  power_w_8ohm: sv(100),
  power_rating: { kind: 'continuous' },
  ...over,
})
const profile = (over: Partial<SystemProfile> = {}): SystemProfile => ({
  room: { length_m: 5, width_m: 4, height_m: 2.6 },
  room_preset: null,
  acoustics: 'average',
  distance_m: 3,
  near_wall: null,
  target_peak_db: 95,
  ...over,
})
const dac: SourceSpecs = { kind: 'dac', output_v: sv(2, 'user') }
const input = (over: Partial<SystemCheckInput> = {}): SystemCheckInput => ({
  speakers: speakers(),
  amp: amp(),
  source: null,
  profile: profile(),
  mode: 'simple',
  ...over,
})

function okOf<T extends { status: string }>(c: T): Extract<T, { status: 'ok' }> {
  if (c.status !== 'ok') throw new Error('expected ok, got ' + JSON.stringify(c))
  return c as Extract<T, { status: 'ok' }>
}

describe('gain check', () => {
  it('is not applicable without a source', () => {
    expect(runGainCheck(speakers(), amp(), {}).status).toBe('not_applicable')
  })

  it('needs the source output and the amp sensitivity', () => {
    const out = runGainCheck(speakers(), amp(), { kind: 'phono' })
    expect(out.status === 'needs' && out.missing.map((m) => m.id)).toEqual(['source.output_v', 'amp.input_sensitivity_v'])
  })

  it('a 2 V DAC into a 100 W amp needing 2.5 V reaches about 64 W, a problem', () => {
    const out = okOf(runGainCheck(speakers(), amp({ input_sensitivity_v: sv(2.5) }), dac))
    expect(out.detail.reachableWatts).toBeCloseTo(64, 0)
    expect(out.severity).toBe('problem')
    expect(out.headline).toMatch(/about 64 W of its 100 W/)
  })

  it('is ok when the source reaches full power, from gain in dB too', () => {
    expect(okOf(runGainCheck(speakers(), amp({ input_sensitivity_v: sv(1) }), dac)).severity).toBe('ok')
    expect(okOf(runGainCheck(speakers(), amp({ gain_db: sv(29) }), dac)).severity).toBe('ok')
  })
})

describe('gain cap feeding the power verdict (review focus 1)', () => {
  it('the power check uses the reachable watts and says why', () => {
    const checks = runSystemChecks(input({ amp: amp({ input_sensitivity_v: sv(2.5) }), source: dac }))
    const power = okOf(checks.power)
    expect(power.limitedBy).toBe('source')
    const row = power.working.find((r) => r.step === 'Limited by source level')
    expect(row?.value).toBe('2 V reaches 64 W of 100 W')
    expect(power.notes.some((n) => n.includes("can only drive this amp to about 64 W"))).toBe(true)
  })

  it('without a source the power result is exactly as before (review focus 6)', () => {
    const checks = runSystemChecks(input())
    const plain = runPowerCheck({ speakers: speakers(), amp: amp(), profile: profile(), mode: 'simple' })
    expect(checks.power).toEqual(plain)
    expect(okOf(checks.power).limitedBy).toBe('amp')
    expect(okOf(checks.power).caveat).toBe(AMP_ONLY_CAVEAT)
  })
})

describe('tonal check', () => {
  const tube = amp({ topology: 'tube' })

  it('needs the output impedance for a tube amp, never assumes it (review focus 4)', () => {
    const out = runTonalCheck(speakers(), tube, profile())
    expect(out.status === 'needs' && out.missing.map((m) => m.id)).toEqual(['amp.output_impedance_ohms'])
    expect(runTonalCheck(speakers(), amp(), profile()).status).toBe('needs')
  })

  it('assumes a typical solid-state value as a chip, with the cable', () => {
    const out = okOf(runTonalCheck(speakers({ min_impedance_ohms: sv(3.2), max_impedance_ohms: sv(30) }), amp({ topology: 'solid_state' }), profile()))
    expect(out.severity).toBe('ok')
    expect(out.assumptions.map((a) => a.id)).toEqual(['amp.output_impedance_ohms', 'cable.run'])
  })

  it('converts damping factor and says so', () => {
    const out = okOf(
      runTonalCheck(
        speakers({ nominal_impedance_ohms: sv(6), min_impedance_ohms: sv(3.4), max_impedance_ohms: sv(28) }),
        amp({ topology: 'tube', damping_factor: { ...sv(8), ref_ohms: 8 } }),
        profile({ cable: { length_m: 3, awg: 16 } })
      )
    )
    expect(out.working[0].value).toBe('1 Ω (converted from damping factor 8 at 8 Ω)')
    expect(out.detail.effectiveDampingFactor).toBeCloseTo(5.56, 1)
    expect(out.severity).toBe('problem')
    expect(out.assumptions).toEqual([])
  })

  it('a "> 200" damping factor is an upper bound on output impedance (review focus 3)', () => {
    const out = okOf(runTonalCheck(speakers(), amp({ damping_factor: { ...sv(200), lower_bound: true } }), profile()))
    expect(out.detail.outputImpedanceAtMost).toBe(true)
    expect(out.working[0].value).toMatch(/^at most 0\.04 Ω/)
  })

  it('names the peak and dip with a measured curve', () => {
    const curve = [
      { hz: 20, ohms: 9 },
      { hz: 55, ohms: 28 },
      { hz: 180, ohms: 3.4 },
      { hz: 1000, ohms: 7 },
      { hz: 8000, ohms: 5.6 },
    ]
    const out = okOf(
      runTonalCheck(speakers({ impedance_curve: sv(curve, 'measured') }), amp({ output_impedance_ohms: sv(1) }), profile())
    )
    expect(out.detail.curve).toHaveLength(5)
    expect(out.headline).toMatch(/around 55 Hz and −\d\.\d dB around 180 Hz/)
  })

  it('a lower-bound result says it is a floor', () => {
    const out = okOf(runTonalCheck(speakers({ min_impedance_ohms: sv(3) }), amp({ output_impedance_ohms: sv(3) }), profile()))
    expect(out.detail.isLowerBound).toBe(true)
    expect(out.headline).toMatch(/at least/)
  })
})

describe('hiss check', () => {
  const powerOf = (s: SpeakerSpecs, a: SpeakerAmpSpecs) =>
    runPowerCheck({ speakers: s, amp: a, profile: profile(), mode: 'simple' })

  it('needs a noise spec', () => {
    const out = runHissCheck(amp(), powerOf(speakers(), amp()))
    expect(out.status === 'needs' && out.missing.map((m) => m.id)).toEqual(['amp.noise'])
  })

  it('reads an unknown SNR reference as rated power, the worst case (review focus 2)', () => {
    const unknown = okOf(runHissCheck(amp({ snr_db: { ...sv(90), ref: 'unknown' } }), powerOf(speakers(), amp())))
    const oneWatt = okOf(runHissCheck(amp({ snr_db: { ...sv(90), ref: '1W' } }), powerOf(speakers(), amp())))
    expect(unknown.detail.noiseUv).toBeCloseTo(894, 0)
    expect(unknown.detail.hissDb.inRoom).toBeGreaterThan(oneWatt.detail.hissDb.inRoom)
    expect(unknown.notes[0]).toMatch(/isn't stated/)
  })

  it('efficient speakers and a noisy amp are a problem; average ones are silent', () => {
    const horns = speakers({ sensitivity_db: sv(100), sensitivity_ref: sv('1W' as const) })
    const noisy = amp({ output_noise_uv: sv(1000) })
    expect(okOf(runHissCheck(noisy, powerOf(horns, noisy))).severity).toBe('problem')
    const quiet = amp({ output_noise_uv: sv(50) })
    expect(okOf(runHissCheck(quiet, powerOf(speakers(), quiet))).severity).toBe('ok')
  })
})

describe('speaker limits', () => {
  it('resolves each tier, best evidence first', () => {
    const measured = resolveSpeakerLimit(
      speakers({ max_spl_db: { ...sv(110), method: 'aes75', kind: 'peak' }, power_handling_w: { ...sv(100), kind: 'program' } }),
      84
    )
    expect(measured).toMatchObject({ basis: 'measured_max_spl', bound: 'estimate', averageDb1m: { low: 95, high: 95 } })

    const sweep = resolveSpeakerLimit(
      speakers({ compression: sv([{ level_db_1m: 96, worst_db: 1.2 }, { level_db_1m: 102, worst_db: 4.1 }], 'measured') }),
      84
    )
    expect(sweep).toMatchObject({ basis: 'compression_sweep', bound: 'range', averageDb1m: { low: 96, high: 102 } })

    const floorOnly = resolveSpeakerLimit(speakers({ compression: sv([{ level_db_1m: 96, worst_db: 1 }]) }), 84)
    expect(floorOnly?.bound).toBe('at_least')
    const ceilingOnly = resolveSpeakerLimit(speakers({ compression: sv([{ level_db_1m: 96, worst_db: 5 }]) }), 84)
    expect(ceilingOnly?.bound).toBe('at_most')

    const handling = resolveSpeakerLimit(speakers({ power_handling_w: { ...sv(200), kind: 'peak' } }), 87)
    expect(POWER_HANDLING_DERATE_DB.peak).toBe(6)
    expect(handling?.averageDb1m.low).toBeCloseTo(87 + 10 * Math.log10(200) - 6, 6)
    expect(resolveSpeakerLimit(speakers(), 84)).toBeNull()
  })

  it('speakers that run out first set the verdict and drop the caveat', () => {
    const small = speakers({ compression: sv([{ level_db_1m: 84, worst_db: 1.2 }, { level_db_1m: 90, worst_db: 3.4 }], 'measured') })
    const out = okOf(runPowerCheck({ speakers: small, amp: amp({ power_w_8ohm: sv(400) }), profile: profile({ target_peak_db: 110 }), mode: 'simple' }))
    expect(out.limitedBy).toBe('speakers')
    expect(out.verdict.kind).toBe('runs_out')
    expect(out.caveat).toBeNull()
    expect(out.notes).toContain("Your speakers, not the amp, set the limit here, so a bigger amp won't play louder cleanly.")
  })

  it('when the amp limits first, the speaker limit is a working row only', () => {
    const big = speakers({ max_spl_db: { ...sv(118), method: 'aes75', kind: 'peak' } })
    const out = okOf(runPowerCheck({ speakers: big, amp: amp({ power_w_8ohm: sv(20) }), profile: profile(), mode: 'simple' }))
    expect(out.limitedBy).toBe('amp')
    expect(out.working.some((r) => r.step === 'Speaker limit')).toBe(true)
    expect(out.caveat).toBeNull()
  })

  it('an at-least limit below the target is a note, not a downgrade', () => {
    const tested = speakers({ compression: sv([{ level_db_1m: 84, worst_db: 1 }]) })
    const withLimit = okOf(runPowerCheck({ speakers: tested, amp: amp(), profile: profile({ target_peak_db: 105 }), mode: 'simple' }))
    const without = okOf(runPowerCheck({ speakers: speakers(), amp: amp(), profile: profile({ target_peak_db: 105 }), mode: 'simple' }))
    expect(withLimit.verdict.kind).toBe(without.verdict.kind)
    expect(withLimit.notes.some((n) => n.includes("can't confirm them at your target"))).toBe(true)
  })
})

describe('worstProblem', () => {
  it('picks gain before hiss before tonal, and ignores notes', () => {
    const checks = runSystemChecks(
      input({ amp: amp({ input_sensitivity_v: sv(2.5), topology: 'tube', output_impedance_ohms: sv(3) }), source: dac })
    )
    expect(worstProblem(checks)?.id).toBe('gain')
    expect(worstProblem(runSystemChecks(input()))).toBeNull()
  })
})
