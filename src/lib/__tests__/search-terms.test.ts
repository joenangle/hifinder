import { describe, it, expect } from 'vitest'
import { searchWords, brandOrNameMatches } from '../search-terms'

describe('searchWords', () => {
  it('lowercases and splits on whitespace', () => {
    expect(searchWords('Sennheiser HD 600')).toEqual(['sennheiser', 'hd', '600'])
  })

  it('returns an empty array for blank input', () => {
    expect(searchWords('')).toEqual([])
    expect(searchWords('   ')).toEqual([])
    expect(searchWords(null)).toEqual([])
    expect(searchWords(undefined)).toEqual([])
  })

  it('cannot add clauses to a PostgREST or() filter', () => {
    // A comma would start a new or() clause; a paren could close the group
    const words = searchWords('hd,id.not.is.null) or(x')

    for (const word of words) {
      expect(word).not.toMatch(/[,()]/)
    }
    expect(words).toEqual(['hd', 'id.not.is.null', 'or', 'x'])
  })

  it('drops quoting and ilike wildcard characters', () => {
    expect(searchWords('"hd\\600" 100% a_b *')).toEqual(['hd', '600', '100', 'a', 'b'])
  })

  it('keeps characters that are common in model names', () => {
    expect(searchWords('Héritage HE-1000se v2.5 + Ananda/Stealth')).toEqual([
      'héritage', 'he-1000se', 'v2.5', '+', 'ananda/stealth',
    ])
  })
})

describe('brandOrNameMatches', () => {
  it('builds a brand-or-name ilike clause', () => {
    expect(brandOrNameMatches('hd')).toBe('brand.ilike.%hd%,name.ilike.%hd%')
  })
})
