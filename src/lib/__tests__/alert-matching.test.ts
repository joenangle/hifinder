import { describe, it, expect } from 'vitest'
import {
  normalizeListingSource,
  sourceMatchesPreference,
  conditionMatchesPreference,
  priceMatchesAlert,
  customQueryMatches,
  listingMatchesAlert,
  findMatches,
  buildAlertHistoryRow,
  runAlertMatching,
  type MatchableListing,
  type MatchableAlert,
} from '../alert-matching'

// Real DB vocab (confirmed via `npm run db`):
//   used_listings.source     = 'reverb' | 'reddit_avexchange'
//   used_listings.condition  = 'excellent' | 'good' | 'very_good' | 'fair' | 'parts_only'
//   price_alerts.marketplace_preference defaults to ['reddit','headfi','avexchange']
//   price_alerts.condition_preference   defaults to ['new','used','refurbished','b-stock']

function listing(overrides: Partial<MatchableListing> = {}): MatchableListing {
  return {
    id: 'l1',
    component_id: 'c1',
    title: 'Sennheiser HD 600 — excellent condition',
    price: 200,
    condition: 'excellent',
    source: 'reddit_avexchange',
    url: 'https://reddit.com/r/avexchange/abc',
    status: 'available',
    date_posted: '2026-05-29T00:00:00.000Z',
    ...overrides,
  }
}

function alert(overrides: Partial<MatchableAlert> = {}): MatchableAlert {
  return {
    id: 'a1',
    user_id: 'u1',
    component_id: 'c1',
    alert_type: 'below',
    target_price: 250,
    condition_preference: ['new', 'used', 'refurbished', 'b-stock'],
    marketplace_preference: ['reddit', 'headfi', 'avexchange'],
    is_active: true,
    ...overrides,
  }
}

describe('normalizeListingSource', () => {
  it('maps known sources to canonical tokens', () => {
    expect(normalizeListingSource('reddit_avexchange')).toBe('reddit_avexchange')
    expect(normalizeListingSource('reverb')).toBe('reverb')
    expect(normalizeListingSource('head_fi')).toBe('head_fi')
  })

  it('is case-insensitive and trims', () => {
    expect(normalizeListingSource('  Reverb ')).toBe('reverb')
  })

  it('returns null for null/unknown', () => {
    expect(normalizeListingSource(null)).toBeNull()
    expect(normalizeListingSource('craigslist')).toBeNull()
  })
})

describe('sourceMatchesPreference', () => {
  it('matches reddit_avexchange listing when prefs contain "reddit" or "avexchange"', () => {
    expect(sourceMatchesPreference('reddit_avexchange', ['reddit', 'headfi', 'avexchange'])).toBe(true)
    expect(sourceMatchesPreference('reddit_avexchange', ['avexchange'])).toBe(true)
  })

  it('matches reverb listing only when prefs contain "reverb"', () => {
    // The default UI prefs omit reverb — this is the silent-miss the audit flagged.
    expect(sourceMatchesPreference('reverb', ['reddit', 'headfi', 'avexchange'])).toBe(false)
    expect(sourceMatchesPreference('reverb', ['reverb'])).toBe(true)
  })

  it('maps "headfi" pref to head_fi listings', () => {
    expect(sourceMatchesPreference('head_fi', ['headfi'])).toBe(true)
  })

  it('is permissive when prefs are empty or null', () => {
    expect(sourceMatchesPreference('reverb', [])).toBe(true)
    expect(sourceMatchesPreference('reverb', null)).toBe(true)
  })

  it('does not match a null listing source against restrictive prefs', () => {
    expect(sourceMatchesPreference(null, ['reddit'])).toBe(false)
  })
})

