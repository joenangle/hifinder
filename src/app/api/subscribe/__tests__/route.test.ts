import { describe, it, expect, vi, beforeEach } from 'vitest'

// vi.mock factories are hoisted, and the route builds its Resend client at
// import time, so shared mocks must be hoisted too
const { send, insert, lookupEmail, db } = vi.hoisted(() => ({
  send: vi.fn(),
  insert: vi.fn(() => Promise.resolve({ error: null })),
  lookupEmail: vi.fn(),
  db: { existingRow: null as Record<string, unknown> | null },
}))

// ── Resend mock ─────────────────────────────────────────────────────────────

vi.mock('resend', () => ({
  Resend: vi.fn(function () {
    return { emails: { send } }
  }),
}))

vi.mock('@/emails/subscribe-confirmation', () => ({
  SubscribeConfirmation: vi.fn(() => null),
}))

// ── Supabase mock ───────────────────────────────────────────────────────────

vi.mock('@/lib/supabase-server', () => ({
  supabaseServer: {
    from: () => ({
      select: () => ({
        eq: (_col: string, email: string) => ({
          maybeSingle: () => {
            lookupEmail(email)
            return Promise.resolve({ data: db.existingRow, error: null })
          },
        }),
      }),
      insert,
    }),
  },
}))

const { allow } = vi.hoisted(() => ({ allow: vi.fn() }))
vi.mock('@/lib/rate-limit', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/rate-limit')>()),
  isWithinRateLimit: allow,
}))

import { POST } from '../route'

function subscribe(body: unknown) {
  return POST(
    new Request('http://localhost/api/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  )
}

const valid = { email: 'Reader@Example.com ', source: 'bottom_cta_newsletter' }

beforeEach(() => {
  vi.clearAllMocks()
  allow.mockResolvedValue(true)
  db.existingRow = null
  send.mockResolvedValue({ data: { id: 'email-1' }, error: null })
})

describe('POST /api/subscribe', () => {
  it('creates an unconfirmed subscriber and sends a confirmation', async () => {
    const response = await subscribe(valid)

    expect(response.status).toBe(200)
    expect(lookupEmail).toHaveBeenCalledWith('reader@example.com')
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'reader@example.com', confirmed: false })
    )
    expect(send).toHaveBeenCalledOnce()
    expect(send.mock.calls[0][0].to).toBe('reader@example.com')
  })

  it('leaves a confirmed subscriber alone and sends nothing', async () => {
    // Previously the upsert reset confirmed=false and re-sent, so anyone could
    // un-confirm a subscriber and keep emailing them
    db.existingRow = { confirmed: true, confirmation_token: 'tok-1' }

    const response = await subscribe(valid)

    expect(response.status).toBe(200)
    expect(insert).not.toHaveBeenCalled()
    expect(send).not.toHaveBeenCalled()
  })

  it('re-sends to an unconfirmed subscriber with their existing token', async () => {
    db.existingRow = { confirmed: false, confirmation_token: 'tok-1' }

    const response = await subscribe(valid)

    expect(response.status).toBe(200)
    expect(insert).not.toHaveBeenCalled()
    expect(send).toHaveBeenCalledOnce()
    expect(JSON.stringify(send.mock.calls[0][0])).not.toContain('undefined')
  })

  it('reports a failed send instead of claiming success', async () => {
    send.mockResolvedValue({ data: null, error: { message: 'rate limited', name: 'rate_limit_exceeded' } })

    const response = await subscribe(valid)

    expect(response.status).toBe(502)
  })

  it.each<[Record<string, unknown>, string]>([
    [{ email: 'not-an-email', source: 'bottom_cta_newsletter' }, 'bad email'],
    [{ email: `${'a'.repeat(250)}@example.com`, source: 'bottom_cta_newsletter' }, 'over-long email'],
    [{ email: 'a@example.com', source: 'somewhere_else' }, 'unknown source'],
    [{ email: 42, source: 'bottom_cta_newsletter' }, 'non-string email'],
  ])('rejects %o (%s)', async (body) => {
    const response = await subscribe(body)

    expect(response.status).toBe(400)
    expect(send).not.toHaveBeenCalled()
  })
  it('returns 429 and sends nothing when rate limited', async () => {
    allow.mockResolvedValue(false)

    const response = await subscribe(valid)

    expect(response.status).toBe(429)
    expect(response.headers.get('Retry-After')).toBeTruthy()
    expect(insert).not.toHaveBeenCalled()
    expect(send).not.toHaveBeenCalled()
  })

  it('limits per IP and per address', async () => {
    await subscribe(valid)

    expect(allow).toHaveBeenCalledWith(expect.objectContaining({ name: 'subscribe:ip' }), expect.any(String))
    expect(allow).toHaveBeenCalledWith(expect.objectContaining({ name: 'subscribe:email' }), 'reader@example.com')
  })
})
