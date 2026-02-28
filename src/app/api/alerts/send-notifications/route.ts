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
    const alert = match.price_alerts as unknown as Record<string, unknown>
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
