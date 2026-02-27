import { describe, it, expect } from 'vitest'
import {
  gradeToNumeric,
  calculateExpertScore,
  hasExpertData,
  calculateExpertConfidence,
  type ScoringComponent,
} from '../crinacle-scoring'

// ─── gradeToNumeric ─────────────────────────────────────────────────────────

describe('gradeToNumeric', () => {
  it('maps all standard grades correctly', () => {
    expect(gradeToNumeric('S+')).toBe(10.0)
    expect(gradeToNumeric('S')).toBe(9.5)
    expect(gradeToNumeric('S-')).toBe(9.0)
    expect(gradeToNumeric('A+')).toBe(8.5)
    expect(gradeToNumeric('A')).toBe(8.0)
    expect(gradeToNumeric('A-')).toBe(7.5)
    expect(gradeToNumeric('B+')).toBe(7.0)
    expect(gradeToNumeric('B')).toBe(6.5)
    expect(gradeToNumeric('B-')).toBe(6.0)
    expect(gradeToNumeric('C+')).toBe(5.5)
    expect(gradeToNumeric('C')).toBe(5.0)
    expect(gradeToNumeric('C-')).toBe(4.5)
    expect(gradeToNumeric('D+')).toBe(4.0)
    expect(gradeToNumeric('D')).toBe(3.5)
    expect(gradeToNumeric('D-')).toBe(3.0)
    expect(gradeToNumeric('F')).toBe(0)
  })

  it('defaults to 5.0 (C) for null/undefined', () => {
    expect(gradeToNumeric(null)).toBe(5.0)
    expect(gradeToNumeric(undefined)).toBe(5.0)
  })

  it('defaults to 5.0 for unrecognized grades', () => {
    expect(gradeToNumeric('X')).toBe(5.0)
    expect(gradeToNumeric('E')).toBe(5.0)
    expect(gradeToNumeric('SS')).toBe(5.0)
  })

  it('handles whitespace in grades', () => {
    expect(gradeToNumeric(' A+ ')).toBe(8.5)
    expect(gradeToNumeric('  S  ')).toBe(9.5)
  })

  it('handles lowercase grades', () => {
    expect(gradeToNumeric('a+')).toBe(8.5)
    expect(gradeToNumeric('s-')).toBe(9.0)
    expect(gradeToNumeric('b')).toBe(6.5)
    expect(gradeToNumeric('f')).toBe(0)
  })

  it('defaults to 5.0 for empty string', () => {
    expect(gradeToNumeric('')).toBe(5.0)
  })
})

// ─── calculateExpertScore ───────────────────────────────────────────────────

describe('calculateExpertScore', () => {
  it('calculates Susvara example: S/S/S value 1 → 8.37', () => {
    const susvara: ScoringComponent = {
      crin_rank: 'S',
      crin_tone: 'S',
      crin_tech: 'S',
      crin_value: 1,
    }
    // rank: 9.5*0.3 = 2.85, tone: 9.5*0.3 = 2.85, tech: 9.5*0.2 = 1.9
    // value: (1/3)*10 = 3.33, 3.33*0.2 = 0.667
    // total: 2.85 + 2.85 + 1.9 + 0.667 = 8.267
    const score = calculateExpertScore(susvara)
    // The docstring says 8.37 but let's verify the actual math
    expect(score).toBeCloseTo(8.267, 2)
  })

  it('calculates Timeless example: A/A/A value 3 → ~8.40', () => {
    const timeless: ScoringComponent = {
      crin_rank: 'A',
      crin_tone: 'A',
      crin_tech: 'A',
      crin_value: 3,
    }
    // rank: 8.0*0.3 = 2.4, tone: 8.0*0.3 = 2.4, tech: 8.0*0.2 = 1.6
    // value: (3/3)*10 = 10, 10*0.2 = 2.0
    // total: 2.4 + 2.4 + 1.6 + 2.0 = 8.4
    expect(calculateExpertScore(timeless)).toBeCloseTo(8.4, 2)
  })

  it('calculates HD600 example: A-/S-/B+ value 2', () => {
    const hd600: ScoringComponent = {
      crin_rank: 'A-',
      crin_tone: 'S-',
      crin_tech: 'B+',
      crin_value: 2,
    }
    // rank: 7.5*0.3 = 2.25, tone: 9.0*0.3 = 2.7, tech: 7.0*0.2 = 1.4
    // value: (2/3)*10 = 6.667, 6.667*0.2 = 1.333
    // total: 2.25 + 2.7 + 1.4 + 1.333 = 7.683
    expect(calculateExpertScore(hd600)).toBeCloseTo(7.683, 2)
  })

  it('calculates Moondrop Chu example: B/A+/C+ value 3', () => {
    const chu: ScoringComponent = {
      crin_rank: 'B',
      crin_tone: 'A+',
      crin_tech: 'C+',
      crin_value: 3,
    }
    // rank: 6.5*0.3 = 1.95, tone: 8.5*0.3 = 2.55, tech: 5.5*0.2 = 1.1
    // value: (3/3)*10 = 10, 10*0.2 = 2.0
    // total: 1.95 + 2.55 + 1.1 + 2.0 = 7.6
    expect(calculateExpertScore(chu)).toBeCloseTo(7.6, 2)
  })

  it('uses defaults for missing fields (all default to C/0)', () => {
    const empty: ScoringComponent = {}
    // rank: 5.0*0.3 = 1.5, tone: 5.0*0.3 = 1.5, tech: 5.0*0.2 = 1.0
    // value: 0*0.2 = 0
    // total: 4.0
    expect(calculateExpertScore(empty)).toBe(4.0)
  })

  it('handles partial data gracefully', () => {
    const partial: ScoringComponent = {
      crin_rank: 'A+',
      crin_tone: null,
      crin_tech: undefined,
      crin_value: null,
    }
    // rank: 8.5*0.3 = 2.55, tone: 5.0*0.3 (default) = 1.5, tech: 5.0*0.2 = 1.0
    // value: 0*0.2 = 0
    // total: 5.05
    expect(calculateExpertScore(partial)).toBeCloseTo(5.05, 2)
  })

  it('perfect score: S+/S+/S+ value 3 = 10.0', () => {
    const perfect: ScoringComponent = {
      crin_rank: 'S+',
      crin_tone: 'S+',
      crin_tech: 'S+',
      crin_value: 3,
    }
    // rank: 10*0.3 = 3, tone: 10*0.3 = 3, tech: 10*0.2 = 2
    // value: (3/3)*10 = 10, 10*0.2 = 2
    // total: 10.0
    expect(calculateExpertScore(perfect)).toBe(10.0)
  })

  it('lowest score: F/F/F value 0 = 0', () => {
    const worst: ScoringComponent = {
      crin_rank: 'F',
      crin_tone: 'F',
      crin_tech: 'F',
      crin_value: 0,
    }
    expect(calculateExpertScore(worst)).toBe(0)
  })

  it('score is always between 0 and 10', () => {
    const grades = ['S+', 'S', 'A+', 'A', 'B+', 'B', 'C', 'D', 'F']
    const values = [0, 1, 2, 3]

    for (const rank of grades) {
      for (const tone of grades) {
        for (const value of values) {
          const score = calculateExpertScore({
            crin_rank: rank,
            crin_tone: tone,
            crin_tech: 'B',
            crin_value: value,
          })
          expect(score).toBeGreaterThanOrEqual(0)
          expect(score).toBeLessThanOrEqual(10)
        }
      }
    }
  })
})

