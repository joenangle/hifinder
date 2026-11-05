import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import { useState } from 'react'
import { GearStep, type GearPick } from '../GearStep'
import { GearChooser } from '../GearChooser'
import { RoomStep } from '../RoomStep'
import { LoudnessSlider } from '../LoudnessSlider'
import type { SpeakerAmpSpecs, SpeakerSpecs, StereoCatalogItem, SystemProfile } from '@/lib/stereo/specs'
import type { MissingInput } from '@/lib/stereo/power-check'

const claimed = <T,>(value: T) => ({ value, trust: 'claimed' as const })

const AMP_ITEM: StereoCatalogItem = {
  id: 'amp-1',
  brand: 'Yamaha',
  name: 'A-S301',
  category: 'speaker_amp',
  specs: { power_w_8ohm: claimed(50) } satisfies SpeakerAmpSpecs,
}
const SPK_ITEM: StereoCatalogItem = {
  id: 'spk-1',
  brand: 'KEF',
  name: 'Q150',
  category: 'speakers',
  specs: {
    sensitivity_db: claimed(87),
    sensitivity_ref: claimed('2.83V' as const),
    nominal_impedance_ohms: claimed(4),
  } satisfies SpeakerSpecs,
}

const profile = (over: Partial<SystemProfile> = {}): SystemProfile => ({
  room: { length_m: 5, width_m: 4, height_m: 2.6 },
  room_preset: 'living_room',
  acoustics: 'average',
  distance_m: 3,
  near_wall: null,
  target_peak_db: 85,
  ...over,
})

function stubCatalog(items: StereoCatalogItem[]) {
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items }) })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  localStorage.clear()
})

async function flushCatalog() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(260)
  })
}

