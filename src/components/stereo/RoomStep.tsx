'use client'

import { useEffect, useState } from 'react'
import { ROOM_PRESETS } from '@/lib/stereo/power-check'
import { SPEC_RANGES, type Acoustics, type RoomPresetId, type SystemProfile } from '@/lib/stereo/specs'
import { formatLength, fromMeters, rangeIn, toMeters, UNIT_NAME, UNIT_SUFFIX, type LengthUnit } from '@/lib/stereo/units'
import { useLengthUnit } from '@/hooks/useLengthUnit'
import { DecimalInput, fieldLabelClass, inputClass, parseDecimal, secondaryButtonClass } from './form-bits'

export type RoomField = 'size' | 'acoustics' | 'distance'

/** Ask the step to open (if needed) and focus a field. Pass a new object each time so repeat requests re-fire. */
export interface RoomFocusRequest {
  field: RoomField
}

interface RoomStepProps {
  profile: SystemProfile
  onChange: (p: SystemProfile) => void
  focusRequest?: RoomFocusRequest | null
}

/** Stable DOM ids, so assumption chips elsewhere on the page can jump to the matching input. */
const FIELD_IDS: Record<RoomField, string> = {
  size: 'stereo-room-length',
  acoustics: 'stereo-acoustics',
  distance: 'stereo-distance',
}

const ACOUSTICS_OPTIONS: readonly { id: Acoustics; label: string; description: string }[] = [
  { id: 'lively', label: 'Lively', description: 'bare floors, few soft things' },
  { id: 'average', label: 'Average', description: 'rug, sofa, some curtains' },
  { id: 'damped', label: 'Damped', description: 'carpet, heavy curtains, full shelves' },
]

const DIMENSIONS = [
  { key: 'length_m', label: 'Length' },
  { key: 'width_m', label: 'Width' },
  { key: 'height_m', label: 'Height' },
] as const

const UNITS: readonly LengthUnit[] = ['m', 'ft']

const PRESET_IDS = Object.keys(ROOM_PRESETS) as RoomPresetId[]

const ASSUMED_ROOM = ROOM_PRESETS.living_room

function summaryFor(profile: SystemProfile, unit: LengthUnit): string {
  const acoustics = ACOUSTICS_OPTIONS.find((a) => a.id === profile.acoustics)
  const r = profile.room
  const dims = r
    ? `${[r.length_m, r.width_m, r.height_m].map((m) => formatLength(m, unit)).join(' × ')} ${UNIT_SUFFIX[unit]}`
    : null
  if (dims && acoustics) return `${dims} · ${acoustics.label} acoustics`
  return dims ?? 'Room not set yet'
}

