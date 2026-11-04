'use client'

import { useSyncExternalStore } from 'react'
import type { LengthUnit } from '@/lib/stereo/units'

// A per-viewer display preference, so it lives in localStorage rather than in
// the saved system or the URL. useSyncExternalStore keeps the server render on
// meters and swaps in the stored unit after hydration without an effect.

const KEY = 'hifinder_stereo_length_unit'
const listeners = new Set<() => void>()
/** Used only when storage is unavailable (private mode, blocked site data). */
let fallback: LengthUnit = 'm'

function read(): LengthUnit {
  try {
    return localStorage.getItem(KEY) === 'ft' ? 'ft' : 'm'
  } catch {
    return fallback
  }
}

function write(u: LengthUnit) {
  try {
    localStorage.setItem(KEY, u)
  } catch {
    fallback = u // not persisted across visits, but still switches this page
  }
  listeners.forEach((l) => l())
}

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  window.addEventListener('storage', onChange)
  return () => {
    listeners.delete(onChange)
    window.removeEventListener('storage', onChange)
  }
}

export function useLengthUnit(): [LengthUnit, (u: LengthUnit) => void] {
  return [useSyncExternalStore(subscribe, read, () => 'm'), write]
}
