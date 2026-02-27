import { describe, it, expect } from 'vitest'
import {
  calculatePowerRequirements,
  convertSensitivity,
  assessAmplificationFromImpedance,
  parsePowerSpec,
  calculatePowerAtImpedance,
  matchAmplifiersToHeadphones,
  estimatePowerFromImpedance,
  type PowerRequirements,
} from '../audio-calculations'

// ─── calculatePowerRequirements ─────────────────────────────────────────────

describe('calculatePowerRequirements', () => {
  it('calculates correct power for easy-to-drive IEMs', () => {
    // Typical IEM: 16Ω, 110 dB/mW, target 110 dB SPL
    const result = calculatePowerRequirements(16, 110)
    expect(result.powerNeeded_mW).toBe(1) // 10^((110-110)/10) = 1 mW
    expect(result.difficulty).toBe('easy')
    expect(result.phoneCompatible).toBe(true)
    expect(result.laptopCompatible).toBe(true)
    expect(result.desktopAmpRecommended).toBe(false)
  })

  it('calculates correct power for moderate headphones', () => {
    // AKG K371-ish: 32Ω, 95 dB/mW → needs ~31.6 mW
    const result = calculatePowerRequirements(32, 95)
    expect(result.powerNeeded_mW).toBeCloseTo(31.6, 0)
    expect(result.difficulty).toBe('moderate')
    expect(result.phoneCompatible).toBe(false) // 31.6 mW > 30 mW phone limit
    expect(result.laptopCompatible).toBe(true)
  })

  it('calculates correct power for demanding headphones', () => {
    // HD600-ish: 300Ω, 97 dB/mW → needs ~20 mW but high voltage
    const result = calculatePowerRequirements(300, 97)
    expect(result.powerNeeded_mW).toBeCloseTo(20, 0)
    // V = sqrt(0.02 * 300) = sqrt(6) ≈ 2.45V
    expect(result.voltageNeeded_V).toBeCloseTo(2.45, 1)
    expect(result.difficulty).toBe('moderate')
    expect(result.phoneCompatible).toBe(false)
  })

  it('classifies very demanding headphones correctly', () => {
    // HiFiMAN Susvara-ish: 60Ω, 83 dB/mW → needs ~501 mW
    // 10^((110-83)/10) = 10^2.7 ≈ 501.2 mW
    const result = calculatePowerRequirements(60, 83)
    expect(result.powerNeeded_mW).toBeCloseTo(501.2, 0)
    expect(result.difficulty).toBe('very_demanding')
    expect(result.desktopAmpRecommended).toBe(true)
    expect(result.portableAmpSufficient).toBe(false)
  })

  it('uses 110 dB SPL as default target', () => {
    const resultDefault = calculatePowerRequirements(32, 100)
    const resultExplicit = calculatePowerRequirements(32, 100, 110)
    expect(resultDefault.powerNeeded_mW).toBe(resultExplicit.powerNeeded_mW)
  })

  it('allows custom target SPL', () => {
    // Lower target → less power needed
    const loud = calculatePowerRequirements(32, 100, 110)
    const moderate = calculatePowerRequirements(32, 100, 100)
    expect(moderate.powerNeeded_mW).toBeLessThan(loud.powerNeeded_mW)
  })

  it('rounds power to 1 decimal place', () => {
    const result = calculatePowerRequirements(32, 100)
    const decimalPlaces = result.powerNeeded_mW.toString().split('.')[1]?.length ?? 0
    expect(decimalPlaces).toBeLessThanOrEqual(1)
  })

  it('rounds voltage to 2 decimal places', () => {
    const result = calculatePowerRequirements(32, 100)
    const decimalPlaces = result.voltageNeeded_V.toString().split('.')[1]?.length ?? 0
    expect(decimalPlaces).toBeLessThanOrEqual(2)
  })

  it('generates explanation string', () => {
    const result = calculatePowerRequirements(16, 110)
    expect(result.explanation).toBeTruthy()
    expect(typeof result.explanation).toBe('string')
  })

  it('explanation mentions impedance for high-Z moderate headphones', () => {
    // High impedance, decent sensitivity → moderate difficulty due to voltage
    const result = calculatePowerRequirements(250, 103)
    expect(result.explanation).toContain('250')
  })

  it('explanation mentions power for very demanding headphones', () => {
    const result = calculatePowerRequirements(60, 80)
    expect(result.explanation).toContain('mW')
  })
})

