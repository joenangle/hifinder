#!/usr/bin/env node

/**
 * Crinacle Squig Catalog & FR Sample Scraper
 *
 * Uses Playwright to extract data from graph.hangout.audio:
 * - Phase 1: Extract full IEM + headphone catalog from phone selector
 * - Phase 2: Extract FR data for a sample of top items
 *
 * Usage:
 *   node scripts/crinacle-squig-scraper.js                  # Catalog + DB match report
 *   node scripts/crinacle-squig-scraper.js --with-samples    # Also extract FR for top items
 */

require('dotenv').config({ path: '.env.local' });
const { chromium } = require('playwright');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const URLS = {
  iem: 'https://graph.hangout.audio/iem/5128/',
  headphones: 'https://graph.hangout.audio/headphones/',
};

const DATA_DIR = path.join(__dirname, '..', 'data');
const FR_DIR = path.join(DATA_DIR, 'crinacle-fr-samples');
const DELAY_MS = 2000;

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Extract the phone catalog from the graph tool's dropdown
 * DOM structure: #phones > div.phone-item > span (model name)
 *                #brands > div (brand names)
 */
async function extractCatalog(page, url, label) {
  console.log(`\n📋 Extracting ${label} catalog from ${url}...`);
  await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
  await sleep(3000); // Wait for JS to populate the dropdown

  const catalog = await page.evaluate(() => {
    // Extract brands
    const brandEls = document.querySelectorAll('#brands > div');
    const brands = Array.from(brandEls).map(el => el.textContent.trim()).filter(Boolean);

    // Extract phone items — these contain "Brand ModelName (variant)" format
    const phoneEls = document.querySelectorAll('#phones > div.phone-item');
    const phones = Array.from(phoneEls).map(el => {
      const span = el.querySelector('span');
      const fullName = span ? span.textContent.trim() : el.textContent.trim();
      return fullName;
    }).filter(Boolean);

    return { brands, phones };
  });

  console.log(`   Found ${catalog.brands.length} brands, ${catalog.phones.length} models`);
  return catalog;
}

/**
 * Parse a full phone name into brand + model
 * e.g. "Sennheiser IE600 S1" → { brand: "Sennheiser", model: "IE600", variant: "S1" }
 */
function parsePhoneName(fullName, knownBrands) {
  // Try matching against known brands (longest first to handle multi-word brands)
  const sorted = [...knownBrands].sort((a, b) => b.length - a.length);
  for (const brand of sorted) {
    if (fullName.startsWith(brand + ' ')) {
      const rest = fullName.slice(brand.length + 1).trim();
      // Split off variant suffixes like "S1", "(foam tips)", etc.
      const variantMatch = rest.match(/^(.+?)\s+(S\d+|R\d+|\(.+\))$/);
      if (variantMatch) {
        return { brand, model: variantMatch[1], variant: variantMatch[2], full: fullName };
      }
      return { brand, model: rest, variant: null, full: fullName };
    }
  }

  // Fallback: first word is brand
  const parts = fullName.split(' ');
  return { brand: parts[0], model: parts.slice(1).join(' '), variant: null, full: fullName };
}

/**
 * Fuzzy match: normalize strings for comparison
 */
