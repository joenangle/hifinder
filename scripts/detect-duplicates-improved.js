const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// More precise normalization that preserves model differences
function normalizeComponentName(name, brand) {
  if (!name) return '';

  let normalized = name.toLowerCase().trim();

  // Remove brand name from component name if it's already included
  if (brand) {
    const brandLower = brand.toLowerCase();
    normalized = normalized.replace(new RegExp(`^${brandLower}\\s*`, 'i'), '');
  }

  // Normalize spacing and punctuation but preserve model numbers
  normalized = normalized
    // Standardize whitespace
    .replace(/\s+/g, ' ')
    // Normalize common dash patterns
    .replace(/\s*-\s*/g, '-')
    // Normalize common model patterns while preserving numbers
    .replace(/(\w+)\s+(\d+)/g, '$1$2')  // "HD 600" -> "hd600"
    .replace(/(\w+)-(\d+)/g, '$1$2')    // "HD-600" -> "hd600"
    .trim();

  return normalized;
}

// Extract model number for better comparison
function extractModelInfo(name) {
  const normalized = normalizeComponentName(name);

  // Extract model patterns
  const patterns = [
    /([a-z]+)(\d+)([a-z]*)/,           // hd600, dt770pro
    /([a-z-]+)(\d+)([a-z-]*)/,        // lcd-x2, sr-009s
    /([a-z]+)\s*(\d+)\s*([a-z]*)/,    // hd 600 pro
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      return {
        series: match[1],      // "hd", "dt", "lcd"
        number: match[2],      // "600", "770", "2"
        suffix: match[3] || '' // "pro", "s", ""
      };
    }
  }

  // No model number found
  return {
    series: normalized,
    number: '',
    suffix: ''
  };
}

// Calculate similarity score with model awareness
function calculateSimilarity(name1, name2, brand1, brand2) {
  // Must be same brand
  if (brand1 !== brand2) return 0;

  const norm1 = normalizeComponentName(name1, brand1);
  const norm2 = normalizeComponentName(name2, brand2);

  // Exact match
  if (norm1 === norm2) return 1.0;

  // Extract model info
  const model1 = extractModelInfo(name1);
  const model2 = extractModelInfo(name2);

  // Different model numbers = different products
  if (model1.number && model2.number && model1.number !== model2.number) {
    return 0;
  }

  // Different series = different products
  if (model1.series !== model2.series) {
    return 0;
  }

  // Same model, different suffix (like "pro", "mk2") - these are variants
  if (model1.number === model2.number && model1.series === model2.series) {
    if (model1.suffix === model2.suffix) {
      return 1.0; // Exact match
    } else {
      return 0.8; // Variant match
    }
  }

  // Fall back to string similarity for edge cases
  return calculateLevenshteinSimilarity(norm1, norm2);
}

// Levenshtein distance similarity
function calculateLevenshteinSimilarity(str1, str2) {
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
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const maxLen = Math.max(len1, len2);
  return maxLen === 0 ? 1.0 : (maxLen - matrix[len1][len2]) / maxLen;
}

// Find true duplicates (not just similar products)
function findTrueDuplicates(components) {
  const duplicateGroups = [];
  const processed = new Set();

  for (let i = 0; i < components.length; i++) {
    if (processed.has(i)) continue;

    const current = components[i];
    const group = [current];
    processed.add(i);

    for (let j = i + 1; j < components.length; j++) {
      if (processed.has(j)) continue;

      const candidate = components[j];

      // Only compare within same brand and category
      if (current.brand !== candidate.brand || current.category !== candidate.category) {
        continue;
      }

      const similarity = calculateSimilarity(
        current.name, candidate.name,
        current.brand, candidate.brand
      );

      // High similarity threshold for true duplicates
      if (similarity >= 0.95) {
        group.push(candidate);
        processed.add(j);
      }
    }

    // Only include groups with multiple items
    if (group.length > 1) {
      duplicateGroups.push({
        brand: current.brand,
        category: current.category,
        modelInfo: extractModelInfo(current.name),
        items: group,
        count: group.length,
        type: group.every(item =>
          calculateSimilarity(current.name, item.name, current.brand, item.brand) === 1.0
        ) ? 'exact' : 'variant'
      });
    }
  }

  return duplicateGroups.sort((a, b) => b.count - a.count);
}

// Generate merge strategy for each group
function generateMergeStrategy(duplicateGroup) {
  const items = duplicateGroup.items;

  // For exact duplicates, choose the most complete entry
  if (duplicateGroup.type === 'exact') {
    const canonical = items.reduce((best, current) => {
      let score = 0;

      // Scoring criteria
      if (current.price_new) score += 3;
      if (current.price_used_min && current.price_used_max) score += 3;
      if (current.why_recommended && current.why_recommended.length > 50) score += 2;
      if (current.image_url) score += 2;
      if (current.amazon_url) score += 2;
      if (current.impedance) score += 1;
      if (current.sensitivity) score += 1;
      if (current.sound_signature) score += 1;

      // Prefer more recent entries
      if (current.updated_at) {
        const daysSinceUpdate = (Date.now() - new Date(current.updated_at)) / (1000 * 60 * 60 * 24);
        if (daysSinceUpdate < 30) score += 1;
      }

      return score > (best.score || 0) ? { ...current, score } : best;
    }, items[0]);

    return {
      strategy: 'merge',
      canonical: canonical,
      toDelete: items.filter(item => item.id !== canonical.id),
      mergedData: createMergedData(canonical, items)
    };
  }

  // For variants, suggest manual review
  return {
    strategy: 'manual_review',
    reason: 'Different product variants detected',
    items: items
  };
}

