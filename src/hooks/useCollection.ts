'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

/** A catalogue component the user owns, as returned inside /api/gear rows. */
export interface CollectionComponent {
  id: string
  name: string
  brand: string
  category: string
  price_new: number | null
  price_used_min: number | null
  price_used_max: number | null
  impedance: number | null
  sound_signature: string | null
  needs_amp: boolean
  fit: string | null
}

const SYSTEM_CATEGORIES = new Set(['cans', 'iems', 'dac', 'amp', 'dac_amp'])

interface GearRow {
  components?: Partial<CollectionComponent> | null
}

/**
 * Catalogue components in a /api/gear response that can be part of a system,
 * de-duplicated. Custom (non-catalogue) gear and cables are skipped.
 */
export function collectionComponentsFromGear(gear: GearRow[]): CollectionComponent[] {
  const byId = new Map<string, CollectionComponent>()
  for (const row of gear) {
    const c = row.components
    if (!c?.id || !c.brand || !c.name || !c.category || !SYSTEM_CATEGORIES.has(c.category)) continue
    byId.set(c.id, {
      id: c.id,
      name: c.name,
      brand: c.brand,
      category: c.category,
      price_new: c.price_new ?? null,
      price_used_min: c.price_used_min ?? null,
      price_used_max: c.price_used_max ?? null,
      impedance: c.impedance ?? null,
      sound_signature: c.sound_signature ?? null,
      needs_amp: c.needs_amp ?? false,
      fit: c.fit ?? null,
    })
  }
  return [...byId.values()]
}

/**
 * The signed-in user's collection (active gear), as catalogue components.
 *
 * `loaded` is true once the answer is known, including "signed out" and
 * "lookup failed" (both mean an empty collection), so callers can wait for it
 * instead of rendering results that change a moment later.
 */
const EMPTY: CollectionComponent[] = []

export function useCollection(): { items: CollectionComponent[]; loaded: boolean } {
  const { status } = useSession()
  // Only the fetched result lives in state; the signed-out/loading answers are
  // derived from the session status during render.
  const [fetched, setFetched] = useState<CollectionComponent[] | null>(null)

  useEffect(() => {
    if (status !== 'authenticated') return

    const controller = new AbortController()
    fetch('/api/gear', { credentials: 'include', signal: controller.signal })
      .then((res) => (res.ok ? res.json() : []))
      .then((gear: GearRow[]) => setFetched(collectionComponentsFromGear(gear)))
      .catch((error) => {
        if (controller.signal.aborted) return
        console.error('Failed to load collection:', error)
        setFetched(EMPTY)
      })
    return () => controller.abort()
  }, [status])

  if (status === 'loading') return { items: EMPTY, loaded: false }
  if (status !== 'authenticated') return { items: EMPTY, loaded: true }
  return { items: fetched ?? EMPTY, loaded: fetched !== null }
}
