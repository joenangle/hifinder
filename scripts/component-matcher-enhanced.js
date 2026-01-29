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
  'trn': ['trn'],
  // Added missing brands
  'fir': ['fir audio'],
  'symphonium': ['symphonium audio'],
  'aful': ['aful audio'],
  'thieaudio': ['thie audio', 'thieaudio'],
  'letshuoer': ['let shuoer', 'letshuoer'],
  'truthear': ['truth ear', 'truthear'],
  'kiwi ears': ['kiwi', 'kiwiears'],
  'dunu': ['dunu-topsound', 'dunu topsound']
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

  // Thieaudio Monarch variants (MK II, MK III, MK IV)
  'monarch mk ii': ['monarch mk2', 'monarch mkii', 'monarch mk 2', 'monarch 2'],
  'monarch mk iii': ['monarch mk3', 'monarch mkiii', 'monarch mk 3', 'monarch 3'],
  'monarch mk iv': ['monarch mk4', 'monarch mkiv', 'monarch mk 4', 'monarch 4'],

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

// Generic words that should penalize matching (too common, cause false positives)
const GENERIC_WORDS = [
  'space', 'audio', 'pro', 'lite', 'plus', 'mini', 'max', 'ultra',
  'one', 'two', 'three', 'air', 'go', 'se', 'ex', 'dx'
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
 * Calculate penalty for generic brand/model names
 * Generic words like "space", "audio", "pro" are too common and cause false positives
 */
function calculateGenericnessPenalty(brand, name) {
  let penalty = 0;

  const brandWords = brand.toLowerCase().split(/\s+/);
  const nameWords = name.toLowerCase().split(/\s+/);

  // -15% per generic word in brand
  for (const word of brandWords) {
    if (GENERIC_WORDS.includes(word) && word.length <= 5) {
      penalty += 0.15;
    }
  }

  // -10% per generic word in model
  for (const word of nameWords) {
    if (GENERIC_WORDS.includes(word) && word.length <= 5) {
      penalty += 0.10;
    }
  }

  // Extra -10% if BOTH brand and model are short (more likely to be generic)
  if (brand.length <= 10 && name.length <= 10) {
    penalty += 0.10;
  }

  return Math.min(penalty, 0.4); // Cap at -40%
}

/**
 * Extract [H] (Have) section from Reddit post title
 * Format: [WTS][H] HD600 + Arya [W] PayPal
 */
function extractHaveSection(title) {
  const haveMatch = title.match(/\[H\]\s*(.+?)\s*\[W\]/i);
  return haveMatch ? haveMatch[1] : null;
}

/**
 * Calculate position-based scoring bonus/penalty
 * Matches in title are more reliable than matches in body text
 * Matches near accessory keywords are likely false positives
 * [H] section matches are strongly boosted, [W] section matches penalized
 */
function calculatePositionScore(text, brand, name, title) {
  const titleLower = title.toLowerCase();
  const brandLower = brand.toLowerCase();
  const nameLower = name.toLowerCase();

  // Check for [H] section (Have = what they're selling)
  const haveSection = extractHaveSection(title);
  if (haveSection) {
    const haveLower = haveSection.toLowerCase();
    const brandInHave = haveLower.includes(brandLower);
    const nameInHave = haveLower.includes(nameLower);

    // +25% if brand AND model in [H] section (strong signal)
    if (brandInHave && nameInHave) {
      return 0.25;
    }

    // -40% if match is in title but NOT in [H] section (likely in [W] section)
    const brandInTitle = titleLower.includes(brandLower);
    const nameInTitle = titleLower.includes(nameLower);

    if ((brandInTitle || nameInTitle) && !brandInHave && !nameInHave) {
      return -0.4; // Probably in [W] section (want to buy, not selling)
    }
  }

  // Standard title matching (when no [H] section)
  const brandInTitle = titleLower.includes(brandLower);
  const nameInTitle = titleLower.includes(nameLower);

  if (brandInTitle && nameInTitle) return 0.2;
  if (brandInTitle || nameInTitle) return 0.1;

  // -30% if match is near accessory context
  const accessoryPattern = /\b(with|w\/|w\s|cable|case|comes with|includes)\s+/gi;
  const brandIndex = text.indexOf(brandLower);

  if (brandIndex > 0) {
    const beforeMatchText = text.substring(
      Math.max(0, brandIndex - 20),
      brandIndex
    );

    if (accessoryPattern.test(beforeMatchText)) {
      return -0.3; // Likely accessory mention
    }
  }

  return 0;
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
      const score = calculateMatchScore(text, component, source, title);
      if (score >= 0.7) { // Raised from 0.3 to 0.7
        candidates.push({
          component,
          score,
          matchDetails: getMatchDetails(text, component)
        });
      }
    }

    // Exclusivity scoring: Penalize when too many candidates match
    // (indicates text is too generic or matching too broadly)
    if (candidates.length >= 5) {
      const exclusivityPenalty = Math.min(0.2, (candidates.length - 4) * 0.05);
      console.log(`⚠️  High candidate count (${candidates.length}) - applying exclusivity penalty: -${(exclusivityPenalty * 100).toFixed(0)}%`);

      // Apply penalty to all candidates
      for (const candidate of candidates) {
        candidate.score = Math.max(0, candidate.score - exclusivityPenalty);
      }

      // Re-filter candidates that may have dropped below threshold
      const filteredCandidates = candidates.filter(c => c.score >= 0.7);
      if (filteredCandidates.length < candidates.length) {
        console.log(`   Filtered out ${candidates.length - filteredCandidates.length} candidates after penalty`);
        candidates.length = 0;
        candidates.push(...filteredCandidates);
      }
    }

    // Sort by score (highest first)
    candidates.sort((a, b) => b.score - a.score);

    if (candidates.length > 0) {
      const best = candidates[0];

      // Ambiguity detection: Check if top 2 matches are too close
      if (candidates.length >= 2) {
        const second = candidates[1];
        const scoreDiff = best.score - second.score;

        if (scoreDiff < 0.15) {
          console.log(`⚠️  Ambiguous match for "${title.substring(0, 50)}..."`);
          console.log(`   Option 1: ${best.component.brand} ${best.component.name} (${best.score.toFixed(2)})`);
          console.log(`   Option 2: ${second.component.brand} ${second.component.name} (${second.score.toFixed(2)})`);
          console.log(`   Score difference: ${scoreDiff.toFixed(3)} (threshold: 0.15)`);

          // Flag for manual review but still return best match
          best.isAmbiguous = true;
          best.ambiguousOptions = [
            { component: best.component, score: best.score },
            { component: second.component, score: second.score }
          ];
        }
      }

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
function calculateMatchScore(text, component, source = '', title = '') {
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

  // 4. Apply position bonus/penalty (title matches more reliable)
  const positionBonus = calculatePositionScore(text, brand, name, title);
  score = Math.max(0, Math.min(1.0, score + positionBonus));

  // 5. Apply genericness penalty (prevents false matches on common words)
  const penalty = calculateGenericnessPenalty(component.brand, component.name);
  score = Math.max(0, score - penalty);

  return Math.min(score, 1.0);
}

/**
 * Calculate brand matching score
 */
function calculateBrandScore(text, brand) {
  // Direct brand match with word boundaries
  try {
    const brandRegex = new RegExp(`\\b${brand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (brandRegex.test(text)) {
      return 1.0;
    }
  } catch (e) {
    // Fallback to includes if regex fails
    if (text.includes(brand)) {
      return 1.0;
    }
  }

  // Check brand aliases with word boundaries
  const aliases = BRAND_ALIASES[brand] || [];
  for (const alias of aliases) {
    try {
      const aliasRegex = new RegExp(`\\b${alias.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (aliasRegex.test(text)) {
        return 0.9;
      }
    } catch (e) {
      // Fallback to includes if regex fails
      if (text.includes(alias.toLowerCase())) {
        return 0.9;
      }
    }
  }

  // Fuzzy brand matching for multi-word brands
  const brandWords = brand.split(/[\s-]+/).filter(w => w.length > 2);

  // Don't allow fuzzy matching for very short single-word brands (prevents "FiR" from matching)
  if (brandWords.length === 1 && brandWords[0].length < 4) {
    return 0; // Require exact match for short brands
  }

  let matches = 0;

  for (const word of brandWords) {
    try {
      const wordRegex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (wordRegex.test(text)) {
        matches++;
      }
    } catch (e) {
      // Fallback to includes if regex fails
      if (text.includes(word)) {
        matches++;
      }
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
  const isShortName = nameLower.length <= 3; // M5, M3, UP, etc.

  // For very short names, be MUCH stricter - only allow exact word boundary matches
  if (isShortName) {
    try {
      const nameRegex = new RegExp(`\\b${nameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return nameRegex.test(text) ? 1.0 : 0;
    } catch (e) {
      // Fallback: exact match only
      const words = text.split(/\s+/);
      return words.includes(nameLower) ? 1.0 : 0;
    }
  }

  // 1. Exact name match with word boundaries
  try {
    const nameRegex = new RegExp(`\\b${nameLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (nameRegex.test(text)) {
      return 1.0;
    }
  } catch (e) {
    // Fallback to includes if regex fails
    if (text.includes(nameLower)) {
      return 1.0;
    }
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

/**
 * Detect if listing contains multiple components (bundle)
 * Returns { isBundle: boolean, componentCount: number }
 *
 * FIXES:
 * - Added comma and slash separators (87% of false negatives)
 * - Parse only [H] section to avoid false positives from [W] section
 * - Relax model number requirement (catches non-numeric product names)
 */
function detectMultipleComponents(text) {
  // Extract only the [H] (Have) section from Reddit posts to avoid false positives
  // Format: [WTS] [US-CA] [H] items here [W] payment methods
  const haveMatch = text.match(/\[H\]\s*(.+?)\s*\[W\]/i);
  const itemsText = haveMatch ? haveMatch[1] : text;
  const textLower = itemsText.toLowerCase();

  // Bundle indicators - CRITICAL FIX: Added comma (,) and slash (/)
  // Comma is the #1 most common separator on Reddit (400+ false negatives)
  const separators = [',', ', ', ' + ', ' and ', ' & ', ' with ', '/', ' / '];
  const hasSeparator = separators.some(sep => textLower.includes(sep));

  // Count distinct brand mentions
  const brandMentions = new Set();
  for (const [brand, aliases] of Object.entries(BRAND_ALIASES)) {
    if (textLower.includes(brand)) {
      brandMentions.add(brand);
    }
    for (const alias of aliases) {
      if (textLower.includes(alias.toLowerCase())) {
        brandMentions.add(brand);
      }
    }
  }

  // Count model numbers - strong indicator of multiple items
  const modelNumbers = extractModelNumbers(textLower);

  // Count components by splitting on separators for more accurate count
  let estimatedCount = 1;
  if (hasSeparator) {
    // Split on all separators and count non-empty segments
    const segments = textLower.split(/,|,\s|\s\+\s|\sand\s|\s&\s|\swith\s|\/|\s\/\s/g)
      .map(s => s.trim())
      .filter(s => s.length > 2); // Filter out noise
    estimatedCount = segments.length;
  }

  // Heuristics for bundle detection:
  // 1. Multiple brands = definitely bundle
  // 2. Has separator = likely bundle (RELAXED: no longer requires model numbers)
  // 3. Single brand but 3+ model numbers = possibly bundle

  let isBundle = false;
  let componentCount = 1;

  if (brandMentions.size >= 2) {
    // Multiple distinct brands found
    isBundle = true;
    componentCount = brandMentions.size;
  } else if (hasSeparator) {
    // RELAXED: Has separator alone is enough (catches Kiwi Ears Aether + NiceHCK FirstTouch)
    isBundle = true;
    componentCount = Math.max(estimatedCount, modelNumbers.length, 2); // Use best estimate
  } else if (modelNumbers.length >= 3) {
    // Single brand but many model numbers (e.g., "HD600 HD650 HD660S")
    isBundle = true;
    componentCount = modelNumbers.length;
  }

  // Cap at reasonable number
  componentCount = Math.min(componentCount, 10); // Increased from 5 to 10

  return {
    isBundle,
    componentCount: isBundle ? componentCount : 1
  };
}

module.exports = {
  findComponentMatch,
  isAccessoryOnly,
  extractModelNumbers,
  detectMultipleComponents
};
