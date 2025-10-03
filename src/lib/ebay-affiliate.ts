/**
 * eBay Affiliate Link Generator
 *
 * Generates eBay Partner Network affiliate links for component searches
 * Compliant with eBay API License Agreement - no data scraping/storage
 */

interface EbayAffiliateConfig {
  campaignId?: string;
  customId?: string; // Optional tracking parameter
}

interface ComponentSearchParams {
  brand: string;
  name: string;
  category?: 'cans' | 'iems' | 'dac' | 'amp' | 'dac_amp' | 'cable';
}

/**
 * Generate eBay affiliate search link for a component
 */
export function generateEbayAffiliateLink(
  component: ComponentSearchParams,
  config?: EbayAffiliateConfig
): string {
  const campaignId = config?.campaignId || process.env.NEXT_PUBLIC_EBAY_CAMPAIGN_ID || '';

  if (!campaignId) {
    console.warn('⚠️ EBAY_CAMPAIGN_ID not set - returning non-affiliate link');
  }

  // Build search keywords
  const keywords = `${component.brand} ${component.name}`.trim();

  // eBay category IDs for audio equipment
  const categoryMap = {
    'cans': '112529',      // Consumer Electronics > Portable Audio & Headphones > Headphones
    'iems': '112529',       // Same category for IEMs
    'dac': '14990',         // Musical Instruments & Gear > Pro Audio Equipment > Signal Processors & Effects
    'amp': '41410',         // Musical Instruments & Gear > Pro Audio Equipment > Amplifiers
    'dac_amp': '41410',     // Same as amp
    'cable': '112529'       // Same as headphones category
  };

  const params = new URLSearchParams({
    // Search parameters
    _nkw: keywords,

    // Category filter
    ...(component.category && categoryMap[component.category]
      ? { _sacat: categoryMap[component.category] }
      : {}),

    // Filter for used items
    LH_ItemCondition: '3000', // Used condition

    // Sort by best match (can be changed to price+shipping with _sop=15)
    _sop: '12', // Best match

    // Buy It Now only (exclude auctions for cleaner UX)
    LH_BIN: '1',

    // Affiliate tracking parameters (eBay Partner Network format)
    ...(campaignId ? {
      mkevt: '1',
      mkcid: '1',
      mkrid: '711-53200-19255-0', // US site
      campid: campaignId,
      toolid: '10001', // Standard link type
      ...(config?.customId ? { customid: config.customId } : {})
    } : {})
  });

  return `https://www.ebay.com/sch/i.html?${params.toString()}`;
}

/**
 * Generate eBay affiliate link with specific filters
 */
export function generateEbayAffiliateLinkAdvanced(
  keywords: string,
  options: {
    campaignId?: string;
    customId?: string;
    categoryId?: string;
    minPrice?: number;
    maxPrice?: number;
    condition?: 'new' | 'used' | 'all';
    sortBy?: 'best_match' | 'price_low' | 'price_high' | 'newest';
    buyItNowOnly?: boolean;
  } = {}
): string {
  const campaignId = options.campaignId || process.env.NEXT_PUBLIC_EBAY_CAMPAIGN_ID || '';

  // Sort order mapping
  const sortMap = {
    'best_match': '12',
    'price_low': '15',  // Price + Shipping: lowest first
    'price_high': '16', // Price + Shipping: highest first
    'newest': '10'      // Time: newly listed
  };

  // Condition mapping
  const conditionMap = {
    'new': '1000',
    'used': '3000',
    'all': '' // No filter
  };

  const params = new URLSearchParams({
    _nkw: keywords,

    // Optional filters
    ...(options.categoryId ? { _sacat: options.categoryId } : {}),
    ...(options.minPrice ? { _udlo: options.minPrice.toString() } : {}),
    ...(options.maxPrice ? { _udhi: options.maxPrice.toString() } : {}),
    ...(options.condition && options.condition !== 'all'
      ? { LH_ItemCondition: conditionMap[options.condition] }
      : {}),
    ...(options.buyItNowOnly ? { LH_BIN: '1' } : {}),
    ...(options.sortBy ? { _sop: sortMap[options.sortBy] } : {}),

    // Affiliate parameters
    ...(campaignId ? {
      mkevt: '1',
      mkcid: '1',
      mkrid: '711-53200-19255-0',
      campid: campaignId,
      toolid: '10001',
      ...(options.customId ? { customid: options.customId } : {})
    } : {})
  });

  return `https://www.ebay.com/sch/i.html?${params.toString()}`;
}

/**
 * Generate tracking-enabled custom ID for analytics
 */
export function generateTrackingId(
  componentId: string,
  source: 'recommendations' | 'component_detail' | 'used_listings' = 'component_detail'
): string {
  return `hf_${source}_${componentId}_${Date.now()}`;
}

/**
 * Example usage:
 *
 * // Simple usage
 * const link = generateEbayAffiliateLink({
 *   brand: 'Sennheiser',
 *   name: 'HD 600',
 *   category: 'cans'
 * });
 *
 * // Advanced usage with custom filters
 * const advancedLink = generateEbayAffiliateLinkAdvanced(
 *   'Sennheiser HD 600',
 *   {
 *     minPrice: 200,
 *     maxPrice: 400,
 *     condition: 'used',
 *     sortBy: 'price_low',
 *     buyItNowOnly: true,
 *     customId: generateTrackingId('hd600_id', 'recommendations')
 *   }
 * );
 */

// Export types for use in components
export type { ComponentSearchParams, EbayAffiliateConfig };
