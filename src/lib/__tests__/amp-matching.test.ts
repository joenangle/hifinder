import { describe, it, expect } from 'vitest'
import {
  assessAmplificationFromImpedance,
  sensitivityDbVToDbMw,
  resolveSensitivityDbMw,
  calculateAmpAdequacy,
  needsAmplification,
} from '../audio-calculations'

// ─── knownDifficultModels matching ──────────────────────────────────────────
// Regression: the matcher compared against `model.split(' ')[1]` — the second
// token only — so any name containing a space in a different position missed.

describe('assessAmplificationFromImpedance — known difficult model matching', () => {
  it('matches a model name written with a space ("HD 600")', () => {
    const result = assessAmplificationFromImpedance(300, null, 'HD 600', 'Sennheiser')
    expect(result.difficulty).toBe('very_demanding')
  })

  it('matches a multi-word model name ("Edition XS")', () => {
    const result = assessAmplificationFromImpedance(150, null, 'Edition XS', 'HiFiMAN')
    expect(result.difficulty).toBe('demanding')
  })

  it('still matches the no-space spelling ("HD600")', () => {
    const result = assessAmplificationFromImpedance(300, null, 'HD600', 'Sennheiser')
    expect(result.difficulty).toBe('very_demanding')
  })

  it('does not match an unrelated model that shares a token', () => {
    // "Edition" alone must not trigger the HiFiMAN Edition XS entry.
    const result = assessAmplificationFromImpedance(150, null, 'Edition One', 'SomeBrand')
    expect(result.difficulty).toBe('moderate')
  })
})

// ─── sensitivity unit conversion ────────────────────────────────────────────

describe('sensitivityDbVToDbMw', () => {
  it('converts dB/V to dB/mW using dB/mW = dB/V - 10*log10(Z/1000)', () => {
    // 300Ω: 10*log10(0.3) ≈ -5.23, so dB/mW = 102 + 5.23 ≈ 107.23
    expect(sensitivityDbVToDbMw(102, 300)).toBeCloseTo(107.23, 1)
  })

  it('is a no-op at 1000Ω where the correction term is zero', () => {
    expect(sensitivityDbVToDbMw(100, 1000)).toBeCloseTo(100, 5)
  })

  it('returns null for missing or non-positive impedance', () => {
    expect(sensitivityDbVToDbMw(100, 0)).toBeNull()
    expect(sensitivityDbVToDbMw(null, 300)).toBeNull()
  })
})

describe('resolveSensitivityDbMw', () => {
  it('prefers a measured dB/mW value', () => {
    expect(resolveSensitivityDbMw({ sensitivity_db_mw: 97, sensitivity_db_v: 102, impedance: 300 }))
      .toBe(97)
  })

  it('falls back to converting dB/V when dB/mW is absent', () => {
    const result = resolveSensitivityDbMw({ sensitivity_db_v: 102, impedance: 300 })
    expect(result).toBeCloseTo(107.23, 1)
  })

  it('falls back to the impedance estimate when neither is present', () => {
    expect(resolveSensitivityDbMw({ impedance: 300 })).toBe(97)
    expect(resolveSensitivityDbMw({ impedance: 32 })).toBe(106)
  })

  it('returns null when there is nothing to work from', () => {
    expect(resolveSensitivityDbMw({})).toBeNull()
  })
})

// ─── amp adequacy ───────────────────────────────────────────────────────────
// Regression: the old fallback scored the HEADPHONE's difficulty, not the
// AMP's adequacy — so every amp scored identically, and scored *highest*
// against the hardest-to-drive headphones.

describe('calculateAmpAdequacy', () => {
  const hd600 = { impedance: 300, sensitivity_db_mw: 97 }

  it('scores a powerful amp above a weak one for the same headphone', () => {
    const strong = calculateAmpAdequacy('2W @ 32Ω', hd600)
    const weak = calculateAmpAdequacy('100mW @ 32Ω', hd600)
    expect(strong.score).toBeGreaterThan(weak.score)
  })

  it('parses watt-denominated specs that the old mW-only regex missed', () => {
    const result = calculateAmpAdequacy('2W @ 32Ω', hd600)
    expect(result.dataAvailable).toBe(true)
    expect(result.headroomRatio).toBeGreaterThan(0)
  })

  it('reports dataAvailable=false and a neutral score when amp power is unknown', () => {
    const result = calculateAmpAdequacy(null, hd600)
    expect(result.dataAvailable).toBe(false)
    expect(result.score).toBe(0.5)
    expect(result.headroomRatio).toBeNull()
  })

  it('does not vary the unknown-power score with headphone difficulty', () => {
    // The core inversion bug: an unknown amp must not score better simply
    // because the headphone is harder to drive.
    const easy = calculateAmpAdequacy(null, { impedance: 16, sensitivity_db_mw: 110 })
    const hard = calculateAmpAdequacy(null, { impedance: 600, sensitivity_db_mw: 90 })
    expect(easy.score).toBe(hard.score)
  })

  it('reports dataAvailable=false when the headphone side is unknown', () => {
    const result = calculateAmpAdequacy('2W @ 32Ω', {})
    expect(result.dataAvailable).toBe(false)
    expect(result.score).toBe(0.5)
  })

  it('penalises an amp that cannot meet the requirement', () => {
    // 10mW @ 32Ω into 300Ω is roughly 1mW — far short of HD600's ~20mW.
    const result = calculateAmpAdequacy('10mW @ 32Ω', hd600)
    expect(result.dataAvailable).toBe(true)
    expect(result.score).toBeLessThan(0.5)
  })

  it('scales power correctly with impedance (voltage-limited, P proportional to 1/R)', () => {
    // Same amp, same headphone sensitivity: the 300Ω load must receive less
    // power than the 32Ω load, so its headroom ratio must be lower.
    const at32 = calculateAmpAdequacy('1W @ 32Ω', { impedance: 32, sensitivity_db_mw: 100 })
    const at300 = calculateAmpAdequacy('1W @ 32Ω', { impedance: 300, sensitivity_db_mw: 100 })
    expect(at32.headroomRatio!).toBeGreaterThan(at300.headroomRatio!)
  })
})

// ─── unified amplification threshold ────────────────────────────────────────
// Regression: 150Ω in stacks.ts, 80Ω in StackBuilderModal/gear.ts, and a
// separate ladder in audio-calculations all disagreed.

describe('needsAmplification', () => {
  it('respects an explicit needs_amp flag', () => {
    expect(needsAmplification({ needs_amp: true, impedance: 16 })).toBe(true)
  })

  it('returns true for high-impedance headphones', () => {
    expect(needsAmplification({ impedance: 300 })).toBe(true)
  })

  it('returns false for efficient low-impedance headphones', () => {
    expect(needsAmplification({ impedance: 16, sensitivity_db_mw: 110 })).toBe(false)
  })

  it('returns false when there is no data to judge on', () => {
    expect(needsAmplification({})).toBe(false)
  })

  it('uses measured sensitivity over the impedance estimate', () => {
    // 32Ω but very insensitive — the impedance bucket alone would call this easy.
    expect(needsAmplification({ impedance: 32, sensitivity_db_mw: 86 })).toBe(true)
  })
})
