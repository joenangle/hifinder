const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Inline subset of ALL_FIXES from fix-sensitivity-2026.js (full copy for spot-check)
const ALL_FIXES = [
  // SENNHEISER CANS
  { brand: 'Sennheiser', name: 'HD600', cat: 'cans', fixes: { sensitivity_db_v: 97, impedance: 300 }, native: 'db_v', source: 'Sennheiser official (1Vrms)', confidence: 'HIGH' },
  { brand: 'Sennheiser', name: 'HD650', cat: 'cans', fixes: { sensitivity_db_v: 103, impedance: 300 }, native: 'db_v', source: 'Sennheiser/Amazon/B&H/Thomann', confidence: 'HIGH' },
  { brand: 'Sennheiser', name: 'HD 660S2', cat: 'cans', fixes: { sensitivity_db_v: 104, impedance: 300 }, native: 'db_v', source: 'Thomann/Audio46', confidence: 'HIGH' },
  { brand: 'Sennheiser', name: 'HD660S', cat: 'cans', fixes: { sensitivity_db_v: 104, impedance: 150 }, native: 'db_v', source: 'Moon Audio/Bloom Audio', confidence: 'HIGH' },
  { brand: 'Sennheiser', name: 'HD 560S', cat: 'cans', fixes: { sensitivity_db_v: 110, impedance: 120 }, native: 'db_v', source: 'Sennheiser newsroom/Thomann', confidence: 'HIGH' },
  { brand: 'Sennheiser', name: 'HD800', cat: 'cans', fixes: { sensitivity_db_v: 102, impedance: 300 }, native: 'db_v', source: 'Stereophile/Sennheiser manual', confidence: 'HIGH' },
  { brand: 'Sennheiser', name: 'HD579', cat: 'cans', fixes: { sensitivity_db_v: 106, impedance: 50 }, native: 'db_v', source: 'ThePhonograph.net/Crutchfield', confidence: 'MEDIUM' },
  { brand: 'Sennheiser', name: 'HD58X', cat: 'cans', fixes: { sensitivity_db_v: 104, impedance: 150 }, native: 'db_v', source: 'Drop product page', confidence: 'HIGH' },
  { brand: 'Sennheiser', name: 'HD599', cat: 'cans', fixes: { sensitivity_db_v: 106, impedance: 50 }, native: 'db_v', source: 'Thomann/B&H', confidence: 'HIGH' },
  { brand: 'Sennheiser', name: 'HD 620S', cat: 'cans', fixes: { sensitivity_db_v: 110, impedance: 150 }, native: 'db_v', source: 'Thomann/HiFi Oasis', confidence: 'MEDIUM' },
  { brand: 'Sennheiser', name: 'HD25 Plus', cat: 'cans', fixes: { sensitivity_db_v: 120, impedance: 70 }, native: 'db_v', source: 'Sennheiser (max SPL 120dB)', confidence: 'MEDIUM' },
  { brand: 'Sennheiser', name: 'Momentum 3 Wireless', cat: 'cans', fixes: { sensitivity_db_v: 118, impedance: 100 }, native: 'db_v', source: 'Sennheiser manual PDF', confidence: 'HIGH' },
  { brand: 'Sennheiser', name: 'HD650/HD6XX', cat: 'cans', fixes: { sensitivity_db_v: 103, impedance: 300 }, native: 'db_v', source: 'Same as HD650', confidence: 'HIGH' },
  { brand: 'Sennheiser', name: 'HD800/HD800S', cat: 'cans', fixes: { sensitivity_db_v: 102, impedance: 300 }, native: 'db_v', source: 'Same as HD800', confidence: 'HIGH' },
  // BEYERDYNAMIC CANS
  { brand: 'Beyerdynamic', name: 'DT 770 Pro 80', cat: 'cans', fixes: { sensitivity_db_mw: 96, impedance: 80 }, native: 'db_mw', source: 'Beyerdynamic official/Thomann', confidence: 'HIGH' },
  { brand: 'Beyerdynamic', name: 'DT990 Pro', cat: 'cans', fixes: { sensitivity_db_mw: 96, impedance: 250 }, native: 'db_mw', source: 'Beyerdynamic official/Thomann', confidence: 'HIGH' },
  { brand: 'Beyerdynamic', name: 'DT 1990 Pro', cat: 'cans', fixes: { sensitivity_db_mw: 102, impedance: 250 }, native: 'db_mw', source: 'Beyerdynamic official (balanced pads)', confidence: 'HIGH' },
  { brand: 'Beyerdynamic', name: 'DT880 Pro', cat: 'cans', fixes: { sensitivity_db_mw: 96, impedance: 250 }, native: 'db_mw', source: 'Beyerdynamic official/Sweetwater', confidence: 'HIGH' },
  { brand: 'Beyerdynamic', name: 'DT 770 Pro X Limited', cat: 'cans', fixes: { sensitivity_db_mw: 98, sensitivity_db_v: 112, impedance: 48 }, native: 'both', source: 'Beyerdynamic official', confidence: 'HIGH' },
  { brand: 'Beyerdynamic', name: 'DT 700 Pro X', cat: 'cans', fixes: { sensitivity_db_mw: 100, sensitivity_db_v: 114, impedance: 48 }, native: 'both', source: 'Beyerdynamic official', confidence: 'HIGH' },
  { brand: 'Beyerdynamic', name: 'TYGR 300 R', cat: 'cans', fixes: { sensitivity_db_mw: 96, impedance: 32 }, native: 'db_mw', source: 'Thomann/Beyerdynamic support', confidence: 'HIGH' },
  { brand: 'Beyerdynamic', name: 'T70', cat: 'cans', fixes: { sensitivity_db_mw: 104, impedance: 250 }, native: 'db_mw', source: 'Beyerdynamic spec sheet PDF', confidence: 'HIGH' },
  { brand: 'Beyerdynamic', name: 'T5p (1st Gen)', cat: 'cans', fixes: { sensitivity_db_mw: 102, impedance: 32 }, native: 'db_mw', source: 'Head-Fi/The Absolute Sound', confidence: 'HIGH' },
  { brand: 'Beyerdynamic', name: 'DT880 (600Ω)', cat: 'cans', fixes: { sensitivity_db_mw: 96, impedance: 600 }, native: 'db_mw', source: 'Beyerdynamic official/Amazon', confidence: 'HIGH' },
  // AKG CANS
  { brand: 'AKG', name: 'K240 Studio', cat: 'cans', fixes: { sensitivity_db_v: 104, impedance: 55 }, native: 'db_v', source: 'AKG official spec sheet PDF', confidence: 'HIGH' },
  { brand: 'AKG', name: 'K702', cat: 'cans', fixes: { sensitivity_db_v: 105, impedance: 62 }, native: 'db_v', source: 'AKG official', confidence: 'HIGH' },
  { brand: 'AKG', name: 'K612 Pro', cat: 'cans', fixes: { sensitivity_db_v: 101, impedance: 120 }, native: 'db_v', source: 'AKG official/spec sheet PDF', confidence: 'HIGH' },
  { brand: 'AKG', name: 'K701', cat: 'cans', fixes: { sensitivity_db_v: 105, impedance: 62 }, native: 'db_v', source: 'AKG official', confidence: 'HIGH' },
  { brand: 'AKG', name: 'K371', cat: 'cans', fixes: { sensitivity_db_v: 114, impedance: 32 }, native: 'db_v', source: 'AKG official/sell sheet PDF', confidence: 'HIGH' },
  { brand: 'AKG', name: 'K712 Pro', cat: 'cans', fixes: { sensitivity_db_v: 105, impedance: 62 }, native: 'db_v', source: 'AKG official', confidence: 'HIGH' },
  { brand: 'AKG', name: 'K240 MKII', cat: 'cans', fixes: { sensitivity_db_v: 104, impedance: 55 }, native: 'db_v', source: 'AKG official/spec sheet', confidence: 'HIGH' },
  { brand: 'AKG', name: 'K361', cat: 'cans', fixes: { sensitivity_db_v: 114, impedance: 32 }, native: 'db_v', source: 'AKG official/sell sheet', confidence: 'HIGH' },
  // HIFIMAN CANS
  { brand: 'Hifiman', name: 'Sundara', cat: 'cans', fixes: { sensitivity_db_mw: 94, impedance: 37 }, native: 'db_mw', source: 'HIFIMAN/Bloom Audio', confidence: 'MEDIUM' },
  { brand: 'HiFiMAN', name: 'Sundara (2020)', cat: 'cans', fixes: { sensitivity_db_mw: 94, impedance: 37 }, native: 'db_mw', source: 'Same as Sundara', confidence: 'MEDIUM' },
  { brand: 'Hifiman', name: 'Arya Organic', cat: 'cans', fixes: { sensitivity_db_mw: 94, impedance: 16 }, native: 'db_mw', source: 'HIFIMAN official/Bloom Audio', confidence: 'HIGH' },
  { brand: 'Hifiman', name: 'Edition XS', cat: 'cans', fixes: { sensitivity_db_mw: 92, impedance: 18 }, native: 'db_mw', source: 'HIFIMAN official/Amazon', confidence: 'HIGH' },
  { brand: 'Hifiman', name: 'HE1000se', cat: 'cans', fixes: { sensitivity_db_mw: 96, impedance: 35 }, native: 'db_mw', source: 'HIFIMAN official/Amazon', confidence: 'HIGH' },
  { brand: 'HiFiMAN', name: 'Ananda', cat: 'cans', fixes: { sensitivity_db_mw: 103, impedance: 25 }, native: 'db_mw', source: 'Amazon/Soundphile Review', confidence: 'HIGH' },
  { brand: 'HiFiMAN', name: 'Arya Stealth', cat: 'cans', fixes: { sensitivity_db_mw: 94, impedance: 32 }, native: 'db_mw', source: 'HIFIMAN official/Bloom Audio', confidence: 'HIGH' },
  { brand: 'HiFiMAN', name: 'Susvara', cat: 'cans', fixes: { sensitivity_db_mw: 83, impedance: 60 }, native: 'db_mw', source: 'HIFIMAN official/Headphones.com', confidence: 'HIGH' },
  { brand: 'HiFiMAN', name: 'HE400se', cat: 'cans', fixes: { sensitivity_db_mw: 91, impedance: 32 }, native: 'db_mw', source: 'HIFIMAN official/Headfonics', confidence: 'HIGH' },
  { brand: 'Hifiman', name: 'HE-R10D', cat: 'cans', fixes: { sensitivity_db_mw: 103, impedance: 60 }, native: 'db_mw', source: 'HIFIMAN official (60Ω not 32)', confidence: 'HIGH' },
  // AUDEZE CANS
  { brand: 'Audeze', name: 'LCD-4', cat: 'cans', fixes: { sensitivity_db_mw: 97, impedance: 200 }, native: 'db_mw', source: 'Audeze official/Stereophile/B&H', confidence: 'HIGH' },
  { brand: 'Audeze', name: 'LCD-XC', cat: 'cans', fixes: { sensitivity_db_mw: 100, impedance: 20 }, native: 'db_mw', source: 'Audeze official/Bloom Audio', confidence: 'HIGH' },
  { brand: 'Audeze', name: 'MM-500', cat: 'cans', fixes: { sensitivity_db_mw: 100, impedance: 18 }, native: 'db_mw', source: 'Audeze official/Bloom Audio', confidence: 'HIGH' },
  { brand: 'Audeze', name: 'LCD-X', cat: 'cans', fixes: { sensitivity_db_mw: 103, impedance: 20 }, native: 'db_mw', source: 'Audeze official/Amazon', confidence: 'HIGH' },
  // FOCAL CANS
  { brand: 'Focal', name: 'Utopia (2022)', cat: 'cans', fixes: { sensitivity_db_mw: 104, impedance: 80 }, native: 'db_mw', source: 'Focal official', confidence: 'HIGH' },
  { brand: 'Focal', name: 'Stellia', cat: 'cans', fixes: { sensitivity_db_mw: 106, impedance: 35 }, native: 'db_mw', source: 'Focal official/Headphones.com', confidence: 'HIGH' },
  { brand: 'Focal', name: 'Clear Mg', cat: 'cans', fixes: { sensitivity_db_mw: 104, impedance: 55 }, native: 'db_mw', source: 'Focal official/Moon Audio', confidence: 'HIGH' },
  { brand: 'Focal', name: 'Celestee', cat: 'cans', fixes: { sensitivity_db_mw: 105, impedance: 35 }, native: 'db_mw', source: 'Focal official/SoundStage', confidence: 'HIGH' },
  // AUDIO-TECHNICA CANS
  { brand: 'Audio-Technica', name: 'ATH-M50x', cat: 'cans', fixes: { sensitivity_db_mw: 99, impedance: 38 }, native: 'db_mw', source: 'Audio-Technica official', confidence: 'HIGH' },
  { brand: 'Audio Technica', name: 'ATH-R70x', cat: 'cans', fixes: { sensitivity_db_mw: 98, impedance: 470 }, native: 'db_mw', source: 'Audio-Technica official', confidence: 'HIGH' },
  { brand: 'Audio Technica', name: 'ATH-ADX5000', cat: 'cans', fixes: { sensitivity_db_mw: 100, impedance: 420 }, native: 'db_mw', source: 'Audio-Technica official', confidence: 'HIGH' },
  // SONY CANS
  { brand: 'Sony', name: 'MDR-Z1R', cat: 'cans', fixes: { sensitivity_db_mw: 100, impedance: 64 }, native: 'db_mw', source: 'Sony UK official', confidence: 'HIGH' },
  { brand: 'Sony', name: 'MDR-7506', cat: 'cans', fixes: { sensitivity_db_mw: 106, impedance: 63 }, native: 'db_mw', source: 'Sony Pro official', confidence: 'HIGH' },
  // ZMF CANS
  { brand: 'ZMF', name: 'Caldera', cat: 'cans', fixes: { sensitivity_db_mw: 95 }, native: 'db_mw', source: 'ZMF official shop (~95dB)', confidence: 'HIGH' },
  { brand: 'ZMF', name: 'Verite', cat: 'cans', fixes: { sensitivity_db_mw: 97, impedance: 300 }, native: 'db_mw', source: 'ZMF official shop (~97dB)', confidence: 'HIGH' },
  { brand: 'ZMF', name: 'Auteur', cat: 'cans', fixes: { sensitivity_db_mw: 96, impedance: 300 }, native: 'db_mw', source: 'ZMF official shop (~96dB)', confidence: 'HIGH' },
  // DAN CLARK AUDIO
  { brand: 'Dan Clark Audio', name: 'Stealth', cat: 'cans', fixes: { sensitivity_db_mw: 87, impedance: 23 }, native: 'db_mw', source: 'Headphones.com/Headfonics', confidence: 'MEDIUM' },
  { brand: 'Dan Clark Audio', name: 'Expanse', cat: 'cans', fixes: { sensitivity_db_mw: 87, impedance: 23 }, native: 'db_mw', source: 'DCA official/Headfonics', confidence: 'MEDIUM' },
  // OTHER CANS
  { brand: 'Meze', name: '109 Pro', cat: 'cans', fixes: { sensitivity_db_mw: 112, impedance: 40 }, native: 'db_mw', source: 'Meze Audio official', confidence: 'HIGH' },
  { brand: 'Meze', name: '99 Classics', cat: 'cans', fixes: { sensitivity_db_mw: 103, impedance: 32 }, native: 'db_mw', source: 'Meze Audio official', confidence: 'HIGH' },
  { brand: 'Final', name: 'D8000 Pro', cat: 'cans', fixes: { sensitivity_db_mw: 98, impedance: 60 }, native: 'db_mw', source: 'Final official', confidence: 'HIGH' },
  { brand: 'Grado', name: 'SR80x', cat: 'cans', fixes: { sensitivity_db_mw: 99.8, impedance: 38 }, native: 'db_mw', source: 'Grado Labs official', confidence: 'HIGH' },
  { brand: 'Shure', name: 'SRH1540', cat: 'cans', fixes: { sensitivity_db_mw: 99, impedance: 46 }, native: 'db_mw', source: 'Shure official spec sheet PDF', confidence: 'HIGH' },
  { brand: 'Moondrop', name: 'Void', cat: 'cans', fixes: { sensitivity_db_v: 110, impedance: 64 }, native: 'db_v', source: 'Moondrop official (dB/Vrms)', confidence: 'HIGH' },

  // IEMS
  { brand: 'Moondrop', name: 'Aria', cat: 'iems', fixes: { sensitivity_db_v: 122, impedance: 32 }, native: 'db_v', source: 'Moondrop official', confidence: 'HIGH' },
  { brand: 'Moondrop', name: 'Blessing 2', cat: 'iems', fixes: { sensitivity_db_v: 117, impedance: 22 }, native: 'db_v', source: 'Moondrop official', confidence: 'HIGH' },
  { brand: 'Moondrop', name: 'Kato', cat: 'iems', fixes: { sensitivity_db_v: 123, impedance: 32 }, native: 'db_v', source: 'Moondrop official', confidence: 'HIGH' },
  { brand: 'Moondrop', name: 'Variations', cat: 'iems', fixes: { sensitivity_db_v: 118, impedance: 15 }, native: 'db_v', source: 'Moondrop official', confidence: 'HIGH' },
  { brand: 'Moondrop', name: 'Chu', cat: 'iems', fixes: { sensitivity_db_v: 120, impedance: 28 }, native: 'db_v', source: 'Moondrop official (28Ω not 32)', confidence: 'HIGH' },
  { brand: 'Moondrop', name: 'CHU 2', cat: 'iems', fixes: { sensitivity_db_v: 119, impedance: 18 }, native: 'db_v', source: 'Moondrop official (18Ω not 32)', confidence: 'HIGH' },
  { brand: 'Sennheiser', name: 'IE600', cat: 'iems', fixes: { sensitivity_db_v: 118, impedance: 18 }, native: 'db_v', source: 'Crutchfield/Sennheiser', confidence: 'HIGH' },
  { brand: 'Sennheiser', name: 'IE900', cat: 'iems', fixes: { sensitivity_db_v: 123, impedance: 16 }, native: 'db_v', source: 'Headphones.com/Sennheiser', confidence: 'HIGH' },
  { brand: 'Sennheiser', name: 'IE800S', cat: 'iems', fixes: { sensitivity_db_v: 125, impedance: 16 }, native: 'db_v', source: 'Sennheiser official', confidence: 'HIGH' },
  { brand: 'Sony', name: 'IER-Z1R', cat: 'iems', fixes: { sensitivity_db_mw: 103, impedance: 40 }, native: 'db_mw', source: 'Sony Asia Pacific official', confidence: 'HIGH' },
  { brand: 'Sony', name: 'IER-M9', cat: 'iems', fixes: { sensitivity_db_mw: 103, impedance: 20 }, native: 'db_mw', source: 'Sony Asia Pacific official', confidence: 'HIGH' },
  { brand: 'Etymotic', name: 'ER2SE/ER2XR', cat: 'iems', fixes: { sensitivity_db_mw: 96, impedance: 15 }, native: 'db_mw', source: 'Etymotic official', confidence: 'HIGH' },
  { brand: 'Etymotic', name: 'ER4XR', cat: 'iems', fixes: { sensitivity_db_mw: 98, impedance: 45 }, native: 'db_mw', source: 'Etymotic official', confidence: 'HIGH' },
  { brand: 'FiiO', name: 'FH9', cat: 'iems', fixes: { sensitivity_db_mw: 108, impedance: 18 }, native: 'db_mw', source: 'FiiO official', confidence: 'HIGH' },
  { brand: 'FiiO', name: 'FD5', cat: 'iems', fixes: { sensitivity_db_mw: 109, impedance: 32 }, native: 'db_mw', source: 'FiiO official', confidence: 'HIGH' },
  { brand: 'Truthear', name: 'Zero RED', cat: 'iems', fixes: { sensitivity_db_v: 117.5, impedance: 18 }, native: 'db_v', source: 'Truthear official (17.5Ω)', confidence: 'HIGH' },
  { brand: 'Truthear', name: 'NOVA', cat: 'iems', fixes: { sensitivity_db_v: 123, impedance: 15 }, native: 'db_v', source: 'Truthear official (14.8Ω)', confidence: 'HIGH' },
  { brand: 'Truthear', name: 'HEXA', cat: 'iems', fixes: { sensitivity_db_v: 120, impedance: 21 }, native: 'db_v', source: 'Truthear official (20.5Ω)', confidence: 'HIGH' },
  { brand: 'Simgot', name: 'EA1000 Fermat', cat: 'iems', fixes: { sensitivity_db_v: 127, impedance: 16 }, native: 'db_v', source: 'Simgot official', confidence: 'HIGH' },
  { brand: 'Thieaudio', name: 'Monarch Mk3', cat: 'iems', fixes: { sensitivity_db_v: 99, impedance: 20 }, native: 'db_v', source: 'ThieAudio official (20Ω not 22)', confidence: 'HIGH' },
  { brand: 'Thieaudio', name: 'Monarch MK4', cat: 'iems', fixes: { sensitivity_db_v: 100, impedance: 11 }, native: 'db_v', source: 'ThieAudio official (10.9Ω not 22)', confidence: 'HIGH' },
  { brand: 'Thieaudio', name: 'HYPE 4', cat: 'iems', fixes: { sensitivity_db_v: 105, impedance: 17 }, native: 'db_v', source: 'ThieAudio official (17Ω not 22)', confidence: 'HIGH' },
  { brand: 'Campfire Audio', name: 'Mammoth', cat: 'iems', fixes: { sensitivity_db_mw: 94, impedance: 8 }, native: 'db_mw', source: 'Headfonics (non-standard CA format)', confidence: 'MEDIUM' },
  { brand: 'Letshuoer', name: 'S12 Pro', cat: 'iems', fixes: { sensitivity_db_mw: 102, impedance: 16 }, native: 'db_mw', source: 'Letshuoer official', confidence: 'HIGH' },
  { brand: '7Hz', name: 'Timeless', cat: 'iems', fixes: { sensitivity_db_v: 104, impedance: 15 }, native: 'db_v', source: 'ShenZhenAudio', confidence: 'MEDIUM' },
  { brand: 'Kiwi Ears', name: 'Astral', cat: 'iems', fixes: { sensitivity_db_v: 105, impedance: 23 }, native: 'db_v', source: 'Kiwi Ears official (23Ω not 32)', confidence: 'HIGH' },
  { brand: 'Kiwi Ears', name: 'HBB PUNCH', cat: 'iems', fixes: { sensitivity_db_v: 98, impedance: 12 }, native: 'db_v', source: 'Kiwi Ears official (12Ω not 32)', confidence: 'HIGH' },
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function fmt(val) {
  if (val === null || val === undefined) return 'null';
  if (typeof val === 'string') return `"${val}"`;
  return String(val);
}

async function spotCheck() {
  const cansFixes = ALL_FIXES.filter(f => f.cat === 'cans');
  const iemsFixes = ALL_FIXES.filter(f => f.cat === 'iems');
  const cansSample = shuffle(cansFixes).slice(0, 3);
  const iemsSample = shuffle(iemsFixes).slice(0, 3);

  console.log('\n' + '='.repeat(80));
  console.log('  SENSITIVITY SPOT CHECK: 3 cans + 3 IEMs (random)');
  console.log('  All relevant fields shown. >> = being changed.');
  console.log('  Native format noted (which value comes from manufacturer).');
  console.log('='.repeat(80));

  const fields = ['price_new', 'budget_tier', 'impedance', 'sensitivity_db_mw',
                   'sensitivity_db_v', 'sound_signature', 'driver_type'];

  for (const [label, sample] of [['HEADPHONES', cansSample], ['IEMS', iemsSample]]) {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`  ${label} (${sample.length} sampled)`);
    console.log(`${'─'.repeat(80)}`);

    for (const f of sample) {
      const { data } = await supabase.from('components')
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

      // Compute what the fix script will write (including derivations)
      const proposed = { ...f.fixes };
      const z = proposed.impedance || entry.impedance;
      if (z && z > 0) {
        const factor = 10 * Math.log10(z / 1000);
        if (proposed.sensitivity_db_mw && !proposed.sensitivity_db_v) {
          proposed._derived_db_v = Math.round((proposed.sensitivity_db_mw - factor) * 10) / 10;
        }
        if (proposed.sensitivity_db_v && !proposed.sensitivity_db_mw) {
          proposed._derived_db_mw = Math.round((proposed.sensitivity_db_v + factor) * 10) / 10;
        }
      }

      console.log(`\n  ┌─ ${f.brand} ${f.name}  [${f.confidence}]`);
      console.log(`  │  Native format: ${f.native === 'db_mw' ? 'dB/mW' : f.native === 'db_v' ? 'dB/V' : 'both'}`);
      console.log(`  │`);

      for (const field of fields) {
        const currentVal = entry[field];
        const isDirectFix = proposed[field] !== undefined;
        const isDerivedMw = field === 'sensitivity_db_mw' && proposed._derived_db_mw !== undefined;
        const isDerivedV = field === 'sensitivity_db_v' && proposed._derived_db_v !== undefined;
        const isChanging = isDirectFix || isDerivedMw || isDerivedV;

        let newVal = currentVal;
        if (isDirectFix) newVal = proposed[field];
        else if (isDerivedMw) newVal = proposed._derived_db_mw;
        else if (isDerivedV) newVal = proposed._derived_db_v;

        const different = currentVal !== newVal;

        if (isChanging && different) {
          const suffix = (isDerivedMw || isDerivedV) ? ' (derived)' : (field === 'sensitivity_db_mw' || field === 'sensitivity_db_v') ? ' (mfg spec)' : '';
          console.log(`  │  >> ${field.padEnd(20)} ${fmt(currentVal)}  -->  ${fmt(newVal)}${suffix}`);
        } else {
          console.log(`  │     ${field.padEnd(20)} ${fmt(currentVal)}`);
        }
      }

      console.log(`  │`);
      console.log(`  │  Source: ${f.source}`);

      const q = encodeURIComponent(`${f.brand} ${f.name}`);
      console.log(`  │`);
      console.log(`  │  Verify:`);
      console.log(`  │     Mfg specs:     https://www.google.com/search?q=${q}+sensitivity+impedance+specifications`);
      console.log(`  │     dB format:     https://www.google.com/search?q=${q}+sensitivity+dB+mW+OR+dB+V+specs`);
      console.log(`  └${'─'.repeat(79)}`);
    }
  }

  console.log(`\n${'='.repeat(80)}`);
  console.log('  >> = field being changed    (mfg spec) = from manufacturer    (derived) = calculated');
  console.log('');
  console.log('  When satisfied, run:');
  console.log('    node scripts/fix-sensitivity-2026.js --execute');
  console.log('='.repeat(80) + '\n');
}

spotCheck().catch(console.error);
