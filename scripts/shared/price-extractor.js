/**
 * Unified price extraction for all listing sources.
 *
 * Single source of truth — the Reddit r/AVexchange scraper and the offline
 * revalidation job both delegate here so extraction logic can't drift.
 *
 * Handles:
 * - $500, $1,500, $1,200 firm (comma-thousands preserved)
 * - asking $500, asking 500, price: $500, selling for $500
 * - [W] $500  (but NOT "[W] PayPal" — [W] = the seller's *want*, often a payment method)
 * - 500 shipped, 500 obo, 500 USD
 * - Bundle totals ("asking $500 for all", "$300 total")
 * - Filters discount amounts ($50 off, $100 discount)
 * - Excludes non-price numbers adjacent to units (24 hours, 1.2m cable, 24 ohm, 2x, v2, 50%)
 * - De-prioritises MSRP/retail reference prices ("MSRP $1500, selling $900" → 900)
 */

// ---------------------------------------------------------------------------
// Exclusion rules: a number is NOT a price when it sits next to these tokens.
// ---------------------------------------------------------------------------
const EXCLUSION = {
  // Unit/word immediately AFTER the digits → reject (time, length, impedance,
  // quantity, percentage, ordinals, glued model letters like "5K"/"v2").
  trailingUnit:
    /^[\s-]*(?:hours?|hrs?|days?|wks?|weeks?|months?|mos?|years?|yrs?|cm|mm|m|ft|feet|foot|inch(?:es)?|"|ohms?|Ω|ω|pcs?|pieces?|units?|pairs?|sets?|times?|%|st|nd|rd|th|k\b)/i,
  // Letter glued directly to the digits with no space ("5K", "24bit") → model/spec, not price.
  trailingGlue: /^[a-z]/i,
  // Word immediately BEFORE the number → reject (quantities, versions). Kept
  // deliberately narrow: durations like "for 24 hours" are caught by trailingUnit,
  // and common price lead-ins ("for", "only", "asking") must NOT appear here.
  precedingContext:
    /(?:within|past|last|qty|quantity|count|impedance|version|ver|mk|gen|rev|model)\.?\s*$/i,
};

// Phrases that indicate a number is a discount amount, not the asking price.
// Note: "sale"/"reduced" are deliberately excluded — "sale price" / "reduced to $X"
// usually denote the asking price, not a discount amount.
const DISCOUNT_CONTEXT = /(?:off|discount|savings|coupon)/i;

// MSRP/retail reference indicators (price quoted is NOT the asking price).
const MSRP_CONTEXT =
  /\b(?:msrp|rrp|retails?|originally?|original\s+(?:price|cost)|bought\s+(?:for|at|it)|paid|new\s+price|list\s+price|was|worth|cost\s+(?:me|was))\b/i;

// Confidence + tier metadata per source pattern.
const TIERS = {
  bundle: { priority: 1, confidence: 0.9 },
  asking: { priority: 3, confidence: 0.9 },
  shipped: { priority: 4, confidence: 0.9 },
  W: { priority: 0, confidence: 0.85 },
  dollar: { priority: 2, confidence: 0.7 },
  usd: { priority: 5, confidence: 0.6 },
  msrp: { priority: 9, confidence: 0.2 }, // demoted dollar match in MSRP context
};

const PAYMENT_WORDS = /\b(?:paypal|venmo|zelle|cash|local|f\s*&\s*f|g\s*&\s*s|goods|friends)\b/i;

/**
 * Is the number occupying [numStart, numEnd) in `text` a non-price number?
 * Checks the unit immediately after it and the word immediately before it.
 */
function isExcludedNumber(text, numStart, numEnd) {
  const after = text.slice(numEnd, numEnd + 14);
  if (EXCLUSION.trailingUnit.test(after)) return true;
  // Letter glued with no separating space (e.g. "5K", "24bit") — but allow a space.
  if (/^[a-z]/i.test(after) && !/^\s/.test(after) && EXCLUSION.trailingGlue.test(after)) {
    return true;
  }
  const before = text.slice(Math.max(0, numStart - 25), numStart).replace(/\$\s*$/, '');
  if (EXCLUSION.precedingContext.test(before)) return true;
  return false;
}

/**
 * Locate the digit substring of a regex match so exclusion checks can look at
 * exactly what surrounds the number (not the whole match).
 * @returns {{numStart:number, numEnd:number}}
 */
function locateNumber(match, rawDigits) {
  const offsetInMatch = match[0].lastIndexOf(rawDigits);
  const numStart = match.index + (offsetInMatch >= 0 ? offsetInMatch : 0);
  return { numStart, numEnd: numStart + rawDigits.length };
}

/**
 * Extract the most likely asking price from listing text.
 *
 * @param {string} text
 * @param {object} [options]
 * @param {number} [options.minPrice=20] - reject anything below (kills "24 hours" style junk)
 * @param {number} [options.maxPrice=10000]
 * @param {boolean} [options.preferHighest] - force bundle-total selection within a tier
 * @returns {{price:number, raw:string, sourcePattern:string, confidence:number}|null}
 */
function extractPrice(text, options = {}) {
  const { minPrice = 20, maxPrice = 10000 } = options;
  if (!text) return null;

  const hasBundleKeywords =
    /\b(all|bundle|total|together|both|for everything|combo|package)\b/i.test(text);
  const preferHighest = options.preferHighest ?? hasBundleKeywords;

  // Tiered patterns. Each captures the digit group in match[1].
  const patterns = [
    { type: 'W', re: /\[W\][^[]{0,30}?\$(\d{2,5}(?:,\d{3})*)\b/gi },
    {
      type: 'bundle',
      re: /\b(?:asking|price:?|selling)\s*\$?(\d{1,5}(?:,\d{3})*)\s*(?:for\s+)?(?:all|total|together|both|everything|bundle)/gi,
    },
    { type: 'dollar', re: /\$(\d{1,5}(?:,\d{3})*(?:\.\d{2})?)/g },
    { type: 'asking', re: /\b(?:asking|price:?|selling\s*(?:for|at)?)\s*\$?(\d{1,5}(?:,\d{3})*)/gi },
    { type: 'shipped', re: /\b(\d{3,5})\s*(?:shipped|obo|or best offer|firm)\b/gi },
    { type: 'usd', re: /\b(\d{3,5})\s*(?:usd|dollars?)\b/gi },
  ];

  const candidates = [];

  for (const { type, re } of patterns) {
    let match;
    while ((match = re.exec(text)) !== null) {
      const rawDigits = match[1];
      const price = parseInt(rawDigits.replace(/,/g, ''), 10);
      if (!(price >= minPrice && price <= maxPrice)) continue;

      const { numStart, numEnd } = locateNumber(match, rawDigits);

      // Skip numbers that are really durations/quantities/lengths/etc.
      if (isExcludedNumber(text, numStart, numEnd)) continue;

      // Skip discount amounts ("$50 off").
      const window = text.slice(Math.max(0, numStart - 20), numEnd + 20);
      if (DISCOUNT_CONTEXT.test(window)) continue;

      let tier = type;
      // Demote dollar matches sitting in MSRP/retail context.
      if (type === 'dollar') {
        const before = text.slice(Math.max(0, numStart - 40), numStart);
        if (MSRP_CONTEXT.test(before)) tier = 'msrp';
      }
      // A [W] clause that is only payment methods is not a price.
      if (type === 'W') {
        const clause = text.slice(match.index, numStart);
        if (PAYMENT_WORDS.test(clause) && !clause.includes('$')) continue;
      }

      candidates.push({
        price,
        raw: match[0].trim(),
        sourcePattern: tier,
        ...TIERS[tier],
      });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    // Within a tier: bundle context → prefer the total (highest); else the item (lowest).
    return preferHighest ? b.price - a.price : a.price - b.price;
  });

  const top = candidates[0];
  return {
    price: top.price,
    raw: top.raw,
    sourcePattern: top.sourcePattern,
    confidence: top.confidence,
  };
}

/**
 * Extract price range from text (e.g., "$300-400" or "300 to 400")
 * @returns {{min:number, max:number}|null}
 */
function extractPriceRange(text) {
  if (!text) return null;

  const rangePatterns = [
    /\$?(\d{1,5})\s*-\s*\$?(\d{1,5})/,
    /\$?(\d{1,5})\s+to\s+\$?(\d{1,5})/i,
    /between\s+\$?(\d{1,5})\s+and\s+\$?(\d{1,5})/i,
  ];

  for (const pattern of rangePatterns) {
    const match = text.match(pattern);
    if (match) {
      const min = parseInt(match[1]);
      const max = parseInt(match[2]);
      if (min < max && min >= 20 && max <= 10000) {
        return { min, max };
      }
    }
  }
  return null;
}

/**
 * Validate if price is reasonable based on expected used-market range.
 * @returns {{isReasonable:boolean, variance:number, warning:string|null}}
 */
function validatePriceReasonable(price, expectedMin, expectedMax) {
  if (!expectedMin || !expectedMax) {
    return { isReasonable: true, variance: 0, warning: null };
  }

  const expectedAvg = (expectedMin + expectedMax) / 2;
  const variance = ((price - expectedAvg) / expectedAvg) * 100;
  const isReasonable = Math.abs(variance) <= 50;

  let warning = null;
  if (variance > 50) {
    warning = `Price ${Math.round(variance)}% above market average`;
  } else if (variance < -50) {
    warning = `Price ${Math.abs(Math.round(variance))}% below market average - may be scam or broken`;
  }

  return { isReasonable, variance: Math.round(variance), warning };
}

/**
 * Parse Reverb API price format.
 * @returns {number|null}
 */
function parseReverbPrice(priceObject) {
  if (!priceObject) return null;
  if (priceObject.amount) {
    return Math.round(parseFloat(priceObject.amount));
  }
  if (priceObject.display) {
    const match = priceObject.display.match(/[\d,]+\.?\d*/);
    if (match) {
      return Math.round(parseFloat(match[0].replace(/,/g, '')));
    }
  }
  return null;
}

module.exports = {
  extractPrice,
  extractPriceRange,
  validatePriceReasonable,
  parseReverbPrice,
  isExcludedNumber,
  EXCLUSION,
};
