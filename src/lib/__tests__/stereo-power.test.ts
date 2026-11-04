import { describe, it, expect } from 'vitest'
import {
  sensitivityPerWatt,
  resolveAmpPower,
  levelAtSeatPerWatt,
  powerVerdict,
  VERDICT_LABELS,
  inRoomRatingGainDb,
  IN_ROOM_RATING_REFERENCE,
} from '../stereo/power'
import { ROOM_PRESETS } from '../stereo/power-check'
import type { SpeakerAmpSpecs } from '../stereo/specs'

const room = { length_m: 5, width_m: 4, height_m: 2.6 }
const sv = (value: number) => ({ value, trust: 'claimed' as const })
const amp = (
  p8?: number,
  p4?: number,
  kind: 'continuous' | 'peak' | 'unknown' = 'continuous',
  thd_pct?: number
): SpeakerAmpSpecs => ({
  ...(p8 !== undefined ? { power_w_8ohm: sv(p8) } : {}),
  ...(p4 !== undefined ? { power_w_4ohm: sv(p4) } : {}),
  power_rating: { kind, ...(thd_pct !== undefined ? { thd_pct } : {}) },
})

describe('sensitivityPerWatt', () => {
  it('normalizes 2.83 V ratings to 1 W', () => {
    expect(sensitivityPerWatt(89, '2.83V', 4)).toBeCloseTo(85.99, 2)
    expect(sensitivityPerWatt(90, '2.83V', 8)).toBeCloseTo(90, 2)
    expect(sensitivityPerWatt(90, '2.83V', 6)).toBeCloseTo(90 - 1.25, 2)
    expect(sensitivityPerWatt(90, '2.83V', 4)).toBeCloseTo(90 - 3.01, 2)
  })
  it('leaves 1 W ratings alone', () => {
    expect(sensitivityPerWatt(91, '1W', 8)).toBe(91)
  })
})

describe('levelAtSeatPerWatt and powerVerdict', () => {
  it('matches the PRD worked example', () => {
    const lvl = levelAtSeatPerWatt(85.99, 3, room, 'average')
    expect(lvl.freeField).toBeCloseTo(79.45, 1)
    expect(powerVerdict(100, lvl, 50).requiredWattsFreeField).toBeCloseTo(113.5, 0)
  })
  const lvl = levelAtSeatPerWatt(83.99, 3, room, 'average')
  it('matches the mockup fixture levels', () => {
    expect(lvl.inRoom).toBeCloseTo(86.9, 1)
    expect(lvl.freeField).toBeCloseTo(77.45, 1)
  })
  it('comfortable at 95 dB with 80 W', () => {
    const v = powerVerdict(95, lvl, 80)
    expect(v.kind).toBe('comfortable')
    expect(v.headroomInRoomDb).toBeCloseTo(10.9, 1)
    expect(v.headroomFreeFieldDb).toBeCloseTo(1.5, 1)
  })
  it('comfortable in most rooms at 95 dB with 50 W', () => {
    const v = powerVerdict(95, lvl, 50)
    expect(v.kind).toBe('comfortable_most_rooms')
    expect(v.headroomInRoomDb).toBeCloseTo(8.9, 1)
    expect(v.headroomFreeFieldDb).toBeLessThan(0)
  })
  it('runs out at 110 dB with 50 W', () => {
    const v = powerVerdict(110, lvl, 50)
    expect(v.kind).toBe('runs_out')
    expect(v.maxCleanPeakDb.low).toBeCloseTo(94.4, 1)
    expect(v.maxCleanPeakDb.high).toBeCloseTo(103.9, 1)
  })
  it('tight at 104 dB with 80 W', () => {
    const v = powerVerdict(104, lvl, 80)
    expect(v.kind).toBe('tight')
    expect(v.headroomInRoomDb).toBeCloseTo(1.9, 1)
  })
  it('has the exact verdict labels', () => {
    expect(VERDICT_LABELS).toEqual({
      comfortable: 'Comfortable',
      comfortable_most_rooms: 'Comfortable in most rooms',
      tight: 'Tight',
      runs_out: 'Runs out',
    })
  })
})

describe('resolveAmpPower', () => {
  it('uses the 4 ohm rating at 4 ohm nominal', () => {
    const r = resolveAmpPower(amp(50, 80), 4)!
    expect(r.watts).toBe(80)
    expect(r.basis).toBe('rated')
  })
  it('uses the 8 ohm rating at 8 ohm nominal', () => {
    const r = resolveAmpPower(amp(50, 80), 8)!
    expect(r.watts).toBe(50)
    expect(r.basis).toBe('rated')
  })
  it('treats the 8 ohm rating as a lower bound at 6 ohm', () => {
    const r = resolveAmpPower(amp(50, 80), 6)!
    expect(r.watts).toBe(50)
    expect(r.basis).toBe('eight_ohm_lower_bound')
  })
  it('derates peak ratings by 3 dB', () => {
    const r = resolveAmpPower(amp(50, 100, 'peak'), 4)!
    expect(r.watts).toBeCloseTo(50, 0)
    expect(r.derated).toBe(true)
    expect(r.ratedWatts).toBe(100)
  })
  it('derates 10% THD ratings like peak', () => {
    const r = resolveAmpPower(amp(50, undefined, 'continuous', 10), 8)!
    expect(r.derated).toBe(true)
    expect(r.watts).toBeCloseTo(25, 0)
  })
  it('falls back to the 8 ohm rating as a lower bound at 4 ohm', () => {
    const r = resolveAmpPower(amp(35), 4)!
    expect(r.watts).toBe(35)
    expect(r.basis).toBe('eight_ohm_lower_bound')
  })
  it('scales the 8 ohm rating down above 8 ohm', () => {
    const r = resolveAmpPower(amp(50), 16)!
    expect(r.watts).toBe(25)
    expect(r.basis).toBe('eight_ohm_lower_bound')
  })
  it('returns null with only a 4 ohm rating at 8 ohm nominal', () => {
    expect(resolveAmpPower(amp(undefined, 100), 8)).toBeNull()
  })
  it('flags low impedance only without a 4 ohm rating', () => {
    expect(resolveAmpPower(amp(35), 4, 3.0)!.lowImpedanceCaution).toBe(true)
    expect(resolveAmpPower(amp(35, 50), 4, 3.0)!.lowImpedanceCaution).toBe(false)
  })
  it('flags unknown conditions without derating', () => {
    const r = resolveAmpPower(amp(50, undefined, 'unknown'), 8)!
    expect(r.conditionsUnknown).toBe(true)
    expect(r.derated).toBe(false)
  })
})

describe('in-room sensitivity ratings', () => {
  it('derives the reference room gain from the model itself (about 2.7 dB)', () => {
    expect(inRoomRatingGainDb()).toBeCloseTo(2.713, 2)
    // the reference room is the medium living room preset, average acoustics
    const { label: _label, ...livingRoom } = ROOM_PRESETS.living_room
    expect(IN_ROOM_RATING_REFERENCE.room).toEqual(livingRoom)
    expect(IN_ROOM_RATING_REFERENCE.acoustics).toBe('average')
  })
})
