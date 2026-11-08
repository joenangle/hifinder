import { describe, it, expect } from 'vitest'
import {
  awgDiameterMm,
  cableLoopResistanceOhms,
  deviationSpanBound,
  dividerDb,
  effectiveDampingFactor,
  outputImpedanceFromDampingFactor,
  responseDeviation,
} from '../stereo/interaction'
import { ampGainDb, inputSensitivityFromGain, reachableWatts } from '../stereo/gain'
import { hissAtSeat, noiseVoltsFromSnr } from '../stereo/noise'
import { levelAtSeatPerWatt } from '../stereo/power'

describe('cable resistance', () => {
  it('matches the AWG diameter formula', () => {
    expect(awgDiameterMm(36)).toBeCloseTo(0.127, 4)
    expect(awgDiameterMm(14)).toBeCloseTo(1.628, 3)
  })

  // HyperPhysics, Common Wire Gauges, ohms per 1000 m at 20 °C (verified 2026-11-07).
  it.each([
    [18, 20.9],
    [16, 13.2],
    [14, 8.28],
    [12, 5.21],
  ])('%i AWG is within 1%% of %f mΩ/m', (awg, mOhmPerM) => {
    const perMetre = cableLoopResistanceOhms(1, awg) / 2
    expect(Math.abs(perMetre * 1000 - mOhmPerM) / mOhmPerM).toBeLessThan(0.01)
  })

  it('5 m of 16 AWG is about 0.13 Ω there and back', () => {
    expect(cableLoopResistanceOhms(5, 16)).toBeCloseTo(0.132, 2)
  })
})

describe('damping factor', () => {
  it('converts to output impedance at its reference load', () => {
    expect(outputImpedanceFromDampingFactor(50)).toBeCloseTo(0.16, 6)
    expect(outputImpedanceFromDampingFactor(50, 4)).toBeCloseTo(0.08, 6)
  })

  it('effective damping factor counts the cable', () => {
    expect(effectiveDampingFactor(6, 1.08)).toBeCloseTo(5.56, 2)
  })
})

describe('divider span bound', () => {
  const speaker = { nominalOhms: 8, minOhms: 3.2, maxOhms: 30 }

  it.each([
    [0.05, 0.12],
    [1, 2.08],
    [3, 4.91],
  ])('Z_src %f Ω gives about %f dB', (zSrc, span) => {
    const out = deviationSpanBound(speaker, zSrc)
    expect(out.spanDb).toBeCloseTo(span, 1)
    expect(out.isLowerBound).toBe(false)
  })

  it('is a lower bound without the maximum, and never exceeds the full result', () => {
    const partial = deviationSpanBound({ nominalOhms: 8, minOhms: 3.2 }, 1)
    expect(partial.isLowerBound).toBe(true)
    expect(partial.spanDb).toBeLessThanOrEqual(deviationSpanBound(speaker, 1).spanDb)
  })

  it('a single divider step is never positive', () => {
    expect(dividerDb(8, 0)).toBe(0)
    expect(dividerDb(3.2, 1)).toBeLessThan(0)
  })
})

describe('responseDeviation', () => {
  const curve = [
    { hz: 20, ohms: 9 },
    { hz: 55, ohms: 28 },
    { hz: 180, ohms: 3.4 },
    { hz: 1000, ohms: 7 },
    { hz: 8000, ohms: 5.6 },
  ]

  it('finds the bass peak and the low-impedance dip', () => {
    const out = responseDeviation(curve, 1.08)
    expect(out.peak.hz).toBe(55)
    expect(out.dip.hz).toBe(180)
    expect(out.spanDb).toBeCloseTo(dividerDb(28, 1.08) - dividerDb(3.4, 1.08), 6)
  })

  it('is flat for a near-zero source impedance', () => {
    expect(responseDeviation(curve, 0.001).spanDb).toBeLessThan(0.01)
  })
})

describe('gain', () => {
  it('derives gain from a rating and its input sensitivity', () => {
    expect(ampGainDb(100, 2.5)).toBeCloseTo(21.07, 2)
    expect(inputSensitivityFromGain(100, ampGainDb(100, 2.5))).toBeCloseTo(2.5, 6)
  })

  it('a 2 V DAC reaches about 64 W of a 100 W amp needing 2.5 V', () => {
    const out = reachableWatts(2, ampGainDb(100, 2.5), 100, 8)
    expect(out.watts).toBeCloseTo(64, 0)
    expect(out.limited).toBe(true)
    expect(out.shortfallDb).toBeCloseTo(1.94, 2)
  })

  it.each([4, 2.83, 1.5, 0.35])(
    'a source matching an input sensitivity of %f V reaches full power (no rounding false alarm)',
    (v) => {
      expect(reachableWatts(v, ampGainDb(100, v), 100, 8)).toEqual({ watts: 100, limited: false, shortfallDb: 0 })
    }
  )

  it('a shortfall under 0.1 dB counts as full power; one over it does not', () => {
    expect(reachableWatts(3.98, ampGainDb(100, 4), 100, 8).limited).toBe(false) // 0.04 dB short
    expect(reachableWatts(3.9, ampGainDb(100, 4), 100, 8).limited).toBe(true) // 0.22 dB short
  })

  it('a 4 V source reaches full power', () => {
    expect(reachableWatts(4, ampGainDb(100, 2.5), 100, 8)).toEqual({ watts: 100, limited: false, shortfallDb: 0 })
  })
})

describe('hiss', () => {
  it('converts SNR re rated power to a noise voltage', () => {
    expect(noiseVoltsFromSnr(90, 100) * 1e6).toBeCloseTo(894, 0)
  })

  it('a 100 dB/W speaker with 1 mV of noise is about 31 dB at 1 m, one speaker, free field', () => {
    const room = { length_m: 5, width_m: 4, height_m: 2.6 }
    const perWatt = levelAtSeatPerWatt(100, 1, room, 'average', { speakers: 1 })
    expect(hissAtSeat(perWatt, 1e-3, 8).freeField).toBeCloseTo(30.97, 1)
  })
})
