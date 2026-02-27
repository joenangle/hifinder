import { vi } from 'vitest'

/**
 * Creates a chainable Supabase query mock.
 * Every method returns `this` so chains like .from().select().eq().order() work.
 * Call `mockResolve(data)` or `mockReject(error)` to set the final return value.
 */
export function createSupabaseMock() {
  let resolvedValue: { data: unknown; error: unknown; count?: number | null } = {
    data: null,
    error: null,
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const queryBuilder: any = {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    gte: vi.fn().mockReturnThis(),
    lt: vi.fn().mockReturnThis(),
    lte: vi.fn().mockReturnThis(),
    like: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    or: vi.fn().mockReturnThis(),
    contains: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve(resolvedValue)),
    rpc: vi.fn(() => Promise.resolve(resolvedValue)),

    // Set the value that the terminal await resolves to
    _resolve(data: unknown, count?: number | null) {
      resolvedValue = { data, error: null, count: count ?? null }
      return queryBuilder
    },
    _reject(error: { message: string; code?: string }) {
      resolvedValue = { data: null, error }
      return queryBuilder
    },
    _reset() {
      resolvedValue = { data: null, error: null }
      for (const key of Object.keys(queryBuilder)) {
        if (key.startsWith('_')) continue
        ;(queryBuilder[key] as ReturnType<typeof vi.fn>).mockClear()
      }
      // Re-chain all methods
      for (const key of Object.keys(queryBuilder)) {
        if (key.startsWith('_') || key === 'single' || key === 'rpc') continue
        ;(queryBuilder[key] as ReturnType<typeof vi.fn>).mockReturnThis()
      }
      queryBuilder.single.mockImplementation(() => Promise.resolve(resolvedValue))
      queryBuilder.rpc.mockImplementation(() => Promise.resolve(resolvedValue))
      return queryBuilder
    },
  }

  // Make the query builder itself thenable so `await supabase.from(...).select(...)` works
  // Supabase's query builder resolves when awaited via .then()
  const handler: ProxyHandler<typeof queryBuilder> = {
    get(target, prop) {
      if (prop === 'then') {
        return (resolve: (v: unknown) => void) => resolve(resolvedValue)
      }
      return target[prop as string]
    },
  }

  return new Proxy(queryBuilder, handler)
}
