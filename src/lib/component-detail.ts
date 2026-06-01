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
