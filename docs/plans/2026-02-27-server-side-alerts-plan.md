# Server-Side Alert Matching + Email Notifications — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move alert matching from client-side to a Postgres trigger and add email notifications via Resend with user-configurable frequency (instant/digest/none).

**Architecture:** Postgres trigger on `used_listings` INSERT/UPDATE writes matches to `alert_history`. Vercel Cron hits a Next.js API route every 5 minutes to dispatch emails via Resend. Unsubscribe route flips `email_enabled` off via signed token.

**Tech Stack:** Postgres (trigger + plpgsql), Next.js API routes, Resend + React Email, Vercel Cron, HMAC-signed unsubscribe tokens.

**Design doc:** `docs/plans/2026-02-27-server-side-alerts-design.md`

---

## Task 1: SQL Migration — Schema Changes + Trigger Function

**Files:**
- Create: `supabase/migrations/20260227_server_side_alerts.sql`

**Step 1: Write the migration file**

```sql
-- =============================================================
-- Server-Side Alert Matching: Schema Changes + Trigger Function
-- =============================================================

-- 1. Add email notification columns to price_alerts
ALTER TABLE price_alerts
  ADD COLUMN IF NOT EXISTS notification_frequency TEXT
    CHECK (notification_frequency IN ('instant', 'digest', 'none'))
    DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN DEFAULT false;

-- 2. Add dedup constraint on alert_history (alert + listing URL = unique match)
-- Use DO block to avoid error if constraint already exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'alert_history_unique_match'
  ) THEN
    ALTER TABLE alert_history
      ADD CONSTRAINT alert_history_unique_match UNIQUE (alert_id, listing_url);
  END IF;
END $$;

-- 3. Partial index for unsent notifications (used by email dispatcher)
CREATE INDEX IF NOT EXISTS idx_alert_history_unsent
  ON alert_history (notification_sent, triggered_at)
  WHERE notification_sent = false;

-- 4. Trigger function: match new/updated listings against active alerts
CREATE OR REPLACE FUNCTION match_new_listing()
RETURNS TRIGGER AS $$
DECLARE
  alert_rec RECORD;
BEGIN
  -- On UPDATE, only proceed if price decreased
  IF TG_OP = 'UPDATE' THEN
    IF NEW.price >= OLD.price OR NEW.price IS NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Only match available listings
  IF NEW.status IS DISTINCT FROM 'available' THEN
    RETURN NEW;
  END IF;

  FOR alert_rec IN
    SELECT pa.id, pa.user_id, pa.component_id,
           pa.alert_type, pa.target_price,
           pa.price_range_min, pa.price_range_max,
           pa.condition_preference, pa.marketplace_preference,
           pa.custom_search_query, pa.custom_brand, pa.custom_model,
           c.brand, c.name AS component_name
    FROM price_alerts pa
    LEFT JOIN components c ON pa.component_id = c.id
    WHERE pa.is_active = true
  LOOP
    -- 1. Keyword match
    IF alert_rec.component_id IS NOT NULL THEN
      IF NOT (
        NEW.title ILIKE '%' || alert_rec.brand || '%'
        AND NEW.title ILIKE '%' || alert_rec.component_name || '%'
      ) THEN CONTINUE; END IF;
    ELSIF alert_rec.custom_search_query IS NOT NULL THEN
      IF NOT (NEW.title ILIKE '%' || alert_rec.custom_search_query || '%')
        THEN CONTINUE; END IF;
    ELSIF alert_rec.custom_brand IS NOT NULL THEN
      IF NOT (
        NEW.title ILIKE '%' || alert_rec.custom_brand || '%'
        AND NEW.title ILIKE '%' || alert_rec.custom_model || '%'
      ) THEN CONTINUE; END IF;
    ELSE CONTINUE;
    END IF;

    -- 2. Price match
    CASE alert_rec.alert_type
      WHEN 'below' THEN
        IF NEW.price > alert_rec.target_price THEN CONTINUE; END IF;
      WHEN 'exact' THEN
        IF ABS(NEW.price - alert_rec.target_price) > 10 THEN CONTINUE; END IF;
      WHEN 'range' THEN
        IF NEW.price < alert_rec.price_range_min
           OR NEW.price > alert_rec.price_range_max THEN CONTINUE; END IF;
      ELSE CONTINUE;
    END CASE;

    -- 3. Condition preference
    IF array_length(alert_rec.condition_preference, 1) > 0
       AND NEW.condition IS NOT NULL
       AND NOT (NEW.condition = ANY(alert_rec.condition_preference))
    THEN CONTINUE; END IF;

    -- 4. Marketplace preference
    IF array_length(alert_rec.marketplace_preference, 1) > 0
       AND NOT (NEW.source = ANY(alert_rec.marketplace_preference))
    THEN CONTINUE; END IF;

    -- 5. Insert match (ON CONFLICT handles dedup)
    INSERT INTO alert_history (
      alert_id, user_id, listing_title, listing_price,
      listing_condition, listing_url, listing_source, triggered_at
    ) VALUES (
      alert_rec.id, alert_rec.user_id, NEW.title, NEW.price,
      NEW.condition, NEW.url, NEW.source, NOW()
    ) ON CONFLICT (alert_id, listing_url) DO NOTHING;

    -- 6. Bump trigger count only if new row was inserted
    IF FOUND THEN
      UPDATE price_alerts
      SET trigger_count = trigger_count + 1, last_triggered_at = NOW()
      WHERE id = alert_rec.id;
    END IF;

  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger (drop first if exists to allow re-running)
DROP TRIGGER IF EXISTS trg_match_new_listing ON used_listings;
CREATE TRIGGER trg_match_new_listing
  AFTER INSERT OR UPDATE ON used_listings
  FOR EACH ROW EXECUTE FUNCTION match_new_listing();
```

