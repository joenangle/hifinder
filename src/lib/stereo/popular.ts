import type { StereoCatalogItem } from './specs'

type Role = 'amp' | 'speakers'

/**
 * Gear shown first in the catalog list, in this order. This is an editorial
 * pick, not usage data: nothing tracks stereo gear popularity yet. Replace it
 * with real numbers once saved systems or listings can supply them. A pick
 * missing from the catalog is skipped, so a list can be shorter than five.
 */
export const POPULAR_PICKS: Record<Role, readonly { brand: string; name: string }[]> = {
  amp: [
    { brand: 'Yamaha', name: 'A-S301' },
    { brand: 'WiiM', name: 'Amp' },
    { brand: 'Fosi Audio', name: 'V3' },
    { brand: 'Topping', name: 'PA5 II' },
    { brand: 'NAD', name: 'C 298' },
  ],
  speakers: [
    { brand: 'KEF', name: 'LS50 Meta' },
    { brand: 'Klipsch', name: 'RP-600M II' },
    { brand: 'Wharfedale', name: 'Diamond 12.2' },
    { brand: 'Philharmonic Audio', name: 'BMR Monitor' },
    { brand: 'Ascend Acoustics', name: 'Sierra-2EX V2' },
  ],
}

/** The role's popular picks present in `items`, in POPULAR_PICKS order. */
export function popularPicks(role: Role, items: readonly StereoCatalogItem[]): StereoCatalogItem[] {
  return POPULAR_PICKS[role].flatMap(
    ({ brand, name }) => items.find((i) => i.brand === brand && i.name === name) ?? [],
  )
}
