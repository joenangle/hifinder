import { describe, it, expect } from 'vitest'
import {
  SPEC_RANGES,
  parseSpeakerSpecs,
  parseSpeakerAmpSpecs,
  parseSystemProfile,
  parseSourceSpecs,
  applyOverrides,
} from '../stereo/specs'

const sv = (value: unknown, trust: unknown = 'claimed') => ({ value, trust, source_url: 'https://x' })

describe('parseSpeakerSpecs', () => {
  it('keeps a valid spec value', () => {
    const out = parseSpeakerSpecs({ sensitivity_db: sv(87) })
    expect(out.sensitivity_db).toEqual({ value: 87, trust: 'claimed', source_url: 'https://x' })
  })

  it('drops out-of-range values', () => {
    const out = parseSpeakerSpecs({
      sensitivity_db: sv(69),
      nominal_impedance_ohms: sv(33),
      min_impedance_ohms: sv(0.5),
      f3_hz: sv(5),
      directivity_q: sv(21),
    })
    expect(out).toEqual({})
    expect(parseSpeakerSpecs({ sensitivity_db: sv(111) }).sensitivity_db).toBeUndefined()
    expect(parseSpeakerSpecs({ sensitivity_db: sv(70) }).sensitivity_db?.value).toBe(70)
    expect(parseSpeakerSpecs({ sensitivity_db: sv(110) }).sensitivity_db?.value).toBe(110)
  })

  it('drops non-numbers and unknown trust', () => {
    expect(parseSpeakerSpecs({ sensitivity_db: sv('87') })).toEqual({})
    expect(parseSpeakerSpecs({ sensitivity_db: sv(NaN) })).toEqual({})
    expect(parseSpeakerSpecs({ sensitivity_db: sv(null) })).toEqual({})
    expect(parseSpeakerSpecs({ sensitivity_db: sv(87, 'guess') })).toEqual({})
    expect(parseSpeakerSpecs({ sensitivity_db: { value: 87 } })).toEqual({})
  })

  it('never throws on junk input', () => {
    for (const j of [null, undefined, 42, 'x', [], [1], { sensitivity_db: 5 }, { review_links: 'a' }]) {
      expect(() => parseSpeakerSpecs(j)).not.toThrow()
    }
    expect(parseSpeakerSpecs(null)).toEqual({})
  })

  it('validates sensitivity_ref and review_links', () => {
    const out = parseSpeakerSpecs({
      sensitivity_ref: sv('2.83V', 'measured'),
      review_links: [
        { outlet: 'ASR', url: 'https://a.com', kind: 'measurement' },
        { outlet: '', url: 'https://a.com', kind: 'measurement' },
        { outlet: 'X', url: 'ftp://a.com', kind: 'measurement' },
        { outlet: 'X', url: 'https://a.com', kind: 'bogus' },
      ],
    })
    expect(out.sensitivity_ref?.value).toBe('2.83V')
    expect(out.review_links).toEqual([{ outlet: 'ASR', url: 'https://a.com', kind: 'measurement' }])
    expect(parseSpeakerSpecs({ sensitivity_ref: sv('3V') }).sensitivity_ref).toBeUndefined()
  })
})

describe('parseSpeakerAmpSpecs', () => {
  it('keeps valid power and drops out-of-range', () => {
    const out = parseSpeakerAmpSpecs({ power_w_8ohm: sv(100), power_w_4ohm: sv(6000) })
    expect(out.power_w_8ohm?.value).toBe(100)
    expect(out.power_w_4ohm).toBeUndefined()
    expect(parseSpeakerAmpSpecs({ power_w_8ohm: sv(0.05) }).power_w_8ohm).toBeUndefined()
  })

  it('validates subtype, power_rating and outputs', () => {
    const out = parseSpeakerAmpSpecs({
      subtype: 'integrated',
      power_rating: { kind: 'continuous', thd_pct: 0.1, channels_driven: 'two' },
      outputs: { sub_out: true, pre_out: 'yes', phono: false },
    })
    expect(out.subtype).toBe('integrated')
    expect(out.power_rating).toEqual({ kind: 'continuous', thd_pct: 0.1, channels_driven: 'two' })
    expect(out.outputs).toEqual({ sub_out: true, phono: false })
    const bad = parseSpeakerAmpSpecs({
      subtype: 'tube',
      power_rating: { kind: 'huge', thd_pct: 1 },
    })
    expect(bad).toEqual({})
    const partial = parseSpeakerAmpSpecs({ power_rating: { kind: 'peak', thd_pct: 101, channels_driven: 'many' } })
    expect(partial.power_rating).toEqual({ kind: 'peak' })
  })

  it('never throws on junk input', () => {
    for (const j of [null, 7, 'x', [], { power_rating: 3 }, { outputs: null }]) {
      expect(() => parseSpeakerAmpSpecs(j)).not.toThrow()
    }
  })
})