**Step 2: Apply the migration to the staging database**

Run against the Supabase staging instance via the SQL editor or CLI:
```bash
# If using Supabase CLI:
supabase db push
# Or apply directly via psql / Supabase SQL editor
```

**Step 3: Verify the trigger exists**

In Supabase SQL editor:
```sql
SELECT tgname, tgtype, tgenabled
FROM pg_trigger
WHERE tgrelid = 'used_listings'::regclass
  AND tgname = 'trg_match_new_listing';
```
Expected: One row with `tgname = 'trg_match_new_listing'`, `tgenabled = 'O'` (origin-enabled).

**Step 4: Smoke test the trigger**

Insert a test listing that should match an existing alert, then check `alert_history`:
```sql
-- Check what alerts exist to construct a matching test listing
SELECT id, component_id, target_price, alert_type FROM price_alerts WHERE is_active = true LIMIT 5;

-- Insert a test listing (adjust values to match an existing alert)
-- Then check:
SELECT * FROM alert_history ORDER BY triggered_at DESC LIMIT 5;

-- Clean up test data after verification
```

**Step 5: Commit**

```bash
git add supabase/migrations/20260227_server_side_alerts.sql
git commit -m "feat: add server-side alert matching trigger and schema changes"
```

---

## Task 2: Update TypeScript Types

**Files:**
- Modify: `src/types/auth.ts:60-88` (PriceAlert interface)
- Modify: `src/lib/alerts.ts:4-33` (PriceAlert interface)

**Step 1: Add email fields to PriceAlert in `src/types/auth.ts`**

Add after `updated_at: string` (line 77):
```typescript
  notification_frequency?: 'instant' | 'digest' | 'none'
  email_enabled?: boolean
```

**Step 2: Add email fields to PriceAlert in `src/lib/alerts.ts`**

Add after `updated_at: string` (line 21):
```typescript
  notification_frequency?: 'instant' | 'digest' | 'none'
  email_enabled?: boolean
```

**Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: No new errors.

**Step 4: Commit**

```bash
git add src/types/auth.ts src/lib/alerts.ts
git commit -m "feat: add notification_frequency and email_enabled to PriceAlert type"
```

---

## Task 3: Remove Client-Side `checkAlerts`

**Files:**
- Modify: `src/lib/alerts.ts:196-328` (delete `checkAlerts` function)
- Modify: `src/components/dashboard/AlertsTab.tsx:5` (remove import)
- Modify: `src/components/dashboard/AlertsTab.tsx:102` (remove call)

**Step 1: Delete `checkAlerts` function from `src/lib/alerts.ts`**

Remove lines 196-328 (the entire `export async function checkAlerts(userId: string)` function).

**Step 2: Remove `checkAlerts` from import in `AlertsTab.tsx`**

Line 5 — change:
```typescript
import { getUserAlerts, createAlert, updateAlert, deleteAlert, getAlertHistory, markAlertViewed, checkAlerts, PriceAlert, AlertHistory } from '@/lib/alerts'
```
To:
```typescript
import { getUserAlerts, createAlert, updateAlert, deleteAlert, getAlertHistory, markAlertViewed, PriceAlert, AlertHistory } from '@/lib/alerts'
```

