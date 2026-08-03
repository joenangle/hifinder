import { describe, it, expect } from 'vitest'
import { buildComponentSeo, type SeoComponent } from '../component-detail'

const base: SeoComponent = {
  brand: 'Sennheiser',
  name: 'HD 600',
  category: 'cans',
  price_new: 399,
  price_used_min: 200,
  price_used_max: 280,
  sound_signature: 'neutral',
  crin_rank: 'A',
  asr_sinad: null,
}

describe('buildComponentSeo', () => {
  it('builds a title with brand, name, and human category', () => {
    expect(buildComponentSeo(base).title).toBe('Sennheiser HD 600 — Headphones | HiFinder')
  })

  it('summarizes used + new pricing in the description', () => {
    const { description } = buildComponentSeo(base)
    expect(description).toContain('Sennheiser HD 600')
    expect(description).toContain('$200–$280 used')
    expect(description).toContain('$399 new')
  })

  it('includes signature and Crinacle rank when present', () => {
    const { description } = buildComponentSeo(base)
    expect(description).toContain('neutral')
    expect(description).toContain('Crinacle A')
  })

  it('includes ASR SINAD for electronics', () => {
    const { description } = buildComponentSeo({
      ...base,
      category: 'dac',
      crin_rank: null,
      asr_sinad: 118,
    })
    expect(description).toContain('SINAD 118')
  })

  it('degrades gracefully when pricing and expert data are missing', () => {
    const { title, description } = buildComponentSeo({
      brand: 'Topping',
      name: 'L30',
      category: 'amp',
      price_new: null,
      price_used_min: null,
      price_used_max: null,
      sound_signature: null,
      crin_rank: null,
      asr_sinad: null,
    })
    expect(title).toBe('Topping L30 — Amp | HiFinder')
    expect(description).toContain('Topping L30')
    expect(description).not.toContain('undefined')
    expect(description).not.toContain('NaN')
  })
})
