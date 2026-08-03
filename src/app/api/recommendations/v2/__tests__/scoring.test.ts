import { describe, it, expect } from 'vitest'
import {
  SCORING_CONFIG,
  calculateSynergyScore,
  filterAndScoreComponents,
  hasExistingGear,
} from '../route'

const emptyGear = {
  headphones: false,
  dac: false,
  amp: false,
  combo: false,
  specificModels: { headphones: '', dac: '', amp: '', combo: '' },
}

describe('hasExistingGear', () => {
  it('is false for a fully-empty gear object (the always-sent default)', () => {
    // The client always sends a populated object, so Object.keys().length was
    // always truthy — which made every request look personalized and blocked
    // CDN caching entirely.
    expect(hasExistingGear(emptyGear)).toBe(false)
  })

  it('is false for undefined', () => {
    expect(hasExistingGear(undefined)).toBe(false)
  })

  it('is true when a category flag is set', () => {
    expect(hasExistingGear({ ...emptyGear, amp: true })).toBe(true)
  })

  it('is true when a specific model is named', () => {
    expect(hasExistingGear({
      ...emptyGear,
      specificModels: { ...emptyGear.specificModels, headphones: 'HD 600' },
    })).toBe(true)
  })

  it('ignores whitespace-only specific models', () => {
    expect(hasExistingGear({
      ...emptyGear,
      specificModels: { ...emptyGear.specificModels, dac: '   ' },
    })).toBe(false)
  })
})

// Builds a component shaped like what the route fetches from Supabase.
// Defaults give a "scoreable" item that passes price-range and reasonable-spread filters.
function makeComponent(overrides: Record<string, unknown> = {}) {
  return {
    id: 'fixture-id',
    name: 'Fixture',
    brand: 'BrandA',
    category: 'iems',
    price_used_min: 90,
    price_used_max: 110,
    sound_signature: 'neutral',
    crin_rank: 'A',
    crin_tone: 'A',
    crin_tech: 'A',
    crin_value: 2,
    impedance: 32,
    needs_amp: false,
    is_tws: false,
    usedListingsCount: 0,
    priceTrendDirection: null,
    priceTrendConfidence: null,
    ...overrides,
  }
}

describe('calculateSynergyScore', () => {
  it('rewards an exact sound-signature match', () => {
    const comp = { sound_signature: 'neutral' }
    const score = calculateSynergyScore(comp, ['neutral'])
    expect(score).toBeGreaterThan(0.3)
  })

  it('treats neutral and balanced as a close match', () => {
    const balanced = calculateSynergyScore({ sound_signature: 'balanced' }, ['neutral'])
    const exact = calculateSynergyScore({ sound_signature: 'neutral' }, ['neutral'])
    expect(balanced).toBeGreaterThan(0)
    expect(balanced).toBeLessThan(exact)
  })

  it('falls back to derived_signature when sound_signature is missing', () => {
    const withFallback = calculateSynergyScore(
      { sound_signature: undefined, derived_signature: 'warm' },
      ['warm']
    )
    expect(withFallback).toBeGreaterThan(0)
  })

  it('returns the best score across multiple selected signatures (OR logic)', () => {
    const best = calculateSynergyScore(
      { sound_signature: 'warm' },
      ['neutral', 'warm', 'bright']
    )
    expect(best).toBeGreaterThan(0.3)
  })
})

describe('filterAndScoreComponents — final-score composition', () => {
  it('produces a matchScore that uses the configured 55/25/10/10 weights', () => {
    const comp = makeComponent()
    const [scored] = filterAndScoreComponents(
      [comp],
      100,            // budget
      ['neutral'],    // signatures
      'music',
      10
    )

    // Reconstruct expected matchScore from per-axis display fields the
    // function emits. Each *Display is rounded(score * 100), so we apply
    // weights to those values. The bonuses are also exposed as displays.
    const expected =
      scored.expertScoreDisplay * SCORING_CONFIG.weights.expert +
      scored.signatureScoreDisplay * SCORING_CONFIG.weights.signature +
      scored.valueScore * SCORING_CONFIG.weights.value +
      scored.proximityScoreDisplay * SCORING_CONFIG.weights.proximity

    // Total bonuses on this fixture: signatureBonus only, since liquidity=0,
    // trend=null, and category=iems (no power bonus).
    const signatureBonus =
      (scored.signatureScoreDisplay / 100) >= SCORING_CONFIG.bonuses.signatureMatchThreshold
        ? SCORING_CONFIG.bonuses.signatureMatch * 100
        : 0

    // matchScore is Math.round(min(1, raw) * 100), so within ±1 of computed
    expect(Math.abs(scored.matchScore - (expected + signatureBonus))).toBeLessThanOrEqual(2)
  })

  it('displays a perfect signature match as 100, not 50', () => {
    // The signature axis used to be capped at 0.5 while carrying a 0.25 weight,
    // so its real influence was 12.5% and a perfect match showed as "50".
    const [scored] = filterAndScoreComponents(
      [makeComponent({ sound_signature: 'neutral', crin_signature: 'Neutral' })],
      100,
      ['neutral'],
      'music',
      10
    )
    expect(scored.signatureScoreDisplay).toBe(100)
  })

  it('awards the signature bonus for an exact match with no detailed signature', () => {
    const [scored] = filterAndScoreComponents(
      [makeComponent({ sound_signature: 'neutral', crin_signature: null })],
      100,
      ['neutral'],
      'music',
      10
    )
    expect(scored.signatureScoreDisplay / 100).toBeGreaterThanOrEqual(
      SCORING_CONFIG.bonuses.signatureMatchThreshold
    )
  })

  it('scores compatible signatures symmetrically', () => {
    const score = (userSig: string, compSig: string) =>
      calculateSynergyScore({ sound_signature: compSig }, [userSig])

    // warm↔neutral was 0.20 one way and 0.08 the other, purely because only
    // one direction was enumerated in the compatibility list.
    expect(score('warm', 'neutral')).toBe(score('neutral', 'warm'))
    expect(score('dark', 'warm')).toBe(score('warm', 'dark'))
    expect(score('fun', 'v-shaped')).toBe(score('v-shaped', 'fun'))
  })
})

