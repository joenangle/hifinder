/**
 * Unified price extraction for all listing sources
 * Consolidates price parsing logic from reddit-avexchange-scraper, reverb-integration, etc.
 *
 * Handles various formats:
 * - $500, $1,500
 * - asking $500, asking 500
 * - [W] $500, [H] item [W] $500
 * - 500 shipped, 500 obo
 * - Filters out discount amounts ($50 off, $100 discount)
 */

/**
 * Extract price from listing title/description
 * @param {string} text - Text to extract price from (title, description, etc.)
 * @param {object} options - Extraction options
 * @param {number} options.minPrice - Minimum reasonable price (default: 20)
 * @param {number} options.maxPrice - Maximum reasonable price (default: 10000)
 * @returns {object|null} - {price: number, raw: string, confidence: number} or null
 */
function extractPrice(text, options = {}) {
  const { minPrice = 20, maxPrice = 10000 } = options;

  if (!text) return null;

  // Common Reddit/marketplace price patterns (ordered by specificity)
  const patterns = [
    /\$(\d{1,5}(?:,\d{3})*)/g,           // $500 or $1,500
    /asking\s*\$?(\d{1,5})/gi,            // asking $500 or asking 500
    /price[:\s]+\$?(\d{1,5})/gi,          // price: $500
    /\[w\]\s*\$?(\d{1,5})/gi,             // [W] $500
    /\[h\].*?\[w\]\s*\$?(\d{1,5})/gi,     // [H] item [W] $500
    /(\d{1,5})\s*shipped/gi,              // 500 shipped
    /(\d{1,5})\s*(?:usd|dollars?)/gi,     // 500 USD or 500 dollars
    /obo.*?\$?(\d{1,5})/gi,               // obo $500
    /\$?(\d{1,5})\s*obo/gi,               // 500 obo or $500 obo
  ];

  // Patterns that indicate a price is NOT the actual asking price (discount amounts)
  const discountPatterns = [
    /\$?(\d{1,5})\s*(?:off|discount|savings|reduced|sale)/gi,  // $50 off, $100 discount
    /(?:off|discount|savings|reduced|sale)\s*\$?(\d{1,5})/gi,  // off $50, discount $100
  ];

  let foundPrices = [];

  for (const pattern of patterns) {
    const matches = [...text.matchAll(pattern)];
    for (const match of matches) {
      const priceStr = match[1].replace(/,/g, '');
      const price = parseInt(priceStr);

      // Sanity check: reasonable audio equipment price range
      if (price >= minPrice && price <= maxPrice) {
        // Check if this price is part of a discount phrase
        const matchIndex = text.indexOf(match[0]);
        const surroundingText = text.substring(
          Math.max(0, matchIndex - 20),
          Math.min(text.length, matchIndex + match[0].length + 20)
        );

        let isDiscount = false;
        for (const discountPattern of discountPatterns) {
          if (discountPattern.test(surroundingText)) {
            isDiscount = true;
            break;
          }
        }

        if (!isDiscount) {
          foundPrices.push({ price, raw: match[0], confidence: 1 });
        }
      }
    }
  }

  // If multiple prices found, take the most likely one (first non-discount)
  if (foundPrices.length > 0) {
    return foundPrices[0];
  }

  return null;
}

/**
 * Extract price range from text (e.g., "$300-400" or "300 to 400")
 * @param {string} text - Text to extract range from
 * @returns {object|null} - {min: number, max: number} or null
 */
function extractPriceRange(text) {
  if (!text) return null;

  const rangePatterns = [
    /\$?(\d{1,5})\s*-\s*\$?(\d{1,5})/,          // $300-$400 or 300-400
    /\$?(\d{1,5})\s+to\s+\$?(\d{1,5})/i,        // $300 to $400
    /between\s+\$?(\d{1,5})\s+and\s+\$?(\d{1,5})/i  // between $300 and $400
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
 * Validate if price is reasonable based on expected range
 * @param {number} price - Price to validate
 * @param {number} expectedMin - Expected minimum price
 * @param {number} expectedMax - Expected maximum price
 * @returns {object} - {isReasonable: boolean, variance: number, warning: string|null}
 */
function validatePriceReasonable(price, expectedMin, expectedMax) {
  if (!expectedMin || !expectedMax) {
    return { isReasonable: true, variance: 0, warning: null };
  }

  const expectedAvg = (expectedMin + expectedMax) / 2;
  const variance = ((price - expectedAvg) / expectedAvg) * 100;

  // Price is reasonable if within 50% of expected average
  const isReasonable = Math.abs(variance) <= 50;

  let warning = null;
  if (variance > 50) {
    warning = `Price ${Math.round(variance)}% above market average`;
  } else if (variance < -50) {
    warning = `Price ${Math.abs(Math.round(variance))}% below market average - may be scam or broken`;
  }

  return {
    isReasonable,
    variance: Math.round(variance),
    warning
  };
}

/**
 * Parse Reverb API price format
 * @param {object} priceObject - Reverb price object {amount, currency, display}
 * @returns {number|null} - Price as number or null
 */
function parseReverbPrice(priceObject) {
  if (!priceObject) return null;

  // Reverb provides amount in dollars with cents
  if (priceObject.amount) {
    return parseFloat(priceObject.amount);
  }

  // Fallback: parse display string
  if (priceObject.display) {
    const match = priceObject.display.match(/[\d,]+\.?\d*/);
    if (match) {
      return parseFloat(match[0].replace(/,/g, ''));
    }
  }

  return null;
}

module.exports = {
  extractPrice,
  extractPriceRange,
  validatePriceReasonable,
  parseReverbPrice
};
