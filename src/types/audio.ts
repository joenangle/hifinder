/**
 * Audio domain types
 *
 * Types related to audio calculations, budget ranges, and expert scoring.
 * Extracted from lib/audio-calculations.ts, lib/budget-ranges.ts, lib/crinacle-scoring.ts
 */

export interface PowerRequirements {
  powerNeeded_mW: number;
  voltageNeeded_V: number;
  currentNeeded_mA: number;
  difficulty: 'easy' | 'moderate' | 'demanding' | 'very_demanding';
  phoneCompatible: boolean;
  laptopCompatible: boolean;
  portableAmpSufficient: boolean;
  desktopAmpRecommended: boolean;
  explanation: string;
}

export interface BudgetRange {
  min: number
  max: number
}

/**
 * Component interface for expert scoring
 * Matches the structure from database queries
 */
export interface ScoringComponent {
  crin_rank?: string | null;
  crin_tone?: string | null;
  crin_tech?: string | null;
  crin_value?: number | null;
  asr_sinad?: number | null;
}
