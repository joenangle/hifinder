const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Try to require xlsx for ODS support, fall back gracefully
let XLSX;
try {
  XLSX = require('xlsx');
} catch (e) {
  console.log('📝 Note: Install xlsx package for ODS support: npm install xlsx');
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Known multi-word brands for proper splitting
const MULTI_WORD_BRANDS = [
  'Ultimate Ears',
  'Unique Melody',
  'Audio Technica',
  'Audio-Technica',
  'Shure Incorporated',
  'Bang & Olufsen',
  'Master & Dynamic',
  'V-Moda',
  'House of Marley',
  'Tin HiFi',
  'Final Audio',
  'Drop + Sennheiser',
  'Drop + Focal',
  'Drop + HIFIMAN',
  'Moondrop x Crinacle',
  'Sony Music',
  'Audio Solutions'
];

function splitBrandAndModel(modelString) {
  if (!modelString) return { brand: '', name: '' };

  // Check for multi-word brands first
  for (const brand of MULTI_WORD_BRANDS) {
    if (modelString.startsWith(brand)) {
      const name = modelString.substring(brand.length).trim();
      return { brand: brand.trim(), name };
    }
  }

  // Default: first word is brand, rest is model
  const parts = modelString.trim().split(' ');
  const brand = parts[0];
  const name = parts.slice(1).join(' ');

  return { brand, name };
}

function fuzzyMatch(str1, str2, threshold = 0.8) {
  if (!str1 || !str2) return false;

  const s1 = str1.toLowerCase().trim();
  const s2 = str2.toLowerCase().trim();

  if (s1 === s2) return true;

  // Simple Levenshtein-based similarity
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;

  if (longer.length === 0) return true;

  const editDistance = levenshteinDistance(longer, shorter);
  const similarity = (longer.length - editDistance) / longer.length;

  return similarity >= threshold;
}

function levenshteinDistance(str1, str2) {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

function parseFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.ods') {
    if (!XLSX) {
      throw new Error('xlsx package required for ODS files. Run: npm install xlsx');
    }
    console.log('📊 Reading ODS file...');
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    return XLSX.utils.sheet_to_json(worksheet);

  } else if (ext === '.csv') {
    console.log('📊 Reading CSV file...');
    const csvContent = fs.readFileSync(filePath, 'utf8');
    const lines = csvContent.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    return lines.slice(1).map(line => {
      const values = line.split(',').map(v => v.trim());
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      return row;
    });

  } else {
    throw new Error('Unsupported file format. Use .csv or .ods files.');
  }
}

async function mergeCrinacleData(csvFilePath) {
  console.log('🔄 Starting Crinacle headphones data merge...');

  // Read CSV file
  if (!fs.existsSync(csvFilePath)) {
    console.log('❌ CSV file not found:', csvFilePath);
    return;
  }

  const csvData = parseFile(csvFilePath);

  console.log('📊 Loaded', csvData.length, 'items from CSV');

  // Get existing components
  const { data: existingComponents, error } = await supabase
    .from('components')
    .select('id, name, brand, category');

  if (error) {
    console.log('❌ Error fetching existing components:', error.message);
    return;
  }

  console.log('📊 Found', existingComponents.length, 'existing components in database');

  let matched = 0;
  let updated = 0;
  let skipped = 0;
  const updates = [];

  // Process each CSV row
  for (const csvRow of csvData) {
    const { brand: csvBrand, name: csvName } = splitBrandAndModel(csvRow.Model);

    if (!csvBrand || !csvName) {
      console.log('⚠️  Skipping invalid model:', csvRow.Model);
      skipped++;
      continue;
    }

    // Find matching component using fuzzy matching
    const match = existingComponents.find(comp => {
      const brandMatch = fuzzyMatch(comp.brand, csvBrand);
      const nameMatch = fuzzyMatch(comp.name, csvName);
      return brandMatch && nameMatch;
    });

    if (!match) {
      console.log('❓ No match found for:', csvBrand, '-', csvName);
      skipped++;
      continue;
    }

    matched++;

    // Prepare update data (only update if values exist in CSV)
    const updateData = {
      category: 'cans', // All items in this CSV are headphones
    };

    // Map CSV columns to database fields with sound signature mapping
    if (csvRow.CrinSignature) {
      // Map Crinacle's sound signatures to allowed database values
      const signatureMap = {
        'Neutral': 'neutral',
        'Bright neutral': 'bright',
        'Bass-rolled neutral': 'neutral',
        'Warm neutral': 'warm',
        'Warm': 'warm',
        'Bright': 'bright',
        'Fun': 'fun',
        'V-shaped': 'fun'
      };

      updateData.sound_signature = signatureMap[csvRow.CrinSignature] || csvRow.CrinSignature.toLowerCase();
    }
    if (csvRow.CrinValue) updateData.value_rating = parseFloat(csvRow.CrinValue);
    if (csvRow.CrinRank) updateData.crinacle_rank = parseInt(csvRow.CrinRank);
    if (csvRow.CrinTone) updateData.tone_grade = csvRow.CrinTone;
    if (csvRow.CrinTech) updateData.technical_grade = csvRow.CrinTech;

    // New fields
    if (csvRow.CrinComments) updateData.crinacle_comments = csvRow.CrinComments;
    if (csvRow.CrinDriver) updateData.driver_type = csvRow.CrinDriver;
    if (csvRow.CrinFit) updateData.fit = csvRow.CrinFit;

    updates.push({
      id: match.id,
      existing: `${match.brand} - ${match.name}`,
      csv: `${csvBrand} - ${csvName}`,
      updateData
    });
  }

  console.log('\n=== Match Summary ===');
  console.log('✅ Matched:', matched);
  console.log('❓ Skipped:', skipped);
  console.log('📝 Ready to update:', updates.length);

  if (updates.length === 0) {
    console.log('No updates to perform.');
    return;
  }

  // Show first few updates for confirmation
  console.log('\n📝 Sample updates:');
  updates.slice(0, 5).forEach(update => {
    console.log(`${update.existing} → Category: ${update.updateData.category}`);
    if (update.updateData.sound_signature) {
      console.log(`  Sound signature: ${update.updateData.sound_signature}`);
    }
  });

  console.log('\n⚠️  Ready to update', updates.length, 'components.');
  console.log('🚀 Run with --execute flag to perform updates');

  // If --execute flag is passed, perform the updates
  if (process.argv.includes('--execute')) {
    console.log('\n🔄 Performing updates...');

    for (const update of updates) {
      const { error: updateError } = await supabase
        .from('components')
        .update(update.updateData)
        .eq('id', update.id);

      if (updateError) {
        console.log('❌ Error updating', update.existing, ':', updateError.message);
      } else {
        console.log('✅ Updated:', update.existing);
        updated++;
      }
    }

    console.log('\n🎉 Update complete!');
    console.log('Updated:', updated, 'components');
  }
}

// Usage: node scripts/merge-crinacle-cans.js path/to/file.csv|.ods [--execute]
const csvFile = process.argv[2];
if (!csvFile) {
  console.log('Usage: node scripts/merge-crinacle-cans.js <file-path> [--execute]');
  console.log('Supports: .csv and .ods files');
  console.log('Example: node scripts/merge-crinacle-cans.js crinacle-headphones.ods --execute');
  process.exit(1);
}

mergeCrinacleData(csvFile).catch(console.error);