describe('filterAndScoreComponents — diversity rerank', () => {
  it('caps any single brand at SCORING_CONFIG.diversity.maxPerBrand in the prefix', () => {
    const cap = SCORING_CONFIG.diversity.maxPerBrand // = 2
    // 5 from BrandA, 2 from BrandB. After diversity, prefix should hold 2 BrandA + 2 BrandB,
    // then deferred BrandA tail.
    const components = [
      makeComponent({ id: 'a1', brand: 'BrandA', name: 'A1' }),
      makeComponent({ id: 'a2', brand: 'BrandA', name: 'A2' }),
      makeComponent({ id: 'a3', brand: 'BrandA', name: 'A3' }),
      makeComponent({ id: 'a4', brand: 'BrandA', name: 'A4' }),
      makeComponent({ id: 'a5', brand: 'BrandA', name: 'A5' }),
      makeComponent({ id: 'b1', brand: 'BrandB', name: 'B1' }),
      makeComponent({ id: 'b2', brand: 'BrandB', name: 'B2' }),
    ]

    const result = filterAndScoreComponents(components, 100, ['neutral'], 'music', 10)
    const prefix = result.slice(0, cap + 2) // first 4 should be BrandA×2, BrandB×2

    const brandACount = prefix.filter((r) => r.brand === 'BrandA').length
    expect(brandACount).toBeLessThanOrEqual(cap)
  })
})

describe('filterAndScoreComponents — liquidity bonus cap', () => {
  it('clamps liquidity bonus at 6+ listings to liquidityCap', () => {
    const six = makeComponent({ id: 's6', usedListingsCount: 6 })
    const twenty = makeComponent({ id: 's20', usedListingsCount: 20 })
    const [r6] = filterAndScoreComponents([six], 100, ['neutral'], 'music', 10)
    const [r20] = filterAndScoreComponents([twenty], 100, ['neutral'], 'music', 10)

    // Both should saturate at liquidityCap × 100, so liquidityBonusDisplay is equal
    expect(r6.liquidityBonusDisplay).toBe(Math.round(SCORING_CONFIG.bonuses.liquidityCap * 100))
    expect(r20.liquidityBonusDisplay).toBe(r6.liquidityBonusDisplay)
  })

  it('linearly accumulates liquidity bonus below the cap', () => {
    const [r2] = filterAndScoreComponents(
      [makeComponent({ id: 's2', usedListingsCount: 2 })],
      100, ['neutral'], 'music', 10
    )
    expect(r2.liquidityBonusDisplay).toBe(
      Math.round(2 * SCORING_CONFIG.bonuses.liquidityPerListing * 100)
    )
  })
})

describe('filterAndScoreComponents — price-trend gating', () => {
  it('ignores a "down" trend when confidence is low', () => {
    const lowConfDown = makeComponent({
      id: 'low',
      priceTrendDirection: 'down',
      priceTrendConfidence: 'low',
    })
    const [r] = filterAndScoreComponents([lowConfDown], 100, ['neutral'], 'music', 10)
    expect(r.trendBonusDisplay).toBe(0)
  })

  it('applies +trendDown when confidence is high', () => {
    const highConfDown = makeComponent({
      id: 'high',
      priceTrendDirection: 'down',
      priceTrendConfidence: 'high',
    })
    const [r] = filterAndScoreComponents([highConfDown], 100, ['neutral'], 'music', 10)
    expect(r.trendBonusDisplay).toBe(Math.round(SCORING_CONFIG.bonuses.trendDown * 100))
  })

  it('applies negative trendUp when trending up', () => {
    const upTrend = makeComponent({
      id: 'up',
      priceTrendDirection: 'up',
      priceTrendConfidence: 'medium',
    })
    const [r] = filterAndScoreComponents([upTrend], 100, ['neutral'], 'music', 10)
    expect(r.trendBonusDisplay).toBe(Math.round(SCORING_CONFIG.bonuses.trendUp * 100))
  })
})
