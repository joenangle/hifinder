const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Simple input format parser
class CrinacleImporter {
  constructor() {
    this.brandPatterns = {
      'Moondrop': ['Blessing', 'Aria', 'Starfield', 'KXXS', 'Kato', 'Chu', 'SSR', 'SSP'],
      'Truthear': ['Zero', 'Hexa'],
      '7Hz': ['Timeless', 'Salnotes', 'Legato'],
      'Thieaudio': ['Monarch', 'Oracle', 'Prestige', 'Legacy'],
      'Symphonium': ['Helios', 'Crimson', 'Triton', 'Meteor'],
      '64 Audio': ['U12t', 'U18t', 'Nio', 'A12t'],
      'Empire Ears': ['Odin', 'Hero', 'Valkyrie', 'Raven'],
      'Campfire': ['Andromeda', 'Solaris', 'Ara', 'Vega'],
      'Sony': ['IER-M9', 'IER-M7', 'IER-Z1R'],
      'Shure': ['SE846', 'SE535', 'SE425'],
      'Etymotic': ['ER2XR', 'ER4XR', 'ER3XR'],
      'FiiO': ['FH7', 'FH5', 'FD5'],
      'KZ': ['ZS10', 'AS16', 'ZSN'],
      'BLON': ['BL-03', 'BL-05'],
      'Final': ['E3000', 'E4000', 'E5000'],
      'Focal': ['Aria', 'Stellia', 'Utopia'],
      'Sennheiser': ['IE600', 'IE900', 'IE300'],
      'Audio-Technica': ['ATH-E70'],
      'Westone': ['W80', 'UM Pro'],
      'Ultimate Ears': ['UE18+', 'UE11'],
      'qdc': ['Anole VX', 'Neptune'],
      'Vision Ears': ['EXT', 'VE8'],
      'Custom Art': ['FIBAE', 'MASSDROP'],
      'DUNU': ['SA6', 'EST112'],
      'FatFreq': ['Maestro', 'Grand Maestro'],
      'LETSHUOER': ['EJ07', 'S12', 'Cadenza'],
      'Softears': ['RSV', 'Volume', 'Turii'],
      'Subtonic': ['Storm'],
      'TRI': ['I3'],
      'YANYIN': ['Canon', 'Mahina']
    };
  }

  // Parse CSV input format
  parseCSVInput(csvText) {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/"/g, ''));
    const results = [];

    console.log('🔍 Detected CSV headers:', headers);

    // Try to map common column names to our expected fields
    const columnMap = this.detectCSVColumns(headers);
    console.log('📋 Column mapping:', columnMap);

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseCSVLine(lines[i]);

      if (values.length < 2) continue; // Skip empty lines

      try {
        const component = this.mapCSVRowToComponent(values, columnMap, headers);
        if (component && component.name && component.brand) {
          results.push(component);
        }
      } catch (error) {
        console.log(`⚠️  Skipping row ${i + 1}: ${error.message}`);
      }
    }