export function RoomStep({ profile, onChange, focusRequest = null }: RoomStepProps) {
  const [open, setOpen] = useState(true)
  const [unit, setUnit] = useLengthUnit()
  const [seenRequest, setSeenRequest] = useState(focusRequest)
  if (focusRequest !== seenRequest) {
    setSeenRequest(focusRequest)
    // The distance input stays visible when the room is collapsed; the other fields do not.
    if (focusRequest && focusRequest.field !== 'distance') setOpen(true)
  }

  useEffect(() => {
    if (!focusRequest) return
    const el = document.getElementById(FIELD_IDS[focusRequest.field])
    if (!el) return
    el.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
    el.focus()
  }, [focusRequest])

  type DimKey = (typeof DIMENSIONS)[number]['key']
  // Local drafts keep partial entries alive while the profile has no room yet.
  const [drafts, setDrafts] = useState<Partial<Record<DimKey, string>>>({})
  // Drafts are typed in the display unit; parse one back to meters, range-checked in meters.
  const draftMeters = (raw: string | undefined): number | null => {
    const n = raw === undefined ? null : parseDecimal(raw)
    if (n === null) return null
    const m = toMeters(n, unit)
    const [lo, hi] = SPEC_RANGES.room_dimension_m
    return m >= lo && m <= hi ? m : null
  }

  const [syncedRoom, setSyncedRoom] = useState(profile.room)
  if (profile.room !== syncedRoom) {
    setSyncedRoom(profile.room)
    const room = profile.room
    // Re-sync from outside (preset, URL state); keep drafts that already describe this room.
    const echoed =
      room !== null &&
      DIMENSIONS.every(({ key }) => drafts[key] === undefined || draftMeters(drafts[key]) === room[key])
    if (!echoed) setDrafts({})
  }

  const changeUnit = (next: LengthUnit) => {
    // Half-typed numbers were in the old unit; show the saved room in the new one instead.
    setDrafts({})
    setUnit(next)
  }

  const shownFor = (key: DimKey) =>
    drafts[key] ?? (profile.room ? formatLength(profile.room[key], unit) : '')

  const setDimension = (key: DimKey, raw: string) => {
    setDrafts((d) => ({ ...d, [key]: raw }))
    // Untouched fields keep their exact stored meters; re-parsing the rounded display would drift them.
    const parsed = DIMENSIONS.map((dim) =>
      dim.key === key
        ? draftMeters(raw)
        : drafts[dim.key] !== undefined
          ? draftMeters(drafts[dim.key])
          : (profile.room?.[dim.key] ?? null),
    )
    if (parsed.every((n) => n !== null)) {
      const [length_m, width_m, height_m] = parsed as number[]
      onChange({ ...profile, room: { length_m, width_m, height_m }, room_preset: null })
    }
  }

  return (
    <section
      aria-label="Step 2: Room and seat"
      className="flex flex-col gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--background-primary)] p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 flex-none items-center justify-center rounded-full bg-[var(--text-primary)] text-sm font-bold text-[var(--background-primary)]"
          >
            2
          </span>
          <div className="flex flex-col gap-0.5">
            <h2 className="m-0 text-xl font-bold text-[var(--text-primary)]">Room and seat</h2>
            <span className="text-sm text-[var(--text-secondary)]">
              {open ? "Usually set once. Distance is the one you'll tweak." : summaryFor(profile, unit)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div role="group" aria-label="Units" className="flex rounded-lg border border-[var(--border-subtle)] p-0.5">
            {UNITS.map((u) => (
              <button
                key={u}
                type="button"
                aria-pressed={unit === u}
                onClick={() => changeUnit(u)}
                className={`min-h-10 min-w-11 rounded-md px-2.5 text-sm ${
                  unit === u
                    ? 'bg-[var(--background-secondary)] font-semibold text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)]'
                }`}
              >
                {UNIT_SUFFIX[u]}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className={secondaryButtonClass}
          >
            {open ? 'Collapse' : 'Edit room'}
          </button>
        </div>
      </div>

      {open && (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {PRESET_IDS.map((id) => {
              const { label, length_m, width_m, height_m } = ROOM_PRESETS[id]
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={profile.room_preset === id}
                  onClick={() =>
                    onChange({ ...profile, room: { length_m, width_m, height_m }, room_preset: id })
                  }
                  className={`min-h-11 rounded-full border px-3.5 text-sm text-[var(--text-primary)] ${
                    profile.room_preset === id
                      ? 'border-[var(--accent-hover)] bg-[var(--background-secondary)] font-semibold'
                      : 'border-[var(--border-subtle)] bg-[var(--background-primary)]'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          <div className="grid grid-cols-3 gap-3">
            {DIMENSIONS.map(({ key, label }) => (
              <label key={key} className={fieldLabelClass}>
                {`${label} (${UNIT_SUFFIX[unit]})`}
                <input
                  id={key === 'length_m' ? FIELD_IDS.size : undefined}
                  type="text"
                  inputMode="decimal"
                  className={inputClass}
                  value={shownFor(key)}
                  placeholder={formatLength(ASSUMED_ROOM[key], unit)}
                  onChange={(e) => setDimension(key, e.target.value)}
                  onBlur={() => {
                    if (profile.room) setDrafts((d) => ({ ...d, [key]: undefined }))
                  }}
                />
              </label>
            ))}
          </div>

          <label className={fieldLabelClass}>
            How the room sounds
            <select
              id={FIELD_IDS.acoustics}
              value={profile.acoustics ?? ''}
              onChange={(e) => onChange({ ...profile, acoustics: e.target.value as Acoustics })}
              className={inputClass}
            >
              {profile.acoustics === null && (
                <option value="" disabled>
                  Choose one
                </option>
              )}
              {ACOUSTICS_OPTIONS.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.label} ({a.description})
                </option>
              ))}
            </select>
          </label>

          <label className="flex min-h-11 items-center gap-2.5 text-[15px] text-[var(--text-primary)]">
            <input
              type="checkbox"
              className="h-[18px] w-[18px]"
              checked={profile.near_wall === true}
              onChange={(e) => onChange({ ...profile, near_wall: e.target.checked })}
            />
            Speakers are near a wall (within about {unit === 'ft' ? '1.5 ft' : '0.5 m'})
          </label>
        </div>
      )}

      <label className="flex flex-wrap items-center justify-between gap-3 text-[15px] font-semibold text-[var(--text-primary)]">
        Listening distance
        <span className="flex items-center gap-2 font-normal">
          <DecimalInput
            id={FIELD_IDS.distance}
            key={unit}
            aria-label={`Listening distance in ${UNIT_NAME[unit]}`}
            value={profile.distance_m === null ? null : fromMeters(profile.distance_m, unit)}
            range={rangeIn(SPEC_RANGES.distance_m, unit)}
            onCommit={(n) => onChange({ ...profile, distance_m: toMeters(n, unit) })}
            className={`${inputClass} !w-20`}
          />
          {UNIT_SUFFIX[unit]}
        </span>
      </label>
    </section>
  )
}
