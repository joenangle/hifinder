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
 * Calculate adaptive budget range based on total budget.
 * Ranges adjust to be useful at low, mid, and high budgets.
 *
 * @param budget - The target budget amount
 * @param isSignalGear - Whether this is for DACs/amps/combos (allows lower minimums)
 * @returns Object with min and max budget values
 *
 * @example
 * calculateBudgetRange(250, false)  // { min: 175, max: 288 }
 * calculateBudgetRange(5000, false) // { min: 3250, max: 5250 }
 */
export function calculateBudgetRange(
  budget: number,
  isSignalGear: boolean = false
): BudgetRange {

  // Entry-level ($0-$150): Need wide bottom, moderate top
  if (budget <= 150) {
    // Signal gear can go very low ($5 dongles exist)
    // Headphones/IEMs rarely under $20
    const absoluteMin = isSignalGear ? 5 : 20

    return {
      min: absoluteMin,
      max: Math.round(budget * 1.20)  // 20% stretch for entry tier
    }
  }

  // Budget tier ($150-$400): Balanced percentage ranges
  if (budget <= 400) {
    return {
      min: Math.round(budget * 0.70),  // 30% down
      max: Math.round(budget * 1.15)   // 15% up
    }
  }

  // Mid-range ($400-$1000): Standard ranges
  if (budget <= 1000) {
    return {
      min: Math.round(budget * 0.75),  // 25% down
      max: Math.round(budget * 1.10)   // 10% up
    }
  }

  // High-end ($1000-$2500): Tighter top
  if (budget <= 2500) {
    return {
      min: Math.round(budget * 0.70),  // 30% down (catch deals)
      max: Math.round(budget * 1.05)   // Only 5% up
    }
  }

  // Summit-fi ($2500+): Wide bottom for deals, small stretch on top
  return {
    min: Math.round(budget * 0.65),    // 35% down (used market deals)
    max: Math.round(budget * 1.05)     // 5% stretch
  }
}

/**
 * Legacy function for backward compatibility with existing code.
 * Converts old percentage-based system to new progressive ranges.
 *
 * @deprecated Use calculateBudgetRange() directly instead
 */
export function legacyBudgetRange(
  budget: number,
  rangeMinPercent: number = 20,
  rangeMaxPercent: number = 10,
  isSignalGear: boolean = false
): BudgetRange {
  // Ignore old percentages, use new progressive logic
  return calculateBudgetRange(budget, isSignalGear)
}
