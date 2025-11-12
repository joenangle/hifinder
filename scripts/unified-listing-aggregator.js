/**
 * Unified Listing Aggregation System for HiFinder
 * 
 * Orchestrates data collection from all marketplace sources:
 * - eBay API
 * - Head-Fi scraping  
 * - Reverb API
 * - Reddit r/AVExchange
 * 
 * Provides centralized management, deduplication, and health monitoring
 */

const { createClient } = require('@supabase/supabase-js');
// eBay integration removed - using affiliate links instead (see EBAY_AFFILIATE_STRATEGY.md)
// const ebayIntegration = require('./ebay-integration');
const headFiScraper = require('./headfi-scraper');
const reverbIntegration = require('./reverb-integration');
const redditScraper = require('./reddit-avexchange-scraper-v3');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Aggregator configuration
const AGGREGATOR_CONFIG = {
  // Source priorities (higher = better quality/reliability)
  sourcePriorities: {
    'reddit_avexchange': 10, // Best for enthusiast gear, fair pricing
    'reverb': 8,            // Good for pro audio, authenticated sellers
    // 'ebay': 6,           // REMOVED: Using affiliate links instead
    'head_fi': 7,           // Enthusiast community, good condition info
    'manual': 9             // Curated listings
  },
  
  // Batch processing settings
  batchSize: 10, // Process components in batches
  parallelSources: 2, // Max concurrent source integrations
  maxRetries: 3,
  retryDelay: 5000,
  
  // Health monitoring
  healthCheck: {
    minListingsPerSource: 5,
    maxFailureRate: 0.3, // 30% failure rate threshold
    stalenessThreshold: 24 * 60 * 60 * 1000, // 24 hours
  },
  
  // Deduplication settings
  deduplication: {
    priceTolerancePercent: 5, // Consider same if within 5%
    titleSimilarityThreshold: 0.7, // Cosine similarity threshold
    enabled: true
  }
};

/**
 * Main aggregation orchestrator
 */
class ListingAggregator {
  constructor() {
    this.stats = {
      totalProcessed: 0,
      totalListings: 0,
      sourceStats: {},
      errors: [],
      startTime: Date.now(),
      endTime: null
    };
    
    this.sourceIntegrations = {
      // 'ebay': ebayIntegration, // REMOVED: Using affiliate links instead
      'head_fi': headFiScraper,
      'reverb': reverbIntegration,
      'reddit_avexchange': redditScraper
    };
  }
  
