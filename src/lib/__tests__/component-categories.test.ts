import { describe, it, expect } from 'vitest'
import {
  CATEGORY,
  HEADPHONE_CATEGORIES,
  AMP_CATEGORIES,
  DAC_CATEGORIES,
  normalizeCategory,
  isCategoryIn,
} from '../component-categories'

describe('normalizeCategory', () => {
  it('passes canonical categories through unchanged', () => {
    expect(normalizeCategory('cans')).toBe('cans')
    expect(normalizeCategory('dac_amp')).toBe('dac_amp')
  })

  it('maps the legacy spellings that had silently matched nothing', () => {
    expect(normalizeCategory('headphones')).toBe(CATEGORY.CANS)
    expect(normalizeCategory('amps')).toBe(CATEGORY.AMP)
    expect(normalizeCategory('dacs')).toBe(CATEGORY.DAC)
    expect(normalizeCategory('combo')).toBe(CATEGORY.DAC_AMP)
  })

  it('is case- and whitespace-insensitive', () => {
    expect(normalizeCategory('  Headphones ')).toBe(CATEGORY.CANS)
  })

  it('returns null for unknown or empty input', () => {
    expect(normalizeCategory('speakers')).toBeNull()
    expect(normalizeCategory('')).toBeNull()
    expect(normalizeCategory(null)).toBeNull()
  })
})

describe('isCategoryIn', () => {
  it('matches canonical and legacy spellings against the same group', () => {
    expect(isCategoryIn('cans', HEADPHONE_CATEGORIES)).toBe(true)
    expect(isCategoryIn('headphones', HEADPHONE_CATEGORIES)).toBe(true)
    expect(isCategoryIn('iems', HEADPHONE_CATEGORIES)).toBe(true)
  })

  it('treats dac_amp as both an amp and a DAC', () => {
    expect(isCategoryIn('dac_amp', AMP_CATEGORIES)).toBe(true)
    expect(isCategoryIn('dac_amp', DAC_CATEGORIES)).toBe(true)
    expect(isCategoryIn('combo', AMP_CATEGORIES)).toBe(true)
  })

  it('does not treat a plain DAC as an amp', () => {
    expect(isCategoryIn('dac', AMP_CATEGORIES)).toBe(false)
  })

  it('returns false for unknown categories', () => {
    expect(isCategoryIn('speakers', AMP_CATEGORIES)).toBe(false)
    expect(isCategoryIn(null, HEADPHONE_CATEGORIES)).toBe(false)
  })
})
