/**
 * Alert matching engine — the missing link in the price-alert pipeline.
 *
 * Users create `price_alerts` (rec-card button + dashboard Alerts tab), a daily
 * Vercel cron hits `/api/alerts/send-notifications`, and Resend sends the email.
 * But nothing ever wrote to `alert_history`, so the queue the cron reads was
 * always empty and no alert could fire. This module is that writer: it compares
 * freshly-scraped `used_listings` against active alerts and records matches.
 *
 * Two vocab gaps make a naive set-intersection silently match nothing, so we
 * normalize instead (values confirmed against the live DB):
 *   - sources:   listings use 'reddit_avexchange' / 'reverb', alerts store
 *                tokens like 'reddit' / 'avexchange' / 'headfi' / 'reverb'.
 *   - condition: listings use grades ('excellent', 'good', 'very_good', 'fair',
 *                'parts_only'), alerts store states ('new', 'used', ...). Every
 *                grade maps to the 'used' state.
 *
 * Pure functions hold all the logic; `runAlertMatching` is a thin orchestrator
 * with injected data access so it stays unit-testable without a live DB.
 */

export interface MatchableListing {
  id: string
  component_id: string | null
  title: string
  price: number
  condition: string | null
  source: string | null
  url: string
  status: string | null
  date_posted: string | null
}

export interface MatchableAlert {
  id: string
  user_id: string
  component_id?: string | null
  alert_type?: 'below' | 'exact' | 'range' | string | null
  target_price: number
  price_range_min?: number | null
  price_range_max?: number | null
  condition_preference?: string[] | null
  marketplace_preference?: string[] | null
  custom_search_query?: string | null
  custom_brand?: string | null
  custom_model?: string | null
  is_active?: boolean | null
  notification_frequency?: string | null
  trigger_count?: number | null
}

export interface AlertHistoryRow {
  alert_id: string
  user_id: string
  listing_title: string
  listing_price: number
  listing_condition: string | null
  listing_source: string | null
  listing_url: string
  listing_date: string | null
  triggered_at: string
  notification_sent: boolean
  user_viewed: boolean
}

/** Band around the target for `exact` ("around price") alerts. */
export const EXACT_PRICE_BAND = 0.1

/** Maps a stored alert marketplace token to canonical `used_listings.source` values. */
const SOURCE_ALIASES: Record<string, string> = {
  reddit: 'reddit_avexchange',
  avexchange: 'reddit_avexchange',
  reddit_avexchange: 'reddit_avexchange',
  headfi: 'head_fi',
  head_fi: 'head_fi',
  reverb: 'reverb',
  manual: 'manual',
}

const CANONICAL_SOURCES = new Set(['reddit_avexchange', 'reverb', 'head_fi', 'manual'])

/** Used-condition grades that all collapse to the 'used' state alerts speak in. */
const USED_GRADES = new Set(['excellent', 'very_good', 'good', 'fair', 'parts_only'])

export function normalizeListingSource(source: string | null): string | null {
  if (!source) return null
  const key = source.trim().toLowerCase()
  if (CANONICAL_SOURCES.has(key)) return key
  return SOURCE_ALIASES[key] ?? null
}

export function sourceMatchesPreference(
  listingSource: string | null,
  prefs: string[] | null | undefined
): boolean {
  // No stated preference => user did not restrict by marketplace.
  if (!prefs || prefs.length === 0) return true

  const canonicalListing = normalizeListingSource(listingSource)
  if (!canonicalListing) return false

  const allowed = new Set(
    prefs.map((p) => SOURCE_ALIASES[p.trim().toLowerCase()]).filter(Boolean) as string[]
  )
  return allowed.has(canonicalListing)
}

/** Collapses a raw listing condition into the alert state vocabulary. */
function normalizeCondition(condition: string | null): string | null {
  if (!condition) return null
  const key = condition.trim().toLowerCase()
  if (USED_GRADES.has(key)) return 'used'
  return key // 'new' | 'refurbished' | 'b-stock' | unknown — compared literally
}

export function conditionMatchesPreference(
  listingCondition: string | null,
  prefs: string[] | null | undefined
): boolean {
  if (!prefs || prefs.length === 0) return true
  const normalized = normalizeCondition(listingCondition)
  // Unknown/missing condition: don't drop the listing on incomplete data.
  if (!normalized) return true
  const allowed = new Set(prefs.map((p) => p.trim().toLowerCase()))
  return allowed.has(normalized)
}

export function priceMatchesAlert(price: number, alert: MatchableAlert): boolean {
  switch (alert.alert_type) {
    case 'range': {
      const min = alert.price_range_min
      const max = alert.price_range_max
      return (min == null || price >= min) && (max == null || price <= max)
    }
    case 'exact': {
      const band = Math.abs(alert.target_price) * EXACT_PRICE_BAND
      return Math.abs(price - alert.target_price) <= band
    }
    case 'below':
    default:
      return price <= alert.target_price
  }
}

