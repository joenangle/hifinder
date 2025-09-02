export interface Component {
  id: string;
  name: string;
  brand: string;
  category: 'cans' | 'iems' | 'dac' | 'amp' | 'dac_amp' | 'cable';
  price_new: number | null;
  price_used_min: number | null;
  price_used_max: number | null;
  budget_tier: 'entry' | 'mid' | 'high';
  sound_signature: 'warm' | 'neutral' | 'bright' | 'fun';
  use_cases: string[];
  impedance: number | null;
  needs_amp: boolean;
  // Additional fields for amp/dac components
  power_output?: string; // e.g., "2W @ 32Ω"
  input_types?: string[]; // e.g., ["USB", "Optical", "Coaxial"]
  output_types?: string[]; // e.g., ["3.5mm", "6.35mm", "XLR"]
  amazon_url: string | null;
  why_recommended: string;
  created_at: string;
}

export interface UsedListing {
  id: string;
  component_id: string;
  title: string;
  price: number;
  condition: 'excellent' | 'very_good' | 'good' | 'fair' | 'parts_only';
  location: string;
  source: 'reddit_avexchange' | 'ebay' | 'head_fi' | 'usaudiomart' | 'manual';
  url: string;
  date_posted: string;
  seller: {
    username: string;
    confirmed_trades?: number;
    feedback_score?: number;
    feedback_percentage?: number;
  };
  images?: string[];
  description?: string;
  is_active: boolean;
  price_validation: {
    is_reasonable: boolean;
    variance_percentage: number;
    warning?: string;
  };
}

export interface PriceValidation {
  valid: boolean;
  warning?: string;
}

export interface AVexchangeListing {
  id: string;
  title: string;
  price: number;
  condition: string;
  location: string;
  timestamp: Date;
  url: string;
  seller: {
    username: string;
    confirmedTrades: number;
  };
  images: string[];
}