describe('conditionMatchesPreference', () => {
  it('treats every used grade as "used" so default prefs match', () => {
    for (const grade of ['excellent', 'good', 'very_good', 'fair', 'parts_only']) {
      expect(conditionMatchesPreference(grade, ['new', 'used', 'refurbished', 'b-stock'])).toBe(true)
    }
  })

  it('excludes used-grade listings when the user only wants "new"', () => {
    expect(conditionMatchesPreference('excellent', ['new'])).toBe(false)
  })

  it('matches literal new/refurbished/b-stock conditions', () => {
    expect(conditionMatchesPreference('new', ['new'])).toBe(true)
    expect(conditionMatchesPreference('b-stock', ['b-stock'])).toBe(true)
  })

  it('is permissive for null condition or empty prefs', () => {
    expect(conditionMatchesPreference(null, ['new'])).toBe(true)
    expect(conditionMatchesPreference('excellent', [])).toBe(true)
  })
})

describe('priceMatchesAlert', () => {
  it('below: matches at or under target', () => {
    expect(priceMatchesAlert(200, alert({ alert_type: 'below', target_price: 250 }))).toBe(true)
    expect(priceMatchesAlert(250, alert({ alert_type: 'below', target_price: 250 }))).toBe(true)
    expect(priceMatchesAlert(251, alert({ alert_type: 'below', target_price: 250 }))).toBe(false)
  })

  it('range: matches within inclusive bounds', () => {
    const a = alert({ alert_type: 'range', price_range_min: 100, price_range_max: 300 })
    expect(priceMatchesAlert(100, a)).toBe(true)
    expect(priceMatchesAlert(300, a)).toBe(true)
    expect(priceMatchesAlert(99, a)).toBe(false)
    expect(priceMatchesAlert(301, a)).toBe(false)
  })

  it('exact: matches within +/-10% band around target', () => {
    const a = alert({ alert_type: 'exact', target_price: 200 })
    expect(priceMatchesAlert(200, a)).toBe(true)
    expect(priceMatchesAlert(180, a)).toBe(true) // -10%
    expect(priceMatchesAlert(220, a)).toBe(true) // +10%
    expect(priceMatchesAlert(170, a)).toBe(false)
    expect(priceMatchesAlert(230, a)).toBe(false)
  })

  it('unknown alert_type falls back to below semantics', () => {
    expect(priceMatchesAlert(200, alert({ alert_type: null, target_price: 250 }))).toBe(true)
  })
})

describe('customQueryMatches', () => {
  it('matches a custom_search_query as a case-insensitive substring of the title', () => {
    const a = alert({ component_id: null, custom_search_query: 'hd 600' })
    expect(customQueryMatches('Sennheiser HD 600 — excellent', a)).toBe(true)
    expect(customQueryMatches('Focal Clear', a)).toBe(false)
  })

  it('matches when both custom brand and model appear in the title', () => {
    const a = alert({ component_id: null, custom_brand: 'Schiit', custom_model: 'Magni' })
    expect(customQueryMatches('Schiit Magni Heresy', a)).toBe(true)
    expect(customQueryMatches('Schiit Modi', a)).toBe(false)
  })
})

describe('listingMatchesAlert', () => {
  it('matches a component-linked alert end to end', () => {
    expect(listingMatchesAlert(listing(), alert())).toBe(true)
  })

  it('requires the component_id to match for component-linked alerts', () => {
    expect(listingMatchesAlert(listing({ component_id: 'other' }), alert({ component_id: 'c1' }))).toBe(false)
  })

  it('matches a custom alert via title text', () => {
    const a = alert({ component_id: null, custom_search_query: 'HD 600' })
    expect(listingMatchesAlert(listing({ component_id: null }), a)).toBe(true)
  })

  it('fails when price is over a below-target even if everything else matches', () => {
    expect(listingMatchesAlert(listing({ price: 999 }), alert({ target_price: 250 }))).toBe(false)
  })

  it('does not match inactive alerts', () => {
    expect(listingMatchesAlert(listing(), alert({ is_active: false }))).toBe(false)
  })

  it('does not match an alert with neither component_id nor custom fields', () => {
    expect(listingMatchesAlert(listing({ component_id: null }), alert({ component_id: null }))).toBe(false)
  })

  it('reproduces the real-world reverb default-prefs miss', () => {
    // A reverb listing under target, but default prefs omit reverb -> no match.
    const reverbListing = listing({ source: 'reverb', condition: 'excellent', price: 150 })
    expect(listingMatchesAlert(reverbListing, alert())).toBe(false)
    // ...but it DOES match once the user includes reverb.
    expect(listingMatchesAlert(reverbListing, alert({ marketplace_preference: ['reverb'] }))).toBe(true)
  })
})

