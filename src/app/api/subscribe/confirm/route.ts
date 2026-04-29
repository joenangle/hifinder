import { NextResponse } from 'next/server'
import { supabaseServer as supabase } from '@/lib/supabase-server'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://hifinder.app'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(`${SITE_URL}/?confirmed=already`)
  }

  const { data, error } = await supabase
    .from('email_subscribers')
    .select('id, confirmed')
    .eq('confirmation_token', token)
    .single()

  if (error || !data) {
    return NextResponse.redirect(`${SITE_URL}/?confirmed=already`)
  }

  if (data.confirmed) {
    return NextResponse.redirect(`${SITE_URL}/?confirmed=already`)
  }

  const { error: updateError } = await supabase
    .from('email_subscribers')
    .update({
      confirmed: true,
      confirmed_at: new Date().toISOString(),
    })
    .eq('id', data.id)

  if (updateError) {
    console.error('Confirmation update error:', updateError)
    return NextResponse.redirect(`${SITE_URL}/?confirmed=already`)
  }

  return NextResponse.redirect(`${SITE_URL}/?confirmed=1`)
}
