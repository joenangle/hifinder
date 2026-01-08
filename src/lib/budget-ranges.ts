/**
 * Shared Budget Range Utilities
 *
 * Progressive budget ranges that adapt across price tiers.
 * Used by both recommendations API and filter counts API to ensure consistency.
 */

export interface BudgetRange {
  min: number
  max: number
}

/**
 * V3: Calculate budget range with user parameter support and smooth transitions.
 *
 * Priority:
 * 1. If user provides custom percentages, use those (respects user control)
 * 2. Otherwise, use smooth progressive defaults (no hard tier boundaries)
 *
 * @param budget - The target budget amount
 * @param rangeMinPercent - User's desired percentage below budget (optional)
 * @param rangeMaxPercent - User's desired percentage above budget (optional)
 * @param isSignalGear - Whether this is for DACs/amps/combos (allows lower minimums)
 * @returns Object with min and max budget values
 *
 * @example
 * // User-controlled ranges
 * calculateBudgetRange(150, 20, 10)  // { min: 120, max: 165 }
 *
 * // Smooth progressive defaults (no user input)
 * calculateBudgetRange(150)  // { min: 105, max: 173 }
 * calculateBudgetRange(151)  // { min: 106, max: 174 } (continuous)
 */
export function calculateBudgetRange(
  budget: number,
  rangeMinPercent?: number,
  rangeMaxPercent?: number,
  isSignalGear: boolean = false
): BudgetRange {

  // PRIORITY 1: User-specified ranges (override all defaults)
  if (rangeMinPercent !== undefined && rangeMaxPercent !== undefined) {
    const absoluteMin = isSignalGear ? 5 : 20;
    const calculatedMin = Math.round(budget * (1 - rangeMinPercent / 100));

    return {
      min: Math.max(absoluteMin, calculatedMin),
      max: Math.round(budget * (1 + rangeMaxPercent / 100))
    };
  }

  // PRIORITY 2: Smooth progressive defaults (no hard boundaries)
  // Uses exponential decay curves for seamless transitions

  // SPECIAL HANDLING FOR SIGNAL GEAR (DAC/Amp/Combo)
  // Signal gear has excellent options at low price points (dongles, budget DACs)
  // Search wider ranges to capture these options
  if (isSignalGear) {
    if (budget <= 250) {
      // Entry-level signal gear: Search from $20 to catch budget options
      // Examples: Apple dongle ($9), Tempotec ($40), Atom DAC/Modi ($100)
      return {
        min: 20,
        max: Math.round(budget * 1.1) // +10% above budget
      };
    } else {
      // Higher-end signal gear: Search 30% lower to catch good deals
      // Many excellent amps/DACs available below allocated budget
      const maxPercent = 5 + 15 * Math.exp(-budget / 800);
      return {
        min: Math.max(20, Math.round(budget * 0.7)), // Search 30% lower
        max: Math.round(budget * (1 + maxPercent / 100))
      };
    }
  }

  // STANDARD HANDLING FOR HEADPHONES/IEMs
  // Calculate adaptive percentages based on budget
  // maxPercent: 20% at $0 → 5% at $2500+ (smooth decay)
  const maxPercent = 5 + 15 * Math.exp(-budget / 800);

  // minPercent: 35% at $0 → 10% at $2500+ (smooth decay)
  const minPercent = 10 + 25 * Math.exp(-budget / 1000);

  // Apply absolute minimums for very low budgets
  const absoluteMin = 20;
  const calculatedMin = Math.round(budget * (1 - minPercent / 100));

  return {
    min: Math.max(absoluteMin, calculatedMin),
    max: Math.round(budget * (1 + maxPercent / 100))
  };
}

/**
 * Legacy function for backward compatibility with existing code.
 * Converts old percentage-based system to new progressive ranges.
 *
 * @deprecated Use calculateBudgetRange() directly instead
 */
export function legacyBudgetRange(
  budget: number,
  _rangeMinPercent: number = 20, // Deprecated parameter
  _rangeMaxPercent: number = 10, // Deprecated parameter
  isSignalGear: boolean = false
): BudgetRange {
  // Ignore old percentages, use new progressive logic with smooth defaults
  return calculateBudgetRange(budget, undefined, undefined, isSignalGear)
}
