import { describe, it, expect } from 'vitest'
import { calculateBudgetRange, legacyBudgetRange } from '../budget-ranges'

// ─── User-specified ranges ──────────────────────────────────────────────────

describe('calculateBudgetRange with user-specified ranges', () => {
  it('applies user percentages correctly', () => {
    // 20% below, 10% above $150
    const range = calculateBudgetRange(150, 20, 10)
    expect(range.min).toBe(120) // 150 * (1 - 0.20) = 120
    expect(range.max).toBe(165) // 150 * (1 + 0.10) = 165
  })

  it('enforces $20 absolute minimum for headphones', () => {
    const range = calculateBudgetRange(20, 50, 50)
    expect(range.min).toBe(20) // max(20, 20*(1-0.5)=10) → 20
  })

  it('enforces $5 absolute minimum for signal gear', () => {
    const range = calculateBudgetRange(10, 90, 50, true)
    expect(range.min).toBe(5) // max(5, 10*(1-0.9)=1) → 5
  })

  it('rounds to nearest integer', () => {
    const range = calculateBudgetRange(333, 15, 15)
    expect(Number.isInteger(range.min)).toBe(true)
    expect(Number.isInteger(range.max)).toBe(true)
  })

  it('0% ranges return exact budget', () => {
    const range = calculateBudgetRange(500, 0, 0)
    expect(range.min).toBe(500)
    expect(range.max).toBe(500)
  })

  it('100% below reaches minimum', () => {
    const range = calculateBudgetRange(100, 100, 0)
    expect(range.min).toBe(20) // max(20, 100*(1-1)=0) → 20
  })
})

// ─── Progressive defaults (headphones) ──────────────────────────────────────

describe('calculateBudgetRange progressive defaults for headphones', () => {
  it('widens range at low budgets', () => {
    const range = calculateBudgetRange(50)
    // At $50: minPercent ≈ 10 + 25*exp(-50/1000) ≈ 10+25*0.951 ≈ 33.8%
    // min: max(20, round(50*(1-0.338))) = max(20, 33) = 33
    expect(range.min).toBeLessThanOrEqual(35)
    expect(range.min).toBeGreaterThanOrEqual(20)
  })

  it('narrows range at high budgets', () => {
    const lowRange = calculateBudgetRange(100)
    const highRange = calculateBudgetRange(2000)

    const lowWidth = (lowRange.max - lowRange.min) / 100
    const highWidth = (highRange.max - highRange.min) / 2000
    // Higher budgets should have smaller percentage width
    expect(highWidth).toBeLessThan(lowWidth)
  })

  it('has continuous transitions (no jumps at boundaries)', () => {
    // Check that adjacent budgets produce similar ranges
    for (let budget = 100; budget <= 2000; budget += 100) {
      const rangeA = calculateBudgetRange(budget)
      const rangeB = calculateBudgetRange(budget + 1)

      // Min and max should change by at most a few dollars
      expect(Math.abs(rangeA.min - rangeB.min)).toBeLessThanOrEqual(3)
      expect(Math.abs(rangeA.max - rangeB.max)).toBeLessThanOrEqual(3)
    }
  })

  it('min is always at least $20', () => {
    for (const budget of [20, 30, 50, 100, 500, 2000]) {
      const range = calculateBudgetRange(budget)
      expect(range.min).toBeGreaterThanOrEqual(20)
    }
  })

  it('max is always >= budget', () => {
    for (const budget of [20, 50, 100, 500, 2000]) {
      const range = calculateBudgetRange(budget)
      expect(range.max).toBeGreaterThanOrEqual(budget)
    }
  })

  it('min is always <= budget', () => {
    for (const budget of [50, 100, 500, 2000]) {
      const range = calculateBudgetRange(budget)
      expect(range.min).toBeLessThanOrEqual(budget)
    }
  })
})

// ─── Signal gear ranges ─────────────────────────────────────────────────────

describe('calculateBudgetRange for signal gear', () => {
  it('uses $20 min for entry-level signal gear (≤$250)', () => {
    const range = calculateBudgetRange(100, undefined, undefined, true)
    expect(range.min).toBe(20)
  })

  it('caps max at +10% for entry-level signal gear', () => {
    const range = calculateBudgetRange(200, undefined, undefined, true)
    expect(range.max).toBe(220) // 200 * 1.1 = 220
  })

  it('uses 30% lower min for higher-end signal gear (>$250)', () => {
    const range = calculateBudgetRange(500, undefined, undefined, true)
    expect(range.min).toBe(350) // max(20, round(500*0.7)) = 350
  })

  it('higher-end signal gear min is at least $20', () => {
    const range = calculateBudgetRange(300, undefined, undefined, true)
    expect(range.min).toBeGreaterThanOrEqual(20)
  })

  it('signal gear ranges are wider than headphone ranges at same budget', () => {
    const signalRange = calculateBudgetRange(200, undefined, undefined, true)
    const headphoneRange = calculateBudgetRange(200)

    const signalWidth = signalRange.max - signalRange.min
    const headphoneWidth = headphoneRange.max - headphoneRange.min
    expect(signalWidth).toBeGreaterThan(headphoneWidth)
  })
})

// ─── legacyBudgetRange ──────────────────────────────────────────────────────

describe('legacyBudgetRange', () => {
  it('ignores old percentage parameters and uses progressive defaults', () => {
    const legacy = legacyBudgetRange(500, 20, 10)
    const progressive = calculateBudgetRange(500)
    expect(legacy.min).toBe(progressive.min)
    expect(legacy.max).toBe(progressive.max)
  })

  it('passes isSignalGear through', () => {
    const legacy = legacyBudgetRange(200, 20, 10, true)
    const progressive = calculateBudgetRange(200, undefined, undefined, true)
    expect(legacy.min).toBe(progressive.min)
    expect(legacy.max).toBe(progressive.max)
  })
})
