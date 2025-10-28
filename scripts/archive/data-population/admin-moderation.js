/**
 * Admin Moderation and Override System
 *
 * Provides tools for manual moderation, batch operations, and quality control
 */

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Moderate a specific listing
 */
async function moderateListing(listingId, action, reason = '', moderatorNotes = '', userId = null) {
  try {
    console.log(`🛡️ Moderating listing ${listingId}: ${action}`);

    // Validate action
    const validActions = ['approve', 'reject', 'flag', 'edit', 'archive'];
    if (!validActions.includes(action)) {
      throw new Error(`Invalid action: ${action}. Must be one of: ${validActions.join(', ')}`);
    }

    // Get the listing
    const { data: listing, error: fetchError } = await supabase
      .from('used_listings')
      .select('*')
      .eq('id', listingId)
      .single();

    if (fetchError) {
      throw new Error(`Listing not found: ${fetchError.message}`);
    }

    // Log moderation action
    const { error: logError } = await supabase
      .from('listing_moderation')
      .insert({
        listing_id: listingId,
        action,
        reason,
        moderator_notes: moderatorNotes,
        automated: false,
        created_by: userId
      });

    if (logError) {
      throw new Error(`Failed to log moderation action: ${logError.message}`);
    }

    // Apply the action
    let updateData = { updated_at: new Date().toISOString() };

    switch (action) {
      case 'approve':
        updateData.is_active = true;
        updateData.price_is_reasonable = true;
        break;

      case 'reject':
      case 'archive':
        updateData.is_active = false;
        break;

      case 'flag':
        updateData.price_warning = `⚠️ Flagged by moderator: ${reason}`;
        break;

      case 'edit':
        // Edit action requires additional parameters
        console.log('Edit action logged - manual database update required');
        break;
    }

    if (Object.keys(updateData).length > 1) { // More than just updated_at
      const { error: updateError } = await supabase
        .from('used_listings')
        .update(updateData)
        .eq('id', listingId);

      if (updateError) {
        throw new Error(`Failed to update listing: ${updateError.message}`);
      }
    }

    console.log(`✅ Successfully moderated listing ${listingId}`);
    return {
      success: true,
      listing,
      action,
      updates: updateData
    };

  } catch (error) {
    console.error(`❌ Moderation failed:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Batch moderate listings based on criteria
 */
async function batchModerate(criteria, action, reason = '', moderatorNotes = '', userId = null) {
  try {
    console.log(`🔄 Starting batch moderation: ${action}`);

    // Build query based on criteria
    let query = supabase.from('used_listings').select('id, title, price, source');

    if (criteria.source) {
      query = query.eq('source', criteria.source);
    }

    if (criteria.priceMin) {
      query = query.gte('price', criteria.priceMin);
    }

    if (criteria.priceMax) {
      query = query.lte('price', criteria.priceMax);
    }

    if (criteria.condition) {
      query = query.eq('condition', criteria.condition);
    }

    if (criteria.isActive !== undefined) {
      query = query.eq('is_active', criteria.isActive);
    }

    if (criteria.dateFrom) {
      query = query.gte('created_at', criteria.dateFrom);
    }

    if (criteria.dateTo) {
      query = query.lte('created_at', criteria.dateTo);
    }

    const { data: listings, error } = await query.limit(100); // Safety limit

    if (error) {
      throw new Error(`Query failed: ${error.message}`);
    }

    console.log(`📋 Found ${listings.length} listings matching criteria`);

    const results = [];
    let successCount = 0;
    let errorCount = 0;

    for (const listing of listings) {
      const result = await moderateListing(
        listing.id,
        action,
        reason,
        moderatorNotes,
        userId
      );

      results.push({
        listingId: listing.id,
        title: listing.title,
        ...result
      });

      if (result.success) {
        successCount++;
      } else {
        errorCount++;
      }

      // Rate limiting for large batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log(`🎉 Batch moderation completed: ${successCount} success, ${errorCount} errors`);

    return {
      success: true,
      totalProcessed: listings.length,
      successCount,
      errorCount,
      results
    };

  } catch (error) {
    console.error(`❌ Batch moderation failed:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Generate moderation report
 */
async function generateModerationReport(days = 7) {
  try {
    console.log(`📊 Generating moderation report for last ${days} days...`);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get moderation statistics
    const { data: moderationStats, error: statsError } = await supabase
      .from('listing_moderation')
      .select('action, automated, created_at')
      .gte('created_at', startDate.toISOString());

    if (statsError) {
      throw new Error(`Failed to fetch moderation stats: ${statsError.message}`);
    }

    // Get listing quality statistics
    const { data: qualityStats, error: qualityError } = await supabase
      .from('used_listings')
      .select('source, price_is_reasonable, price_warning, is_active')
      .gte('created_at', startDate.toISOString());

    if (qualityError) {
      throw new Error(`Failed to fetch quality stats: ${qualityError.message}`);
    }

    // Analyze data
    const report = {
      period: {
        days,
        startDate: startDate.toISOString(),
        endDate: new Date().toISOString()
      },
      moderation: {
        totalActions: moderationStats.length,
        automated: moderationStats.filter(m => m.automated).length,
        manual: moderationStats.filter(m => !m.automated).length,
        byAction: {}
      },
      listings: {
        total: qualityStats.length,
        active: qualityStats.filter(l => l.is_active).length,
        reasonable: qualityStats.filter(l => l.price_is_reasonable).length,
        flagged: qualityStats.filter(l => l.price_warning).length,
        bySource: {}
      }
    };

    // Count by action type
    for (const mod of moderationStats) {
      report.moderation.byAction[mod.action] = (report.moderation.byAction[mod.action] || 0) + 1;
    }

    // Count by source
    for (const listing of qualityStats) {
      if (!report.listings.bySource[listing.source]) {
        report.listings.bySource[listing.source] = {
          total: 0,
          active: 0,
          reasonable: 0,
          flagged: 0
        };
      }

      const source = report.listings.bySource[listing.source];
      source.total++;
      if (listing.is_active) source.active++;
      if (listing.price_is_reasonable) source.reasonable++;
      if (listing.price_warning) source.flagged++;
    }

    console.log('📋 Moderation Report Generated');
    console.log(`Total Listings: ${report.listings.total}`);
    console.log(`Active Listings: ${report.listings.active}`);
    console.log(`Moderation Actions: ${report.moderation.totalActions}`);

    return report;

  } catch (error) {
    console.error(`❌ Report generation failed:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Clean up listings based on quality rules
 */
async function automatedQualityControl() {
  try {
    console.log('🤖 Running automated quality control...');

    const actions = [];

    // 1. Flag extremely low prices (possible scams)
    const { data: lowPriceListings } = await supabase
      .from('used_listings')
      .select('id, title, price, component_id')
      .eq('is_active', true)
      .lt('price', 20); // Items under $20

    for (const listing of lowPriceListings || []) {
      const result = await moderateListing(
        listing.id,
        'flag',
        'Extremely low price - verify authenticity',
        'Automated quality control',
        null
      );
      actions.push(result);
    }

    // 2. Flag extremely high prices
    const { data: highPriceListings } = await supabase
      .from('used_listings')
      .select('id, title, price, component_id')
      .eq('is_active', true)
      .gt('price', 10000); // Items over $10,000

    for (const listing of highPriceListings || []) {
      const result = await moderateListing(
        listing.id,
        'flag',
        'Extremely high price - verify accuracy',
        'Automated quality control',
        null
      );
      actions.push(result);
    }

    // 3. Archive very old listings (90+ days)
    const archiveDate = new Date();
    archiveDate.setDate(archiveDate.getDate() - 90);

    const { data: oldListings } = await supabase
      .from('used_listings')
      .select('id, title, date_posted')
      .eq('is_active', true)
      .lt('date_posted', archiveDate.toISOString());

    for (const listing of oldListings || []) {
      const result = await moderateListing(
        listing.id,
        'archive',
        'Listing older than 90 days',
        'Automated quality control',
        null
      );
      actions.push(result);
    }

    const successCount = actions.filter(a => a.success).length;
    const errorCount = actions.filter(a => !a.success).length;

    console.log(`🎯 Quality control completed: ${successCount} actions taken, ${errorCount} errors`);

    return {
      success: true,
      totalActions: actions.length,
      successCount,
      errorCount,
      actions
    };

  } catch (error) {
    console.error(`❌ Quality control failed:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * CLI interface for manual moderation
 */
async function runModerationCLI() {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'moderate':
        const listingId = args[1];
        const action = args[2];
        const reason = args[3] || '';

        if (!listingId || !action) {
          console.log('Usage: node admin-moderation.js moderate <listing_id> <action> [reason]');
          console.log('Actions: approve, reject, flag, edit, archive');
          process.exit(1);
        }

        const result = await moderateListing(listingId, action, reason);
        console.log(JSON.stringify(result, null, 2));
        break;

      case 'batch':
        console.log('Interactive batch moderation not implemented - use API');
        break;

      case 'report':
        const days = parseInt(args[1]) || 7;
        const report = await generateModerationReport(days);
        console.log(JSON.stringify(report, null, 2));
        break;

      case 'quality':
        const qcResult = await automatedQualityControl();
        console.log(JSON.stringify(qcResult, null, 2));
        break;

      default:
        console.log('Available commands:');
        console.log('  moderate <listing_id> <action> [reason] - Moderate a specific listing');
        console.log('  report [days] - Generate moderation report');
        console.log('  quality - Run automated quality control');
        process.exit(1);
    }

  } catch (error) {
    console.error('Command failed:', error);
    process.exit(1);
  }
}

module.exports = {
  moderateListing,
  batchModerate,
  generateModerationReport,
  automatedQualityControl
};

// Run CLI if called directly
if (require.main === module) {
  runModerationCLI();
}