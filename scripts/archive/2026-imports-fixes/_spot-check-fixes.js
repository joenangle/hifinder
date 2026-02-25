const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Full fixes array from fix-audit-2026.js
const ALL_FIXES = [
  // CANS
  { brand: 'ZMF', name: 'Caldera', cat: 'cans', fixes: { impedance: 60 }, note: 'Impedance is 60Ω per ZMF specs, not 300Ω' },
  { brand: 'Hifiman', name: 'Arya Organic', cat: 'cans', fixes: { price_new: 1299 }, note: 'MSRP $1,299' },
  { brand: 'Sennheiser', name: 'HD 660S2', cat: 'cans', fixes: { price_new: 599 }, note: 'MSRP $599' },
  { brand: 'Austrian Audio', name: 'Hi-X55', cat: 'cans', fixes: { price_new: 330 }, note: '$329.99 at Sweetwater/B&H' },
  { brand: 'Dan Clark Audio', name: 'Stealth', cat: 'cans', fixes: { price_new: 4499 }, note: 'Current DCA website $4,499.99' },
  // IEMS
  { brand: 'Truthear', name: 'Zero RED', cat: 'iems', fixes: { driver_type: '2DD' }, note: 'Dual dynamic (10mm+7.8mm)' },
  { brand: 'Letshuoer', name: 'S12 Pro', cat: 'iems', fixes: { sound_signature: 'fun' }, note: 'V-shaped tuning' },
  { brand: 'Simgot', name: 'EA1000 Fermat', cat: 'iems', fixes: { sound_signature: 'warm' }, note: 'Warm/wide/airy per reviewers' },
  { brand: 'Campfire Audio', name: 'Mammoth', cat: 'iems', fixes: { driver_type: '1DD+2BA' }, note: 'Hybrid 1DD+2BA' },
  // DACS
  { brand: 'SMSL', name: 'SU-1', cat: 'dac', fixes: { price_new: 80, asr_sinad: 116 }, note: '$79.99, ASR 116dB' },
  { brand: 'iFi', name: 'Zen DAC 3', cat: 'dac', fixes: { price_new: 229, sound_signature: 'warm' }, note: '$229, iFi warm house sound' },
  { brand: 'Chord Electronics', name: 'DAVE', cat: 'dac', fixes: { price_new: 14400, sound_signature: 'neutral' }, note: '$14,400, neutral/transparent' },
  { brand: 'Denafrips', name: 'Terminator II', cat: 'dac', fixes: { price_new: 4500 }, note: '$4,500' },
  { brand: 'Audio-GD', name: 'R2R-11', cat: 'dac', fixes: { price_new: 668 }, note: 'Mk2 is $668' },
  { brand: 'Denafrips', name: 'Ares II', cat: 'dac', fixes: { price_new: 730 }, note: '$680-772 discontinued' },
  { brand: 'FiiO', name: 'K11', cat: 'dac', fixes: { price_new: 129 }, note: '$129' },
  { brand: 'Gustard', name: 'X16', cat: 'dac', fixes: { price_new: 499, asr_sinad: 121 }, note: '$499, ASR 121dB' },
  { brand: 'Gustard', name: 'A18', cat: 'dac', fixes: { price_new: 560 }, note: '$560' },
  { brand: 'Gustard', name: 'X18', cat: 'dac', fixes: { price_new: 749 }, note: '$749' },
  { brand: 'Holo Audio', name: 'Spring 3 KTE', cat: 'dac', fixes: { price_new: 3048 }, note: '$2998-3098 Kitsune' },
  { brand: 'Holo Audio', name: 'May KTE', cat: 'dac', fixes: { price_new: 5600 }, note: '~$5,600 Kitsune' },
  { brand: 'iFi', name: 'NEO iDSD', cat: 'dac', fixes: { price_new: 699 }, note: '$699' },
  { brand: 'Musician', name: 'Draco', cat: 'dac', fixes: { price_new: 749 }, note: '$749' },
  { brand: 'Musician', name: 'Pegasus II', cat: 'dac', fixes: { price_new: 1099 }, note: '$1,099' },
  { brand: 'Schiit', name: 'Gungnir', cat: 'dac', fixes: { price_new: 1549 }, note: 'Gungnir 2 $1,549' },
  { brand: 'Schiit', name: 'Bifrost 2', cat: 'dac', fixes: { price_new: 799 }, note: 'Bifrost 2/64 $799' },
  { brand: 'Schiit', name: 'Yggdrasil', cat: 'dac', fixes: { price_new: 2499 }, note: '$2,299-$2,699 midpoint' },
  { brand: 'SMSL', name: 'SU-9', cat: 'dac', fixes: { asr_sinad: 120 }, note: 'ASR 120dB' },
  { brand: 'SMSL', name: 'D1SE', cat: 'dac', fixes: { price_new: 720, asr_sinad: null }, note: '$720, no ASR review' },
  { brand: 'SMSL', name: 'D-6', cat: 'dac', fixes: { price_new: 170, asr_sinad: null }, note: '$170' },
  { brand: 'T+A', name: 'DAC 200', cat: 'dac', fixes: { price_new: 7125 }, note: '$7,125 Upscale Audio' },
  { brand: 'Topping', name: 'E30 II', cat: 'dac', fixes: { price_new: 149, asr_sinad: 118 }, note: '$149, ASR 118dB' },
  { brand: 'Topping', name: 'E70 Velvet', cat: 'dac', fixes: { price_new: 449, asr_sinad: null }, note: '$449' },
  { brand: 'Topping', name: 'D50s', cat: 'dac', fixes: { price_new: 250, asr_sinad: 112 }, note: '$250, ASR 112dB' },
  { brand: 'Weiss', name: 'DAC501', cat: 'dac', fixes: { price_new: 8400 }, note: '$8,400' },
  // AMPS
  { brand: 'HeadAmp', name: 'GS-X mk2', cat: 'amp', fixes: { price_new: 2999, power_output: '6W Class A balanced', asr_sinad: null }, note: '$2,999, 6W, no ASR' },
  { brand: 'Aune', name: 'S9c Pro', cat: 'amp', fixes: { price_new: 699, power_output: '5.78W @ 32Ω balanced' }, note: '$699, 5.78W' },
  { brand: 'Monoprice', name: 'Liquid Platinum', cat: 'amp', fixes: { price_new: 799, power_output: '6.62W @ 33Ω balanced' }, note: '$769-799 discontinued' },
  { brand: 'Violectric', name: 'V550', cat: 'amp', fixes: { power_output: '6.4W @ 50Ω balanced', asr_sinad: null }, note: '6.4W@50Ω, no ASR for standard' },
  { brand: 'Bottlehead', name: 'Crack OTL', cat: 'amp', fixes: { price_new: 369, power_output: null }, note: '$369 kit' },
  { brand: 'Burson', name: 'Soloist 3X GT', cat: 'amp', fixes: { price_new: 2499, power_output: '10W @ 32Ω balanced', asr_sinad: null }, note: '$2,499, 10W' },
  { brand: 'Cayin', name: 'HA-300', cat: 'amp', fixes: { price_new: 3999, power_output: '5W' }, note: '$3,999, 5W' },
  { brand: 'Enleum', name: 'AMP-23R', cat: 'amp', fixes: { price_new: 6250, power_output: '4W @ 60Ω' }, note: '$6,250, 4W@60Ω' },
  { brand: 'Feliks Audio', name: 'Euforia', cat: 'amp', fixes: { price_new: 2991 }, note: 'Euforia EVO $2,991' },
  { brand: 'Ferrum', name: 'OOR', cat: 'amp', fixes: { price_new: 1995, power_output: '10W @ 32Ω balanced', asr_sinad: null }, note: '$1,995, 10W' },
  { brand: 'Flux Lab', name: 'Volot', cat: 'amp', fixes: { price_new: 2799, power_output: '16W @ 32Ω', asr_sinad: null }, note: '$2,799, 16W' },
  { brand: 'Geshelli', name: 'Archel 3', cat: 'amp', fixes: { sound_signature: 'neutral' }, note: 'Op-amp design, neutral' },
  { brand: 'Geshelli', name: 'Erish 2', cat: 'amp', fixes: { price_new: 220 }, note: '$220' },
  { brand: 'Grace Design', name: 'm900', cat: 'amp', fixes: { price_new: 499, power_output: null, asr_sinad: null }, note: '$499' },
  { brand: 'HeadAmp', name: 'GS-X mini', cat: 'amp', fixes: { price_new: 1795, power_output: '6W @ 25Ω balanced', asr_sinad: null }, note: '$1,795, 6W@25Ω' },
  { brand: 'iFi', name: 'Pro iCAN', cat: 'amp', fixes: { price_new: 1799, power_output: '14W', asr_sinad: null }, note: '$1,799, 14W' },
  { brand: 'Lake People', name: 'G111', cat: 'amp', fixes: { price_new: 575, power_output: null, asr_sinad: null }, note: '$549-599' },
  { brand: 'Little Dot', name: 'MK III', cat: 'amp', fixes: { price_new: 318 }, note: '$318' },
  { brand: 'Niimbus', name: 'US4+', cat: 'amp', fixes: { price_new: 4500, power_output: '25W per channel', asr_sinad: null }, note: '$4,000-5,000, 25W' },
  { brand: 'Schiit', name: 'Valhalla 2', cat: 'amp', fixes: { price_new: 349, power_output: '180mW @ 50Ω, 600mW @ 300Ω' }, note: '$349 disc.' },
  { brand: 'Schiit', name: 'Lyr+', cat: 'amp', fixes: { price_new: 599 }, note: '$599' },
  { brand: 'Schiit', name: 'Asgard 3', cat: 'amp', fixes: { price_new: 199, sound_signature: 'neutral' }, note: '$199, neutral' },
  { brand: 'Singxer', name: 'SA-1', cat: 'amp', fixes: { price_new: 599, power_output: '6.5W @ 32Ω balanced', asr_sinad: 121 }, note: '$599 V2, ASR 121dB' },
  { brand: 'SMSL', name: 'SP400', cat: 'amp', fixes: { price_new: 630, asr_sinad: 120 }, note: '$630, ASR 120dB' },
  { brand: 'SPL', name: 'Phonitor SE', cat: 'amp', fixes: { price_new: 1600, power_output: '5W per channel', asr_sinad: null }, note: '$1,600 amp-only' },
  { brand: 'Topping', name: 'A90D', cat: 'amp', fixes: { price_new: 599, asr_sinad: 119 }, note: '$599, ASR 119dB' },
  { brand: 'Woo Audio', name: 'WA33', cat: 'amp', fixes: { price_new: 9999, power_output: '10W @ 32Ω' }, note: '$9,999, 10W' },
  { brand: 'Woo Audio', name: 'WA6', cat: 'amp', fixes: { price_new: 999 }, note: '$999 2nd gen' },
  { brand: 'Woo Audio', name: 'WA22', cat: 'amp', fixes: { price_new: 2699, power_output: '1.5W @ 32Ω' }, note: '$2,699, 1.5W' },
  { brand: 'Woo Audio', name: 'WA7 Fireflies', cat: 'amp', fixes: { price_new: 1399 }, note: '$1,399 3rd gen' },
  { brand: 'xDuoo', name: 'TA-26', cat: 'amp', fixes: { price_new: 319, power_output: '500mW @ 300Ω' }, note: '$319' },
  { brand: 'ZMF', name: 'Pendant SE', cat: 'amp', fixes: { price_new: 1999, power_output: '3W Low Z' }, note: '$1,999, 3W' },
  // COMBOS
  { brand: 'Burson', name: 'Conductor 3X GT', cat: 'dac_amp', fixes: { price_new: 2999, power_output: '10W @ 16Ω balanced' }, note: '$2,999, 10W@16Ω' },
  { brand: 'Matrix Audio', name: 'Element X2', cat: 'dac_amp', fixes: { price_new: 4399, power_output: '2.6W @ 33Ω balanced' }, note: '$4,399, 2.6W' },
  { brand: 'FiiO', name: 'Q7', cat: 'dac_amp', fixes: { price_new: 749 }, note: '$749.99 disc.' },
  { brand: 'Astell&Kern', name: 'KANN Ultra', cat: 'dac_amp', fixes: { price_new: 1479, power_output: '16Vrms balanced' }, note: '$1,479, 16Vrms' },
  { brand: 'Cayin', name: 'RU7', cat: 'dac_amp', fixes: { price_new: 289, power_output: '400mW @ 32Ω balanced' }, note: '$289, 400mW' },
  { brand: 'Cayin', name: 'RU6', cat: 'dac_amp', fixes: { price_new: 249, power_output: '213mW @ 32Ω balanced' }, note: '$249, 213mW' },
  { brand: 'Chord', name: 'Mojo 2', cat: 'dac_amp', fixes: { price_new: 650, power_output: '600mW @ 30Ω', sound_signature: 'neutral' }, note: '$650, neutral' },
  { brand: 'Chord Electronics', name: 'Hugo TT2', cat: 'dac_amp', fixes: { price_new: 5459, power_output: '2.7W @ 32Ω SE' }, note: '$5,459, 2.7W' },
  { brand: 'ddHiFi', name: 'TC44C', cat: 'dac_amp', fixes: { price_new: 119, power_output: '132mW @ 32Ω balanced' }, note: '$119, 132mW' },
  { brand: 'FiiO', name: 'BTR7', cat: 'dac_amp', fixes: { price_new: 200 }, note: '$199.99' },
  { brand: 'Hidizs', name: 'S9 Pro', cat: 'dac_amp', fixes: { price_new: 119 }, note: '$119' },
  { brand: 'iFi', name: 'Pro iDSD Signature', cat: 'dac_amp', fixes: { price_new: 2749, power_output: '3W @ 32Ω' }, note: '$2,749, 3W' },
  { brand: 'iFi', name: 'NEO iDSD 2', cat: 'dac_amp', fixes: { price_new: 899, power_output: '2.8W @ 32Ω balanced', sound_signature: 'warm' }, note: '$899, warm' },
  { brand: 'iFi', name: 'iDSD Diablo', cat: 'dac_amp', fixes: { sound_signature: 'warm' }, note: 'iFi warm house sound' },
  { brand: 'iFi', name: 'GO bar', cat: 'dac_amp', fixes: { price_new: 329 }, note: '$329' },
  { brand: 'Moondrop', name: 'Dawn 4.4', cat: 'dac_amp', fixes: { price_new: 70 }, note: '$69.99' },
  { brand: 'Mytek', name: 'Brooklyn Bridge', cat: 'dac_amp', fixes: { power_output: '6W max headphone' }, note: '6W max' },
  { brand: 'Schiit', name: 'Hel 2E', cat: 'dac_amp', fixes: { asr_sinad: null }, note: 'No ASR review' },
  { brand: 'Shanling', name: 'M9 Plus', cat: 'dac_amp', fixes: { price_new: 2959, power_output: '1.12W @ 32Ω balanced' }, note: '$2,959' },
  { brand: 'Shanling', name: 'UA5', cat: 'dac_amp', fixes: { price_new: 235, power_output: '211mW @ 32Ω balanced' }, note: '$235, 211mW' },
  { brand: 'TempoTec', name: 'Sonata BHD Pro', cat: 'dac_amp', fixes: { price_new: 80, power_output: '280mW @ 32Ω balanced' }, note: '$70-90, 280mW' },
  { brand: 'Topping', name: 'DX7 Pro', cat: 'dac_amp', fixes: { power_output: '1.7W @ 32Ω balanced', asr_sinad: 121 }, note: '1.7W, ASR 121dB' },
];

