/**
 * Bundle Extractor - Multi-Component Listing Handler
 *
 * Handles bundle listings like "HD600 + Focal Clear MG - $800"
 * by extracting and matching each component separately.
 *
 * Key Features:
 * - Splits bundle text into individual segments
 * - Matches each segment independently
 * - Deduplicates same components
 * - Generates bundle group IDs for linking
 */

const { findComponentMatch } = require('./component-matcher-enhanced');

/**
 * Splits bundle text into individual component segments
 *
 * @param {string} text - Reddit post title or listing text
 * @returns {string[]} - Array of component segments
 */
function splitBundleSegments(text) {
  // Extract [H] section first (Have = what they're selling)
  const haveMatch = text.match(/\[H\]\s*(.+?)\s*\[W\]/i);
  let itemsText = haveMatch ? haveMatch[1] : text;

  // Remove Reddit post tags like [WTS], [WTB], [H], [W]
  itemsText = itemsText.replace(/\[(WTS|WTB|H|W)\]\s*/gi, '');

  // Remove price patterns from the entire text first
  // Handles: "$800", "- $800", "asking $1,200", "800 shipped", etc.
  itemsText = itemsText.replace(/\s*[-–—]\s*\$?\d{2,5}(?:,\d{3})*(?:\.\d{2})?\s*(?:shipped|obo|firm|paypal|usd)?/gi, '');
  itemsText = itemsText.replace(/\$\d{2,5}(?:,\d{3})*(?:\.\d{2})?/g, '');

  // Split on common separators
  // Handles: "HD600 + Clear MG", "HD600, Clear MG", "HD600 and Clear MG", "HD600 / Clear MG"
  const separators = /,|,\s+|\s+\+\s+|\s+and\s+|\s+&\s+|\s+\/\s+|\/(?!\d)/g;
  const segments = itemsText
    .split(separators)
    .map(s => s.trim())
    .filter(s => s.length > 3); // Filter noise (like single letters)

  return segments;
}

/**
 * Matches each bundle segment to components in database
 *
 * @param {string} title - Reddit post title
 * @param {string} description - Post body text
 * @param {string} source - Source identifier (e.g., 'reddit_avexchange')
 * @returns {Promise<Array>} - Array of match results with segment info
 */
async function extractBundleComponents(title, description, source) {
  const segments = splitBundleSegments(title);

  if (segments.length <= 1) {
    // Not a bundle, use single match
    const match = await findComponentMatch(title, description, source);
    return match ? [{ ...match, segment: title }] : [];
  }

  // Match each segment independently
  const matches = [];

  for (const segment of segments) {
    const match = await findComponentMatch(segment, description, source);

    if (match) {
      matches.push({
        ...match,
        segment,
        segmentIndex: segments.indexOf(segment)
      });
    }
  }

  // Deduplicate matches (same component appearing multiple times)
  return deduplicateMatches(matches);
}

/**
 * Deduplicates matches when same component appears multiple times
 * Example: "2x HD600 (black and silver)" → single match with quantity: 2
 *
 * @param {Array} matches - Raw match results
 * @returns {Array} - Deduplicated matches with quantity info
 */
function deduplicateMatches(matches) {
  const seen = new Set();
  const unique = [];

  for (const match of matches) {
    const key = match.component.id;

    if (!seen.has(key)) {
      seen.add(key);
      unique.push(match);
    } else {
      // Same component matched multiple times
      const existing = unique.find(m => m.component.id === key);
      if (existing) {
        existing.quantity = (existing.quantity || 1) + 1;
      }
    }
  }

  return unique;
}

/**
 * Creates bundle group ID for linking related listings
 * Format: bundle_TIMESTAMP_RANDOMID
 *
 * @returns {string} - Unique bundle group ID
 */
function generateBundleGroupId() {
  return `bundle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Handles price splitting for bundles
 * Strategy: Individual prices are unknown, store total in bundle metadata
 *
 * @param {number} totalPrice - Total price for entire bundle
 * @param {number} componentCount - Number of components in bundle
 * @param {number} componentIndex - Index of this component (0-based)
 * @param {Object} component - Component object
 * @returns {Object} - Price info for this component
 */
function calculateBundlePrice(totalPrice, componentCount, componentIndex, component) {
  // Strategy: Price marked as null for individual components
  // Keep total price in bundle metadata
  return {
    individual_price: null,
    bundle_total_price: totalPrice,
    bundle_component_count: componentCount,
    price_note: `Part of ${componentCount}-item bundle ($${totalPrice} total)`
  };
}

module.exports = {
  splitBundleSegments,
  extractBundleComponents,
  generateBundleGroupId,
  calculateBundlePrice,
  deduplicateMatches
};
