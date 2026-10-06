import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'

/**
 * CRUD for the signed-in user's price alerts.
 *
 * price_alerts is RLS-locked to auth.uid(), which is always null under
 * NextAuth, so the browser cannot read or write it directly.
 */

const ALERT_SELECT = `
  *,
  components (
    id, name, brand, category, image_url, price_new, price_used_min, price_used_max
  )
`

const ALERT_TYPES = ['below', 'exact', 'range'] as const
const NOTIFICATION_FREQUENCIES = ['instant', 'digest', 'none'] as const

// Columns a user may set; everything else (user_id, trigger_count, ...) is server-owned
const WRITABLE_FIELDS = [
  'component_id',
  'target_price',
  'alert_type',
  'price_range_min',
  'price_range_max',
  'condition_preference',
  'marketplace_preference',
  'custom_search_query',
  'custom_brand',
  'custom_model',
  'notification_frequency',
  'email_enabled',
  'is_active',
] as const

type AlertFields = Partial<Record<(typeof WRITABLE_FIELDS)[number], unknown>>

/** Pick writable fields and validate them. Returns an error message on bad input. */
function parseAlertFields(body: Record<string, unknown>): { fields: AlertFields } | { error: string } {
  const fields: AlertFields = {}
  for (const key of WRITABLE_FIELDS) {
    if (body[key] !== undefined) fields[key] = body[key]
  }

  const isFiniteNonNegative = (v: unknown) => typeof v === 'number' && Number.isFinite(v) && v >= 0

  if (fields.target_price !== undefined && !isFiniteNonNegative(fields.target_price)) {
    return { error: 'target_price must be a non-negative number' }
  }
  for (const key of ['price_range_min', 'price_range_max'] as const) {
    if (fields[key] != null && !isFiniteNonNegative(fields[key])) {
      return { error: `${key} must be a non-negative number` }
    }
  }
  if (fields.alert_type !== undefined && !ALERT_TYPES.includes(fields.alert_type as never)) {
    return { error: 'Invalid alert_type' }
  }
  if (
    fields.notification_frequency !== undefined &&
    !NOTIFICATION_FREQUENCIES.includes(fields.notification_frequency as never)
  ) {
    return { error: 'Invalid notification_frequency' }
  }
  for (const key of ['email_enabled', 'is_active'] as const) {
    if (fields[key] !== undefined && typeof fields[key] !== 'boolean') {
      return { error: `${key} must be a boolean` }
    }
  }

  return { fields }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data, error } = await supabaseServer
      .from('price_alerts')
      .select(ALERT_SELECT)
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching price alerts:', error)
      return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
    }

    return NextResponse.json(data ?? [])
  } catch (error) {
    console.error('Error fetching price alerts:', error)
    return NextResponse.json({ error: 'Failed to fetch alerts' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const parsed = parseAlertFields(await request.json())
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }
    const { fields } = parsed

    if (fields.target_price === undefined) {
      return NextResponse.json({ error: 'target_price is required' }, { status: 400 })
    }
    if (!fields.component_id && !fields.custom_search_query && !fields.custom_model) {
      return NextResponse.json(
        { error: 'An alert needs a component or a custom search' },
        { status: 400 }
      )
    }

    const { data, error } = await supabaseServer
      .from('price_alerts')
      .insert({
        ...fields,
        user_id: session.user.id,
        is_active: true,
        trigger_count: 0,
      })
      .select(ALERT_SELECT)
      .single()

    if (error) {
      console.error('Error creating price alert:', error)
      return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating price alert:', error)
    return NextResponse.json({ error: 'Failed to create alert' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    if (!body.id) {
      return NextResponse.json({ error: 'Alert ID is required' }, { status: 400 })
    }

    const parsed = parseAlertFields(body)
    if ('error' in parsed) {
      return NextResponse.json({ error: parsed.error }, { status: 400 })
    }

    const { data, error } = await supabaseServer
      .from('price_alerts')
      .update(parsed.fields)
      .eq('id', body.id)
      .eq('user_id', session.user.id)
      .select('id')

    if (error) {
      console.error('Error updating price alert:', error)
      return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 })
    }
    if (!data?.length) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error updating price alert:', error)
    return NextResponse.json({ error: 'Failed to update alert' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const id = new URL(request.url).searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Alert ID is required' }, { status: 400 })
    }

    const { data, error } = await supabaseServer
      .from('price_alerts')
      .delete()
      .eq('id', id)
      .eq('user_id', session.user.id)
      .select('id')

    if (error) {
      console.error('Error deleting price alert:', error)
      return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 })
    }
    if (!data?.length) {
      return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting price alert:', error)
    return NextResponse.json({ error: 'Failed to delete alert' }, { status: 500 })
  }
}
