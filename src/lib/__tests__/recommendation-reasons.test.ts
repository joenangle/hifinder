import { describe, it, expect } from 'vitest'
import { deriveReasonChips } from '../recommendation-reasons'

describe('deriveReasonChips', () => {
  it('returns empty for a dud component', () => {
    expect(deriveReasonChips({})).toEqual([])
  })

  it('surfaces top-tier expert grade when tone + tech both ≥ A', () => {
    const chips = deriveReasonChips({ crin_tone: 'A+', crin_tech: 'A' })
    expect(chips.length).toBe(1)
    expect(chips[0].label).toBe('Top-tier expert grade')
    expect(chips[0].tone).toBe('expert')
  })

  it('prefers crinacle grade over ASR SINAD', () => {
    const chips = deriveReasonChips({
      crin_tone: 'A',
      crin_tech: 'A',
      asr_sinad: 120,
    })
    expect(chips.map(c => c.label)).toEqual(['Top-tier expert grade'])
  })

  it('falls back to ASR-validated when only SINAD is present', () => {
    const chips = deriveReasonChips({ asr_sinad: 105 })
    expect(chips[0].label).toBe('ASR-validated')
  })

  it('requires both valueScore ≥ 85 AND expertScoreDisplay ≥ 60 for value chip', () => {
    // cheap but unknown quality — no value chip
    expect(deriveReasonChips({ valueScore: 100, expertScoreDisplay: 50 }))
      .toEqual([])
    // cheap AND decent — chip appears
    const chips = deriveReasonChips({ valueScore: 90, expertScoreDisplay: 65 })
    expect(chips.some(c => c.label === 'Strong value')).toBe(true)
  })

  it('shows a listings chip only when ≥3 are available', () => {
    expect(deriveReasonChips({ usedListingsCount: 2 })).toEqual([])
    const chips = deriveReasonChips({ usedListingsCount: 7 })
    expect(chips[0].label).toBe('7 used available')
  })

  it('shows "top match" only as a fallback when nothing else fires', () => {
    // High matchScore but no grades / no value signal → fallback
    expect(deriveReasonChips({ matchScore: 92 }).map(c => c.label))
      .toEqual(['Top match for your query'])
    // Same matchScore but value chip already fired → no fallback
    expect(
      deriveReasonChips({
        matchScore: 92,
        valueScore: 90,
        expertScoreDisplay: 70,
      }).map(c => c.label)
    ).toEqual(['Strong value'])
  })

  it('caps output at `max` chips', () => {
    // Loaded component — all rules fire, only top 2 returned
    const chips = deriveReasonChips({
      crin_tone: 'A+',
      crin_tech: 'A',
      valueScore: 95,
      expertScoreDisplay: 80,
      signatureScoreDisplay: 45,
      usedListingsCount: 10,
    }, 2)
    expect(chips).toHaveLength(2)
  })

  it('honors a smaller max', () => {
    const chips = deriveReasonChips({
      crin_tone: 'A+',
      crin_tech: 'A',
      valueScore: 95,
      expertScoreDisplay: 80,
    }, 1)
    expect(chips).toHaveLength(1)
    expect(chips[0].label).toBe('Top-tier expert grade')
  })

  it('returns stable ordering given identical inputs (determinism)', () => {
    const input = {
      crin_tone: 'A',
      crin_tech: 'A',
      valueScore: 90,
      expertScoreDisplay: 70,
      signatureScoreDisplay: 45,
    }
    const a = deriveReasonChips(input).map(c => c.label)
    const b = deriveReasonChips(input).map(c => c.label)
    expect(a).toEqual(b)
  })
})