// ─── convertSensitivity ─────────────────────────────────────────────────────

describe('convertSensitivity', () => {
  it('returns same value when fromType === toType', () => {
    expect(convertSensitivity(100, 'dB/mW', 'dB/mW', 32)).toBe(100)
    expect(convertSensitivity(100, 'dB/V', 'dB/V', 32)).toBe(100)
  })

  it('converts dB/V to dB/mW correctly', () => {
    // dB/V to dB/mW: subtract 10*log10(Z/1000)
    // For 32Ω: 10*log10(32/1000) = 10*log10(0.032) ≈ -14.95
    // So 100 dB/V - (-14.95) = 114.95 dB/mW
    const result = convertSensitivity(100, 'dB/V', 'dB/mW', 32)
    expect(result).toBeCloseTo(114.95, 1)
  })

  it('converts dB/mW to dB/V correctly', () => {
    // Inverse of above
    const result = convertSensitivity(114.95, 'dB/mW', 'dB/V', 32)
    expect(result).toBeCloseTo(100, 1)
  })

  it('round-trips correctly', () => {
    const original = 105
    const impedance = 300
    const asDbV = convertSensitivity(original, 'dB/mW', 'dB/V', impedance)
    const backToDbMw = convertSensitivity(asDbV, 'dB/V', 'dB/mW', impedance)
    expect(backToDbMw).toBeCloseTo(original, 10)
  })

  it('higher impedance increases dB/mW relative to dB/V', () => {
    const lowZ = convertSensitivity(100, 'dB/V', 'dB/mW', 32)
    const highZ = convertSensitivity(100, 'dB/V', 'dB/mW', 300)
    expect(highZ).toBeLessThan(lowZ) // Higher Z → less power for same voltage
  })
})

// ─── assessAmplificationFromImpedance ───────────────────────────────────────

describe('assessAmplificationFromImpedance', () => {
  it('returns demanding when needsAmp is true regardless of impedance', () => {
    const result = assessAmplificationFromImpedance(16, true)
    expect(result.difficulty).toBe('demanding')
  })

  it('returns unknown when impedance is null', () => {
    const result = assessAmplificationFromImpedance(null, null)
    expect(result.difficulty).toBe('unknown')
    expect(result.explanation).toContain('No impedance data')
  })

  it('returns unknown when impedance is 0', () => {
    const result = assessAmplificationFromImpedance(0, null)
    expect(result.difficulty).toBe('unknown')
  })

  it('classifies very low impedance as easy', () => {
    const result = assessAmplificationFromImpedance(16, null)
    expect(result.difficulty).toBe('easy')
    expect(result.estimatedSensitivity).toBe(110)
  })

  it('classifies low impedance (32Ω) as easy', () => {
    const result = assessAmplificationFromImpedance(32, null)
    expect(result.difficulty).toBe('easy')
    expect(result.estimatedSensitivity).toBe(106)
  })

  it('classifies medium impedance (80Ω) as moderate', () => {
    const result = assessAmplificationFromImpedance(80, null)
    expect(result.difficulty).toBe('moderate')
    expect(result.estimatedSensitivity).toBe(102)
  })

  it('classifies high impedance (150Ω) as moderate', () => {
    const result = assessAmplificationFromImpedance(150, null)
    expect(result.difficulty).toBe('moderate')
  })

  it('classifies 300Ω as demanding', () => {
    const result = assessAmplificationFromImpedance(300, null)
    expect(result.difficulty).toBe('demanding')
    expect(result.estimatedSensitivity).toBe(97)
  })

  it('upgrades known difficult models at 300Ω to very_demanding', () => {
    const result = assessAmplificationFromImpedance(300, null, 'HD600', 'Sennheiser')
    expect(result.difficulty).toBe('very_demanding')
  })

  it('upgrades known difficult models at 150Ω to demanding', () => {
    const result = assessAmplificationFromImpedance(150, null, 'DT880', 'Beyerdynamic')
    expect(result.difficulty).toBe('demanding')
  })

  it('does not upgrade unknown models', () => {
    const result = assessAmplificationFromImpedance(150, null, 'RandomModel', 'UnknownBrand')
    expect(result.difficulty).toBe('moderate')
  })

  it('provides explanation string', () => {
    const result = assessAmplificationFromImpedance(300, null)
    expect(result.explanation).toBeTruthy()
    expect(result.explanation).toContain('300')
  })
})

