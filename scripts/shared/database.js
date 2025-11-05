/**
 * Unified database operations for listing scrapers
 * Consolidates Supabase upsert logic and duplicate checking
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env.local') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Save/update listing using upsert pattern
 * @param {object} listing - Listing data to save
 * @param {string} listing.url - Required: unique identifier
 * @param {string} listing.component_id - Required: component UUID
 * @param {string} listing.source - Required: reddit_avexchange, reverb, head_fi, etc.
 * @param {number} listing.price - Required: price in USD
 * @param {string} listing.title - Title of listing
 * @param {string} listing.status - available, sold, expired, removed
 * @param {string} listing.condition - excellent, very_good, good, fair, parts_only
 * @param {string} listing.date_posted - ISO timestamp
 * @param {string} listing.seller_username - Seller username/shop name
 * @param {object} additionalFields - Source-specific fields
 * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
 */
async function saveListing(listing, additionalFields = {}) {
  try {
    // Validate required fields
    if (!listing.url) {
      return { success: false, data: null, error: 'URL is required' };
    }
    if (!listing.component_id) {
      return { success: false, data: null, error: 'component_id is required' };
    }
    if (!listing.source) {
      return { success: false, data: null, error: 'source is required' };
    }
    if (!listing.price || listing.price < 0) {
      return { success: false, data: null, error: 'Valid price is required' };
    }

    // Merge listing with additional fields
    const fullListing = {
      ...listing,
      ...additionalFields,
      // Ensure status defaults to 'available' if not provided
      status: listing.status || 'available',
      // Ensure date_posted is set
      date_posted: listing.date_posted || new Date().toISOString()
    };

    // Upsert to database
    const { data, error } = await supabase
      .from('used_listings')
      .upsert(fullListing, {
        onConflict: 'url',
        ignoreDuplicates: false  // Always update existing listings
      })
      .select()
      .single();

    if (error) {
      return { success: false, data: null, error: error.message };
    }

    return { success: true, data, error: null };
  } catch (err) {
    return { success: false, data: null, error: err.message };
  }
}

/**
 * Batch save multiple listings
 * @param {array} listings - Array of listing objects
 * @returns {Promise<{success: number, failed: number, errors: array}>}
 */
async function saveListingsBatch(listings) {
  const results = {
    success: 0,
    failed: 0,
    errors: []
  };

  for (const listing of listings) {
    const result = await saveListing(listing);
    if (result.success) {
      results.success++;
    } else {
      results.failed++;
      results.errors.push({
        url: listing.url,
        error: result.error
      });
    }
  }

  return results;
}

/**
 * Check if listing URL already exists in database
 * @param {string} url - Listing URL to check
 * @returns {Promise<{exists: boolean, listing: object|null}>}
 */
async function checkListingExists(url) {
  try {
    const { data, error } = await supabase
      .from('used_listings')
      .select('*')
      .eq('url', url)
      .maybeSingle();  // Returns null if not found instead of error

    if (error) {
      console.error(`Error checking listing existence: ${error.message}`);
      return { exists: false, listing: null };
    }

    return { exists: !!data, listing: data };
  } catch (err) {
    console.error(`Error checking listing existence: ${err.message}`);
    return { exists: false, listing: null };
  }
}

/**
 * Get all active listings for a specific component
 * @param {string} componentId - Component UUID
 * @returns {Promise<array>} - Array of listings
 */
async function getComponentListings(componentId) {
  try {
    const { data, error } = await supabase
      .from('used_listings')
      .select('*')
      .eq('component_id', componentId)
      .eq('status', 'available')
      .order('date_posted', { ascending: false });

    if (error) {
      console.error(`Error fetching component listings: ${error.message}`);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error(`Error fetching component listings: ${err.message}`);
    return [];
  }
}

/**
 * Update listing status (e.g., mark as sold)
 * @param {string} url - Listing URL
 * @param {string} status - New status: available, sold, expired, removed
 * @param {object} additionalUpdates - Additional fields to update (e.g., date_sold, buyer_username)
 * @returns {Promise<{success: boolean, error: string|null}>}
 */
async function updateListingStatus(url, status, additionalUpdates = {}) {
  try {
    const updates = {
      status,
      ...additionalUpdates
    };

    // Add date_sold if marking as sold
    if (status === 'sold' && !updates.date_sold) {
      updates.date_sold = new Date().toISOString();
    }

    const { error } = await supabase
      .from('used_listings')
      .update(updates)
      .eq('url', url);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  supabase,  // Export for custom queries
  saveListing,
  saveListingsBatch,
  checkListingExists,
  getComponentListings,
  updateListingStatus
};
