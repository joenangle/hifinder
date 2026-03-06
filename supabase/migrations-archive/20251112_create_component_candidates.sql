-- Create table for storing component candidates discovered from listings
-- These are models detected in used listings that don't exist in the components table yet

CREATE TABLE IF NOT EXISTS new_component_candidates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Extracted from listing title
  brand TEXT NOT NULL,
  model TEXT NOT NULL,
  category TEXT, -- Best guess: cans, iems, dac, amp, dac_amp, combo

  -- Pricing data
  price_estimate_new NUMERIC, -- From manufacturer or listings
  price_observed_min NUMERIC, -- Lowest listing price seen
  price_observed_max NUMERIC, -- Highest listing price seen
  price_used_min NUMERIC, -- Calculated 60% of MSRP
  price_used_max NUMERIC, -- Calculated 80% of MSRP

  -- Auto-enriched data
  sound_signature TEXT, -- Inferred basic signature (neutral, warm, bright, fun)
  driver_type TEXT,
  impedance INTEGER,
  needs_amp BOOLEAN,

  -- Expert data (from ASR/Crinacle)
  asr_sinad NUMERIC,
  asr_review_url TEXT,
  crin_rank TEXT,
  crin_tone TEXT,
  crin_tech TEXT,
  crin_value NUMERIC,
  crin_signature TEXT,

  -- URLs
  manufacturer_url TEXT,
  image_url TEXT,

  -- Metadata
  quality_score INTEGER DEFAULT 0, -- 0-100 confidence score
  listing_count INTEGER DEFAULT 1, -- How many listings found this model
  first_seen_at TIMESTAMP DEFAULT NOW(),
  last_seen_at TIMESTAMP DEFAULT NOW(),
  status TEXT DEFAULT 'pending', -- pending, approved, rejected, needs_research, merged

  -- References
  trigger_listing_ids UUID[], -- Array of listing IDs that triggered this
  merged_with_component_id UUID, -- If merged with existing component

  -- Manual review
  reviewed_at TIMESTAMP,
  reviewed_by TEXT,
  review_notes TEXT,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  -- Constraints
  CONSTRAINT unique_brand_model UNIQUE (brand, model),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'approved', 'rejected', 'needs_research', 'merged')),
  CONSTRAINT valid_category CHECK (category IS NULL OR category IN ('cans', 'iems', 'dac', 'amp', 'dac_amp', 'combo')),
  CONSTRAINT valid_sound_signature CHECK (sound_signature IS NULL OR sound_signature IN ('neutral', 'warm', 'bright', 'fun'))
);

-- Indexes for common queries
CREATE INDEX idx_candidates_status ON new_component_candidates(status);
CREATE INDEX idx_candidates_quality ON new_component_candidates(quality_score DESC);
CREATE INDEX idx_candidates_brand_model ON new_component_candidates(brand, model);
CREATE INDEX idx_candidates_category ON new_component_candidates(category) WHERE category IS NOT NULL;
CREATE INDEX idx_candidates_created_at ON new_component_candidates(created_at DESC);
CREATE INDEX idx_candidates_listing_count ON new_component_candidates(listing_count DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_component_candidates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_component_candidates_updated_at
  BEFORE UPDATE ON new_component_candidates
  FOR EACH ROW
  EXECUTE FUNCTION update_component_candidates_updated_at();

-- Comments for documentation
COMMENT ON TABLE new_component_candidates IS 'Stores audio component models detected in used listings that need review before adding to main components table';
COMMENT ON COLUMN new_component_candidates.quality_score IS 'Confidence score 0-100 based on data completeness and validation';
COMMENT ON COLUMN new_component_candidates.trigger_listing_ids IS 'Array of used_listings.id values that referenced this unknown model';
COMMENT ON COLUMN new_component_candidates.status IS 'pending: awaiting review, approved: added to components, rejected: not valid audio gear, needs_research: flagged for more info, merged: duplicate of existing component';
