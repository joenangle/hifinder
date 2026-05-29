import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/auth'
import { supabaseServer } from '@/lib/supabase-server'

interface RegistryUser {
  id: string
  email: string | null
  name: string | null
  image: string | null
  provider: string | null
  created_at: string | null
  gearCount: number
  stacksCount: number
  wishlistCount: number
}

export async function GET() {
  try {
    // Protect endpoint
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access only' },
        { status: 401 }
      )
    }

    // Registered users (populated on login via the signIn upsert in auth.ts).
    const { data: users, error: usersError } = await supabaseServer
      .from('users')
      .select('id, email, name, image, provider, created_at')

    if (usersError) throw usersError

    // Activity tables are keyed by the Google OAuth sub (text user_id), the same
    // identifier used as users.id. Count per user so historical users who don't
    // yet have a users row still surface.
    const countByUser = async (table: 'user_gear' | 'user_stacks' | 'wishlists') => {
      const { data, error } = await supabaseServer.from(table).select('user_id')
      if (error) throw error
      return (data ?? []).reduce((acc, { user_id }) => {
        if (user_id) acc[user_id] = (acc[user_id] || 0) + 1
        return acc
      }, {} as Record<string, number>)
    }

    const [gear, stacks, wishlist] = await Promise.all([
      countByUser('user_gear'),
      countByUser('user_stacks'),
      countByUser('wishlists'),
    ])

    // Merge: union of every user_id seen across the users table and activity.
    const registry = new Map<string, RegistryUser>()

    for (const u of users ?? []) {
      registry.set(u.id, {
        id: u.id,
        email: u.email,
        name: u.name,
        image: u.image,
        provider: u.provider,
        created_at: u.created_at,
        gearCount: 0,
        stacksCount: 0,
        wishlistCount: 0,
      })
    }

    const ensure = (id: string): RegistryUser => {
      let entry = registry.get(id)
      if (!entry) {
        entry = {
          id,
          email: null,
          name: null,
          image: null,
          provider: null,
          created_at: null,
          gearCount: 0,
          stacksCount: 0,
          wishlistCount: 0,
        }
        registry.set(id, entry)
      }
      return entry
    }

    for (const [id, count] of Object.entries(gear)) ensure(id).gearCount = count
    for (const [id, count] of Object.entries(stacks)) ensure(id).stacksCount = count
    for (const [id, count] of Object.entries(wishlist)) ensure(id).wishlistCount = count

    const result = Array.from(registry.values()).sort((a, b) => {
      // Known signup date first (newest), then by total activity.
      if (a.created_at && b.created_at) return b.created_at.localeCompare(a.created_at)
      if (a.created_at) return -1
      if (b.created_at) return 1
      const activity = (u: RegistryUser) => u.gearCount + u.stacksCount + u.wishlistCount
      return activity(b) - activity(a)
    })

    return NextResponse.json({
      users: result,
      summary: {
        total: result.length,
        registered: (users ?? []).length,
      },
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    )
  }
}
