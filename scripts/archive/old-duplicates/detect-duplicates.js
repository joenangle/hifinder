const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Normalize component name for comparison
function normalizeComponentName(name, brand) {
  if (!name) return '';

  let normalized = name.toLowerCase().trim();

  // Remove brand name from component name if it's already included
  if (brand) {
    const brandLower = brand.toLowerCase();
    normalized = normalized.replace(new RegExp(`^${brandLower}\\s*`, 'i'), '');
  }

  // Normalize common patterns
  normalized = normalized
    // Remove extra whitespace
    .replace(/\s+/g, ' ')
    // Normalize dashes and spaces in model numbers
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+/g, '')
    // Common model number patterns
    .replace(/hd\s*(\d+)/i, 'hd$1')
    .replace(/dt\s*(\d+)/i, 'dt$1')
    .replace(/k\s*(\d+)/i, 'k$1')
    .replace(/sr\s*(\d+)/i, 'sr$1')
    .replace(/he\s*(\d+)/i, 'he$1')
    .replace(/lcd\s*(\d+)/i, 'lcd$1')
    // Remove common suffixes that might vary
    .replace(/(pro|plus|se|mk2|mkii|mark\s*2|mark\s*ii)$/i, '')
    .trim();

  return normalized;
}

// Calculate similarity score between two strings
function calculateSimilarity(str1, str2) {
  if (str1 === str2) return 1.0;

  // Levenshtein distance
  const matrix = [];
  const len1 = str1.length;
  const len2 = str2.length;

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,      // deletion
        matrix[i][j - 1] + 1,      // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1.0 : (maxLen - matrix[len1][len2]) / maxLen;
}

// Detect potential duplicates
function findDuplicates(components) {
  const duplicateGroups = [];
  const processed = new Set();

  for (let i = 0; i < components.length; i++) {
    if (processed.has(i)) continue;

    const current = components[i];
    const group = [current];
    processed.add(i);

    const currentNormalized = normalizeComponentName(current.name, current.brand);

    for (let j = i + 1; j < components.length; j++) {
      if (processed.has(j)) continue;

      const candidate = components[j];

      // Only compare within same brand and category
      if (current.brand !== candidate.brand || current.category !== candidate.category) {
        continue;
      }

      const candidateNormalized = normalizeComponentName(candidate.name, candidate.brand);
      const similarity = calculateSimilarity(currentNormalized, candidateNormalized);

      // High similarity threshold for potential duplicates
      if (similarity >= 0.85) {
        group.push(candidate);
        processed.add(j);
      }
    }

    // Only include groups with multiple items
    if (group.length > 1) {
      duplicateGroups.push({
        normalizedName: normalizeComponentName(current.name, current.brand),
        brand: current.brand,
        category: current.category,
        items: group,
        count: group.length,
        maxSimilarity: Math.max(...group.map(item =>
          calculateSimilarity(
            normalizeComponentName(current.name, current.brand),
            normalizeComponentName(item.name, item.brand)
          )
        ))
      });
    }
  }

  return duplicateGroups.sort((a, b) => b.count - a.count);
}

// Analyze data quality issues
function analyzeDataQuality(duplicateGroups) {
  const issues = {
    totalDuplicates: duplicateGroups.reduce((sum, group) => sum + group.count, 0),
    totalGroups: duplicateGroups.length,
    byCategory: {},
    byBrand: {},
    commonPatterns: [],
    severityLevels: {
      high: 0,      // >95% similarity
      medium: 0,    // 90-95% similarity
      low: 0        // 85-90% similarity
    }
  };

  duplicateGroups.forEach(group => {
    // Count by category
    issues.byCategory[group.category] = (issues.byCategory[group.category] || 0) + group.count;

    // Count by brand
    issues.byBrand[group.brand] = (issues.byBrand[group.brand] || 0) + group.count;

    // Classify by severity
    if (group.maxSimilarity >= 0.95) {
      issues.severityLevels.high++;
    } else if (group.maxSimilarity >= 0.90) {
      issues.severityLevels.medium++;
    } else {
      issues.severityLevels.low++;
    }

    // Identify common patterns
    const variations = group.items.map(item => item.name);
    const patterns = findCommonPatterns(variations);
    issues.commonPatterns.push(...patterns);
  });

  return issues;
}

// Find common naming patterns causing duplicates
function findCommonPatterns(names) {
  const patterns = [];

  // Check for spacing variations
  const hasSpacingVariations = names.some(name =>
    names.some(other =>
      name.replace(/\s/g, '') === other.replace(/\s/g, '') && name !== other
    )
  );

  if (hasSpacingVariations) {
    patterns.push('spacing_variations');
  }

  // Check for dash variations
  const hasDashVariations = names.some(name =>
    names.some(other =>
      name.replace(/-/g, '') === other.replace(/-/g, '') && name !== other
    )
  );

  if (hasDashVariations) {
    patterns.push('dash_variations');
  }

  // Check for case variations
  const hasCaseVariations = names.some(name =>
    names.some(other =>
      name.toLowerCase() === other.toLowerCase() && name !== other
    )
  );

  if (hasCaseVariations) {
    patterns.push('case_variations');
  }

  return patterns;
}