describe('findMatches', () => {
  it('returns every matching (alert, listing) pair', () => {
    const listings = [listing({ id: 'l1', price: 100 }), listing({ id: 'l2', price: 999 })]
    const alerts = [alert({ id: 'a1', target_price: 250 })]
    const matches = findMatches(listings, alerts)
    expect(matches).toHaveLength(1)
    expect(matches[0].listing.id).toBe('l1')
    expect(matches[0].alert.id).toBe('a1')
  })
})

describe('buildAlertHistoryRow', () => {
  it('shapes a row ready for insert into alert_history', () => {
    const row = buildAlertHistoryRow(alert(), listing(), '2026-05-30T09:00:00.000Z')
    expect(row).toMatchObject({
      alert_id: 'a1',
      user_id: 'u1',
      listing_title: 'Sennheiser HD 600 — excellent condition',
      listing_price: 200,
      listing_condition: 'excellent',
      listing_source: 'reddit_avexchange',
      listing_url: 'https://reddit.com/r/avexchange/abc',
      triggered_at: '2026-05-30T09:00:00.000Z',
      notification_sent: false,
      user_viewed: false,
    })
  })
})

describe('runAlertMatching', () => {
  function makeDeps(initialHistoryKeys: string[] = []) {
    const inserted: Array<Record<string, unknown>> = []
    const bumps: Array<{ alertId: string; increment: number }> = []
    const historyKeys = new Set(initialHistoryKeys)
    return {
      inserted,
      bumps,
      historyKeys,
      deps: {
        getActiveAlerts: async () => [alert({ id: 'a1', target_price: 250 })],
        getRecentAvailableListings: async () => [
          listing({ id: 'l1', price: 100, url: 'https://x/1' }),
          listing({ id: 'l2', price: 999, url: 'https://x/2' }), // over target -> no match
        ],
        getExistingHistoryKeys: async () => historyKeys,
        insertHistoryRows: async (rows: Array<Record<string, unknown>>) => {
          inserted.push(...rows)
          for (const r of rows) historyKeys.add(`${r.alert_id}::${r.listing_url}`)
        },
        bumpAlert: async (alertId: string, increment: number) => {
          bumps.push({ alertId, increment })
        },
        now: '2026-05-30T09:00:00.000Z',
      },
    }
  }

  it('inserts history rows for new matches and bumps trigger counts', async () => {
    const { deps, inserted, bumps } = makeDeps()
    const summary = await runAlertMatching(deps)
    expect(inserted).toHaveLength(1)
    expect(inserted[0]).toMatchObject({ alert_id: 'a1', listing_url: 'https://x/1' })
    expect(bumps).toEqual([{ alertId: 'a1', increment: 1 }])
    expect(summary).toMatchObject({ matched: 1, inserted: 1, duplicatesSkipped: 0 })
  })

  it('does not re-insert a listing that already triggered the alert (de-dup regression)', async () => {
    const { deps, inserted } = makeDeps(['a1::https://x/1'])
    const summary = await runAlertMatching(deps)
    expect(inserted).toHaveLength(0)
    expect(summary).toMatchObject({ matched: 1, inserted: 0, duplicatesSkipped: 1 })
  })
})
