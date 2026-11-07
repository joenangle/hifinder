import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import { NuqsTestingAdapter } from 'nuqs/adapters/testing'
import type { ReactNode } from 'react'
import type { SpeakerAmpSpecs, SpeakerSpecs, StereoCatalogItem } from '@/lib/stereo/specs'

const mocks = vi.hoisted(() => ({
  useSession: vi.fn(),
  signIn: vi.fn(),
  trackEvent: vi.fn(),
}))

vi.mock('next-auth/react', () => ({ useSession: mocks.useSession, signIn: mocks.signIn }))
vi.mock('@/lib/analytics', () => ({ trackEvent: mocks.trackEvent }))

import { StereoBuilder } from '../StereoBuilder'

const SPK_ID = '3f1c2a9e-5b7d-4e21-9a0c-8d6f4b2e1a77'
const AMP_ID = '9b2d7c10-1e44-4c8a-a3f5-52d0e6a1b8c3'
const claimed = <T,>(value: T) => ({ value, trust: 'claimed' as const })

const SPEAKERS: SpeakerSpecs = {
  sensitivity_db: claimed(87),
  sensitivity_ref: claimed('2.83V' as const),
  nominal_impedance_ohms: claimed(4),
}
const AMP: SpeakerAmpSpecs = { power_w_4ohm: claimed(80), power_rating: { kind: 'continuous' } }

const item = (id: string, category: 'speakers' | 'speaker_amp', name: string, specs: StereoCatalogItem['specs']) =>
  ({ id, brand: 'Test', name, category, specs }) satisfies StereoCatalogItem

const speakerItem = (specs: SpeakerSpecs = SPEAKERS) => item(SPK_ID, 'speakers', 'Bookshelf', specs)
const ampItem = () => item(AMP_ID, 'speaker_amp', 'Integrated', AMP)

type Handler = (url: string, init?: RequestInit) => unknown

/** Routes fetch by URL; every call is recorded for assertions. */
function stubFetch(handlers: Record<string, Handler>) {
  const fn = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = `${init?.method ?? 'GET'} ${String(input)}`
    const match = Object.keys(handlers).find((k) => request.startsWith(k))
    if (!match) throw new Error(`Unexpected fetch: ${request}`)
    const result = handlers[match](String(input), init)
    if (result instanceof Error) return { ok: false, status: 500, json: async () => ({}) }
    return { ok: true, status: 200, json: async () => result }
  })
  vi.stubGlobal('fetch', fn)
  return fn
}

const catalogHandlers = (spk: StereoCatalogItem = speakerItem()): Record<string, Handler> => ({
  [`GET /api/stereo-catalog?role=speakers&id=${SPK_ID}`]: () => ({ items: [spk] }),
  [`GET /api/stereo-catalog?role=amp&id=${AMP_ID}`]: () => ({ items: [ampItem()] }),
})

function renderBuilder(search: string, wrap: (children: ReactNode) => ReactNode = (c) => c) {
  return render(
    <NuqsTestingAdapter searchParams={search} hasMemory>
      {wrap(<StereoBuilder />)}
    </NuqsTestingAdapter>,
  )
}

const signedOut = () => mocks.useSession.mockReturnValue({ data: null, status: 'unauthenticated' })
const signedIn = () =>
  mocks.useSession.mockReturnValue({ data: { user: { id: 'u1', email: 'a@b.c' } }, status: 'authenticated' })

