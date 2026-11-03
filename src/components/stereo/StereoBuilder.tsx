'use client'

import { useEffect, useRef, useState } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { parseAsString, useQueryState, useQueryStates } from 'nuqs'
import { trackEvent } from '@/lib/analytics'
import { runPowerCheck, type Assumption } from '@/lib/stereo/power-check'
import { profileFromParams, stereoParams } from '@/lib/stereo/url-params'
import {
  applyOverrides,
  parseSpeakerAmpSpecs,
  parseSpeakerSpecs,
  parseSystemProfile,
  type SpeakerAmpSpecs,
  type SpeakerSpecs,
  type StereoCatalogItem,
  type SystemProfile,
} from '@/lib/stereo/specs'
import type { GearPick, GearRole } from './GearChooser'
import { GearStep } from './GearStep'
import { LoudnessSlider } from './LoudnessSlider'
import { PowerResultPanel } from './PowerResultPanel'
import { RoomStep, type RoomFocusRequest } from './RoomStep'
import { primaryButtonClass, secondaryButtonClass } from './form-bits'

interface Draft {
  speakers: GearPick | null
  amp: GearPick | null
  profile: SystemProfile
}

/** Which parts of a saved system have edits that are not on the server yet. */
interface Dirty {
  profile: boolean
  speakers: boolean
  amp: boolean
}

interface SavedSystem {
  id: string
  name: string
  draft: Draft
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

/** What a failed save still has to do; the Retry button replays it. */
type Failure = { kind: 'create' } | { kind: 'update'; parts: Dirty }

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
const NOTHING_DIRTY: Dirty = { profile: false, speakers: false, amp: false }

const ROLE_CATEGORY = { speakers: 'speakers', amp: 'speaker_amp' } as const
const CUSTOM_NAME = { speakers: 'Your speakers', amp: 'Your amplifier' } as const

const ASSUMPTION_FIELD: Partial<Record<Assumption['id'], 'size' | 'acoustics' | 'distance'>> = {
  'room.size': 'size',
  'room.acoustics': 'acoustics',
  'seat.distance_m': 'distance',
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
function overridesOf(specs: SpeakerSpecs | SpeakerAmpSpecs): Record<string, unknown> {
  const user = Object.entries(specs).filter(([, v]) => isUserValue(v))
  if (user.length === 0) return {}
  const out = Object.fromEntries(user)
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
    return { kind: 'catalog', item: { ...base, specs: applyOverrides(base.specs, overrides, parserFor(role)) } }
  }
  if (Object.keys(overrides).length === 0) return null
  return { kind: 'custom', brand: '', name: CUSTOM_NAME[role], specs: overrides }
}

function gearToParams(role: GearRole, pick: GearPick) {
  const idKey = role === 'speakers' ? 'spk' : 'amp'
  const specsKey = role === 'speakers' ? 'sx' : 'ax'
  return pick.kind === 'catalog'
    ? { [idKey]: pick.item.id, [specsKey]: overridesOf(pick.item.specs) }
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
  }
}

function pickFromRow(role: GearRole, row: ComponentRow | undefined): GearPick | null {
  if (!row) return null
  const parse = parserFor(role)
  const joined = Array.isArray(row.components) ? row.components[0] : row.components
  if (row.component_id && joined) {
    const specs = applyOverrides(parse(joined.technical_specs), row.spec_overrides, parse)
    return {
      kind: 'catalog',
      item: { id: joined.id, brand: joined.brand, name: joined.name, category: ROLE_CATEGORY[role], specs },
    }
  }
  return {
    kind: 'custom',
    brand: row.custom_brand ?? '',
    name: row.custom_name ?? CUSTOM_NAME[role],
    specs: parse(row.spec_overrides),
  }
}

function draftFromRow(row: SystemRow): Draft {
  const items = row.stack_components ?? []
  return {
    speakers: pickFromRow('speakers', items.find((c) => c.role === 'speakers')),
    amp: pickFromRow('amp', items.find((c) => c.role === 'amp')),
    profile: parseSystemProfile(row.system_profile),
  }
}

