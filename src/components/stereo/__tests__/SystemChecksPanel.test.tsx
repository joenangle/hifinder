import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { runSystemChecks, type SystemCheckInput } from '@/lib/stereo/checks'
import { SystemChecksPanel } from '../SystemChecksPanel'

const sv = <T,>(value: T) => ({ value, trust: 'claimed' as const })

const base: SystemCheckInput = {
  speakers: { sensitivity_db: sv(87), sensitivity_ref: sv('2.83V' as const), nominal_impedance_ohms: sv(8) },
  amp: { power_w_8ohm: sv(100), power_rating: { kind: 'continuous' } },
  source: null,
  profile: {
    room: { length_m: 5, width_m: 4, height_m: 2.6 },
    room_preset: null,
    acoustics: 'average',
    distance_m: 3,
    near_wall: null,
    target_peak_db: 95,
  },
  mode: 'simple',
}

const cardTitles = () =>
  Array.from(document.querySelectorAll('details > summary > span:first-child')).map((e) => e.textContent)

describe('SystemChecksPanel', () => {
  it('orders cards problem, note, needs, ok, not checked', () => {
    const checks = runSystemChecks({
      ...base,
      speakers: { ...base.speakers, sensitivity_db: sv(100), sensitivity_ref: sv('1W' as const) },
      amp: { ...base.amp, output_noise_uv: sv(1000), topology: 'tube' },
    })
    render(<SystemChecksPanel checks={checks} />)
    // hiss: problem (horns and a noisy amp); tonal: needs (tube, no output impedance); gain: not checked.
    expect(cardTitles()).toEqual(['Hiss', 'Tonal shift', 'Gain'])
    const hiss = screen.getByText('Hiss').closest('details')!
    expect(hiss.open).toBe(true)
    expect(within(hiss).getByText('Problem')).toBeTruthy()
    expect(screen.getByText('Gain').closest('details')!.open).toBe(false)
  })

  it('shows not-checked reasons and soft needs without blocking language', () => {
    render(<SystemChecksPanel checks={runSystemChecks(base)} />)
    fireEvent.click(screen.getByText('Gain'))
    expect(screen.getByText(/No source added/)).toBeTruthy()
    fireEvent.click(screen.getByText('Hiss'))
    expect(screen.getByText(/Add amp noise to check this\. It never changes the power result\./)).toBeTruthy()
    expect(screen.queryByText(/We need/)).toBeNull()
  })

  it('draws the tonal chart with a table holding the same data', () => {
    const curve = [
      { hz: 20, ohms: 9 },
      { hz: 55, ohms: 28 },
      { hz: 180, ohms: 3.4 },
      { hz: 1000, ohms: 7 },
    ]
    const checks = runSystemChecks({
      ...base,
      speakers: { ...base.speakers, impedance_curve: { value: curve, trust: 'measured' } },
      amp: { ...base.amp, output_impedance_ohms: sv(3) },
    })
    render(<SystemChecksPanel checks={checks} />)
    expect(screen.getByRole('img', { name: /Predicted change in frequency response/ })).toBeTruthy()
    const rows = screen.getByText('Chart data as a table').closest('details')!.querySelectorAll('tbody tr')
    expect(rows).toHaveLength(curve.length)
  })

  it('assumption chips call back with their id', () => {
    const onEdit = vi.fn()
    const checks = runSystemChecks({ ...base, amp: { ...base.amp, topology: 'solid_state' } })
    render(<SystemChecksPanel checks={checks} onEditAssumption={onEdit} />)
    fireEvent.click(screen.getByText('Tonal shift'))
    fireEvent.click(screen.getByRole('button', { name: /Assumed 3 m of 16 AWG/ }))
    expect(onEdit).toHaveBeenCalledWith('cable.run')
  })
})