beforeEach(() => {
  vi.clearAllMocks()
  signedOut()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('StereoBuilder (anonymous, URL state)', () => {
  it('shows the verdict for catalog gear from the URL at 95 dB', async () => {
    stubFetch(catalogHandlers())
    renderBuilder(`spk=${SPK_ID}&amp=${AMP_ID}&db=95`)

    expect(await screen.findByText('Comfortable')).toBeTruthy()
    expect(screen.getByText('About 11 dB to spare at your seat.')).toBeTruthy()
    expect(screen.getByText('Test Bookshelf')).toBeTruthy()
  })

  it('shows "No verdict yet" when the speaker has no sensitivity', async () => {
    const { sensitivity_db: _omit, ...withoutSensitivity } = SPEAKERS
    stubFetch(catalogHandlers(speakerItem(withoutSensitivity)))
    renderBuilder(`spk=${SPK_ID}&amp=${AMP_ID}&db=95`)

    expect(await screen.findByText('No verdict yet')).toBeTruthy()
    expect(screen.queryByText('Comfortable')).toBeNull()
  })

  it('restores hand-entered gear from sx/ax with generic names', async () => {
    stubFetch({})
    const sx = encodeURIComponent(JSON.stringify({ sensitivity_db: { value: 87 }, nominal_impedance_ohms: { value: 4 } }))
    const ax = encodeURIComponent(JSON.stringify({ power_w_4ohm: { value: 80 }, power_rating: { kind: 'continuous' } }))
    renderBuilder(`sx=${sx}&ax=${ax}&db=95`)

    expect(await screen.findByText('Comfortable')).toBeTruthy()
    expect(screen.getByText('Your speakers')).toBeTruthy()
    expect(screen.getByText('Your amplifier')).toBeTruthy()
  })

  it('runs in simple mode: nothing in the room is required and gaps show as assumptions', async () => {
    stubFetch(catalogHandlers())
    renderBuilder(`spk=${SPK_ID}&amp=${AMP_ID}&db=95`)
    await screen.findByText('Comfortable')

    expect(screen.getByText(/Assumed a medium living room/)).toBeTruthy()
    expect(screen.getByText(/Assumed you sit about 3 m/)).toBeTruthy()

    // Entering a distance keeps the verdict and removes just that assumption.
    fireEvent.change(screen.getByLabelText('Listening distance in meters'), { target: { value: '2' } })
    await waitFor(() => expect(screen.queryByText(/Assumed you sit about 3 m/)).toBeNull())
    expect(screen.getByText(/to spare at your seat/)).toBeTruthy()
    expect(screen.queryByText('No verdict yet')).toBeNull()
  })

  it('when signed out, Save system calls signIn with a callbackUrl back to this page', async () => {
    stubFetch(catalogHandlers())
    renderBuilder(`spk=${SPK_ID}&amp=${AMP_ID}`)
    await screen.findByText('Test Bookshelf')

    fireEvent.click(screen.getByRole('button', { name: 'Save system' }))

    expect(mocks.signIn).toHaveBeenCalledWith(undefined, { callbackUrl: window.location.href })
  })

  it('copies the current link', async () => {
    stubFetch(catalogHandlers())
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal('navigator', { ...navigator, clipboard: { writeText } })
    renderBuilder(`spk=${SPK_ID}&amp=${AMP_ID}`)
    await screen.findByText('Test Bookshelf')

    fireEvent.click(screen.getByRole('button', { name: 'Copy link' }))

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(window.location.href))
    expect(await screen.findByText('Link copied.')).toBeTruthy()
  })

  it('clicking an assumption chip focuses the matching input', async () => {
    stubFetch(catalogHandlers())
    renderBuilder(`spk=${SPK_ID}&amp=${AMP_ID}`)
    await screen.findByText(/Assumed you sit about 3 m/)

    fireEvent.click(screen.getByRole('button', { name: /Assumed you sit about 3 m/ }))
    expect(document.activeElement).toBe(screen.getByLabelText('Listening distance in meters'))

    fireEvent.click(screen.getByRole('button', { name: /Assumed average acoustics/ }))
    expect(document.activeElement?.id).toBe('stereo-acoustics')

    // Collapse the room, then ask for its size: the step reopens and the field gets focus.
    fireEvent.click(screen.getByRole('button', { name: 'Collapse' }))
    expect(document.getElementById('stereo-room-length')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: /Assumed a medium living room/ }))
    expect(document.activeElement?.id).toBe('stereo-room-length')
  })

  it('emits stereo_verdict_shown only when the verdict kind or assumed flag changes', async () => {
    stubFetch(catalogHandlers())
    renderBuilder(`spk=${SPK_ID}&amp=${AMP_ID}&db=95`)
    await screen.findByText('Comfortable')

    const shown = () => mocks.trackEvent.mock.calls.map(([e]) => e).filter((e) => e.name === 'stereo_verdict_shown')
    // The event is sent from a passive effect, which can run after the text is
    // already in the DOM, so wait for it rather than asserting at once.
    await waitFor(() =>
      expect(shown()).toEqual([
        { name: 'stereo_verdict_shown', properties: { verdict: 'comfortable', any_assumed: true } },
      ])
    )

    // A change that keeps both the same adds nothing.
    fireEvent.change(screen.getByLabelText('Listening distance in meters'), { target: { value: '2' } })
    await waitFor(() => expect(screen.queryByText(/Assumed you sit about 3 m/)).toBeNull())
    // Room size and acoustics are still assumed, so the flag is unchanged.
    expect(shown()).toHaveLength(1)
  })
})

