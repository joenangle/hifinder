import { describe, it, expect } from 'vitest'
import { stereoParams, profileFromParams } from '../stereo/url-params'
import { DEFAULT_TARGET_PEAK_DB } from '../stereo/specs'

const emptyParams = {
  spk: null,
  amp: null,
  sx: {},
  ax: {},
  rp: null,
  l: null,
  w: null,
  h: null,
  ac: null,
  d: null,
  db: DEFAULT_TARGET_PEAK_DB,
}

describe('stereoParams.db', () => {
  it('clamps values above 115 to 115', () => {
    expect(stereoParams.db.parse('200')).toBe(115)
  })

  it('clamps values below 60 to 60', () => {
    expect(stereoParams.db.parse('10')).toBe(60)
  })

  it('passes through in-range integers', () => {
    expect(stereoParams.db.parse('92')).toBe(92)
  })

  it('falls back to the default for non-numeric input', () => {
    expect(stereoParams.db.parseServerSide('abc')).toBe(DEFAULT_TARGET_PEAK_DB)
  })
})

describe('stereoParams.sx / ax', () => {
  it('gives {} for junk JSON', () => {
    expect(stereoParams.sx.parseServerSide('not json{')).toEqual({})
    expect(stereoParams.ax.parseServerSide('not json{')).toEqual({})
  })

  it('gives {} for valid JSON that is not an object', () => {
    expect(stereoParams.sx.parseServerSide('5')).toEqual({})
    expect(stereoParams.sx.parseServerSide('[1,2]')).toEqual({})
  })

  it('stamps every hand-entered speaker spec as user trust, ignoring a claimed trust', () => {
    const crafted = JSON.stringify({
      sensitivity_db: { value: 87, trust: 'measured', source_url: 'https://example.com' },
      nominal_impedance_ohms: { value: 8 },
    })
    expect(stereoParams.sx.parseServerSide(crafted)).toEqual({
      sensitivity_db: { value: 87, trust: 'user', source_url: null },
      nominal_impedance_ohms: { value: 8, trust: 'user', source_url: null },
    })
  })

  it('stamps every hand-entered amp spec as user trust, ignoring a claimed trust', () => {
    const crafted = JSON.stringify({
      subtype: 'integrated',
      power_w_8ohm: { value: 60, trust: 'measured' },
    })
    expect(stereoParams.ax.parseServerSide(crafted)).toEqual({
      subtype: 'integrated',
      power_w_8ohm: { value: 60, trust: 'user', source_url: null },
    })
  })

  it('drops out-of-range values', () => {
    const json = JSON.stringify({ sensitivity_db: { value: 500, trust: 'user' } })
    expect(stereoParams.sx.parseServerSide(json)).toEqual({})
  })
})

describe('profileFromParams', () => {
  it('maps the URL keys onto SystemProfile', () => {
    expect(
      profileFromParams({
        ...emptyParams,
        rp: 'living_room',
        l: 5,
        w: 4,
        h: 2.5,
        ac: 'damped',
        d: 2.8,
        db: 95,
      })
    ).toEqual({
      room: { length_m: 5, width_m: 4, height_m: 2.5 },
      room_preset: 'living_room',
      acoustics: 'damped',
      distance_m: 2.8,
      near_wall: null,
      target_peak_db: 95,
    })
  })

  it('returns an all-unset profile at the default peak when nothing is given', () => {
    expect(profileFromParams(emptyParams)).toEqual({
      room: null,
      room_preset: null,
      acoustics: null,
      distance_m: null,
      near_wall: null,
      target_peak_db: DEFAULT_TARGET_PEAK_DB,
    })
  })

  it('nulls out-of-range and unknown values', () => {
    const p = profileFromParams({
      ...emptyParams,
      rp: 'castle',
      l: 1,
      w: 4,
      h: 2.5,
      ac: 'echoey',
      d: 99,
    })
    expect(p.room).toBeNull()
    expect(p.room_preset).toBeNull()
    expect(p.acoustics).toBeNull()
    expect(p.distance_m).toBeNull()
  })

  it('needs all three room dimensions', () => {
    expect(profileFromParams({ ...emptyParams, l: 5, w: 4 }).room).toBeNull()
  })
})
