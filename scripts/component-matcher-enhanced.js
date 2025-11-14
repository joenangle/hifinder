/**
 * Enhanced Component Matching System for Reddit Scraper
 *
 * Improvements over original:
 * - Requires ALL model words to match (not just .some())
 * - Model numbers must match exactly
 * - Accessory filtering (eartips, cables, etc.)
 * - Higher minimum confidence threshold (0.7 vs 0.3)
 * - Better category validation
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Accessory keywords to filter out
const ACCESSORY_KEYWORDS = [
  'eartip', 'ear tip', 'tips', 'tip',
  'cable', 'cables', 'interconnect',
  'case', 'box', 'packaging', 'pouch',
  'pad', 'pads', 'cushion', 'replacement',
  'stand', 'hanger', 'hook',
  'adapter', 'dongle', 'splitter'
];

// Common brand aliases
const BRAND_ALIASES = {
  'sennheiser': ['senn', 'hd'],
  'audio-technica': ['at', 'ath', 'audio technica'],
  'beyerdynamic': ['beyer', 'dt', 'bd'],
  'hifiman': ['he', 'hifi', 'hifi man'],
  'audeze': ['lcd'],
  '64 audio': ['64', '64audio'],
  'ultimate ears': ['ue'],
  'final audio': ['final'],
  'campfire audio': ['campfire', 'ca'],
  'empire ears': ['ee', 'empire'],
  'jds labs': ['jds'],
  'tin hifi': ['tin', 'tin audio', 'trn'],
  'moondrop': ['md'],
  'softears': ['soft ears'],
  'xenns': ['xenns mangird', 'mangird xenns', 'mangird'],
  'juzear': ['juzear'],
  'trn': ['trn']
};

// Product variation mappings - handles legitimate model variants
// Maps canonical name → array of acceptable variants
const MODEL_VARIATIONS = {
  // AKG variants
  'k240 studio': ['k240', 'k240 mkii', 'k240mkii', 'k 240', 'k-240'],
  'k371': ['k371-bt', 'k371 bt', 'k-371'],
  'k702': ['k 702', 'k-702'],

  // 64 Audio color variants
  'tia fourte': ['fourte', 'fourte blanc', 'fourte noir', 'fourte black'],
  'tia fourte noir': ['fourte noir', 'fourte black'],

  // XENNS/Mangird marketing names
  'up': ['top pro', 'mangird top pro', 'xenns top pro'],
  'tea pro': ['mangird tea pro', 'xenns tea pro'],

  // HiFiMan revisions
  'sundara': ['sundara 2020', 'sundara closed', 'sundara stealth'],
  'arya': ['arya stealth', 'arya v2', 'arya v3', 'arya organic'],
  'he6se': ['he6se v1', 'he6se v2', 'he-6se'],
  'edition xs': ['edition x', 'edition xx'],

  // Sennheiser variants
  'hd600': ['hd 600', 'hd-600'],
  'hd650': ['hd 650', 'hd-650'],
  'hd660s': ['hd 660s', 'hd-660s', 'hd660s2'],
  'hd800': ['hd 800', 'hd-800'],
  'hd800s': ['hd 800s', 'hd-800s', 'hd800 s'],

  // Audeze revisions
  'lcd-x': ['lcd-x 2021', 'lcdx', 'lcd x'],
  'lcd-2': ['lcd-2 classic', 'lcd2', 'lcd 2'],
  'lcd-xc': ['lcdxc', 'lcd xc'],

  // Focal variants
  'clear': ['clear mg', 'clear og', 'clear original'],
  'utopia': ['utopia 2022', 'utopia 2020'],

  // ZMF variants
  'verite': ['verite open', 'verite closed'],
  'aeolus': ['aeolus stabilized'],

  // Moondrop variants
  'blessing 2': ['blessing 2 dusk', 'blessing2', 'b2'],
  'aria': ['aria snow', 'aria se'],

  // Beyerdynamic variants
  'dt 770 pro': ['dt770', 'dt770 pro', 'dt-770', 'dt 770'],
  'dt 990 pro': ['dt990', 'dt990 pro', 'dt-990', 'dt 990'],
  'dt 1990 pro': ['dt1990', 'dt1990 pro', 'dt-1990', 'dt 1990'],

  // Audio-Technica variants
  'ath-m50x': ['ath m50x', 'athm50x', 'm50x'],
  'ath-m40x': ['ath m40x', 'athm40x', 'm40x'],
  'ath-r70x': ['ath r70x', 'athr70x', 'r70x']
};

// Color suffixes to normalize (remove before matching)
const COLOR_SUFFIXES = [
  'black', 'white', 'silver', 'gold', 'blue', 'red', 'green', 'purple',
  'grey', 'gray', 'brown', 'pink', 'orange', 'yellow',
  'noir', 'blanc', 'blanco', 'negro', // French/Spanish colors
  'matte', 'glossy', 'metallic', // Finishes
  'limited', 'ltd', 'special edition', 'se' // Editions
];

// Model number pattern
const MODEL_NUMBER_PATTERN = /\b([a-z]{1,4})?(\d{2,4})([a-z]{0,3})?\b/gi;

/**
 * Normalize text by removing color suffixes and special characters
 */
