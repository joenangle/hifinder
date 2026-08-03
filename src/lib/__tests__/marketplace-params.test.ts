import { describe, it, expect } from 'vitest'
import {
  serializeMarketplaceParams,
  parseMarketplaceParams,
  DEFAULT_MARKETPLACE_FILTERS,
  type MarketplaceFilters,
} from '../marketplace-params'

const sp = (qs: string) => new URLSearchParams(qs)

describe('parseMarketplaceParams', () => {
  it('returns defaults for an empty query', () => {
    expect(parseMarketplaceParams(sp(''))).toEqual(DEFAULT_MARKETPLACE_FILTERS)
  })

  it('reads all filter params', () => {
    const f = parseMarketplaceParams(
      sp('search=hd600&source=reverb&conditions=excellent,good&categories=cans,iems&deal=great&min_price=150&max_price=500&state=CA&country=US&sort=price_asc')
    )
    expect(f).toEqual({
      search: 'hd600',
      source: 'reverb',
      conditions: ['excellent', 'good'],
      categories: ['cans', 'iems'],
      dealQuality: ['great'],
      minPrice: '150',
      maxPrice: '500',
      state: 'CA',
      country: 'US',
      sort: 'price_asc',
    })
  })

  it('ignores an invalid sort and falls back to default', () => {
    expect(parseMarketplaceParams(sp('sort=bogus')).sort).toBe('date_desc')
  })

  it('drops empty csv entries', () => {
    expect(parseMarketplaceParams(sp('conditions=,,excellent,')).conditions).toEqual(['excellent'])
  })
})

describe('serializeMarketplaceParams', () => {
  it('omits defaults and empty values', () => {
    expect(serializeMarketplaceParams(DEFAULT_MARKETPLACE_FILTERS)).toBe('')
  })

  it('serializes only the set, non-default filters', () => {
    const f: MarketplaceFilters = {
      ...DEFAULT_MARKETPLACE_FILTERS,
      source: 'reverb',
      conditions: ['excellent', 'good'],
      minPrice: '200',
    }
    const qs = serializeMarketplaceParams(f)
    expect(qs).toContain('source=reverb')
    expect(qs).toContain('conditions=excellent%2Cgood')
    expect(qs).toContain('min_price=200')
    expect(qs).not.toContain('country=')
    expect(qs).not.toContain('sort=')
  })

  it('round-trips through parse', () => {
    const f: MarketplaceFilters = {
      search: 'sundara',
      source: 'reddit_avexchange',
      conditions: ['excellent'],
      categories: ['cans'],
      dealQuality: ['great', 'good'],
      minPrice: '100',
      maxPrice: '400',
      state: 'NY',
      country: 'US',
      sort: 'price_desc',
    }
    expect(parseMarketplaceParams(sp(serializeMarketplaceParams(f)))).toEqual(f)
  })
})