**Step 3: Remove `checkAlerts` call from useEffect in `AlertsTab.tsx`**

Lines 98-104 — change:
```typescript
  useEffect(() => {
    if (session?.user?.id) {
      loadAlerts()
      loadHistory()
      checkAlerts(session.user.id)
    }
  }, [session?.user?.id, loadAlerts, loadHistory])
```
To:
```typescript
  useEffect(() => {
    if (session?.user?.id) {
      loadAlerts()
      loadHistory()
    }
  }, [session?.user?.id, loadAlerts, loadHistory])
```

**Step 4: Also remove `TriggeredAlert` import from `alerts.ts` if it was only used by `checkAlerts`**

Line 2 — check if `TriggeredAlert` is used anywhere else in the file. If not, remove the import:
```typescript
import { TriggeredAlert } from '@/types/auth'
```

**Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: No errors.

**Step 6: Commit**

```bash
git add src/lib/alerts.ts src/components/dashboard/AlertsTab.tsx
git commit -m "refactor: remove client-side checkAlerts, replaced by Postgres trigger"
```

---

## Task 4: Install Resend + React Email

**Files:**
- Modify: `package.json`

**Step 1: Install dependencies**

```bash
npm install resend @react-email/components react-email
```

**Step 2: Verify installation**

```bash
npx tsc --noEmit
```
Expected: No errors.

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "deps: add resend and react-email for alert notifications"
```

---

## Task 5: Create Email Template

**Files:**
- Create: `src/emails/alert-email.tsx`

**Step 1: Create the email template**

```tsx
import {
  Html,
  Head,
  Body,
  Container,
  Section,
  Text,
  Link,
  Hr,
  Preview,
} from '@react-email/components'

interface AlertMatch {
  listing_title: string
  listing_price: number
  listing_condition: string
  listing_source: string
  listing_url: string
  triggered_at: string
}

interface AlertEmailProps {
  matches: AlertMatch[]
  alertName: string
  unsubscribeUrl: string
}

