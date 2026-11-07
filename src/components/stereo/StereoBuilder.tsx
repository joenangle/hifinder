'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { parseAsString, useQueryState, useQueryStates } from 'nuqs'
import { trackEvent } from '@/lib/analytics'
import { averageFromPeak, peakFromAverage } from '@/lib/stereo/power'
import { runSystemChecks, worstProblem } from '@/lib/stereo/checks'
import type { Assumption, MissingInput } from '@/lib/stereo/power-check'
import { profileFromParams, stereoParams } from '@/lib/stereo/url-params'
import {
  applyOverrides,
  parseSourceSpecs,
  parseSpeakerAmpSpecs,
  parseSpeakerSpecs,
  parseSystemProfile,
  type SourceSpecs,
  type SpeakerAmpSpecs,
  type SpeakerSpecs,
  type StereoCatalogItem,
  type SystemProfile,
} from '@/lib/stereo/specs'
import type { GearPick, GearRole } from './GearChooser'
import { GearStep, type CatalogCounts } from './GearStep'
import { LoudnessSlider } from './LoudnessSlider'
import { ModeToggle } from './ModeToggle'
import { PowerResultPanel } from './PowerResultPanel'
import { RoomStep, type RoomField, type RoomFocusRequest } from './RoomStep'
import { SystemChecksPanel } from './SystemChecksPanel'
import { inputClass, primaryButtonClass, secondaryButtonClass } from './form-bits'

interface Draft {
  speakers: GearPick | null
  amp: GearPick | null
  /** Hand-entered only: sources have no catalog. */
  source: SourceSpecs | null
  profile: SystemProfile
}

/** Which parts of a saved system have edits that are not on the server yet. */
interface Dirty {
  profile: boolean
  speakers: boolean
  amp: boolean
  source: boolean
  name: boolean
}

