#!/usr/bin/env node

/**
 * Comprehensive Duplicate Detection Script
 *
 * Analyzes all components in the database to find:
 * 1. Exact duplicates (same name, same brand)
 * 2. Fuzzy duplicates (similar names, brand variations)
 * 3. Quality comparison (which entry has more complete data)
 * 4. Recommended actions (merge, delete, keep separate)
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Normalize brand names for comparison
 */
function normalizeBrand(brand) {
  if (!brand) return '';
  return brand
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '') // Remove special chars
    .replace(/hifiman/g, 'hifiman') // Standardize HiFiMAN variants
    .replace(/audiotechnica/g, 'audiotechnica') // Audio-Technica variants
    .replace(/beyerdynamic/g, 'beyerdynamic'); // Beyer variants
}

/**
 * Normalize product names for comparison
 */
function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\s+/g, '') // Remove whitespace
    .replace(/[^a-z0-9]/g, '') // Remove special chars
    .replace(/mk2|mkii/g, 'mk2') // Standardize mk2 variants
    .replace(/\(.*?\)/g, ''); // Remove parenthetical info for base comparison
}

/**
 * Calculate data completeness score
 */
function calculateDataQuality(component) {
  let score = 0;
  let max = 0;

  // Price data (always present)
  if (component.price_used_min) score++;
  max++;

  // Crinacle expert data (most valuable)
  if (component.tone_grade) score += 3;
  if (component.technical_grade) score += 3;
  if (component.crinacle_rank) score += 2;
  if (component.crinacle_sound_signature) score += 1;
  if (component.value_rating) score += 1;
  max += 10;

  // ASR data (for DACs/amps)
  if (component.asr_sinad) score += 3;
  max += 3;

  // Technical specs
  if (component.driver_type) score += 1;
  if (component.fit) score += 1;
  if (component.impedance) score += 1;
  max += 3;

  // Sound signature (basic)
  if (component.sound_signature) score += 1;
  max += 1;

  return { score, max, percentage: Math.round((score / max) * 100) };
}

/**
 * Detect potential duplicates
 */
function findDuplicates(components) {
  const groups = new Map();

  // Group by normalized name + brand
  components.forEach(comp => {
    const normalizedBrand = normalizeBrand(comp.brand);
    const normalizedName = normalizeName(comp.name);
    const key = `${normalizedBrand}|${normalizedName}`;

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(comp);
  });

  // Filter to only groups with multiple entries
  const duplicates = [];
  groups.forEach((comps, key) => {
    if (comps.length > 1) {
      // Sort by data quality (best first)
      comps.sort((a, b) => {
        const qualityA = calculateDataQuality(a);
        const qualityB = calculateDataQuality(b);
        return qualityB.score - qualityA.score;
      });

      duplicates.push({
        key,
        count: comps.length,
        components: comps
      });
    }
  });

  return duplicates.sort((a, b) => b.count - a.count);
}

/**
 * Determine recommended action for duplicate group
 */
function getRecommendedAction(group) {
  const comps = group.components;
  const best = comps[0];
  const bestQuality = calculateDataQuality(best);

  // Check if entries have different names (e.g., "Sundara" vs "Sundara (2020)")
  const hasVariants = new Set(comps.map(c => c.name)).size > 1;

  if (hasVariants) {
    // Different names - might be legitimate variants
    const hasDataDifferences = comps.some(c => {
      const quality = calculateDataQuality(c);
      return quality.score > 0 && quality.score !== bestQuality.score;
    });

    if (hasDataDifferences) {
      return {
        action: 'RESEARCH',
        reason: 'Different names with varying data - verify if legitimate variants',
        keepAll: true
      };
    } else {
      return {
        action: 'MERGE_OR_DELETE',
        reason: 'Variants with no unique data - likely duplicates with different naming',
        keepBest: true
      };
    }
  }

  // Exact same names
  const othersHaveData = comps.slice(1).some(c => {
    const quality = calculateDataQuality(c);
    return quality.score > 5; // Has significant data
  });

  if (othersHaveData) {
    return {
      action: 'MERGE',
      reason: 'Multiple entries have valuable data - merge into best entry',
      keepBest: true
    };
  } else {
    return {
      action: 'DELETE',
      reason: 'Duplicates with no additional data - safe to delete',
      keepBest: true
    };
  }
}

/**
 * Main analysis function
 */
