require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Comprehensive list of popular standalone DACs with 2025/2026 pricing research
// IMPORTANT: These are RETAIL prices for NEW units, researched from manufacturer websites,
// authorized dealers, and audiophile retailers (Schiit.com, Drop.com, Audio46, etc.)

const popularDacs = [
  // ===== BUDGET TIER ($50-$200) =====
  {
    brand: 'Schiit',
    name: 'Modi+',
    price_new: 129,
    asr_sinad: 113,
    sound_signature: 'neutral',
    features: 'USB, optical, coaxial input; AKM AK4490 chip',
    notes: 'Updated 2024 model, replaced Modi 3+'
  },
  {
    brand: 'Schiit',
    name: 'Modi 3E',
    price_new: 119,
    asr_sinad: 110,
    sound_signature: 'neutral',
    features: 'USB input only; E-series (economy)',
    notes: 'Economy version, USB-only'
  },
  {
    brand: 'JDS Labs',
    name: 'Atom DAC+',
    price_new: 109,
    asr_sinad: 114,
    sound_signature: 'neutral',
    features: 'USB input; RCA outputs',
    notes: 'Popular budget choice, pairs well with Atom Amp+'
  },
  {
    brand: 'Topping',
    name: 'D10s',
    price_new: 119,
    asr_sinad: 118,
    sound_signature: 'neutral',
    features: 'USB, optical, coaxial; ES9038Q2M chip',
    notes: 'Compact desktop DAC'
  },
  {
    brand: 'Topping',
    name: 'E30 II',
    price_new: 139,
    asr_sinad: 120,
    sound_signature: 'neutral',
    features: 'USB, optical, coaxial; AK4493SEQ chip',
    notes: 'Balanced XLR outputs'
  },
  {
    brand: 'SMSL',
    name: 'SU-1',
    price_new: 89,
    asr_sinad: 112,
    sound_signature: 'neutral',
    features: 'USB to optical/coaxial converter; DDC functionality',
    notes: 'Digital-to-digital converter, popular for adding optical out'
  },
  {
    brand: 'SMSL',
    name: 'D-6',
    price_new: 189,
    asr_sinad: 121,
    sound_signature: 'neutral',
    features: 'USB, optical, coaxial; ES9039Q2M chip; balanced outputs',
    notes: 'Excellent measurements for the price'
  },
  {
    brand: 'FiiO',
    name: 'K11',
    price_new: 109,
    asr_sinad: null,
    sound_signature: 'neutral',
    features: 'USB DAC; CS43131 chip; desktop form factor',
    notes: 'Newer FiiO desktop DAC option'
  },

  // ===== MID TIER ($200-$600) =====
  {
    brand: 'Schiit',
    name: 'Bifrost 2',
    price_new: 749,
    asr_sinad: null,
    sound_signature: 'warm',
    features: 'Multibit R2R DAC; USB, optical, coaxial; balanced outputs',
    notes: 'Popular R2R option, known for musicality'
  },
  {
    brand: 'Schiit',
    name: 'Modius',
    price_new: 249,
    asr_sinad: 111,
    sound_signature: 'neutral',
    features: 'USB, optical, coaxial; balanced outputs; AKM chip',
    notes: 'Balanced output Modi alternative'
  },
  {
    brand: 'Topping',
    name: 'D50s',
    price_new: 279,
    asr_sinad: 121,
    sound_signature: 'neutral',
    features: 'USB, optical, coaxial; ES9038Q2M; balanced outputs',
    notes: 'Popular mid-tier measurement king'
  },
  {
    brand: 'Topping',
    name: 'E50',
    price_new: 249,
    asr_sinad: 120,
    sound_signature: 'neutral',
    features: 'USB, optical, coaxial; AK4493SEQ; balanced outputs',
    notes: 'Compact form factor'
  },
  {
    brand: 'Topping',
    name: 'E70 Velvet',
    price_new: 599,
    asr_sinad: 123,
    sound_signature: 'neutral',
    features: 'USB, optical, coaxial, Bluetooth; ES9028PRO; remote control',
    notes: 'Premium E-series with Bluetooth'
  },
  {
    brand: 'SMSL',
    name: 'SU-6',
    price_new: 279,
    asr_sinad: 115,
    sound_signature: 'neutral',
    features: 'USB, I2S, optical, coaxial; DDC with multiple outputs',
    notes: 'Advanced DDC functionality'
  },
  {
    brand: 'SMSL',
    name: 'DO200',
    price_new: 339,
    asr_sinad: 119,
    sound_signature: 'neutral',
    features: 'USB, optical, coaxial; ES9039MSPRO; balanced outputs',
    notes: 'Excellent value mid-tier option'
  },
  {
    brand: 'SMSL',
    name: 'DO200 Pro',
    price_new: 399,
    asr_sinad: null,
    sound_signature: 'neutral',
    features: 'USB, optical, coaxial; dual ES9039MSPRO chips; balanced',
    notes: 'Pro version with dual DAC chips'
  },
  {
    brand: 'Gustard',
    name: 'X16',
    price_new: 549,
    asr_sinad: 120,
    sound_signature: 'neutral',
    features: 'USB, optical, coaxial, I2S; ES9068AS; balanced outputs',
    notes: 'Popular Gustard entry point'
  },
  {
    brand: 'Gustard',
    name: 'A18',
    price_new: 499,
    asr_sinad: null,
    sound_signature: 'neutral',
    features: 'USB, optical, coaxial; AKM AK4499EQ; balanced outputs',
    notes: 'AKM chip alternative'
  },
  {
    brand: 'Denafrips',
    name: 'Ares II',
    price_new: 849,
    asr_sinad: null,
    sound_signature: 'warm',
    features: 'R2R ladder DAC; USB, optical, coaxial; balanced outputs',
    notes: 'Entry-level R2R from Denafrips, smooth sound'
  },
  {
    brand: 'FiiO',
    name: 'K9 Pro ESS',
    price_new: 599,
    asr_sinad: null,
    sound_signature: 'neutral',
    features: 'USB, optical, coaxial, Bluetooth; ES9038PRO; remote',
    notes: 'All-in-one desktop DAC with features'
  },

  // ===== HIGH TIER ($600-$1500) =====
  {
    brand: 'Topping',
    name: 'D90SE',
    price_new: 899,
    asr_sinad: 123,
    sound_signature: 'neutral',
    features: 'USB, optical, coaxial, I2S; dual ES9038PRO; balanced',
    notes: 'Flagship Topping DAC, excellent measurements'
  },
  {
    brand: 'Topping',
    name: 'D90 III Sabre',
    price_new: 899,
    asr_sinad: null,
    sound_signature: 'neutral',
    features: 'USB, optical, coaxial; ES9039MSPRO; latest generation',
    notes: 'Newer revision with updated chipset'
  },
  {
    brand: 'RME',
    name: 'ADI-2 DAC FS',
    price_new: 1099,
    asr_sinad: 120,
    sound_signature: 'neutral',
    features: 'USB, optical, coaxial; parametric EQ; remote; display',
    notes: 'Pro-grade features, exceptional build quality and EQ'
  },
  {
    brand: 'SMSL',
    name: 'VMV D1se',
    price_new: 799,
    asr_sinad: null,
    sound_signature: 'neutral',
    features: 'USB, optical, coaxial, I2S; ES9038PRO; discrete output',
    notes: 'VMV premium line'
  },
  {
    brand: 'SMSL',
    name: 'D400 Pro',
    price_new: 619,
    asr_sinad: 132,
    sound_signature: 'neutral',
    features: 'USB, optical, coaxial; dual ES9039MSPRO; XMOS XU316',
    notes: 'Record-breaking SINAD measurements'
  },
  {
    brand: 'Gustard',
    name: 'X18',
    price_new: 849,
    asr_sinad: null,
    sound_signature: 'neutral',
    features: 'USB, I2S, optical, coaxial; dual ES9068AS; balanced',
    notes: 'Mid-tier Gustard option'
  },
  {
    brand: 'Gustard',
    name: 'X26 Pro',
    price_new: 1499,
    asr_sinad: 122,
    sound_signature: 'neutral',
    features: 'USB, I2S, optical, coaxial; dual ES9038PRO; balanced',
    notes: 'Flagship Gustard, exceptional build'
  },
  {
    brand: 'Chord',
    name: 'Mojo 2',
    price_new: 599,
    asr_sinad: null,
    sound_signature: 'warm',
    features: 'USB, optical; portable form factor; built-in battery',
    notes: 'Portable flagship, unique FPGA design'
  },
  {
    brand: 'iFi',
    name: 'NEO iDSD',
    price_new: 649,
    asr_sinad: null,
    sound_signature: 'neutral',
    features: 'USB, optical, coaxial; Burr-Brown chip; tube mode',
    notes: 'Desktop version with tube sound option'
  },
  {
    brand: 'Denafrips',
    name: 'Pontus II',
    price_new: 1799,
    asr_sinad: null,
    sound_signature: 'warm',
    features: 'R2R ladder DAC; USB, I2S, optical, coaxial; balanced',
    notes: 'Popular mid-tier R2R, natural sound'
  },

  // ===== SUMMIT TIER ($1500+) =====
  {
    brand: 'Benchmark',
    name: 'DAC3 B',
    price_new: 1899,
    asr_sinad: 121,
    sound_signature: 'neutral',
    features: 'USB, optical, coaxial, AES; ESS Sabre chip; studio grade',
    notes: 'Professional studio standard'
  },
  {
    brand: 'Chord',
    name: 'Hugo 2',
    price_new: 2595,
    asr_sinad: null,
    sound_signature: 'warm',
    features: 'USB, optical, coaxial; portable; FPGA-based; battery',
    notes: 'Flagship portable, unique sound signature'
  },
  {
    brand: 'Chord',
    name: 'Qutest',
    price_new: 1795,
    asr_sinad: null,
    sound_signature: 'warm',
    features: 'USB, optical, coaxial; desktop version of Hugo tech',
    notes: 'Desktop-only Hugo 2 alternative'
  },
  {
    brand: 'Holo Audio',
    name: 'Spring 3 KTE',
    price_new: 3999,
    asr_sinad: null,
    sound_signature: 'warm',
    features: 'R2R ladder DAC; USB, I2S, optical, coaxial; balanced',
    notes: 'High-end R2R, exceptional musicality'
  },
  {
    brand: 'Holo Audio',
    name: 'May KTE',
    price_new: 5999,
    asr_sinad: null,
    sound_signature: 'warm',
    features: 'R2R ladder DAC; USB, I2S, optical, coaxial; balanced',
    notes: 'Flagship R2R, natural timbre'
  },
  {
    brand: 'Denafrips',
    name: 'Terminator II',
    price_new: 4999,
    asr_sinad: null,
    sound_signature: 'warm',
    features: 'R2R ladder DAC; USB, I2S, optical, coaxial; balanced',
    notes: 'Flagship Denafrips, powerful sound'
  },
  {
    brand: 'Weiss',
    name: 'DAC502',
    price_new: 8500,
    asr_sinad: null,
    sound_signature: 'neutral',
    features: 'USB, AES, SPDIF; professional mastering grade',
    notes: 'Swiss precision, studio reference'
  },
  {
    brand: 'MSB Technology',
    name: 'Discrete DAC',
    price_new: 9950,
    asr_sinad: null,
    sound_signature: 'neutral',
    features: 'Modular inputs; discrete ladder DAC; balanced',
    notes: 'Modular design, American craftsmanship'
  },

  // ===== ADDITIONAL NOTABLE MODELS =====
  {
    brand: 'Audio-GD',
    name: 'R2R-11',
    price_new: 799,
    asr_sinad: null,
    sound_signature: 'warm',
    features: 'R2R ladder DAC; USB, optical, coaxial; balanced',
    notes: 'Budget R2R option'
  },
  {
    brand: 'iFi',
    name: 'Zen DAC 3',
    price_new: 199,
    asr_sinad: null,
    sound_signature: 'neutral',
    features: 'USB input; Burr-Brown chip; bass boost; desktop',
    notes: 'Popular entry-level desktop DAC'
  },
  {
    brand: 'SMSL',
    name: 'SU-9',
    price_new: 399,
    asr_sinad: 121,
    sound_signature: 'neutral',
    features: 'USB, optical, coaxial, Bluetooth; ES9038PRO; remote',
    notes: 'Mid-tier with Bluetooth and remote'
  },
  {
    brand: 'Topping',
    name: 'Centaurus R2R',
    price_new: 999,
    asr_sinad: null,
    sound_signature: 'warm',
    features: 'R2R ladder DAC; USB input; balanced outputs',
    notes: "Topping's first R2R design"
  },
];