// Create merged data combining best aspects of all entries
function createMergedData(canonical, items) {
  return {
    id: canonical.id,
    name: canonical.name,
    brand: canonical.brand,
    category: canonical.category,

    // Merge pricing data
    price_new: items.find(item => item.price_new)?.price_new || canonical.price_new,
    price_used_min: Math.min(
      ...items.filter(item => item.price_used_min).map(item => item.price_used_min)
    ) || canonical.price_used_min,
    price_used_max: Math.max(
      ...items.filter(item => item.price_used_max).map(item => item.price_used_max)
    ) || canonical.price_used_max,

    // Keep best descriptions
    why_recommended: items.reduce((best, item) =>
      (item.why_recommended && item.why_recommended.length > (best?.length || 0))
        ? item.why_recommended : best,
      canonical.why_recommended
    ),

    // Keep best specs
    impedance: items.find(item => item.impedance)?.impedance || canonical.impedance,
    sensitivity: items.find(item => item.sensitivity)?.sensitivity || canonical.sensitivity,
    sound_signature: items.find(item => item.sound_signature)?.sound_signature || canonical.sound_signature,

    // Keep best links
    image_url: items.find(item => item.image_url)?.image_url || canonical.image_url,
    amazon_url: items.find(item => item.amazon_url)?.amazon_url || canonical.amazon_url,

    // Track merge history
    merged_from: items.filter(item => item.id !== canonical.id).map(item => item.id)
  };
}

// Main execution
async function detectTrueDuplicates() {
  try {
    console.log('🔍 Starting improved duplicate detection...\n');

    // Fetch all components
    const { data: components, error } = await supabase
      .from('components')
      .select('*')
      .order('brand', { ascending: true })
      .order('name', { ascending: true });

    if (error) throw error;

    console.log(`📊 Analyzing ${components.length} components...\n`);

    // Find true duplicates
    const duplicateGroups = findTrueDuplicates(components);

    // Separate exact duplicates from variants
    const exactDuplicates = duplicateGroups.filter(g => g.type === 'exact');
    const variants = duplicateGroups.filter(g => g.type === 'variant');

    console.log('📈 IMPROVED DUPLICATE ANALYSIS');
    console.log('══════════════════════════════');
    console.log(`Total components: ${components.length}`);
    console.log(`Exact duplicate groups: ${exactDuplicates.length}`);
    console.log(`Variant groups (manual review): ${variants.length}`);
    console.log(`Safe to auto-merge: ${exactDuplicates.reduce((sum, g) => sum + g.count - 1, 0)} entries\n`);

    // Show exact duplicates (safe to merge)
    console.log('✅ EXACT DUPLICATES (Safe to Auto-Merge)');
    console.log('──────────────────────────────────────────');
    exactDuplicates.slice(0, 15).forEach((group, index) => {
      console.log(`${index + 1}. ${group.brand} ${group.items[0].name} (${group.count} copies)`);
      group.items.forEach(item => {
        console.log(`   • ID: ${item.id}`);
      });
      console.log();
    });

    // Show variants (need manual review)
    if (variants.length > 0) {
      console.log('⚠️  PRODUCT VARIANTS (Manual Review Needed)');
      console.log('─────────────────────────────────────────────');
      variants.slice(0, 10).forEach((group, index) => {
        console.log(`${index + 1}. ${group.brand} variants:`);
        group.items.forEach(item => {
          console.log(`   • "${item.name}" (ID: ${item.id})`);
        });
        console.log();
      });
    }

    // Generate merge recommendations for exact duplicates
    console.log('💡 AUTO-MERGE RECOMMENDATIONS');
    console.log('────────────────────────────');
    const mergeRecommendations = exactDuplicates.slice(0, 10).map(generateMergeStrategy);

    mergeRecommendations.forEach((rec, index) => {
      if (rec.strategy === 'merge') {
        console.log(`${index + 1}. ${rec.canonical.brand} ${rec.canonical.name}`);
        console.log(`   Keep: ID ${rec.canonical.id}`);
        console.log(`   Delete: ${rec.toDelete.map(item => item.id).join(', ')}`);
        console.log();
      }
    });

    // Save detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalComponents: components.length,
        exactDuplicateGroups: exactDuplicates.length,
        variantGroups: variants.length,
        safeToMerge: exactDuplicates.reduce((sum, g) => sum + g.count - 1, 0)
      },
      exactDuplicates,
      variants,
      mergeRecommendations
    };

    const fs = require('fs');
    fs.writeFileSync(
      `duplicate-analysis-improved-${new Date().toISOString().split('T')[0]}.json`,
      JSON.stringify(report, null, 2)
    );

    console.log(`📄 Detailed report saved to duplicate-analysis-improved-${new Date().toISOString().split('T')[0]}.json`);
    console.log('\n✅ Improved duplicate detection complete!');

    return report;

  } catch (error) {
    console.error('❌ Error during duplicate detection:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  detectTrueDuplicates();
}

module.exports = {
  detectTrueDuplicates,
  generateMergeStrategy,
  findTrueDuplicates
};