describe('parseSystemProfile', () => {
  it('returns defaults for empty input', () => {
    expect(parseSystemProfile({})).toEqual({
      room: null,
      room_preset: null,
      acoustics: null,
      distance_m: null,
      near_wall: null,
      target_peak_db: 90,
    })
    expect(parseSystemProfile(null).target_peak_db).toBe(90)
  })

  it('clamps and rounds target_peak_db', () => {
    expect(parseSystemProfile({ target_peak_db: 200 }).target_peak_db).toBe(110)
    expect(parseSystemProfile({ target_peak_db: 10 }).target_peak_db).toBe(60)
    expect(parseSystemProfile({ target_peak_db: 90.6 }).target_peak_db).toBe(91)
    expect(parseSystemProfile({ target_peak_db: 'loud' }).target_peak_db).toBe(90)
  })

  it('range-checks room and distance', () => {
    const ok = parseSystemProfile({ room: { length_m: 5, width_m: 4, height_m: 2.5 }, distance_m: 3 })
    expect(ok.room).toEqual({ length_m: 5, width_m: 4, height_m: 2.5 })
    expect(ok.distance_m).toBe(3)
    expect(parseSystemProfile({ room: { length_m: 51, width_m: 4, height_m: 2.5 } }).room).toBeNull()
    expect(parseSystemProfile({ room: { length_m: 5, width_m: 1.4, height_m: 2.5 } }).room).toBeNull()
    expect(parseSystemProfile({ room: { length_m: 5, width_m: 4 } }).room).toBeNull()
    expect(parseSystemProfile({ distance_m: 0.2 }).distance_m).toBeNull()
    expect(parseSystemProfile({ distance_m: 21 }).distance_m).toBeNull()
    expect(parseSystemProfile({ distance_m: 0.3 }).distance_m).toBe(0.3)
  })

  it('validates enums and near_wall', () => {
    const out = parseSystemProfile({ room_preset: 'office', acoustics: 'damped', near_wall: true })
    expect(out.room_preset).toBe('office')
    expect(out.acoustics).toBe('damped')
    expect(out.near_wall).toBe(true)
    const bad = parseSystemProfile({ room_preset: 'garage', acoustics: 'echoey', near_wall: 'yes' })
    expect(bad.room_preset).toBeNull()
    expect(bad.acoustics).toBeNull()
    expect(bad.near_wall).toBeNull()
  })
})

describe('applyOverrides', () => {
  const catalog = parseSpeakerSpecs({
    sensitivity_db: sv(87, 'measured'),
    nominal_impedance_ohms: sv(8, 'claimed'),
  })

  it('stamps trust user and keeps non-overridden trust', () => {
    const out = applyOverrides(catalog, { sensitivity_db: { value: 90 } }, parseSpeakerSpecs)
    expect(out.sensitivity_db).toEqual({ value: 90, trust: 'user', source_url: null })
    expect(out.nominal_impedance_ohms?.trust).toBe('claimed')
  })

  it('forces user trust whatever the override claims', () => {
    const out = applyOverrides(catalog, { sensitivity_db: { value: 90, trust: 'measured' } }, parseSpeakerSpecs)
    expect(out.sensitivity_db?.trust).toBe('user')
  })

  it('leaves catalog untouched for junk overrides', () => {
    for (const j of [null, 5, 'x', [], { sensitivity_db: { value: 'loud' } }, { sensitivity_db: { value: 500 } }]) {
      expect(applyOverrides(catalog, j, parseSpeakerSpecs)).toEqual(catalog)
    }
  })

  it('does not mutate the catalog', () => {
    applyOverrides(catalog, { sensitivity_db: { value: 90 } }, parseSpeakerSpecs)
    expect(catalog.sensitivity_db?.value).toBe(87)
  })

  it('replaces plain fields on amp specs', () => {
    const amp = parseSpeakerAmpSpecs({ subtype: 'power', power_w_8ohm: sv(50) })
    const out = applyOverrides(amp, { subtype: 'receiver', power_w_8ohm: { value: 80 } }, parseSpeakerAmpSpecs)
    expect(out.subtype).toBe('receiver')
    expect(out.power_w_8ohm).toEqual({ value: 80, trust: 'user', source_url: null })
  })
})

