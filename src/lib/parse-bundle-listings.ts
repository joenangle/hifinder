/**
 * Bundle Listing Parser
 *
 * Detects and parses multi-item listings from used market posts
 * (e.g., "HD 650 + cable + case - $300")
 *
 * Helps identify:
 * - Multiple components in one listing
 * - Accessories included with main item
 * - True bundle value vs individual component pricing
 */

export interface BundleItem {
  type: 'component' | 'accessory' | 'unknown';
  name: string;
  isMainItem: boolean;
}

export interface BundleAnalysis {
  isBundle: boolean;
  items: BundleItem[];
  mainItems: BundleItem[];
  accessories: BundleItem[];
  bundleIndicators: string[];
  confidence: number; // 0-100
}

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
 * Component type keywords for identifying main items
 */
const COMPONENT_KEYWORDS = {
  headphones: ['headphone', 'headset', 'cans', 'over-ear', 'on-ear', 'open-back', 'closed-back'],
  iems: ['iem', 'in-ear', 'earphone', 'earbud', 'monitor'],
  dacs: ['dac', 'digital-to-analog', 'd/a converter', 'decoder'],
  amps: ['amp', 'amplifier', 'headphone amp', 'portable amp', 'desktop amp'],
  combos: ['combo', 'dac/amp', 'stack', 'all-in-one']
};

/**
 * Parse a listing title/description to detect bundle items
 */
export function parseBundleListing(text: string): BundleAnalysis {
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
      mainItems: [],
      accessories: [],
      bundleIndicators: [],
      confidence: 0
    };
  }

  // Split by bundle separators
  const separators = /[\+\&]/g;
  const segments = text.split(separators).map(s => s.trim());

  // Also check comma-separated lists in parentheses or after "with"/"includes"
  const withPattern = /(?:with|includes?|comes with|bundled with)[:\s]+([^$\-\.]+)/gi;
  const withMatches = text.matchAll(withPattern);

  for (const match of withMatches) {
    const items = match[1].split(/,|and/gi).map(s => s.trim());
    segments.push(...items);
  }

  // Classify each segment
  const items: BundleItem[] = [];

  for (const segment of segments) {
    if (segment.length < 3) continue;

    const segmentLower = segment.toLowerCase();

    // Check if it's an accessory
    const isAccessory = ACCESSORY_KEYWORDS.some(keyword =>
      segmentLower.includes(keyword)
    );

    // Check if it's a component
    const isComponent = Object.values(COMPONENT_KEYWORDS).flat().some(keyword =>
      segmentLower.includes(keyword)
    );

    items.push({
      type: isAccessory ? 'accessory' : isComponent ? 'component' : 'unknown',
      name: segment,
      isMainItem: isComponent && !isAccessory
    });
  }

  // Separate main items from accessories
  const mainItems = items.filter(item => item.isMainItem);
  const accessories = items.filter(item => item.type === 'accessory');

  // Calculate confidence based on clarity of bundle structure
  let confidence = 0;

  if (foundIndicators.length > 0) confidence += 30;
  if (mainItems.length > 0) confidence += 30;
  if (accessories.length > 0) confidence += 20;
  if (items.length >= 2) confidence += 20;

  return {
    isBundle: true,
    items,
    mainItems,
    accessories,
    bundleIndicators: foundIndicators,
    confidence: Math.min(confidence, 100)
  };
}

/**
 * Extract individual prices from bundle listing text
 * Useful for detecting "HD 650 $300 + cable $50" patterns
 */
export function extractBundlePrices(text: string): number[] {
  const pricePattern = /\$(\d+(?:,\d{3})*(?:\.\d{2})?)/g;
  const matches = text.matchAll(pricePattern);

  const prices: number[] = [];

  for (const match of matches) {
    const price = parseFloat(match[1].replace(/,/g, ''));
    if (price > 0 && price < 10000) {
      prices.push(price);
    }
  }

  return prices;
}

/**
 * Determine if listing is a bundle and if price should be adjusted
 *
 * Returns:
 * - isBundle: Whether this is a multi-item listing
 * - adjustedPrice: Estimated price for main component only (if bundle)
 * - confidence: How confident we are in the bundle detection (0-100)
 */
export function analyzeBundlePrice(
  title: string,
  description: string | null,
  listedPrice: number
): {
  isBundle: boolean;
  adjustedPrice: number | null;
  confidence: number;
  reasoning: string;
} {
  const fullText = `${title} ${description || ''}`;
  const bundleAnalysis = parseBundleListing(fullText);

  if (!bundleAnalysis.isBundle) {
    return {
      isBundle: false,
      adjustedPrice: null,
      confidence: 0,
      reasoning: 'No bundle indicators detected'
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
      reasoning: `Multiple prices found (${prices.map(p => `$${p}`).join(', ')}). Using highest: $${mainPrice}`
    };
  }

  // Single price for bundle - need to estimate main component value
  if (bundleAnalysis.accessories.length > 0) {
    // Estimate accessory value based on count
    // Conservative estimate: $10-30 per accessory
    const estimatedAccessoryValue = bundleAnalysis.accessories.length * 20;
    const adjustedPrice = Math.max(listedPrice - estimatedAccessoryValue, listedPrice * 0.7);

    return {
      isBundle: true,
      adjustedPrice: Math.round(adjustedPrice),
      confidence: 65,
      reasoning: `Bundle with ${bundleAnalysis.accessories.length} accessories. Estimated main component value after subtracting ~$${estimatedAccessoryValue} for accessories.`
    };
  }

  // Bundle detected but unclear structure - use original price with low confidence
  return {
    isBundle: true,
    adjustedPrice: listedPrice,
    confidence: 40,
    reasoning: 'Bundle detected but unable to separate component price from bundle price. Using original price.'
  };
}

/**
 * Generate user-friendly bundle description for display
 */
export function generateBundleDescription(analysis: BundleAnalysis): string {
  if (!analysis.isBundle) {
    return '';
  }

  const parts: string[] = [];

  if (analysis.mainItems.length > 0) {
    parts.push(`Main: ${analysis.mainItems.map(i => i.name).join(', ')}`);
  }

  if (analysis.accessories.length > 0) {
    parts.push(`Includes: ${analysis.accessories.map(i => i.name).join(', ')}`);
  }

  return parts.join(' • ');
}