function normalize(s) {
  return s.toLowerCase()
    .replace(/[-_()]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function fuzzyMatch(a, b) {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.9;

  // Check if key parts match (remove common suffixes)
  const stripSuffix = s => s.replace(/\s+(s\d+|r\d+|mk\s*\d+|v\d+|gen\s*\d+|rev\s*\w+)$/i, '');
  const sa = stripSuffix(na);
  const sb = stripSuffix(nb);
  if (sa === sb) return 0.85;
  if (sa.includes(sb) || sb.includes(sa)) return 0.8;

  return 0;
}

/**
 * Match catalog entries against our database
 */
async function matchWithDB(parsedCatalog, category) {
  const categoryFilter = category === 'iem' ? 'iems' : 'headphones';

  const { data: components, error } = await supabase
    .from('components')
    .select('id, brand, name, category, crin_tone, crin_tech, crin_rank, expert_grade_numeric')
    .in('category', category === 'iem' ? ['iems'] : ['cans']);

  if (error) {
    console.error('DB error:', error.message);
    return [];
  }

  console.log(`   Matching against ${components.length} ${categoryFilter} in database...`);

  const matches = [];
  const unmatched = [];

  for (const entry of parsedCatalog) {
    let bestMatch = null;
    let bestScore = 0;

    for (const comp of components) {
      // Try matching brand + model
      const brandScore = fuzzyMatch(entry.brand, comp.brand);
      if (brandScore < 0.8) continue;

      const modelScore = fuzzyMatch(entry.model, comp.name);
      const score = (brandScore + modelScore) / 2;

      if (score > bestScore && score >= 0.8) {
        bestScore = score;
        bestMatch = comp;
      }
    }

    if (bestMatch) {
      matches.push({
        catalog: entry.full,
        db_id: bestMatch.id,
        db_name: `${bestMatch.brand} ${bestMatch.name}`,
        score: bestScore,
        has_grades: !!(bestMatch.crin_tone || bestMatch.crin_tech),
        expert_grade: bestMatch.expert_grade_numeric
      });
    } else {
      unmatched.push(entry);
    }
  }

  return { matches, unmatched, total_db: components.length };
}

/**
 * Dismiss any welcome overlay / splash screen
 */
async function dismissOverlay(page) {
  try {
    // Close welcome shade if present
    const shade = await page.$('section.welcome-shade[data-state="open"]');
    if (shade) {
      // Try clicking a close button or the shade itself
      const closeBtn = await page.$('.welcome-shade button, .welcome-shade .close, .welcome-shade [data-dismiss]');
      if (closeBtn) {
        await closeBtn.click();
      } else {
        // Click anywhere outside or use keyboard
        await page.keyboard.press('Escape');
      }
      await sleep(500);
    }
    // Also try removing it via JS as a fallback
    await page.evaluate(() => {
      const shade = document.querySelector('.welcome-shade');
      if (shade) shade.remove();
    });
  } catch (e) {
    // Ignore overlay dismissal errors
  }
}

/**
 * Extract FR data for a specific phone by clicking it in the selector
 */
async function extractFRSample(page, phoneName) {
  console.log(`   🎵 Extracting FR: ${phoneName}`);

  await dismissOverlay(page);

  // Click the phone item to load its graph
  const phoneItem = await page.$(`#phones .phone-item span:text-is("${phoneName}")`);
  if (!phoneItem) {
    // Try partial match
    const partial = await page.$(`#phones .phone-item span:has-text("${phoneName.split(' ').slice(0, 2).join(' ')}")`);
    if (!partial) {
      console.log(`      ❌ Could not find "${phoneName}" in selector`);
      return null;
    }
    await partial.click({ timeout: 5000 });
  } else {
    await phoneItem.click({ timeout: 5000 });
  }

  await sleep(2000); // Wait for graph to render

  // Try to extract the FR data from JS variables or the rendered graph
  const frData = await page.evaluate(() => {
    // CrinGraph stores phone data in various ways
    // Try common variable names
    const result = {};

    // Check for activePhones global (standard CrinGraph)
    if (typeof activePhones !== 'undefined' && activePhones.length > 0) {
      const phone = activePhones[activePhones.length - 1];
      result.source = 'activePhones';
      result.name = phone.name || phone.fileName || 'unknown';
      if (phone.rawChannels) {
        result.channels = {};
        for (const [ch, data] of Object.entries(phone.rawChannels)) {
          result.channels[ch] = {
            length: data.length,
            sample: data.slice(0, 5),
            full: data // Full FR data: [[freq, spl], ...]
          };
        }
      }
      if (phone.avgL) result.avgL = phone.avgL;
      if (phone.avgR) result.avgR = phone.avgR;
    }

    // Check for allPhones
    if (typeof allPhones !== 'undefined') {
      result.allPhonesCount = allPhones.length;
    }

    // Check for the graph's data arrays
    const canvases = document.querySelectorAll('canvas');
    result.canvasCount = canvases.length;

    // Look for SVG-based graphs
    const svgPaths = document.querySelectorAll('svg path');
    result.svgPathCount = svgPaths.length;

    // Check for Plotly (another common graph lib)
    if (typeof Plotly !== 'undefined') {
      result.plotly = true;
      const graphDivs = document.querySelectorAll('.js-plotly-plot');
      if (graphDivs.length > 0) {
        const plotData = graphDivs[0].data;
        if (plotData && plotData.length > 0) {
          result.plotlyTraces = plotData.length;
          result.plotlySample = {
            x: plotData[0].x?.slice(0, 5),
            y: plotData[0].y?.slice(0, 5)
          };
        }
      }
    }

    return result;
  });

  return frData;
}

async function main() {
  const args = process.argv.slice(2);
  const withSamples = args.includes('--with-samples');

  console.log('🔍 Crinacle Squig Catalog Scraper');
  console.log('==================================');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });
  const page = await context.newPage();

  try {
    // ── Phase 1: Catalog extraction ──
    const iemRaw = await extractCatalog(page, URLS.iem, 'IEM');
    await sleep(DELAY_MS);
    const hpRaw = await extractCatalog(page, URLS.headphones, 'Headphones');

    // Parse into structured entries
    const iemParsed = iemRaw.phones.map(p => parsePhoneName(p, iemRaw.brands));
    const hpParsed = hpRaw.phones.map(p => parsePhoneName(p, hpRaw.brands));

    // De-duplicate by base model (ignore variants)
    const dedup = (entries) => {
      const seen = new Map();
      for (const e of entries) {
        const key = `${e.brand}|${e.model}`;
        if (!seen.has(key)) {
          seen.set(key, { ...e, variants: [e.variant].filter(Boolean) });
        } else {
          if (e.variant) seen.get(key).variants.push(e.variant);
        }
      }
      return Array.from(seen.values());
    };

    const iemDeduped = dedup(iemParsed);
    const hpDeduped = dedup(hpParsed);

    // Save catalogs
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

    const saveCatalog = (name, data) => {
      const filePath = path.join(DATA_DIR, name);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`\n✅ Saved ${filePath} (${data.length} unique models)`);
    };

    saveCatalog('crinacle-catalog-iem.json', iemDeduped);
    saveCatalog('crinacle-catalog-headphones.json', hpDeduped);

    // ── DB Matching ──
    console.log('\n📊 Matching against HiFinder database...');
    const iemMatches = await matchWithDB(iemDeduped, 'iem');
    const hpMatches = await matchWithDB(hpDeduped, 'headphones');

    console.log(`\n── IEM Results ──`);
    console.log(`   Crinacle catalog: ${iemDeduped.length} unique models (${iemRaw.phones.length} total with variants)`);
    console.log(`   DB matches: ${iemMatches.matches.length} / ${iemMatches.total_db} in our DB`);
    console.log(`   With existing grades: ${iemMatches.matches.filter(m => m.has_grades).length}`);
    console.log(`   New in catalog (not in DB): ${iemMatches.unmatched.length}`);

    console.log(`\n── Headphone Results ──`);
    console.log(`   Crinacle catalog: ${hpDeduped.length} unique models (${hpRaw.phones.length} total with variants)`);
    console.log(`   DB matches: ${hpMatches.matches.length} / ${hpMatches.total_db} in our DB`);
    console.log(`   With existing grades: ${hpMatches.matches.filter(m => m.has_grades).length}`);
    console.log(`   New in catalog (not in DB): ${hpMatches.unmatched.length}`);

    // Show top unmatched entries (potential additions to our DB)
    const showUnmatched = (label, entries) => {
      if (entries.length === 0) return;
      console.log(`\n   Top unmatched ${label} (first 15):`);
      entries.slice(0, 15).forEach(e => {
        console.log(`     ${e.brand} ${e.model}`);
      });
      if (entries.length > 15) console.log(`     ... and ${entries.length - 15} more`);
    };

    showUnmatched('IEMs', iemMatches.unmatched);
    showUnmatched('headphones', hpMatches.unmatched);

    // Save match reports
    const matchReport = {
      scraped_at: new Date().toISOString(),
      iem: {
        catalog_total: iemRaw.phones.length,
        unique_models: iemDeduped.length,
        db_matches: iemMatches.matches.length,
        db_total: iemMatches.total_db,
        matches: iemMatches.matches,
        unmatched_count: iemMatches.unmatched.length,
        unmatched_sample: iemMatches.unmatched.slice(0, 30)
      },
      headphones: {
        catalog_total: hpRaw.phones.length,
        unique_models: hpDeduped.length,
        db_matches: hpMatches.matches.length,
        db_total: hpMatches.total_db,
        matches: hpMatches.matches,
        unmatched_count: hpMatches.unmatched.length,
        unmatched_sample: hpMatches.unmatched.slice(0, 30)
      }
    };
    fs.writeFileSync(
      path.join(DATA_DIR, 'crinacle-match-report.json'),
      JSON.stringify(matchReport, null, 2)
    );
    console.log(`\n✅ Match report saved to data/crinacle-match-report.json`);

    // ── Phase 2: FR sample extraction ──
    if (withSamples) {
      console.log('\n🎵 Phase 2: FR Sample Extraction');
      console.log('================================');

      if (!fs.existsSync(FR_DIR)) fs.mkdirSync(FR_DIR, { recursive: true });

      // Extract FR for ALL matched items
      const allIEMs = iemMatches.matches;
      const allHPs = hpMatches.matches;

      console.log(`\n   IEMs to extract: ${allIEMs.length}`);
      console.log(`   Headphones to extract: ${allHPs.length}`);
      console.log(`   Estimated time: ~${Math.ceil((allIEMs.length + allHPs.length) * (DELAY_MS + 2000) / 60000)} minutes`);

      // Navigate to IEM tool and extract samples
      await page.goto(URLS.iem, { waitUntil: 'networkidle', timeout: 30000 });
      await sleep(3000);
      await dismissOverlay(page);

      let iemSuccess = 0, iemFail = 0;
      for (const item of allIEMs) {
        const filename = item.catalog.replace(/[^a-zA-Z0-9]/g, '_') + '.json';
        const filePath = path.join(FR_DIR, filename);
        // Skip if already extracted
        if (fs.existsSync(filePath)) {
          iemSuccess++;
          continue;
        }
        const fr = await extractFRSample(page, item.catalog);
        if (fr && fr.source === 'activePhones') {
          fs.writeFileSync(filePath, JSON.stringify({ name: item.catalog, db_id: item.db_id, db_match: item.db_name, ...fr }, null, 2));
          iemSuccess++;
        } else {
          iemFail++;
          console.log(`      ⚠️  No FR data for ${item.catalog}`);
        }
        await sleep(DELAY_MS);
      }
      console.log(`\n   IEM extraction: ${iemSuccess} success, ${iemFail} failed`);

      // Navigate to headphone tool and extract samples
      await page.goto(URLS.headphones, { waitUntil: 'networkidle', timeout: 30000 });
      await sleep(3000);
      await dismissOverlay(page);

      let hpSuccess = 0, hpFail = 0;
      for (const item of allHPs) {
        const filename = item.catalog.replace(/[^a-zA-Z0-9]/g, '_') + '.json';
        const filePath = path.join(FR_DIR, filename);
        if (fs.existsSync(filePath)) {
          hpSuccess++;
          continue;
        }
        const fr = await extractFRSample(page, item.catalog);
        if (fr && fr.source === 'activePhones') {
          fs.writeFileSync(filePath, JSON.stringify({ name: item.catalog, db_id: item.db_id, db_match: item.db_name, ...fr }, null, 2));
          hpSuccess++;
        } else {
          hpFail++;
          console.log(`      ⚠️  No FR data for ${item.catalog}`);
        }
        await sleep(DELAY_MS);
      }
      console.log(`\n   Headphone extraction: ${hpSuccess} success, ${hpFail} failed`);
      console.log(`\n✅ Total: ${iemSuccess + hpSuccess} FR files in ${FR_DIR}`);
    }

  } catch (err) {
    console.error('❌ Error:', err.message);
    console.error(err.stack);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