describe('SPEC_RANGES', () => {
  it('exposes the named ranges', () => {
    expect(SPEC_RANGES.sensitivity_db).toEqual([70, 110])
    expect(SPEC_RANGES.power_w).toEqual([0.1, 5000])
  })
})

describe('advanced-mode speaker fields', () => {
  const curve = [
    { hz: 20, ohms: 9 },
    { hz: 55, ohms: 28 },
    { hz: 180, ohms: 3.4 },
  ]

  it('keeps max impedance and a valid impedance curve', () => {
    const out = parseSpeakerSpecs({
      max_impedance_ohms: sv(28),
      impedance_curve: sv(curve, 'measured'),
    })
    expect(out.max_impedance_ohms?.value).toBe(28)
    expect(out.impedance_curve?.value).toEqual(curve)
    expect(out.impedance_curve?.trust).toBe('measured')
  })

  it('drops a curve that is too short, unordered or out of range, whole', () => {
    expect(parseSpeakerSpecs({ impedance_curve: sv(curve.slice(0, 2)) }).impedance_curve).toBeUndefined()
    expect(parseSpeakerSpecs({ impedance_curve: sv([curve[1], curve[0], curve[2]]) }).impedance_curve).toBeUndefined()
    expect(
      parseSpeakerSpecs({ impedance_curve: sv([...curve, { hz: 180, ohms: 4 }]) }).impedance_curve
    ).toBeUndefined()
    expect(
      parseSpeakerSpecs({ impedance_curve: sv([...curve, { hz: 500, ohms: 0.2 }]) }).impedance_curve
    ).toBeUndefined()
    expect(parseSpeakerSpecs({ impedance_curve: sv('flat') }).impedance_curve).toBeUndefined()
  })

  it('keeps max SPL with its method and kind, defaulting both to unknown', () => {
    const out = parseSpeakerSpecs({ max_spl_db: { ...sv(105), method: 'aes75', kind: 'peak' } })
    expect(out.max_spl_db).toMatchObject({ value: 105, method: 'aes75', kind: 'peak' })
    const bare = parseSpeakerSpecs({ max_spl_db: { ...sv(105), method: 'guess' } })
    expect(bare.max_spl_db).toMatchObject({ method: 'unknown', kind: 'unknown' })
    expect(parseSpeakerSpecs({ max_spl_db: sv(140) }).max_spl_db).toBeUndefined()
  })

  it('keeps compression sweeps and drops junk rows whole', () => {
    const sweep = [
      { level_db_1m: 96, worst_db: 1.1 },
      { level_db_1m: 102, worst_db: 3.8 },
    ]
    expect(parseSpeakerSpecs({ compression: sv(sweep, 'measured') }).compression?.value).toEqual(sweep)
    expect(parseSpeakerSpecs({ compression: sv([]) }).compression).toBeUndefined()
    expect(
      parseSpeakerSpecs({ compression: sv([...sweep, { level_db_1m: 140, worst_db: 1 }]) }).compression
    ).toBeUndefined()
  })

  it('keeps power handling with its kind', () => {
    const out = parseSpeakerSpecs({ power_handling_w: { ...sv(100), kind: 'program' } })
    expect(out.power_handling_w).toMatchObject({ value: 100, kind: 'program' })
    expect(parseSpeakerSpecs({ power_handling_w: sv(100) }).power_handling_w?.kind).toBe('unknown')
    expect(parseSpeakerSpecs({ power_handling_w: sv(0) }).power_handling_w).toBeUndefined()
  })
})

