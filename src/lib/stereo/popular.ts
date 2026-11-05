import type { StereoCatalogItem } from './specs'

/**
 * Amps shown first in the catalog list, in this order. This is an editorial
 * pick, not usage data: nothing tracks stereo gear popularity yet. Replace it
 * with real numbers once saved systems or listings can supply them.
 */
export const POPULAR_AMPS = [
  { brand: 'Yamaha', name: 'A-S301' },
  { brand: 'WiiM', name: 'Amp' },
  { brand: 'Fosi Audio', name: 'V3' },
  { brand: 'Topping', name: 'PA5 II' },
  { brand: 'NAD', name: 'C 298' },
] as const

/** The popular amps present in `items`, in POPULAR_AMPS order. */
export function popularAmps(items: readonly StereoCatalogItem[]): StereoCatalogItem[] {
  return POPULAR_AMPS.flatMap(
    ({ brand, name }) => items.find((i) => i.brand === brand && i.name === name) ?? [],
  )
}
