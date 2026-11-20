import { describe, it, expect } from 'vitest'
import { AMP_MATCH_NONE, resolveAmpMatchIds } from '../amp-match'

const owned = ['aeon-2-closed', 'variations']

describe('resolveAmpMatchIds', () => {
  it('sends every owned headphone when the choice is automatic', () => {
    expect(resolveAmpMatchIds(owned, null)).toEqual(owned)
  })

  it('sends nothing when the user turns matching off', () => {
    expect(resolveAmpMatchIds(owned, AMP_MATCH_NONE)).toEqual([])
  })

  it('sends only the headphone the user picked', () => {
    expect(resolveAmpMatchIds(owned, 'variations')).toEqual(['variations'])
  })

  it('falls back to automatic when the pick is not a headphone the user owns', () => {
    expect(resolveAmpMatchIds(owned, 'someone-elses-hd800')).toEqual(owned)
    expect(resolveAmpMatchIds([], 'someone-elses-hd800')).toEqual([])
  })

  it('sends nothing when the user owns no headphones', () => {
    expect(resolveAmpMatchIds([], null)).toEqual([])
  })
})
