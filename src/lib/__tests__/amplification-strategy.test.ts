import { describe, it, expect } from 'vitest'
import { resolveAmplificationStrategy, PORTABLE_COMBO_CEILING } from '../amplification-strategy'

const wants = (o: Partial<{ dac: boolean; amp: boolean; combo: boolean }>) =>
  ({ dac: false, amp: false, combo: false, ...o })

describe('resolveAmplificationStrategy', () => {
  it('exposes the ceiling as 150', () => {
    expect(PORTABLE_COMBO_CEILING).toBe(150)
  })

  it('explicit combo → combo/explicit regardless of budget', () => {
    expect(resolveAmplificationStrategy({ wants: wants({ combo: true }), ampAllocation: 9999, dacAllocation: 9999 }))
      .toEqual({ mode: 'combo', reason: 'explicit' })
  })

  it('amp-only under ceiling → combo/budget', () => {
    expect(resolveAmplificationStrategy({ wants: wants({ amp: true }), ampAllocation: 57, dacAllocation: 0 }))
      .toEqual({ mode: 'combo', reason: 'budget' })
  })

  it('amp-only over ceiling → separate', () => {
    expect(resolveAmplificationStrategy({ wants: wants({ amp: true }), ampAllocation: 171, dacAllocation: 0 }))
      .toEqual({ mode: 'separate' })
  })

  it('dac+amp summing to exactly the ceiling → combo/budget (inclusive)', () => {
    expect(resolveAmplificationStrategy({ wants: wants({ amp: true, dac: true }), ampAllocation: 75, dacAllocation: 75 }))
      .toEqual({ mode: 'combo', reason: 'budget' })
  })

  it('dac+amp one dollar over ceiling → separate', () => {
    expect(resolveAmplificationStrategy({ wants: wants({ amp: true, dac: true }), ampAllocation: 76, dacAllocation: 75 }))
      .toEqual({ mode: 'separate' })
  })

  it('dac-only under ceiling → combo/budget', () => {
    expect(resolveAmplificationStrategy({ wants: wants({ dac: true }), ampAllocation: 0, dacAllocation: 60 }))
      .toEqual({ mode: 'combo', reason: 'budget' })
  })

  it('a zeroed (redistributed-to-nothing) amp allocation still routes to combo', () => {
    // The exact bug scenario: amp budget redistributed to 0 because the desktop
    // amp category had nothing in range. 0 <= ceiling → combo, not a dead-end.
    expect(resolveAmplificationStrategy({ wants: wants({ amp: true }), ampAllocation: 0, dacAllocation: 0 }))
      .toEqual({ mode: 'combo', reason: 'budget' })
  })

  it('neither amp nor dac wanted → separate (nothing to route)', () => {
    expect(resolveAmplificationStrategy({ wants: wants({}), ampAllocation: 0, dacAllocation: 0 }))
      .toEqual({ mode: 'separate' })
  })
})
