-- Stereo Builder v1: a stereo system is a user_stacks row with purpose = 'stereo'.
--
-- user_stacks:      system_profile JSONB (room, listening distance, ...)
-- stack_components: role (speakers | amp | sub | source), spec_overrides JSONB,
--                   and custom_brand / custom_name / custom_category for items
--                   that are not in the catalogue or the user's gear.
--
-- Pre-flight, checked read-only against the live DB on 2026-11-03:
--   * stack_components rows with BOTH user_gear_id and component_id: 0
--   * user_stacks rows: 4, two with a NULL purpose (hence HEADPHONE_STACK_FILTER
--     in src/lib/stacks.ts: a plain neq('purpose','stereo') would drop them)
--   * existing check: stack_component_has_reference
--       CHECK ((user_gear_id IS NOT NULL) OR (component_id IS NOT NULL))
--   * existing FK: stack_components_component_id_fkey
--
-- Deviation from the PRD's "exactly one reference": only custom items are forced
-- to stand alone (stack_component_custom_is_alone). Rows carrying both
-- user_gear_id and component_id stay legal, because existing write paths were not
-- audited even though the live count is 0.
--
-- Apply: npm run db -- -f migrations/add-stereo-stacks.sql
-- Then:  npm run db:types   (src/types/supabase.ts was hand-edited to match; expect a no-op diff)

BEGIN;

ALTER TABLE user_stacks
  ADD COLUMN system_profile JSONB;

ALTER TABLE stack_components
  ADD COLUMN role TEXT CHECK (role IN ('speakers', 'amp', 'sub', 'source')),
  ADD COLUMN spec_overrides JSONB,
  ADD COLUMN custom_brand TEXT,
  ADD COLUMN custom_name TEXT,
  ADD COLUMN custom_category TEXT;

-- A row must reference something: gear, a catalogue component, or a custom item.
ALTER TABLE stack_components DROP CONSTRAINT stack_component_has_reference;
ALTER TABLE stack_components
  ADD CONSTRAINT stack_component_has_reference
  CHECK (user_gear_id IS NOT NULL OR component_id IS NOT NULL OR custom_name IS NOT NULL);

-- A custom item references nothing else.
ALTER TABLE stack_components
  ADD CONSTRAINT stack_component_custom_is_alone
  CHECK (custom_name IS NULL OR (user_gear_id IS NULL AND component_id IS NULL));

-- One component per role per stack (rows without a role, i.e. headphone stacks, are exempt).
CREATE UNIQUE INDEX idx_stack_components_stack_role
  ON stack_components (stack_id, role)
  WHERE role IS NOT NULL;

COMMIT;
