/**
 * Listing Validator - Post-Match Validation Layer
 *
 * Validates listings at ingest (and during backfill) to catch obvious price/category
 * errors before they reach the database or the recommendation engine.
 *
 * Price validation prefers the component's USED-market band
 * (price_used_min / price_used_max) and falls back to a ratio against MSRP
 * (price_new) when no band is available.
 *
 * Policy (decided with product):
 *   - reject → caller stores the listing with price = null + requires_manual_review
 *   - flag   → caller keeps the price but sets requires_manual_review
 */

const pct = (value, ref) => (ref ? Math.round(((value - ref) / ref) * 100) : null);

/**
 * Validate a listing price against a component's reference prices.
 *
 * @param {number|null} listingPrice
 * @param {Object} component - carries price_new, price_used_min, price_used_max
 * @param {Object} [opts]
 * @param {boolean} [opts.isBundleEstimate] - price is a heuristic bundle split (skip strict band checks)
 * @param {number|null} [opts.bundleTotalPrice] - total for a bundle whose component price is unknown
 * @returns {{action:'accept'|'flag_for_review'|'reject', severity?:string, reason?:string, variance:number|null, warning?:string}}
 */
function validatePrice(listingPrice, component, opts = {}) {
  const { isBundleEstimate = false, bundleTotalPrice = null } = opts;
  const priceNew = component.price_new || null;
  const usedMin = component.price_used_min || null;
  const usedMax = component.price_used_max || null;

  // Bundle component with no individual price — legitimate; the price lives in the bundle total.
  if ((!listingPrice || listingPrice <= 0) && bundleTotalPrice) {
    return { action: 'accept', variance: null, note: 'Bundle component - individual price not available' };
  }

  // Price extraction failed.
  if (!listingPrice || listingPrice <= 0) {
    return { action: 'flag_for_review', severity: 'warning', reason: 'Price extraction failed', variance: null };
  }

  // Bundle split estimates are heuristic — only catch gross errors.
  if (isBundleEstimate) {
    if (priceNew && listingPrice > priceNew * 4) {
      return {
        action: 'reject',
        severity: 'error',
        reason: `Bundle estimate implausibly high: $${listingPrice} vs MSRP $${priceNew}`,
        variance: pct(listingPrice, priceNew),
      };
    }
    return { action: 'accept', variance: pct(listingPrice, priceNew) };
  }

  // Primary: used-market band (tightest, most realistic for second-hand gear).
  if (usedMin && usedMax) {
    const mid = (usedMin + usedMax) / 2;
    const variance = Math.round(((listingPrice - mid) / mid) * 100);

    if (listingPrice < usedMin * 0.4) {
      return {
        action: 'reject',
        severity: 'error',
        reason: `Price implausibly low: $${listingPrice} vs used range $${usedMin}–$${usedMax}`,
        variance,
      };
    }
    if (listingPrice > usedMax * 2.5) {
      return {
        action: 'reject',
        severity: 'error',
        reason: `Price implausibly high: $${listingPrice} vs used range $${usedMin}–$${usedMax}`,
        variance,
      };
    }
    if (listingPrice < usedMin * 0.7) {
      return {
        action: 'flag_for_review',
        severity: 'warning',
        reason: `Below used-market range: $${listingPrice} vs $${usedMin}–$${usedMax}`,
        variance,
      };
    }
    if (listingPrice > usedMax * 1.5) {
      return {
        action: 'flag_for_review',
        severity: 'warning',
        reason: `Above used-market range: $${listingPrice} vs $${usedMin}–$${usedMax}`,
        variance,
      };
    }
    return { action: 'accept', variance };
  }

  // Fallback: ratio against MSRP.
  if (priceNew) {
    const ratio = listingPrice / priceNew;
    const variance = Math.round((ratio - 1) * 100);
    const pctStr = Math.round(ratio * 100);

    if (ratio < 0.1) {
      return { action: 'reject', severity: 'error', reason: `Price too low: $${listingPrice} vs MSRP $${priceNew} (${pctStr}%)`, variance };
    }
    if (ratio > 3.0) {
      return { action: 'reject', severity: 'error', reason: `Price too high: $${listingPrice} vs MSRP $${priceNew} (${pctStr}%)`, variance };
    }
    if (ratio < 0.2) {
      return { action: 'flag_for_review', severity: 'warning', reason: `Unusually low: $${listingPrice} vs MSRP $${priceNew} (${pctStr}%) - possible accessory/parts`, variance };
    }
    if (ratio > 1.5) {
      return { action: 'flag_for_review', severity: 'warning', reason: `Potentially overpriced: $${listingPrice} vs MSRP $${priceNew} (${pctStr}%)`, variance };
    }
    return { action: 'accept', variance };
  }

  // No reference price at all — accept, but note it (do NOT flag; would bury too much).
  return { action: 'accept', variance: null, warning: 'No reference price for validation' };
}