// ─── parsePowerSpec ─────────────────────────────────────────────────────────

describe('parsePowerSpec', () => {
  it('returns null for null/undefined/empty input', () => {
    expect(parsePowerSpec(null)).toBeNull()
    expect(parsePowerSpec(undefined)).toBeNull()
    expect(parsePowerSpec('')).toBeNull()
  })

  it('parses "500mW @ 32Ω" format', () => {
    const result = parsePowerSpec('500mW @ 32Ω')
    expect(result).toEqual({ power_mW: 500, reference_impedance: 32 })
  })

  it('parses "2W @ 32Ω" format and converts to mW', () => {
    const result = parsePowerSpec('2W @ 32Ω')
    expect(result).toEqual({ power_mW: 2000, reference_impedance: 32 })
  })

  it('parses "1.5W into 32 ohms" format', () => {
    const result = parsePowerSpec('1.5W into 32 ohms')
    expect(result).toEqual({ power_mW: 1500, reference_impedance: 32 })
  })

  it('parses "500mW/32Ω" format', () => {
    const result = parsePowerSpec('500mW/32Ω')
    expect(result).toEqual({ power_mW: 500, reference_impedance: 32 })
  })

  it('parses without spaces', () => {
    const result = parsePowerSpec('500mW@32Ω')
    expect(result).toEqual({ power_mW: 500, reference_impedance: 32 })
  })

  it('handles case insensitivity', () => {
    const result = parsePowerSpec('500MW @ 32Ω')
    expect(result).toEqual({ power_mW: 500, reference_impedance: 32 })
  })

  it('returns null for unparseable strings', () => {
    expect(parsePowerSpec('just some text')).toBeNull()
    expect(parsePowerSpec('500 watts')).toBeNull()
  })

  it('parses decimal watt values', () => {
    const result = parsePowerSpec('0.5W @ 600ohms')
    expect(result).toEqual({ power_mW: 500, reference_impedance: 600 })
  })
})

// ─── calculatePowerAtImpedance ──────────────────────────────────────────────

describe('calculatePowerAtImpedance', () => {
  it('returns same power at same impedance', () => {
    const result = calculatePowerAtImpedance(500, 32, 32)
    expect(result).toBeCloseTo(500, 1)
  })

  it('halves power when impedance doubles (voltage-limited)', () => {
    // P = V²/R, so doubling R halves P
    const result = calculatePowerAtImpedance(1000, 32, 64)
    expect(result).toBeCloseTo(500, 1)
  })

  it('doubles power when impedance halves (voltage-limited)', () => {
    const result = calculatePowerAtImpedance(500, 32, 16)
    expect(result).toBeCloseTo(1000, 1)
  })

  it('applies current limiting at very low impedance', () => {
    // With default 500mA limit and very low impedance,
    // current-limited power = I²R = 0.5² * 4 = 1W = 1000mW
    // But voltage-limited: V = sqrt(10 * 32) = 17.89V
    // At 4Ω: 17.89² / 4 = 80000mW
    // Current limit kicks in: 500mA * 500mA * 4 = 1000mW
    const result = calculatePowerAtImpedance(10000, 32, 4)
    // Without current limit it would be 80000mW, but current limit caps it
    expect(result).toBeLessThan(80000)
    expect(result).toBeCloseTo(1000, 1)
  })

  it('respects custom current limit', () => {
    const highLimit = calculatePowerAtImpedance(10000, 32, 4, 1000)
    const lowLimit = calculatePowerAtImpedance(10000, 32, 4, 200)
    expect(highLimit).toBeGreaterThan(lowLimit)
  })

  it('uses 500mA default current limit', () => {
    const withDefault = calculatePowerAtImpedance(500, 32, 32)
    const withExplicit = calculatePowerAtImpedance(500, 32, 32, 500)
    expect(withDefault).toBeCloseTo(withExplicit, 5)
  })
})

// ─── matchAmplifiersToHeadphones ────────────────────────────────────────────

