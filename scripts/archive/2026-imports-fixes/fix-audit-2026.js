/**
 * fix-audit-2026.js — Comprehensive data accuracy fixes
 *
 * Based on web-verified audit of all community_research_2026 entries.
 * Every correction below was verified against manufacturer specs,
 * ASR reviews, and retailer pricing.
 *
 * Usage:
 *   node scripts/fix-audit-2026.js            # Dry run (preview)
 *   node scripts/fix-audit-2026.js --execute   # Apply changes
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const EXECUTE = process.argv.includes('--execute');

function budgetTier(price) {
  if (price <= 100) return 'Budget';
  if (price <= 300) return 'Entry Level';
  if (price <= 700) return 'Mid Range';
  if (price <= 1500) return 'High End';
  return 'Summit-Fi';
}

// ============================================================
// ALL FIXES — organized by category
// Each entry: { brand, name, cat, fixes: {...}, note: '...' }
//
// When price_new changes, used prices & budget_tier are
// auto-recalculated by the execution function.
// ============================================================

const ALL_FIXES = [

  // ======================== CANS ========================

  { brand: 'ZMF', name: 'Caldera', cat: 'cans', fixes: {
    impedance: 60,
  }, note: 'CRITICAL: Impedance is 60Ω per ZMF specs, not 300Ω' },

  { brand: 'Hifiman', name: 'Arya Organic', cat: 'cans', fixes: {
    price_new: 1299,
  }, note: 'MSRP $1,299 at Hifiman store and all authorized retailers' },

  { brand: 'Sennheiser', name: 'HD 660S2', cat: 'cans', fixes: {
    price_new: 599,
  }, note: 'MSRP $599 (street ~$500 on sale)' },

  { brand: 'Austrian Audio', name: 'Hi-X55', cat: 'cans', fixes: {
    price_new: 330,
  }, note: '$329.99 at Sweetwater, B&H, Amazon' },

  { brand: 'Dan Clark Audio', name: 'Stealth', cat: 'cans', fixes: {
    price_new: 4499,
  }, note: 'Current DCA website shows $4,499.99 (was $3,999 at launch)' },

  // ======================== IEMS ========================

  { brand: 'Truthear', name: 'Zero RED', cat: 'iems', fixes: {
    driver_type: '2DD',
  }, note: 'Uses dual dynamic drivers (10mm + 7.8mm), NOT 1BA+1DD' },

  { brand: 'Letshuoer', name: 'S12 Pro', cat: 'iems', fixes: {
    sound_signature: 'fun',
  }, note: 'V-shaped tuning (emphasized bass + treble). Community consensus: fun/V-shaped' },

  { brand: 'Simgot', name: 'EA1000 Fermat', cat: 'iems', fixes: {
    sound_signature: 'warm',
  }, note: 'Reviewers describe as warm/wide/airy. "Neutral" is inaccurate' },

  { brand: 'Campfire Audio', name: 'Mammoth', cat: 'iems', fixes: {
    driver_type: '1DD+2BA',
  }, note: 'Hybrid: 1x 10mm DD + 2x BA. Not just "DD"' },

  // ======================== DACS ========================

  { brand: 'SMSL', name: 'SU-1', cat: 'dac', fixes: {
    price_new: 80,
    asr_sinad: 116,
  }, note: '$79.99 retail. ASR SINAD ~116dB (was 112)' },

  { brand: 'iFi', name: 'Zen DAC 3', cat: 'dac', fixes: {
    price_new: 229,
    sound_signature: 'warm',
  }, note: '$229 per iFi official. iFi house sound is warm/musical, not neutral' },

  { brand: 'Chord Electronics', name: 'DAVE', cat: 'dac', fixes: {
    price_new: 14400,
    sound_signature: 'neutral',
  }, note: '$14,400 current MSRP. DAVE is neutral/transparent, not warm' },

  { brand: 'Denafrips', name: 'Terminator II', cat: 'dac', fixes: {
    price_new: 4500,
  }, note: '$4,500 per multiple review sources' },

  { brand: 'Audio-GD', name: 'R2R-11', cat: 'dac', fixes: {
    price_new: 668,
  }, note: 'Original $350, Mk2 is $668. Updated to current version' },

  { brand: 'Denafrips', name: 'Ares II', cat: 'dac', fixes: {
    price_new: 730,
  }, note: 'Retailed $680-772 (now discontinued, replaced by Ares 15th)' },

  { brand: 'FiiO', name: 'K11', cat: 'dac', fixes: {
    price_new: 129,
  }, note: '$129 retail' },

  { brand: 'Gustard', name: 'X16', cat: 'dac', fixes: {
    price_new: 499,
    asr_sinad: 121,
  }, note: '$499 retail. ASR measured 121dB SINAD (was 120)' },

  { brand: 'Gustard', name: 'A18', cat: 'dac', fixes: {
    price_new: 560,
  }, note: '$560 retail' },

  { brand: 'Gustard', name: 'X18', cat: 'dac', fixes: {
    price_new: 749,
  }, note: '$749 retail' },

  { brand: 'Holo Audio', name: 'Spring 3 KTE', cat: 'dac', fixes: {
    price_new: 3048,
  }, note: '$2998-3098 at Kitsune HiFi' },

  { brand: 'Holo Audio', name: 'May KTE', cat: 'dac', fixes: {
    price_new: 5600,
  }, note: '~$5,600 at Kitsune HiFi' },

  { brand: 'iFi', name: 'NEO iDSD', cat: 'dac', fixes: {
    price_new: 699,
  }, note: '$699 retail' },

  { brand: 'Musician', name: 'Draco', cat: 'dac', fixes: {
    price_new: 749,
  }, note: '$749 retail (was $499 in DB — way too low)' },

  { brand: 'Musician', name: 'Pegasus II', cat: 'dac', fixes: {
    price_new: 1099,
  }, note: '$1,099 retail' },

  { brand: 'Schiit', name: 'Gungnir', cat: 'dac', fixes: {
    price_new: 1549,
  }, note: 'Gungnir 2 is $1,549. Old Multibit was $1,249. $749 was way too low' },

  { brand: 'Schiit', name: 'Bifrost 2', cat: 'dac', fixes: {
    price_new: 799,
  }, note: 'Current Bifrost 2/64 is $799' },

  { brand: 'Schiit', name: 'Yggdrasil', cat: 'dac', fixes: {
    price_new: 2499,
  }, note: 'Yggdrasil tiers: $2,299-$2,699. Using midpoint $2,499' },

  { brand: 'SMSL', name: 'SU-9', cat: 'dac', fixes: {
    asr_sinad: 120,
  }, note: 'ASR measured 120dB (was 121)' },

  { brand: 'SMSL', name: 'D1SE', cat: 'dac', fixes: {
    price_new: 720,
    asr_sinad: null,
  }, note: '$720 retail. SINAD nulled: ASR reviewed D1SE2, not original D1SE' },

  { brand: 'SMSL', name: 'D-6', cat: 'dac', fixes: {
    price_new: 170,
    asr_sinad: null,
  }, note: '$170 retail. SINAD 121 was unreliable — possibly confused with D-6s' },

  { brand: 'T+A', name: 'DAC 200', cat: 'dac', fixes: {
    price_new: 7125,
  }, note: '$7,125 MSRP per Upscale Audio' },

  { brand: 'Topping', name: 'E30 II', cat: 'dac', fixes: {
    price_new: 149,
    asr_sinad: 118,
  }, note: '$149 retail. ASR measured ~118dB (was 120)' },

  { brand: 'Topping', name: 'E70 Velvet', cat: 'dac', fixes: {
    price_new: 449,
    asr_sinad: null,
  }, note: '$449 retail. SINAD nulled: no formal ASR review of Velvet variant' },

  { brand: 'Topping', name: 'D50s', cat: 'dac', fixes: {
    price_new: 250,
    asr_sinad: 112,
  }, note: '~$250 (discontinued). MAJOR: ASR measured 112dB, not 121dB' },

  { brand: 'Weiss', name: 'DAC501', cat: 'dac', fixes: {
    price_new: 8400,
  }, note: 'Original $8,400, MK2 is $11,995. $5,199 was way too low' },

  // ======================== AMPS ========================

  { brand: 'HeadAmp', name: 'GS-X mk2', cat: 'amp', fixes: {
    price_new: 2999,
    power_output: '6W Class A balanced',
    asr_sinad: null,
  }, note: '$2,999 retail. 6W Class A (not 8W). No ASR review exists' },

  { brand: 'Aune', name: 'S9c Pro', cat: 'amp', fixes: {
    price_new: 699,
    power_output: '5.78W @ 32Ω balanced',
  }, note: '$699 retail (was $349 — half the real price). 5.78W balanced' },

  { brand: 'Monoprice', name: 'Liquid Platinum', cat: 'amp', fixes: {
    price_new: 799,
    power_output: '6.62W @ 33Ω balanced',
  }, note: 'MSRP $769-799 (discontinued). 6.62W balanced per Headfonics' },

  { brand: 'Violectric', name: 'V550', cat: 'amp', fixes: {
    power_output: '6.4W @ 50Ω balanced',
    asr_sinad: null,
  }, note: '6.4W@50Ω official spec. SINAD nulled: ASR reviewed V550 Pro, not standard' },

  { brand: 'Bottlehead', name: 'Crack OTL', cat: 'amp', fixes: {
    price_new: 369,
    power_output: null,
  }, note: '$369 kit price. Power output not officially specified' },

  { brand: 'Burson', name: 'Soloist 3X GT', cat: 'amp', fixes: {
    price_new: 2499,
    power_output: '10W @ 32Ω balanced',
    asr_sinad: null,
  }, note: '$2,499 MSRP. 10W balanced. SINAD from forum member, not official ASR' },

  { brand: 'Cayin', name: 'HA-300', cat: 'amp', fixes: {
    price_new: 3999,
    power_output: '5W',
  }, note: '$3,999 original MSRP (MK2 is $4,399). ~5W headphone output' },

  { brand: 'Enleum', name: 'AMP-23R', cat: 'amp', fixes: {
    price_new: 6250,
    power_output: '4W @ 60Ω',
  }, note: '$6,250 current retail. 4W @ 60Ω (no 32Ω spec published)' },

  { brand: 'Feliks Audio', name: 'Euforia', cat: 'amp', fixes: {
    price_new: 2991,
  }, note: 'Current Euforia EVO is $2,991. Original discontinued' },

  { brand: 'Ferrum', name: 'OOR', cat: 'amp', fixes: {
    price_new: 1995,
    power_output: '10W @ 32Ω balanced',
    asr_sinad: null,
  }, note: '$1,995+ MSRP. 10W balanced. No ASR review exists (GoldenSound measured it)' },

  { brand: 'Flux Lab', name: 'Volot', cat: 'amp', fixes: {
    price_new: 2799,
    power_output: '16W @ 32Ω',
    asr_sinad: null,
  }, note: '$2,799 retail. 16W @ 32Ω. No ASR review exists' },

  { brand: 'Geshelli', name: 'Archel 3', cat: 'amp', fixes: {
    sound_signature: 'neutral',
  }, note: 'Transparent op-amp design. Neutral, not warm' },

  { brand: 'Geshelli', name: 'Erish 2', cat: 'amp', fixes: {
    price_new: 220,
  }, note: '$220 retail' },

  { brand: 'Grace Design', name: 'm900', cat: 'amp', fixes: {
    price_new: 499,
    power_output: null,
    asr_sinad: null,
  }, note: 'm900 is $499 (not $1,595). Power unspec\'d in watts. ASR measured DAC only' },

  { brand: 'HeadAmp', name: 'GS-X mini', cat: 'amp', fixes: {
    price_new: 1795,
    power_output: '6W @ 25Ω balanced',
    asr_sinad: null,
  }, note: '$1,795 retail. 6W@25Ω balanced. SINAD from GoldenSound, not ASR' },

  { brand: 'iFi', name: 'Pro iCAN', cat: 'amp', fixes: {
    price_new: 1799,
    power_output: '14W',
    asr_sinad: null,
  }, note: '$1,799 MSRP (Signature is $2,249). 14W+ high power mode. SINAD unclear' },

  { brand: 'Lake People', name: 'G111', cat: 'amp', fixes: {
    price_new: 575,
    power_output: null,
    asr_sinad: null,
  }, note: '$549-599 retail. Power not published in W@32Ω. ASR reviewed G109-S, not G111' },

  { brand: 'Little Dot', name: 'MK III', cat: 'amp', fixes: {
    price_new: 318,
  }, note: '$318 current retail' },

  { brand: 'Niimbus', name: 'US4+', cat: 'amp', fixes: {
    price_new: 4500,
    power_output: '25W per channel',
    asr_sinad: null,
  }, note: '$4,000-5,000 retail. 25W/ch. No ASR review exists' },

  { brand: 'Schiit', name: 'Valhalla 2', cat: 'amp', fixes: {
    price_new: 349,
    power_output: '180mW @ 50Ω, 600mW @ 300Ω',
  }, note: '$349 (discontinued, replaced by Valhalla 3). Power was wrong at all impedances' },

  { brand: 'Schiit', name: 'Lyr+', cat: 'amp', fixes: {
    price_new: 599,
  }, note: '$599 without tube, $649 with tube. Was $299 — way too low' },

  { brand: 'Schiit', name: 'Asgard 3', cat: 'amp', fixes: {
    price_new: 199,
    sound_signature: 'neutral',
  }, note: '$199 per Schiit website. Continuity topology is neutral, not warm' },

  { brand: 'Singxer', name: 'SA-1', cat: 'amp', fixes: {
    price_new: 599,
    power_output: '6.5W @ 32Ω balanced',
    asr_sinad: 121,
  }, note: '$599 (V2). 6.5W balanced. ASR measured ~121dB (was 116)' },

  { brand: 'SMSL', name: 'SP400', cat: 'amp', fixes: {
    price_new: 630,
    asr_sinad: 120,
  }, note: '$630 retail. ASR SINAD is 120dB (was 117)' },

  { brand: 'SPL', name: 'Phonitor SE', cat: 'amp', fixes: {
    price_new: 1600,
    power_output: '5W per channel',
    asr_sinad: null,
  }, note: '$1,600 amp-only ($2,175 w/DAC). Was $3,499 — overpriced in DB. No ASR review' },

  { brand: 'Topping', name: 'A90D', cat: 'amp', fixes: {
    price_new: 599,
    asr_sinad: 119,
  }, note: '$599 retail. ASR SINAD 119dB (was 120)' },

  { brand: 'Woo Audio', name: 'WA33', cat: 'amp', fixes: {
    price_new: 9999,
    power_output: '10W @ 32Ω',
  }, note: '$9,999 Standard ($16,999 Elite). 10W @ 32Ω (was 4W)' },

  { brand: 'Woo Audio', name: 'WA6', cat: 'amp', fixes: {
    price_new: 999,
  }, note: '$999 for 2nd gen' },

  { brand: 'Woo Audio', name: 'WA22', cat: 'amp', fixes: {
    price_new: 2699,
    power_output: '1.5W @ 32Ω',
  }, note: '$2,699 for 2nd gen. Power is 1.5W (was 2W)' },

  { brand: 'Woo Audio', name: 'WA7 Fireflies', cat: 'amp', fixes: {
    price_new: 1399,
  }, note: '$1,399 for 3rd gen' },

  { brand: 'xDuoo', name: 'TA-26', cat: 'amp', fixes: {
    price_new: 319,
    power_output: '500mW @ 300Ω',
  }, note: '$319 retail. Spec\'d at 300/600Ω loads only (high-impedance tube amp)' },

  { brand: 'ZMF', name: 'Pendant SE', cat: 'amp', fixes: {
    price_new: 1999,
    power_output: '3W Low Z',
  }, note: '~$1,999. Up to 3W on Low Z setting' },

  // ======================== COMBOS (DAC_AMP) ========================

  { brand: 'Burson', name: 'Conductor 3X GT', cat: 'dac_amp', fixes: {
    price_new: 2999,
    power_output: '10W @ 16Ω balanced',
  }, note: '$2,999 MSRP. 10W@16Ω balanced (not 4W@32Ω)' },

  { brand: 'Matrix Audio', name: 'Element X2', cat: 'dac_amp', fixes: {
    price_new: 4399,
    power_output: '2.6W @ 33Ω balanced',
  }, note: '$4,399 retail. 2.6W@33Ω balanced (not 3W@32Ω)' },

  { brand: 'FiiO', name: 'Q7', cat: 'dac_amp', fixes: {
    price_new: 749,
  }, note: '$749.99 MSRP (discontinued)' },

  { brand: 'Astell&Kern', name: 'KANN Ultra', cat: 'dac_amp', fixes: {
    price_new: 1479,
    power_output: '16Vrms balanced',
  }, note: '~$1,479 retail. 16Vrms Super Gain (was 12Vrms — that is High Gain only)' },

  { brand: 'Cayin', name: 'RU7', cat: 'dac_amp', fixes: {
    price_new: 289,
    power_output: '400mW @ 32Ω balanced',
  }, note: '$289. 400mW balanced (not 500mW)' },

  { brand: 'Cayin', name: 'RU6', cat: 'dac_amp', fixes: {
    price_new: 249,
    power_output: '213mW @ 32Ω balanced',
  }, note: '$249 (not $199). 213mW balanced' },

  { brand: 'Chord', name: 'Mojo 2', cat: 'dac_amp', fixes: {
    price_new: 650,
    power_output: '600mW @ 30Ω',
    sound_signature: 'neutral',
  }, note: '$650 retail. 600mW@30Ω (not 8Ω). Mojo 2 tuning is neutral (unlike warmer original)' },

  { brand: 'Chord Electronics', name: 'Hugo TT2', cat: 'dac_amp', fixes: {
    price_new: 5459,
    power_output: '2.7W @ 32Ω SE',
  }, note: '$5,459. 2.7W SE (up to 10W+ balanced). Was listed as 1W' },

  { brand: 'ddHiFi', name: 'TC44C', cat: 'dac_amp', fixes: {
    price_new: 119,
    power_output: '132mW @ 32Ω balanced',
  }, note: '$119 (was $25 — nearly 5x off). 132mW balanced' },

  { brand: 'FiiO', name: 'BTR7', cat: 'dac_amp', fixes: {
    price_new: 200,
  }, note: '$199.99 MSRP (was $130)' },

  { brand: 'Hidizs', name: 'S9 Pro', cat: 'dac_amp', fixes: {
    price_new: 119,
  }, note: '$119 retail (was $79)' },

  { brand: 'iFi', name: 'Pro iDSD Signature', cat: 'dac_amp', fixes: {
    price_new: 2749,
    power_output: '3W @ 32Ω',
  }, note: '$2,749. ~3W@32Ω estimated (not 4W)' },

  { brand: 'iFi', name: 'NEO iDSD 2', cat: 'dac_amp', fixes: {
    price_new: 899,
    power_output: '2.8W @ 32Ω balanced',
    sound_signature: 'warm',
  }, note: '$899. 2.8W RMS balanced. iFi warm house sound — not neutral' },

  { brand: 'iFi', name: 'iDSD Diablo', cat: 'dac_amp', fixes: {
    sound_signature: 'warm',
  }, note: 'Burr-Brown DAC with iFi warm house sound. Reviewers say warm-of-neutral' },

  { brand: 'iFi', name: 'GO bar', cat: 'dac_amp', fixes: {
    price_new: 329,
  }, note: '$329 retail (was $169 — nearly half the real price)' },

  { brand: 'Moondrop', name: 'Dawn 4.4', cat: 'dac_amp', fixes: {
    price_new: 70,
  }, note: '$69.99 retail' },

  { brand: 'Mytek', name: 'Brooklyn Bridge', cat: 'dac_amp', fixes: {
    power_output: '6W max headphone',
  }, note: '6W max headphone output. Was listed as 1W' },

  { brand: 'Schiit', name: 'Hel 2E', cat: 'dac_amp', fixes: {
    asr_sinad: null,
  }, note: 'No formal ASR review exists. SINAD=110 was unverified' },

  { brand: 'Shanling', name: 'M9 Plus', cat: 'dac_amp', fixes: {
    price_new: 2959,
    power_output: '1.12W @ 32Ω balanced',
  }, note: '$2,959 per Headfonics. Was $1,800 — way too low' },

  { brand: 'Shanling', name: 'UA5', cat: 'dac_amp', fixes: {
    price_new: 235,
    power_output: '211mW @ 32Ω balanced',
  }, note: '$235 retail. 211mW balanced (not 250mW)' },

  { brand: 'TempoTec', name: 'Sonata BHD Pro', cat: 'dac_amp', fixes: {
    price_new: 80,
    power_output: '280mW @ 32Ω balanced',
  }, note: '$70-90 retail. 280mW balanced (not 200mW)' },

  { brand: 'Topping', name: 'DX7 Pro', cat: 'dac_amp', fixes: {
    power_output: '1.7W @ 32Ω balanced',
    asr_sinad: 121,
  }, note: '1.7W balanced (was 2.3W). ASR measured ~121dB (was 118)' },
];

// ============================================================
// CATEGORY FIXES — items in the wrong category
// ============================================================

const CATEGORY_FIXES = [
  { brand: 'Gustard', name: 'A26', from: 'amp', to: 'dac',
    nullFields: ['power_output'],
    note: 'A26 is a DAC with no headphone output. Gustard H26 is the amp' },

  { brand: 'Loxjie', name: 'D50', from: 'dac_amp', to: 'dac',
    nullFields: ['power_output'],
    note: 'D50 is a DAC only — no headphone output. (D30 has headphone out)' },

  { brand: 'SMSL', name: 'DO300', from: 'dac_amp', to: 'dac',
    nullFields: ['power_output'],
    note: 'DO300 is a DAC only — no headphone output. (DO300EX has headphone out)' },
];

// ============================================================
// EXECUTION
// ============================================================

async function run() {
  const stats = { found: 0, notFound: 0, updated: 0, errors: 0, catFixed: 0 };

  console.log(`\n${'='.repeat(60)}`);
  console.log(EXECUTE
    ? '  EXECUTING: Comprehensive Data Audit Fixes'
    : '  DRY RUN: Comprehensive Data Audit Fixes');
  console.log(`${'='.repeat(60)}\n`);

  // ---- Process field fixes ----
  let currentCat = '';
  for (let i = 0; i < ALL_FIXES.length; i++) {
    const f = ALL_FIXES[i];

    // Category header
    if (f.cat !== currentCat) {
      currentCat = f.cat;
      const label = { cans: 'HEADPHONES', iems: 'IEMS', dac: 'DACS', amp: 'AMPS', dac_amp: 'COMBOS' };
      console.log(`\n--- ${label[currentCat] || currentCat.toUpperCase()} ---`);
    }

    // Find the entry
    const { data, error } = await supabase
      .from('components')
      .select('id, name, brand, price_new, price_used_min, price_used_max, budget_tier, impedance, driver_type, sound_signature, power_output, asr_sinad')
      .eq('brand', f.brand)
      .eq('name', f.name)
      .eq('category', f.cat)
      .limit(1);

    if (error || !data || data.length === 0) {
      console.log(`  [!] NOT FOUND: ${f.brand} ${f.name} (${f.cat})`);
      stats.notFound++;
      continue;
    }

    stats.found++;
    const entry = data[0];
    const updates = { ...f.fixes };

    // Auto-calculate derived fields when price changes
    if (updates.price_new !== undefined) {
      updates.price_used_min = Math.round(updates.price_new * 0.65);
      updates.price_used_max = Math.round(updates.price_new * 0.85);
      updates.budget_tier = budgetTier(updates.price_new);
    }

    // Build change log
    const changes = [];
    for (const [key, newVal] of Object.entries(updates)) {
      const oldVal = entry[key];
      if (oldVal !== newVal) {
        const fmt = (v) => v === null ? 'null' : typeof v === 'string' ? `"${v}"` : `$${v}`;
        if (key === 'price_new' || key === 'price_used_min' || key === 'price_used_max') {
          changes.push(`    ${key}: $${oldVal} → $${newVal}`);
        } else {
          changes.push(`    ${key}: ${fmt(oldVal)} → ${fmt(newVal)}`);
        }
      }
    }

    if (changes.length === 0) {
      continue; // No actual changes needed
    }

    console.log(`\n  [${i + 1}] ${f.brand} ${f.name}`);
    changes.forEach(c => console.log(c));
    console.log(`    📝 ${f.note}`);

    if (EXECUTE) {
      const { error: updateErr } = await supabase
        .from('components')
        .update(updates)
        .eq('id', entry.id);

      if (updateErr) {
        console.log(`    ❌ ERROR: ${updateErr.message}`);
        stats.errors++;
      } else {
        console.log(`    ✅ Updated`);
        stats.updated++;
      }
    } else {
      stats.updated++;
    }
  }

  // ---- Process category fixes ----
  if (CATEGORY_FIXES.length > 0) {
    console.log(`\n\n--- CATEGORY CORRECTIONS ---`);
    for (const cf of CATEGORY_FIXES) {
      const { data, error } = await supabase
        .from('components')
        .select('id, name, brand, category, power_output')
        .eq('brand', cf.brand)
        .eq('name', cf.name)
        .eq('category', cf.from)
        .limit(1);

      if (error || !data || data.length === 0) {
        console.log(`  [!] NOT FOUND: ${cf.brand} ${cf.name} (${cf.from})`);
        stats.notFound++;
        continue;
      }

      const entry = data[0];
      const catUpdate = { category: cf.to };
      if (cf.nullFields) {
        for (const field of cf.nullFields) {
          catUpdate[field] = null;
        }
      }

      console.log(`\n  ${cf.brand} ${cf.name}`);
      console.log(`    category: "${cf.from}" → "${cf.to}"`);
      if (cf.nullFields) {
        cf.nullFields.forEach(field => console.log(`    ${field}: "${entry[field]}" → null`));
      }
      console.log(`    📝 ${cf.note}`);

      if (EXECUTE) {
        const { error: updateErr } = await supabase
          .from('components')
          .update(catUpdate)
          .eq('id', entry.id);

        if (updateErr) {
          console.log(`    ❌ ERROR: ${updateErr.message}`);
          stats.errors++;
        } else {
          console.log(`    ✅ Updated`);
          stats.catFixed++;
        }
      } else {
        stats.catFixed++;
      }
    }
  }

  // ---- Summary ----
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  SUMMARY`);
  console.log(`${'='.repeat(60)}`);
  console.log(`  Entries found:        ${stats.found}`);
  console.log(`  Entries not found:    ${stats.notFound}`);
  console.log(`  Field corrections:    ${stats.updated}`);
  console.log(`  Category corrections: ${stats.catFixed}`);
  console.log(`  Errors:               ${stats.errors}`);
  console.log(`  Total changes:        ${stats.updated + stats.catFixed}`);
  if (!EXECUTE) {
    console.log(`\n  This was a DRY RUN. To apply, run:`);
    console.log(`  node scripts/fix-audit-2026.js --execute`);
  }
  console.log('');
}

run().catch(console.error);