describe('StereoBuilder advanced mode', () => {
  beforeEach(() => {
    try {
      window.localStorage.clear()
    } catch {
      // jsdom always has storage; ignore if not.
    }
  })

  it('starts in Simple mode with no checks panel or source tile', async () => {
    stubFetch(catalogHandlers())
    renderBuilder(`spk=${SPK_ID}&amp=${AMP_ID}`)
    await screen.findByText('Test Bookshelf')
    expect(screen.getByRole('button', { name: 'Simple' }).getAttribute('aria-pressed')).toBe('true')
    expect(screen.queryByRole('heading', { name: 'System checks' })).toBeNull()
    expect(screen.queryByRole('group', { name: 'Source type' })).toBeNull()
  })

  it('switching to Advanced shows the source, the advanced fields and the checks, and keeps the verdict', async () => {
    stubFetch(catalogHandlers())
    renderBuilder(`spk=${SPK_ID}&amp=${AMP_ID}&db=95`)
    await screen.findByText('Comfortable')

    fireEvent.click(screen.getByRole('button', { name: 'Advanced' }))
    expect(await screen.findByRole('heading', { name: 'System checks' })).toBeTruthy()
    expect(screen.getByRole('group', { name: 'Source type' })).toBeTruthy()
    expect(screen.getByLabelText('Output impedance (Ω)')).toBeTruthy()
    expect(screen.getByText('Comfortable')).toBeTruthy()
    expect(window.localStorage.getItem('stereo-advanced-mode')).toBe('1')
  })

  it('a weak source caps the verdict, and Simple mode shows one problem line that opens Advanced', async () => {
    stubFetch(catalogHandlers())
    const ax = encodeURIComponent(JSON.stringify({ input_sensitivity_v: { value: 4 } }))
    const srx = encodeURIComponent(JSON.stringify({ kind: 'dac', output_v: { value: 2 } }))
    renderBuilder(`spk=${SPK_ID}&amp=${AMP_ID}&ax=${ax}&srx=${srx}`)

    const line = await screen.findByRole('button', { name: /can't drive this amp to full power/ })
    expect(screen.getByText('your source')).toBeTruthy()
    fireEvent.click(line)
    expect(await screen.findByRole('heading', { name: 'System checks' })).toBeTruthy()
    expect(screen.getByText(/only drives this amp to about/)).toBeTruthy()
  })

  it('adv=1 in the link opens Advanced mode', async () => {
    stubFetch(catalogHandlers())
    renderBuilder(`spk=${SPK_ID}&amp=${AMP_ID}&adv=1`)
    expect(await screen.findByRole('heading', { name: 'System checks' })).toBeTruthy()
  })

  it('choosing a source preset sets its voltage; phono asks for it instead', async () => {
    stubFetch(catalogHandlers())
    renderBuilder(`spk=${SPK_ID}&amp=${AMP_ID}&adv=1`)
    await screen.findByRole('group', { name: 'Source type' })

    fireEvent.click(screen.getByRole('button', { name: 'Balanced DAC (4 V)' }))
    expect((screen.getByLabelText('Maximum output (V)') as HTMLInputElement).value).toBe('4')
    fireEvent.click(screen.getByRole('button', { name: 'Phono stage' }))
    expect((screen.getByLabelText('Maximum output (V)') as HTMLInputElement).value).toBe('')
  })
})

describe('StereoBuilder (signed in)', () => {
  const SYSTEM_ID = 'sys-1'
  const row = {
    id: SYSTEM_ID,
    name: 'Living room',
    system_profile: { room: null, room_preset: null, acoustics: 'average', distance_m: 3, near_wall: null, target_peak_db: 95 },
    stack_components: [
      {
        role: 'speakers',
        component_id: SPK_ID,
        custom_brand: null,
        custom_name: null,
        spec_overrides: null,
        components: { id: SPK_ID, brand: 'Test', name: 'Bookshelf', category: 'speakers', technical_specs: SPEAKERS },
      },
      {
        role: 'amp',
        component_id: null,
        custom_brand: 'Home',
        custom_name: 'Brew',
        spec_overrides: AMP,
        components: null,
      },
    ],
  }

  beforeEach(() => signedIn())

  it('saving a new system POSTs it, then PUTs the speakers and amp', async () => {
    const fetchMock = stubFetch({
      ...catalogHandlers(),
      'GET /api/stereo-systems': () => ({ systems: [] }),
      'POST /api/stereo-systems': () => ({ system: { id: SYSTEM_ID, name: 'My stereo system' } }),
      'PUT /api/stereo-systems/items': () => ({ item: {} }),
    })
    renderBuilder(`spk=${SPK_ID}&amp=${AMP_ID}&db=95`)
    await screen.findByText('Comfortable')

    fireEvent.click(screen.getByRole('button', { name: 'Save system' }))
    expect(await screen.findByText('Saved')).toBeTruthy()

    const writes = fetchMock.mock.calls
      .filter(([, init]) => init?.method)
      .map(([url, init]) => ({ method: init!.method, url: String(url), body: JSON.parse(String(init!.body)) }))
    expect(writes.map((w) => `${w.method} ${w.url}`)).toEqual([
      'POST /api/stereo-systems',
      'PUT /api/stereo-systems/items',
      'PUT /api/stereo-systems/items',
    ])
    expect(writes[0].body).toMatchObject({ name: 'My stereo system', system_profile: { target_peak_db: 95 } })
    expect(writes[1].body).toEqual({ stack_id: SYSTEM_ID, role: 'speakers', component_id: SPK_ID })
    expect(writes[2].body).toEqual({ stack_id: SYSTEM_ID, role: 'amp', component_id: AMP_ID })
    expect(mocks.trackEvent).toHaveBeenCalledWith({ name: 'stereo_system_saved' })
    expect(mocks.signIn).not.toHaveBeenCalled()
  })

  it('?system=<id> loads the system from the list and shows its gear', async () => {
    stubFetch({
      'GET /api/stereo-systems': () => ({ systems: [{ id: 'other', name: 'Other', system_profile: {}, stack_components: [] }, row] }),
    })
    renderBuilder(`system=${SYSTEM_ID}`)

    expect(await screen.findByRole('heading', { name: 'Living room' })).toBeTruthy()
    expect(screen.getByText('Test Bookshelf')).toBeTruthy()
    expect(screen.getByText('Home Brew')).toBeTruthy()
    expect(screen.getByText('Comfortable')).toBeTruthy()
  })

  it('autosaves a profile edit with PATCH after 800 ms of quiet, and tracks it', async () => {
    const fetchMock = stubFetch({
      'GET /api/stereo-systems': () => ({ systems: [row] }),
      'PATCH /api/stereo-systems': () => ({ system: {} }),
    })
    renderBuilder(`system=${SYSTEM_ID}`)
    await screen.findByRole('heading', { name: 'Living room' })

    vi.useFakeTimers()
    const distance = screen.getByLabelText('Listening distance in meters')
    fireEvent.change(distance, { target: { value: '2' } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(799)
    })
    const patches = () => fetchMock.mock.calls.filter(([, init]) => init?.method === 'PATCH')
    expect(patches()).toHaveLength(0)

    fireEvent.change(distance, { target: { value: '2.5' } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(799)
    })
    expect(patches()).toHaveLength(0)

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(patches()).toHaveLength(1)
    const body = JSON.parse(String(patches()[0][1]!.body))
    expect(body.id).toBe(SYSTEM_ID)
    expect(body.system_profile.distance_m).toBe(2.5)
    expect(mocks.trackEvent).toHaveBeenCalledWith({ name: 'stereo_system_edited' })
  })

  it('shows a visible error with a retry when an autosave fails', async () => {
    let failing = true
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    const fetchMock = stubFetch({
      'GET /api/stereo-systems': () => ({ systems: [row] }),
      'PATCH /api/stereo-systems': () => (failing ? new Error('boom') : { system: {} }),
    })
    renderBuilder(`system=${SYSTEM_ID}`)
    await screen.findByRole('heading', { name: 'Living room' })

    vi.useFakeTimers()
    fireEvent.change(screen.getByLabelText('Listening distance in meters'), { target: { value: '2' } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    vi.useRealTimers()

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain("Couldn't save. Try again.")

    failing = false
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull())
    expect(fetchMock.mock.calls.filter(([, init]) => init?.method === 'PATCH')).toHaveLength(2)
    expect(await screen.findByText('Saved')).toBeTruthy()
    consoleError.mockRestore()
  })

  it('says so when the saved system is not in the list', async () => {
    stubFetch({ 'GET /api/stereo-systems': () => ({ systems: [] }) })
    renderBuilder('system=nope')

    expect((await screen.findByRole('alert')).textContent).toContain("couldn't find that saved system")
  })
})

describe('StereoBuilder (signed in): saved systems, renaming and the save queue', () => {
  const SYSTEM_ID = 'sys-1'
  const FLOOR_ID = '5d0f6a44-2b9e-4f0a-8c11-7e3a9b6d2c55'
  const profileJson = { room: null, room_preset: null, acoustics: 'average', distance_m: 3, near_wall: null, target_peak_db: 95 }
  const row = {
    id: SYSTEM_ID,
    name: 'Living room',
    system_profile: profileJson,
    stack_components: [
      {
        role: 'speakers',
        component_id: SPK_ID,
        custom_brand: null,
        custom_name: null,
        spec_overrides: null,
        components: { id: SPK_ID, brand: 'Test', name: 'Bookshelf', category: 'speakers', technical_specs: SPEAKERS },
      },
      { role: 'amp', component_id: null, custom_brand: 'Home', custom_name: 'Brew', spec_overrides: AMP, components: null },
    ],
  }
  const floorItem = item(FLOOR_ID, 'speakers', 'Floorstander', SPEAKERS)

  const writes = (fetchMock: ReturnType<typeof stubFetch>) =>
    fetchMock.mock.calls
      .filter(([, init]) => init?.method && init.method !== 'GET')
      .map(([url, init]) => ({ method: init!.method!, url: String(url), body: JSON.parse(String(init!.body)) }))

  beforeEach(() => signedIn())

  it('lists the saved systems with links when signed in and no system is open', async () => {
    stubFetch({
      'GET /api/stereo-systems': () => ({ systems: [row, { ...row, id: 'sys-2', name: 'Office' }] }),
    })
    renderBuilder('')

    expect(await screen.findByText('Your saved systems')).toBeTruthy()
    expect(screen.getByRole('link', { name: 'Living room' }).getAttribute('href')).toBe('/stereo?system=sys-1')
    expect(screen.getByRole('link', { name: 'Office' }).getAttribute('href')).toBe('/stereo?system=sys-2')
  })

  it('shows no saved-systems list when there are none, or when a system is open', async () => {
    const empty = stubFetch({ 'GET /api/stereo-systems': () => ({ systems: [] }) })
    const { unmount } = renderBuilder('')
    await waitFor(() => expect(empty).toHaveBeenCalled())
    expect(screen.queryByText('Your saved systems')).toBeNull()
    unmount()

    stubFetch({ 'GET /api/stereo-systems': () => ({ systems: [row] }) })
    renderBuilder(`system=${SYSTEM_ID}`)
    await screen.findByRole('heading', { name: 'Living room' })
    expect(screen.queryByText('Your saved systems')).toBeNull()
  })

  it('renaming a loaded system PATCHes { id, name } after the debounce', async () => {
    const fetchMock = stubFetch({
      'GET /api/stereo-systems': () => ({ systems: [row] }),
      'PATCH /api/stereo-systems': () => ({ system: {} }),
    })
    renderBuilder(`system=${SYSTEM_ID}`)
    await screen.findByRole('heading', { name: 'Living room' })

    vi.useFakeTimers()
    fireEvent.change(screen.getByLabelText('System name'), { target: { value: 'Den' } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    vi.useRealTimers()

    expect(writes(fetchMock)).toEqual([{ method: 'PATCH', url: '/api/stereo-systems', body: { id: SYSTEM_ID, name: 'Den' } }])
    expect(await screen.findByRole('heading', { name: 'Den' })).toBeTruthy()
  })

  it('never has two saves in flight: a second edit waits and then sends the newest profile', async () => {
    let release: () => void = () => {}
    const gate = new Promise<void>((resolve) => (release = resolve))
    let inFlight = 0
    let maxInFlight = 0
    const patchBodies: Array<{ distance: number }> = []
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_input: RequestInfo | URL, init?: RequestInit) => {
        const method = init?.method ?? 'GET'
        if (method === 'GET') return { ok: true, status: 200, json: async () => ({ systems: [row] }) }
        inFlight += 1
        maxInFlight = Math.max(maxInFlight, inFlight)
        patchBodies.push({ distance: JSON.parse(String(init!.body)).system_profile.distance_m })
        if (patchBodies.length === 1) await gate
        inFlight -= 1
        return { ok: true, status: 200, json: async () => ({ system: {} }) }
      }),
    )
    renderBuilder(`system=${SYSTEM_ID}`)
    await screen.findByRole('heading', { name: 'Living room' })

    vi.useFakeTimers()
    const distance = screen.getByLabelText('Listening distance in meters')
    fireEvent.change(distance, { target: { value: '2' } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(patchBodies).toEqual([{ distance: 2 }])

    // The first request is still in flight; a newer edit's round must wait for it.
    fireEvent.change(distance, { target: { value: '2.5' } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    expect(patchBodies).toHaveLength(1)

    release()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
    expect(patchBodies).toEqual([{ distance: 2 }, { distance: 2.5 }])
    expect(maxInFlight).toBe(1)
    vi.useRealTimers()
    expect(await screen.findByText('Saved')).toBeTruthy()
  })

  it('keeps a failed profile save and retries it with the next round instead of showing Saved', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    let patchFails = true
    const fetchMock = stubFetch({
      'GET /api/stereo-catalog?role=speakers': () => ({ items: [floorItem] }),
      'GET /api/stereo-systems': () => ({ systems: [row] }),
      'PATCH /api/stereo-systems': () => (patchFails ? new Error('boom') : { system: {} }),
      'PUT /api/stereo-systems/items': () => ({ item: {} }),
    })
    renderBuilder(`system=${SYSTEM_ID}`)
    await screen.findByRole('heading', { name: 'Living room' })

    // Round 1: the profile edit fails.
    vi.useFakeTimers()
    fireEvent.change(screen.getByLabelText('Listening distance in meters'), { target: { value: '2' } })
    await act(async () => {
      await vi.advanceTimersByTimeAsync(800)
    })
    vi.useRealTimers()
    expect((await screen.findByRole('alert')).textContent).toContain("Couldn't save. Try again.")

    // Round 2: only the speakers changed, and that write succeeds. The profile must be retried
    // (and, still failing here, the error must stay).
    fireEvent.click(screen.getByRole('button', { name: 'Change speakers' }))
    fireEvent.click(await screen.findByRole('button', { name: /Floorstander/ }))
    await waitFor(() => expect(writes(fetchMock).filter((w) => w.method === 'PATCH')).toHaveLength(2), { timeout: 3000 })
    await waitFor(() => expect(writes(fetchMock).filter((w) => w.method === 'PUT')).toHaveLength(1))
    expect(writes(fetchMock)[1].body.system_profile.distance_m).toBe(2)
    expect(screen.getByRole('alert').textContent).toContain("Couldn't save. Try again.")
    expect(screen.queryByText('Saved')).toBeNull()

    // Once the server accepts it, Retry sends the profile again and only then shows Saved.
    patchFails = false
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByText('Saved')).toBeTruthy()
    const patches = writes(fetchMock).filter((w) => w.method === 'PATCH')
    expect(patches).toHaveLength(3)
    expect(patches[2].body.system_profile.distance_m).toBe(2)
    consoleError.mockRestore()
  })

  it('treats saved custom values as hand-entered, whatever trust is stored', async () => {
    stubFetch({ 'GET /api/stereo-systems': () => ({ systems: [row] }) })
    renderBuilder(`system=${SYSTEM_ID}`)
    await screen.findByRole('heading', { name: 'Living room' })

    const ampRow = screen.getByRole('row', { name: /Amp power at the speakers/ })
    expect(ampRow.textContent).toContain('Your entry')
  })

  it('clears the broken-link notice once the user picks new gear', async () => {
    stubFetch({
      [`GET /api/stereo-catalog?role=speakers&id=${SPK_ID}`]: () => ({ items: [] }),
      'GET /api/stereo-catalog?role=speakers': () => ({ items: [floorItem] }),
      'GET /api/stereo-systems': () => ({ systems: [] }),
    })
    renderBuilder(`spk=${SPK_ID}`)
    expect((await screen.findByRole('alert')).textContent).toContain("Couldn't load some of the gear in this link")

    fireEvent.click(screen.getByRole('button', { name: 'Browse speakers' }))
    fireEvent.click(await screen.findByRole('button', { name: /Floorstander/ }))

    await waitFor(() => expect(screen.queryByText(/Couldn't load some of the gear/)).toBeNull())
  })
})