function itemBody(systemId: string, role: GearRole, pick: GearPick) {
  const overrides = pick.kind === 'catalog' ? overridesOf(pick.item.specs) : pick.specs
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

/** Write the dirty parts of a saved system. Throws on the first failure. */
async function persist(systemId: string, draft: Draft, parts: Dirty) {
  if (parts.profile) {
    await send('PATCH', '/api/stereo-systems', { id: systemId, system_profile: draft.profile })
  }
  for (const role of ROLES) {
    const pick = draft[role]
    if (parts[role] && pick) await send('PUT', '/api/stereo-systems/items', itemBody(systemId, role, pick))
  }
}

export function StereoBuilder() {
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
  const [dirty, setDirty] = useState<Dirty | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [failure, setFailure] = useState<Failure | null>(null)

  const [copied, setCopied] = useState<'copied' | 'failed' | null>(null)
  const [focusRequest, setFocusRequest] = useState<RoomFocusRequest | null>(null)

  const activeSaved = signedIn && saved && systemId === saved.id ? saved : null

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
        if (row) setSaved({ id: row.id, name: row.name, draft: draftFromRow(row) })
        else setLoadFailure({ id: systemId, kind: 'missing' })
      })
      .catch((err: unknown) => {
        console.error('Loading stereo system failed:', err)
        setLoadFailure({ id: systemId, kind: 'failed' })
      })
  }, [signedIn, systemId, saved?.id])

  async function runPersist(id: string, draft: Draft, parts: Dirty, event: 'stereo_system_saved' | 'stereo_system_edited') {
    setSaveState('saving')
    try {
      await persist(id, draft, parts)
      setSaveState('saved')
      setFailure(null)
      trackEvent({ name: event })
    } catch (err) {
      console.error('Saving stereo system failed:', err)
      setSaveState('error')
      setFailure({ kind: 'update', parts })
    }
  }

  // Debounced autosave: every edit restarts the timer, and the snapshot is
  // taken when it fires. Edits made while a request is in flight mark parts
  // dirty again and are saved by the next round.
  useEffect(() => {
    if (!activeSaved || !dirty) return
    const timer = setTimeout(() => {
      setDirty(null)
      void runPersist(activeSaved.id, activeSaved.draft, dirty, 'stereo_system_edited')
    }, SAVE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [activeSaved, dirty])

  const profile: SystemProfile = activeSaved
    ? activeSaved.draft.profile
    : { ...profileFromParams(params), near_wall: nearWall }
  const draft: Draft = activeSaved
    ? activeSaved.draft
    : {
        speakers: pickFromUrl('speakers', params.spk, params.sx, catalog),
        amp: pickFromUrl('amp', params.amp, params.ax, catalog),
        profile,
      }

  function markDirty(parts: Partial<Dirty>) {
    setDirty((d) => ({ ...(d ?? NOTHING_DIRTY), ...Object.fromEntries(Object.entries(parts).filter(([, v]) => v)) }))
  }

  function changeGear(role: GearRole, pick: GearPick) {
    // Picks straight from the chooser are untouched catalog rows; remember them so the URL id resolves without a refetch.
    if (pick.kind === 'catalog' && !catalog[pick.item.id] && Object.keys(overridesOf(pick.item.specs)).length === 0) {
      setCatalog((c) => ({ ...c, [pick.item.id]: pick.item }))
    }
    if (activeSaved) {
      setSaved({ ...activeSaved, draft: { ...activeSaved.draft, [role]: pick } })
      markDirty({ [role]: true })
    } else {
      void setParams(gearToParams(role, pick))
    }
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
  // Simple mode fills in only what is missing and labels it "assumed", so a verdict never waits on room details.
  const outcome = runPowerCheck({ speakers: speakersSpecs, amp: ampSpecs, profile: draft.profile, mode: 'simple' })

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
    let createdId: string | null = null
    try {
      const { system } = (await send('POST', '/api/stereo-systems', {
        name: DEFAULT_SYSTEM_NAME,
        system_profile: draft.profile,
      })) as { system: { id: string; name?: string } }
      createdId = system.id
      setSaved({ id: system.id, name: system.name ?? DEFAULT_SYSTEM_NAME, draft })
      void setSystemId(system.id)
      void setParams(null)
      await persist(system.id, draft, { profile: false, speakers: true, amp: true })
      setSaveState('saved')
      setFailure(null)
      trackEvent({ name: 'stereo_system_saved' })
    } catch (err) {
      console.error('Saving stereo system failed:', err)
      setSaveState('error')
      setFailure(createdId ? { kind: 'update', parts: { profile: false, speakers: true, amp: true } } : { kind: 'create' })
    }
  }

  function retrySave() {
    if (failure?.kind === 'update' && activeSaved) {
      void runPersist(activeSaved.id, activeSaved.draft, failure.parts, 'stereo_system_edited')
    } else {
      void saveSystem()
    }
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
        </div>
        <div className="flex flex-wrap items-center gap-3">
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
              missing={outcome.status === 'needs' ? outcome.missing : []}
              onChange={changeGear}
            />
            <RoomStep profile={draft.profile} onChange={changeProfile} focusRequest={focusRequest} />
            <LoudnessSlider
              valueDb={draft.profile.target_peak_db}
              onChange={(db) => changeProfile({ ...draft.profile, target_peak_db: db })}
            />
          </div>
          <div className="min-w-0 flex-[2_1_420px] md:sticky md:top-6">
            <PowerResultPanel
              outcome={outcome}
              targetPeakDb={draft.profile.target_peak_db}
              distanceM={draft.profile.distance_m}
              onEditAssumption={editAssumption}
            />
          </div>
        </div>
      )}
    </div>
  )
}
