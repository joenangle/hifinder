export interface Component {
  id: string;
  name: string;
  brand: string;
  category: 'cans' | 'iems' | 'dac' | 'amp' | 'dac_amp' | 'cable';
  price_new: number | null;
  price_used_min: number | null;
  price_used_max: number | null;
  budget_tier: 'entry' | 'mid' | 'high';
  sound_signature: 'warm' | 'neutral' | 'bright' | 'fun' | null;
  use_cases: string[];
  impedance: number | null;
  needs_amp: boolean;
  // Enhanced amplification assessment fields
  power_required_mw?: number;
  voltage_required_v?: number;
  amplification_difficulty?: 'easy' | 'moderate' | 'demanding' | 'very_demanding';
  // Additional fields for amp/dac components
  power_output?: string; // e.g., "2W @ 32Ω"
  input_types?: string[]; // e.g., ["USB", "Optical", "Coaxial"]
  output_types?: string[]; // e.g., ["3.5mm", "6.35mm", "XLR"]
  // ASR measurement fields
  asr_sinad?: number | null;
  asr_review_url?: string | null;
  amazon_url: string | null;
  why_recommended: string;
  created_at: string;
}

// Component specifications for detailed audio measurements  
export interface ComponentSpecifications {
  id: string;
  component_id: string;
  sensitivity_db_mw?: number;      // Primary sensitivity measurement in dB/mW
  sensitivity_vrms?: number;       // Alternative measurement in dB/V (some manufacturers use this)
  measurement_condition?: string;  // How sensitivity was measured (e.g., "1kHz", "500Hz-2kHz average")
  created_at: string;
  updated_at: string;
}

export interface UsedListing {
  id: string;
  component_id: string;
  title: string;
  price: number;
  condition: 'excellent' | 'very_good' | 'good' | 'fair' | 'parts_only';
  location: string;
  source: 'reddit_avexchange' | 'ebay' | 'head_fi' | 'usaudiomart' | 'reverb' | 'manual';
  url: string;
  date_posted: string;
  // Match actual database schema
  seller_username: string;
  seller_confirmed_trades?: number;
  seller_feedback_score?: number;
  seller_feedback_percentage?: number;
  images?: string[];
  description?: string;
  is_active: boolean;
  // Match actual database schema  
  price_is_reasonable: boolean;
  price_variance_percentage: number;
  price_warning?: string;
  created_at: string;
  updated_at: string;
  // New fields for enhanced functionality
  expires_at?: string;
  view_count?: number;
  listing_type?: 'buy_it_now' | 'auction' | 'trade' | 'bundle';
  shipping_cost?: number;
  accepts_offers?: boolean;
  // Bundle detection fields
  is_bundle?: boolean;
  component_count?: number;
}

export interface PriceValidation {
  valid: boolean;
  warning?: string;
}

export interface CollectionStats {
  totalPaid: number;
  currentValue: number;
  depreciation: number;
  byCategory: Record<string, { paid: number; current: number }>;
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