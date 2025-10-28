-- Database Health Monitoring Queries  
-- Save these as named queries in Supabase for ongoing monitoring

-- ============================================
-- 1. DATA GROWTH TRACKING
-- ============================================

-- Daily user registration and gear addition rates
CREATE OR REPLACE VIEW daily_growth_stats AS
SELECT 
    date_trunc('day', created_at) as date,
    'users' as metric,
    COUNT(*) as count
FROM auth.users 
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY date_trunc('day', created_at)

UNION ALL

SELECT 
    date_trunc('day', created_at) as date,
    'user_gear' as metric, 
    COUNT(*) as count
FROM user_gear
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY date_trunc('day', created_at)

UNION ALL

SELECT 
    date_trunc('day', created_at) as date,
    'used_listings' as metric,
    COUNT(*) as count  
FROM used_listings
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY date_trunc('day', created_at)

ORDER BY date DESC, metric;

-- ============================================
-- 2. DATA QUALITY DASHBOARD
-- ============================================

CREATE OR REPLACE VIEW data_quality_summary AS
SELECT 
    'Components with images' as metric,
    COUNT(CASE WHEN image_url IS NOT NULL THEN 1 END) as good_count,
    COUNT(*) as total_count,
    ROUND((COUNT(CASE WHEN image_url IS NOT NULL THEN 1 END)::float / COUNT(*) * 100)::numeric, 1) as percentage
FROM components

UNION ALL

SELECT 
    'Components with complete pricing',
    COUNT(CASE WHEN price_new IS NOT NULL OR (price_used_min IS NOT NULL AND price_used_max IS NOT NULL) THEN 1 END),
    COUNT(*),
    ROUND((COUNT(CASE WHEN price_new IS NOT NULL OR (price_used_min IS NOT NULL AND price_used_max IS NOT NULL) THEN 1 END)::float / COUNT(*) * 100)::numeric, 1)
FROM components

UNION ALL

SELECT 
    'User gear with purchase price',
    COUNT(CASE WHEN purchase_price IS NOT NULL THEN 1 END),
    COUNT(*),
    ROUND((COUNT(CASE WHEN purchase_price IS NOT NULL THEN 1 END)::float / COUNT(*) * 100)::numeric, 1)
FROM user_gear

UNION ALL

SELECT 
    'Active used listings',
    COUNT(CASE WHEN is_active = true THEN 1 END),
    COUNT(*),
    ROUND((COUNT(CASE WHEN is_active = true THEN 1 END)::float / COUNT(*) * 100)::numeric, 1)
FROM used_listings

UNION ALL

SELECT 
    'Recent used listings (< 30 days)',
    COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' AND is_active = true THEN 1 END),
    COUNT(CASE WHEN is_active = true THEN 1 END),
    ROUND((COUNT(CASE WHEN created_at > NOW() - INTERVAL '30 days' AND is_active = true THEN 1 END)::float / NULLIF(COUNT(CASE WHEN is_active = true THEN 1 END), 0) * 100)::numeric, 1)
FROM used_listings;

-- ============================================
-- 3. USER ENGAGEMENT METRICS
-- ============================================

CREATE OR REPLACE VIEW user_engagement_stats AS
SELECT 
    'Total users' as metric,
    COUNT(DISTINCT id)::text as value
FROM auth.users

UNION ALL

SELECT 
    'Active users (have gear)',
    COUNT(DISTINCT user_id)::text
FROM user_gear

UNION ALL

SELECT 
    'Active users (last 30 days)',
    COUNT(DISTINCT user_id)::text
FROM user_gear 
WHERE created_at > NOW() - INTERVAL '30 days'

UNION ALL

SELECT 
    'Avg gear per user',
    ROUND((COUNT(*)::float / COUNT(DISTINCT user_id))::numeric, 1)::text
FROM user_gear

-- Commented out since these tables don't exist yet
-- UNION ALL
-- SELECT 
--     'Users with wishlist items', 
--     COUNT(DISTINCT user_id)::text
-- FROM user_wishlist
-- UNION ALL
-- SELECT 
--     'Users with price alerts',
--     COUNT(DISTINCT user_id)::text  
-- FROM price_alerts
-- WHERE is_active = true;

-- ============================================
-- 4. SYSTEM PERFORMANCE METRICS
-- ============================================

