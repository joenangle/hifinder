'use client'

import { useState } from 'react'
import { ROOM_PRESETS } from '@/lib/stereo/power-check'
import { SPEC_RANGES, type Acoustics, type RoomPresetId, type SystemProfile } from '@/lib/stereo/specs'
import { DecimalInput, fieldLabelClass, inputClass, secondaryButtonClass } from './form-bits'

interface RoomStepProps {
  profile: SystemProfile
  onChange: (p: SystemProfile) => void
}

const ACOUSTICS_OPTIONS: readonly { id: Acoustics; label: string; description: string }[] = [
  { id: 'lively', label: 'Lively', description: 'bare floors, few soft things' },
  { id: 'average', label: 'Average', description: 'rug, sofa, some curtains' },
  { id: 'damped', label: 'Damped', description: 'carpet, heavy curtains, full shelves' },
]

const DIMENSIONS = [
  { key: 'length_m', label: 'Length (m)' },
  { key: 'width_m', label: 'Width (m)' },
  { key: 'height_m', label: 'Height (m)' },
] as const

const PRESET_IDS = Object.keys(ROOM_PRESETS) as RoomPresetId[]

const fmt = (n: number) => String(Number(n.toFixed(1)))

function summaryFor(profile: SystemProfile): string {
  const acoustics = ACOUSTICS_OPTIONS.find((a) => a.id === profile.acoustics)
  const dims = profile.room
    ? `${fmt(profile.room.length_m)} × ${fmt(profile.room.width_m)} × ${fmt(profile.room.height_m)} m`
    : null
  if (dims && acoustics) return `${dims} · ${acoustics.label} acoustics`
  return dims ?? 'Room not set yet'
}

export function RoomStep({ profile, onChange }: RoomStepProps) {
  const [open, setOpen] = useState(true)

  const setDimension = (key: (typeof DIMENSIONS)[number]['key'], n: number) => {
    if (!profile.room) return
    onChange({ ...profile, room: { ...profile.room, [key]: n }, room_preset: null })
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
              {open ? "Usually set once. Distance is the one you'll tweak." : summaryFor(profile)}
            </span>
          </div>
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
                {label}
                <DecimalInput
                  value={profile.room ? profile.room[key] : null}
                  range={SPEC_RANGES.room_dimension_m}
                  onCommit={(n) => setDimension(key, n)}
                />
              </label>
            ))}
          </div>

          <label className={fieldLabelClass}>
            How the room sounds
            <select
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
            Speakers are near a wall (within about 0.5 m)
          </label>
        </div>
      )}

      <label className="flex flex-wrap items-center justify-between gap-3 text-[15px] font-semibold text-[var(--text-primary)]">
        Listening distance
        <span className="flex items-center gap-2 font-normal">
          <DecimalInput
            aria-label="Listening distance in meters"
            value={profile.distance_m}
            range={SPEC_RANGES.distance_m}
            onCommit={(n) => onChange({ ...profile, distance_m: n })}
            className={`${inputClass} !w-20`}
          />
          m
        </span>
      </label>
    </section>
  )
}
