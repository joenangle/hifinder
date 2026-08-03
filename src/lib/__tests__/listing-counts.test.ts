import { describe, it, expect } from 'vitest'
import { countListingsByComponent } from '../listing-counts'

describe('countListingsByComponent', () => {
  it('counts listings per component and tracks the lowest price', () => {
    const result = countListingsByComponent([
      { component_id: 'a', price: 200 },
      { component_id: 'a', price: 150 },
      { component_id: 'b', price: 300 },
    ])
    expect(result.get('a')).toEqual({ count: 2, lowest: 150 })
    expect(result.get('b')).toEqual({ count: 1, lowest: 300 })
  })

  it('ignores listings with no component_id', () => {
    const result = countListingsByComponent([
      { component_id: null, price: 100 },
      { component_id: 'a', price: 200 },
    ])
    expect(result.has('a')).toBe(true)
    expect(result.size).toBe(1)
  })

  it('treats null prices as unknown without forcing lowest to 0', () => {
    const result = countListingsByComponent([
      { component_id: 'a', price: null },
      { component_id: 'a', price: 250 },
    ])
    expect(result.get('a')).toEqual({ count: 2, lowest: 250 })
  })

  it('falls back to lowest 0 when every price is null', () => {
    const result = countListingsByComponent([
      { component_id: 'a', price: null },
      { component_id: 'a', price: null },
    ])
    expect(result.get('a')).toEqual({ count: 2, lowest: 0 })
  })

  it('returns an empty map for no listings', () => {
    expect(countListingsByComponent([]).size).toBe(0)
  })
})
