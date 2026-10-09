import { NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import { Resend } from 'resend'
import { randomUUID } from 'crypto'
import { SubscribeConfirmation } from '@/emails/subscribe-confirmation'

const resend = new Resend(process.env.RESEND_API_KEY)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hifinder.app'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VALID_SOURCES = ['feature_card_guide', 'bottom_cta_newsletter'] as const

// RFC 5321 caps a forward-path at 256 octets including the angle brackets
const MAX_EMAIL_LENGTH = 254

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email: rawEmail, source } = body as { email?: unknown; source?: unknown }

    const email = typeof rawEmail === 'string' ? rawEmail.trim().toLowerCase() : ''
    if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    if (typeof source !== 'string' || !VALID_SOURCES.includes(source as (typeof VALID_SOURCES)[number])) {
      return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
    }

    const { data: existing, error: lookupError } = await supabase
      .from('email_subscribers')
      .select('confirmed, confirmation_token')
      .eq('email', email)
      .maybeSingle()

    if (lookupError) {
      console.error('Subscriber lookup error:', lookupError)
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
    }

    // Already confirmed: nothing to do. Answer exactly like a new signup so the
    // endpoint doesn't reveal who is subscribed, and don't email them again
    // (re-subscribing used to reset confirmed=false and re-send).
    if (existing?.confirmed) {
      return NextResponse.json({ success: true })
    }

    // Unconfirmed: re-send with their existing token so earlier links still work
    const confirmationToken = existing?.confirmation_token ?? randomUUID()
    if (!existing) {
      const { error: insertError } = await supabase.from('email_subscribers').insert({
        email,
        source,
        confirmation_token: confirmationToken,
        confirmed: false,
      })

      if (insertError) {
        console.error('Insert error:', insertError)
        return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
      }
    }

    const confirmUrl = `${SITE_URL}/api/subscribe/confirm?token=${confirmationToken}`

    // Resend reports failures in the result rather than throwing
    const { error: sendError } = await resend.emails.send({
      from: 'HiFinder <hello@hifinder.app>',
      to: email,
      subject: 'Confirm your HiFinder subscription',
      react: SubscribeConfirmation({ confirmUrl }),
    })

    if (sendError) {
      console.error('Confirmation email failed:', sendError)
      return NextResponse.json(
        { error: 'Could not send the confirmation email. Please try again later.' },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Subscribe error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
