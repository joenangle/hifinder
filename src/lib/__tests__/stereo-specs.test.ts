import { describe, it, expect } from 'vitest'
import {
  SPEC_RANGES,
  parseSpeakerSpecs,
  parseSpeakerAmpSpecs,
  parseSystemProfile,
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
