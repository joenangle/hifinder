-- Enhanced User Gear Schema Migration
-- Adds missing fields for comprehensive gear tracking

-- ============================================
-- 1. ADD NEW COLUMNS TO user_gear
-- ============================================

-- Add purchase location tracking
ALTER TABLE user_gear 
ADD COLUMN IF NOT EXISTS purchase_location VARCHAR(255);

-- Add serial number tracking  
ALTER TABLE user_gear 
ADD COLUMN IF NOT EXISTS serial_number VARCHAR(100);

-- Add loan tracking
ALTER TABLE user_gear 
ADD COLUMN IF NOT EXISTS is_loaned BOOLEAN DEFAULT FALSE;

-- Add loan details
ALTER TABLE user_gear 
ADD COLUMN IF NOT EXISTS loaned_to VARCHAR(255);

-- Add loan date
ALTER TABLE user_gear 
ADD COLUMN IF NOT EXISTS loaned_date DATE;

-- Add current estimated value
ALTER TABLE user_gear 
ADD COLUMN IF NOT EXISTS current_value DECIMAL(10,2);

-- Add custom brand/name for non-database items
ALTER TABLE user_gear 
ADD COLUMN IF NOT EXISTS custom_brand VARCHAR(255);

ALTER TABLE user_gear 
ADD COLUMN IF NOT EXISTS custom_name VARCHAR(255);

-- Add custom category for non-database items  
ALTER TABLE user_gear 
ADD COLUMN IF NOT EXISTS custom_category VARCHAR(50);

-- Add updated_at timestamp
ALTER TABLE user_gear 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- ============================================
-- 2. UPDATE CONDITION CONSTRAINT
-- ============================================

-- Drop existing condition constraint if it exists
ALTER TABLE user_gear 
DROP CONSTRAINT IF EXISTS user_gear_condition_check;

-- Add updated constraint with all condition values
ALTER TABLE user_gear 
ADD CONSTRAINT user_gear_condition_check 
CHECK (condition IN ('new', 'used', 'refurbished', 'b-stock', 'excellent', 'very_good', 'good', 'fair'));

-- ============================================
-- 3. ADD UPDATED_AT TRIGGER
-- ============================================

-- Create trigger to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_gear_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_user_gear_updated_at ON user_gear;
CREATE TRIGGER update_user_gear_updated_at 
    BEFORE UPDATE ON user_gear
    FOR EACH ROW 
    EXECUTE FUNCTION update_user_gear_updated_at();

-- ============================================
-- 4. ADD INDEXES FOR PERFORMANCE
-- ============================================

-- Index for loan status queries
CREATE INDEX IF NOT EXISTS idx_user_gear_is_loaned 
ON user_gear(user_id, is_loaned) WHERE is_loaned = true;

-- Index for custom items (non-database components)
CREATE INDEX IF NOT EXISTS idx_user_gear_custom 
ON user_gear(user_id, custom_category) WHERE custom_category IS NOT NULL;

-- Index for purchase date queries
CREATE INDEX IF NOT EXISTS idx_user_gear_purchase_date 
ON user_gear(user_id, purchase_date) WHERE purchase_date IS NOT NULL;

-- Composite index for filtering and sorting
CREATE INDEX IF NOT EXISTS idx_user_gear_user_updated 
ON user_gear(user_id, updated_at DESC);

-- ============================================
-- 5. ADD COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN user_gear.purchase_location IS 'Where the item was purchased (e.g., Amazon, eBay, local store)';
COMMENT ON COLUMN user_gear.serial_number IS 'Serial number for warranty/identification purposes';
COMMENT ON COLUMN user_gear.is_loaned IS 'Whether this item is currently loaned to someone';
COMMENT ON COLUMN user_gear.loaned_to IS 'Name/identifier of person item is loaned to';
COMMENT ON COLUMN user_gear.loaned_date IS 'Date the item was loaned out';
COMMENT ON COLUMN user_gear.current_value IS 'Current estimated market value';
COMMENT ON COLUMN user_gear.custom_brand IS 'Brand name for items not in components database';
COMMENT ON COLUMN user_gear.custom_name IS 'Model name for items not in components database';
COMMENT ON COLUMN user_gear.custom_category IS 'Category for items not in components database';

-- ============================================
-- 6. DATA MIGRATION HELPERS
-- ============================================

-- Set updated_at for existing records
UPDATE user_gear 
SET updated_at = created_at 
WHERE updated_at IS NULL;

-- Example: Auto-detect likely custom items (you may need to adjust this)
-- UPDATE user_gear 
-- SET custom_category = 'headphones'
-- WHERE component_id IS NULL AND custom_category IS NULL;

-- Verify the migration
SELECT 
    COUNT(*) as total_records,
    COUNT(purchase_location) as has_purchase_location,
    COUNT(serial_number) as has_serial_number,
    COUNT(CASE WHEN is_loaned THEN 1 END) as loaned_items,
    COUNT(current_value) as has_current_value,
    COUNT(custom_brand) as custom_items
FROM user_gear;