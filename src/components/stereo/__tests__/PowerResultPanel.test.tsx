import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { PowerResultPanel } from '../PowerResultPanel'
import { runPowerCheck, type PowerCheckInput, type PowerCheckOutcome } from '@/lib/stereo/power-check'
import type { SpeakerAmpSpecs, SpeakerSpecs, SystemProfile } from '@/lib/stereo/specs'

const sv = <T,>(value: T, trust: 'claimed' | 'measured' | 'user' = 'claimed') => ({ value, trust })

const speakers = (over: Partial<SpeakerSpecs> = {}): SpeakerSpecs => ({
  sensitivity_db: sv(87),
  sensitivity_ref: sv('2.83V' as const),
  nominal_impedance_ohms: sv(4),
  ...over,
})
const amp = (over: Partial<SpeakerAmpSpecs> = {}): SpeakerAmpSpecs => ({
  power_w_4ohm: sv(80),
  power_rating: { kind: 'continuous' },
  ...over,
})
const profile = (over: Partial<SystemProfile> = {}): SystemProfile => ({
  room: { length_m: 5, width_m: 4, height_m: 2.6 },
  room_preset: null,
  acoustics: 'average',
  distance_m: 3,
  near_wall: null,
  target_peak_db: 95,
  ...over,
})
function ok(over: Partial<PowerCheckInput> = {}) {
  const out = runPowerCheck({ speakers: speakers(), amp: amp(), profile: profile(), mode: 'advanced', ...over })
  if (out.status !== 'ok') throw new Error('expected ok outcome')
  return out
}

describe('PowerResultPanel', () => {
  it('renders an ok outcome: label, caveat, and working rows with trust labels', () => {
    const out = ok()
    render(<PowerResultPanel outcome={out} targetPeakDb={95} distanceM={3} />)
    expect(screen.getAllByText(out.verdict.label).length).toBeGreaterThan(0)
    expect(screen.getByText(out.caveat)).toBeInTheDocument()
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Step', 'Value', 'Source'])
    for (const row of out.working) {
      expect(within(table).getByText(row.step)).toBeInTheDocument()
    }
    expect(within(table).getAllByText('Manufacturer spec').length).toBeGreaterThan(0)
    expect(within(table).getAllByText('Your entry').length).toBeGreaterThan(0)
    expect(within(table).getAllByText('Modeled').length).toBeGreaterThan(0)
    expect(within(table).getByText('Average')).toBeInTheDocument()
    expect(screen.getByText(/At 3 m from the speakers/)).toBeInTheDocument()
    expect(screen.getByText(/No linked reviews for this pairing yet/)).toBeInTheDocument()
  })

  it('renders both reasons and a to-spare headline', () => {
    const out = ok()
    render(<PowerResultPanel outcome={out} targetPeakDb={95} distanceM={3} />)
    for (const r of out.reasons) expect(screen.getByText(r)).toBeInTheDocument()
    expect(screen.getByText(/^About \d+ dB to spare at your seat\./)).toBeInTheDocument()
  })

  it('renders the runs_out headline with the clean-peak range', () => {
    const out = ok({ profile: profile({ target_peak_db: 110 }), amp: amp({ power_w_4ohm: sv(5) }) })
    expect(out.verdict.kind).toBe('runs_out')
    render(<PowerResultPanel outcome={out} targetPeakDb={110} distanceM={3} />)
    const { low, high } = out.verdict.maxCleanPeakDb
    expect(
      screen.getByText(
        new RegExp(`^About \\d+ dB short\\. Clean peaks top out around ${Math.round(low)}–${Math.round(high)} dB at your seat\\.$`)
      )
    ).toBeInTheDocument()
  })

  it('renders a needs outcome without numbers or a meter', () => {
    const outcome: PowerCheckOutcome = {
      status: 'needs',
      missing: [{ id: 'speakers.sensitivity_db', label: 'Speaker sensitivity', hint: 'On the back panel.' }],
      caveat: 'This checks the amp.',
    }
    const { container } = render(<PowerResultPanel outcome={outcome} targetPeakDb={85} distanceM={null} />)
    expect(screen.getByText('No verdict yet')).toBeInTheDocument()
    expect(screen.getByText("We need your speakers' sensitivity.")).toBeInTheDocument()
    expect(screen.getByText('Speaker sensitivity')).toBeInTheDocument()
    expect(screen.getByText('This checks the amp.')).toBeInTheDocument()
    expect(container.textContent).not.toMatch(/\d+ dB to spare/)
    expect(screen.queryByTestId('power-meter')).toBeNull()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('uses a generic headline for other missing inputs', () => {
    const outcome: PowerCheckOutcome = {
      status: 'needs',
      missing: [{ id: 'amp.power_w_8ohm', label: 'Amp power', hint: 'In the specs.' }],
      caveat: 'c',
    }
    render(<PowerResultPanel outcome={outcome} targetPeakDb={85} distanceM={null} />)
    expect(screen.getByText('We need amp power.')).toBeInTheDocument()
  })

  it('hides the meter from assistive tech and repeats its numbers in text', () => {
    const out = ok()
    render(<PowerResultPanel outcome={out} targetPeakDb={95} distanceM={3} />)
    expect(screen.getByTestId('power-meter')).toHaveAttribute('aria-hidden', 'true')
    const { low, high } = out.verdict.maxCleanPeakDb
    expect(
      screen.getByText(`Clean peaks: about ${Math.round(low)}–${Math.round(high)} dB · Your target: 95 dB`)
    ).toBeInTheDocument()
  })

  it('shows assumption chips and the assumed-values note, and reports edits', () => {
    const out = ok({ mode: 'simple', profile: profile({ room: null, acoustics: null, distance_m: null }) })
    const onEdit = vi.fn()
    render(<PowerResultPanel outcome={out} targetPeakDb={95} distanceM={null} onEditAssumption={onEdit} />)
    expect(screen.getByText(/Based on assumed values below\./)).toBeInTheDocument()
    expect(screen.queryByText(/^At .* m from the speakers$/)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Assumed average acoustics\./ }))
    expect(onEdit).toHaveBeenCalledWith('room.acoustics')
  })

  it('explains the worse-case reading when the sensitivity reference is not stated', () => {
    const out = ok({ speakers: speakers({ sensitivity_ref: undefined }) })
    expect(out.sensitivityRange).toBe(true)
    render(<PowerResultPanel outcome={out} targetPeakDb={95} distanceM={3} />)
    expect(screen.getByText('Sensitivity reference not stated, so this shows the worse case.')).toBeInTheDocument()
  })
})
