/**
 * Intelligent Component Matching System
 *
 * Matches marketplace listings to components in our database using fuzzy matching,
 * brand recognition, and model name variations
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Common brand aliases and variations
const BRAND_ALIASES = {
  'sennheiser': ['senn', 'hd', 'hd headphones'],
  'audio-technica': ['at', 'ath', 'audio technica'],
  'beyerdynamic': ['beyer', 'dt', 'bd'],
  'shure': ['se', 'srh'],
  'sony': ['wh', 'mdr', 'xm'],
  'bose': ['qc', 'quietcomfort', 'soundlink'],
  'akg': ['k', 'k series'],
  'focal': ['utopia', 'clear', 'elex'],
  'hifiman': ['he', 'hifi', 'susvara', 'arya'],
  'audeze': ['lcd', 'planar'],
  'fostex': ['th', 'tr'],
  'grado': ['sr', 'ps'],
  'etymotic': ['er', 'etym'],
  'campfire': ['campfire audio', 'ca'],
  'empire ears': ['ee', 'empire'],
  '64 audio': ['64', '64audio'],
  'noble audio': ['noble'],
  'ultimate ears': ['ue'],
  'moondrop': ['md'],
  'thieaudio': ['thie'],
  'softears': ['soft ears'],
  'ziigaat': ['ziig'],
  'topping': ['dx', 'e30', 'd30'],
  'schiit': ['modi', 'magni', 'bifrost', 'gungnir'],
  'jds labs': ['jds', 'atom', 'el'],
  'chord': ['mojo', 'hugo'],
  'fiio': ['btr', 'q', 'k'],
  'ifi': ['zen', 'micro', 'nano']
};

// Common model name variations and abbreviations
const MODEL_VARIATIONS = {
  // Sennheiser variations
  'hd600': ['hd 600', 'hd-600', 'six hundred'],
  'hd650': ['hd 650', 'hd-650', 'six fifty'],
  'hd800': ['hd 800', 'hd-800', 'eight hundred'],
  'hd800s': ['hd 800s', 'hd-800s', 'eight hundred s'],

  // Audio-Technica variations
  'ath-m50x': ['m50x', 'm50', 'ath m50x', 'audio technica m50x'],
  'ath-ad900x': ['ad900x', 'ad900', 'ath ad900x'],

  // Beyerdynamic variations
  'dt770': ['dt 770', 'dt-770', 'seven seventy'],
  'dt880': ['dt 880', 'dt-880', 'eight eighty'],
  'dt990': ['dt 990', 'dt-990', 'nine ninety'],

  // HiFiMan variations
  'he400se': ['he 400se', 'he-400se', 'four hundred se'],
  'sundara': ['sundara closed', 'sundara 2020'],
  'arya': ['arya stealth', 'arya v2', 'arya v3'],

  // IEM variations
  'aria': ['aria 2021', 'aria snow'],
  'blessing 2': ['blessing2', 'b2', 'blessing 2 dusk'],
  'starfield': ['starfield 2021'],
  'monarch': ['monarch mk2', 'monarch mk3', 'monarch mk4'],

  // DAC/Amp variations
  'atom amp': ['jds atom', 'atom+', 'atom plus'],
  'magni': ['magni 3', 'magni 3+', 'magni heresy'],
  'modi': ['modi 3', 'modi 3+', 'modi multibit'],
  'topping dx3': ['dx3 pro', 'dx3 pro+'],
  'e30': ['topping e30', 'e30 ii'],
  'd30': ['topping d30', 'd30 pro']
};

// Category detection keywords
const CATEGORY_KEYWORDS = {
  'cans': ['headphones', 'headphone', 'cans', 'over ear', 'on ear', 'full size'],
  'iems': ['iem', 'iems', 'in ear', 'earphones', 'earbuds', 'monitors'],
  'dac': ['dac', 'digital analog converter', 'converter'],
  'amp': ['amp', 'amplifier', 'headphone amp', 'headamp'],
  'dac_amp': ['dac amp', 'combo', 'stack', 'all in one', 'integrated']
};

/**
 * Find the best component match for a listing title/description
 */
async function findComponentMatch(title, description = '', source = '') {
  try {
    const text = `${title} ${description}`.toLowerCase();

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
      if (score > 0.3) { // Minimum confidence threshold
        candidates.push({
          component,
          score,
          matchDetails: getMatchDetails(text, component)
        });
      }
    }

    // Sort by score (highest first)
    candidates.sort((a, b) => b.score - a.score);

    return candidates.length > 0 ? candidates[0] : null;

  } catch (error) {
    console.error('Error finding component match:', error);
    return null;
  }
}

/**
 * Calculate match score between text and component
 */