interface SavedSystem {
  id: string
  name: string
  draft: Draft
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/** Why the last save failed: creating the system (Retry replays the whole save) or writing to an existing one. */
type Failure = 'create' | 'update'

interface SavedSystemSummary {
  id: string
  name: string
}

interface ComponentRow {
  component_id: string | null
  role: string
  custom_brand: string | null
  custom_name: string | null
  spec_overrides: unknown
  components?: JoinedComponent | JoinedComponent[] | null
}
interface JoinedComponent {
  id: string
  brand: string
  name: string
  technical_specs: unknown
}
interface SystemRow {
  id: string
  name: string
  system_profile: unknown
  stack_components?: ComponentRow[] | null
}

const SAVE_DEBOUNCE_MS = 800
const DEFAULT_SYSTEM_NAME = 'My stereo system'
const ROLES: readonly GearRole[] = ['speakers', 'amp']
const NOTHING_DIRTY: Dirty = { profile: false, speakers: false, amp: false, source: false, name: false }

const anyDirty = (d: Dirty) => d.profile || d.speakers || d.amp || d.source || d.name
const mergeDirty = (a: Dirty, b: Partial<Dirty>): Dirty => ({
  profile: a.profile || Boolean(b.profile),
  speakers: a.speakers || Boolean(b.speakers),
  amp: a.amp || Boolean(b.amp),
  source: a.source || Boolean(b.source),
  name: a.name || Boolean(b.name),
})

const SOURCE_NAME = 'Your source'
const ADVANCED_PREF_KEY = 'stereo-advanced-mode'

const ROLE_CATEGORY = { speakers: 'speakers', amp: 'speaker_amp' } as const
const CUSTOM_NAME = { speakers: 'Your speakers', amp: 'Your amplifier' } as const

const ASSUMPTION_FIELD: Partial<Record<Assumption['id'], RoomField>> = {
  'room.size': 'size',
  'room.acoustics': 'acoustics',
  'seat.distance_m': 'distance',
  'cable.run': 'cable',
}

const parserFor = (role: GearRole) => (role === 'speakers' ? parseSpeakerSpecs : parseSpeakerAmpSpecs)

function pickSpecs(pick: GearPick): SpeakerSpecs | SpeakerAmpSpecs {
  return pick.kind === 'catalog' ? pick.item.specs : pick.specs
}

function isUserValue(v: unknown): boolean {
  return typeof v === 'object' && v !== null && (v as { trust?: unknown }).trust === 'user'
}

/**
 * The part of a catalog pick's specs that the user supplied (e.g. an answer to
 * a "we need your speakers' sensitivity" prompt). That is all that is stored
 * next to a catalog id. The amp's power rating kind rides along, because the
 * prompt sets it together with the power figure it describes.
 */
function overridesOf(
  specs: SpeakerSpecs | SpeakerAmpSpecs,
  catalogSpecs?: SpeakerSpecs | SpeakerAmpSpecs,
): Record<string, unknown> {
  const out: Record<string, unknown> = Object.fromEntries(Object.entries(specs).filter(([, v]) => isUserValue(v)))
  // The amp type is a plain field, not a trusted value: carry it when the user changed it.
  const topology = (specs as SpeakerAmpSpecs).topology
  if (topology && topology !== (catalogSpecs as SpeakerAmpSpecs | undefined)?.topology) out.topology = topology
  if (Object.keys(out).length === 0) return {}
  if ('power_rating' in specs && specs.power_rating) out.power_rating = specs.power_rating
  return out
}

/** Catalog gear restored from a link: the catalog item with the URL's hand-entered values on top. */
function pickFromUrl(
  role: GearRole,
  id: string | null,
  overrides: SpeakerSpecs | SpeakerAmpSpecs,
  catalog: Record<string, StereoCatalogItem>,
): GearPick | null {
  if (id) {
    const base = catalog[id]
    if (!base) return null
    return {
      kind: 'catalog',
      item: { ...base, specs: applyOverrides(base.specs, overrides, parserFor(role)) },
      catalogSpecs: base.specs,
    }
  }
  if (Object.keys(overrides).length === 0) return null
  return { kind: 'custom', brand: '', name: CUSTOM_NAME[role], specs: overrides }
}

function gearToParams(role: GearRole, pick: GearPick) {
  const idKey = role === 'speakers' ? 'spk' : 'amp'
  const specsKey = role === 'speakers' ? 'sx' : 'ax'
  return pick.kind === 'catalog'
    ? { [idKey]: pick.item.id, [specsKey]: overridesOf(pick.item.specs, pick.catalogSpecs) }
    : { [idKey]: null, [specsKey]: pick.specs }
}

function profileToParams(p: SystemProfile) {
  return {
    rp: p.room_preset,
    ac: p.acoustics,
    l: p.room?.length_m ?? null,
    w: p.room?.width_m ?? null,
    h: p.room?.height_m ?? null,
    d: p.distance_m,
    db: p.target_peak_db,
    cl: p.cable?.length_m ?? null,
    cg: p.cable?.awg ?? null,
  }
}

function pickFromRow(role: GearRole, row: ComponentRow | undefined): GearPick | null {
  if (!row) return null
  const parse = parserFor(role)
  const joined = Array.isArray(row.components) ? row.components[0] : row.components
  if (row.component_id && joined) {
    const catalogSpecs = parse(joined.technical_specs)
    const specs = applyOverrides(catalogSpecs, row.spec_overrides, parse)
    return {
      kind: 'catalog',
      item: { id: joined.id, brand: joined.brand, name: joined.name, category: ROLE_CATEGORY[role], specs },
      catalogSpecs,
    }
  }
  return {
    kind: 'custom',
    brand: row.custom_brand ?? '',
    name: row.custom_name ?? CUSTOM_NAME[role],
    // Everything stored on a custom item was typed by the user, whatever the stored trust says.
    specs: applyOverrides(parse({}), row.spec_overrides, parse),
  }
}

function sourceFromRow(row: ComponentRow | undefined): SourceSpecs | null {
  if (!row) return null
  const source = applyOverrides({}, row.spec_overrides, parseSourceSpecs)
  return Object.keys(source).length > 0 ? source : null
}

function draftFromRow(row: SystemRow): Draft {
  const items = row.stack_components ?? []
  return {
    speakers: pickFromRow('speakers', items.find((c) => c.role === 'speakers')),
    amp: pickFromRow('amp', items.find((c) => c.role === 'amp')),
    source: sourceFromRow(items.find((c) => c.role === 'source')),
    profile: parseSystemProfile(row.system_profile),
  }
}

function itemBody(systemId: string, role: GearRole, pick: GearPick) {
  const overrides = pick.kind === 'catalog' ? overridesOf(pick.item.specs, pick.catalogSpecs) : pick.specs
  const spec_overrides = Object.keys(overrides).length > 0 ? overrides : undefined
  if (pick.kind === 'catalog') {
    return { stack_id: systemId, role, component_id: pick.item.id, spec_overrides }
  }
  return {
    stack_id: systemId,
    role,
    custom: { brand: pick.brand || undefined, name: pick.name },
    spec_overrides,
  }
}

async function send(method: 'POST' | 'PATCH' | 'PUT', url: string, body: unknown) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`${method} ${url} failed with status ${res.status}`)
  return res.json()
}

