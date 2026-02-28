-- =============================================================
-- Server-Side Alert Matching: Schema Changes + Trigger Function
-- =============================================================

-- 1. Add email notification columns to price_alerts
ALTER TABLE price_alerts
  ADD COLUMN IF NOT EXISTS notification_frequency TEXT
    CHECK (notification_frequency IN ('instant', 'digest', 'none'))
    DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS email_enabled BOOLEAN DEFAULT false;

-- 2. Remove duplicate alert_history rows before adding unique constraint
-- The old client-side checkAlerts had no dedup and could insert duplicates on every visit
DELETE FROM alert_history a
USING alert_history b
WHERE a.id > b.id
  AND a.alert_id = b.alert_id
  AND a.listing_url = b.listing_url;

-- 3. Add dedup constraint on alert_history (alert + listing URL = unique match)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'alert_history_unique_match'
  ) THEN
    ALTER TABLE alert_history
      ADD CONSTRAINT alert_history_unique_match UNIQUE (alert_id, listing_url);
  END IF;
END $$;

-- 4. Partial index for unsent notifications (used by email dispatcher)
CREATE INDEX IF NOT EXISTS idx_alert_history_unsent
  ON alert_history (notification_sent, triggered_at)
  WHERE notification_sent = false;

-- 5. Trigger function: match new/updated listings against active alerts
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
    FROM price_alerts pa
    LEFT JOIN components c ON pa.component_id = c.id
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
    INSERT INTO alert_history (
      alert_id, user_id, listing_title, listing_price,
      listing_condition, listing_url, listing_source, triggered_at
    ) VALUES (
      alert_rec.id, alert_rec.user_id, NEW.title, NEW.price,
      NEW.condition, NEW.url, NEW.source, NOW()
    ) ON CONFLICT (alert_id, listing_url) DO NOTHING;

    -- 6. Bump trigger count only if new row was inserted
    IF FOUND THEN
      UPDATE price_alerts
      SET trigger_count = trigger_count + 1, last_triggered_at = NOW()
      WHERE id = alert_rec.id;
    END IF;

  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 6. Create trigger (drop first to allow re-running)
DROP TRIGGER IF EXISTS trg_match_new_listing ON used_listings;
CREATE TRIGGER trg_match_new_listing
  AFTER INSERT OR UPDATE ON used_listings
  FOR EACH ROW EXECUTE FUNCTION match_new_listing();