describe('advanced-mode amp fields', () => {
  it('keeps topology, output impedance, gain, sensitivity and noise', () => {
    const out = parseSpeakerAmpSpecs({
      topology: 'tube',
      output_impedance_ohms: sv(1),
      input_sensitivity_v: sv(0.35),
      gain_db: sv(29),
      output_noise_uv: sv(200),
    })
    expect(out.topology).toBe('tube')
    expect(out.output_impedance_ohms?.value).toBe(1)
    expect(out.input_sensitivity_v?.value).toBe(0.35)
    expect(out.gain_db?.value).toBe(29)
    expect(out.output_noise_uv?.value).toBe(200)
    expect(parseSpeakerAmpSpecs({ topology: 'valve' }).topology).toBeUndefined()
    expect(parseSpeakerAmpSpecs({ output_noise_uv: sv(-5) }).output_noise_uv).toBeUndefined()
  })

  it('keeps damping factor with its reference load, frequency and lower-bound flag', () => {
    const out = parseSpeakerAmpSpecs({
      damping_factor: { ...sv(200), ref_ohms: 8, at_hz: 1000, lower_bound: true },
    })
    expect(out.damping_factor).toMatchObject({ value: 200, ref_ohms: 8, at_hz: 1000, lower_bound: true })
    const bare = parseSpeakerAmpSpecs({ damping_factor: { ...sv(50), ref_ohms: 100, lower_bound: 'yes' } })
    expect(bare.damping_factor?.ref_ohms).toBeUndefined()
    expect(bare.damping_factor?.lower_bound).toBeUndefined()
  })

  it('keeps SNR with its reference, defaulting to unknown', () => {
    expect(parseSpeakerAmpSpecs({ snr_db: { ...sv(88), ref: 'rated' } }).snr_db?.ref).toBe('rated')
    expect(parseSpeakerAmpSpecs({ snr_db: sv(88) }).snr_db?.ref).toBe('unknown')
    expect(parseSpeakerAmpSpecs({ snr_db: sv(200) }).snr_db).toBeUndefined()
  })

  it('stamps user trust on hand-entered nested values', () => {
    const out = applyOverrides({}, { damping_factor: { value: 8, trust: 'measured', ref_ohms: 8 } }, parseSpeakerAmpSpecs)
    expect(out.damping_factor).toMatchObject({ value: 8, trust: 'user', ref_ohms: 8 })
  })
})

describe('parseSourceSpecs', () => {
  it('keeps kind, output voltage and volume control', () => {
    expect(parseSourceSpecs({ kind: 'dac', output_v: sv(2, 'user'), has_volume: false })).toEqual({
      kind: 'dac',
      output_v: { value: 2, trust: 'user', source_url: 'https://x' },
      has_volume: false,
    })
  })

  it('drops junk', () => {
    expect(parseSourceSpecs({ kind: 'cd', output_v: sv(0), has_volume: 'no' })).toEqual({})
    expect(parseSourceSpecs(null)).toEqual({})
  })
})

describe('parseSystemProfile cable', () => {
  it('keeps a valid cable run and leaves it out when unset', () => {
    expect(parseSystemProfile({ cable: { length_m: 3, awg: 16 } }).cable).toEqual({ length_m: 3, awg: 16 })
    expect(parseSystemProfile({ cable: { length_m: 3, awg: null } }).cable).toEqual({ length_m: 3, awg: null })
    expect('cable' in parseSystemProfile({})).toBe(false)
  })

  it('drops a zero length, an out-of-range or fractional gauge', () => {
    expect('cable' in parseSystemProfile({ cable: { length_m: 0, awg: 50 } })).toBe(false)
    expect(parseSystemProfile({ cable: { length_m: 3, awg: 0 } }).cable).toEqual({ length_m: 3, awg: null })
    expect(parseSystemProfile({ cable: { length_m: 3, awg: 16.5 } }).cable).toEqual({ length_m: 3, awg: null })
  })
})
