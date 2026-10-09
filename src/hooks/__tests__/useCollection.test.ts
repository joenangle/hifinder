import { describe, it, expect } from 'vitest'
import { collectionComponentsFromGear } from '../useCollection'

const comp = (id: string, category: string) => ({ id, brand: 'B', name: `N-${id}`, category, impedance: 32 })

describe('collectionComponentsFromGear', () => {
  it('keeps catalogue system gear of every category, de-duplicated', () => {
    const gear = [
      { components: comp('a', 'cans') },
      { components: comp('b', 'iems') },
      { components: comp('c', 'dac') },
      { components: comp('d', 'amp') },
      { components: comp('e', 'dac_amp') },
      { components: comp('a', 'cans') },
    ]
    expect(collectionComponentsFromGear(gear).map((c) => c.id)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })

  it('skips custom gear, cables and incomplete rows', () => {
    const gear = [{ components: null }, {}, { components: comp('x', 'cable') }, { components: { id: 'y' } }]
    expect(collectionComponentsFromGear(gear)).toEqual([])
  })

  it('fills missing optional fields with nulls', () => {
    const [c] = collectionComponentsFromGear([{ components: comp('a', 'cans') }])
    expect(c).toMatchObject({ price_new: null, sound_signature: null, needs_amp: false, fit: null })
  })
})