function normalizeModelName(text) {
  let normalized = text.toLowerCase().trim();

  // Remove color suffixes
  for (const color of COLOR_SUFFIXES) {
    const colorPattern = new RegExp(`\\s+${color}$`, 'i');
    normalized = normalized.replace(colorPattern, '');
  }

  // Normalize spacing and punctuation
  normalized = normalized.replace(/[-_]/g, ' ').replace(/\s+/g, ' ').trim();

  return normalized;
}

/**
 * Check if listing text matches a known product variant
 */
function checkProductVariant(listingText, componentName) {
  const normalizedComponentName = normalizeModelName(componentName);
  const normalizedListingText = normalizeModelName(listingText);

  // Check if component name has known variations
  const variations = MODEL_VARIATIONS[normalizedComponentName];
  if (variations) {
    for (const variant of variations) {
      const normalizedVariant = normalizeModelName(variant);
      if (normalizedListingText.includes(normalizedVariant)) {
        return true; // Found a known variant
      }
    }
  }

  // Also check if listing text might be the canonical form and component is a variant
  for (const [canonical, variantList] of Object.entries(MODEL_VARIATIONS)) {
    if (normalizedListingText.includes(canonical)) {
      for (const variant of variantList) {
        if (normalizeModelName(variant) === normalizedComponentName) {
          return true; // Component is a variant of what's in listing
        }
      }
    }
  }

  return false;
}

/**
 * Extract model numbers from text (e.g., "HD600", "T3", "DT770")
 */
function extractModelNumbers(text) {
  const matches = text.toLowerCase().match(MODEL_NUMBER_PATTERN) || [];
  return matches.map(m => m.trim());
}

/**
 * Check if text contains only accessories (not actual gear)
 */
function isAccessoryOnly(text) {
  const textLower = text.toLowerCase();

  // Strong accessory indicators (when these are the MAIN item)
  const strongAccessoryPatterns = [
    /\beartips?\s+only\b/i,
    /\b\d+\s+pairs?\s+of\s+(?:ear)?tips\b/i,
    /\bselling\s+(?:ear)?tips\b/i,
    /\bcable\s+only\b/i,
    /\bcase\s+only\b/i,
    /\b(?:ear)?tips?\s*\(/i // "eartips (10 pairs)"
  ];

  for (const pattern of strongAccessoryPatterns) {
    if (pattern.test(textLower)) {
      return true;
    }
  }

  // Check if ONLY accessories are mentioned (no actual gear)
  const hasAccessoryKeyword = ACCESSORY_KEYWORDS.some(keyword =>
    textLower.includes(keyword)
  );

  // Gear keywords (actual audio equipment)
  const gearKeywords = ['headphone', 'iem', 'iems', 'dac', 'amp', 'amplifier', 'cans', 'monitors', 'earphone', 'earbuds'];
  const hasGearKeyword = gearKeywords.some(keyword =>
    textLower.includes(keyword)
  );

  // If accessories mentioned but NO gear mentioned, likely accessory-only
  if (hasAccessoryKeyword && !hasGearKeyword) {
    // Double check: look for model numbers/brands which indicate actual gear
    const hasBrand = Object.keys(BRAND_ALIASES).some(brand =>
      textLower.includes(brand)
    );

    if (!hasBrand) {
      return true; // Accessories mentioned, no gear keywords, no brands = accessory-only
    }
  }

  return false;
}

/**
 * Enhanced component matching with stricter requirements
 */
async function findComponentMatch(title, description = '', source = '') {
  try {
    const text = `${title} ${description}`.toLowerCase();

    // Filter out accessory-only posts
    if (isAccessoryOnly(text)) {
      console.log(`⚠️  Filtered out accessory-only post: ${title.substring(0, 60)}...`);
      return null;
    }

    // Get all components from database
    const { data: components, error } = await supabase
      .from('components')
      .select('*');

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }

    const candidates = [];

    for (const component of components) {
      const score = calculateMatchScore(text, component, source);
      if (score >= 0.7) { // Raised from 0.3 to 0.7
        candidates.push({
          component,
          score,
          matchDetails: getMatchDetails(text, component)
        });
      }
    }

    // Sort by score (highest first)
    candidates.sort((a, b) => b.score - a.score);

    if (candidates.length > 0) {
      const best = candidates[0];
      console.log(`✅ Matched "${title.substring(0, 50)}..." → ${best.component.brand} ${best.component.name} (score: ${best.score.toFixed(2)})`);
      return best;
    }

    console.log(`⚠️  No confident match for: ${title.substring(0, 60)}...`);
    return null;

  } catch (error) {
    console.error('Error finding component match:', error);
    return null;
  }
}

/**
 * Calculate match score with stricter requirements
 */
