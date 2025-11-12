/**
 * Bundle Listing Parser (Node.js version)
 *
 * Detects and parses multi-item listings from used market posts
 * (e.g., "HD 650 + cable + case - $300")
 */

/**
 * Common accessory keywords that indicate bundle items but not main components
 */
const ACCESSORY_KEYWORDS = [
  // Cables
  'cable', 'cord', 'wire', 'interconnect', 'xlr', 'rca', 'balanced',

  // Storage
  'case', 'box', 'pouch', 'bag', 'carrying case', 'hard case', 'soft case',

  // Ear tips and pads
  'tips', 'ear tips', 'eartips', 'foam tips', 'silicone tips',
  'pads', 'ear pads', 'earpads', 'cushions', 'velour', 'leather pads',

  // Adapters and accessories
  'adapter', 'dongle', 'splitter', 'extender', 'jack', '3.5mm', '6.35mm',
  'dac cable', 'lightning cable', 'usb cable', 'usb-c',

  // Documentation
  'manual', 'documentation', 'warranty', 'receipt', 'box', 'packaging',

  // Other
  'stand', 'holder', 'hanger', 'hooks', 'original packaging', 'og box'
];

/**
 * Keywords that strongly suggest a bundle listing
 */
const BUNDLE_INDICATORS = [
  '+', '&', ' and ', ' with ',
  'includes', 'including', 'comes with', 'bundled',
  'package', 'set', 'combo', 'lot',
  'accessories included', 'extras', 'bonus'
];

/**
 * Extract individual prices from bundle listing text
 */
function extractBundlePrices(text) {
  const pricePattern = /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g;
  const matches = [...text.matchAll(pricePattern)];

  const prices = [];

  for (const match of matches) {
    const price = parseFloat(match[1].replace(/,/g, ''));
    if (price > 0 && price < 10000) {
      prices.push(price);
    }
  }

  return prices;
}

/**
 * Parse a listing title/description to detect bundle items
 */
function parseBundleListing(text) {
  const textLower = text.toLowerCase();

  // Detect bundle indicators
  const foundIndicators = BUNDLE_INDICATORS.filter(indicator =>
    textLower.includes(indicator)
  );

  const isBundle = foundIndicators.length > 0;

  if (!isBundle) {
    return {
      isBundle: false,
      items: [],
      accessories: [],
      bundleIndicators: [],
      confidence: 0
    };
  }

  // Split by bundle separators
  const separators = /[\+\&]/g;
  const segments = text.split(separators).map(s => s.trim());

  // Also check comma-separated lists after "with"/"includes"
  const withPattern = /(?:with|includes?|comes with|bundled with)[:\s]+([^$\-\.]+)/gi;
  const withMatches = [...text.matchAll(withPattern)];

  for (const match of withMatches) {
    const items = match[1].split(/,|and/gi).map(s => s.trim());
    segments.push(...items);
  }

  // Classify segments as accessories
  const accessories = [];

  for (const segment of segments) {
    if (segment.length < 3) continue;

    const segmentLower = segment.toLowerCase();

    // Check if it's an accessory
    const isAccessory = ACCESSORY_KEYWORDS.some(keyword =>
      segmentLower.includes(keyword)
    );

    if (isAccessory) {
      accessories.push({
        name: segment,
        type: 'accessory'
      });
    }
  }

  // Calculate confidence
  let confidence = 0;
  if (foundIndicators.length > 0) confidence += 40;
  if (accessories.length > 0) confidence += 30;
  if (segments.length >= 2) confidence += 30;

  return {
    isBundle: true,
    items: segments,
    accessories,
    bundleIndicators: foundIndicators,
    confidence: Math.min(confidence, 100)
  };
}

/**
 * Determine if listing is a bundle and adjust price accordingly
 *
 * Returns:
 * - isBundle: Whether this is a multi-item listing
 * - adjustedPrice: Estimated price for main component only (if bundle)
 * - confidence: How confident we are in the bundle detection (0-100)
 * - bundleNote: Description of bundle contents for display
 */
function analyzeBundlePrice(title, description, listedPrice) {
  const fullText = `${title} ${description || ''}`;
  const bundleAnalysis = parseBundleListing(fullText);

  if (!bundleAnalysis.isBundle) {
    return {
      isBundle: false,
      adjustedPrice: null,
      confidence: 0,
      bundleNote: null
    };
  }

  // Check if multiple prices are listed
  const prices = extractBundlePrices(fullText);

  if (prices.length > 1) {
    // Multiple prices likely means individual prices for each item
    // Use the highest price as the main component price
    const mainPrice = Math.max(...prices);

    return {
      isBundle: true,
      adjustedPrice: mainPrice,
      confidence: 85,
      bundleNote: `Bundle with multiple items (prices: ${prices.map(p => `$${p}`).join(', ')})`
    };
  }

  // Single price for bundle - need to estimate main component value
  if (bundleAnalysis.accessories.length > 0) {
    // Estimate accessory value based on count
    // Conservative estimate: $10-30 per accessory
    const estimatedAccessoryValue = bundleAnalysis.accessories.length * 20;
    const adjustedPrice = Math.max(listedPrice - estimatedAccessoryValue, listedPrice * 0.7);

    const accessoryNames = bundleAnalysis.accessories
      .map(a => a.name)
      .slice(0, 3) // Limit to first 3 for brevity
      .join(', ');

    return {
      isBundle: true,
      adjustedPrice: Math.round(adjustedPrice),
      confidence: 65,
      bundleNote: `Bundle includes: ${accessoryNames}${bundleAnalysis.accessories.length > 3 ? ', ...' : ''}`
    };
  }

  // Bundle detected but unclear structure
  return {
    isBundle: true,
    adjustedPrice: listedPrice,
    confidence: 40,
    bundleNote: 'Multi-item bundle (price may include accessories)'
  };
}

module.exports = {
  parseBundleListing,
  extractBundlePrices,
  analyzeBundlePrice
};
