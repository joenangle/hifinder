export interface Component {
  id: string;
  name: string;
  brand: string;
  category: 'headphones' | 'dac_amp' | 'cable';
  price_new: number | null;
  price_used_min: number | null;
  price_used_max: number | null;
  budget_tier: 'entry' | 'mid' | 'high';
  sound_signature: 'warm' | 'neutral' | 'bright' | 'fun';
  use_cases: string[];
  impedance: number | null;
  needs_amp: boolean;
  amazon_url: string | null;
  why_recommended: string;
  created_at: string;
}