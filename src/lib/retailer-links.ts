import { generateEbayAffiliateLink, generateTrackingId } from './ebay-affiliate'
import type { RetailerLink, ComponentInfo } from '@/types/marketplace'

export function getRetailerLinks(component: ComponentInfo): RetailerLink[] {
  const links: RetailerLink[] = []
  const searchQuery = encodeURIComponent(`${component.brand} ${component.name}`)

  // Amazon — use stored URL or generate search
  const amazonUrl = component.amazon_url
    || `https://www.amazon.com/s?k=${searchQuery}&tag=hifinder-20`
  links.push({
    name: 'Amazon',
    url: amazonUrl,
    type: 'new',
  })

  // eBay (used) — use existing affiliate link generator
  links.push({
    name: 'eBay',
    url: generateEbayAffiliateLink(
      { brand: component.brand, name: component.name, category: component.category },
      { customId: generateTrackingId(component.id, 'component_detail') }
    ),
    type: 'used',
  })

  // B&H Photo — audio equipment retailer
  links.push({
    name: 'B&H Photo',
    url: `https://www.bhphotovideo.com/c/search?q=${searchQuery}`,
    type: 'new',
  })

  // Drop — popular for audiophile gear
  if (['cans', 'iems', 'dac', 'amp', 'dac_amp'].includes(component.category)) {
    links.push({
      name: 'Drop',
      url: `https://drop.com/search/result?keyword=${searchQuery}`,
      type: 'new',
    })
  }

  return links
}

export type { RetailerLink, ComponentInfo } from '@/types/marketplace'
