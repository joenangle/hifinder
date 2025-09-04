-- Create user_stacks table for grouping gear into systems/setups
CREATE TABLE user_stacks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create stack_components table for linking gear items to stacks
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

-- Add RLS policies
ALTER TABLE user_stacks ENABLE ROW LEVEL SECURITY;
ALTER TABLE stack_components ENABLE ROW LEVEL SECURITY;

-- User can only see their own stacks
CREATE POLICY "Users can view own stacks" ON user_stacks
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own stacks" ON user_stacks  
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own stacks" ON user_stacks
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Users can delete own stacks" ON user_stacks
  FOR DELETE USING (user_id = auth.uid());

-- User can only manage stack components for their own stacks
CREATE POLICY "Users can view own stack components" ON stack_components
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_stacks 
      WHERE user_stacks.id = stack_components.stack_id 
      AND user_stacks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own stack components" ON stack_components
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_stacks 
      WHERE user_stacks.id = stack_components.stack_id 
      AND user_stacks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own stack components" ON stack_components
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_stacks 
      WHERE user_stacks.id = stack_components.stack_id 
      AND user_stacks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own stack components" ON stack_components
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM user_stacks 
      WHERE user_stacks.id = stack_components.stack_id 
      AND user_stacks.user_id = auth.uid()
    )
  );

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