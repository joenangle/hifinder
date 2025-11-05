/**
 * Crinacle Expert Data Scoring System
 *
 * Converts Crinacle's letter grades (S+, S, S-, A+, A, A-, B+, B, B-, C+, C, C-, D+, D, D-, F)
 * to numeric scores and calculates weighted expert scores for recommendations.
 *
 * Weighting: 30% Rank + 30% Tone + 20% Tech + 20% Value
 */

/**
 * Convert Crinacle letter grade to numeric score (0-10 scale)
 *
 * @param grade - Letter grade (e.g., "S+", "A-", "B+", etc.)
 * @returns Numeric score from 0-10, or 5.0 (C grade) as default
 *
 * Grade Scale:
 * - S+ = 10.0 (Supreme Plus - Best possible)
 * - S  = 9.5  (Supreme)
 * - S- = 9.0  (Supreme Minus)
 * - A+ = 8.5  (Excellent Plus)
 * - A  = 8.0  (Excellent)
 * - A- = 7.5  (Excellent Minus)
 * - B+ = 7.0  (Good Plus)
 * - B  = 6.5  (Good)
 * - B- = 6.0  (Good Minus)
 * - C+ = 5.5  (Average Plus)
 * - C  = 5.0  (Average)
 * - C- = 4.5  (Average Minus)
 * - D+ = 4.0  (Below Average Plus)
 * - D  = 3.5  (Below Average)
 * - D- = 3.0  (Below Average Minus)
 * - F  = 0    (Fail)
 */
export function gradeToNumeric(grade?: string | null): number {
  if (!grade) return 5.0; // Default to C (average) if missing

  // Normalize grade string (trim whitespace, convert to uppercase)
  const normalized = grade.trim().toUpperCase();

  // Grade mapping table
  const gradeMap: Record<string, number> = {
    'S+': 10.0,
    'S': 9.5,
    'S-': 9.0,
    'A+': 8.5,
    'A': 8.0,
    'A-': 7.5,
    'B+': 7.0,
    'B': 6.5,
    'B-': 6.0,
    'C+': 5.5,
    'C': 5.0,
    'C-': 4.5,
    'D+': 4.0,
    'D': 3.5,
    'D-': 3.0,
    'F': 0,
  };

  return gradeMap[normalized] ?? 5.0; // Default to C if grade not recognized
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
}

/**
 * Calculate comprehensive expert score using Crinacle data
 *
 * Weighting Formula (30/30/20/20):
 * - 30% Rank  (overall quality assessment)
 * - 30% Tone  (tuning quality - equal to rank!)
 * - 20% Tech  (technical performance)
 * - 20% Value (value rating)
 *
 * @param component - Component with Crinacle expert data
 * @returns Expert score from 0-10
 *
 * Examples:
 * - Hifiman Susvara (S/S/S/1): 8.37
 * - 7Hz Timeless (A/A/A/3): 8.40
 * - Sennheiser HD600 (A-/S-/B+/2): 7.68
 * - Moondrop Chu (B/A+/C+/3): 7.60
 */
export function calculateExpertScore(component: ScoringComponent): number {
  // Convert letter grades to 0-10 numeric scores
  const rankScore = gradeToNumeric(component.crin_rank);
  const toneScore = gradeToNumeric(component.crin_tone);
  const techScore = gradeToNumeric(component.crin_tech);

  // Scale value rating (0-3) to 0-10 range
  // Value 0 = 0 pts, Value 1 = 3.33 pts, Value 2 = 6.67 pts, Value 3 = 10 pts
  const valueScore = ((component.crin_value ?? 0) / 3) * 10;

  // Apply 30/30/20/20 weighting
  const expertScore =
    rankScore * 0.30 +  // 30% overall quality assessment
    toneScore * 0.30 +  // 30% tuning quality (equal to rank)
    techScore * 0.20 +  // 20% technical performance
    valueScore * 0.20;  // 20% value proposition

  return expertScore;
}

/**
 * Check if component has sufficient Crinacle data for scoring
 *
 * @param component - Component to check
 * @returns true if component has at least rank or tone/tech grades
 */
export function hasExpertData(component: ScoringComponent): boolean {
  return !!(
    component.crin_rank ||
    component.crin_tone ||
    component.crin_tech ||
    component.crin_value
  );
}

/**
 * Calculate expert confidence multiplier based on data completeness
 *
 * @param component - Component to evaluate
 * @returns Confidence multiplier from 0-1
 *
 * Scoring:
 * - All 4 fields present: 1.0 (full confidence)
 * - 3 fields present: 0.9
 * - 2 fields present: 0.75
 * - 1 field present: 0.5
 * - No fields: 0
 */
export function calculateExpertConfidence(component: ScoringComponent): number {
  const fieldsPresent = [
    component.crin_rank,
    component.crin_tone,
    component.crin_tech,
    component.crin_value !== null && component.crin_value !== undefined,
  ].filter(Boolean).length;

  const confidenceMap: Record<number, number> = {
    4: 1.0,   // All fields - full confidence
    3: 0.9,   // Most fields - high confidence
    2: 0.75,  // Half fields - moderate confidence
    1: 0.5,   // One field - low confidence
    0: 0,     // No data - no confidence
  };

  return confidenceMap[fieldsPresent] ?? 0;
}
