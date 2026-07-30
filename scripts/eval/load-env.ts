/**
 * Env preloader for standalone eval scripts.
 *
 * Import this FIRST, before any module that reads process.env at import time.
 * `@/lib/supabase-server` builds its client (and throws on a missing service
 * key) during module evaluation, and in ESM sibling imports evaluate
 * top-to-bottom — so this side-effecting import must precede the route import.
 */
import { config } from 'dotenv'
import { existsSync } from 'fs'

// .env.local is Next's convention and wins; .env fills any gaps. dotenv does
// not override already-set vars, so loading .env.local first is sufficient.
// `quiet` suppresses dotenv v17's promo banner, which would otherwise corrupt
// the harness's --json output on stdout.
for (const file of ['.env.local', '.env']) {
  if (existsSync(file)) config({ path: file, quiet: true })
}