async function queryExistingDacs() {
  console.log('📊 Querying existing DAC components from database...\n');

  const { data, error } = await supabase
    .from('components')
    .select('brand, name, price_new, asr_sinad, sound_signature, category')
    .eq('category', 'dac')
    .order('price_new', { ascending: true, nullsFirst: false });

  if (error) {
    console.error('❌ Error querying database:', error);
    return;
  }

  console.log(`Found ${data.length} existing DACs in database:\n`);
  data.forEach(dac => {
    console.log(`${dac.brand} ${dac.name} - $${dac.price_new || 'N/A'} (SINAD: ${dac.asr_sinad || 'N/A'})`);
  });

  return data;
}

async function exportDacResearch() {
  console.log('\n\n🔍 STANDALONE DAC RESEARCH (2025/2026)\n');
  console.log('=' .repeat(80));
  console.log('\nTotal DACs researched:', popularDacs.length);
  console.log('\nJSON Output:\n');

  // Export as JSON for easy import
  const jsonOutput = popularDacs.map(dac => ({
    brand: dac.brand,
    name: dac.name,
    price_new: dac.price_new,
    asr_sinad: dac.asr_sinad,
    sound_signature: dac.sound_signature,
    features: dac.features,
  }));

  console.log(JSON.stringify(jsonOutput, null, 2));

  // Show tier breakdown
  console.log('\n\n📊 TIER BREAKDOWN:\n');
  const budget = popularDacs.filter(d => d.price_new >= 50 && d.price_new < 200);
  const mid = popularDacs.filter(d => d.price_new >= 200 && d.price_new < 600);
  const high = popularDacs.filter(d => d.price_new >= 600 && d.price_new < 1500);
  const summit = popularDacs.filter(d => d.price_new >= 1500);

  console.log(`Budget ($50-$200): ${budget.length} DACs`);
  console.log(`Mid ($200-$600): ${mid.length} DACs`);
  console.log(`High ($600-$1500): ${high.length} DACs`);
  console.log(`Summit ($1500+): ${summit.length} DACs`);

  // ASR coverage
  const withSinad = popularDacs.filter(d => d.asr_sinad !== null);
  console.log(`\nASR SINAD measurements: ${withSinad.length}/${popularDacs.length} (${Math.round(withSinad.length/popularDacs.length*100)}%)`);
}

// Run queries
(async () => {
  await queryExistingDacs();
  await exportDacResearch();
})();
