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

  it('surfaces a "trending down" chip for medium/high-confidence downtrends', () => {
    const chips = deriveReasonChips({
      priceTrendDirection: 'down',
      priceTrendConfidence: 'medium',
      priceTrendPercentage: -5.2,
    })
    expect(chips[0].label).toBe('Used prices trending down')
    expect(chips[0].tone).toBe('trend')
    expect(chips[0].tooltip).toContain('5.2')
  })

  it('ignores low-confidence trends (too noisy — 1-2 sold listings)', () => {
    expect(
      deriveReasonChips({
        priceTrendDirection: 'down',
        priceTrendConfidence: 'low',
        priceTrendPercentage: -15,
      })
    ).toEqual([])
  })

  it('shows "trending up" with appropriate copy', () => {
    const chips = deriveReasonChips({
      priceTrendDirection: 'up',
      priceTrendConfidence: 'high',
      priceTrendPercentage: 8,
    })
    expect(chips[0].label).toBe('Used prices trending up')
  })

  it('does not emit a trend chip for stable', () => {
    expect(
      deriveReasonChips({
        priceTrendDirection: 'stable',
        priceTrendConfidence: 'high',
      })
    ).toEqual([])
  })

  it('surfaces a Limited data caution chip when hasThinExpertData is true', () => {
    const chips = deriveReasonChips({ hasThinExpertData: true })
    expect(chips.some(c => c.label === 'Limited data' && c.tone === 'caution')).toBe(true)
  })

  it('Limited data chip respects the max cap (may bump other chips off)', () => {
    const chips = deriveReasonChips({
      crin_tone: 'A+',
      crin_tech: 'A',
      valueScore: 95,
      expertScoreDisplay: 80,
      signatureScoreDisplay: 50,
      hasThinExpertData: true,
    }, 2)
    expect(chips).toHaveLength(2)
    // Limited data should appear (it's the last push)
    expect(chips.some(c => c.label === 'Limited data')).toBe(true)
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