async function analyzeAllDuplicates() {
  console.log('🔍 Analyzing all components for duplicates...\n');

  // Fetch all components
  const { data: components, error } = await supabase
    .from('components')
    .select('*')
    .order('name');

  if (error) {
    console.error('❌ Error fetching components:', error);
    return;
  }

  console.log(`📊 Total components: ${components.length}\n`);

  // Find duplicates
  const duplicates = findDuplicates(components);

  console.log(`🔎 Found ${duplicates.length} duplicate groups\n`);
  console.log('═'.repeat(80));

  // Analyze each duplicate group
  const summary = {
    totalDuplicates: 0,
    shouldDelete: [],
    shouldMerge: [],
    shouldResearch: []
  };

  duplicates.forEach((group, index) => {
    console.log(`\n${index + 1}. ${group.components[0].name} by ${group.components[0].brand}`);
    console.log(`   ${group.count} entries found:\n`);

    group.components.forEach((comp, i) => {
      const quality = calculateDataQuality(comp);
      const isBest = i === 0;

      console.log(`   ${isBest ? '★' : ' '} ${i + 1}. "${comp.name}" by "${comp.brand}"`);
      console.log(`      ID: ${comp.id}`);
      console.log(`      Price: $${comp.price_used_min}-$${comp.price_used_max}`);
      console.log(`      Data Quality: ${quality.percentage}% (${quality.score}/${quality.max} points)`);

      if (comp.tone_grade || comp.technical_grade) {
        console.log(`      Crinacle: ${comp.tone_grade || 'N/A'} / ${comp.technical_grade || 'N/A'}`);
      }
      if (comp.asr_sinad) {
        console.log(`      ASR SINAD: ${comp.asr_sinad}dB`);
      }
      if (comp.driver_type || comp.fit) {
        console.log(`      Specs: ${comp.driver_type || 'N/A'} driver, ${comp.fit || 'N/A'} fit`);
      }
      console.log();
    });

    const recommendation = getRecommendedAction(group);
    console.log(`   📋 Recommendation: ${recommendation.action}`);
    console.log(`   💡 ${recommendation.reason}`);

    if (recommendation.keepBest) {
      console.log(`   ✅ Keep: "${group.components[0].name}" (ID: ${group.components[0].id})`);

      const toRemove = group.components.slice(1);
      toRemove.forEach(comp => {
        console.log(`   ❌ Remove: "${comp.name}" (ID: ${comp.id})`);
      });

      summary.totalDuplicates += toRemove.length;

      if (recommendation.action === 'DELETE') {
        summary.shouldDelete.push(...toRemove.map(c => c.id));
      } else if (recommendation.action === 'MERGE' || recommendation.action === 'MERGE_OR_DELETE') {
        summary.shouldMerge.push(group);
      }
    }

    if (recommendation.action === 'RESEARCH') {
      summary.shouldResearch.push(group);
    }

    console.log('─'.repeat(80));
  });

  // Summary
  console.log('\n' + '═'.repeat(80));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(80));
  console.log(`Total duplicate entries: ${summary.totalDuplicates}`);
  console.log(`Safe to delete: ${summary.shouldDelete.length} entries`);
  console.log(`Need merge: ${summary.shouldMerge.length} groups`);
  console.log(`Need research: ${summary.shouldResearch.length} groups\n`);

  // Export detailed lists
  if (process.argv.includes('--export')) {
    const fs = require('fs');
    const report = {
      timestamp: new Date().toISOString(),
      totalComponents: components.length,
      duplicateGroups: duplicates.length,
      summary,
      details: duplicates.map(group => ({
        name: group.components[0].name,
        brand: group.components[0].brand,
        count: group.count,
        recommendation: getRecommendedAction(group),
        entries: group.components.map(c => ({
          id: c.id,
          name: c.name,
          brand: c.brand,
          quality: calculateDataQuality(c)
        }))
      }))
    };

    fs.writeFileSync(
      'duplicate-analysis-report.json',
      JSON.stringify(report, null, 2)
    );
    console.log('📄 Detailed report exported to: duplicate-analysis-report.json\n');
  }

  // Generate delete script
  if (process.argv.includes('--generate-fix') && summary.shouldDelete.length > 0) {
    console.log('🔧 Generating fix script...\n');

    const fixScript = `#!/usr/bin/env node

/**
 * Auto-generated script to remove ${summary.shouldDelete.length} duplicate entries
 * Generated: ${new Date().toISOString()}
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const duplicateIds = ${JSON.stringify(summary.shouldDelete, null, 2)};

async function removeDuplicates() {
  console.log('🗑️  Removing ${summary.shouldDelete.length} duplicate entries...\\n');

  for (const id of duplicateIds) {
    const { error } = await supabase
      .from('components')
      .delete()
      .eq('id', id);

    if (error) {
      console.error(\`❌ Error deleting \${id}:\`, error);
    } else {
      console.log(\`✅ Deleted \${id}\`);
    }
  }

  console.log('\\n✨ Cleanup complete!');
}

if (process.argv.includes('--execute')) {
  removeDuplicates().catch(console.error);
} else {
  console.log('🔍 DRY RUN - Run with --execute to delete duplicates');
  console.log(\`Would delete \${duplicateIds.length} entries\`);
}
`;

    const fs = require('fs');
    fs.writeFileSync('scripts/auto-remove-duplicates.js', fixScript);
    fs.chmodSync('scripts/auto-remove-duplicates.js', '755');
    console.log('✅ Fix script generated: scripts/auto-remove-duplicates.js');
    console.log('   Run: node scripts/auto-remove-duplicates.js --execute\n');
  }

  console.log('💡 Options:');
  console.log('   --export: Export detailed JSON report');
  console.log('   --generate-fix: Generate automated cleanup script');
}

analyzeAllDuplicates().catch(console.error);
