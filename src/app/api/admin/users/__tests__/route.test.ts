import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/auth', () => ({
  requireAdmin: vi.fn(() => Promise.resolve({ user: { id: 'admin' } })),
}))

const calls: Record<string, Array<{ method: string; args: unknown[] }>> = {}

function chain(table: string): unknown {
  const proxy: unknown = new Proxy(
    {},
    {
      get(_, method: string) {
        if (method === 'then') {
          return (resolve: (v: unknown) => void) => resolve({ data: [], error: null })
        }
        return (...args: unknown[]) => {
          ;(calls[table] ??= []).push({ method, args })
          return proxy
        }
      },
    }
  )
  return proxy
}

vi.mock('@/lib/supabase-server', () => ({
  supabaseServer: { from: (table: string) => chain(table) },
}))

import { GET } from '../route'
import { HEADPHONE_STACK_FILTER } from '@/lib/stacks'

beforeEach(() => {
  for (const k of Object.keys(calls)) delete calls[k]
})

describe('GET /api/admin/users stack counts', () => {
  it('counts only headphone stacks, via .or(HEADPHONE_STACK_FILTER)', async () => {
    const response = await GET()
    expect(response.status).toBe(200)

    const stackCalls = calls['user_stacks']
    expect(stackCalls).toContainEqual({ method: 'or', args: [HEADPHONE_STACK_FILTER] })
    expect(stackCalls.some(c => c.method === 'neq')).toBe(false)
    // Other tables must not be filtered by purpose.
    expect(calls['user_gear'].some(c => c.method === 'or')).toBe(false)
  })
})
