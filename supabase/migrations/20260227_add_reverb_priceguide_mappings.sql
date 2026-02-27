-- Reverb Price Guide mappings cache
-- Maps components to their Reverb Price Guide IDs so we don't re-search every run
CREATE TABLE reverb_priceguide_mappings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  component_id UUID NOT NULL REFERENCES components(id) ON DELETE CASCADE,
  reverb_priceguide_id INTEGER NOT NULL,
  reverb_title TEXT,
  match_confidence FLOAT NOT NULL,
  estimated_value_low NUMERIC(10,2),
  estimated_value_high NUMERIC(10,2),
  last_synced_at TIMESTAMPTZ,
  transaction_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(component_id),
  UNIQUE(reverb_priceguide_id)
);

-- RLS: service role only (scraper uses service role key)
ALTER TABLE reverb_priceguide_mappings ENABLE ROW LEVEL SECURITY;
