-- public.users.id was uuid but identity is the Google OAuth sub (text).
-- Align it with user_gear/user_stacks/wishlists.user_id (already text) so the
-- signIn upsert in src/lib/auth.ts stops failing.

-- The only FKs to users.id are from the unused, empty accounts/sessions tables
-- (JWT session strategy means they're never written). Drop them.
ALTER TABLE accounts DROP CONSTRAINT IF EXISTS accounts_user_id_fkey;
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;

-- Change users.id uuid -> text (table is empty, so the cast is trivial).
ALTER TABLE users ALTER COLUMN id DROP DEFAULT;        -- was gen_random_uuid()
ALTER TABLE users ALTER COLUMN id TYPE text USING id::text;

-- Add the provider column the upsert already writes.
ALTER TABLE users ADD COLUMN IF NOT EXISTS provider text;
