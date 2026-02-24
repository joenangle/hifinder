-- Allow stack_components to reference components directly (not just user_gear)
-- This enables saving stacks from the recommendations page without requiring
-- the user to first add items to their gear collection.

-- Add component_id column
ALTER TABLE stack_components ADD COLUMN component_id UUID REFERENCES components(id) ON DELETE SET NULL;

-- Make user_gear_id nullable (was NOT NULL before)
ALTER TABLE stack_components ALTER COLUMN user_gear_id DROP NOT NULL;

-- Ensure at least one reference exists
ALTER TABLE stack_components ADD CONSTRAINT stack_component_has_reference
  CHECK (user_gear_id IS NOT NULL OR component_id IS NOT NULL);

-- Add index for component_id lookups
CREATE INDEX idx_stack_components_component_id ON stack_components(component_id);

-- Add unique constraint for component_id within a stack (prevent duplicates)
CREATE UNIQUE INDEX idx_stack_components_stack_component_unique
  ON stack_components(stack_id, component_id) WHERE component_id IS NOT NULL;

COMMENT ON COLUMN stack_components.component_id IS 'Direct reference to a component (used for recommendation-based stacks)';
