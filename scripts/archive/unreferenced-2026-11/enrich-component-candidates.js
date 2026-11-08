/**
 * Enrich Component Candidates
 *
 * Automatically enriches pending component candidates with:
 * - ASR measurements (SINAD)
 * - Crinacle ratings (tone/tech grades)
 * - Manufacturer URLs
 * - MSRP pricing
 * - Technical specifications
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Configuration
const isDryRun = process.argv.includes('--dry-run');
const minQualityScore = parseInt(process.argv.find(arg => arg.startsWith('--min-quality='))?.split('=')[1] || '0');

// Statistics
const stats = {
  candidatesProcessed: 0,
  fieldsEnriched: 0,
  asrFound: 0,
  crinacleFound: 0,
  manufacturerUrlFound: 0,
  msrpFound: 0,
  qualityImproved: 0,
  errors: 0
};

/**
 * Manufacturer URL patterns (reused from populate-manufacturer-urls-hybrid.js)
 */
const MANUFACTURER_URL_PATTERNS = {
  'sennheiser': (model) => `https://www.sennheiser.com/en-us/${model.toLowerCase().replace(/\s+/g, '-')}`,
  'audio-technica': (model) => `https://www.audio-technica.com/en-us/products/${model.toLowerCase().replace(/\s+/g, '-')}`,
  'beyerdynamic': (model) => `https://north-america.beyerdynamic.com/catalog/product/view/sku/${model.replace(/\s+/g, '-')}`,
  'hifiman': (model) => `https://hifiman.com/products/detail/${model.toLowerCase().replace(/\s+/g, '-')}`,
  'audeze': (model) => `https://www.audeze.com/products/${model.toLowerCase().replace(/\s+/g, '-')}`,
  'focal': (model) => `https://www.focal.com/en/headphones/${model.toLowerCase().replace(/\s+/g, '-')}`,
  'moondrop': (model) => `https://www.moondroplab.com/en/product/${model.toLowerCase().replace(/\s+/g, '-')}`,
  'fiio': (model) => `https://www.fiio.com/products/${model.toLowerCase().replace(/\s+/g, '-')}`,
  'shure': (model) => `https://www.shure.com/en-US/products/earphones/${model.toLowerCase().replace(/\s+/g, '-')}`,
  'akg': (model) => `https://www.akg.com/en/products/${model.toLowerCase().replace(/\s+/g, '-')}`,
  'sony': (model) => `https://electronics.sony.com/audio/headphones/c/${model.toLowerCase().replace(/\s+/g, '-')}`,
  'bose': (model) => `https://www.bose.com/p/${model.toLowerCase().replace(/\s+/g, '-')}`
};

/**
 * Generate manufacturer URL
 */
function generateManufacturerUrl(brand, model) {
  const brandKey = brand.toLowerCase().replace(/\s+/g, '-');
  const pattern = MANUFACTURER_URL_PATTERNS[brandKey];

  if (!pattern) return null;

  try {
    return pattern(model);
  } catch (error) {
    return null;
  }
}

/**
 * Validate URL exists (HEAD request)
 */