describe('matchAmplifiersToHeadphones', () => {
  const headphones = [
    { impedance: 300, powerRequirement: { powerNeeded_mW: 20 } as PowerRequirements },
  ]

  const amplifiers = [
    {
      id: 'amp1',
      name: 'Powerful Amp',
      brand: 'BrandA',
      power_output: '2W @ 32Ω',
      price_used_min: 200,
      price_used_max: 300,
    },
    {
      id: 'amp2',
      name: 'Weak Amp',
      brand: 'BrandB',
      power_output: '50mW @ 32Ω',
      price_used_min: 50,
      price_used_max: 80,
    },
  ]

  it('returns results for all amplifiers', () => {
    const results = matchAmplifiersToHeadphones(headphones, amplifiers)
    expect(results).toHaveLength(2)
  })

  it('sorts by suitability (best first)', () => {
    const results = matchAmplifiersToHeadphones(headphones, amplifiers)
    expect(results[0].amplifier.id).toBe('amp1')
    expect(results[1].amplifier.id).toBe('amp2')
  })

  it('gives higher compatibility score to more powerful amp', () => {
    const results = matchAmplifiersToHeadphones(headphones, amplifiers)
    expect(results[0].compatibilityScore).toBeGreaterThanOrEqual(results[1].compatibilityScore)
  })

  it('caps compatibility score at 1.0', () => {
    const results = matchAmplifiersToHeadphones(headphones, amplifiers)
    expect(results[0].compatibilityScore).toBeLessThanOrEqual(1)
  })

  it('falls back to price-tier estimation without power_output', () => {
    const ampsNoSpec = [
      {
        id: 'amp3',
        name: 'No Spec Amp',
        brand: 'BrandC',
        power_output: undefined,
        price_used_min: 400,
        price_used_max: 600,
      },
    ]
    const results = matchAmplifiersToHeadphones(headphones, ampsNoSpec)
    expect(results[0].powerAtHeadphoneZ).toBe(500) // $500 avg → 500mW estimate (>$300 tier)
    expect(results[0].explanation).toContain('Estimated')
  })

  it('provides explanations for all results', () => {
    const results = matchAmplifiersToHeadphones(headphones, amplifiers)
    results.forEach((r) => {
      expect(r.explanation).toBeTruthy()
    })
  })

  it('uses most demanding headphone for matching', () => {
    const multiHeadphones = [
      { impedance: 32, powerRequirement: { powerNeeded_mW: 5 } as PowerRequirements },
      { impedance: 300, powerRequirement: { powerNeeded_mW: 200 } as PowerRequirements },
    ]
    const results = matchAmplifiersToHeadphones(multiHeadphones, amplifiers)
    // The 300Ω headphone needs 200mW — that's what scoring should be based on
    // The weaker amp at 300Ω: V=sqrt(0.05*32)=1.265V, P at 300Ω: 1.265²/300 = 5.3mW
    // 5.3/200 = 0.027 compatibility
    expect(results.find((r) => r.amplifier.id === 'amp2')!.compatibilityScore).toBeLessThan(0.1)
  })
})

// ─── estimatePowerFromImpedance ─────────────────────────────────────────────

describe('estimatePowerFromImpedance', () => {
  it('returns null for 0 impedance', () => {
    expect(estimatePowerFromImpedance(0)).toBeNull()
  })

  it('uses estimated sensitivity for low impedance', () => {
    const result = estimatePowerFromImpedance(16)
    expect(result).not.toBeNull()
    // 16Ω maps to 110 dB/mW estimated sensitivity
    // Power = 10^((110-110)/10) = 1mW
    expect(result!.powerNeeded_mW).toBe(1)
    expect(result!.difficulty).toBe('easy')
  })

  it('uses estimated sensitivity for high impedance', () => {
    const result = estimatePowerFromImpedance(300)
    expect(result).not.toBeNull()
    // 300Ω maps to 97 dB/mW, needs ~20mW
    expect(result!.powerNeeded_mW).toBeCloseTo(20, 0)
  })

  it('returns a full PowerRequirements object', () => {
    const result = estimatePowerFromImpedance(32)!
    expect(result).toHaveProperty('powerNeeded_mW')
    expect(result).toHaveProperty('voltageNeeded_V')
    expect(result).toHaveProperty('currentNeeded_mA')
    expect(result).toHaveProperty('difficulty')
    expect(result).toHaveProperty('phoneCompatible')
    expect(result).toHaveProperty('laptopCompatible')
    expect(result).toHaveProperty('portableAmpSufficient')
    expect(result).toHaveProperty('desktopAmpRecommended')
    expect(result).toHaveProperty('explanation')
  })
})