    return results;
  }

  // Detect CSV column structure
  detectCSVColumns(headers) {
    const map = {};

    headers.forEach((header, index) => {
      const h = header.toLowerCase();

      // Rank/Tier column
      if (h.includes('rank') || h.includes('tier') || h.includes('grade')) {
        map.rank = index;
      }
      // Name/Model column
      else if (h.includes('name') || h.includes('model') || h.includes('iem') || h.includes('headphone')) {
        map.name = index;
      }
      // Brand column
      else if (h.includes('brand') || h.includes('company') || h.includes('manufacturer')) {
        map.brand = index;
      }
      // Price column
      else if (h.includes('price') || h.includes('msrp') || h.includes('cost') || h.includes('$')) {
        map.price = index;
      }
      // Notes/Description
      else if (h.includes('note') || h.includes('desc') || h.includes('comment') || h.includes('review')) {
        map.notes = index;
      }
      // Tone grade
      else if (h.includes('tone') || h.includes('tuning')) {
        map.toneGrade = index;
      }
      // Technical grade
      else if (h.includes('tech') || h.includes('resolution') || h.includes('detail')) {
        map.techGrade = index;
      }
      // Value rating
      else if (h.includes('value') || h.includes('star')) {
        map.valueRating = index;
      }
    });

    return map;
  }

  // Parse CSV line handling quotes and commas
  parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim()); // Add the last field
    return result;
  }

  // Map CSV row to component object
  mapCSVRowToComponent(values, columnMap, headers) {
    // Extract basic info
    const name = this.extractValue(values, columnMap.name, '');
    const brand = this.extractValue(values, columnMap.brand, '');
    const priceStr = this.extractValue(values, columnMap.price, '0');
    const rank = this.extractValue(values, columnMap.rank, 'A');
    const notes = this.extractValue(values, columnMap.notes, '');

    // If no brand column, try to extract from name
    let finalBrand = brand;
    let finalName = name;

    if (!brand && name) {
      const extracted = this.extractBrandModel(name);
      finalBrand = extracted.brand;
      finalName = extracted.model;
    }

    if (!finalName || !finalBrand) {
      throw new Error(`Missing name or brand: "${name}" -> "${finalBrand}" "${finalName}"`);
    }

    // Parse price
    const price = this.parsePrice(priceStr);

    // Build component object
    return {
      name: finalName,
      brand: finalBrand,
      category: this.determineCategory(finalName, notes),
      price_new: price,
      price_used_min: price ? Math.round(price * 0.6) : null,
      price_used_max: price ? Math.round(price * 0.8) : null,
      crinacle_rank: this.normalizeRank(rank),
      budget_tier: this.calculateBudgetTier(price || 0),
      sound_signature: this.inferSoundSignature(notes),
      why_recommended: this.generateRecommendation(this.normalizeRank(rank), notes),
      needs_amp: this.determineAmplificationNeed(finalName, notes),
      source: 'crinacle_csv_import',
      created_at: new Date().toISOString(),

      // Additional Crinacle-specific data
      tone_grade: this.extractValue(values, columnMap.toneGrade, null),
      technical_grade: this.extractValue(values, columnMap.techGrade, null),
      value_rating: this.extractValue(values, columnMap.valueRating, null)
    };
  }

  // Extract value from CSV row safely
  extractValue(values, columnIndex, defaultValue) {
    if (columnIndex === undefined || columnIndex >= values.length) {
      return defaultValue;
    }
    const value = values[columnIndex]?.replace(/"/g, '').trim();
    return value || defaultValue;
  }

  // Normalize rank variations
  normalizeRank(rankStr) {
    if (!rankStr) return 'A';

    const rank = rankStr.toString().toUpperCase().trim();

    // Handle Crinacle's rank format
    if (rank.includes('S')) return 'S';
    if (rank.includes('A+')) return 'A+';
    if (rank.includes('A-')) return 'A-';
    if (rank.includes('A')) return 'A';
    if (rank.includes('B+')) return 'B+';
    if (rank.includes('B-')) return 'B-';
    if (rank.includes('B')) return 'B';
    if (rank.includes('C')) return 'C';
    if (rank.includes('D')) return 'D';

    return 'A'; // Default
  }

  // Parse simple input format
  parseSimpleInput(inputText) {
    const lines = inputText.trim().split('\n').filter(line => line.trim());
    const results = [];
    let currentRank = null;

    for (const line of lines) {
      // Check if it's a tier header (S-Tier:, A+-Tier:, etc.)
      const tierMatch = line.match(/^([SABCDEF][+-]?)-?Tier:?\s*$/i);
      if (tierMatch) {
        currentRank = tierMatch[1].toUpperCase();
        continue;
      }

      // Parse component line: "Brand Model - $Price - Description"
      const componentMatch = line.match(/^(.+?)\s*-\s*\$(\d+)\s*-\s*(.+)$/);
      if (componentMatch) {
        const [, fullName, priceStr, description] = componentMatch;
        const price = parseInt(priceStr);
        const { brand, model } = this.extractBrandModel(fullName.trim());

        if (brand && model) {
          results.push({
            name: model,
            brand: brand,
            category: this.determineCategory(fullName, description),
            price_new: price,
            price_used_min: Math.round(price * 0.6),
            price_used_max: Math.round(price * 0.8),
            crinacle_rank: currentRank || 'A',
            budget_tier: this.calculateBudgetTier(price),
            sound_signature: this.inferSoundSignature(description),
            why_recommended: this.generateRecommendation(currentRank || 'A', description),
            needs_amp: this.determineAmplificationNeed(fullName, description),
            source: 'crinacle_import',
            created_at: new Date().toISOString()
          });
        }
      }
    }

    return results;
  }

  // Smart brand/model extraction
  extractBrandModel(fullName) {
    // Try pattern matching first
    for (const [brand, patterns] of Object.entries(this.brandPatterns)) {
      for (const pattern of patterns) {
        if (fullName.includes(pattern)) {
          return {
            brand: brand,
            model: fullName.replace(brand, '').trim() || pattern
          };
        }
      }
    }

    // Fallback: first word is brand
    const parts = fullName.split(' ');
    if (parts.length >= 2) {
      return {
        brand: parts[0],
        model: parts.slice(1).join(' ')
      };
    }

    return {
      brand: parts[0] || 'Unknown',
      model: fullName
    };
  }

  // Determine if headphones or IEMs
  determineCategory(fullName, description) {
    const iemKeywords = ['iem', 'in-ear', 'earphone', 'monitor', 'canal'];
    const headphoneKeywords = ['headphone', 'over-ear', 'on-ear', 'open-back', 'closed-back'];

    const text = (fullName + ' ' + description).toLowerCase();

    // Check for IEM indicators first (more specific)
    if (iemKeywords.some(keyword => text.includes(keyword))) {
      return 'iems';
    }

    // Check for headphone indicators
    if (headphoneKeywords.some(keyword => text.includes(keyword))) {
      return 'cans';
    }

    // Default for Crinacle data (mostly IEMs)
    return 'iems';
  }

  // Calculate budget tier (matching slider tiers exactly)
  calculateBudgetTier(price) {
    if (price <= 100) return 'Budget';
    if (price <= 400) return 'Entry Level';
    if (price <= 1000) return 'Mid Range';
    if (price <= 3000) return 'High End';
    return 'Summit-Fi';
  }

  // Parse price from string
  parsePrice(priceStr) {
    if (!priceStr) return null;

    // Remove quotes, currency symbols, and clean the string
    let cleaned = priceStr.toString().replace(/[^\d.,]/g, '');

    // Handle comma-separated thousands (e.g., "1,500")
    cleaned = cleaned.replace(/,/g, '');

    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  // Infer sound signature from description
  inferSoundSignature(description) {
    const desc = description.toLowerCase();

    if (desc.includes('warm') || desc.includes('bass-heavy') || desc.includes('rich')) {
      return 'warm';
    }
    if (desc.includes('bright') || desc.includes('detailed') || desc.includes('analytical')) {
      return 'bright';
    }
    if (desc.includes('v-shaped') || desc.includes('fun') || desc.includes('exciting')) {
      return 'fun';
    }
    if (desc.includes('neutral') || desc.includes('balanced') || desc.includes('reference')) {
      return 'neutral';
    }

    // Default for Crinacle picks (he likes neutral tuning)
    return 'neutral';
  }

  // Generate recommendation text
  generateRecommendation(rank, description) {
    const prefix = `Crinacle ${rank}-tier ranking. `;

    // Clean up and enhance description
    let recommendation = description;
    if (!recommendation.endsWith('.')) {
      recommendation += '.';
    }

    // Add context based on rank
    const rankContext = {
      'S': 'Exceptional performance, among the best available.',
      'A+': 'Outstanding performance with minor trade-offs.',
      'A': 'Excellent all-around performance.',
      'A-': 'Very good performance, solid recommendation.',
      'B+': 'Good performance, recommended for the price.',
      'B': 'Decent performance, consider alternatives.'
    };

    const context = rankContext[rank] || 'Solid performer in its category.';
    return prefix + recommendation + ' ' + context;
  }

  // Determine if amplification is needed
  determineAmplificationNeed(fullName, description) {
    // IEMs typically don't need amplification
    if (this.determineCategory(fullName, description) === 'iems') {
      return false;
    }

    // Check for high impedance indicators in description
    const desc = description.toLowerCase();
    return desc.includes('high impedance') || desc.includes('needs amp') || desc.includes('amplification');
  }

  // Detect if input is CSV format
  detectCSVFormat(inputText) {
    const firstLine = inputText.trim().split('\n')[0];

    // Look for CSV indicators
    const csvIndicators = [
      firstLine.includes(','),                    // Has commas
      firstLine.toLowerCase().includes('rank'),   // Common CSV header
      firstLine.toLowerCase().includes('name'),   // Common CSV header
      firstLine.toLowerCase().includes('price'),  // Common CSV header
      !firstLine.includes('-Tier:'),             // Not simple format tier header
      firstLine.split(',').length > 2            // Multiple comma-separated values
    ];

    // CSV if majority of indicators are true
    const csvScore = csvIndicators.filter(Boolean).length;
    return csvScore >= 3;
  }

  // Check for existing duplicates
  async checkForDuplicates(components) {
    const duplicateChecks = [];

    for (const component of components) {
      const { data, error } = await supabase
        .from('components')
        .select('id, name, brand')
        .eq('brand', component.brand)
        .ilike('name', `%${component.name}%`);

      if (error) {
        console.error(`Error checking duplicates for ${component.brand} ${component.name}:`, error);
        continue;
      }

      if (data && data.length > 0) {
        duplicateChecks.push({
          new: component,
          existing: data[0],
          isDuplicate: true
        });
      } else {
        duplicateChecks.push({
          new: component,
          existing: null,
          isDuplicate: false
        });
      }
    }

    return duplicateChecks;
  }

  // Preview what will be imported
  async previewImport(inputText) {
    console.log('🔍 PARSING INPUT DATA...\n');

    // Auto-detect CSV vs simple text format
    const isCSV = this.detectCSVFormat(inputText);
    console.log(`📊 Format detected: ${isCSV ? 'CSV' : 'Simple Text'}\n`);

    const parsedComponents = isCSV
      ? this.parseCSVInput(inputText)
      : this.parseSimpleInput(inputText);

    if (parsedComponents.length === 0) {
      console.log('❌ No components found in input. Please check the format.\n');
      console.log('Expected format:');
      console.log('S-Tier:');
      console.log('Brand Model - $Price - Description');
      console.log('');
      return null;
    }

    console.log(`📊 Parsed ${parsedComponents.length} components\n`);

    console.log('🔍 CHECKING FOR DUPLICATES...\n');
    const duplicateChecks = await this.checkForDuplicates(parsedComponents);

    const newComponents = duplicateChecks.filter(check => !check.isDuplicate);
    const duplicates = duplicateChecks.filter(check => check.isDuplicate);

    console.log('📋 IMPORT PREVIEW');
    console.log('═══════════════════════════════════════\n');

    if (newComponents.length > 0) {
      console.log(`✅ NEW COMPONENTS TO ADD (${newComponents.length}):`);
      console.log('─────────────────────────────────────────');
      newComponents.forEach((check, index) => {
        const comp = check.new;
        console.log(`${index + 1}. ${comp.brand} ${comp.name}`);
        console.log(`   Category: ${comp.category} | Price: $${comp.price_new} | Rank: ${comp.crinacle_rank} | Tier: ${comp.budget_tier}`);
        console.log(`   Sound: ${comp.sound_signature} | Needs Amp: ${comp.needs_amp}`);
        console.log(`   Why: ${comp.why_recommended.substring(0, 100)}...`);
        console.log('');
      });
    }

    if (duplicates.length > 0) {
      console.log(`⚠️  DUPLICATES FOUND (${duplicates.length}) - WILL BE SKIPPED:`);
      console.log('─────────────────────────────────────────────────────');
      duplicates.forEach((check, index) => {
        console.log(`${index + 1}. ${check.new.brand} ${check.new.name} (exists as ID: ${check.existing.id})`);
      });
      console.log('');
    }

    console.log('📊 SUMMARY');
    console.log('─────────────');
    console.log(`Total parsed: ${parsedComponents.length}`);
    console.log(`Will add: ${newComponents.length}`);
    console.log(`Will skip (duplicates): ${duplicates.length}`);

    return {
      newComponents: newComponents.map(check => check.new),
      duplicates: duplicates,
      totalParsed: parsedComponents.length
    };
  }

  // Execute the import
  async executeImport(components) {
    console.log('\n⚡ EXECUTING IMPORT...\n');

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (const component of components) {
      try {
        const { data, error } = await supabase
          .from('components')
          .insert(component);

        if (error) {
          throw error;
        }

        console.log(`✅ Added: ${component.brand} ${component.name}`);
        successCount++;

        // Small delay to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.log(`❌ Failed: ${component.brand} ${component.name} - ${error.message}`);
        errors.push({ component, error: error.message });
        errorCount++;
      }
    }

    console.log('\n📊 IMPORT RESULTS');
    console.log('═══════════════════');
    console.log(`✅ Successfully added: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);

    if (errors.length > 0) {
      console.log('\n❌ ERRORS:');
      errors.forEach(({ component, error }) => {
        console.log(`   ${component.brand} ${component.name}: ${error}`);
      });
    }

    // Save import log
    const importLog = {
      timestamp: new Date().toISOString(),
      successCount,
      errorCount,
      components: components.map(c => `${c.brand} ${c.name}`),
      errors
    };

    const fs = require('fs');
    fs.writeFileSync(
      `crinacle-import-log-${new Date().toISOString().split('T')[0]}.json`,
      JSON.stringify(importLog, null, 2)
    );

    console.log(`\n📄 Import log saved to crinacle-import-log-${new Date().toISOString().split('T')[0]}.json`);

    return { successCount, errorCount, errors };
  }
}

// Example usage and helper functions
function showExampleFormat() {
  console.log('📝 EXPECTED INPUT FORMAT');
  console.log('═══════════════════════════════════════\n');
  console.log('Copy-paste Crinacle data in this format:\n');
  console.log('S-Tier:');
  console.log('Moondrop Blessing 2 - $320 - Neutral IEM with exceptional tuning');
  console.log('Symphonium Helios - $650 - Premium neutral-bright IEM');
  console.log('');
  console.log('A+-Tier:');
  console.log('Moondrop Aria - $80 - Best entry-level neutral IEM');
  console.log('Truthear Zero - $50 - Budget king, excellent tuning');
  console.log('7Hz Timeless - $220 - Planar magnetic IEM, great technicalities');
  console.log('');
  console.log('A-Tier:');
  console.log('Thieaudio Oracle - $500 - Well-balanced tribrid IEM');
  console.log('...');
  console.log('');
  console.log('💡 Tips:');
  console.log('- Include tier headers (S-Tier:, A+-Tier:, etc.)');
  console.log('- Format: Brand Model - $Price - Description');
  console.log('- Descriptions help determine sound signature');
  console.log('- The script will auto-detect IEMs vs headphones');
  console.log('');
}

// Main execution function
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    showExampleFormat();
    return;
  }

  if (args.includes('--example')) {
    showExampleFormat();
    return;
  }

  // Check for input file
  const inputFile = args.find(arg => arg.endsWith('.txt') || arg.endsWith('.csv'));
  let inputText = '';

  if (inputFile) {
    const fs = require('fs');
    try {
      inputText = fs.readFileSync(inputFile, 'utf8');
    } catch (error) {
      console.error(`❌ Could not read file ${inputFile}:`, error.message);
      return;
    }
  } else {
    console.log('❌ No input provided. Please provide a text file with Crinacle data.');
    console.log('');
    console.log('Usage:');
    console.log('  node scripts/import-crinacle-data.js crinacle-data.txt');
    console.log('  node scripts/import-crinacle-data.js --example  # Show format');
    console.log('');
    return;
  }

  const importer = new CrinacleImporter();

  // Preview the import
  const preview = await importer.previewImport(inputText);

  if (!preview || preview.newComponents.length === 0) {
    console.log('\n❌ No new components to import. Exiting.');
    return;
  }

  // Ask for confirmation
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(`\n🤔 Import ${preview.newComponents.length} new components? (yes/no): `, async (answer) => {
    if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
      await importer.executeImport(preview.newComponents);
      console.log('\n✅ Crinacle import complete!');
    } else {
      console.log('\n❌ Import cancelled.');
    }
    rl.close();
  });
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { CrinacleImporter };