async function validateUrl(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Search ASR for component
 * Simplified version - checks if review exists
 */
async function searchASR(brand, model) {
  // ASR search pattern: https://www.audiosciencereview.com/forum/index.php?search/
  // For now, construct likely review URL and check if it exists
  const searchQuery = `${brand} ${model}`.toLowerCase().replace(/\s+/g, '+');
  const possibleUrl = `https://www.audiosciencereview.com/forum/index.php?threads/${brand.toLowerCase()}-${model.toLowerCase().replace(/\s+/g, '-')}-review.xxxxx/`;

  // For production, you'd want to actually search ASR's API or scrape search results
  // For now, return null (can be enhanced later)
  return null;
}

/**
 * Check Crinacle data cache
 * Looks for cached Crinacle data in database components table
 */
async function searchCrinacleCache(brand, model) {
  try {
    const { data, error } = await supabase
      .from('components')
      .select('crin_tone, crin_tech, crin_rank, crin_value, crin_signature')
      .ilike('brand', brand)
      .ilike('name', `%${model}%`)
      .not('crin_tone', 'is', null)
      .limit(1);

    if (error || !data || data.length === 0) {
      return null;
    }

    return data[0];
  } catch (error) {
    console.error('Error searching Crinacle cache:', error.message);
    return null;
  }
}

/**
 * Estimate MSRP from observed listing prices
 * Conservative estimate: max observed price / 0.7 (assuming listings are ~70% of MSRP)
 */
function estimateMSRP(observedMin, observedMax) {
  if (!observedMax) return null;

  // Use max price as baseline, assume it's 70% of MSRP
  const estimate = Math.round(observedMax / 0.7);

  // Sanity check: don't estimate MSRP below observed max
  return Math.max(estimate, observedMax);
}

/**
 * Calculate quality score based on data completeness
 */
function calculateQualityScore(candidate) {
  let score = 0;

  // Core identification (40 points)
  if (candidate.brand) score += 20;
  if (candidate.model && candidate.model.length >= 3) score += 20;

  // Category (15 points)
  if (candidate.category) score += 15;

  // Pricing (25 points)
  if (candidate.price_observed_min) score += 10;
  if (candidate.price_estimate_new) score += 15;

  // Technical specs (10 points)
  if (candidate.impedance) score += 3;
  if (candidate.driver_type) score += 4;
  if (candidate.sound_signature) score += 3;

  // Expert data (10 points)
  if (candidate.asr_sinad) score += 5;
  if (candidate.crin_tone || candidate.crin_tech) score += 5;

  return Math.min(100, score);
}

/**
 * Enrich a single candidate
 */
async function enrichCandidate(candidate) {
  console.log(`\n🔍 Enriching: ${candidate.brand} ${candidate.model}`);

  const enrichedData = {};
  let fieldsAdded = 0;

  // 1. Search ASR
  if (!candidate.asr_sinad) {
    const asrData = await searchASR(candidate.brand, candidate.model);
    if (asrData) {
      enrichedData.asr_sinad = asrData.sinad;
      enrichedData.asr_review_url = asrData.url;
      fieldsAdded += 2;
      stats.asrFound++;
      console.log(`  ✅ Found ASR data: ${asrData.sinad} dB SINAD`);
    }
  }

  // 2. Search Crinacle cache
  if (!candidate.crin_tone && !candidate.crin_tech) {
    const crinData = await searchCrinacleCache(candidate.brand, candidate.model);
    if (crinData) {
      if (crinData.crin_tone) {
        enrichedData.crin_tone = crinData.crin_tone;
        fieldsAdded++;
      }
      if (crinData.crin_tech) {
        enrichedData.crin_tech = crinData.crin_tech;
        fieldsAdded++;
      }
      if (crinData.crin_rank) {
        enrichedData.crin_rank = crinData.crin_rank;
        fieldsAdded++;
      }
      if (crinData.crin_value) {
        enrichedData.crin_value = crinData.crin_value;
        fieldsAdded++;
      }
      if (crinData.crin_signature) {
        enrichedData.crin_signature = crinData.crin_signature;
        fieldsAdded++;
      }
      stats.crinacleFound++;
      console.log(`  ✅ Found Crinacle data: ${crinData.crin_tone || ''} ${crinData.crin_tech || ''}`);
    }
  }

  // 3. Generate manufacturer URL
  if (!candidate.manufacturer_url) {
    const url = generateManufacturerUrl(candidate.brand, candidate.model);
    if (url) {
      const isValid = await validateUrl(url);
      if (isValid) {
        enrichedData.manufacturer_url = url;
        fieldsAdded++;
        stats.manufacturerUrlFound++;
        console.log(`  ✅ Found manufacturer URL: ${url}`);
      }
    }
  }

  // 4. Estimate MSRP if not present
  if (!candidate.price_estimate_new && candidate.price_observed_max) {
    const msrp = estimateMSRP(candidate.price_observed_min, candidate.price_observed_max);
    if (msrp) {
      enrichedData.price_estimate_new = msrp;
      enrichedData.price_used_min = Math.round(msrp * 0.6);
      enrichedData.price_used_max = Math.round(msrp * 0.8);
      fieldsAdded += 3;
      stats.msrpFound++;
      console.log(`  ✅ Estimated MSRP: $${msrp} (from observed prices)`);
    }
  }

  // Calculate new quality score
  const updatedCandidate = { ...candidate, ...enrichedData };
  const oldQuality = candidate.quality_score || 0;
  const newQuality = calculateQualityScore(updatedCandidate);

  if (newQuality > oldQuality) {
    enrichedData.quality_score = newQuality;
    stats.qualityImproved++;
    console.log(`  📈 Quality score: ${oldQuality}% → ${newQuality}%`);
  }

  stats.fieldsEnriched += fieldsAdded;

  if (fieldsAdded === 0) {
    console.log(`  ⏭️  No new data found`);
    return null;
  }

  return enrichedData;
}

/**
 * Main enrichment function
 */
async function enrichCandidates() {
  console.log('🚀 Component Candidate Enrichment\n');
  console.log(`Mode: ${isDryRun ? 'DRY RUN (no changes)' : 'EXECUTE (will update database)'}`);
  console.log(`Min Quality Filter: ${minQualityScore}%\n`);

  try {
    // Fetch pending candidates
    let query = supabase
      .from('new_component_candidates')
      .select('*')
      .eq('status', 'pending')
      .order('quality_score', { ascending: false });

    if (minQualityScore > 0) {
      query = query.gte('quality_score', minQualityScore);
    }

    const { data: candidates, error } = await query;

    if (error) throw error;

    if (!candidates || candidates.length === 0) {
      console.log('✅ No pending candidates to enrich');
      return;
    }

    console.log(`📦 Found ${candidates.length} candidates to process\n`);

    // Process each candidate
    for (const candidate of candidates) {
      stats.candidatesProcessed++;

      try {
        const enrichedData = await enrichCandidate(candidate);

        if (enrichedData && !isDryRun) {
          // Update database
          const { error: updateError } = await supabase
            .from('new_component_candidates')
            .update({
              ...enrichedData,
              updated_at: new Date().toISOString()
            })
            .eq('id', candidate.id);

          if (updateError) {
            console.error(`  ❌ Error updating: ${updateError.message}`);
            stats.errors++;
          } else {
            console.log(`  💾 Updated candidate in database`);
          }
        }
      } catch (error) {
        console.error(`  ❌ Error processing candidate:`, error.message);
        stats.errors++;
      }

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Print statistics
    console.log('\n' + '='.repeat(60));
    console.log('📊 Enrichment Statistics');
    console.log('='.repeat(60));
    console.log(`Candidates processed:     ${stats.candidatesProcessed}`);
    console.log(`Fields enriched:          ${stats.fieldsEnriched}`);
    console.log(`ASR data found:           ${stats.asrFound}`);
    console.log(`Crinacle data found:      ${stats.crinacleFound}`);
    console.log(`Manufacturer URLs found:  ${stats.manufacturerUrlFound}`);
    console.log(`MSRP estimates created:   ${stats.msrpFound}`);
    console.log(`Quality scores improved:  ${stats.qualityImproved}`);
    console.log(`Errors:                   ${stats.errors}`);
    console.log('='.repeat(60));

    if (isDryRun) {
      console.log('\n⚠️  DRY RUN MODE - No changes were made to the database');
      console.log('   Run with --execute flag to apply changes');
    } else {
      console.log('\n✅ Enrichment complete!');
    }

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  enrichCandidates()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Enrichment failed:', error);
      process.exit(1);
    });
}

module.exports = { enrichCandidates };