describe('GearStep', () => {
  it('opens the chooser on the Catalog tab and reports a picked amp', async () => {
    vi.useFakeTimers()
    stubCatalog([AMP_ITEM])
    const onChange = vi.fn()
    render(<GearStep speakers={null} amp={null} ampNote={null} missing={[]} onChange={onChange} />)

    const toggle = screen.getByRole('button', { name: 'Browse amplifiers' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)
    expect(screen.getByRole('tab', { name: 'Catalog' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: 'Browse speakers' })).toHaveAttribute('aria-expanded', 'false')

    await flushCatalog()
    fireEvent.click(screen.getByRole('button', { name: /Yamaha A-S301/ }))
    expect(onChange).toHaveBeenCalledWith('amp', { kind: 'catalog', item: AMP_ITEM })
  })

  it('keeps only one chooser open at a time', () => {
    vi.useFakeTimers()
    stubCatalog([])
    render(<GearStep speakers={null} amp={null} ampNote={null} missing={[]} onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Browse amplifiers' }))
    fireEvent.click(screen.getByRole('button', { name: 'Browse speakers' }))
    expect(screen.getAllByRole('tablist')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Browse amplifiers' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'Done' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('leads an empty tile with how many it can browse, and a filled tile with changing it', () => {
    render(
      <GearStep
        speakers={{ kind: 'catalog', item: SPK_ITEM }}
        amp={null}
        ampNote={null}
        catalogCounts={{ amp: 18, speakers: 21 }}
        missing={[]}
        onChange={vi.fn()}
      />,
    )
    const browse = screen.getByRole('button', { name: 'Browse 18 amplifiers' })
    const power = screen.getByLabelText('Power into 8 Ω (W per channel)')
    // the catalog comes before the fields, as the easy path
    expect(browse.compareDocumentPosition(power) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Change speakers' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Browse .*speakers/ })).not.toBeInTheDocument()
  })

  it('still offers the catalog when the count is unavailable', () => {
    render(
      <GearStep
        speakers={null}
        amp={null}
        ampNote={null}
        catalogCounts={{ amp: null, speakers: 0 }}
        missing={[]}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByRole('button', { name: 'Browse amplifiers' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Browse speakers' })).toBeInTheDocument()
  })

  /** GearStep is controlled; this keeps its picks in state so edits round-trip like on the page. */
  function GearHarness({
    amp = null,
    speakers = null,
    missing = [],
    spy,
  }: {
    amp?: GearPick | null
    speakers?: GearPick | null
    missing?: MissingInput[]
    spy?: (role: string, pick: GearPick) => void
  }) {
    const [a, setA] = useState(amp)
    const [s, setS] = useState(speakers)
    return (
      <GearStep
        amp={a}
        speakers={s}
        ampNote={null}
        missing={missing}
        onChange={(role, pick) => {
          spy?.(role, pick)
          if (role === 'amp') setA(pick)
          else setS(pick)
        }}
      />
    )
  }

  it('shows catalog specs as live fields with where each number came from', () => {
    render(
      <GearStep
        speakers={{ kind: 'catalog', item: SPK_ITEM }}
        amp={{ kind: 'catalog', item: AMP_ITEM }}
        ampNote="Sized for your headphones"
        missing={[]}
        onChange={vi.fn()}
      />,
    )
    expect(screen.getByText('Sized for your headphones')).toBeInTheDocument()
    expect(screen.getByLabelText('Power into 8 Ω (W per channel)')).toHaveValue('50')
    expect(screen.getByLabelText('Sensitivity (dB)')).toHaveValue('87')
    expect(screen.getByLabelText('Impedance (Ω)')).toHaveValue('4')
    expect(screen.getAllByText('Manufacturer spec').length).toBeGreaterThan(0)
    expect(screen.queryByRole('button', { name: /Reset/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Edit specs' })).not.toBeInTheDocument()
  })

  it('explains an in-room sensitivity rating under the sensitivity field', () => {
    const klipsch: GearPick = {
      kind: 'catalog',
      item: {
        ...SPK_ITEM,
        brand: 'Klipsch',
        name: 'Heresy III',
        specs: { ...SPK_ITEM.specs, sensitivity_in_room: claimed(true) },
      },
    }
    render(<GearStep speakers={klipsch} amp={null} ampNote={null} missing={[]} onChange={vi.fn()} />)
    expect(screen.getByLabelText('Sensitivity (dB)')).toHaveAccessibleDescription(
      /Klipsch quotes this in a listening room, so it already includes room reinforcement\. We take out about 3 dB/,
    )
  })

  it('shows no room disclaimer for ordinary speakers', () => {
    render(<GearStep speakers={{ kind: 'catalog', item: SPK_ITEM }} amp={null} ampNote={null} missing={[]} onChange={vi.fn()} />)
    expect(screen.queryByText(/quotes this in a listening room/)).not.toBeInTheDocument()
  })

  it('applies a new amp power as it is typed, keeps the name, and can reset to the catalog', () => {
    const spy = vi.fn()
    render(<GearHarness amp={{ kind: 'catalog', item: AMP_ITEM }} spy={spy} />)
    const power = screen.getByLabelText('Power into 8 Ω (W per channel)')
    power.focus()
    fireEvent.change(power, { target: { value: '2' } })

    const [role, pick] = spy.mock.calls.at(-1)!
    expect(role).toBe('amp')
    expect(pick.item.name).toBe('A-S301')
    expect(pick.item.specs.power_w_8ohm).toEqual({ value: 2, trust: 'user', source_url: null })
    // still the same input, still focused: typing is not interrupted by the update
    expect(screen.getByLabelText('Power into 8 Ω (W per channel)')).toBe(power)
    expect(document.activeElement).toBe(power)
    expect(screen.getByText(/Your entry/)).toBeInTheDocument()

    fireEvent.blur(power)
    fireEvent.click(screen.getByRole('button', { name: 'Reset to 50' }))
    expect(spy.mock.calls.at(-1)![1].item.specs.power_w_8ohm).toEqual(claimed(50))
    expect(screen.getByLabelText('Power into 8 Ω (W per channel)')).toHaveValue('50')
  })

  it('creates hand-entered gear from an empty tile on the first typed value', () => {
    const spy = vi.fn()
    render(<GearHarness spy={spy} />)
    const power = screen.getByLabelText('Power into 8 Ω (W per channel)')
    power.focus()
    fireEvent.change(power, { target: { value: '5' } })
    expect(spy).toHaveBeenLastCalledWith('amp', {
      kind: 'custom',
      brand: '',
      name: 'Your amplifier',
      specs: { power_w_8ohm: { value: 5, trust: 'user', source_url: null } },
    })
    expect(screen.getByText('Your amplifier')).toBeInTheDocument()
    expect(document.activeElement).toBe(screen.getByLabelText('Power into 8 Ω (W per channel)'))
  })

  it('highlights a missing value with its hint instead of a separate prompt', () => {
    const missing: MissingInput[] = [
      { id: 'speakers.sensitivity_db', label: 'Speaker sensitivity', hint: 'Usually on the back panel.' },
    ]
    const noSensitivity: GearPick = {
      kind: 'catalog',
      item: { ...SPK_ITEM, specs: { nominal_impedance_ohms: claimed(8) } },
    }
    render(<GearStep speakers={noSensitivity} amp={null} ampNote={null} missing={missing} onChange={vi.fn()} />)
    expect(screen.getByText('We need speaker sensitivity.')).toBeInTheDocument()
    expect(screen.getByLabelText('Sensitivity (dB)')).toHaveAccessibleDescription('Usually on the back panel.')
    expect(screen.queryByRole('button', { name: /Show the verdict|Save/ })).not.toBeInTheDocument()
  })

  it('stores a typed sensitivity as a user value, accepting a decimal comma and skipping junk', () => {
    const spy = vi.fn()
    const noSensitivity: GearPick = {
      kind: 'catalog',
      item: { ...SPK_ITEM, specs: { nominal_impedance_ohms: claimed(8) } },
    }
    render(<GearHarness speakers={noSensitivity} spy={spy} />)
    const field = screen.getByLabelText('Sensitivity (dB)')
    fireEvent.change(field, { target: { value: 'loud' } })
    fireEvent.change(field, { target: { value: '300' } })
    expect(spy).not.toHaveBeenCalled()

    fireEvent.change(field, { target: { value: ' 88,5 ' } })
    const specs = spy.mock.calls.at(-1)![1].item.specs
    expect(specs.sensitivity_db).toEqual({ value: 88.5, trust: 'user', source_url: null })
    // the catalog's own values keep their trust
    expect(specs.nominal_impedance_ohms).toEqual(claimed(8))

    fireEvent.change(screen.getByLabelText('Measured at'), { target: { value: '1W' } })
    expect(spy.mock.calls.at(-1)![1].item.specs.sensitivity_ref).toEqual({
      value: '1W',
      trust: 'user',
      source_url: null,
    })
  })

  it('offers 4/6/8/16 for impedance and stores the choice as a user value', () => {
    const spy = vi.fn()
    const noImpedance: GearPick = { kind: 'catalog', item: { ...SPK_ITEM, specs: { sensitivity_db: claimed(90) } } }
    render(<GearHarness speakers={noImpedance} spy={spy} />)
    const select = screen.getByLabelText('Impedance (Ω)')
    expect(within(select).getAllByRole('option').map((o) => o.textContent)).toEqual([
      'Choose one',
      '4',
      '6',
      '8',
      '16',
    ])
    fireEvent.change(select, { target: { value: '6' } })
    expect(spy.mock.calls.at(-1)![1].item.specs.nominal_impedance_ohms).toEqual({
      value: 6,
      trust: 'user',
      source_url: null,
    })
  })

  it('sets the rating kind and lets hand-entered gear drop its optional 4 Ω figure', () => {
    const spy = vi.fn()
    const ampSpecs: SpeakerAmpSpecs = {
      power_w_8ohm: { value: 5, trust: 'user', source_url: null },
      power_w_4ohm: { value: 8, trust: 'user', source_url: null },
    }
    const custom: GearPick = { kind: 'custom', brand: 'Marantz', name: '2270', specs: ampSpecs }
    render(<GearHarness amp={custom} spy={spy} />)

    fireEvent.change(screen.getByLabelText('Kind of rating'), { target: { value: 'peak' } })
    expect(spy.mock.calls.at(-1)![1].specs.power_rating).toEqual({ kind: 'peak' })

    fireEvent.change(screen.getByLabelText('Power into 4 Ω, if listed'), { target: { value: '' } })
    const last = spy.mock.calls.at(-1)![1]
    expect(last.name).toBe('2270')
    expect(last.specs.power_w_4ohm).toBeUndefined()
    expect(last.specs.power_w_8ohm).toEqual(ampSpecs.power_w_8ohm)
  })
})

describe('GearChooser', () => {
  it('lists the catalog by brand with a count before anything is typed', async () => {
    vi.useFakeTimers()
    const second: StereoCatalogItem = { ...AMP_ITEM, id: 'amp-2', name: 'A-S501' }
    const other: StereoCatalogItem = { ...AMP_ITEM, id: 'amp-3', brand: 'Zeta', name: 'Z1' }
    stubCatalog([AMP_ITEM, second, other])
    render(<GearChooser role="amp" current={null} onPick={vi.fn()} onClose={vi.fn()} />)
    await flushCatalog()

    expect(screen.getByText('3 amplifiers with specs on file. Pick yours from the list, or search.')).toBeInTheDocument()
    const yamaha = screen.getByRole('region', { name: 'Yamaha' })
    expect(within(yamaha).getAllByRole('button').map((b) => b.textContent)).toEqual([
      expect.stringContaining('A-S301'),
      expect.stringContaining('A-S501'),
    ])
    expect(within(screen.getByRole('region', { name: 'Zeta' })).getByRole('button', { name: /Zeta Z1/ })).toBeInTheDocument()

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'yam' } })
    expect(screen.queryByText(/with specs on file/)).not.toBeInTheDocument()
  })

  it('debounces catalog search by 250 ms and shows a spec line per result', async () => {
    vi.useFakeTimers()
    const fetchMock = stubCatalog([SPK_ITEM])
    render(<GearChooser role="speakers" current={null} onPick={vi.fn()} onClose={vi.fn()} />)
    await flushCatalog()
    fetchMock.mockClear()

    const search = screen.getByRole('searchbox')
    fireEvent.change(search, { target: { value: 'k' } })
    fireEvent.change(search, { target: { value: 'kef q' } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200)
    })
    expect(fetchMock).not.toHaveBeenCalled()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60)
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0][0]).toBe('/api/stereo-catalog?role=speakers&q=kef%20q')
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    const result = screen.getByRole('button', { name: /KEF Q150/ })
    expect(within(result).getByText('87 dB · 4 Ω')).toBeInTheDocument()
  })

  it('shows empty and error states', async () => {
    vi.useFakeTimers()
    stubCatalog([])
    const { unmount } = render(<GearChooser role="amp" current={null} onPick={vi.fn()} onClose={vi.fn()} />)
    expect(screen.getByText('Loading...')).toBeInTheDocument()
    await flushCatalog()
    expect(screen.getByText('No matches. Try fewer words, or enter it yourself.')).toBeInTheDocument()
    unmount()

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, json: async () => ({}) }))
    render(<GearChooser role="amp" current={null} onPick={vi.fn()} onClose={vi.fn()} />)
    await flushCatalog()
    expect(screen.getByRole('alert')).toHaveTextContent(/couldn.t load/i)
    expect(errorSpy).toHaveBeenCalled()
    errorSpy.mockRestore()
  })

  it('manual speakers: blank fields are allowed and only filled ones are submitted', () => {
    const onPick = vi.fn()
    render(<GearChooser role="speakers" current={null} onPick={onPick} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Enter it yourself' }))
    expect(screen.getByText(/Leave anything blank you don't know/)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'Mystery 2' } })
    fireEvent.click(screen.getByRole('button', { name: 'Use these values' }))

    expect(onPick).toHaveBeenCalledWith({ kind: 'custom', brand: '', name: 'Mystery 2', specs: {} })
  })

  it('manual speakers: requires a model and stamps filled values as user entries', () => {
    const onPick = vi.fn()
    render(<GearChooser role="speakers" current={null} onPick={onPick} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Enter it yourself' }))
    fireEvent.click(screen.getByRole('button', { name: 'Use these values' }))
    expect(onPick).not.toHaveBeenCalled()

    fireEvent.change(screen.getByLabelText('Brand'), { target: { value: 'Klipsch' } })
    fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'RP-600M' } })
    fireEvent.change(screen.getByLabelText(/Sensitivity/), { target: { value: '96' } })
    fireEvent.click(screen.getByRole('radio', { name: '2.83 V / 1 m' }))
    fireEvent.change(screen.getByLabelText(/Nominal impedance/), { target: { value: '8' } })
    fireEvent.click(screen.getByRole('button', { name: 'Use these values' }))

    const user = (value: unknown) => ({ value, trust: 'user', source_url: null })
    expect(onPick).toHaveBeenCalledWith({
      kind: 'custom',
      brand: 'Klipsch',
      name: 'RP-600M',
      specs: {
        sensitivity_db: user(96),
        sensitivity_ref: user('2.83V'),
        nominal_impedance_ohms: user(8),
      },
    })
  })

  it('manual speakers: leaves out out-of-range values and "Not sure" impedance', () => {
    const onPick = vi.fn()
    render(<GearChooser role="speakers" current={null} onPick={onPick} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Enter it yourself' }))
    fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'X' } })
    fireEvent.change(screen.getByLabelText(/Sensitivity/), { target: { value: '9000' } })
    fireEvent.click(screen.getByRole('button', { name: 'Use these values' }))
    expect(onPick.mock.calls[0][0].specs).toEqual({})
  })

  it('manual amp: maps the rating radios and 4 ohm power', () => {
    const onPick = vi.fn()
    render(<GearChooser role="amp" current={null} onPick={onPick} onClose={vi.fn()} />)
    fireEvent.click(screen.getByRole('tab', { name: 'Enter it yourself' }))
    fireEvent.change(screen.getByLabelText('Model'), { target: { value: 'SA-100' } })
    fireEvent.change(screen.getByLabelText(/Power into 8/), { target: { value: '35' } })
    fireEvent.change(screen.getByLabelText(/Power into 4/), { target: { value: '3,5' } })
    fireEvent.click(screen.getByRole('radio', { name: 'RMS / continuous' }))
    fireEvent.click(screen.getByRole('button', { name: 'Use these values' }))
    const user = (value: unknown) => ({ value, trust: 'user', source_url: null })
    expect(onPick).toHaveBeenCalledWith({
      kind: 'custom',
      brand: '',
      name: 'SA-100',
      specs: { power_w_8ohm: user(35), power_w_4ohm: user(3.5), power_rating: { kind: 'continuous' } },
    })
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(<GearChooser role="amp" current={null} onPick={vi.fn()} onClose={onClose} />)
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalled()
  })
})