/**
 * Write the dirty parts of a saved system. Every part is attempted on its own,
 * so one failure cannot hide another part's success; the returned set is what
 * still has to be saved. The name rides along with the profile in one PATCH.
 */
async function persist(system: SavedSystem, parts: Dirty): Promise<Dirty> {
  let failed = NOTHING_DIRTY
  if (parts.profile || parts.name) {
    try {
      await send('PATCH', '/api/stereo-systems', {
        id: system.id,
        ...(parts.name ? { name: system.name } : {}),
        ...(parts.profile ? { system_profile: system.draft.profile } : {}),
      })
    } catch (err) {
      console.error('Saving stereo system failed:', err)
      failed = mergeDirty(failed, { profile: parts.profile, name: parts.name })
    }
  }
  for (const role of ROLES) {
    const pick = system.draft[role]
    if (!parts[role] || !pick) continue
    try {
      await send('PUT', '/api/stereo-systems/items', itemBody(system.id, role, pick))
    } catch (err) {
      console.error('Saving stereo system failed:', err)
      failed = mergeDirty(failed, { [role]: true })
    }
  }
  const source = system.draft.source
  if (parts.source && source) {
    try {
      await send('PUT', '/api/stereo-systems/items', {
        stack_id: system.id,
        role: 'source',
        custom: { name: SOURCE_NAME },
        spec_overrides: source,
      })
    } catch (err) {
      console.error('Saving stereo system failed:', err)
      failed = mergeDirty(failed, { source: true })
    }
  }
  return failed
}

