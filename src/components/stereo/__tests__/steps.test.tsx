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

    const toggle = screen.getByRole('button', { name: 'Change amplifier' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(toggle)
    expect(screen.getByRole('tab', { name: 'Catalog' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: 'Change speakers' })).toHaveAttribute('aria-expanded', 'false')

    await flushCatalog()
    fireEvent.click(screen.getByRole('button', { name: /Yamaha A-S301/ }))
    expect(onChange).toHaveBeenCalledWith('amp', { kind: 'catalog', item: AMP_ITEM })
  })

  it('keeps only one chooser open at a time', () => {
    vi.useFakeTimers()
    stubCatalog([])
    render(<GearStep speakers={null} amp={null} ampNote={null} missing={[]} onChange={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'Change amplifier' }))
    fireEvent.click(screen.getByRole('button', { name: 'Change speakers' }))
    expect(screen.getAllByRole('tablist')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Change amplifier' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'Done' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('shows the amp note on the amp tile', () => {
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
    expect(screen.getByText('50 W into 8 Ω')).toBeInTheDocument()
    expect(screen.getByText('87 dB · 4 Ω')).toBeInTheDocument()
  })

  const sensitivityMissing: MissingInput[] = [
    { id: 'speakers.sensitivity_db', label: 'Speaker sensitivity', hint: 'Usually on the back panel.' },
  ]
  const noSensitivity: GearPick = {
    kind: 'catalog',
    item: { ...SPK_ITEM, specs: { nominal_impedance_ohms: claimed(8) } },
  }

  it('asks for a missing sensitivity with one input and stores it as a user value', () => {
    const onChange = vi.fn()
    render(
      <GearStep speakers={noSensitivity} amp={null} ampNote={null} missing={sensitivityMissing} onChange={onChange} />,
    )
    expect(screen.getByText("We need your speakers' sensitivity.")).toBeInTheDocument()
    expect(screen.getByText("It changes the answer by several dB, so we won't guess it.")).toBeInTheDocument()
    expect(screen.getByText('Usually on the back panel.')).toBeInTheDocument()
    expect(screen.getAllByRole('textbox')).toHaveLength(1)

    fireEvent.change(screen.getByRole('textbox'), { target: { value: '87' } })
    fireEvent.click(screen.getByRole('radio', { name: '1 W / 1 m' }))
    fireEvent.click(screen.getByRole('button', { name: 'Run the check' }))

    expect(onChange).toHaveBeenCalledTimes(1)
    const [role, pick] = onChange.mock.calls[0]
    expect(role).toBe('speakers')
    expect(pick.kind).toBe('catalog')
    expect(pick.item.specs.sensitivity_db).toEqual({ value: 87, trust: 'user', source_url: null })
    expect(pick.item.specs.sensitivity_ref).toEqual({ value: '1W', trust: 'user', source_url: null })
    // the catalog's own values keep their trust
    expect(pick.item.specs.nominal_impedance_ohms).toEqual(claimed(8))
  })

  it('defaults the sensitivity reference to unknown and accepts a decimal comma', () => {
    const onChange = vi.fn()
    render(
      <GearStep speakers={noSensitivity} amp={null} ampNote={null} missing={sensitivityMissing} onChange={onChange} />,
    )
    fireEvent.change(screen.getByRole('textbox'), { target: { value: ' 88,5 ' } })
    fireEvent.click(screen.getByRole('button', { name: 'Run the check' }))
    const specs = onChange.mock.calls[0][1].item.specs
    expect(specs.sensitivity_db.value).toBe(88.5)
    expect(specs.sensitivity_ref).toEqual({ value: 'unknown', trust: 'user', source_url: null })
  })

  it('does not submit a non-numeric or out-of-range sensitivity', () => {
    const onChange = vi.fn()
    render(
      <GearStep speakers={noSensitivity} amp={null} ampNote={null} missing={sensitivityMissing} onChange={onChange} />,
    )
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'loud' } })
    fireEvent.click(screen.getByRole('button', { name: 'Run the check' }))
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '300' } })
    fireEvent.click(screen.getByRole('button', { name: 'Run the check' }))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('asks for amp power with the rating radios and merges into a custom pick', () => {
    const onChange = vi.fn()
    const customAmp: GearPick = { kind: 'custom', brand: 'Marantz', name: '2270', specs: {} }
    render(
      <GearStep
        speakers={null}
        amp={customAmp}
        ampNote={null}
        missing={[{ id: 'amp.power_w_8ohm', label: 'Amp power', hint: 'In the specs.' }]}
        onChange={onChange}
      />,
    )
    expect(screen.getByText('In the specs.')).toBeInTheDocument()
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '70' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Peak / max' }))
    fireEvent.click(screen.getByRole('button', { name: 'Run the check' }))
    const [role, pick] = onChange.mock.calls[0]
    expect(role).toBe('amp')
    expect(pick.kind).toBe('custom')
    expect(pick.specs.power_w_8ohm).toEqual({ value: 70, trust: 'user', source_url: null })
    expect(pick.specs.power_rating).toEqual({ kind: 'peak' })
  })

  it('asks for impedance with a 4/6/8/16 choice', () => {
    const onChange = vi.fn()
    render(
      <GearStep
        speakers={{ kind: 'catalog', item: { ...SPK_ITEM, specs: { sensitivity_db: claimed(90) } } }}
        amp={null}
        ampNote={null}
        missing={[{ id: 'speakers.nominal_impedance_ohms', label: 'Speaker impedance', hint: 'Back panel.' }]}
        onChange={onChange}
      />,
    )
    for (const ohms of ['4 Ω', '6 Ω', '8 Ω', '16 Ω']) {
      expect(screen.getByRole('radio', { name: ohms })).toBeInTheDocument()
    }
    fireEvent.click(screen.getByRole('radio', { name: '6 Ω' }))
    fireEvent.click(screen.getByRole('button', { name: 'Run the check' }))
    expect(onChange.mock.calls[0][1].item.specs.nominal_impedance_ohms).toEqual({
      value: 6,
      trust: 'user',
      source_url: null,
    })
  })
})

describe('GearChooser', () => {
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
