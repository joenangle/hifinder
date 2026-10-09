import { describe, it, expect } from 'vitest'
import { generateCacheKey } from '../cache-recommendations'

const baseParams = {
  budget: 300,
  soundSignatures: ['neutral'],
  headphoneType: 'cans',
  wantRecommendationsFor: { headphones: true },
}

describe('generateCacheKey', () => {
  it('produces identical keys for identical inputs', () => {
    expect(generateCacheKey(baseParams)).toBe(generateCacheKey(baseParams))
  })

  it('is sensitive to budget changes', () => {
    expect(generateCacheKey(baseParams)).not.toBe(
      generateCacheKey({ ...baseParams, budget: 500 })
    )
  })

  it('is sensitive to driverType (the regression this function was hardened against)', () => {
    const planar = generateCacheKey({ ...baseParams, driverType: 'planar' })
    const dynamic = generateCacheKey({ ...baseParams, driverType: 'dynamic' })
    expect(planar).not.toBe(dynamic)
  })

  it('is sensitive to budgetRangeMin / budgetRangeMax', () => {
    const narrow = generateCacheKey({ ...baseParams, budgetRangeMin: 5, budgetRangeMax: 5 })
    const wide = generateCacheKey({ ...baseParams, budgetRangeMin: 30, budgetRangeMax: 30 })
    expect(narrow).not.toBe(wide)
  })

  it('is sensitive to which headphones the user owns, not their order', () => {
    const a = generateCacheKey({ ...baseParams, ownedHeadphoneIds: ['id-hd600', 'id-he6'] })
    const b = generateCacheKey({ ...baseParams, ownedHeadphoneIds: ['id-he6', 'id-hd600'] })
    const c = generateCacheKey({ ...baseParams, ownedHeadphoneIds: ['id-hd600'] })
    expect(a).toBe(b)
    expect(a).not.toBe(c)
  })

  it('is sensitive to customBudgetAllocation', () => {
    const allocA = generateCacheKey({
      ...baseParams,
      customBudgetAllocation: { headphones: { amount: 200 }, amp: { amount: 100 } },
    })
    const allocB = generateCacheKey({
      ...baseParams,
      customBudgetAllocation: { headphones: { amount: 250 }, amp: { amount: 50 } },
    })
    expect(allocA).not.toBe(allocB)
  })

  it('is insensitive to object-property insertion order in customBudgetAllocation', () => {
    const keyA = generateCacheKey({
      ...baseParams,
      customBudgetAllocation: { headphones: { amount: 200 }, amp: { amount: 100 } },
    })
    const keyB = generateCacheKey({
      ...baseParams,
      customBudgetAllocation: { amp: { amount: 100 }, headphones: { amount: 200 } },
    })
    expect(keyA).toBe(keyB)
  })

  it('is insensitive to soundSignatures array order', () => {
    const a = generateCacheKey({ ...baseParams, soundSignatures: ['warm', 'neutral'] })
    const b = generateCacheKey({ ...baseParams, soundSignatures: ['neutral', 'warm'] })
    expect(a).toBe(b)
  })


  it('treats an empty selectedItems array the same as omitting the field', () => {
    expect(generateCacheKey({ ...baseParams, selectedItems: [] })).toBe(
      generateCacheKey(baseParams)
    )
  })

  it('distinguishes selected items with the same id but a different price', () => {
    // The route encodes each selection as `id:category:avgPrice`. avgPrice
    // drives the effective budget, so keying on id alone let two requests with
    // the same selection at different prices collide and serve wrong rankings.
    const cheap = generateCacheKey({ ...baseParams, selectedItems: ['abc:cans:120'] })
    const dear = generateCacheKey({ ...baseParams, selectedItems: ['abc:cans:400'] })
    expect(cheap).not.toBe(dear)
  })
})