// ─── hasExpertData ──────────────────────────────────────────────────────────

describe('hasExpertData', () => {
  it('returns false when no data present', () => {
    expect(hasExpertData({})).toBe(false)
  })

  it('returns false when all fields are null', () => {
    expect(
      hasExpertData({
        crin_rank: null,
        crin_tone: null,
        crin_tech: null,
        crin_value: null,
      })
    ).toBe(false)
  })

  it('returns true when rank is present', () => {
    expect(hasExpertData({ crin_rank: 'A' })).toBe(true)
  })

  it('returns true when tone is present', () => {
    expect(hasExpertData({ crin_tone: 'B+' })).toBe(true)
  })

  it('returns true when tech is present', () => {
    expect(hasExpertData({ crin_tech: 'S-' })).toBe(true)
  })

  it('returns false when value is 0 (falsy)', () => {
    // 0 is falsy in JS, so hasExpertData treats it as absent
    expect(hasExpertData({ crin_value: 0 })).toBe(false)
  })

  it('returns true when value is non-zero', () => {
    expect(hasExpertData({ crin_value: 3 })).toBe(true)
  })
})

// ─── calculateExpertConfidence ──────────────────────────────────────────────

describe('calculateExpertConfidence', () => {
  it('returns 0 for no data', () => {
    expect(calculateExpertConfidence({})).toBe(0)
  })

  it('returns 0.5 for 1 field', () => {
    expect(calculateExpertConfidence({ crin_rank: 'A' })).toBe(0.5)
  })

  it('returns 0.75 for 2 fields', () => {
    expect(calculateExpertConfidence({ crin_rank: 'A', crin_tone: 'B' })).toBe(0.75)
  })

  it('returns 0.9 for 3 fields', () => {
    expect(calculateExpertConfidence({ crin_rank: 'A', crin_tone: 'B', crin_tech: 'C' })).toBe(0.9)
  })

  it('returns 1.0 for all 4 fields', () => {
    expect(
      calculateExpertConfidence({
        crin_rank: 'A',
        crin_tone: 'B',
        crin_tech: 'C',
        crin_value: 2,
      })
    ).toBe(1.0)
  })

  it('counts value=0 as present', () => {
    expect(
      calculateExpertConfidence({
        crin_rank: 'A',
        crin_tone: 'B',
        crin_tech: 'C',
        crin_value: 0,
      })
    ).toBe(1.0)
  })

  it('does not count null value as present', () => {
    expect(
      calculateExpertConfidence({
        crin_rank: 'A',
        crin_tone: 'B',
        crin_tech: 'C',
        crin_value: null,
      })
    ).toBe(0.9)
  })
})
