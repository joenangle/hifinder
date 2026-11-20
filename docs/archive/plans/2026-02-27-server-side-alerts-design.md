# Server-Side Alert Matching + Email Notifications

**Date:** 2026-02-27
**Status:** Approved
**Approach:** Postgres trigger for matching + Next.js API route for email dispatch (Approach B)

## Problem

Alert matching currently runs client-side in `AlertsTab.tsx` via `checkAlerts()`. It only fires when a user opens their dashboard, pulls all active listings into the browser, and has no deduplication. Users never receive proactive notifications.

## Architecture

```
Scraper INSERT/UPDATE → Postgres trigger (match_new_listing)
                          ↓
                      alert_history row (notification_sent = false)
                          ↓
Vercel Cron (*/5 min) → POST /api/alerts/send-notifications
                          ↓
                      Resend API → user email
                          ↓
                      alert_history.notification_sent = true
```

## Schema Changes

Add to `price_alerts`:

```sql
notification_frequency TEXT CHECK (notification_frequency IN ('instant', 'digest', 'none'))
  DEFAULT 'none',
email_enabled BOOLEAN DEFAULT false
```

Add dedup constraint on `alert_history`:

```sql
ALTER TABLE alert_history
  ADD CONSTRAINT alert_history_unique_match
  UNIQUE (alert_id, listing_url);
```

Add index for notification dispatcher:

```sql
CREATE INDEX idx_alert_history_unsent
  ON alert_history (notification_sent, triggered_at)
  WHERE notification_sent = false;
```

## Postgres Trigger

Fires on `AFTER INSERT OR UPDATE` on `used_listings`.

- On UPDATE: early-returns unless price decreased
- Skips non-available listings (sold/expired)
- Loops through all active `price_alerts`
- Matches on: keyword (component, custom search, custom brand/model) → price (below/exact/range) → condition preference → marketplace preference
- Uses `ON CONFLICT (alert_id, listing_url) DO NOTHING` for dedup
- Only bumps `trigger_count` via `IF FOUND` when a new match was inserted

Performance: ~5-10ms per listing insert with ~100 active alerts. Negligible given scrapers already have 1-second rate limiting.

## Email Notification Dispatcher

**Route:** `POST /api/alerts/send-notifications`

**Auth:** `Authorization: Bearer ${CRON_SECRET}` header check.

**Logic:**
1. Query `alert_history WHERE notification_sent = false`
2. Join `price_alerts` for `notification_frequency` (skip `none`)
3. Join `auth.users` for email address
4. Group by user
5. **Instant** users: one email per match
6. **Digest** users: batch all matches into one email
7. Mark processed rows `notification_sent = true, notification_sent_at = NOW()`

**Cron:** Vercel Cron, every 5 minutes via `vercel.json`:

```json
{
  "crons": [{
    "path": "/api/alerts/send-notifications",
    "schedule": "*/5 * * * *"
  }]
}
```

## Unsubscribe Route

**Route:** `GET /api/alerts/unsubscribe?token=...`

Signed token (HMAC with `CRON_SECRET`) containing the alert ID. Sets `email_enabled = false` on the alert. Required for CAN-SPAM compliance.

Resend one-click unsubscribe headers are included in every email.

## Email Templates

Single React Email template that handles both instant (1 match) and digest (N matches) formats. Each match shows:
- Listing title + price
- Condition + marketplace source
- Link to the listing
- Link to the alert on HiFinder dashboard

## Client-Side Changes

- **Remove** `checkAlerts()` call from `AlertsTab.tsx` useEffect (line 102)
- **Remove** `checkAlerts` function from `alerts.ts` (lines 196-328)
- **Add** email preference fields to alert create/edit form: `email_enabled` toggle + `notification_frequency` dropdown (Instant / Digest)
- **Optional:** Supabase Realtime subscription on `alert_history` INSERT for live dashboard updates

## Dependencies

**npm packages:**
- `resend`
- `react-email` + `@react-email/components`

**Environment variables (Vercel):**
- `RESEND_API_KEY`
- `CRON_SECRET`

**DNS:**
- SPF + DKIM records for `alerts@hifinder.app` (provided by Resend during domain verification)

## Explicitly Not Included

- Push notifications / web-push
- SMS / Twilio
- Location/distance filtering
- Per-user rate limiting
- New database tables

## Deliverables

1. SQL migration (schema changes + trigger function)
2. API route: `/api/alerts/send-notifications`
3. API route: `/api/alerts/unsubscribe`
4. React Email template (instant + digest)
5. Edit `AlertsTab.tsx` (email preference fields, remove `checkAlerts`)
6. Edit `alerts.ts` (remove `checkAlerts` function)
7. Edit `vercel.json` (cron config)
