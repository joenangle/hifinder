import { NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'
import { Resend } from 'resend'
import { randomUUID } from 'crypto'
import { SubscribeConfirmation } from '@/emails/subscribe-confirmation'

const resend = new Resend(process.env.RESEND_API_KEY)
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hifinder.app'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const VALID_SOURCES = ['feature_card_guide', 'bottom_cta_newsletter'] as const

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, source } = body as { email?: string; source?: string }

    if (!email || !EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    if (!source || !VALID_SOURCES.includes(source as (typeof VALID_SOURCES)[number])) {
      return NextResponse.json({ error: 'Invalid source' }, { status: 400 })
    }

    const confirmationToken = randomUUID()

    const { error: upsertError } = await supabase
      .from('email_subscribers')
      .upsert(
        {
          email: email.toLowerCase().trim(),
          source,
          confirmation_token: confirmationToken,
          confirmed: false,
          confirmed_at: null,
        },
        { onConflict: 'email' }
      )

    if (upsertError) {
      console.error('Upsert error:', upsertError)
      return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 })
    }

    const confirmUrl = `${SITE_URL}/api/subscribe/confirm?token=${confirmationToken}`

    await resend.emails.send({
      from: 'HiFinder <hello@hifinder.app>',
      to: email.toLowerCase().trim(),
      subject: 'Confirm your HiFinder subscription',
      react: SubscribeConfirmation({ confirmUrl }),
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Subscribe error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