export function AlertEmail({ matches, alertName, unsubscribeUrl }: AlertEmailProps) {
  const isDigest = matches.length > 1
  const subject = isDigest
    ? `${matches.length} new matches for "${alertName}"`
    : `Price alert: ${matches[0].listing_title}`

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(price)

  return (
    <Html>
      <Head />
      <Preview>{subject}</Preview>
      <Body style={{ backgroundColor: '#f4f4f5', fontFamily: 'sans-serif' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
          <Section style={{ backgroundColor: '#ffffff', borderRadius: '8px', padding: '24px' }}>
            <Text style={{ fontSize: '20px', fontWeight: 'bold', color: '#18181b', margin: '0 0 4px' }}>
              {isDigest ? `${matches.length} New Matches` : 'New Match Found'}
            </Text>
            <Text style={{ fontSize: '14px', color: '#71717a', margin: '0 0 24px' }}>
              Alert: {alertName}
            </Text>

            {matches.map((match, i) => (
              <Section key={i}>
                {i > 0 && <Hr style={{ borderColor: '#e4e4e7', margin: '16px 0' }} />}
                <Text style={{ fontSize: '16px', fontWeight: '600', color: '#18181b', margin: '0 0 4px' }}>
                  {match.listing_title}
                </Text>
                <Text style={{ fontSize: '14px', color: '#71717a', margin: '0 0 12px' }}>
                  {formatPrice(match.listing_price)} · {match.listing_condition} · {match.listing_source}
                </Text>
                <Link
                  href={match.listing_url}
                  style={{
                    display: 'inline-block',
                    backgroundColor: '#18181b',
                    color: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    textDecoration: 'none',
                  }}
                >
                  View Listing
                </Link>
              </Section>
            ))}
          </Section>

          <Section style={{ padding: '16px 0', textAlign: 'center' as const }}>
            <Text style={{ fontSize: '12px', color: '#a1a1aa', margin: '0' }}>
              You received this because you have email alerts enabled on{' '}
              <Link href="https://hifinder.app/dashboard" style={{ color: '#a1a1aa' }}>
                HiFinder
              </Link>
              .
            </Text>
            <Link
              href={unsubscribeUrl}
              style={{ fontSize: '12px', color: '#a1a1aa' }}
            >
              Unsubscribe from this alert
            </Link>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: No errors.

**Step 3: Commit**

```bash
git add src/emails/alert-email.tsx
git commit -m "feat: add React Email template for alert notifications"
```

---

## Task 6: Create Unsubscribe Token Utility

**Files:**
- Create: `src/lib/alert-tokens.ts`

**Step 1: Create the token utility**

```typescript
import crypto from 'crypto'

const SECRET = process.env.CRON_SECRET || ''

export function generateUnsubscribeToken(alertId: string): string {
  const hmac = crypto.createHmac('sha256', SECRET)
  hmac.update(alertId)
  const signature = hmac.digest('hex')
  // Base64-encode "alertId:signature" for URL safety
  return Buffer.from(`${alertId}:${signature}`).toString('base64url')
}

export function verifyUnsubscribeToken(token: string): string | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    const [alertId, signature] = decoded.split(':')
    if (!alertId || !signature) return null

    const hmac = crypto.createHmac('sha256', SECRET)
    hmac.update(alertId)
    const expected = hmac.digest('hex')

    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return alertId
    }
    return null
  } catch {
    return null
  }
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: No errors.

**Step 3: Commit**

```bash
git add src/lib/alert-tokens.ts
git commit -m "feat: add HMAC-signed unsubscribe token utility"
```

---

## Task 7: Create Notification Dispatcher API Route

**Files:**
- Create: `src/app/api/alerts/send-notifications/route.ts`

This is the route Vercel Cron calls every 5 minutes. It queries undelivered matches, groups by user, sends emails, and marks rows as sent.

**Step 1: Create the route**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'
import { AlertEmail } from '@/emails/alert-email'
import { generateUnsubscribeToken } from '@/lib/alert-tokens'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY)

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hifinder.app'

export async function POST(request: Request) {
  // Auth: verify cron secret
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 1. Fetch unsent matches joined with alert preferences and user email
  const { data: unsent, error } = await supabase
    .from('alert_history')
    .select(`
      id,
      alert_id,
      user_id,
      listing_title,
      listing_price,
      listing_condition,
      listing_url,
      listing_source,
      triggered_at,
      price_alerts!inner (
        id,
        email_enabled,
        notification_frequency,
        component_id,
        custom_search_query,
        custom_brand,
        custom_model,
        components (brand, name)
      )
    `)
    .eq('notification_sent', false)
    .eq('price_alerts.email_enabled', true)
    .order('triggered_at', { ascending: true })
    .limit(200)

  if (error) {
    console.error('Error fetching unsent alerts:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!unsent || unsent.length === 0) {
    return NextResponse.json({ sent: 0 })
  }

  // 2. Get user emails from auth.users via service role
  const userIds = [...new Set(unsent.map(u => u.user_id))]
  const userEmails: Record<string, string> = {}

  for (const userId of userIds) {
    const { data: userData } = await supabase.auth.admin.getUserById(userId)
    if (userData?.user?.email) {
      userEmails[userId] = userData.user.email
    }
  }

  // 3. Group matches by user + alert
  const grouped: Record<string, {
    alertId: string
    alertName: string
    email: string
    frequency: string
    matches: typeof unsent
  }> = {}

  for (const match of unsent) {
    const alert = match.price_alerts as Record<string, unknown>
    const alertId = alert.id as string
    const frequency = (alert.notification_frequency as string) || 'none'
    const email = userEmails[match.user_id]

    if (!email || frequency === 'none') continue

    const components = alert.components as { brand: string; name: string } | null
    const alertName = components
      ? `${components.brand} ${components.name}`
      : (alert.custom_search_query as string) || `${alert.custom_brand} ${alert.custom_model}`

    const key = `${match.user_id}:${alertId}`
    if (!grouped[key]) {
      grouped[key] = { alertId, alertName, email, frequency, matches: [] }
    }
    grouped[key].matches.push(match)
  }

  // 4. Send emails
  let sentCount = 0
  const sentIds: string[] = []

  for (const group of Object.values(grouped)) {
    const unsubscribeToken = generateUnsubscribeToken(group.alertId)
    const unsubscribeUrl = `${SITE_URL}/api/alerts/unsubscribe?token=${unsubscribeToken}`

    try {
      if (group.frequency === 'instant') {
        // One email per match
        for (const match of group.matches) {
          await resend.emails.send({
            from: 'HiFinder Alerts <alerts@hifinder.app>',
            to: group.email,
            subject: `Price alert: ${match.listing_title} — $${match.listing_price}`,
            react: AlertEmail({
              matches: [match],
              alertName: group.alertName,
              unsubscribeUrl,
            }),
            headers: {
              'List-Unsubscribe': `<${unsubscribeUrl}>`,
              'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
            },
          })
          sentIds.push(match.id)
          sentCount++
        }
      } else if (group.frequency === 'digest') {
        // One email with all matches
        await resend.emails.send({
          from: 'HiFinder Alerts <alerts@hifinder.app>',
          to: group.email,
          subject: `${group.matches.length} new match${group.matches.length > 1 ? 'es' : ''} for "${group.alertName}"`,
          react: AlertEmail({
            matches: group.matches,
            alertName: group.alertName,
            unsubscribeUrl,
          }),
          headers: {
            'List-Unsubscribe': `<${unsubscribeUrl}>`,
            'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
          },
        })
        sentIds.push(...group.matches.map(m => m.id))
        sentCount++
      }
    } catch (emailError) {
      console.error(`Failed to send email to ${group.email}:`, emailError)
    }
  }

  // 5. Mark as sent
  if (sentIds.length > 0) {
    await supabase
      .from('alert_history')
      .update({
        notification_sent: true,
        notification_sent_at: new Date().toISOString(),
      })
      .in('id', sentIds)
  }

  return NextResponse.json({ sent: sentCount, matched: sentIds.length })
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: No errors.

**Step 3: Commit**

```bash
git add src/app/api/alerts/send-notifications/route.ts
git commit -m "feat: add notification dispatcher API route for email alerts"
```

---

## Task 8: Create Unsubscribe API Route

**Files:**
- Create: `src/app/api/alerts/unsubscribe/route.ts`

**Step 1: Create the route**

```typescript
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { verifyUnsubscribeToken } from '@/lib/alert-tokens'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return new NextResponse('Missing token', { status: 400 })
  }

  const alertId = verifyUnsubscribeToken(token)
  if (!alertId) {
    return new NextResponse('Invalid or expired token', { status: 400 })
  }

  const { error } = await supabase
    .from('price_alerts')
    .update({ email_enabled: false })
    .eq('id', alertId)

  if (error) {
    console.error('Error unsubscribing:', error)
    return new NextResponse('Something went wrong', { status: 500 })
  }

  // Return a simple HTML page confirming unsubscribe
  return new NextResponse(
    `<!DOCTYPE html>
    <html><head><title>Unsubscribed</title></head>
    <body style="font-family:sans-serif;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;background:#f4f4f5">
      <div style="text-align:center;max-width:400px;padding:40px">
        <h1 style="font-size:24px;color:#18181b">Unsubscribed</h1>
        <p style="color:#71717a">You will no longer receive email notifications for this alert.</p>
        <a href="https://hifinder.app/dashboard" style="color:#18181b">Back to HiFinder</a>
      </div>
    </body></html>`,
    { headers: { 'Content-Type': 'text/html' } }
  )
}

// Also handle POST for one-click unsubscribe (RFC 8058)
export async function POST(request: Request) {
  return GET(request)
}
```

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```
Expected: No errors.

**Step 3: Commit**

```bash
git add src/app/api/alerts/unsubscribe/route.ts
git commit -m "feat: add unsubscribe route for email alert opt-out"
```

---

## Task 9: Add Vercel Cron Config

**Files:**
- Modify: `vercel.json`

**Step 1: Add `crons` array to `vercel.json`**

Add at the top level of the JSON object (after `"functions"` or before `"headers"`):

```json
"crons": [{
  "path": "/api/alerts/send-notifications",
  "schedule": "*/5 * * * *"
}],
```

**Step 2: Commit**

```bash
git add vercel.json
git commit -m "feat: add Vercel Cron job for alert email dispatch (every 5 min)"
```

---

## Task 10: Add Email Preference UI to AlertsTab

**Files:**
- Modify: `src/components/dashboard/AlertsTab.tsx`

**Step 1: Add email fields to `alertForm` state**

At line 70, add to the `alertForm` useState default:
```typescript
  const [alertForm, setAlertForm] = useState({
    target_price: '',
    alert_type: 'below' as 'below' | 'exact' | 'range',
    price_range_min: '',
    price_range_max: '',
    condition_preference: ['new', 'used', 'refurbished', 'b-stock'],
    marketplace_preference: ['reddit', 'headfi', 'avexchange'],
    custom_search_query: '',
    custom_brand: '',
    custom_model: '',
    email_enabled: false,
    notification_frequency: 'digest' as 'instant' | 'digest' | 'none',
  })
```

**Step 2: Add email fields to `resetForm`**

In `resetForm()` (around line 193), add to the reset object:
```typescript
    email_enabled: false,
    notification_frequency: 'digest' as 'instant' | 'digest' | 'none',
```

**Step 3: Add email fields to `handleCreateAlert`**

In `handleCreateAlert` (around line 126), add to `alertData`:
```typescript
    const alertData: Partial<PriceAlert> = {
      component_id: selectedComponent?.id,
      target_price: parseFloat(alertForm.target_price),
      alert_type: alertForm.alert_type,
      condition_preference: alertForm.condition_preference,
      marketplace_preference: alertForm.marketplace_preference,
      email_enabled: alertForm.email_enabled,
      notification_frequency: alertForm.email_enabled ? alertForm.notification_frequency : 'none',
    }
```

**Step 4: Add email notification section to the create modal**

Insert after the Marketplace Preferences section (after line 779, before the button row) in the create alert modal:

```tsx
              {/* Email Notifications */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Email Notifications
                </label>
                <div className="flex items-center gap-3 mb-3">
                  <button
                    type="button"
                    onClick={() => setAlertForm({ ...alertForm, email_enabled: !alertForm.email_enabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      alertForm.email_enabled ? 'bg-accent' : 'bg-surface-secondary'
                    }`}
                    role="switch"
                    aria-checked={alertForm.email_enabled}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        alertForm.email_enabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-sm text-muted">
                    {alertForm.email_enabled ? 'Email alerts enabled' : 'Email alerts disabled'}
                  </span>
                </div>

                {alertForm.email_enabled && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setAlertForm({ ...alertForm, notification_frequency: 'instant' })}
                      className={`px-3 py-1 rounded text-sm ${
                        alertForm.notification_frequency === 'instant'
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-surface-secondary text-muted'
                      }`}
                    >
                      Instant
                    </button>
                    <button
                      onClick={() => setAlertForm({ ...alertForm, notification_frequency: 'digest' })}
                      className={`px-3 py-1 rounded text-sm ${
                        alertForm.notification_frequency === 'digest'
                          ? 'bg-accent text-accent-foreground'
                          : 'bg-surface-secondary text-muted'
                      }`}
                    >
                      Digest (batched)
                    </button>
                  </div>
                )}
              </div>