// All fields that matter per category
const FIELDS_BY_CAT = {
  cans:    ['price_new', 'price_used_min', 'price_used_max', 'budget_tier', 'sound_signature', 'impedance', 'driver_type'],
  iems:    ['price_new', 'price_used_min', 'price_used_max', 'budget_tier', 'sound_signature', 'impedance', 'driver_type'],
  dac:     ['price_new', 'price_used_min', 'price_used_max', 'budget_tier', 'sound_signature', 'asr_sinad'],
  amp:     ['price_new', 'price_used_min', 'price_used_max', 'budget_tier', 'sound_signature', 'power_output', 'asr_sinad'],
  dac_amp: ['price_new', 'price_used_min', 'price_used_max', 'budget_tier', 'sound_signature', 'power_output', 'asr_sinad'],
};

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function budgetTier(price) {
  if (price <= 100) return 'Budget';
  if (price <= 300) return 'Entry Level';
  if (price <= 700) return 'Mid Range';
  if (price <= 1500) return 'High End';
  return 'Summit-Fi';
}

function fmt(val) {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'string') return `"${val}"`;
  return String(val);
}

async function spotCheck() {
  const cats = ['cans', 'iems', 'dac', 'amp', 'dac_amp'];
  const catLabels = { cans: 'HEADPHONES', iems: 'IEMS', dac: 'DACS', amp: 'AMPS', dac_amp: 'COMBOS' };

  console.log('\n' + '='.repeat(80));
  console.log('  SPOT CHECK: 3 random items per category — ALL relevant fields shown');
  console.log('  Fields being changed are marked with >>');
  console.log('  Unchanged fields shown for full context');
  console.log('='.repeat(80));

  for (const cat of cats) {
    const catFixes = ALL_FIXES.filter(f => f.cat === cat);
    const sample = shuffle(catFixes).slice(0, 3);
    const fields = FIELDS_BY_CAT[cat];

    console.log(`\n${'─'.repeat(80)}`);
    console.log(`  ${catLabels[cat]} (${sample.length} of ${catFixes.length} sampled)`);
    console.log(`${'─'.repeat(80)}`);

    for (const f of sample) {
      // Fetch current DB state — all fields
      const { data } = await supabase
        .from('components')
        .select('*')
        .eq('brand', f.brand)
        .eq('name', f.name)
        .eq('category', f.cat)
        .limit(1);

      if (!data || data.length === 0) {
        console.log(`\n  !! NOT FOUND: ${f.brand} ${f.name}`);
        continue;
      }

      const entry = data[0];

      // Pre-compute derived values if price is changing
      const derived = {};
      if (f.fixes.price_new !== undefined) {
        derived.price_used_min = Math.round(f.fixes.price_new * 0.65);
        derived.price_used_max = Math.round(f.fixes.price_new * 0.85);
        derived.budget_tier = budgetTier(f.fixes.price_new);
      }

      console.log(`\n  ┌─ ${f.brand} ${f.name}`);
      console.log(`  │  Category: ${cat}`);
      console.log(`  │`);

      // Show every relevant field for this category
      for (const field of fields) {
        const currentVal = entry[field];
        const isDirectFix = f.fixes[field] !== undefined;
        const isDerived = derived[field] !== undefined;
        const isChanging = isDirectFix || isDerived;

        const newVal = isDirectFix ? f.fixes[field] : (isDerived ? derived[field] : currentVal);
        const actuallyDifferent = currentVal !== newVal;

        if (isChanging && actuallyDifferent) {
          // Changing field — highlight with >>
          const isPriceField = field.startsWith('price_');
          if (isPriceField) {
            console.log(`  │  >> ${field.padEnd(18)} $${currentVal}  -->  $${newVal}`);
          } else {
            console.log(`  │  >> ${field.padEnd(18)} ${fmt(currentVal)}  -->  ${fmt(newVal)}`);
          }
        } else {
          // Unchanged field — show current value for context
          const isPriceField = field.startsWith('price_');
          if (isPriceField) {
            console.log(`  │     ${field.padEnd(18)} $${currentVal}`);
          } else {
            console.log(`  │     ${field.padEnd(18)} ${fmt(currentVal)}`);
          }
        }
      }

      console.log(`  │`);
      console.log(`  │  Reason: ${f.note}`);

      // Verification URLs
      const q = encodeURIComponent(`${f.brand} ${f.name}`);
      console.log(`  │`);
      console.log(`  │  Verify:`);
      console.log(`  │     Specs/price:      https://www.google.com/search?q=${q}+specifications+price`);
      if (fields.includes('asr_sinad')) {
        console.log(`  │     ASR review:       https://www.google.com/search?q=audiosciencereview+${q}+review+sinad`);
      }
      if (fields.includes('sound_signature')) {
        console.log(`  │     Sound signature:  https://www.google.com/search?q=${q}+sound+signature+review`);
      }
      if (fields.includes('driver_type')) {
        console.log(`  │     Driver type:      https://www.google.com/search?q=${q}+driver+specifications`);
      }
      if (fields.includes('impedance')) {
        console.log(`  │     Impedance:        https://www.google.com/search?q=${q}+impedance+ohms+specs`);
      }
      if (fields.includes('power_output')) {
        console.log(`  │     Power output:     https://www.google.com/search?q=${q}+power+output+watts+specifications`);
      }
      console.log(`  └${'─'.repeat(79)}`);
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('  >> = field being changed by fix script');
  console.log('  (no >>) = current DB value, shown for context / cross-check');
  console.log('');
  console.log('  When satisfied, run: node scripts/fix-audit-2026.js --execute');
  console.log('='.repeat(80) + '\n');
}

spotCheck().catch(console.error);
