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