/**
 * Pure helpers for the shareable component detail page (`/components/[id]`).
 * SEO title/description are built here so they're unit-testable and reused by
 * both the page body and its generateMetadata().
 */

export interface SeoComponent {
  brand: string
  name: string
  category: string
  price_new: number | null
  price_used_min: number | null
  price_used_max: number | null
  sound_signature: string | null
  crin_rank: string | number | null
  asr_sinad: number | null
}

export const COMPONENT_CATEGORY_LABEL: Record<string, string> = {
  cans: 'Headphones',
  iems: 'IEMs',
  dac: 'DAC',
  amp: 'Amp',
  dac_amp: 'DAC/Amp',
  cable: 'Cable',
}

export function categoryLabel(category: string): string {
  return COMPONENT_CATEGORY_LABEL[category] ?? category
}

export function buildComponentSeo(c: SeoComponent): { title: string; description: string } {
  const fullName = `${c.brand} ${c.name}`
  const title = `${fullName} — ${categoryLabel(c.category)} | HiFinder`

  const parts: string[] = []
  if (c.price_used_min && c.price_used_max) {
    parts.push(`$${Math.round(c.price_used_min)}–$${Math.round(c.price_used_max)} used`)
  }
  if (c.price_new) parts.push(`$${Math.round(c.price_new)} new`)
  if (c.sound_signature) parts.push(`${c.sound_signature} signature`)
  if (c.crin_rank != null && c.crin_rank !== '') parts.push(`Crinacle ${c.crin_rank}`)
  if (c.asr_sinad != null) parts.push(`SINAD ${c.asr_sinad}`)

  const summary = parts.length > 0 ? ` ${parts.join(' · ')}.` : ''
  const description = `${fullName} (${categoryLabel(c.category)}).${summary} Specs, prices, and used listings on HiFinder.`

  return { title, description }
}

const SITE_URL = 'https://hifinder.app'

export interface JsonLdComponent extends SeoComponent {
  id: string
  image_url: string | null
}

/**
 * schema.org Product + BreadcrumbList for the detail page.
 *
 * Prices become an AggregateOffer spanning used and new. Expert grades are
 * deliberately not mapped to aggregateRating: Google reserves that for
 * user reviews, and marking up third-party grades risks a manual action.
 */
export function buildComponentJsonLd(
  c: JsonLdComponent,
  { listingCount }: { listingCount: number }
) {
  const fullName = `${c.brand} ${c.name}`
  const url = `${SITE_URL}/components/${c.id}`
  const prices = [c.price_new, c.price_used_min, c.price_used_max].filter(
    (p): p is number => typeof p === 'number' && p > 0
  )

  const product = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: fullName,
    brand: { '@type': 'Brand', name: c.brand },
    category: categoryLabel(c.category),
    description: buildComponentSeo(c).description,
    url,
    image: c.image_url ? [c.image_url] : undefined,
    offers:
      prices.length > 0
        ? {
            '@type': 'AggregateOffer',
            priceCurrency: 'USD',
            lowPrice: Math.round(Math.min(...prices)),
            highPrice: Math.round(Math.max(...prices)),
            offerCount: listingCount > 0 ? listingCount : undefined,
          }
        : undefined,
  }

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Catalog', item: `${SITE_URL}/browse` },
      { '@type': 'ListItem', position: 2, name: fullName, item: url },
    ],
  }

  return [product, breadcrumb] as const
}