export function customQueryMatches(title: string, alert: MatchableAlert): boolean {
  const haystack = title.toLowerCase()
  const query = alert.custom_search_query?.trim().toLowerCase()
  if (query) return haystack.includes(query)

  const brand = alert.custom_brand?.trim().toLowerCase()
  const model = alert.custom_model?.trim().toLowerCase()
  if (brand && model) return haystack.includes(brand) && haystack.includes(model)
  if (brand) return haystack.includes(brand)
  if (model) return haystack.includes(model)
  return false
}

export function listingMatchesAlert(listing: MatchableListing, alert: MatchableAlert): boolean {
  if (alert.is_active === false) return false

  // Linkage: a component-linked alert needs an exact component match; a custom
  // alert matches on title text; an alert with neither is malformed.
  if (alert.component_id) {
    if (listing.component_id !== alert.component_id) return false
  } else if (alert.custom_search_query || alert.custom_brand || alert.custom_model) {
    if (!customQueryMatches(listing.title, alert)) return false
  } else {
    return false
  }

  return (
    priceMatchesAlert(listing.price, alert) &&
    conditionMatchesPreference(listing.condition, alert.condition_preference) &&
    sourceMatchesPreference(listing.source, alert.marketplace_preference)
  )
}

export interface AlertMatch {
  alert: MatchableAlert
  listing: MatchableListing
}

export function findMatches(
  listings: MatchableListing[],
  alerts: MatchableAlert[]
): AlertMatch[] {
  const matches: AlertMatch[] = []
  for (const alert of alerts) {
    for (const listing of listings) {
      if (listingMatchesAlert(listing, alert)) matches.push({ alert, listing })
    }
  }
  return matches
}

export function buildAlertHistoryRow(
  alert: MatchableAlert,
  listing: MatchableListing,
  now: string
): AlertHistoryRow {
  return {
    alert_id: alert.id,
    user_id: alert.user_id,
    listing_title: listing.title,
    listing_price: listing.price,
    listing_condition: listing.condition,
    listing_source: listing.source,
    listing_url: listing.url,
    listing_date: listing.date_posted,
    triggered_at: now,
    notification_sent: false,
    user_viewed: false,
  }
}

/** De-dup key: an alert should only ever fire once per distinct listing URL. */
export function dedupeKey(alertId: string, listingUrl: string): string {
  return `${alertId}::${listingUrl}`
}

export interface AlertMatchingDeps {
  getActiveAlerts: () => Promise<MatchableAlert[]>
  getRecentAvailableListings: () => Promise<MatchableListing[]>
  /** Existing `${alert_id}::${listing_url}` keys for the candidate alerts. */
  getExistingHistoryKeys: (alertIds: string[]) => Promise<Set<string>>
  insertHistoryRows: (rows: AlertHistoryRow[]) => Promise<void>
  bumpAlert: (alertId: string, increment: number, now: string) => Promise<void>
  now: string
}

export interface AlertMatchingSummary {
  alertsChecked: number
  listingsChecked: number
  matched: number
  inserted: number
  duplicatesSkipped: number
}

export async function runAlertMatching(deps: AlertMatchingDeps): Promise<AlertMatchingSummary> {
  const [alerts, listings] = await Promise.all([
    deps.getActiveAlerts(),
    deps.getRecentAvailableListings(),
  ])

  const matches = findMatches(listings, alerts)
  const summary: AlertMatchingSummary = {
    alertsChecked: alerts.length,
    listingsChecked: listings.length,
    matched: matches.length,
    inserted: 0,
    duplicatesSkipped: 0,
  }
  if (matches.length === 0) return summary

  const alertIds = [...new Set(matches.map((m) => m.alert.id))]
  const existing = await deps.getExistingHistoryKeys(alertIds)

  const seen = new Set<string>(existing)
  const rows: AlertHistoryRow[] = []
  const incrementByAlert = new Map<string, number>()

  for (const { alert, listing } of matches) {
    const key = dedupeKey(alert.id, listing.url)
    if (seen.has(key)) {
      summary.duplicatesSkipped++
      continue
    }
    seen.add(key)
    rows.push(buildAlertHistoryRow(alert, listing, deps.now))
    incrementByAlert.set(alert.id, (incrementByAlert.get(alert.id) ?? 0) + 1)
  }

  if (rows.length > 0) {
    await deps.insertHistoryRows(rows)
    for (const [alertId, increment] of incrementByAlert) {
      await deps.bumpAlert(alertId, increment, deps.now)
    }
  }

  summary.inserted = rows.length
  return summary
}
