/**
 * Listing Validator - Post-Match Validation Layer
 *
 * Validates listings before saving to database to catch obvious mismatches.
 * Features:
 * - Bundle-aware price validation (skips validation for bundle components)
 * - Category keyword conflict detection
 * - Price sanity checks (>300% = reject, >150% = flag)
 */

/**
 * Validates listing price against component's new price
 *
 * @param {number} listingPrice - Extracted price from listing
 * @param {number} componentPriceNew - Component's new/MSRP price
 * @param {boolean} isBundle - Whether this is part of a bundle
 * @param {number|null} bundleTotalPrice - Total price for entire bundle
 * @returns {Object} - Validation result with action
 */
function validatePrice(listingPrice, componentPriceNew, isBundle = false, bundleTotalPrice = null) {
  // Skip validation for bundle components (individual prices unknown)
  if (isBundle && !listingPrice && bundleTotalPrice) {
    return {
      valid: true,
      action: 'accept',
      note: 'Bundle component - individual price not available'
    };
  }

  // Price extraction failed
  if (!listingPrice || listingPrice === 0) {
    return {
      valid: false,
      severity: 'warning',
      reason: 'Price extraction failed',
      action: 'flag_for_review'
    };
  }

  // No reference price to compare against
  if (!componentPriceNew || componentPriceNew === 0) {
    return {
      valid: true,
      action: 'accept',
      note: 'No reference price available for validation'
    };
  }

  // Calculate price ratio
  const priceRatio = listingPrice / componentPriceNew;

  // Severe overprice (>300% of new price) - REJECT
  if (priceRatio > 3.0) {
    return {
      valid: false,
      severity: 'error',
      reason: `Price too high: $${listingPrice} for component with MSRP $${componentPriceNew} (${(priceRatio * 100).toFixed(0)}%)`,
      action: 'reject'
    };
  }

  // Moderate overprice (>150% of new price) - FLAG
  if (priceRatio > 1.5) {
    return {
      valid: true,
      severity: 'warning',
      reason: `Potentially overpriced: $${listingPrice} vs MSRP $${componentPriceNew} (${(priceRatio * 100).toFixed(0)}%)`,
      action: 'flag_for_review'
    };
  }

  // Suspiciously low price (<20% of new price) - FLAG
  // May indicate accessory-only or damaged item
  if (priceRatio < 0.2) {
    return {
      valid: true,
      severity: 'warning',
      reason: `Unusually low price: $${listingPrice} vs MSRP $${componentPriceNew} (${(priceRatio * 100).toFixed(0)}%) - possible accessory`,
      action: 'flag_for_review'
    };
  }

  // Price looks reasonable
  return {
    valid: true,
    action: 'accept'
  };
}

/**
 * Validates category by checking for keyword conflicts
 *
 * @param {string} listingText - Title or description
 * @param {string} componentCategory - Component's category
 * @returns {Object} - Validation result
 */
function validateCategory(listingText, componentCategory) {
  const text = listingText.toLowerCase();

  // Category keyword conflicts
  const conflicts = [
    {
      category: 'cans',
      conflictKeywords: ['\\biem\\b', '\\biems\\b', 'in-ear', 'in ear'],
      conflictCategory: 'iems'
    },
    {
      category: 'iems',
      conflictKeywords: ['\\bheadphone\\b', '\\bheadphones\\b', 'over-ear', 'over ear'],
      conflictCategory: 'cans'
    },
    {
      category: 'dacs',
      conflictKeywords: ['\\bamp\\b', '\\bamplifier\\b', '\\bamps\\b'],
      conflictCategory: 'amps',
      // Allow common exceptions
      exceptions: ['dac/amp', 'dac amp', 'combo']
    },
    {
      category: 'amps',
      conflictKeywords: ['\\bdac\\b'],
      conflictCategory: 'dacs',
      exceptions: ['dac/amp', 'dac amp', 'combo']
    }
  ];

  for (const conflict of conflicts) {
    if (componentCategory === conflict.category) {
      // Check for exceptions first
      if (conflict.exceptions) {
        const hasException = conflict.exceptions.some(exc => text.includes(exc));
        if (hasException) continue; // Skip conflict check if exception found
      }

      // Check for conflicting keywords
      for (const keyword of conflict.conflictKeywords) {
        const regex = new RegExp(keyword, 'i');
        if (regex.test(text)) {
          return {
            valid: false,
            severity: 'error',
            reason: `Category conflict: Component is ${componentCategory} but listing mentions ${conflict.conflictCategory}`,
            action: 'reject'
          };
        }
      }
    }
  }

  return {
    valid: true,
    action: 'accept'
  };
}

/**
 * Orchestrates all validation checks for a listing
 *
 * @param {Object} listing - Listing object to validate
 * @param {Object} component - Matched component object
 * @param {number} matchScore - Match confidence score
 * @returns {Object} - Aggregated validation result
 */
function validateListing(listing, component, matchScore) {
  const validations = {
    price: validatePrice(
      listing.price,
      component.price_new,
      listing.is_bundle,
      listing.bundle_total_price
    ),
    category: validateCategory(listing.title, component.category)
  };

  // Determine overall action
  const hasErrors = Object.values(validations).some(v => v.severity === 'error');
  const hasWarnings = Object.values(validations).some(v => v.severity === 'warning');

  return {
    shouldReject: hasErrors,
    shouldFlag: hasWarnings,
    validations
  };
}

module.exports = {
  validateListing,
  validatePrice,
  validateCategory
};
