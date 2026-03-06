-- Simple stacks tables without complex auth references
-- Drop existing tables if they exist
DROP TABLE IF EXISTS stack_components CASCADE;
DROP TABLE IF EXISTS user_stacks CASCADE;

-- Create user_stacks table with simple string user_id
CREATE TABLE user_stacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL, -- Simple TEXT field for NextAuth user IDs
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stack_components table
CREATE TABLE stack_components (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  stack_id UUID NOT NULL REFERENCES user_stacks(id) ON DELETE CASCADE,
  user_gear_id UUID NOT NULL REFERENCES user_gear(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(stack_id, user_gear_id)
);

-- Add indexes for performance
CREATE INDEX idx_user_stacks_user_id ON user_stacks(user_id);
CREATE INDEX idx_user_stacks_created_at ON user_stacks(created_at);
CREATE INDEX idx_stack_components_stack_id ON stack_components(stack_id);
CREATE INDEX idx_stack_components_user_gear_id ON stack_components(user_gear_id);
CREATE INDEX idx_stack_components_position ON stack_components(stack_id, position);

-- Disable RLS for now to avoid auth complexity
-- We'll handle authorization in the application layer
ALTER TABLE user_stacks DISABLE ROW LEVEL SECURITY;
ALTER TABLE stack_components DISABLE ROW LEVEL SECURITY;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_stacks_updated_at BEFORE UPDATE ON user_stacks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE user_stacks IS 'User-created gear stacks/systems (e.g., Desktop Setup, Portable Rig)';
COMMENT ON TABLE stack_components IS 'Links gear items to stacks with positioning';
COMMENT ON COLUMN user_stacks.name IS 'User-defined name for the stack (e.g., "Desktop Setup")';
COMMENT ON COLUMN user_stacks.description IS 'Optional description of the stack/system';
COMMENT ON COLUMN stack_components.position IS 'Order of component within the stack (0-based)';