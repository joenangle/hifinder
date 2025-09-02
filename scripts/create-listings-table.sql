-- Create used_listings table for storing marketplace listings
CREATE TABLE IF NOT EXISTS used_listings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  component_id UUID REFERENCES components(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  price INTEGER NOT NULL,
  condition TEXT CHECK (condition IN ('excellent', 'very_good', 'good', 'fair', 'parts_only')),
  location TEXT,
  source TEXT CHECK (source IN ('reddit_avexchange', 'ebay', 'head_fi', 'usaudiomart', 'manual')),
  url TEXT NOT NULL,
  date_posted TIMESTAMPTZ NOT NULL,
  seller_username TEXT NOT NULL,
  seller_confirmed_trades INTEGER,
  seller_feedback_score INTEGER,
  seller_feedback_percentage INTEGER,
  images TEXT[], -- Array of image URLs
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  price_is_reasonable BOOLEAN DEFAULT true,
  price_variance_percentage DECIMAL,
  price_warning TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS used_listings_component_id_idx ON used_listings(component_id);
CREATE INDEX IF NOT EXISTS used_listings_is_active_idx ON used_listings(is_active);
CREATE INDEX IF NOT EXISTS used_listings_date_posted_idx ON used_listings(date_posted DESC);
CREATE INDEX IF NOT EXISTS used_listings_price_idx ON used_listings(price);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_used_listings_updated_at 
  BEFORE UPDATE ON used_listings 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();