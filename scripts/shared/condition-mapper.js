/**
 * Unified condition mapping for all listing sources
 * Consolidates duplicate condition logic from reddit-avexchange-scraper, reverb-integration, etc.
 */

// Standard conditions used in database
const STANDARD_CONDITIONS = {
  EXCELLENT: 'excellent',      // mint, new, like-new
  VERY_GOOD: 'very_good',      // very good, great
  GOOD: 'good',                // good, used
  FAIR: 'fair',                // fair, worn
  PARTS_ONLY: 'parts_only'     // parts, broken, for parts
};

// Mapping from various source formats to standard conditions
const CONDITION_MAPS = {
  // Reddit r/AVexchange format
  reddit: {
    'mint': STANDARD_CONDITIONS.EXCELLENT,
    'like new': STANDARD_CONDITIONS.EXCELLENT,
    'like-new': STANDARD_CONDITIONS.EXCELLENT,
    'excellent': STANDARD_CONDITIONS.EXCELLENT,
    'very good': STANDARD_CONDITIONS.VERY_GOOD,
    'very-good': STANDARD_CONDITIONS.VERY_GOOD,
    'great': STANDARD_CONDITIONS.VERY_GOOD,
    'good': STANDARD_CONDITIONS.GOOD,
    'used': STANDARD_CONDITIONS.GOOD,
    'fair': STANDARD_CONDITIONS.FAIR,
    'worn': STANDARD_CONDITIONS.FAIR,
    'parts': STANDARD_CONDITIONS.PARTS_ONLY,
    'parts only': STANDARD_CONDITIONS.PARTS_ONLY,
    'for parts': STANDARD_CONDITIONS.PARTS_ONLY,
    'broken': STANDARD_CONDITIONS.PARTS_ONLY
  },

  // Reverb condition format
  reverb: {
    'brand new': STANDARD_CONDITIONS.EXCELLENT,
    'brand-new': STANDARD_CONDITIONS.EXCELLENT,
    'mint': STANDARD_CONDITIONS.EXCELLENT,
    'excellent': STANDARD_CONDITIONS.EXCELLENT,
    'very good': STANDARD_CONDITIONS.VERY_GOOD,
    'good': STANDARD_CONDITIONS.GOOD,
    'fair': STANDARD_CONDITIONS.FAIR,
    'poor': STANDARD_CONDITIONS.FAIR,
    'non functioning': STANDARD_CONDITIONS.PARTS_ONLY
  },

  // Head-Fi format
  headfi: {
    '10/10': STANDARD_CONDITIONS.EXCELLENT,
    '9/10': STANDARD_CONDITIONS.EXCELLENT,
    '8/10': STANDARD_CONDITIONS.VERY_GOOD,
    '7/10': STANDARD_CONDITIONS.GOOD,
    '6/10': STANDARD_CONDITIONS.FAIR,
    '5/10': STANDARD_CONDITIONS.FAIR,
    'mint': STANDARD_CONDITIONS.EXCELLENT,
    'excellent': STANDARD_CONDITIONS.EXCELLENT,
    'very good': STANDARD_CONDITIONS.VERY_GOOD,
    'good': STANDARD_CONDITIONS.GOOD,
    'fair': STANDARD_CONDITIONS.FAIR,
    'parts': STANDARD_CONDITIONS.PARTS_ONLY
  }
};

/**
 * Map a condition string from any source to standard condition
 * @param {string} condition - Raw condition string from source
 * @param {string} source - Source type: 'reddit', 'reverb', 'headfi', etc.
 * @returns {string|null} - Standardized condition or null if unmapped
 */
function mapCondition(condition, source = 'reddit') {
  if (!condition) return null;

  // Normalize input
  const normalized = condition.toLowerCase().trim();

  // Get appropriate mapping for source
  const sourceMap = CONDITION_MAPS[source] || CONDITION_MAPS.reddit;

  // Direct lookup
  if (sourceMap[normalized]) {
    return sourceMap[normalized];
  }

  // Fuzzy matching for common patterns
  if (normalized.includes('mint') || normalized.includes('new')) {
    return STANDARD_CONDITIONS.EXCELLENT;
  }
  if (normalized.includes('excellent')) {
    return STANDARD_CONDITIONS.EXCELLENT;
  }
  if (normalized.includes('very good') || normalized.includes('great')) {
    return STANDARD_CONDITIONS.VERY_GOOD;
  }
  if (normalized.includes('good')) {
    return STANDARD_CONDITIONS.GOOD;
  }
  if (normalized.includes('fair') || normalized.includes('worn')) {
    return STANDARD_CONDITIONS.FAIR;
  }
  if (normalized.includes('parts') || normalized.includes('broken')) {
    return STANDARD_CONDITIONS.PARTS_ONLY;
  }

  // Default to good if we can't determine
  return STANDARD_CONDITIONS.GOOD;
}

/**
 * Get display name for condition
 * @param {string} condition - Standard condition value
 * @returns {string} - Human-readable condition name
 */
function getConditionDisplay(condition) {
  const displayMap = {
    [STANDARD_CONDITIONS.EXCELLENT]: 'Excellent',
    [STANDARD_CONDITIONS.VERY_GOOD]: 'Very Good',
    [STANDARD_CONDITIONS.GOOD]: 'Good',
    [STANDARD_CONDITIONS.FAIR]: 'Fair',
    [STANDARD_CONDITIONS.PARTS_ONLY]: 'Parts Only'
  };
  return displayMap[condition] || condition;
}

module.exports = {
  STANDARD_CONDITIONS,
  CONDITION_MAPS,
  mapCondition,
  getConditionDisplay
};
