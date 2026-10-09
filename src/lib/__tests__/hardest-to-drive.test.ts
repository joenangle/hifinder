import { describe, it, expect } from 'vitest'
import { pickHardestToDrive } from '../audio-calculations'

const hd650 = { id: 'hd650', impedance: 300, sensitivity_db_mw: 97.8, needs_amp: true }
const he6 = { id: 'he6', impedance: 50, sensitivity_db_mw: 83.5, needs_amp: true }
const ie600 = { id: 'ie600', impedance: 18, sensitivity_db_mw: 100.6, needs_amp: false }
const dt880_600 = { id: 'dt880-600', impedance: 600, sensitivity_db_mw: 96, needs_amp: true }
const easyCan = { id: 'easy', impedance: 32, sensitivity_db_mw: 100, needs_amp: false }

describe('pickHardestToDrive', () => {
  it('returns null for an empty collection', () => {
    expect(pickHardestToDrive([])).toBeNull()
  })

  it('picks the inefficient planar over a high-impedance dynamic and an IEM', () => {
    expect(pickHardestToDrive([ie600, hd650, he6])?.id).toBe('he6')
  })

  it('accounts for voltage: 600Ω beats an easy 32Ω can even at similar sensitivity', () => {
    expect(pickHardestToDrive([easyCan, dt880_600])?.id).toBe('dt880-600')
  })

  it('prefers a headphone with real power data over ones without', () => {
    const noData = { id: 'mystery', impedance: null, sensitivity_db_mw: null, needs_amp: true }
    expect(pickHardestToDrive([noData, ie600])?.id).toBe('ie600')
  })

  it('without any power data, prefers one flagged as needing an amp, then higher impedance', () => {
    const a = { id: 'a', impedance: 32, needs_amp: false }
    const b = { id: 'b', impedance: 250, needs_amp: false }
    const c = { id: 'c', impedance: 80, needs_amp: true }
    expect(pickHardestToDrive([a, b, c])?.id).toBe('c')
    expect(pickHardestToDrive([a, b])?.id).toBe('b')
  })
})
