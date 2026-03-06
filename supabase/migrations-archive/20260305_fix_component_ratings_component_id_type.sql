-- Fix component_id type: was integer, should be uuid to match components.id
ALTER TABLE component_ratings ALTER COLUMN component_id TYPE uuid USING component_id::text::uuid;