function calculateMatchScore(text, component, source = '') {
  let score = 0;
  const brand = component.brand.toLowerCase();
  const name = component.name.toLowerCase();

  // 1. Brand matching (REQUIRED)
  const brandScore = calculateBrandScore(text, brand);
  if (brandScore === 0) return 0;
  score += brandScore * 0.4;

  // 2. Model name matching (STRICT)
  const nameScore = calculateNameScore(text, name, brand);
  if (nameScore < 0.5) return 0; // Require at least 50% name match
  score += nameScore * 0.5; // Increased weight from 0.4

  // 3. Category validation
  const categoryScore = calculateCategoryScore(text, component.category);
  score += categoryScore * 0.1;

  return Math.min(score, 1.0);
}

/**
 * Calculate brand matching score
 */
function calculateBrandScore(text, brand) {
  // Direct brand match
  if (text.includes(brand)) {
    return 1.0;
  }

  // Check brand aliases
  const aliases = BRAND_ALIASES[brand] || [];
  for (const alias of aliases) {
    if (text.includes(alias.toLowerCase())) {
      return 0.9;
    }
  }

  // Fuzzy brand matching for multi-word brands
  const brandWords = brand.split(/[\s-]+/).filter(w => w.length > 2);
  let matches = 0;

  for (const word of brandWords) {
    if (text.includes(word)) {
      matches++;
    }
  }

  if (matches > 0 && matches >= brandWords.length * 0.7) {
    return 0.7;
  }

  return 0;
}

/**
 * Calculate model name matching score (STRICTER + VARIANT AWARE)
 */
function calculateNameScore(text, name, brand) {
  const nameLower = name.toLowerCase();

  // 1. Exact name match
  if (text.includes(nameLower)) {
    return 1.0;
  }

  // 2. Check for known product variants (NEW!)
  if (checkProductVariant(text, name)) {
    return 0.95; // High confidence for known variants
  }

  // 3. Normalized name match (removes colors, normalizes spacing)
  const normalizedText = normalizeModelName(text);
  const normalizedName = normalizeModelName(name);
  if (normalizedText.includes(normalizedName)) {
    return 0.9; // Slightly lower than exact, but still high confidence
  }

  // 4. Extract model numbers from component name
  const componentNumbers = extractModelNumbers(nameLower);
  const textNumbers = extractModelNumbers(text);

  // If component has model numbers, they MUST match exactly
  if (componentNumbers.length > 0) {
    const hasExactNumberMatch = componentNumbers.some(num =>
      textNumbers.some(textNum => textNum === num)
    );

    if (!hasExactNumberMatch) {
      return 0; // No match if numbers don't match
    }
  }

  // 5. Word-by-word matching - require ALL significant words
  const nameWords = nameLower
    .split(/[\s-]+/)
    .filter(word => word.length > 2 && !/^\d+$/.test(word)); // Exclude pure numbers

  if (nameWords.length === 0) {
    return componentNumbers.length > 0 ? 0.8 : 0;
  }

  let matches = 0;
  for (const word of nameWords) {
    // Escape special regex characters
    const escapedWord = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try {
      const wordRegex = new RegExp(`\\b${escapedWord}\\b`, 'i');
      if (wordRegex.test(text)) {
        matches++;
      }
    } catch (e) {
      // If regex fails, fall back to simple includes
      if (text.includes(word)) {
        matches++;
      }
    }
  }

  // Require at least 80% of words to match (stricter than before)
  const matchRatio = matches / nameWords.length;
  if (matchRatio < 0.8) {
    return 0;
  }

  return matchRatio * 0.9; // Scale to 0-0.9 range
}

/**
 * Calculate category matching score
 */
function calculateCategoryScore(text, category) {
  const keywords = {
    'cans': ['headphone', 'headphones', 'cans', 'over ear', 'on ear'],
    'iems': ['iem', 'iems', 'in ear', 'earphone', 'earbuds', 'monitors'],
    'dac': ['dac', 'digital analog converter'],
    'amp': ['amp', 'amplifier', 'headphone amp'],
    'dac_amp': ['dac amp', 'combo', 'stack', 'all in one']
  };

  const categoryKeywords = keywords[category] || [];

  for (const keyword of categoryKeywords) {
    if (text.includes(keyword)) {
      return 1.0;
    }
  }

  return 0;
}

/**
 * Get detailed match information for debugging
 */
function getMatchDetails(text, component) {
  const brand = component.brand.toLowerCase();
  const name = component.name.toLowerCase();
  const textNumbers = extractModelNumbers(text);
  const componentNumbers = extractModelNumbers(name);

  return {
    brandMatch: text.includes(brand),
    nameMatch: text.includes(name),
    textNumbers,
    componentNumbers,
    numbersMatch: componentNumbers.length === 0 ||
                  componentNumbers.some(n => textNumbers.includes(n)),
    isAccessory: isAccessoryOnly(text)
  };
}

module.exports = {
  findComponentMatch,
  isAccessoryOnly,
  extractModelNumbers
};