describe('RoomStep', () => {
  it('is expanded by default and keeps the distance input after collapsing', () => {
    render(<RoomStep profile={profile()} onChange={vi.fn()} />)
    const toggle = screen.getByRole('button', { name: 'Collapse' })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByLabelText('Length (m)')).toBeInTheDocument()
    expect(screen.getByLabelText(/Listening distance/)).toBeInTheDocument()

    fireEvent.click(toggle)
    expect(screen.queryByLabelText('Length (m)')).not.toBeInTheDocument()
    expect(screen.getByLabelText(/Listening distance/)).toBeInTheDocument()
    expect(screen.getByText('5 × 4 × 2.6 m · Average acoustics')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Edit room' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('emits the full profile on a preset, a dimension, acoustics, wall and distance change', () => {
    const onChange = vi.fn()
    const p = profile()
    render(<RoomStep profile={p} onChange={onChange} />)

    fireEvent.click(screen.getByRole('button', { name: 'Small bedroom' }))
    expect(onChange).toHaveBeenLastCalledWith({
      ...p,
      room: { length_m: 3.5, width_m: 3, height_m: 2.4 },
      room_preset: 'small_bedroom',
    })

    fireEvent.change(screen.getByLabelText('Length (m)'), { target: { value: '6,5' } })
    expect(onChange).toHaveBeenLastCalledWith({
      ...p,
      room: { length_m: 6.5, width_m: 4, height_m: 2.6 },
      room_preset: null,
    })

    fireEvent.change(screen.getByLabelText(/How the room sounds/), { target: { value: 'damped' } })
    expect(onChange).toHaveBeenLastCalledWith({ ...p, acoustics: 'damped' })

    fireEvent.click(screen.getByRole('checkbox', { name: /near a wall/i }))
    expect(onChange).toHaveBeenLastCalledWith({ ...p, near_wall: true })

    fireEvent.change(screen.getByLabelText(/Listening distance/), { target: { value: '2.5' } })
    expect(onChange).toHaveBeenLastCalledWith({ ...p, distance_m: 2.5 })
  })

  it('lets a room be typed from scratch when the profile has none', () => {
    const onChange = vi.fn()
    const p = profile({ room: null, room_preset: null })
    render(<RoomStep profile={p} onChange={onChange} />)
    expect(screen.getByLabelText('Length (m)')).toHaveAttribute('placeholder', '5')

    fireEvent.change(screen.getByLabelText('Length (m)'), { target: { value: '4' } })
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.getByLabelText('Length (m)')).toHaveValue('4')

    fireEvent.change(screen.getByLabelText('Width (m)'), { target: { value: '3' } })
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.change(screen.getByLabelText('Height (m)'), { target: { value: '2.5' } })
    expect(onChange).toHaveBeenLastCalledWith({
      ...p,
      room: { length_m: 4, width_m: 3, height_m: 2.5 },
      room_preset: null,
    })
  })

  it('switches room size and distance to feet while emitting meters', () => {
    const onChange = vi.fn()
    const p = profile()
    render(<RoomStep profile={p} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'ft' }))

    expect(screen.getByRole('button', { name: 'ft' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Length (ft)')).toHaveValue('16.4')
    expect(screen.getByLabelText('Listening distance in feet')).toHaveValue('9.84')

    fireEvent.change(screen.getByLabelText('Length (ft)'), { target: { value: '20' } })
    expect(onChange).toHaveBeenLastCalledWith({
      ...p,
      room: { length_m: 20 * 0.3048, width_m: 4, height_m: 2.6 },
      room_preset: null,
    })
    fireEvent.change(screen.getByLabelText('Listening distance in feet'), { target: { value: '10' } })
    expect(onChange).toHaveBeenLastCalledWith({ ...p, distance_m: 10 * 0.3048 })

    fireEvent.click(screen.getByRole('button', { name: 'Collapse' }))
    expect(screen.getByText('16.4 × 13.1 × 8.5 ft · Average acoustics')).toBeInTheDocument()
  })

  it('remembers the unit and rejects feet values outside the meter range', () => {
    const onChange = vi.fn()
    const { unmount } = render(<RoomStep profile={profile()} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: 'ft' }))
    unmount()

    render(<RoomStep profile={profile()} onChange={onChange} />)
    expect(screen.getByLabelText('Width (ft)')).toBeInTheDocument()
    // 3 ft is 0.91 m, under the 1.5 m minimum room dimension
    fireEvent.change(screen.getByLabelText('Width (ft)'), { target: { value: '3' } })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('never emits NaN or out-of-range values', () => {
    const onChange = vi.fn()
    render(<RoomStep profile={profile()} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Length (m)'), { target: { value: 'abc' } })
    fireEvent.change(screen.getByLabelText('Width (m)'), { target: { value: '500' } })
    fireEvent.change(screen.getByLabelText(/Listening distance/), { target: { value: '0.01' } })
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('LoudnessSlider', () => {
  function Harness({ start = 85 }: { start?: number }) {
    const [db, setDb] = useState(start)
    return <LoudnessSlider valueDb={db} onChange={setDb} />
  }

  it('exposes a 60-110 range and shows the tier for the chosen level', () => {
    render(<Harness />)
    const range = screen.getByRole('slider')
    expect(range).toHaveAttribute('min', '60')
    expect(range).toHaveAttribute('max', '110')
    expect(range).toHaveAttribute('step', '1')
    expect(screen.getByText('Normal')).toBeInTheDocument()

    fireEvent.change(range, { target: { value: '105' } })
    expect(screen.getByText('Club')).toBeInTheDocument()
    expect(screen.getByText('Party or club level, rare at home')).toBeInTheDocument()
  })

  it('renders ticks and the log-scale note', () => {
    render(<Harness />)
    for (const t of ['65', '75', '85', '95', '105']) expect(screen.getByText(t)).toBeInTheDocument()
    expect(
      screen.getByText(
        'dB is a log scale: every +10 dB sounds about twice as loud, and takes 10× the amp power. Equal steps on this slider are not equal steps in watts.',
      ),
    ).toBeInTheDocument()
  })

  it('keeps a typed loudness a whole number', () => {
    const onChange = vi.fn()
    render(<LoudnessSlider valueDb={85} onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Peak loudness at your seat, in dB'), { target: { value: '95.4' } })
    expect(onChange).toHaveBeenLastCalledWith(95)
  })

  it('lets the number be typed and clamps it on blur', () => {
    const onChange = vi.fn()
    render(<LoudnessSlider valueDb={85} onChange={onChange} />)
    const number = screen.getByLabelText('Peak loudness at your seat, in dB')
    fireEvent.change(number, { target: { value: '95' } })
    expect(onChange).toHaveBeenLastCalledWith(95)
    fireEvent.change(number, { target: { value: '150' } })
    fireEvent.blur(number)
    expect(onChange).toHaveBeenLastCalledWith(110)
    fireEvent.change(number, { target: { value: '12' } })
    fireEvent.blur(number)
    expect(onChange).toHaveBeenLastCalledWith(60)
  })
})