export function StereoBuilder({ catalogCounts }: { catalogCounts?: CatalogCounts }) {
  const { data: session, status } = useSession()
  const signedIn = status === 'authenticated' && Boolean(session?.user)

  const [params, setParams] = useQueryStates(stereoParams)
  const [systemId, setSystemId] = useQueryState('system', parseAsString)

  // Anonymous systems live in the URL. Catalog items are looked up by id and cached here.
  const [catalog, setCatalog] = useState<Record<string, StereoCatalogItem>>({})
  const [catalogFailed, setCatalogFailed] = useState(false)
  const requestedCatalog = useRef(new Set<string>())
  // "Speakers are near a wall" has no URL parameter, so it lives only in this tab.
  const [nearWall, setNearWall] = useState<boolean | null>(null)

  // Signed-in systems live on the server; this is the working copy.
  const [saved, setSaved] = useState<SavedSystem | null>(null)
  const [loadFailure, setLoadFailure] = useState<{ id: string; kind: 'missing' | 'failed' } | null>(null)
  const requestedSystem = useRef<string | null>(null)
  // Parts of the saved system that are not on the server yet: edited since the
  // last round, or failed in it. Rounds run one at a time (queue), each sending
  // the latest state, so an older request can never land after a newer one.
  const pending = useRef<Dirty>(NOTHING_DIRTY)
  const queue = useRef<Promise<void>>(Promise.resolve())
  const latestSaved = useRef<SavedSystem | null>(null)
  const [editTick, setEditTick] = useState(0)
  const [systems, setSystems] = useState<SavedSystemSummary[]>([])
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [failure, setFailure] = useState<Failure | null>(null)

  const [copied, setCopied] = useState<'copied' | 'failed' | null>(null)
  const [focusRequest, setFocusRequest] = useState<RoomFocusRequest | null>(null)
  // Simple mode's problem line asks the checks panel to open and scroll to that check.
  const [revealCheck, setRevealCheck] = useState<{ id: 'gain' | 'tonal' | 'hiss' } | null>(null)

  const activeSaved = signedIn && saved && systemId === saved.id ? saved : null

  useEffect(() => {
    latestSaved.current = activeSaved
  })

  useEffect(() => {
    for (const [role, id] of [
      ['speakers', params.spk],
      ['amp', params.amp],
    ] as const) {
      const key = `${role}:${id}`
      if (!id || requestedCatalog.current.has(key)) continue
      requestedCatalog.current.add(key)
      fetch(`/api/stereo-catalog?role=${role}&id=${encodeURIComponent(id)}`)
        .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`status ${res.status}`))))
        .then((body: { items?: StereoCatalogItem[] }) => {
          const item = body.items?.[0]
          if (item) setCatalog((c) => ({ ...c, [item.id]: item }))
          else setCatalogFailed(true)
        })
        .catch((err: unknown) => {
          console.error('Stereo catalog lookup failed:', err)
          setCatalogFailed(true)
        })
    }
  }, [params.spk, params.amp])

  useEffect(() => {
    if (!signedIn || !systemId || saved?.id === systemId || requestedSystem.current === systemId) return
    requestedSystem.current = systemId
    fetch('/api/stereo-systems')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`status ${res.status}`))))
      .then((body: { systems?: SystemRow[] }) => {
        const row = body.systems?.find((s) => s.id === systemId)
        if (row) {
          pending.current = NOTHING_DIRTY
          setSaved({ id: row.id, name: row.name, draft: draftFromRow(row) })
        }
        else setLoadFailure({ id: systemId, kind: 'missing' })
      })
      .catch((err: unknown) => {
        console.error('Loading stereo system failed:', err)
        setLoadFailure({ id: systemId, kind: 'failed' })
      })
  }, [signedIn, systemId, saved?.id])

  // The signed-in landing view: a way back to the systems saved earlier.
  useEffect(() => {
    if (!signedIn || systemId) return
    fetch('/api/stereo-systems')
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`status ${res.status}`))))
      .then((body: { systems?: SystemRow[] }) => {
        setSystems((body.systems ?? []).map(({ id, name }) => ({ id, name })))
      })
      .catch((err: unknown) => {
        console.error('Loading saved stereo systems failed:', err)
      })
  }, [signedIn, systemId])

  /** One save round: send everything pending using the latest state. Never throws. */
  async function runRound(event: 'stereo_system_saved' | 'stereo_system_edited') {
    const system = latestSaved.current
    const parts = pending.current
    if (!system || !anyDirty(parts)) return
    pending.current = NOTHING_DIRTY
    setSaveState('saving')
    const failed = await persist(system, parts)
    if (anyDirty(failed)) {
      // Keep the failed parts for the next round; "Saved" waits until nothing is outstanding.
      pending.current = mergeDirty(pending.current, failed)
      setFailure('update')
      setSaveState('error')
      return
    }
    setFailure(null)
    // Edits made during the request are saved by the next round.
    setSaveState(anyDirty(pending.current) ? 'saving' : 'saved')
    trackEvent({ name: event })
  }

  function enqueueSave(event: 'stereo_system_saved' | 'stereo_system_edited' = 'stereo_system_edited') {
    const round = queue.current.then(() => runRound(event))
    queue.current = round
    return round
  }

  // Debounced autosave: every edit restarts the timer; when it fires, a round
  // is queued behind any request still in flight.
  useEffect(() => {
    if (editTick === 0) return
    const timer = setTimeout(() => void enqueueSave(), SAVE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [editTick])

  const profile: SystemProfile = activeSaved
    ? activeSaved.draft.profile
    : { ...profileFromParams(params), near_wall: nearWall }
  const draft: Draft = activeSaved
    ? activeSaved.draft
    : {
        speakers: pickFromUrl('speakers', params.spk, params.sx, catalog),
        amp: pickFromUrl('amp', params.amp, params.ax, catalog),
        source: Object.keys(params.srx).length > 0 ? params.srx : null,
        profile,
      }

  function markDirty(parts: Partial<Dirty>) {
    pending.current = mergeDirty(pending.current, parts)
    setEditTick((t) => t + 1)
  }

  function changeGear(role: GearRole, pick: GearPick) {
    // A fresh pick replaces whatever the broken link failed to load.
    setCatalogFailed(false)
    // Picks straight from the chooser are untouched catalog rows; remember them so the URL id resolves without a refetch.
    if (
      pick.kind === 'catalog' &&
      !catalog[pick.item.id] &&
      Object.keys(overridesOf(pick.item.specs, pick.catalogSpecs)).length === 0
    ) {
      setCatalog((c) => ({ ...c, [pick.item.id]: pick.item }))
    }
    if (activeSaved) {
      setSaved({ ...activeSaved, draft: { ...activeSaved.draft, [role]: pick } })
      markDirty({ [role]: true })
    } else {
      void setParams(gearToParams(role, pick))
    }
  }

  function changeSource(next: SourceSpecs) {
    if (activeSaved) {
      setSaved({ ...activeSaved, draft: { ...activeSaved.draft, source: next } })
      markDirty({ source: true })
    } else {
      void setParams({ srx: next })
    }
  }

  // Advanced mode lives in the URL (adv=1); a per-browser preference turns it on for links without it.
  const advanced = params.adv
  useEffect(() => {
    try {
      if (window.localStorage.getItem(ADVANCED_PREF_KEY) === '1' && !new URLSearchParams(window.location.search).has('adv')) {
        void setParams({ adv: true })
      }
    } catch {
      // Storage can be unavailable (private mode); the URL still works.
    }
    // Once, on mount: later toggles write the URL themselves.
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  function setAdvanced(on: boolean) {
    void setParams({ adv: on })
    try {
      window.localStorage.setItem(ADVANCED_PREF_KEY, on ? '1' : '0')
    } catch {
      // Ignore: the preference is a convenience.
    }
  }

  function changeName(name: string) {
    if (!activeSaved) return
    setSaved({ ...activeSaved, name })
    // The server rejects a blank name, so a blank field is never saved.
    if (name.trim()) markDirty({ name: true })
  }

  function changeProfile(next: SystemProfile) {
    if (activeSaved) {
      setSaved({ ...activeSaved, draft: { ...activeSaved.draft, profile: next } })
      markDirty({ profile: true })
    } else {
      setNearWall(next.near_wall)
      void setParams(profileToParams(next))
    }
  }

  const speakersSpecs = draft.speakers ? (pickSpecs(draft.speakers) as SpeakerSpecs) : null
  const ampSpecs = draft.amp ? (pickSpecs(draft.amp) as SpeakerAmpSpecs) : null
  // Both modes fill in only what is missing and label it "assumed", so a verdict never waits on room details (D1).
  const checks = runSystemChecks({
    speakers: speakersSpecs,
    amp: ampSpecs,
    source: draft.source,
    profile: draft.profile,
    mode: 'simple',
  })
  const outcome = checks.power
  const problem = worstProblem(checks)
  // What only the secondary checks need: shown softly in Advanced mode.
  const softMissing: MissingInput[] = advanced
    ? [checks.gain, checks.tonal, checks.hiss].flatMap((c) => (c.status === 'needs' ? c.missing : []))
    : []

  const waitingForSystem =
    Boolean(systemId) &&
    (status === 'loading' || (signedIn && saved?.id !== systemId && loadFailure?.id !== systemId))
  const waitingForGear =
    (Boolean(params.spk) && !catalog[params.spk!] && !catalogFailed) ||
    (Boolean(params.amp) && !catalog[params.amp!] && !catalogFailed)
  const ready = !waitingForSystem && !(activeSaved === null && waitingForGear)

  const verdictKind = outcome.status === 'ok' ? outcome.verdict.kind : 'no_verdict'
  const anyAssumed = outcome.status === 'ok' && outcome.assumptions.length > 0
  useEffect(() => {
    if (!ready) return
    trackEvent({ name: 'stereo_verdict_shown', properties: { verdict: verdictKind, any_assumed: anyAssumed } })
  }, [ready, verdictKind, anyAssumed])

  function editAssumption(id: Assumption['id']) {
    const field = ASSUMPTION_FIELD[id]
    if (field) setFocusRequest({ field })
  }

  function signInToSave() {
    void signIn(undefined, { callbackUrl: window.location.href })
  }

  async function saveSystem() {
    if (!signedIn) {
      signInToSave()
      return
    }
    setSaveState('saving')
    let created: SavedSystem
    try {
      const { system } = (await send('POST', '/api/stereo-systems', {
        name: DEFAULT_SYSTEM_NAME,
        system_profile: draft.profile,
      })) as { system: { id: string; name?: string } }
      created = { id: system.id, name: system.name ?? DEFAULT_SYSTEM_NAME, draft }
    } catch (err) {
      console.error('Saving stereo system failed:', err)
      setSaveState('error')
      setFailure('create')
      return
    }
    // The profile went up with the POST; the gear follows through the same queue as later edits.
    pending.current = mergeDirty(pending.current, { speakers: true, amp: true, source: true })
    latestSaved.current = created
    setSaved(created)
    void setSystemId(created.id)
    void setParams(null)
    await enqueueSave('stereo_system_saved')
  }

  function retrySave() {
    if (failure === 'update') void enqueueSave()
    else void saveSystem()
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopied('copied')
    } catch (err) {
      console.error('Copying the stereo link failed:', err)
      setCopied('failed')
    }
  }

  const loadNotice =
    systemId && !waitingForSystem && !activeSaved
      ? signedIn
        ? loadFailure?.kind === 'failed'
          ? "Couldn't load that saved system. Reload to try again."
          : "We couldn't find that saved system."
        : null
      : null

  return (
    <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-6 pb-16 pt-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold uppercase tracking-[0.06em] text-[var(--text-secondary)]">
            Stereo system · Power check
          </span>
          <h1 className="m-0 text-[32px] font-bold leading-tight text-[var(--text-primary)]">
            {activeSaved?.name ?? 'Your stereo system'}
          </h1>
          {activeSaved && (
            <input
              type="text"
              aria-label="System name"
              maxLength={200}
              value={activeSaved.name}
              onChange={(e) => changeName(e.target.value)}
              className={`${inputClass} max-w-xs`}
            />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <ModeToggle advanced={advanced} onChange={setAdvanced} />
          {!activeSaved && (
            <button type="button" className={secondaryButtonClass} onClick={() => void copyLink()}>
              Copy link
            </button>
          )}
          {!activeSaved && (
            <button
              type="button"
              className={primaryButtonClass}
              disabled={saveState === 'saving'}
              onClick={() => void saveSystem()}
            >
              {saveState === 'saving' ? 'Saving…' : 'Save system'}
            </button>
          )}
          <span role="status" className="text-sm text-[var(--text-secondary)]">
            {copied === 'copied' && !activeSaved && 'Link copied.'}
            {copied === 'failed' && !activeSaved && "Couldn't copy the link."}
            {activeSaved && saveState === 'saving' && 'Saving…'}
            {activeSaved && saveState === 'saved' && 'Saved'}
          </span>
        </div>
      </div>

      {saveState === 'error' && (
        <p role="alert" className="m-0 flex flex-wrap items-center gap-3 text-sm text-[var(--text-primary)]">
          Couldn&apos;t save. Try again.
          <button type="button" className={secondaryButtonClass} onClick={retrySave}>
            Retry
          </button>
        </p>
      )}
      {signedIn && !systemId && systems.length > 0 && (
        <nav aria-label="Your saved systems" className="flex flex-col gap-2">
          <h2 className="m-0 text-base font-bold text-[var(--text-primary)]">Your saved systems</h2>
          <ul className="m-0 flex list-none flex-wrap gap-3 p-0">
            {systems.map((s) => (
              <li key={s.id}>
                <Link
                  href={`/stereo?system=${encodeURIComponent(s.id)}`}
                  className="text-sm text-[var(--accent-hover)] underline"
                >
                  {s.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      {loadNotice && (
        <p role="alert" className="m-0 text-sm text-[var(--text-primary)]">
          {loadNotice}
        </p>
      )}
      {systemId && status === 'unauthenticated' && (
        <p className="m-0 flex flex-wrap items-center gap-3 text-sm text-[var(--text-secondary)]">
          This link opens a saved system.
          <button type="button" className={secondaryButtonClass} onClick={signInToSave}>
            Sign in to open it
          </button>
        </p>
      )}
      {catalogFailed && !activeSaved && (
        <p role="alert" className="m-0 text-sm text-[var(--text-primary)]">
          Couldn&apos;t load some of the gear in this link. Pick it again below.
        </p>
      )}

      {waitingForSystem ? (
        <p role="status" className="m-0 text-[var(--text-secondary)]">
          Loading your system…
        </p>
      ) : (
        <div className="flex flex-wrap items-start gap-6">
          <div className="flex min-w-0 flex-[3_1_600px] flex-col gap-4">
            <GearStep
              speakers={draft.speakers}
              amp={draft.amp}
              ampNote={null}
              catalogCounts={catalogCounts}
              missing={outcome.status === 'needs' ? outcome.missing : []}
              softMissing={softMissing}
              advanced={advanced}
              source={draft.source}
              onSourceChange={changeSource}
              onChange={changeGear}
            />
            <RoomStep profile={draft.profile} onChange={changeProfile} focusRequest={focusRequest} advanced={advanced} />
            <LoudnessSlider
              valueDb={averageFromPeak(draft.profile.target_peak_db)}
              onChange={(db) => changeProfile({ ...draft.profile, target_peak_db: peakFromAverage(db) })}
            />
          </div>
          {/* Advanced mode's column is taller than a screen, so it scrolls with the page instead of sticking. */}
          <div className={`flex min-w-0 flex-[2_1_420px] flex-col gap-4 ${advanced ? '' : 'md:sticky md:top-6'}`}>
            <PowerResultPanel
              outcome={outcome}
              targetPeakDb={draft.profile.target_peak_db}
              distanceM={draft.profile.distance_m}
              onEditAssumption={editAssumption}
              problemLine={!advanced && problem ? problem.summary : null}
              onShowProblem={
                problem
                  ? () => {
                      setAdvanced(true)
                      setRevealCheck({ id: problem.id })
                    }
                  : undefined
              }
            />
            {advanced && <SystemChecksPanel checks={checks} revealRequest={revealCheck} onEditAssumption={editAssumption} />}
          </div>
        </div>
      )}
    </div>
  )
}
