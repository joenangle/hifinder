-- Create user_gear table for tracking owned equipment

CREATE TABLE IF NOT EXISTS public.user_gear (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  component_id UUID REFERENCES public.components(id) ON DELETE CASCADE,
  
  -- Purchase details
  purchase_date DATE,
  purchase_price DECIMAL(10, 2),
  purchase_location TEXT,
  condition TEXT CHECK (condition IN ('new', 'used', 'refurbished', 'b-stock')),
  
  -- Item details
  custom_name TEXT, -- For items not in database
  custom_brand TEXT,
  custom_category TEXT,
  serial_number TEXT,
  
  -- Status and notes
  is_active BOOLEAN DEFAULT true, -- false = sold/no longer owned
  is_loaned BOOLEAN DEFAULT false,
  loaned_to TEXT,
  loaned_date DATE,
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_user_gear_user_id ON public.user_gear(user_id);
CREATE INDEX IF NOT EXISTS idx_user_gear_component_id ON public.user_gear(component_id);
CREATE INDEX IF NOT EXISTS idx_user_gear_active ON public.user_gear(user_id, is_active);

-- Enable Row Level Security
ALTER TABLE public.user_gear ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own gear" ON public.user_gear
  FOR SELECT USING (auth.uid()::TEXT = user_id OR user_id IS NOT NULL);

CREATE POLICY "Users can insert own gear" ON public.user_gear
  FOR INSERT WITH CHECK (auth.uid()::TEXT = user_id OR user_id IS NOT NULL);

CREATE POLICY "Users can update own gear" ON public.user_gear
  FOR UPDATE USING (auth.uid()::TEXT = user_id OR user_id IS NOT NULL);

CREATE POLICY "Users can delete own gear" ON public.user_gear
  FOR DELETE USING (auth.uid()::TEXT = user_id OR user_id IS NOT NULL);

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_gear_updated_at
  BEFORE UPDATE ON public.user_gear
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();