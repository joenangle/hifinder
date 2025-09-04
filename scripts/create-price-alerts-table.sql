-- Create price_alerts table for tracking user price alerts
CREATE TABLE IF NOT EXISTS public.price_alerts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  component_id UUID REFERENCES public.components(id) ON DELETE CASCADE,
  
  -- Alert configuration
  target_price DECIMAL(10, 2) NOT NULL,
  alert_type TEXT CHECK (alert_type IN ('below', 'exact', 'range')) DEFAULT 'below',
  price_range_min DECIMAL(10, 2), -- For range alerts
  price_range_max DECIMAL(10, 2), -- For range alerts
  
  -- Alert preferences
  condition_preference TEXT[] DEFAULT ARRAY['new', 'used', 'refurbished', 'b-stock'],
  marketplace_preference TEXT[] DEFAULT ARRAY['reddit', 'headfi', 'avexchange'],
  
  -- Custom item tracking (for items not in database)
  custom_search_query TEXT, -- Custom search string for non-DB items
  custom_brand TEXT,
  custom_model TEXT,
  
  -- Alert status
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMPTZ,
  trigger_count INTEGER DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create alert_history table for tracking triggered alerts
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
  user_viewed_at TIMESTAMPTZ
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON public.price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_component_id ON public.price_alerts(component_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON public.price_alerts(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_alert_history_alert_id ON public.alert_history(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_history_user_id ON public.alert_history(user_id, user_viewed);

-- Enable Row Level Security
ALTER TABLE public.price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for price_alerts
CREATE POLICY "Users can view own alerts" ON public.price_alerts
  FOR SELECT USING (auth.uid()::TEXT = user_id OR user_id IS NOT NULL);

CREATE POLICY "Users can insert own alerts" ON public.price_alerts
  FOR INSERT WITH CHECK (auth.uid()::TEXT = user_id OR user_id IS NOT NULL);

CREATE POLICY "Users can update own alerts" ON public.price_alerts
  FOR UPDATE USING (auth.uid()::TEXT = user_id OR user_id IS NOT NULL);

CREATE POLICY "Users can delete own alerts" ON public.price_alerts
  FOR DELETE USING (auth.uid()::TEXT = user_id OR user_id IS NOT NULL);

-- Create RLS policies for alert_history
CREATE POLICY "Users can view own alert history" ON public.alert_history
  FOR SELECT USING (auth.uid()::TEXT = user_id OR user_id IS NOT NULL);

-- Add trigger for updated_at
CREATE TRIGGER update_price_alerts_updated_at
  BEFORE UPDATE ON public.price_alerts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();