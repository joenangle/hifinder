import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('next-auth', () => ({
  getServerSession: vi.fn(() => Promise.resolve({ user: { id: 'user-123' } })),
}))
vi.mock('@/lib/auth', () => ({ authOptions: {} }))

const calls: Record<string, Array<{ method: string; args: unknown[] }>> = {}

function chain(table: string): unknown {
  const proxy: unknown = new Proxy(
    {},
    {
      get(_, method: string) {
        if (method === 'then') {
          return (resolve: (v: unknown) => void) => resolve({ data: [], count: 0, error: null })
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

describe('GET /api/user/activity stacks count', () => {
  it('excludes stereo stacks with .or(HEADPHONE_STACK_FILTER), keeping NULL-purpose rows', async () => {
    const response = await GET()
    expect(response.status).toBe(200)

    const stackCalls = calls['user_stacks']
    expect(stackCalls).toContainEqual({ method: 'or', args: [HEADPHONE_STACK_FILTER] })
    expect(stackCalls.some(c => c.method === 'neq')).toBe(false)
  })
})
