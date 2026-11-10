import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Supabase mock: per-table results, chainable, thenable ──────────────────

const tableResults: Record<string, { data: unknown; error: unknown }> = {}
const calls: { table: string; method: string; args: unknown[] }[] = []
const authAdminGetUserById = vi.fn()

function chain(table: string): unknown {
  return new Proxy(
    {},
    {
      get(_, prop: string) {
        if (prop === 'then') {
          const result = tableResults[table] ?? { data: null, error: null }
          return (resolve: (v: unknown) => void) => resolve(result)
        }
        return (...args: unknown[]) => {
          calls.push({ table, method: prop, args })
          return chain(table)
        }
      },
    }
  )
}

vi.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    from: (table: string) => chain(table),
    auth: { admin: { getUserById: authAdminGetUserById } },
  },
}))

const sendMock = vi.fn().mockResolvedValue({ data: { id: 'email-1' }, error: null })
vi.mock('resend', () => ({
  Resend: class {
    emails = { send: sendMock }
  },
}))

vi.mock('@/emails/alert-email', () => ({ AlertEmail: () => null }))

const GOOGLE_SUB = '107760000000000000001'

function match(overrides: Record<string, unknown> = {}) {
  return {
    id: 'hist-1',
    alert_id: 'alert-1',
    user_id: GOOGLE_SUB,
    listing_title: 'HD 650',
    listing_price: 250,
    listing_condition: 'used',
    listing_url: 'https://example.com/l/1',
    listing_source: 'reddit',
    triggered_at: '2026-11-07T00:00:00Z',
    price_alerts: {
      id: 'alert-1',
      email_enabled: true,
      notification_frequency: 'instant',
      components: { brand: 'Sennheiser', name: 'HD 650' },
    },
    ...overrides,
  }
}

async function callRoute() {
  const { POST } = await import('../route')
  return POST(
    new Request('http://localhost/api/alerts/send-notifications', {
      method: 'POST',
      headers: { authorization: 'Bearer test-cron' },
    })
  )
}

describe('POST /api/alerts/send-notifications', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-cron'
    calls.length = 0
    sendMock.mockClear()
    authAdminGetUserById.mockReset()
    for (const k of Object.keys(tableResults)) delete tableResults[k]
  })

  it('resolves recipients from public.users (Google sub ids), not Supabase Auth', async () => {
    tableResults.alert_history = { data: [match()], error: null }
    tableResults.users = { data: [{ id: GOOGLE_SUB, email: 'owner@example.com' }], error: null }
    tableResults.user_preferences = { data: [], error: null }

    const res = await callRoute()
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.sent).toBe(1)
    expect(sendMock).toHaveBeenCalledTimes(1)
    expect(sendMock.mock.calls[0][0].to).toBe('owner@example.com')
    expect(authAdminGetUserById).not.toHaveBeenCalled()
    expect(calls).toContainEqual({ table: 'users', method: 'in', args: ['id', [GOOGLE_SUB]] })
  })

  it('skips a match whose user has no email and leaves it unsent', async () => {
    tableResults.alert_history = { data: [match()], error: null }
    tableResults.users = { data: [], error: null }
    tableResults.user_preferences = { data: [], error: null }

    const body = await (await callRoute()).json()

    expect(body.sent).toBe(0)
    expect(sendMock).not.toHaveBeenCalled()
    expect(calls.some(c => c.table === 'alert_history' && c.method === 'update')).toBe(false)
  })

  it('returns a generic 500 when the recipient lookup fails', async () => {
    tableResults.alert_history = { data: [match()], error: null }
    tableResults.users = { data: null, error: { message: 'relation secret_internal_name does not exist' } }

    const res = await callRoute()
    const body = await res.json()

    expect(res.status).toBe(500)
    expect(JSON.stringify(body)).not.toContain('secret_internal_name')
  })

  it('rejects a wrong cron secret', async () => {
    const { POST } = await import('../route')
    const res = await POST(
      new Request('http://localhost/x', { method: 'POST', headers: { authorization: 'Bearer wrong' } })
    )
    expect(res.status).toBe(401)
  })
})
