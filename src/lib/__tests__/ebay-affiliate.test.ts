import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  generateEbayAffiliateLink,
  generateEbayAffiliateLinkAdvanced,
  generateTrackingId,
} from '../ebay-affiliate'

describe('generateEbayAffiliateLink', () => {
  const originalEnv = process.env.NEXT_PUBLIC_EBAY_CAMPAIGN_ID

  afterEach(() => {
    process.env.NEXT_PUBLIC_EBAY_CAMPAIGN_ID = originalEnv
  })

  it('generates a valid eBay search URL', () => {
    const link = generateEbayAffiliateLink(
      { brand: 'Sennheiser', name: 'HD 600', category: 'cans' },
      { campaignId: 'test123' }
    )

    expect(link).toContain('https://www.ebay.com/sch/i.html')
    expect(link).toContain('_nkw=Sennheiser+HD+600')
    expect(link).toContain('campid=test123')
  })

  it('includes category filter when provided', () => {
    const link = generateEbayAffiliateLink(
      { brand: 'Sennheiser', name: 'HD 600', category: 'cans' },
      { campaignId: 'test123' }
    )
    expect(link).toContain('_sacat=112529') // Headphones category
  })

  it('maps DAC category correctly', () => {
    const link = generateEbayAffiliateLink(
      { brand: 'Schiit', name: 'Modi', category: 'dac' },
      { campaignId: 'test123' }
    )
    expect(link).toContain('_sacat=14990')
  })

  it('includes used condition filter', () => {
    const link = generateEbayAffiliateLink(
      { brand: 'Schiit', name: 'Modi' },
      { campaignId: 'test123' }
    )
    expect(link).toContain('LH_ItemCondition=3000')
  })

  it('includes Buy It Now filter', () => {
    const link = generateEbayAffiliateLink(
      { brand: 'Schiit', name: 'Modi' },
      { campaignId: 'test123' }
    )
    expect(link).toContain('LH_BIN=1')
  })

  it('omits affiliate params when no campaign ID is available', () => {
    process.env.NEXT_PUBLIC_EBAY_CAMPAIGN_ID = ''
    const link = generateEbayAffiliateLink({ brand: 'Schiit', name: 'Modi' })
    expect(link).not.toContain('campid')
    expect(link).not.toContain('mkevt')
  })

  it('uses env campaign ID as fallback', () => {
    process.env.NEXT_PUBLIC_EBAY_CAMPAIGN_ID = 'env-campaign'
    const link = generateEbayAffiliateLink({ brand: 'Schiit', name: 'Modi' })
    expect(link).toContain('campid=env-campaign')
  })

  it('includes customId when provided', () => {
    const link = generateEbayAffiliateLink(
      { brand: 'Schiit', name: 'Modi' },
      { campaignId: 'test123', customId: 'custom-track' }
    )
    expect(link).toContain('customid=custom-track')
  })

  it('omits category param when no category given', () => {
    const link = generateEbayAffiliateLink(
      { brand: 'Schiit', name: 'Modi' },
      { campaignId: 'test123' }
    )
    expect(link).not.toContain('_sacat')
  })
})

describe('generateEbayAffiliateLinkAdvanced', () => {
  it('generates a valid URL with keywords', () => {
    const link = generateEbayAffiliateLinkAdvanced('Sennheiser HD 600')
    expect(link).toContain('https://www.ebay.com/sch/i.html')
    expect(link).toContain('_nkw=Sennheiser+HD+600')
  })

  it('includes price filters', () => {
    const link = generateEbayAffiliateLinkAdvanced('HD 600', {
      campaignId: 'test',
      minPrice: 200,
      maxPrice: 400,
    })
    expect(link).toContain('_udlo=200')
    expect(link).toContain('_udhi=400')
  })

  it('maps sort options correctly', () => {
    const pricelow = generateEbayAffiliateLinkAdvanced('test', { sortBy: 'price_low' })
    expect(pricelow).toContain('_sop=15')

    const newest = generateEbayAffiliateLinkAdvanced('test', { sortBy: 'newest' })
    expect(newest).toContain('_sop=10')
  })

  it('includes condition filter for used', () => {
    const link = generateEbayAffiliateLinkAdvanced('test', { condition: 'used' })
    expect(link).toContain('LH_ItemCondition=3000')
  })

  it('omits condition filter for all', () => {
    const link = generateEbayAffiliateLinkAdvanced('test', { condition: 'all' })
    expect(link).not.toContain('LH_ItemCondition')
  })

  it('includes Buy It Now filter when enabled', () => {
    const link = generateEbayAffiliateLinkAdvanced('test', { buyItNowOnly: true })
    expect(link).toContain('LH_BIN=1')
  })

  it('omits Buy It Now filter when not specified', () => {
    const link = generateEbayAffiliateLinkAdvanced('test', {})
    expect(link).not.toContain('LH_BIN')
  })
})

describe('generateTrackingId', () => {
  it('generates an ID with correct prefix', () => {
    const id = generateTrackingId('comp123')
    expect(id).toMatch(/^hf_component_detail_comp123_\d+$/)
  })

  it('includes the source parameter', () => {
    const id = generateTrackingId('comp123', 'recommendations')
    expect(id).toMatch(/^hf_recommendations_comp123_\d+$/)
  })

  it('includes a timestamp', () => {
    const before = Date.now()
    const id = generateTrackingId('comp123')
    const after = Date.now()

    const timestamp = parseInt(id.split('_').pop()!)
    expect(timestamp).toBeGreaterThanOrEqual(before)
    expect(timestamp).toBeLessThanOrEqual(after)
  })
})
