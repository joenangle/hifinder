/**
 * Aggregates active used-listings into per-component counts + lowest price.
 *
 * Shared by the dashboard surfaces that gate UI on used-market inventory
 * (e.g. WishlistTab swaps "Find Used" for a price alert when count is 0).
 */

export interface ListingCountEntry {
  count: number
  /** Lowest observed price across the component's listings; 0 if all unknown. */
  lowest: number
}

export interface CountableListing {
  component_id: string | null
  price: number | null
}

export function countListingsByComponent(
  listings: CountableListing[]
): Map<string, ListingCountEntry> {
  const byComponent = new Map<string, { count: number; lowest: number }>()

  for (const listing of listings) {
    if (!listing.component_id) continue
    const entry = byComponent.get(listing.component_id) ?? { count: 0, lowest: Infinity }
    entry.count++
    if (listing.price != null && listing.price < entry.lowest) {
      entry.lowest = listing.price
    }
    byComponent.set(listing.component_id, entry)
  }

  // Collapse the Infinity sentinel (all-null prices) down to 0.
  const result = new Map<string, ListingCountEntry>()
  for (const [id, entry] of byComponent) {
    result.set(id, {
      count: entry.count,
      lowest: Number.isFinite(entry.lowest) ? entry.lowest : 0,
    })
  }
  return result
}