// Generate merge recommendations
function generateMergeRecommendations(duplicateGroup) {
  const items = duplicateGroup.items;

  // Choose the "canonical" entry (most complete data)
  const canonical = items.reduce((best, current) => {
    let score = 0;

    // Prefer entries with more complete pricing
    if (current.price_new) score += 2;
    if (current.price_used_min && current.price_used_max) score += 2;

    // Prefer entries with descriptions
    if (current.why_recommended && current.why_recommended.length > 50) score += 1;

    // Prefer entries with images
    if (current.image_url) score += 1;

    // Prefer entries with Amazon links
    if (current.amazon_url) score += 1;

    // Prefer more recent entries
    if (current.updated_at) {
      const daysSinceUpdate = (Date.now() - new Date(current.updated_at)) / (1000 * 60 * 60 * 24);
      if (daysSinceUpdate < 30) score += 1;
    }

    return score > (best.score || 0) ? { ...current, score } : best;
  }, items[0]);

  // Merge strategy
  const mergedData = {
    id: canonical.id,
    name: canonical.name, // Use canonical name
    brand: canonical.brand,
    category: canonical.category,

    // Merge pricing (take broadest range)
    price_new: items.find(item => item.price_new)?.price_new || canonical.price_new,
    price_used_min: Math.min(...items.filter(item => item.price_used_min).map(item => item.price_used_min)) || canonical.price_used_min,
    price_used_max: Math.max(...items.filter(item => item.price_used_max).map(item => item.price_used_max)) || canonical.price_used_max,

    // Merge descriptions (longest one)
    why_recommended: items.reduce((longest, item) =>
      (item.why_recommended && item.why_recommended.length > (longest?.length || 0))
        ? item.why_recommended
        : longest,
      canonical.why_recommended
    ),

    // Prefer non-null values
    impedance: items.find(item => item.impedance)?.impedance || canonical.impedance,
    sensitivity: items.find(item => item.sensitivity)?.sensitivity || canonical.sensitivity,
    sound_signature: items.find(item => item.sound_signature)?.sound_signature || canonical.sound_signature,
    image_url: items.find(item => item.image_url)?.image_url || canonical.image_url,
    amazon_url: items.find(item => item.amazon_url)?.amazon_url || canonical.amazon_url,

    // Keep track of merged IDs
    merged_from: items.filter(item => item.id !== canonical.id).map(item => item.id)
  };

  return {
    canonical: canonical,
    toDelete: items.filter(item => item.id !== canonical.id),
    mergedData: mergedData
  };
}

// Main execution function
async function detectDuplicates() {
  try {
    console.log('🔍 Starting duplicate detection...\n');

    // Fetch all components
    const { data: components, error } = await supabase
      .from('components')
      .select('*')
      .order('brand', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      throw error;
    }

    console.log(`📊 Analyzing ${components.length} components...\n`);

    // Find duplicates
    const duplicateGroups = findDuplicates(components);

    // Analyze data quality
    const analysis = analyzeDataQuality(duplicateGroups);

    // Print summary
    console.log('📈 DUPLICATE ANALYSIS SUMMARY');
    console.log('═══════════════════════════════');
    console.log(`Total components: ${components.length}`);
    console.log(`Duplicate groups found: ${analysis.totalGroups}`);
    console.log(`Total duplicate entries: ${analysis.totalDuplicates}`);
    console.log(`Potential cleanup: ${analysis.totalDuplicates - analysis.totalGroups} entries to merge\n`);

    // Severity breakdown
    console.log('🎯 SEVERITY BREAKDOWN');
    console.log('─────────────────────');
    console.log(`High confidence (>95% similar): ${analysis.severityLevels.high} groups`);
    console.log(`Medium confidence (90-95%): ${analysis.severityLevels.medium} groups`);
    console.log(`Low confidence (85-90%): ${analysis.severityLevels.low} groups\n`);

    // Category breakdown
    console.log('📂 BY CATEGORY');
    console.log('───────────────');
    Object.entries(analysis.byCategory)
      .sort(([,a], [,b]) => b - a)
      .forEach(([category, count]) => {
        console.log(`${category}: ${count} duplicates`);
      });
    console.log();

    // Brand breakdown
    console.log('🏷️  BY BRAND');
    console.log('─────────────');
    Object.entries(analysis.byBrand)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10) // Top 10
      .forEach(([brand, count]) => {
        console.log(`${brand}: ${count} duplicates`);
      });
    console.log();

    // Show top duplicate groups
    console.log('🔥 TOP DUPLICATE GROUPS');
    console.log('───────────────────────');
    duplicateGroups.slice(0, 15).forEach((group, index) => {
      console.log(`${index + 1}. ${group.brand} - ${group.normalizedName} (${group.count} variants, ${(group.maxSimilarity * 100).toFixed(1)}% similar)`);
      group.items.forEach(item => {
        console.log(`   • "${item.name}" (ID: ${item.id})`);
      });
      console.log();
    });

    // Generate sample merge recommendations
    console.log('💡 SAMPLE MERGE RECOMMENDATIONS');
    console.log('────────────────────────────────');
    duplicateGroups.slice(0, 5).forEach((group, index) => {
      const recommendation = generateMergeRecommendations(group);
      console.log(`${index + 1}. ${group.brand} ${group.normalizedName}`);
      console.log(`   Keep: "${recommendation.canonical.name}" (ID: ${recommendation.canonical.id})`);
      console.log(`   Delete: ${recommendation.toDelete.map(item => `"${item.name}" (${item.id})`).join(', ')}`);
      console.log();
    });

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: analysis,
      duplicateGroups: duplicateGroups,
      sampleMerges: duplicateGroups.slice(0, 10).map(generateMergeRecommendations)
    };

    const fs = require('fs');
    fs.writeFileSync(
      `duplicate-analysis-${new Date().toISOString().split('T')[0]}.json`,
      JSON.stringify(report, null, 2)
    );

    console.log(`📄 Detailed report saved to duplicate-analysis-${new Date().toISOString().split('T')[0]}.json`);
    console.log('\n✅ Duplicate detection complete!');

  } catch (error) {
    console.error('❌ Error during duplicate detection:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  detectDuplicates();
}

module.exports = {
  detectDuplicates,
  normalizeComponentName,
  calculateSimilarity,
  findDuplicates,
  generateMergeRecommendations
};