  /**
   * Run complete aggregation for all sources
   */
  async runFullAggregation(options = {}) {
    console.log('🚀 Starting unified listing aggregation...\n');
    
    const {
      sources = Object.keys(this.sourceIntegrations),
      componentLimit = null,
      skipDeduplication = false
    } = options;
    
    try {
      // Initialize stats for each source
      sources.forEach(source => {
        this.stats.sourceStats[source] = {
          processed: 0,
          listings: 0,
          errors: 0,
          duration: 0
        };
      });
      
      // Get components to process
      const components = await this.getComponentsToProcess(componentLimit);
      console.log(`📋 Processing ${components.length} components across ${sources.length} sources\n`);
      
      // Process each source
      for (const source of sources) {
        await this.processSource(source, components);
      }
      
      // Run deduplication if enabled
      if (!skipDeduplication && AGGREGATOR_CONFIG.deduplication.enabled) {
        await this.deduplicateListings();
      }
      
      // Cleanup expired listings
      await this.cleanupExpiredListings();
      
      // Generate final report
      await this.generateReport();
      
    } catch (error) {
      console.error('❌ Fatal error in aggregation:', error);
      this.stats.errors.push({
        type: 'fatal',
        source: 'aggregator',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      this.stats.endTime = Date.now();
    }
    
    return this.stats;
  }
  
  /**
   * Process a single source integration
   */
  async processSource(sourceName, components) {
    const sourceStart = Date.now();
    console.log(`\n--- Processing Source: ${sourceName.toUpperCase()} ---`);
    
    const integration = this.sourceIntegrations[sourceName];
    if (!integration) {
      console.error(`❌ Unknown source: ${sourceName}`);
      return;
    }
    
    let processed = 0;
    let listings = 0;
    let errors = 0;
    
    try {
      // Process components in batches to avoid overwhelming APIs
      for (let i = 0; i < components.length; i += AGGREGATOR_CONFIG.batchSize) {
        const batch = components.slice(i, i + AGGREGATOR_CONFIG.batchSize);
        
        console.log(`\nBatch ${Math.floor(i / AGGREGATOR_CONFIG.batchSize) + 1}/${Math.ceil(components.length / AGGREGATOR_CONFIG.batchSize)} (${batch.length} components)`);
        
        const batchPromises = batch.map(async (component) => {
          let retries = 0;
          while (retries < AGGREGATOR_CONFIG.maxRetries) {
            try {
              const sourceListings = await integration.searchHeadFiForComponent?.(component) ||
                                   await integration.searchReverbForComponent?.(component) ||
                                   await integration.searchRedditForComponent?.(component) ||
                                   [];

              if (sourceListings.length > 0) {
                await integration.saveHeadFiListings?.(sourceListings) ||
                      await integration.saveReverbListings?.(sourceListings) ||
                      await integration.saveRedditListings?.(sourceListings);
                
                listings += sourceListings.length;
              }
              
              processed++;
              break; // Success, exit retry loop
              
            } catch (error) {
              retries++;
              console.warn(`⚠️ Error processing ${component.brand} ${component.name} (attempt ${retries}/${AGGREGATOR_CONFIG.maxRetries}):`, error.message);
              
              if (retries >= AGGREGATOR_CONFIG.maxRetries) {
                errors++;
                this.stats.errors.push({
                  type: 'component_processing',
                  source: sourceName,
                  component: `${component.brand} ${component.name}`,
                  error: error.message,
                  timestamp: new Date().toISOString()
                });
              } else {
                await new Promise(resolve => setTimeout(resolve, AGGREGATOR_CONFIG.retryDelay));
              }
            }
          }
        });
        
        // Process batch with limited concurrency
        const batchResults = [];
        for (let j = 0; j < batchPromises.length; j += AGGREGATOR_CONFIG.parallelSources) {
          const concurrentBatch = batchPromises.slice(j, j + AGGREGATOR_CONFIG.parallelSources);
          const results = await Promise.allSettled(concurrentBatch);
          batchResults.push(...results);
        }
        
        // Add delay between batches
        if (i + AGGREGATOR_CONFIG.batchSize < components.length) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
    } catch (error) {
      console.error(`❌ Source processing error for ${sourceName}:`, error);
      errors++;
    }
    
    const sourceDuration = Date.now() - sourceStart;
    this.stats.sourceStats[sourceName] = {
      processed,
      listings,
      errors,
      duration: sourceDuration
    };
    
    console.log(`\n✅ ${sourceName} complete: ${listings} listings from ${processed} components (${errors} errors) in ${Math.round(sourceDuration/1000)}s`);
  }
  
  /**
   * Get components to process
   */
  async getComponentsToProcess(limit = null) {
    try {
      let query = supabase
        .from('components')
        .select('id, name, brand, category, price_used_min, price_used_max')
        .in('category', ['cans', 'iems'])
        .order('brand, name');
      
      if (limit) {
        query = query.limit(limit);
      }
      
      const { data: components, error } = await query;
      
      if (error) {
        throw new Error(`Database error: ${error.message}`);
      }
      
      return components || [];
      
    } catch (error) {
      console.error('❌ Error fetching components:', error);
      return [];
    }
  }
  
  /**
   * Deduplicate listings across sources
   */
  async deduplicateListings() {
    console.log('\n🔍 Running deduplication analysis...');
    
    try {
      // Use the database function we created
      const { data: duplicates, error } = await supabase.rpc('find_potential_duplicates');
      
      if (error) {
        console.error('❌ Error finding duplicates:', error);
        return;
      }
      
      if (!duplicates || duplicates.length === 0) {
        console.log('✅ No potential duplicates found');
        return;
      }
      
      console.log(`🔍 Found ${duplicates.length} potential duplicate pairs`);
      
      // For now, just log them - in production we'd implement smart merging
      duplicates.slice(0, 10).forEach((dup, index) => {
        console.log(`${index + 1}. ${dup.component_name} - $${dup.price} difference`);
        console.log(`   ${dup.source1}: "${dup.title1.substring(0, 60)}..."`);
        console.log(`   ${dup.source2}: "${dup.title2.substring(0, 60)}..."`);
        console.log(`   Similarity: ${dup.similarity_score}/200\n`);
      });
      
      if (duplicates.length > 10) {
        console.log(`... and ${duplicates.length - 10} more potential duplicates`);
      }
      
    } catch (error) {
      console.error('❌ Error in deduplication:', error);
    }
  }
  
  /**
   * Clean up expired listings
   */
  async cleanupExpiredListings() {
    console.log('\n🧹 Cleaning up expired listings...');
    
    try {
      const { data: expiredCount, error } = await supabase.rpc('cleanup_expired_listings');
      
      if (error) {
        console.error('❌ Error cleaning up expired listings:', error);
      } else {
        console.log(`✅ Marked ${expiredCount || 0} expired listings as inactive`);
      }
      
    } catch (error) {
      console.error('❌ Error in cleanup:', error);
    }
  }
  
  /**
   * Generate health report
   */
  async generateHealthReport() {
    try {
      const { data: sourceStats, error } = await supabase.rpc('get_listing_stats_by_source');
      
      if (error) {
        console.error('❌ Error getting source stats:', error);
        return null;
      }
      
      const health = {
        overall: 'healthy',
        issues: [],
        recommendations: [],
        sourceHealth: {}
      };
      
      sourceStats.forEach(stat => {
        const sourceHealth = {
          status: 'healthy',
          activeListings: parseInt(stat.active_listings),
          avgPrice: parseFloat(stat.avg_price),
          lastUpdated: stat.last_updated,
          issues: []
        };
        
        // Check for issues
        if (stat.active_listings < AGGREGATOR_CONFIG.healthCheck.minListingsPerSource) {
          sourceHealth.status = 'warning';
          sourceHealth.issues.push('Low listing count');
          health.issues.push(`${stat.source}: Low listing count (${stat.active_listings})`);
        }
        
        const staleness = Date.now() - new Date(stat.last_updated).getTime();
        if (staleness > AGGREGATOR_CONFIG.healthCheck.stalenessThreshold) {
          sourceHealth.status = 'error';
          sourceHealth.issues.push('Stale data');
          health.issues.push(`${stat.source}: Data is stale (last updated ${Math.round(staleness / (1000 * 60 * 60))}h ago)`);
        }
        
        health.sourceHealth[stat.source] = sourceHealth;
      });
      
      // Overall health
      const errorSources = Object.values(health.sourceHealth).filter(s => s.status === 'error').length;
      const warningSources = Object.values(health.sourceHealth).filter(s => s.status === 'warning').length;
      
      if (errorSources > 0) {
        health.overall = 'error';
        health.recommendations.push('Check failed source integrations');
      } else if (warningSources > 0) {
        health.overall = 'warning';
        health.recommendations.push('Monitor warning sources for improvement');
      }
      
      return health;
      
    } catch (error) {
      console.error('❌ Error generating health report:', error);
      return null;
    }
  }
  
  /**
   * Generate final aggregation report
   */
  async generateReport() {
    console.log('\n📊 Aggregation Report');
    console.log('=' .repeat(50));
    
    const duration = (this.stats.endTime - this.stats.startTime) / 1000;
    console.log(`Total Duration: ${Math.round(duration)}s`);
    console.log(`Total Components: ${this.stats.totalProcessed}`);
    console.log(`Total Listings: ${this.stats.totalListings}`);
    console.log(`Total Errors: ${this.stats.errors.length}`);
    
    console.log('\nSource Breakdown:');
    Object.entries(this.stats.sourceStats).forEach(([source, stats]) => {
      const successRate = stats.processed > 0 ? ((stats.processed - stats.errors) / stats.processed * 100).toFixed(1) : '0';
      console.log(`  ${source}: ${stats.listings} listings, ${successRate}% success rate, ${Math.round(stats.duration/1000)}s`);
    });
    
    if (this.stats.errors.length > 0) {
      console.log('\nRecent Errors:');
      this.stats.errors.slice(-5).forEach((error, index) => {
        console.log(`  ${index + 1}. [${error.source}] ${error.error}`);
      });
    }
    
    // Health report
    const health = await this.generateHealthReport();
    if (health) {
      console.log(`\nSystem Health: ${health.overall.toUpperCase()}`);
      if (health.issues.length > 0) {
        console.log('Issues:', health.issues.join(', '));
      }
      if (health.recommendations.length > 0) {
        console.log('Recommendations:', health.recommendations.join(', '));
      }
    }
    
    console.log('\n🎉 Aggregation complete!');
  }
}

/**
 * Run specific source only
 */
async function runSingleSource(sourceName, componentLimit = null) {
  const aggregator = new ListingAggregator();
  return await aggregator.runFullAggregation({
    sources: [sourceName],
    componentLimit
  });
}

/**
 * Run health check only
 */
async function runHealthCheck() {
  console.log('🏥 Running system health check...\n');
  
  const aggregator = new ListingAggregator();
  const health = await aggregator.generateHealthReport();
  
  if (!health) {
    console.log('❌ Could not generate health report');
    return;
  }
  
  console.log(`Overall Status: ${health.overall.toUpperCase()}\n`);
  
  console.log('Source Status:');
  Object.entries(health.sourceHealth).forEach(([source, status]) => {
    const icon = status.status === 'healthy' ? '✅' : status.status === 'warning' ? '⚠️' : '❌';
    console.log(`  ${icon} ${source}: ${status.activeListings} listings, avg $${status.avgPrice}`);
    if (status.issues.length > 0) {
      status.issues.forEach(issue => console.log(`     - ${issue}`));
    }
  });
  
  if (health.issues.length > 0) {
    console.log('\nIssues:');
    health.issues.forEach(issue => console.log(`  • ${issue}`));
  }
  
  if (health.recommendations.length > 0) {
    console.log('\nRecommendations:');
    health.recommendations.forEach(rec => console.log(`  • ${rec}`));
  }
  
  return health;
}

// CLI handling
if (require.main === module) {
  const command = process.argv[2];
  const limit = process.argv[3] ? parseInt(process.argv[3]) : null;
  
  switch (command) {
    case 'health':
      runHealthCheck();
      break;
    case 'headfi':
      runSingleSource('head_fi', limit);
      break;
    case 'reverb':
      runSingleSource('reverb', limit);
      break;
    case 'reddit':
      runSingleSource('reddit_avexchange', limit);
      break;
    default:
      const aggregator = new ListingAggregator();
      aggregator.runFullAggregation({ componentLimit: limit });
      break;
  }
}

module.exports = {
  ListingAggregator,
  runSingleSource,
  runHealthCheck
};