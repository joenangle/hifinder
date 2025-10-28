-- Update used_listings table to support enhanced multi-source functionality
-- This ensures all fields from our integrations are properly supported

-- Add any missing columns for enhanced listing data
ALTER TABLE used_listings 
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS listing_type TEXT DEFAULT 'buy_it_now',
ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS accepts_offers BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS seller_confirmed_trades INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS seller_feedback_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS seller_feedback_percentage DECIMAL(5,2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS images TEXT[],
ADD COLUMN IF NOT EXISTS price_warning TEXT;

-- Update source enum to include all supported sources
-- Note: This requires dropping and recreating the constraint
ALTER TABLE used_listings DROP CONSTRAINT IF EXISTS used_listings_source_check;
ALTER TABLE used_listings ADD CONSTRAINT used_listings_source_check 
CHECK (source IN ('reddit_avexchange', 'ebay', 'head_fi', 'usaudiomart', 'reverb', 'manual'));

-- Update listing_type constraint
ALTER TABLE used_listings DROP CONSTRAINT IF EXISTS used_listings_listing_type_check;
ALTER TABLE used_listings ADD CONSTRAINT used_listings_listing_type_check 
CHECK (listing_type IN ('buy_it_now', 'auction', 'trade', 'bundle'));

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_used_listings_component_source ON used_listings (component_id, source);
CREATE INDEX IF NOT EXISTS idx_used_listings_price_range ON used_listings (price) WHERE price > 0;
CREATE INDEX IF NOT EXISTS idx_used_listings_active_recent ON used_listings (is_active, date_posted DESC) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_used_listings_expires_at ON used_listings (expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_used_listings_seller ON used_listings (seller_username, seller_feedback_score);

-- Add a function to clean up expired listings automatically
CREATE OR REPLACE FUNCTION cleanup_expired_listings()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    -- Mark eBay listings as inactive if they've expired
    UPDATE used_listings 
    SET is_active = false, 
        updated_at = NOW()
    WHERE source = 'ebay' 
      AND expires_at IS NOT NULL 
      AND expires_at < NOW() 
      AND is_active = true;
    
    GET DIAGNOSTICS expired_count = ROW_COUNT;
    
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql;

-- Create a view for active listings with price analysis
CREATE OR REPLACE VIEW active_listings_with_analysis AS
SELECT 
    ul.*,
    c.name as component_name,
    c.brand as component_brand,
    c.price_used_min,
    c.price_used_max,
    -- Calculate expected price
    CASE 
        WHEN c.price_used_min IS NOT NULL AND c.price_used_max IS NOT NULL 
        THEN (c.price_used_min + c.price_used_max) / 2.0
        ELSE COALESCE(c.price_used_min, c.price_used_max, 0)
    END as expected_price,
    -- Days since posted
    EXTRACT(days FROM (NOW() - ul.date_posted)) as days_old,
    -- Seller reputation score (rough calculation)
    CASE 
        WHEN ul.seller_confirmed_trades > 50 THEN 'excellent'
        WHEN ul.seller_confirmed_trades > 20 THEN 'good'
        WHEN ul.seller_confirmed_trades > 5 THEN 'fair'
        ELSE 'new'
    END as seller_reputation
FROM used_listings ul
JOIN components c ON ul.component_id = c.id
WHERE ul.is_active = true
  AND (ul.expires_at IS NULL OR ul.expires_at > NOW());

-- Add a trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_used_listings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS used_listings_update_timestamp ON used_listings;
CREATE TRIGGER used_listings_update_timestamp
    BEFORE UPDATE ON used_listings
    FOR EACH ROW
    EXECUTE FUNCTION update_used_listings_timestamp();

-- Add some helpful stored procedures for listing management

-- Function to get listing statistics by source
CREATE OR REPLACE FUNCTION get_listing_stats_by_source()
RETURNS TABLE (
    source TEXT,
    total_listings BIGINT,
    active_listings BIGINT,
    avg_price DECIMAL,
    price_range TEXT,
    last_updated TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ul.source,
        COUNT(*) as total_listings,
        COUNT(*) FILTER (WHERE ul.is_active = true) as active_listings,
        ROUND(AVG(ul.price), 2) as avg_price,
        CONCAT('$', MIN(ul.price), ' - $', MAX(ul.price)) as price_range,
        MAX(ul.updated_at) as last_updated
    FROM used_listings ul
    WHERE ul.price > 0
    GROUP BY ul.source
    ORDER BY active_listings DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to find potentially duplicate listings across sources
CREATE OR REPLACE FUNCTION find_potential_duplicates()
RETURNS TABLE (
    component_id UUID,
    component_name TEXT,
    price DECIMAL,
    title1 TEXT,
    source1 TEXT,
    title2 TEXT,
    source2 TEXT,
    price_diff DECIMAL,
    similarity_score INTEGER
) AS $$
BEGIN
    RETURN QUERY
    WITH listing_pairs AS (
        SELECT 
            ul1.component_id,
            ul1.price as price1,
            ul1.title as title1,
            ul1.source as source1,
            ul2.title as title2,
            ul2.source as source2,
            ABS(ul1.price - ul2.price) as price_diff,
            -- Simple similarity score based on price and title length similarity
            (100 - LEAST(ABS(ul1.price - ul2.price) / GREATEST(ul1.price, ul2.price) * 100, 100))::INTEGER +
            (100 - LEAST(ABS(LENGTH(ul1.title) - LENGTH(ul2.title)) / GREATEST(LENGTH(ul1.title), LENGTH(ul2.title)) * 100, 100))::INTEGER 
            as similarity_score
        FROM used_listings ul1
        JOIN used_listings ul2 ON ul1.component_id = ul2.component_id
        WHERE ul1.id < ul2.id  -- Avoid duplicate pairs
          AND ul1.source != ul2.source  -- Different sources
          AND ul1.is_active = true AND ul2.is_active = true
          AND ABS(ul1.price - ul2.price) < 50  -- Price within $50
          AND ul1.price > 0 AND ul2.price > 0
    )
    SELECT 
        lp.component_id,
        c.name as component_name,
        lp.price1 as price,
        lp.title1,
        lp.source1,
        lp.title2,
        lp.source2,
        lp.price_diff,
        lp.similarity_score
    FROM listing_pairs lp
    JOIN components c ON lp.component_id = c.id
    WHERE lp.similarity_score > 120  -- High similarity threshold
    ORDER BY lp.similarity_score DESC, lp.price_diff ASC;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions for application to use these functions
GRANT EXECUTE ON FUNCTION cleanup_expired_listings() TO authenticated;
GRANT EXECUTE ON FUNCTION get_listing_stats_by_source() TO authenticated;
GRANT EXECUTE ON FUNCTION find_potential_duplicates() TO authenticated;
GRANT SELECT ON active_listings_with_analysis TO authenticated;

-- Add a comment documenting the enhanced schema
COMMENT ON TABLE used_listings IS 'Enhanced used listings table supporting multiple marketplace sources (eBay, Head-Fi, Reverb, Reddit) with comprehensive seller and listing metadata';
COMMENT ON COLUMN used_listings.listing_type IS 'Type of listing: buy_it_now, auction, trade, bundle';
COMMENT ON COLUMN used_listings.seller_confirmed_trades IS 'Number of confirmed trades/transactions (primarily from Reddit AVExchange)';
COMMENT ON COLUMN used_listings.price_warning IS 'Warning message about price anomalies (too high/low vs expected range)';
COMMENT ON COLUMN used_listings.accepts_offers IS 'Whether seller accepts offers/negotiations';
COMMENT ON VIEW active_listings_with_analysis IS 'Enhanced view of active listings with calculated price analysis and seller reputation scoring';