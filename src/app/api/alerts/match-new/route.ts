import { NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import {
  runAlertMatching,
  dedupeKey,
  type MatchableAlert,
  type MatchableListing,
  type AlertHistoryRow,
} from '@/lib/alert-matching'

/**
 * Matches freshly-scraped `used_listings` against active `price_alerts` and
 * records hits into `alert_history` (the queue `send-notifications` drains).
 *
 * This is the writer that was missing from the alert pipeline — without it the
 * daily send cron read an always-empty queue and no alert ever fired.
 *
 * Triggered by a Vercel cron (see vercel.json) shortly after each scrape, and
 * also curled by the scrape-listings GitHub workflow for immediacy. Idempotent:
 * de-dups on (alert_id, listing_url), so overlapping triggers are harmless.
 */

// Only consider listings seen recently — bounds the scan and avoids alerting on
// backfilled history. Comfortably covers the 4-hour scrape cadence.
const LOOKBACK_DAYS = 14

export async function POST(request: Request) {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date().toISOString()
  const cutoff = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString()

  // Base trigger counts captured from the loaded alerts so bumpAlert can compute
  // the new total without a separate read (matching runs as a single job).
  const triggerBase = new Map<string, number>()

  try {
    const summary = await runAlertMatching({
      now,

      getActiveAlerts: async () => {
        const { data, error } = await supabase
          .from('price_alerts')
          .select(
            'id, user_id, component_id, alert_type, target_price, price_range_min, price_range_max, condition_preference, marketplace_preference, custom_search_query, custom_brand, custom_model, is_active, notification_frequency, trigger_count'
          )
          .eq('is_active', true)
        if (error) throw new Error(`load alerts: ${error.message}`)
        const alerts = (data ?? []) as MatchableAlert[]
        for (const a of alerts) triggerBase.set(a.id, a.trigger_count ?? 0)
        return alerts
      },

      getRecentAvailableListings: async () => {
        const { data, error } = await supabase
          .from('used_listings')
          .select('id, component_id, title, price, condition, source, url, status, date_posted')
          .eq('status', 'available')
          .gte('date_posted', cutoff)
          .limit(5000)
        if (error) throw new Error(`load listings: ${error.message}`)
        return (data ?? []) as MatchableListing[]
      },

      getExistingHistoryKeys: async (alertIds: string[]) => {
        const keys = new Set<string>()
        if (alertIds.length === 0) return keys
        const { data, error } = await supabase
          .from('alert_history')
          .select('alert_id, listing_url')
          .in('alert_id', alertIds)
        if (error) throw new Error(`load history: ${error.message}`)
        for (const row of data ?? []) {
          if (row.alert_id && row.listing_url) keys.add(dedupeKey(row.alert_id, row.listing_url))
        }
        return keys
      },

      insertHistoryRows: async (rows: AlertHistoryRow[]) => {
        const { error } = await supabase.from('alert_history').insert(rows)
        if (error) throw new Error(`insert history: ${error.message}`)
      },

      bumpAlert: async (alertId: string, increment: number) => {
        const base = triggerBase.get(alertId) ?? 0
        const { error } = await supabase
          .from('price_alerts')
          .update({ trigger_count: base + increment, last_triggered_at: now })
          .eq('id', alertId)
        if (error) throw new Error(`bump alert ${alertId}: ${error.message}`)
      },
    })

    return NextResponse.json(summary)
  } catch (err) {
    console.error('Alert matching failed:', err)
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
