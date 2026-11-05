import { describe, it, expect } from 'vitest'
import {
  runPowerCheck,
  tierFor,
  AMP_ONLY_CAVEAT,
  LOUDNESS_TIERS,
  ROOM_PRESETS,
  type PowerCheckInput,
} from '../stereo/power-check'
import type { SpeakerAmpSpecs, SpeakerSpecs, SystemProfile } from '../stereo/specs'
import { inRoomRatingGainDb } from '../stereo/power'

const sv = <T,>(value: T, trust: 'claimed' | 'measured' | 'user' = 'claimed') => ({ value, trust })

const speakers = (over: Partial<SpeakerSpecs> = {}): SpeakerSpecs => ({
  sensitivity_db: sv(87),
  sensitivity_ref: sv('2.83V' as const),
  nominal_impedance_ohms: sv(4),
  ...over,
})
const amp = (over: Partial<SpeakerAmpSpecs> = {}): SpeakerAmpSpecs => ({
  power_w_4ohm: sv(80),
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
const input = (over: Partial<PowerCheckInput> = {}): PowerCheckInput => ({
  speakers: speakers(),
  amp: amp(),
  profile: profile(),
  mode: 'advanced',
  ...over,
})
function ok(i: PowerCheckInput) {
  const out = runPowerCheck(i)
  if (out.status !== 'ok') throw new Error('expected ok, got needs: ' + JSON.stringify(out))
  return out
}

describe('fixture system', () => {
  it('is ok and comfortable with ten working rows', () => {
    const out = ok(input())
    expect(out.verdict.kind).toBe('comfortable')
    expect(out.working.map((r) => r.trust)).toEqual([
      'claimed', 'claimed', 'claimed', 'user', 'user', 'user', 'assumed', 'modeled', 'modeled', 'modeled',
    ])
    expect(out.working).toHaveLength(10)
    expect(out.working[6].value).toBe('80 dB average + 15 dB for music peaks = 95 dB peaks')
    expect(out.working[0].value).toBe('87 dB at 2.83 V → 84.0 dB/W')
    expect(out.working[2].value).toBe('80 W into 4 Ω')
    expect(out.working[3].value).toBe('5 × 4 × 2.6 m')
    expect(out.working[4].value).toBe('Average')
    expect(out.caveat).toBe(AMP_ONLY_CAVEAT)
    expect(out.sensitivityRange).toBe(false)
    expect(out.assumptions).toEqual([])
  })
  it('gives exactly two reasons (needs more power, sits close)', () => {
    const out = ok(input({ profile: profile({ distance_m: 2.4 }) }))
    expect(out.reasons).toHaveLength(2)
    expect(out.reasons).toEqual(['Your speakers need more power than most (84 dB/W)', 'You sit close (2.4 m)'])
  })
  it('classifies efficient speakers and far seats', () => {
    const out = ok(input({
      speakers: speakers({ sensitivity_db: sv(91), sensitivity_ref: sv('1W' as const) }),
      profile: profile({ distance_m: 4 }),
    }))
    expect(out.reasons).toEqual(['Your speakers are efficient (91 dB/W)', 'You sit far back (4 m)'])
  })
  it('classifies average sensitivity and typical distance', () => {
    const out = ok(input({ speakers: speakers({ sensitivity_db: sv(86), sensitivity_ref: sv('1W' as const) }) }))
    expect(out.reasons).toEqual(['Your speakers have average sensitivity (86 dB/W)', 'You sit at a typical distance (3 m)'])
  })
})

describe('notes', () => {
  it('is empty for a clean fixture', () => {
    expect(ok(input()).notes).toEqual([])
  })
  it('flags a derated rating', () => {
    const out = ok(input({ amp: amp({ power_rating: { kind: 'peak' } }) }))
    expect(out.notes).toContain(
      "Claimed (optimistic rating): this amp's power is quoted as peak or at high distortion, so we counted 3 dB less."
    )
    expect(out.working[2].value).toContain('(optimistic rating)')
  })
  it('flags low impedance dips and the 8 ohm lower bound', () => {
    const out = ok(input({
      speakers: speakers({ min_impedance_ohms: sv(2.5) }),
      amp: amp({ power_w_4ohm: undefined, power_w_8ohm: sv(60) }),
    }))
    expect(out.notes).toContain('Low impedance dips: check the amp is rated for 4 Ω loads.')
    expect(out.notes).toContain('4 Ω rating not known; many amps deliver more into 4 Ω, but not all.')
    expect(out.working[2].value).toContain('(8 Ω rating, conservative)')
  })
  it('flags unstated conditions only when the verdict is tight', () => {
    const unknown = amp({ power_rating: { kind: 'unknown' } })
    const tight = ok(input({ amp: unknown, profile: profile({ target_peak_db: 104 }) }))
    expect(tight.verdict.kind).toBe('tight')
    expect(tight.notes).toContain("The amp's rating conditions aren't stated, so this result could be optimistic.")
    expect(tight.working[2].value).toContain('(conditions not stated)')
    const easy = ok(input({ amp: unknown }))
    expect(easy.notes).not.toContain("The amp's rating conditions aren't stated, so this result could be optimistic.")
  })
  it('also flags unstated conditions on a comfortable verdict with under 6 dB to spare', () => {
    const note = "The amp's rating conditions aren't stated, so this result could be optimistic."
    const unknown = amp({ power_rating: { kind: 'unknown' } })
    const narrow = ok(input({ amp: unknown, profile: profile({ target_peak_db: 100 }) }))
    expect(['comfortable', 'comfortable_most_rooms']).toContain(narrow.verdict.kind)
    expect(narrow.verdict.headroomInRoomDb).toBeGreaterThan(3)
    expect(narrow.verdict.headroomInRoomDb).toBeLessThan(6)
    expect(narrow.notes).toContain(note)
    const wide = ok(input({ amp: unknown, profile: profile({ target_peak_db: 95 }) }))
    expect(wide.verdict.headroomInRoomDb).toBeGreaterThan(9)
    expect(wide.notes).not.toContain(note)
    // A stated rating never gets the note, however narrow the margin.
    expect(ok(input({ profile: profile({ target_peak_db: 100 }) })).notes).not.toContain(note)
  })
  it('shows tiny power figures as "under 0.1 W" instead of 0.0', () => {
    const quiet = ok(input({ profile: profile({ target_peak_db: 60 }) }))
    const need = quiet.working.find((r) => r.step === 'Power needed')!
    expect(need.value).toBe('under 0.1 W for 60 dB peaks')
    const loud = ok(input()).working.find((r) => r.step === 'Power needed')!
    expect(loud.value).not.toContain('under')
  })
  it('flags near-wall placement', () => {
    expect(ok(input({ profile: profile({ near_wall: true }) })).notes).toEqual([
      "Speakers near a wall get extra bass, which this check doesn't model yet.",
    ])
  })
  it('orders notes: derated first, near wall last', () => {
    const out = ok(input({
      speakers: speakers({ min_impedance_ohms: sv(2.5) }),
      amp: amp({ power_w_4ohm: undefined, power_w_8ohm: sv(60), power_rating: { kind: 'peak' } }),
      profile: profile({ near_wall: true }),
    }))
    expect(out.notes).toHaveLength(4)
    expect(out.notes[0]).toMatch(/^Claimed \(optimistic rating\)/)
    expect(out.notes[3]).toMatch(/^Speakers near a wall/)
  })
})

describe('missing inputs', () => {
  it('reports missing sensitivity with no numbers', () => {
    const out = runPowerCheck(input({ speakers: speakers({ sensitivity_db: undefined }) }))
    expect(out.status).toBe('needs')
    if (out.status !== 'needs') return
    expect(out.missing[0].id).toBe('speakers.sensitivity_db')
    expect(out.missing[0].hint).toContain('2.83 V/1 m')
    expect(out.caveat).toBe(AMP_ONLY_CAVEAT)
    expect(Object.keys(out).sort()).toEqual(['caveat', 'missing', 'status'])
  })
  it('lists every missing value in table order', () => {
    const out = runPowerCheck(input({
      speakers: null, amp: null, profile: profile({ room: null, acoustics: null, distance_m: null }),
    }))
    expect(out.status).toBe('needs')
    if (out.status !== 'needs') return
    expect(out.missing.map((m) => m.id)).toEqual([
      'speakers.sensitivity_db', 'speakers.nominal_impedance_ohms', 'amp.power_w_8ohm',
      'room.size', 'room.acoustics', 'seat.distance_m',
    ])
  })
  it.each([0, NaN, -1, null, Infinity, '3'])('treats distance %s as missing in advanced mode', (d) => {
    const out = runPowerCheck(input({ profile: { ...profile(), distance_m: d as unknown as number | null } }))
    expect(out.status).toBe('needs')
    if (out.status !== 'needs') return
    expect(out.missing.map((m) => m.id)).toEqual(['seat.distance_m'])
  })
  it('degrades junk spec values to missing, never NaN', () => {
    const junk = { sensitivity_db: { value: NaN, trust: 'claimed' }, nominal_impedance_ohms: { value: 0, trust: 'claimed' } }
    const out = runPowerCheck(input({ speakers: junk as unknown as SpeakerSpecs }))
    expect(out.status).toBe('needs')
    if (out.status !== 'needs') return
    expect(out.missing.map((m) => m.id)).toEqual(['speakers.sensitivity_db', 'speakers.nominal_impedance_ohms'])
  })
  it('needs amp power for 8 ohm speakers with a 4 ohm-only amp', () => {
    const out = runPowerCheck(input({ speakers: speakers({ nominal_impedance_ohms: sv(8) }) }))
    expect(out.status).toBe('needs')
    if (out.status !== 'needs') return
    expect(out.missing.map((m) => m.id)).toEqual(['amp.power_w_8ohm'])
  })
  it('lets a preset supply the room size', () => {
    const out = runPowerCheck(input({ profile: profile({ room: null, room_preset: 'office' }) }))
    expect(out.status).toBe('ok')
    if (out.status !== 'ok') return
    expect(out.working[3]).toMatchObject({ value: '3 × 3 × 2.4 m', trust: 'user' })
  })
  it('requires acoustics in advanced mode', () => {
    const out = runPowerCheck(input({ profile: profile({ acoustics: null }) }))
    expect(out.status === 'needs' && out.missing.map((m) => m.id)).toEqual(['room.acoustics'])
  })
})

describe('simple mode', () => {
  it('fills unknown room, acoustics and distance with stated assumptions', () => {
    const out = ok(input({ mode: 'simple', profile: profile({ room: null, acoustics: null, distance_m: null }) }))
    expect(out.assumptions.map((a) => a.text)).toEqual([
      'Assumed a medium living room (5 × 4 × 2.6 m).',
      'Assumed average acoustics.',
      'Assumed you sit about 3 m from the speakers.',
    ])
    expect(out.assumptions.map((a) => a.id)).toEqual(['room.size', 'room.acoustics', 'seat.distance_m'])
    expect(out.working.slice(3, 6).map((r) => r.trust)).toEqual(['assumed', 'assumed', 'assumed'])
  })
  it('treats an invalid distance as missing and defaults to 3 m', () => {
    const out = ok(input({ mode: 'simple', profile: { ...profile(), distance_m: NaN } }))
    expect(out.assumptions.map((a) => a.text)).toEqual(['Assumed you sit about 3 m from the speakers.'])
  })
  it('still needs gear values', () => {
    expect(runPowerCheck(input({ mode: 'simple', speakers: null })).status).toBe('needs')
  })
})

describe('sensitivity reference unknown', () => {
  it('reports the worse interpretation and spans the peak range', () => {
    const at = (ref: '2.83V' | '1W' | 'unknown') =>
      ok(input({ speakers: speakers({ sensitivity_ref: sv(ref) }), profile: profile({ target_peak_db: 100 }) }))
    const out = at('unknown')
    const a = at('2.83V')
    const b = at('1W')
    expect(out.sensitivityRange).toBe(true)
    expect(out.verdict.headroomInRoomDb).toBeCloseTo(Math.min(a.verdict.headroomInRoomDb, b.verdict.headroomInRoomDb), 6)
    expect(out.verdict.maxCleanPeakDb.low).toBeCloseTo(Math.min(a.verdict.maxCleanPeakDb.low, b.verdict.maxCleanPeakDb.low), 6)
    expect(out.verdict.maxCleanPeakDb.high).toBeCloseTo(Math.max(a.verdict.maxCleanPeakDb.high, b.verdict.maxCleanPeakDb.high), 6)
    expect(out.working[0].value).toContain('84.0')
    expect(out.working[0].value).toContain('87.0')
  })
})

describe('tiers and presets', () => {
  it('maps average levels to tiers', () => {
    expect(tierFor(59).label).toBe('Quiet')
    expect(tierFor(60).label).toBe('Background')
    expect(tierFor(75).label).toBe('Normal')
    expect(tierFor(85).label).toBe('Loud')
    expect(tierFor(95).label).toBe('Club')
    expect(LOUDNESS_TIERS.map((t) => t.averageDb)).toEqual([55, 65, 75, 85, 95])
  })
  it('has the four room presets', () => {
    expect(ROOM_PRESETS.living_room).toMatchObject({ length_m: 5, width_m: 4, height_m: 2.6 })
    expect(Object.keys(ROOM_PRESETS).sort()).toEqual(['large_open_plan', 'living_room', 'office', 'small_bedroom'])
  })
})

describe('in-room sensitivity ratings (Klipsch)', () => {
  const inRoomSpeakers = (over: Partial<SpeakerSpecs> = {}) =>
    speakers({ sensitivity_in_room: sv(true), ...over })

  it('takes the reference room gain out once, in both the in-room and free-field estimates', () => {
    const plain = ok(input())
    const inRoom = ok(input({ speakers: inRoomSpeakers() }))
    const gain = inRoomRatingGainDb()
    expect(plain.verdict.headroomInRoomDb - inRoom.verdict.headroomInRoomDb).toBeCloseTo(gain, 6)
    expect(plain.verdict.headroomFreeFieldDb - inRoom.verdict.headroomFreeFieldDb).toBeCloseTo(gain, 6)
  })

  it('says so in the working and the notes', () => {
    const out = ok(input({ speakers: inRoomSpeakers() }))
    const row = out.working.find((r) => r.step === 'Speaker sensitivity')!
    expect(row.value).toMatch(/^87 dB at 2\.83 V in a listening room, less 2\.7 dB room reinforcement → /)
    expect(out.notes.some((n) => /quoted in a listening room/.test(n) && /2\.7 dB/.test(n))).toBe(true)
  })

  it('applies the correction to both ends of an unstated reference', () => {
    const out = ok(input({ speakers: inRoomSpeakers({ sensitivity_ref: undefined }) }))
    const row = out.working.find((r) => r.step === 'Speaker sensitivity')!
    // 87 dB at 2.83 V into 4 Ω is 84.0 dB/W, at 1 W it is 87.0; both less 2.7
    expect(row.value).toContain('81.3 dB/W if 2.83 V, 84.3 dB/W if 1 W')
  })

  it('leaves ordinary speakers alone', () => {
    const out = ok(input({ speakers: speakers({ sensitivity_in_room: sv(false) }) }))
    expect(out.notes.some((n) => /listening room/.test(n))).toBe(false)
    expect(out.working.find((r) => r.step === 'Speaker sensitivity')!.value).not.toMatch(/listening room/)
  })
})
