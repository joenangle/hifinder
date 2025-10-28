-- Database Index Analysis & Creation
-- Optimizes queries for better performance

-- ============================================
-- 1. INDEX AUDIT - Check existing indexes
-- ============================================

-- List all indexes on main tables
SELECT 
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes 
WHERE tablename IN ('components', 'user_gear', 'used_listings')
ORDER BY tablename, indexname;

-- Check index usage statistics (run after some app usage)
SELECT 
    schemaname,
    relname as tablename,
    indexrelname,
    idx_tup_read,
    idx_tup_fetch,
    idx_scan
FROM pg_stat_user_indexes 
WHERE relname IN ('components', 'user_gear', 'used_listings')
ORDER BY idx_scan DESC;

-- ============================================
-- 2. COMPONENTS TABLE INDEXES
-- ============================================

-- Index for category + budget tier filtering (recommendations page)
CREATE INDEX IF NOT EXISTS idx_components_category_budget 
ON components(category, budget_tier) 
WHERE price_new IS NOT NULL OR price_used_min IS NOT NULL;

-- Index for sound signature filtering
CREATE INDEX IF NOT EXISTS idx_components_sound_signature 
ON components(sound_signature, category);

-- Index for amplification needs filtering  
CREATE INDEX IF NOT EXISTS idx_components_needs_amp 
ON components(needs_amp, category) WHERE needs_amp = true;

-- Full text search index for component names/brands
CREATE INDEX IF NOT EXISTS idx_components_search 
ON components USING GIN(to_tsvector('english', name || ' ' || brand));

-- Index for price range queries
CREATE INDEX IF NOT EXISTS idx_components_price_range 
ON components(price_new, price_used_min, price_used_max) 
WHERE price_new IS NOT NULL OR price_used_min IS NOT NULL;

-- ============================================
-- 3. USER_GEAR TABLE INDEXES  
-- ============================================

-- Composite index for user gear filtering and sorting
CREATE INDEX IF NOT EXISTS idx_user_gear_user_created 
ON user_gear(user_id, created_at DESC);

-- Index for category filtering (gear page)
CREATE INDEX IF NOT EXISTS idx_user_gear_category_filter 
ON user_gear(user_id, component_id) 
INCLUDE (condition, purchase_price, purchase_date);

-- Index for purchase date range queries
CREATE INDEX IF NOT EXISTS idx_user_gear_purchase_date 
ON user_gear(user_id, purchase_date) 
WHERE purchase_date IS NOT NULL;

-- Index for value tracking queries
CREATE INDEX IF NOT EXISTS idx_user_gear_values 
ON user_gear(user_id, purchase_price, current_value) 
WHERE purchase_price IS NOT NULL OR current_value IS NOT NULL;

-- ============================================
-- 4. USED_LISTINGS TABLE INDEXES
-- ============================================

-- Index for active listings by component (recommendations page)
CREATE INDEX IF NOT EXISTS idx_used_listings_component_active 
ON used_listings(component_id, is_active, price) 
WHERE is_active = true;

-- Index for listing freshness cleanup
CREATE INDEX IF NOT EXISTS idx_used_listings_stale 
ON used_listings(created_at, is_active) 
WHERE is_active = true;

-- Index for source-based queries  
CREATE INDEX IF NOT EXISTS idx_used_listings_source_date 
ON used_listings(source, created_at DESC) 
WHERE is_active = true;

-- Index for price range filtering
CREATE INDEX IF NOT EXISTS idx_used_listings_price_condition 
ON used_listings(component_id, price, condition) 
WHERE is_active = true;

-- ============================================
-- 5. USER_WISHLIST TABLE INDEXES (SKIP - TABLE DOESN'T EXIST)
-- ============================================

-- These tables don't exist yet, skip this section
-- CREATE INDEX IF NOT EXISTS idx_user_wishlist_user_component 
-- ON user_wishlist(user_id, component_id);

-- ============================================
-- 6. PRICE_ALERTS TABLE INDEXES (SKIP - TABLE DOESN'T EXIST)
-- ============================================

-- These tables don't exist yet, skip this section
-- CREATE INDEX IF NOT EXISTS idx_price_alerts_active 
-- ON price_alerts(is_active, component_id) 
-- WHERE is_active = true;

-- ============================================
-- 7. STACK TABLES INDEXES (if tables exist)
-- ============================================

-- These should already exist from the migration, but let's ensure they're optimal
CREATE INDEX IF NOT EXISTS idx_user_stacks_user_updated 
ON user_stacks(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_stack_components_stack_position 
ON stack_components(stack_id, position ASC);

-- ============================================
-- 8. QUERY PERFORMANCE ANALYSIS
-- ============================================

-- Analyze table statistics after index creation
ANALYZE components;
ANALYZE user_gear; 
ANALYZE used_listings;
ANALYZE user_wishlist;
ANALYZE price_alerts;

-- Check table sizes and index sizes
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size
FROM pg_tables 
WHERE tablename IN ('components', 'user_gear', 'used_listings')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================
-- 9. MAINTENANCE RECOMMENDATIONS
-- ============================================

-- Set up automatic statistics collection (already default in modern PostgreSQL)
-- Consider running VACUUM ANALYZE periodically on high-write tables

-- Monitor slow queries with this view:
CREATE OR REPLACE VIEW slow_queries AS
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    rows,
    100.0 * shared_blks_hit / nullif(shared_blks_hit + shared_blks_read, 0) AS hit_percent
FROM pg_stat_statements 
WHERE total_time > 1000 -- queries taking more than 1 second total
ORDER BY total_time DESC
LIMIT 20;