```

**Step 5: Add email badge to the alert card display**

In the alert card (around line 370, after the trigger count badge), add:
```tsx
                          {alert.email_enabled && (
                            <span className="px-2 py-1 bg-blue-500/20 text-blue-500 text-xs rounded flex items-center gap-1">
                              <Bell className="w-3 h-3" />
                              {alert.notification_frequency === 'instant' ? 'Instant' : 'Digest'}
                            </span>
                          )}
```

**Step 6: Verify TypeScript compiles and dev server renders**

```bash
npx tsc --noEmit
npm run dev
```
Visit `/dashboard`, open the create alert modal, verify the email toggle and frequency buttons render and work.

**Step 7: Commit**

```bash
git add src/components/dashboard/AlertsTab.tsx
git commit -m "feat: add email notification preferences to alert creation UI"
```

---

## Task 11: Set Environment Variables

**Not a code task — manual Vercel configuration.**

1. Go to Vercel dashboard → HiFinder project → Settings → Environment Variables
2. Add:
   - `RESEND_API_KEY` — from Resend dashboard (create account first if needed)
   - `CRON_SECRET` — generate with `openssl rand -hex 32`
3. Add the same values to `.env.local` for local testing

Also:
- In Resend dashboard, add and verify `hifinder.app` domain
- Add the SPF and DKIM DNS records Resend provides

---

## Task 12: End-to-End Smoke Test

**Step 1: Test the trigger locally**

Create an alert via the UI, then run the Reddit scraper:
```bash
npm run scrape:reddit
```
Check the `alert_history` table in Supabase for new matches.

**Step 2: Test the email dispatcher locally**

```bash
curl -X POST http://localhost:3000/api/alerts/send-notifications \
  -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d= -f2)" \
  -H "Content-Type: application/json"
```
Expected: JSON response with `{ "sent": N, "matched": N }` and an email arrives.

**Step 3: Test unsubscribe**

Click the unsubscribe link in the received email. Verify:
- HTML page says "Unsubscribed"
- `price_alerts.email_enabled` is now `false` for that alert

**Step 4: Commit any fixes, then final commit**

```bash
git add -A
git commit -m "test: verify end-to-end alert matching and email flow"
```