/**
 * Validates category by checking for keyword conflicts
 *
 * @param {string} listingText - Title or description
 * @param {string} componentCategory - Component's category
 * @returns {Object} - Validation result
 */
function validateCategory(listingText, componentCategory) {
  const text = (listingText || '').toLowerCase();

  const conflicts = [
    { category: 'cans', conflictKeywords: ['\\biem\\b', '\\biems\\b', 'in-ear', 'in ear'], conflictCategory: 'iems' },
    { category: 'iems', conflictKeywords: ['\\bheadphone\\b', '\\bheadphones\\b', 'over-ear', 'over ear'], conflictCategory: 'cans' },
    { category: 'dacs', conflictKeywords: ['\\bamp\\b', '\\bamplifier\\b', '\\bamps\\b'], conflictCategory: 'amps', exceptions: ['dac/amp', 'dac amp', 'combo'] },
    { category: 'amps', conflictKeywords: ['\\bdac\\b'], conflictCategory: 'dacs', exceptions: ['dac/amp', 'dac amp', 'combo'] },
  ];

  for (const conflict of conflicts) {
    if (componentCategory === conflict.category) {
      if (conflict.exceptions) {
        const hasException = conflict.exceptions.some(exc => text.includes(exc));
        if (hasException) continue;
      }
      for (const keyword of conflict.conflictKeywords) {
        const regex = new RegExp(keyword, 'i');
        if (regex.test(text)) {
          return {
            valid: false,
            severity: 'error',
            reason: `Category conflict: Component is ${componentCategory} but listing mentions ${conflict.conflictCategory}`,
            action: 'reject',
          };
        }
      }
    }
  }

  return { valid: true, action: 'accept' };
}

/**
 * Orchestrates all validation checks for a listing and returns ready-to-apply columns.
 *
 * @param {Object} listing - { price, title, price_is_estimated, bundle_total_price, ... }
 * @param {Object} component - { category, price_new, price_used_min, price_used_max }
 * @param {number} [matchScore]
 * @returns {{
 *   shouldReject:boolean, shouldFlag:boolean, validations:Object,
 *   priceOverride:number|null, priceIsReasonable:boolean,
 *   priceVariancePercentage:number|null, priceWarning:string|null, validationWarnings:string[]
 * }}
 */
function validateListing(listing, component, matchScore) {
  const validations = {
    price: validatePrice(listing.price, component, {
      isBundleEstimate: !!listing.price_is_estimated,
      bundleTotalPrice: listing.bundle_total_price || null,
    }),
    category: validateCategory(listing.title, component.category),
  };

  const hasErrors = Object.values(validations).some(v => v.severity === 'error');
  const hasWarnings = Object.values(validations).some(v => v.severity === 'warning');

  const shouldReject = hasErrors;
  const shouldFlag = hasWarnings;

  const validationWarnings = Object.values(validations)
    .map(v => v.reason)
    .filter(Boolean);

  const priceWarning =
    validations.price.reason ||
    validations.price.warning ||
    (validations.category.severity === 'error' ? validations.category.reason : null) ||
    null;

  return {
    shouldReject,
    shouldFlag,
    validations,
    // Convenience fields so callers can apply DB columns without re-deriving:
    priceOverride: shouldReject ? null : listing.price, // null out a corrupt price on reject
    priceIsReasonable: !(shouldReject || shouldFlag),
    priceVariancePercentage: validations.price.variance ?? null,
    priceWarning,
    validationWarnings,
  };
}

module.exports = {
  validateListing,
  validatePrice,
  validateCategory,
};
