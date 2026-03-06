-- =============================================================
-- Server-Side Alert Matching
-- Creates tables, indexes, RLS, trigger function — single migration
-- =============================================================

-- 1. Create price_alerts table
CREATE TABLE IF NOT EXISTS public.price_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  component_id UUID REFERENCES public.components(id) ON DELETE CASCADE,

  -- Alert configuration
  target_price DECIMAL(10, 2) NOT NULL,
  alert_type TEXT CHECK (alert_type IN ('below', 'exact', 'range')) DEFAULT 'below',
  price_range_min DECIMAL(10, 2),
  price_range_max DECIMAL(10, 2),

  -- Alert preferences
  condition_preference TEXT[] DEFAULT ARRAY['new', 'used', 'refurbished', 'b-stock'],
  marketplace_preference TEXT[] DEFAULT ARRAY['reddit', 'headfi', 'avexchange'],

  -- Custom item tracking (for items not in database)
  custom_search_query TEXT,
  custom_brand TEXT,
  custom_model TEXT,

  -- Alert status
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,

  -- Email notification preferences
  notification_frequency TEXT CHECK (notification_frequency IN ('instant', 'digest', 'none')) DEFAULT 'none',
  email_enabled BOOLEAN DEFAULT false,

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create alert_history table
CREATE TABLE IF NOT EXISTS public.alert_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID REFERENCES public.price_alerts(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,

  -- Listing details
  listing_title TEXT,
  listing_price DECIMAL(10, 2),
  listing_condition TEXT,
  listing_url TEXT,
  listing_source TEXT,
  listing_date TIMESTAMPTZ,

  -- Alert details
  triggered_at TIMESTAMPTZ DEFAULT NOW(),
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMPTZ,
  user_viewed BOOLEAN DEFAULT false,
  user_viewed_at TIMESTAMPTZ,

  -- Dedup: one match per alert per listing URL
  CONSTRAINT alert_history_unique_match UNIQUE (alert_id, listing_url)
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON public.price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_component_id ON public.price_alerts(component_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON public.price_alerts(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_alert_history_alert_id ON public.alert_history(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_user_id ON public.alert_history(user_id, user_viewed);
CREATE INDEX IF NOT EXISTS idx_alert_history_unsent
  ON public.alert_history (notification_sent, triggered_at)
  WHERE notification_sent = false;

-- 4. Row Level Security
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own alerts" ON public.price_alerts
  FOR SELECT USING (auth.uid()::TEXT = user_id OR user_id IS NOT NULL);

CREATE POLICY "Users can insert own alerts" ON public.price_alerts
  FOR INSERT WITH CHECK (auth.uid()::TEXT = user_id OR user_id IS NOT NULL);

CREATE POLICY "Users can update own alerts" ON public.price_alerts
  FOR UPDATE USING (auth.uid()::TEXT = user_id OR user_id IS NOT NULL);

CREATE POLICY "Users can delete own alerts" ON public.price_alerts
  FOR DELETE USING (auth.uid()::TEXT = user_id OR user_id IS NOT NULL);

CREATE POLICY "Users can view own alert history" ON public.alert_history
  FOR SELECT USING (auth.uid()::TEXT = user_id OR user_id IS NOT NULL);

-- 5. updated_at trigger
CREATE TRIGGER update_price_alerts_updated_at
  BEFORE UPDATE ON public.price_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 6. Trigger function: match new/updated listings against active alerts
CREATE OR REPLACE FUNCTION match_new_listing()
RETURNS TRIGGER AS $$
DECLARE
  alert_rec RECORD;
BEGIN
  -- On UPDATE, only proceed if price decreased
  IF TG_OP = 'UPDATE' THEN
    IF NEW.price >= OLD.price OR NEW.price IS NULL THEN
      RETURN NEW;
    END IF;
  END IF;

  -- Only match available listings
  IF NEW.status IS DISTINCT FROM 'available' THEN
    RETURN NEW;
  END IF;

  FOR alert_rec IN
    SELECT pa.id, pa.user_id, pa.component_id,
           pa.alert_type, pa.target_price,
           pa.price_range_min, pa.price_range_max,
           pa.condition_preference, pa.marketplace_preference,
           pa.custom_search_query, pa.custom_brand, pa.custom_model,
           c.brand, c.name AS component_name
    FROM public.price_alerts pa
    LEFT JOIN public.components c ON pa.component_id = c.id
    WHERE pa.is_active = true
  LOOP
    -- 1. Keyword match
    IF alert_rec.component_id IS NOT NULL THEN
      IF NOT (
        NEW.title ILIKE '%' || alert_rec.brand || '%'
        AND NEW.title ILIKE '%' || alert_rec.component_name || '%'
      ) THEN CONTINUE; END IF;
    ELSIF alert_rec.custom_search_query IS NOT NULL THEN
      IF NOT (NEW.title ILIKE '%' || alert_rec.custom_search_query || '%')
        THEN CONTINUE; END IF;
    ELSIF alert_rec.custom_brand IS NOT NULL THEN
      IF NOT (
        NEW.title ILIKE '%' || alert_rec.custom_brand || '%'
        AND NEW.title ILIKE '%' || alert_rec.custom_model || '%'
      ) THEN CONTINUE; END IF;
    ELSE CONTINUE;
    END IF;

    -- 2. Price match
    CASE alert_rec.alert_type
      WHEN 'below' THEN
        IF NEW.price > alert_rec.target_price THEN CONTINUE; END IF;
      WHEN 'exact' THEN
        IF ABS(NEW.price - alert_rec.target_price) > 10 THEN CONTINUE; END IF;
      WHEN 'range' THEN
        IF NEW.price < alert_rec.price_range_min
           OR NEW.price > alert_rec.price_range_max THEN CONTINUE; END IF;
      ELSE CONTINUE;
    END CASE;

    -- 3. Condition preference
    IF array_length(alert_rec.condition_preference, 1) > 0
       AND NEW.condition IS NOT NULL
       AND NOT (NEW.condition = ANY(alert_rec.condition_preference))
    THEN CONTINUE; END IF;

    -- 4. Marketplace preference
    IF array_length(alert_rec.marketplace_preference, 1) > 0
       AND NOT (NEW.source = ANY(alert_rec.marketplace_preference))
    THEN CONTINUE; END IF;

    -- 5. Insert match (ON CONFLICT handles dedup)
    INSERT INTO public.alert_history (
      alert_id, user_id, listing_title, listing_price,
      listing_condition, listing_url, listing_source, triggered_at
    ) VALUES (
      alert_rec.id, alert_rec.user_id, NEW.title, NEW.price,
      NEW.condition, NEW.url, NEW.source, NOW()
    ) ON CONFLICT (alert_id, listing_url) DO NOTHING;

    -- 6. Bump trigger count only if new row was inserted
    IF FOUND THEN
      UPDATE public.price_alerts
      SET trigger_count = trigger_count + 1, last_triggered_at = NOW()
      WHERE id = alert_rec.id;
    END IF;

  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger on used_listings
DROP TRIGGER IF EXISTS trg_match_new_listing ON public.used_listings;
CREATE TRIGGER trg_match_new_listing
  AFTER INSERT OR UPDATE ON public.used_listings
  FOR EACH ROW EXECUTE FUNCTION match_new_listing();