function calculateMatchScore(text, component, source = '') {
  let score = 0;
  const brand = component.brand.toLowerCase();
  const name = component.name.toLowerCase();

  // Brand matching (essential)
  const brandScore = calculateBrandScore(text, brand);
  if (brandScore === 0) return 0; // No brand match = no component match
  score += brandScore * 0.4;

  // Model name matching
  const nameScore = calculateNameScore(text, name, brand);
  score += nameScore * 0.4;

  // Category matching
  const categoryScore = calculateCategoryScore(text, component.category);
  score += categoryScore * 0.1;

  // Source-specific bonuses
  const sourceScore = calculateSourceScore(text, source, component);
  score += sourceScore * 0.1;

  return Math.min(score, 1.0); // Cap at 1.0
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
      return 0.8; // Slightly lower for alias match
    }
  }

  // Fuzzy brand matching for common misspellings
  const brandWords = brand.split(' ');
  let partialMatches = 0;

  for (const word of brandWords) {
    if (word.length > 3) { // Only check longer words
      if (text.includes(word) || hasTypo(text, word)) {
        partialMatches++;
      }
    }
  }

  if (partialMatches > 0 && partialMatches >= brandWords.length * 0.5) {
    return 0.6; // Partial brand match
  }

  return 0;
}

/**
 * Calculate model name matching score
 */
function calculateNameScore(text, name, brand) {
  const nameLower = name.toLowerCase();

  // Direct name match
  if (text.includes(nameLower)) {
    return 1.0;
  }

  // Check model variations
  const variations = MODEL_VARIATIONS[nameLower] || [];
  for (const variation of variations) {
    if (text.includes(variation.toLowerCase())) {
      return 0.9;
    }
  }

  // Partial model number matching (for things like HD650, DT770, etc.)
  const modelNumbers = extractModelNumbers(nameLower);
  if (modelNumbers.length > 0) {
    for (const number of modelNumbers) {
      if (text.includes(number)) {
        return 0.7; // Good match for model numbers
      }
    }
  }

  // Word-by-word partial matching
  const nameWords = nameLower.split(' ').filter(word => word.length > 2);
  let matches = 0;

  for (const word of nameWords) {
    if (text.includes(word) || hasTypo(text, word)) {
      matches++;
    }
  }

  if (matches > 0) {
    return (matches / nameWords.length) * 0.6; // Scaled partial match
  }

  return 0;
}

/**
 * Calculate category matching score
 */
function calculateCategoryScore(text, category) {
  const keywords = CATEGORY_KEYWORDS[category] || [];

  for (const keyword of keywords) {
    if (text.includes(keyword)) {
      return 1.0;
    }
  }

  return 0;
}

/**
 * Calculate source-specific matching bonuses
 */
function calculateSourceScore(text, source, component) {
  let bonus = 0;

  // Reddit-specific patterns
  if (source === 'reddit' || source.includes('reddit')) {
    // Bonus for proper Reddit formatting
    if (text.match(/\\[w(ts|tt|tb)\\]/i)) {
      bonus += 0.1;
    }

    // Bonus for price mention (indicates selling post)
    if (text.match(/\\$\\d+/) || text.includes('paypal')) {
      bonus += 0.1;
    }
  }

  // eBay-specific patterns
  if (source === 'ebay' || source.includes('ebay')) {
    // Bonus for condition keywords
    if (text.match(/\\b(new|used|refurbished|excellent|good)\\b/i)) {
      bonus += 0.1;
    }
  }

  return bonus;
}

/**
 * Extract model numbers from component name
 */
function extractModelNumbers(name) {
  const numberPattern = /\\b\\d{2,4}[a-z]*\\b/g;
  return name.match(numberPattern) || [];
}

/**
 * Simple typo detection for common misspellings
 */
function hasTypo(text, word) {
  if (word.length < 4) return false;

  // Check for single character differences
  const words = text.split(/\\s+/);

  for (const textWord of words) {
    if (Math.abs(textWord.length - word.length) <= 1) {
      const distance = levenshteinDistance(textWord, word);
      if (distance <= 1) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(str1, str2) {
  const matrix = [];

  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[str2.length][str1.length];
}

/**
 * Get detailed match information for debugging
 */
function getMatchDetails(text, component) {
  const brand = component.brand.toLowerCase();
  const name = component.name.toLowerCase();

  return {
    brandMatch: text.includes(brand),
    nameMatch: text.includes(name),
    categoryMatch: (CATEGORY_KEYWORDS[component.category] || []).some(k => text.includes(k)),
    extractedNumbers: extractModelNumbers(text),
    componentNumbers: extractModelNumbers(name)
  };
}

/**
 * Batch process listings and find component matches
 */
async function matchListingsToComponents(listings) {
  const results = [];

  for (const listing of listings) {
    const match = await findComponentMatch(
      listing.title,
      listing.description,
      listing.source
    );

    if (match) {
      results.push({
        ...listing,
        component_id: match.component.id,
        match_score: match.score,
        match_details: match.matchDetails
      });
    } else {
      console.log(`⚠️ No component match found for: ${listing.title}`);
    }
  }

  return results;
}

module.exports = {
  findComponentMatch,
  matchListingsToComponents,
  calculateMatchScore
};