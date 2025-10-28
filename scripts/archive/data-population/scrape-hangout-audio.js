const puppeteer = require('puppeteer-core');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

class HangoutAudioScraper {
  constructor() {
    this.baseUrl = 'https://list.hangout.audio';
    this.browser = null;
    this.page = null;
  }

  async initialize() {
    console.log('🚀 Initializing browser...');
    this.browser = await puppeteer.launch({
      headless: true,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    this.page = await this.browser.newPage();

    // Set user agent to avoid blocking
    await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');
  }

  async scrapeIEMList() {
    console.log('📊 Navigating to Hangout Audio IEM list...');

    try {
      await this.page.goto('https://list.hangout.audio/iem/?tableMode=true&sort=alpha', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      console.log('⏳ Waiting for table to load...');

      // Wait for the table to be populated
      await this.page.waitForSelector('table, .data-table, [class*="table"]', { timeout: 10000 });

      // Give extra time for dynamic content
      await new Promise(resolve => setTimeout(resolve, 3000));

      console.log('🔍 Extracting IEM data...');

      // Extract table data
      const iemData = await this.page.evaluate(() => {
        // Try multiple selectors for the table
        let table = document.querySelector('table');
        if (!table) {
          table = document.querySelector('.data-table');
        }
        if (!table) {
          table = document.querySelector('[class*="table"]');
        }

        if (!table) {
          console.log('No table found, trying div-based structure');
          // Look for card/row based structure
          const cards = Array.from(document.querySelectorAll('[class*="card"], [class*="row"], [class*="item"]'));
          console.log('Found cards:', cards.length);
          return { error: 'No table structure found', cardCount: cards.length };
        }

        const rows = Array.from(table.querySelectorAll('tr'));
        console.log('Found rows:', rows.length);

        if (rows.length === 0) return { error: 'No table rows found' };

        // Get headers
        const headerRow = rows[0];
        const headers = Array.from(headerRow.querySelectorAll('th, td')).map(cell =>
          cell.textContent.trim()
        );

        console.log('Headers:', headers);

        // Extract data rows
        const data = [];
        for (let i = 1; i < Math.min(rows.length, 100); i++) { // Limit to first 100 for testing
          const cells = Array.from(rows[i].querySelectorAll('td, th'));

          if (cells.length > 0) {
            const rowData = {};
            cells.forEach((cell, index) => {
              const header = headers[index] || `col_${index}`;
              rowData[header] = cell.textContent.trim();
            });

            // Only include rows with meaningful data
            if (Object.values(rowData).some(val => val && val.length > 1)) {
              data.push(rowData);
            }
          }
        }

        return {
          headers,
          data,
          totalRows: rows.length - 1
        };
      });

      return iemData;

    } catch (error) {
      console.error('❌ Error scraping page:', error.message);

      // Try to get any visible content for debugging
      const content = await this.page.evaluate(() => {
        return {
          title: document.title,
          bodyText: document.body.textContent.substring(0, 500),
          tableCount: document.querySelectorAll('table').length,
          divCount: document.querySelectorAll('div').length,
          hasReact: !!window.React
        };
      });

      return { error: error.message, debug: content };
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  // Convert scraped data to our database format
  convertToComponents(scrapedData) {
    if (!scrapedData.data || scrapedData.error) {
      console.log('❌ Cannot convert data:', scrapedData.error || 'No data');
      return [];
    }

    const components = [];

    for (const row of scrapedData.data) {
      try {
        // Try to map common column names
        const name = this.findColumnValue(row, ['name', 'model', 'iem', 'product']);
        const brand = this.findColumnValue(row, ['brand', 'company', 'manufacturer']);
        const price = this.findColumnValue(row, ['price', 'msrp', 'cost']);
        const rank = this.findColumnValue(row, ['rank', 'tier', 'grade', 'rating']);

        // Extract brand from name if no separate brand column
        let finalBrand = brand;
        let finalName = name;

        if (!brand && name) {
          const parts = name.split(' ');
          if (parts.length >= 2) {
            finalBrand = parts[0];
            finalName = parts.slice(1).join(' ');
          }
        }

        if (!finalName || !finalBrand) {
          console.log('⚠️  Skipping row - missing name or brand:', row);
          continue;
        }

        // Parse price
        const parsedPrice = this.parsePrice(price);

        const component = {
          name: finalName,
          brand: finalBrand,
          category: 'iems',
          price_new: parsedPrice,
          price_used_min: parsedPrice ? Math.round(parsedPrice * 0.6) : null,
          price_used_max: parsedPrice ? Math.round(parsedPrice * 0.8) : null,
          budget_tier: this.calculateBudgetTier(parsedPrice || 0),
          sound_signature: 'neutral', // Default for now
          needs_amp: false, // IEMs typically don't need amplification
          source: 'hangout_audio_scrape',
          created_at: new Date().toISOString()
        };

        // Add rank if available
        if (rank) {
          component.hangout_rank = rank;
          component.why_recommended = `Rated ${rank} on Hangout Audio IEM list. ${this.getDefaultRecommendation()}`;
        } else {
          component.why_recommended = `Listed on comprehensive Hangout Audio IEM database. ${this.getDefaultRecommendation()}`;
        }

        components.push(component);

      } catch (error) {
        console.log('⚠️  Error processing row:', error.message, row);
      }
    }

    return components;
  }

  // Helper functions
  findColumnValue(row, possibleKeys) {
    for (const key of possibleKeys) {
      for (const rowKey of Object.keys(row)) {
        if (rowKey.toLowerCase().includes(key.toLowerCase())) {
          return row[rowKey];
        }
      }
    }
    return null;
  }

  parsePrice(priceStr) {
    if (!priceStr) return null;
    const cleaned = priceStr.replace(/[^\d.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }

  calculateBudgetTier(price) {
    if (price <= 100) return 'budget';
    if (price <= 400) return 'entry';
    if (price <= 1000) return 'mid';
    return 'high';
  }

  getDefaultRecommendation() {
    return 'Quality IEM from curated audio enthusiast database.';
  }

  // Save to database with duplicate checking
  async saveToDatabase(components) {
    console.log(`💾 Checking ${components.length} components for duplicates...`);

    let addedCount = 0;
    let skippedCount = 0;
    const errors = [];

    for (const component of components) {
      try {
        // Check for existing entry
        const { data: existing, error: checkError } = await supabase
          .from('components')
          .select('id')
          .eq('brand', component.brand)
          .ilike('name', `%${component.name}%`)
          .limit(1);

        if (checkError) {
          throw new Error(`Duplicate check failed: ${checkError.message}`);
        }

        if (existing && existing.length > 0) {
          console.log(`⏭️  Skipping duplicate: ${component.brand} ${component.name}`);
          skippedCount++;
          continue;
        }

        // Insert new component
        const { data, error } = await supabase
          .from('components')
          .insert(component);

        if (error) {
          throw new Error(`Insert failed: ${error.message}`);
        }

        console.log(`✅ Added: ${component.brand} ${component.name}`);
        addedCount++;

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.log(`❌ Failed: ${component.brand} ${component.name} - ${error.message}`);
        errors.push({ component, error: error.message });
      }
    }

    return {
      total: components.length,
      added: addedCount,
      skipped: skippedCount,
      errors: errors.length,
      errorDetails: errors
    };
  }
}

// Main execution function
async function main() {
  const scraper = new HangoutAudioScraper();

  try {
    await scraper.initialize();

    console.log('🎯 Scraping Hangout Audio IEM list...\n');

    // Scrape the data
    const scrapedData = await scraper.scrapeIEMList();

    if (scrapedData.error) {
      console.log('❌ Scraping failed:', scrapedData.error);
      console.log('Debug info:', scrapedData.debug);
      return;
    }

    console.log(`✅ Successfully scraped ${scrapedData.data.length} IEMs`);
    console.log('📊 Headers found:', scrapedData.headers);
    console.log(`📋 Total rows in table: ${scrapedData.totalRows}`);

    // Convert to our format
    const components = scraper.convertToComponents(scrapedData);
    console.log(`🔄 Converted ${components.length} components to database format`);

    // Show preview of first few items
    console.log('\n📋 PREVIEW (First 5 items):');
    components.slice(0, 5).forEach((comp, i) => {
      console.log(`${i + 1}. ${comp.brand} ${comp.name} - $${comp.price_new || 'N/A'} - ${comp.budget_tier}`);
    });

    // Ask for confirmation
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    rl.question(`\n🤔 Add ${components.length} IEMs to database? (yes/no): `, async (answer) => {
      if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
        console.log('\n💾 Importing to database...');
        const results = await scraper.saveToDatabase(components);

        console.log('\n📊 IMPORT RESULTS:');
        console.log(`✅ Added: ${results.added}`);
        console.log(`⏭️  Skipped (duplicates): ${results.skipped}`);
        console.log(`❌ Errors: ${results.errors}`);

        if (results.errorDetails.length > 0) {
          console.log('\n❌ Error details:');
          results.errorDetails.slice(0, 5).forEach(({ component, error }) => {
            console.log(`   ${component.brand} ${component.name}: ${error}`);
          });
        }

        // Save raw data for review
        const timestamp = new Date().toISOString().split('T')[0];
        fs.writeFileSync(
          `hangout-audio-scrape-${timestamp}.json`,
          JSON.stringify({ scrapedData, components, results }, null, 2)
        );

        console.log(`\n📄 Raw data saved to hangout-audio-scrape-${timestamp}.json`);
        console.log('\n✅ Hangout Audio import complete!');
      } else {
        console.log('\n❌ Import cancelled.');
      }

      rl.close();
      await scraper.cleanup();
    });

  } catch (error) {
    console.error('❌ Fatal error:', error);
    await scraper.cleanup();
    process.exit(1);
  }
}

// Check dependencies
async function checkDependencies() {
  try {
    require('puppeteer-core');
    console.log('✅ Puppeteer Core found');
    return true;
  } catch (error) {
    console.log('❌ Puppeteer Core not found. Installing...');
    console.log('Run: npm install puppeteer-core');
    console.log('Then retry this script.');
    return false;
  }
}

// Run if called directly
if (require.main === module) {
  checkDependencies().then(ready => {
    if (ready) {
      main().catch(console.error);
    }
  });
}

module.exports = { HangoutAudioScraper };