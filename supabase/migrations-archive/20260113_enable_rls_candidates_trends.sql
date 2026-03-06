-- Enable RLS on new_component_candidates and price_trends tables
-- Defense-in-depth security to prevent accidental client-side exposure
-- Service role key access (used in API routes/scripts) bypasses these policies

-- ============================================================
-- Table: new_component_candidates (Admin workflow table)
-- ============================================================

ALTER TABLE new_component_candidates ENABLE ROW LEVEL SECURITY;

-- Policy 1: Admin can read all component candidates
CREATE POLICY "Admin can view all component candidates"
  ON new_component_candidates
  FOR SELECT
  USING (
    auth.jwt() ->> 'email' = 'joenangle@gmail.com'
  );

-- Policy 2: Admin can insert component candidates
CREATE POLICY "Admin can create component candidates"
  ON new_component_candidates
  FOR INSERT
  WITH CHECK (
    auth.jwt() ->> 'email' = 'joenangle@gmail.com'
  );

-- Policy 3: Admin can update component candidates
CREATE POLICY "Admin can update component candidates"
  ON new_component_candidates
  FOR UPDATE
  USING (
    auth.jwt() ->> 'email' = 'joenangle@gmail.com'
  );

-- Policy 4: Admin can delete component candidates
CREATE POLICY "Admin can delete component candidates"
  ON new_component_candidates
  FOR DELETE
  USING (
    auth.jwt() ->> 'email' = 'joenangle@gmail.com'
  );

-- ============================================================
-- Table: price_trends (Analytics table)
-- ============================================================

ALTER TABLE price_trends ENABLE ROW LEVEL SECURITY;

-- Policy 1: Anyone can read price trends (public market data)
CREATE POLICY "Anyone can view price trends"
  ON price_trends
  FOR SELECT
  USING (true);

-- Policy 2: Only admin can insert/update price trends (via scripts)
CREATE POLICY "Admin can manage price trends"
  ON price_trends
  FOR ALL
  USING (
    auth.jwt() ->> 'email' = 'joenangle@gmail.com'
  );

-- ============================================================
-- Documentation
-- ============================================================

COMMENT ON POLICY "Admin can view all component candidates" ON new_component_candidates
  IS 'Restricts read access to admin email only - prevents accidental client-side exposure of internal workflow data';

COMMENT ON POLICY "Anyone can view price trends" ON price_trends
  IS 'Public read access - pricing data will be exposed via recommendations API and is derived from public marketplace listings';