-- Query to check database size and growth
CREATE OR REPLACE VIEW database_size_stats AS
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename))) as total_size,
    pg_size_pretty(pg_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename))) as table_size,
    pg_size_pretty(pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename)) - pg_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename))) as index_size
FROM pg_tables 
WHERE schemaname NOT IN ('information_schema', 'pg_catalog')
ORDER BY pg_total_relation_size(quote_ident(schemaname)||'.'||quote_ident(tablename)) DESC;

-- ============================================
-- 5. BUSINESS METRICS DASHBOARD
-- ============================================

CREATE OR REPLACE VIEW business_metrics AS
SELECT 
    'Total components in database' as metric,
    COUNT(*)::text as value,
    'Components' as category
FROM components

UNION ALL

SELECT 
    'Most popular category',
    category::text,
    'Categories'
FROM (
    SELECT category, COUNT(*) as count
    FROM user_gear ug 
    JOIN components c ON ug.component_id = c.id
    GROUP BY category
    ORDER BY count DESC
    LIMIT 1
) t

UNION ALL

SELECT 
    'Total collection value',
    '$' || COALESCE(SUM(purchase_price), 0)::text,
    'Financial'
FROM user_gear
WHERE purchase_price IS NOT NULL

UNION ALL

SELECT 
    'Avg item cost',
    '$' || ROUND(AVG(purchase_price)::numeric, 0)::text,
    'Financial'  
FROM user_gear
WHERE purchase_price IS NOT NULL

UNION ALL

SELECT 
    'Most expensive category (avg)',
    c.category || ' ($' || ROUND(AVG(ug.purchase_price)::numeric, 0) || ')',
    'Categories'
FROM user_gear ug
JOIN components c ON ug.component_id = c.id
WHERE ug.purchase_price IS NOT NULL
GROUP BY c.category
ORDER BY AVG(ug.purchase_price) DESC
LIMIT 1;

-- ============================================
-- 6. ALERT CONDITIONS (for monitoring)
-- ============================================

-- Create a view for potential issues that need attention
CREATE OR REPLACE VIEW system_health_alerts AS
SELECT 
    'Stale used listings' as alert_type,
    COUNT(*) as count,
    'warning' as severity,
    'Found ' || COUNT(*) || ' active listings older than 30 days' as message
FROM used_listings 
WHERE is_active = true AND created_at < NOW() - INTERVAL '30 days'
HAVING COUNT(*) > 100

UNION ALL

SELECT 
    'Orphaned user gear',
    COUNT(*),
    'error',
    'Found ' || COUNT(*) || ' user gear items referencing non-existent components'
FROM user_gear ug
LEFT JOIN components c ON ug.component_id = c.id
WHERE c.id IS NULL
HAVING COUNT(*) > 0

UNION ALL

SELECT 
    'Missing component images',
    COUNT(*),
    'info', 
    ROUND((COUNT(*)::float / (SELECT COUNT(*) FROM components) * 100)::numeric, 1) || '% of components missing images'
FROM components
WHERE image_url IS NULL
HAVING COUNT(*) > (SELECT COUNT(*) * 0.5 FROM components)

UNION ALL

SELECT 
    'Large table growth',
    COUNT(*),
    'info',
    'User gear grew by ' || COUNT(*) || ' items in last 7 days'
FROM user_gear
WHERE created_at > NOW() - INTERVAL '7 days' 
HAVING COUNT(*) > 100;

-- ============================================  
-- 7. QUICK HEALTH CHECK QUERY
-- ============================================

-- Single query for daily health check
CREATE OR REPLACE VIEW daily_health_check AS
SELECT 
    NOW()::date as check_date,
    (SELECT COUNT(*) FROM auth.users) as total_users,
    (SELECT COUNT(*) FROM user_gear) as total_gear_items,
    (SELECT COUNT(*) FROM used_listings WHERE is_active = true) as active_listings,
    (SELECT COUNT(*) FROM components WHERE image_url IS NULL) as missing_images,
    (SELECT COUNT(*) FROM user_gear WHERE created_at > NOW() - INTERVAL '24 hours') as new_gear_24h,
    (SELECT COUNT(*) FROM used_listings WHERE created_at > NOW() - INTERVAL '24 hours') as new_listings_24h;