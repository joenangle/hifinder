import { describe, it, expect } from 'vitest'
import {
  parseBrowseParams,
  browseSortClauses,
  browseSearchWords,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from '../browse-params'

const sp = (qs: string) => new URLSearchParams(qs)

describe('parseBrowseParams', () => {
  it('returns sensible defaults for an empty query string', () => {
    expect(parseBrowseParams(sp(''))).toEqual({
      q: null,
      category: null,
      sort: 'brand',
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
    })
  })

  it('keeps a valid category and drops an invalid one', () => {
    expect(parseBrowseParams(sp('category=iems')).category).toBe('iems')
    expect(parseBrowseParams(sp('category=speakers')).category).toBeNull()
  })

  it('accepts known sorts and falls back to brand otherwise', () => {
    expect(parseBrowseParams(sp('sort=price_asc')).sort).toBe('price_asc')
    expect(parseBrowseParams(sp('sort=expert')).sort).toBe('expert')
    expect(parseBrowseParams(sp('sort=bogus')).sort).toBe('brand')
  })

  it('trims q to null when blank', () => {
    expect(parseBrowseParams(sp('q=%20%20')).q).toBeNull()
    expect(parseBrowseParams(sp('q=hd600')).q).toBe('hd600')
  })

  it('clamps page to >=1 and pageSize to [1, MAX]', () => {
    expect(parseBrowseParams(sp('page=0')).page).toBe(1)
    expect(parseBrowseParams(sp('page=-5')).page).toBe(1)
    expect(parseBrowseParams(sp('page=3')).page).toBe(3)
    expect(parseBrowseParams(sp('pageSize=1000')).pageSize).toBe(MAX_PAGE_SIZE)
    expect(parseBrowseParams(sp('pageSize=0')).pageSize).toBe(1)
    expect(parseBrowseParams(sp('pageSize=12')).pageSize).toBe(12)
  })

  it('treats non-numeric page/pageSize as defaults', () => {
    const p = parseBrowseParams(sp('page=abc&pageSize=xyz'))
    expect(p.page).toBe(1)
    expect(p.pageSize).toBe(DEFAULT_PAGE_SIZE)
  })
})

describe('browseSearchWords', () => {
  it('lowercases and splits on whitespace', () => {
    expect(browseSearchWords('Sennheiser HD 600')).toEqual(['sennheiser', 'hd', '600'])
  })

  it('returns an empty array for blank/empty input', () => {
    expect(browseSearchWords('')).toEqual([])
    expect(browseSearchWords('   ')).toEqual([])
    expect(browseSearchWords(null)).toEqual([])
  })
})

describe('browseSortClauses', () => {
  it('brand sorts by brand then name ascending', () => {
    expect(browseSortClauses('brand')).toEqual([
      { column: 'brand', ascending: true, nullsFirst: false },
      { column: 'name', ascending: true, nullsFirst: false },
    ])
  })

  it('price sorts put nulls last in both directions', () => {
    expect(browseSortClauses('price_asc')).toEqual([
      { column: 'price_new', ascending: true, nullsFirst: false },
    ])
    expect(browseSortClauses('price_desc')).toEqual([
      { column: 'price_new', ascending: false, nullsFirst: false },
    ])
  })

  it('expert sorts by expert_grade_numeric descending, nulls last', () => {
    expect(browseSortClauses('expert')).toEqual([
      { column: 'expert_grade_numeric', ascending: false, nullsFirst: false },
    ])
  })
})
