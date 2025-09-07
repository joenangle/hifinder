-- Database Data Consistency Audit
-- Run these queries in Supabase SQL Editor to identify issues

-- ============================================
-- 1. COMPONENT CATEGORY AUDIT
-- ============================================

-- Check for inconsistent category values
SELECT DISTINCT category, COUNT(*) as count
FROM components 
GROUP BY category 
ORDER BY category;

-- Find any components with old 'headphones' category (should be 'cans')
SELECT id, name, brand, category
FROM components 
WHERE category NOT IN ('cans', 'iems', 'dac', 'amp', 'dac_amp', 'cable')
LIMIT 10;

-- ============================================
-- 2. USER GEAR CONDITION AUDIT  
-- ============================================

-- Check for inconsistent condition values
SELECT DISTINCT condition, COUNT(*) as count
FROM user_gear 
GROUP BY condition 
ORDER BY condition;

-- Find any invalid conditions
SELECT id, condition, created_at
FROM user_gear 
WHERE condition NOT IN ('new', 'used', 'refurbished', 'b-stock', 'excellent', 'very_good', 'good', 'fair')
LIMIT 10;

-- ============================================
-- 3. MISSING IMAGE URLS
-- ============================================

-- Count components without images
SELECT category, 
       COUNT(*) as total,
       COUNT(image_url) as with_images,
       COUNT(*) - COUNT(image_url) as missing_images,
       ROUND((COUNT(image_url)::float / COUNT(*) * 100)::numeric, 2) as image_percentage
FROM components 
GROUP BY category
ORDER BY missing_images DESC;

-- ============================================
-- 4. PRICE DATA QUALITY
-- ============================================

-- Find components with invalid price ranges
SELECT id, name, brand, price_new, price_used_min, price_used_max
FROM components 
WHERE (price_used_min > price_used_max) 
   OR (price_new < price_used_max)
   OR (price_new IS NULL AND price_used_min IS NULL AND price_used_max IS NULL)
LIMIT 10;

-- ============================================
-- 5. ORPHANED RECORDS
-- ============================================

-- Find user_gear referencing non-existent components
SELECT ug.id as user_gear_id, ug.component_id, ug.created_at
FROM user_gear ug
LEFT JOIN components c ON ug.component_id = c.id
WHERE c.id IS NULL
LIMIT 10;

-- Find wishlist items referencing non-existent components (skip if table doesn't exist)
-- SELECT w.id as wishlist_id, w.component_id, w.created_at
-- FROM user_wishlist w
-- LEFT JOIN components c ON w.component_id = c.id
-- WHERE c.id IS NULL
-- LIMIT 10;

-- ============================================
-- 6. USED LISTINGS STALENESS
-- ============================================

-- Count stale listings by source
SELECT source, 
       COUNT(*) as total_listings,
       COUNT(CASE WHEN is_active = true THEN 1 END) as active_listings,
       COUNT(CASE WHEN is_active = true AND created_at < NOW() - INTERVAL '30 days' THEN 1 END) as stale_active
FROM used_listings 
GROUP BY source
ORDER BY stale_active DESC;

-- Find oldest active listings (candidates for cleanup)
SELECT id, title, price, source, created_at, 
       NOW() - created_at as age
FROM used_listings 
WHERE is_active = true
ORDER BY created_at ASC
LIMIT 20;

-- ============================================
-- 7. DUPLICATE DETECTION
-- ============================================

-- Find potential duplicate components
SELECT name, brand, category, COUNT(*) as duplicates
FROM components 
GROUP BY name, brand, category
HAVING COUNT(*) > 1
ORDER BY duplicates DESC
LIMIT 10;

-- ============================================
-- 8. DATA VOLUME SUMMARY
-- ============================================

SELECT 
    'components' as table_name,
    COUNT(*) as record_count,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM components
UNION ALL
SELECT 
    'user_gear' as table_name,
    COUNT(*) as record_count,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM user_gear
UNION ALL
SELECT 
    'used_listings' as table_name,
    COUNT(*) as record_count,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM used_listings
ORDER BY table_name;