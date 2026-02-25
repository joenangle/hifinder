/**
 * fix-sensitivity-2026.js — Add verified sensitivity data to cans & IEMs
 *
 * Every value below was researched from manufacturer spec pages, authorized
 * retailers, or trusted reviewer measurements. Sources noted per entry.
 *
 * Sensitivity format varies by manufacturer:
 *   - dB/mW: Beyerdynamic, Audio-Technica, Focal, Sony, Audeze, ZMF, Grado, etc.
 *   - dB/V:  Sennheiser, AKG, Austrian Audio, Moondrop, Truthear, Simgot, etc.
 *
 * When only one format is provided by manufacturer, the other is derived:
 *   dB/V = dB/mW - 10*log10(Z/1000)  (where Z = impedance in ohms)
 *   dB/mW = dB/V + 10*log10(Z/1000)
 *
 * Note: 10*log10(Z/1000) is negative for Z < 1000Ω (all headphones/IEMs),
 * so dB/V > dB/mW for low impedance, and dB/V < dB/mW for high impedance.
 *
 * Usage:
 *   node scripts/fix-sensitivity-2026.js            # Dry run (preview)
 *   node scripts/fix-sensitivity-2026.js --execute   # Apply changes
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const EXECUTE = process.argv.includes('--execute');

// Helper: derive the missing sensitivity format
function deriveSensitivity(entry) {
  const z = entry.impedance;
  if (!z || z <= 0) return entry;
  const factor = 10 * Math.log10(z / 1000);
  if (entry.sensitivity_db_mw !== null && entry.sensitivity_db_v === null) {
    // dB/V = dB/mW - 10*log10(Z/1000)
    entry.sensitivity_db_v = Math.round((entry.sensitivity_db_mw - factor) * 10) / 10;
  } else if (entry.sensitivity_db_v !== null && entry.sensitivity_db_mw === null) {
    // dB/mW = dB/V + 10*log10(Z/1000)
    entry.sensitivity_db_mw = Math.round((entry.sensitivity_db_v + factor) * 10) / 10;
  }
  return entry;
}

// ============================================================
// ALL SENSITIVITY FIXES
// Each: { brand, name, cat, fixes: { sensitivity_db_mw, sensitivity_db_v, impedance? }, source, confidence }
//
// "native" field indicates which value came directly from manufacturer
// The other is derived via the formula above
// ============================================================

const ALL_FIXES = [

  // ======================== SENNHEISER CANS (native: dB/V) ========================

  { brand: 'Sennheiser', name: 'HD600', cat: 'cans',
    fixes: { sensitivity_db_v: 97, impedance: 300 },
    native: 'db_v', source: 'Sennheiser official (1Vrms)', confidence: 'HIGH' },

  { brand: 'Sennheiser', name: 'HD650', cat: 'cans',
    fixes: { sensitivity_db_v: 103, impedance: 300 },
    native: 'db_v', source: 'Sennheiser/Amazon/B&H/Thomann', confidence: 'HIGH' },

  { brand: 'Sennheiser', name: 'HD 660S2', cat: 'cans',
    fixes: { sensitivity_db_v: 104, impedance: 300 },
    native: 'db_v', source: 'Thomann/Audio46', confidence: 'HIGH' },

  { brand: 'Sennheiser', name: 'HD660S', cat: 'cans',
    fixes: { sensitivity_db_v: 104, impedance: 150 },
    native: 'db_v', source: 'Moon Audio/Bloom Audio', confidence: 'HIGH' },

  { brand: 'Sennheiser', name: 'HD 560S', cat: 'cans',
    fixes: { sensitivity_db_v: 110, impedance: 120 },
    native: 'db_v', source: 'Sennheiser newsroom/Thomann', confidence: 'HIGH' },

  { brand: 'Sennheiser', name: 'HD800', cat: 'cans',
    fixes: { sensitivity_db_v: 102, impedance: 300 },
    native: 'db_v', source: 'Stereophile/Sennheiser HD800S manual', confidence: 'HIGH' },

  { brand: 'Sennheiser', name: 'HD579', cat: 'cans',
    fixes: { sensitivity_db_v: 106, impedance: 50 },
    native: 'db_v', source: 'ThePhonograph.net/Crutchfield', confidence: 'MEDIUM' },

  { brand: 'Sennheiser', name: 'HD58X', cat: 'cans',
    fixes: { sensitivity_db_v: 104, impedance: 150 },
    native: 'db_v', source: 'Drop product page/Sennheiser newsroom', confidence: 'HIGH' },

  { brand: 'Sennheiser', name: 'HD599', cat: 'cans',
    fixes: { sensitivity_db_v: 106, impedance: 50 },
    native: 'db_v', source: 'Thomann/B&H Photo', confidence: 'HIGH' },

  { brand: 'Sennheiser', name: 'HD 620S', cat: 'cans',
    fixes: { sensitivity_db_v: 110, impedance: 150 },
    native: 'db_v', source: 'Thomann/HiFi Oasis (105-110 range, using 110)', confidence: 'MEDIUM' },

  { brand: 'Sennheiser', name: 'HD25 Plus', cat: 'cans',
    fixes: { sensitivity_db_v: 120, impedance: 70 },
    native: 'db_v', source: 'Sennheiser (max SPL 120dB @ 1Vrms)', confidence: 'MEDIUM' },

  { brand: 'Sennheiser', name: 'Momentum 3 Wireless', cat: 'cans',
    fixes: { sensitivity_db_v: 118, impedance: 100 },
    native: 'db_v', source: 'Sennheiser manual PDF (passive mode)', confidence: 'HIGH' },

  // HD650/HD6XX and HD800/HD800S duplicates in DB
  { brand: 'Sennheiser', name: 'HD650/HD6XX', cat: 'cans',
    fixes: { sensitivity_db_v: 103, impedance: 300 },
    native: 'db_v', source: 'Same as HD650', confidence: 'HIGH' },

  { brand: 'Sennheiser', name: 'HD800/HD800S', cat: 'cans',
    fixes: { sensitivity_db_v: 102, impedance: 300 },
    native: 'db_v', source: 'Same as HD800', confidence: 'HIGH' },

  // ======================== BEYERDYNAMIC CANS (native: dB/mW) ========================

  { brand: 'Beyerdynamic', name: 'DT 770 Pro 80', cat: 'cans',
    fixes: { sensitivity_db_mw: 96, impedance: 80 },
    native: 'db_mw', source: 'Beyerdynamic official/Thomann', confidence: 'HIGH' },

  { brand: 'Beyerdynamic', name: 'DT990 Pro', cat: 'cans',
    fixes: { sensitivity_db_mw: 96, impedance: 250 },
    native: 'db_mw', source: 'Beyerdynamic official/Thomann', confidence: 'HIGH' },

  { brand: 'Beyerdynamic', name: 'DT 1990 Pro', cat: 'cans',
    fixes: { sensitivity_db_mw: 102, impedance: 250 },
    native: 'db_mw', source: 'Beyerdynamic official (balanced pads)', confidence: 'HIGH' },

  { brand: 'Beyerdynamic', name: 'DT880 Pro', cat: 'cans',
    fixes: { sensitivity_db_mw: 96, impedance: 250 },
    native: 'db_mw', source: 'Beyerdynamic official/Sweetwater', confidence: 'HIGH' },

  { brand: 'Beyerdynamic', name: 'DT 770 Pro X Limited', cat: 'cans',
    fixes: { sensitivity_db_mw: 98, sensitivity_db_v: 112, impedance: 48 },
    native: 'both', source: 'Beyerdynamic official (both formats)', confidence: 'HIGH' },

  { brand: 'Beyerdynamic', name: 'DT 700 Pro X', cat: 'cans',
    fixes: { sensitivity_db_mw: 100, sensitivity_db_v: 114, impedance: 48 },
    native: 'both', source: 'Beyerdynamic official (both formats)', confidence: 'HIGH' },

  { brand: 'Beyerdynamic', name: 'TYGR 300 R', cat: 'cans',
    fixes: { sensitivity_db_mw: 96, impedance: 32 },
    native: 'db_mw', source: 'Thomann/Beyerdynamic support', confidence: 'HIGH' },

  { brand: 'Beyerdynamic', name: 'T70', cat: 'cans',
    fixes: { sensitivity_db_mw: 104, impedance: 250 },
    native: 'db_mw', source: 'Beyerdynamic spec sheet PDF', confidence: 'HIGH' },

  { brand: 'Beyerdynamic', name: 'T5p (1st Gen)', cat: 'cans',
    fixes: { sensitivity_db_mw: 102, impedance: 32 },
    native: 'db_mw', source: 'Head-Fi/The Absolute Sound', confidence: 'HIGH' },

  { brand: 'Beyerdynamic', name: 'DT880 (600Ω)', cat: 'cans',
    fixes: { sensitivity_db_mw: 96, impedance: 600 },
    native: 'db_mw', source: 'Beyerdynamic official/Amazon', confidence: 'HIGH' },

  // ======================== AKG CANS (native: dB/V) ========================

  { brand: 'AKG', name: 'K240 Studio', cat: 'cans',
    fixes: { sensitivity_db_v: 104, impedance: 55 },
    native: 'db_v', source: 'AKG official spec sheet PDF', confidence: 'HIGH' },

  { brand: 'AKG', name: 'K702', cat: 'cans',
    fixes: { sensitivity_db_v: 105, impedance: 62 },
    native: 'db_v', source: 'AKG official product page', confidence: 'HIGH' },

  { brand: 'AKG', name: 'K612 Pro', cat: 'cans',
    fixes: { sensitivity_db_v: 101, impedance: 120 },
    native: 'db_v', source: 'AKG official/spec sheet PDF', confidence: 'HIGH' },

  { brand: 'AKG', name: 'K701', cat: 'cans',
    fixes: { sensitivity_db_v: 105, impedance: 62 },
    native: 'db_v', source: 'AKG official product page', confidence: 'HIGH' },

  { brand: 'AKG', name: 'K371', cat: 'cans',
    fixes: { sensitivity_db_v: 114, impedance: 32 },
    native: 'db_v', source: 'AKG official/sell sheet PDF', confidence: 'HIGH' },

  { brand: 'AKG', name: 'K712 Pro', cat: 'cans',
    fixes: { sensitivity_db_v: 105, impedance: 62 },
    native: 'db_v', source: 'AKG official product page', confidence: 'HIGH' },

  { brand: 'AKG', name: 'K240 MKII', cat: 'cans',
    fixes: { sensitivity_db_v: 104, impedance: 55 },
    native: 'db_v', source: 'AKG official/spec sheet PDF', confidence: 'HIGH' },

  { brand: 'AKG', name: 'K361', cat: 'cans',
    fixes: { sensitivity_db_v: 114, impedance: 32 },
    native: 'db_v', source: 'AKG official/sell sheet PDF', confidence: 'HIGH' },

  // ======================== HIFIMAN CANS (native: dB/mW, per convention) ========================

  { brand: 'Hifiman', name: 'Sundara', cat: 'cans',
    fixes: { sensitivity_db_mw: 94, impedance: 37 },
    native: 'db_mw', source: 'HIFIMAN official/Bloom Audio (widely-sold revision)', confidence: 'MEDIUM' },

  { brand: 'HiFiMAN', name: 'Sundara (2020)', cat: 'cans',
    fixes: { sensitivity_db_mw: 94, impedance: 37 },
    native: 'db_mw', source: 'Same as Sundara', confidence: 'MEDIUM' },

  { brand: 'Hifiman', name: 'HE400i (2020)', cat: 'cans',
    fixes: { sensitivity_db_mw: 93, impedance: 35 },
    native: 'db_mw', source: 'HIFIMAN official/TechPowerUp', confidence: 'HIGH' },

  { brand: 'Hifiman', name: 'Arya', cat: 'cans',
    fixes: { sensitivity_db_mw: 90, impedance: 35 },
    native: 'db_mw', source: 'HIFIMAN official', confidence: 'HIGH' },

  { brand: 'Hifiman', name: 'Arya Organic', cat: 'cans',
    fixes: { sensitivity_db_mw: 94, impedance: 16 },
    native: 'db_mw', source: 'HIFIMAN official/Bloom Audio', confidence: 'HIGH' },

  { brand: 'Hifiman', name: 'Edition XS', cat: 'cans',
    fixes: { sensitivity_db_mw: 92, impedance: 18 },
    native: 'db_mw', source: 'HIFIMAN official/Amazon', confidence: 'HIGH' },

  { brand: 'Hifiman', name: 'HE1000se', cat: 'cans',
    fixes: { sensitivity_db_mw: 96, impedance: 35 },
    native: 'db_mw', source: 'HIFIMAN official/Amazon', confidence: 'HIGH' },

  { brand: 'Hifiman', name: 'HE1000', cat: 'cans',
    fixes: { sensitivity_db_mw: 90, impedance: 35 },
    native: 'db_mw', source: 'HIFIMAN official', confidence: 'HIGH' },

  { brand: 'Hifiman', name: 'Edition X V2', cat: 'cans',
    fixes: { sensitivity_db_mw: 103, impedance: 25 },
    native: 'db_mw', source: 'HIFIMAN official/Headfonics', confidence: 'HIGH' },

  { brand: 'Hifiman', name: 'HE6se', cat: 'cans',
    fixes: { sensitivity_db_mw: 83.5, impedance: 50 },
    native: 'db_mw', source: 'HIFIMAN official/SoundStage', confidence: 'HIGH' },

  { brand: 'Hifiman', name: 'HE6', cat: 'cans',
    fixes: { sensitivity_db_mw: 83.5, impedance: 50 },
    native: 'db_mw', source: 'HIFIMAN official', confidence: 'HIGH' },

  { brand: 'Hifiman', name: 'Deva Pro', cat: 'cans',
    fixes: { sensitivity_db_mw: 93.5, impedance: 18 },
    native: 'db_mw', source: 'HIFIMAN official/Soundphile Review', confidence: 'HIGH' },

  { brand: 'Hifiman', name: 'HE560', cat: 'cans',
    fixes: { sensitivity_db_mw: 90, impedance: 45 },
    native: 'db_mw', source: 'HIFIMAN official (45Ω, not 50Ω)', confidence: 'HIGH' },

  { brand: 'Hifiman', name: 'HE500', cat: 'cans',
    fixes: { sensitivity_db_mw: 89, impedance: 38 },
    native: 'db_mw', source: 'Head-Fi/The Absolute Sound', confidence: 'HIGH' },

  { brand: 'Hifiman', name: 'HE-R10D', cat: 'cans',
    fixes: { sensitivity_db_mw: 103, impedance: 60 },
    native: 'db_mw', source: 'HIFIMAN official/Bloom Audio (60Ω, not 32Ω)', confidence: 'HIGH' },

  { brand: 'HiFiMAN', name: 'HE400se', cat: 'cans',
    fixes: { sensitivity_db_mw: 91, impedance: 32 },
    native: 'db_mw', source: 'HIFIMAN official/Headfonics', confidence: 'HIGH' },

  { brand: 'HiFiMAN', name: 'Ananda', cat: 'cans',
    fixes: { sensitivity_db_mw: 103, impedance: 25 },
    native: 'db_mw', source: 'Amazon/Soundphile Review', confidence: 'HIGH' },

  { brand: 'HiFiMAN', name: 'Arya Stealth', cat: 'cans',
    fixes: { sensitivity_db_mw: 94, impedance: 32 },
    native: 'db_mw', source: 'HIFIMAN official/Bloom Audio', confidence: 'HIGH' },

  { brand: 'HiFiMAN', name: 'Susvara', cat: 'cans',
    fixes: { sensitivity_db_mw: 83, impedance: 60 },
    native: 'db_mw', source: 'HIFIMAN official/Headphones.com', confidence: 'HIGH' },

  { brand: 'Hifiman', name: 'HE5SE', cat: 'cans',
    fixes: { sensitivity_db_mw: 92, impedance: 40 },
    native: 'db_mw', source: 'HIFIMAN official/Major HiFi', confidence: 'HIGH' },

  { brand: 'Hifiman', name: 'Deva', cat: 'cans',
    fixes: { sensitivity_db_mw: 93.5, impedance: 18 },
    native: 'db_mw', source: 'HIFIMAN official/Headfonics', confidence: 'HIGH' },

  // ======================== AUDEZE CANS (native: dB/mW at DRP) ========================

  { brand: 'Audeze', name: 'LCD-4', cat: 'cans',
    fixes: { sensitivity_db_mw: 97, impedance: 200 },
    native: 'db_mw', source: 'Audeze official/Stereophile/B&H', confidence: 'HIGH' },

  { brand: 'Audeze', name: 'LCD-24', cat: 'cans',
    fixes: { sensitivity_db_mw: 96, impedance: 15 },
    native: 'db_mw', source: 'Audeze official/B&H', confidence: 'HIGH' },

  { brand: 'Audeze', name: 'LCD-XC', cat: 'cans',
    fixes: { sensitivity_db_mw: 100, impedance: 20 },
    native: 'db_mw', source: 'Audeze official/Bloom Audio', confidence: 'HIGH' },

  { brand: 'Audeze', name: 'MM-500', cat: 'cans',
    fixes: { sensitivity_db_mw: 100, impedance: 18 },
    native: 'db_mw', source: 'Audeze official/Bloom Audio', confidence: 'HIGH' },

  { brand: 'Audeze', name: 'LCD-X', cat: 'cans',
    fixes: { sensitivity_db_mw: 103, impedance: 20 },
    native: 'db_mw', source: 'Audeze official/Amazon (2021+ revision)', confidence: 'HIGH' },

  // ======================== FOCAL CANS (native: dB/mW @ 1kHz) ========================

  { brand: 'Focal', name: 'Clear Mg', cat: 'cans',
    fixes: { sensitivity_db_mw: 104, impedance: 55 },
    native: 'db_mw', source: 'Focal official/Moon Audio', confidence: 'HIGH' },

  { brand: 'Focal', name: 'Utopia (2022)', cat: 'cans',
    fixes: { sensitivity_db_mw: 104, impedance: 80 },
    native: 'db_mw', source: 'Focal official/Moon Audio/Upscale Audio', confidence: 'HIGH' },

  { brand: 'Focal', name: 'Utopia', cat: 'cans',
    fixes: { sensitivity_db_mw: 104, impedance: 80 },
    native: 'db_mw', source: 'Focal official/SoundStage', confidence: 'HIGH' },

  { brand: 'Focal', name: 'Stellia', cat: 'cans',
    fixes: { sensitivity_db_mw: 106, impedance: 35 },
    native: 'db_mw', source: 'Focal official/Headphones.com', confidence: 'HIGH' },

  { brand: 'Focal', name: 'Clear OG', cat: 'cans',
    fixes: { sensitivity_db_mw: 104, impedance: 55 },
    native: 'db_mw', source: 'Headphones.com/Moon Audio', confidence: 'HIGH' },

  { brand: 'Focal', name: 'Clear', cat: 'cans',
    fixes: { sensitivity_db_mw: 104, impedance: 55 },
    native: 'db_mw', source: 'Same as Clear OG', confidence: 'HIGH' },

  { brand: 'Focal', name: 'Radiance', cat: 'cans',
    fixes: { sensitivity_db_mw: 105, impedance: 35 },
    native: 'db_mw', source: 'StarspickerAudio/Headfonia', confidence: 'MEDIUM' },

  { brand: 'Focal', name: 'Celestee', cat: 'cans',
    fixes: { sensitivity_db_mw: 105, impedance: 35 },
    native: 'db_mw', source: 'Focal official/SoundStage/Headphonesty', confidence: 'HIGH' },

  { brand: 'Focal', name: 'Elear', cat: 'cans',
    fixes: { sensitivity_db_mw: 104, impedance: 80 },
    native: 'db_mw', source: 'Crutchfield/Headfonics/Audioholics', confidence: 'HIGH' },

  { brand: 'Focal', name: 'Elex', cat: 'cans',
    fixes: { sensitivity_db_mw: 104, impedance: 80 },
    native: 'db_mw', source: 'Head-Fi/Twister6/GoldenSound', confidence: 'HIGH' },

  // ======================== AUDIO-TECHNICA CANS (native: dB/mW) ========================

  { brand: 'Audio-Technica', name: 'ATH-M50x', cat: 'cans',
    fixes: { sensitivity_db_mw: 99, impedance: 38 },
    native: 'db_mw', source: 'Audio-Technica official', confidence: 'HIGH' },

  { brand: 'Audio-Technica', name: 'ATH-AD700X', cat: 'cans',
    fixes: { sensitivity_db_mw: 100, impedance: 38 },
    native: 'db_mw', source: 'Audio-Technica official', confidence: 'HIGH' },

  { brand: 'Audio-Technica', name: 'ATH-AD900X', cat: 'cans',
    fixes: { sensitivity_db_mw: 100, impedance: 38 },
    native: 'db_mw', source: 'Audio-Technica official', confidence: 'HIGH' },

  { brand: 'Audio-Technica', name: 'ATH-AD1000X', cat: 'cans',
    fixes: { sensitivity_db_mw: 102, impedance: 40 },
    native: 'db_mw', source: 'Audio-Technica official', confidence: 'HIGH' },

  { brand: 'Audio Technica', name: 'ATH-ADX5000', cat: 'cans',
    fixes: { sensitivity_db_mw: 100, impedance: 420 },
    native: 'db_mw', source: 'Audio-Technica official', confidence: 'HIGH' },

  { brand: 'Audio Technica', name: 'ATH-R70x', cat: 'cans',
    fixes: { sensitivity_db_mw: 98, impedance: 470 },
    native: 'db_mw', source: 'Audio-Technica official', confidence: 'HIGH' },

  { brand: 'Audio Technica', name: 'ATH-M40x', cat: 'cans',
    fixes: { sensitivity_db_mw: 98, impedance: 35 },
    native: 'db_mw', source: 'Audio-Technica official', confidence: 'HIGH' },

  { brand: 'Audio Technica', name: 'ATH-M70x', cat: 'cans',
    fixes: { sensitivity_db_mw: 97, impedance: 35 },
    native: 'db_mw', source: 'Audio-Technica official', confidence: 'HIGH' },

  { brand: 'Audio Technica', name: 'ATH-M60x', cat: 'cans',
    fixes: { sensitivity_db_mw: 102, impedance: 38 },
    native: 'db_mw', source: 'Audio-Technica official', confidence: 'HIGH' },

  { brand: 'Audio-Technica', name: 'ATH-M50xBT2', cat: 'cans',
    fixes: { sensitivity_db_mw: 99, impedance: 38 },
    native: 'db_mw', source: 'Audio-Technica official (wired mode)', confidence: 'HIGH' },

  // ======================== SONY CANS (native: dB/mW) ========================

  { brand: 'Sony', name: 'MDR-1AM2', cat: 'cans',
    fixes: { sensitivity_db_mw: 98, impedance: 16 },
    native: 'db_mw', source: 'Sony Asia Pacific official', confidence: 'HIGH' },

  { brand: 'Sony', name: 'MDR-Z1R', cat: 'cans',
    fixes: { sensitivity_db_mw: 100, impedance: 64 },
    native: 'db_mw', source: 'Sony UK official', confidence: 'HIGH' },

  { brand: 'Sony', name: 'MDR-7506', cat: 'cans',
    fixes: { sensitivity_db_mw: 106, impedance: 63 },
    native: 'db_mw', source: 'Sony Pro official', confidence: 'HIGH' },

  { brand: 'Sony', name: 'MDR-SA5000', cat: 'cans',
    fixes: { sensitivity_db_mw: 102, impedance: 70 },
    native: 'db_mw', source: 'Sony UK official', confidence: 'HIGH' },

  { brand: 'Sony', name: 'MDR-MA900', cat: 'cans',
    fixes: { sensitivity_db_mw: 104, impedance: 12 },
    native: 'db_mw', source: 'Sony Asia Pacific official', confidence: 'HIGH' },

  // ======================== ZMF CANS (native: dB/mW, approximate) ========================

  { brand: 'ZMF', name: 'Caldera', cat: 'cans',
    fixes: { sensitivity_db_mw: 95 },
    native: 'db_mw', source: 'ZMF official shop (~95dB)', confidence: 'HIGH' },

  { brand: 'ZMF', name: 'Verite Closed', cat: 'cans',
    fixes: { sensitivity_db_mw: 99, impedance: 300 },
    native: 'db_mw', source: 'ZMF official shop (~99dB)', confidence: 'HIGH' },

  { brand: 'ZMF', name: 'Auteur', cat: 'cans',
    fixes: { sensitivity_db_mw: 96, impedance: 300 },
    native: 'db_mw', source: 'ZMF official shop (~96dB)', confidence: 'HIGH' },

  { brand: 'ZMF', name: 'Verite', cat: 'cans',
    fixes: { sensitivity_db_mw: 97, impedance: 300 },
    native: 'db_mw', source: 'ZMF official shop (~97dB)', confidence: 'HIGH' },

  { brand: 'ZMF', name: 'Aeolus', cat: 'cans',
    fixes: { sensitivity_db_mw: 97, impedance: 300 },
    native: 'db_mw', source: 'ZMF official shop (~97dB)', confidence: 'HIGH' },

  // ======================== DAN CLARK AUDIO CANS (native: dB/mW) ========================

  { brand: 'Dan Clark Audio', name: 'Stealth', cat: 'cans',
    fixes: { sensitivity_db_mw: 87, impedance: 23 },
    native: 'db_mw', source: 'Headphones.com/Headfonics (DCA doesn\'t publish on site)', confidence: 'MEDIUM' },

  { brand: 'Dan Clark Audio', name: 'Aeon 2 Noire', cat: 'cans',
    fixes: { sensitivity_db_mw: 92, impedance: 13 },
    native: 'db_mw', source: 'DCA product page/Headphonesty', confidence: 'MEDIUM' },

  { brand: 'Dan Clark Audio', name: 'Ether 2', cat: 'cans',
    fixes: { sensitivity_db_mw: 92, impedance: 16 },
    native: 'db_mw', source: 'Moon Audio/Headfonics', confidence: 'MEDIUM' },

  { brand: 'Dan Clark Audio', name: 'Expanse', cat: 'cans',
    fixes: { sensitivity_db_mw: 87, impedance: 23 },
    native: 'db_mw', source: 'DCA official/Headfonics', confidence: 'MEDIUM' },

  // ======================== OTHER CANS ========================

  { brand: 'Meze', name: '109 Pro', cat: 'cans',
    fixes: { sensitivity_db_mw: 112, impedance: 40 },
    native: 'db_mw', source: 'Meze Audio official', confidence: 'HIGH' },

  { brand: 'Meze', name: '99 Classics', cat: 'cans',
    fixes: { sensitivity_db_mw: 103, impedance: 32 },
    native: 'db_mw', source: 'Meze Audio official', confidence: 'HIGH' },

  { brand: 'Meze', name: 'Empyrean', cat: 'cans',
    fixes: { sensitivity_db_mw: 100, impedance: 32 },
    native: 'db_mw', source: 'Meze Audio official', confidence: 'HIGH' },

  { brand: 'Austrian Audio', name: 'Hi-X55', cat: 'cans',
    fixes: { sensitivity_db_v: 118, impedance: 25 },
    native: 'db_v', source: 'Austrian Audio official', confidence: 'HIGH' },

  { brand: 'Grado', name: 'SR325x', cat: 'cans',
    fixes: { sensitivity_db_mw: 98, impedance: 38 },
    native: 'db_mw', source: 'Grado Labs official', confidence: 'HIGH' },

  { brand: 'Grado', name: 'SR80x', cat: 'cans',
    fixes: { sensitivity_db_mw: 99.8, impedance: 38 },
    native: 'db_mw', source: 'Grado Labs official', confidence: 'HIGH' },

  { brand: 'Final', name: 'D8000 Pro', cat: 'cans',
    fixes: { sensitivity_db_mw: 98, impedance: 60 },
    native: 'db_mw', source: 'Final official', confidence: 'HIGH' },

  { brand: 'Fostex', name: 'TH900', cat: 'cans',
    fixes: { sensitivity_db_mw: 100, impedance: 25 },
    native: 'db_mw', source: 'Fostex International official (mk1)', confidence: 'HIGH' },

  { brand: 'Fostex', name: 'TH909', cat: 'cans',
    fixes: { sensitivity_db_mw: 100, impedance: 25 },
    native: 'db_mw', source: 'Headfonics/SoundStage Solo', confidence: 'MEDIUM' },

  { brand: 'Fostex', name: 'TH610', cat: 'cans',
    fixes: { sensitivity_db_mw: 98, impedance: 25 },
    native: 'db_mw', source: 'Head-Fi/Bloom Audio', confidence: 'MEDIUM' },

  { brand: 'Fostex', name: 'TR80', cat: 'cans',
    fixes: { sensitivity_db_mw: 95, impedance: 80 },
    native: 'db_mw', source: 'B&H Photo (80Ω version)', confidence: 'MEDIUM' },

  { brand: 'Fostex', name: 'TH7', cat: 'cans',
    fixes: { sensitivity_db_mw: 100, impedance: 70 },
    native: 'db_mw', source: 'Fostex International official', confidence: 'HIGH' },

  { brand: 'Denon', name: 'AH-D5000', cat: 'cans',
    fixes: { sensitivity_db_mw: 106, impedance: 25 },
    native: 'db_mw', source: 'Denon official PDF/Crutchfield', confidence: 'HIGH' },

  { brand: 'Denon', name: 'AH-D5200', cat: 'cans',
    fixes: { sensitivity_db_mw: 103, impedance: 24 },
    native: 'db_mw', source: 'Denon official info sheet', confidence: 'HIGH' },

  { brand: 'Shure', name: 'SRH1540', cat: 'cans',
    fixes: { sensitivity_db_mw: 99, impedance: 46 },
    native: 'db_mw', source: 'Shure official spec sheet PDF', confidence: 'HIGH' },

  { brand: 'Shure', name: 'SRH840', cat: 'cans',
    fixes: { sensitivity_db_mw: 102, impedance: 44 },
    native: 'db_mw', source: 'Shure official spec sheet PDF', confidence: 'HIGH' },

  { brand: 'Shure', name: 'SRH440', cat: 'cans',
    fixes: { sensitivity_db_mw: 105, impedance: 44 },
    native: 'db_mw', source: 'Shure official spec sheet PDF', confidence: 'HIGH' },

  { brand: 'Moondrop', name: 'Para', cat: 'cans',
    fixes: { sensitivity_db_v: 101, impedance: 8 },
    native: 'db_v', source: 'Moondrop official (dB/Vrms)', confidence: 'HIGH' },

  { brand: 'Moondrop', name: 'Void', cat: 'cans',
    fixes: { sensitivity_db_v: 110, impedance: 64 },
    native: 'db_v', source: 'Moondrop official (dB/Vrms)', confidence: 'HIGH' },

  // ======================== MOONDROP IEMS (native: dB/Vrms) ========================

  { brand: 'Moondrop', name: 'Aria', cat: 'iems',
    fixes: { sensitivity_db_v: 122, impedance: 32 },
    native: 'db_v', source: 'Moondrop official', confidence: 'HIGH' },

  { brand: 'Moondrop', name: 'Blessing 2', cat: 'iems',
    fixes: { sensitivity_db_v: 117, impedance: 22 },
    native: 'db_v', source: 'Moondrop official', confidence: 'HIGH' },

  { brand: 'Moondrop', name: 'Kato', cat: 'iems',
    fixes: { sensitivity_db_v: 123, impedance: 32 },
    native: 'db_v', source: 'Moondrop official', confidence: 'HIGH' },

  { brand: 'Moondrop', name: 'Variations', cat: 'iems',
    fixes: { sensitivity_db_v: 118, impedance: 15 },
    native: 'db_v', source: 'Moondrop official (15.2Ω)', confidence: 'HIGH' },

  { brand: 'Moondrop', name: 'Chu', cat: 'iems',
    fixes: { sensitivity_db_v: 120, impedance: 28 },
    native: 'db_v', source: 'Moondrop official (28Ω, not 32)', confidence: 'HIGH' },

  { brand: 'Moondrop', name: 'CHU 2', cat: 'iems',
    fixes: { sensitivity_db_v: 119, impedance: 18 },
    native: 'db_v', source: 'Moondrop official (18Ω, not 32)', confidence: 'HIGH' },

  { brand: 'Moondrop', name: 'Starfield', cat: 'iems',
    fixes: { sensitivity_db_v: 122, impedance: 32 },
    native: 'db_v', source: 'Moondrop official', confidence: 'HIGH' },

  { brand: 'Moondrop', name: 'KXXS', cat: 'iems',
    fixes: { sensitivity_db_mw: 110, impedance: 32 },
    native: 'db_mw', source: 'Linsoul (older format)', confidence: 'MEDIUM' },

  { brand: 'Moondrop', name: 'S8', cat: 'iems',
    fixes: { sensitivity_db_v: 122, impedance: 16 },
    native: 'db_v', source: 'Moondrop official', confidence: 'HIGH' },

  { brand: 'Moondrop', name: 'Kanas Pro', cat: 'iems',
    fixes: { sensitivity_db_mw: 110, impedance: 32 },
    native: 'db_mw', source: 'Head-Fi (older product)', confidence: 'MEDIUM' },

  { brand: 'Moondrop', name: 'Solis', cat: 'iems',
    fixes: { sensitivity_db_v: 120, impedance: 8 },
    native: 'db_v', source: 'Moondrop official (7.5Ω)', confidence: 'HIGH' },

  // ======================== SENNHEISER IEMS (native: dB/V) ========================

  { brand: 'Sennheiser', name: 'IE600', cat: 'iems',
    fixes: { sensitivity_db_v: 118, impedance: 18 },
    native: 'db_v', source: 'Crutchfield/Sennheiser', confidence: 'HIGH' },

  { brand: 'Sennheiser', name: 'IE900', cat: 'iems',
    fixes: { sensitivity_db_v: 123, impedance: 16 },
    native: 'db_v', source: 'Headphones.com/Sennheiser', confidence: 'HIGH' },

  { brand: 'Sennheiser', name: 'IE300', cat: 'iems',
    fixes: { sensitivity_db_v: 124, impedance: 16 },
    native: 'db_v', source: 'SoundStage Network/Sennheiser', confidence: 'HIGH' },

  { brand: 'Sennheiser', name: 'IE800', cat: 'iems',
    fixes: { sensitivity_db_v: 125, impedance: 16 },
    native: 'db_v', source: 'ThePhonograph.net/Sennheiser', confidence: 'HIGH' },

  { brand: 'Sennheiser', name: 'IE800S', cat: 'iems',
    fixes: { sensitivity_db_v: 125, impedance: 16 },
    native: 'db_v', source: 'Sennheiser official', confidence: 'HIGH' },

  // ======================== SONY IEMS (native: dB/mW) ========================

  { brand: 'Sony', name: 'IER-Z1R', cat: 'iems',
    fixes: { sensitivity_db_mw: 103, impedance: 40 },
    native: 'db_mw', source: 'Sony Asia Pacific official', confidence: 'HIGH' },

  { brand: 'Sony', name: 'IER-M9', cat: 'iems',
    fixes: { sensitivity_db_mw: 103, impedance: 20 },
    native: 'db_mw', source: 'Sony Asia Pacific official', confidence: 'HIGH' },

  { brand: 'Sony', name: 'IER-M7', cat: 'iems',
    fixes: { sensitivity_db_mw: 103, impedance: 24 },
    native: 'db_mw', source: 'Sony Asia Pacific official', confidence: 'HIGH' },

  // ======================== ETYMOTIC IEMS (native: dB/mW) ========================

  { brand: 'Etymotic', name: 'ER2SE/ER2XR', cat: 'iems',
    fixes: { sensitivity_db_mw: 96, impedance: 15 },
    native: 'db_mw', source: 'Etymotic official', confidence: 'HIGH' },

  { brand: 'Etymotic', name: 'ER3SE/ER3XR', cat: 'iems',
    fixes: { sensitivity_db_mw: 102, impedance: 22 },
    native: 'db_mw', source: 'Etymotic official', confidence: 'HIGH' },

  { brand: 'Etymotic', name: 'ER4XR', cat: 'iems',
    fixes: { sensitivity_db_mw: 98, impedance: 45 },
    native: 'db_mw', source: 'Etymotic official', confidence: 'HIGH' },

  // ======================== FIIO IEMS (native: dB/mW) ========================

  { brand: 'FiiO', name: 'FH9', cat: 'iems',
    fixes: { sensitivity_db_mw: 108, impedance: 18 },
    native: 'db_mw', source: 'FiiO official', confidence: 'HIGH' },

  { brand: 'FiiO', name: 'FH5', cat: 'iems',
    fixes: { sensitivity_db_mw: 112, impedance: 19 },
    native: 'db_mw', source: 'FiiO official', confidence: 'HIGH' },

  { brand: 'FiiO', name: 'FD5', cat: 'iems',
    fixes: { sensitivity_db_mw: 109, impedance: 32 },
    native: 'db_mw', source: 'FiiO official', confidence: 'HIGH' },

  // ======================== TRUTHEAR IEMS (native: dB/Vrms) ========================

  { brand: 'Truthear', name: 'Zero RED', cat: 'iems',
    fixes: { sensitivity_db_v: 117.5, impedance: 18 },
    native: 'db_v', source: 'Truthear official (17.5Ω)', confidence: 'HIGH' },

  { brand: 'Truthear', name: 'NOVA', cat: 'iems',
    fixes: { sensitivity_db_v: 123, impedance: 15 },
    native: 'db_v', source: 'Truthear official (14.8Ω)', confidence: 'HIGH' },

  { brand: 'Truthear', name: 'HEXA', cat: 'iems',
    fixes: { sensitivity_db_v: 120, impedance: 21 },
    native: 'db_v', source: 'Truthear official (20.5Ω)', confidence: 'HIGH' },

  // ======================== SIMGOT IEMS (native: dB/Vrms) ========================

  { brand: 'Simgot', name: 'EA1000 Fermat', cat: 'iems',
    fixes: { sensitivity_db_v: 127, impedance: 16 },
    native: 'db_v', source: 'Simgot official', confidence: 'HIGH' },

  { brand: 'Simgot', name: 'EW200', cat: 'iems',
    fixes: { sensitivity_db_v: 126, impedance: 16 },
    native: 'db_v', source: 'Hi End Portable review (16Ω, not 32)', confidence: 'MEDIUM' },

  { brand: 'Simgot', name: 'EA500LM', cat: 'iems',
    fixes: { sensitivity_db_v: 123, impedance: 21 },
    native: 'db_v', source: 'Linsoul (21Ω, not 32)', confidence: 'MEDIUM' },

  // ======================== THIEAUDIO IEMS (native: dB/Vrms likely) ========================

  { brand: 'Thieaudio', name: 'Monarch Mk3', cat: 'iems',
    fixes: { sensitivity_db_v: 99, impedance: 20 },
    native: 'db_v', source: 'ThieAudio official (20Ω, not 22)', confidence: 'HIGH' },

  { brand: 'Thieaudio', name: 'Monarch MK4', cat: 'iems',
    fixes: { sensitivity_db_v: 100, impedance: 11 },
    native: 'db_v', source: 'ThieAudio official (10.9Ω, not 22)', confidence: 'HIGH' },

  { brand: 'Thieaudio', name: 'HYPE 4', cat: 'iems',
    fixes: { sensitivity_db_v: 105, impedance: 17 },
    native: 'db_v', source: 'ThieAudio official (17Ω, not 22)', confidence: 'HIGH' },

  { brand: 'Thieaudio', name: 'Oracle', cat: 'iems',
    fixes: { sensitivity_db_mw: 106, impedance: 32 },
    native: 'db_mw', source: 'Linsoul (discontinued)', confidence: 'MEDIUM' },

  { brand: 'Thieaudio', name: 'Prestige LTD', cat: 'iems',
    fixes: { sensitivity_db_v: 99, impedance: 22 },
    native: 'db_v', source: 'ThieAudio official', confidence: 'HIGH' },

  // ======================== OTHER IEMS ========================

  { brand: 'Campfire Audio', name: 'Mammoth', cat: 'iems',
    fixes: { sensitivity_db_mw: 94, impedance: 8 },
    native: 'db_mw', source: 'Headfonics (non-standard CA format interpreted)', confidence: 'MEDIUM' },

  { brand: 'Letshuoer', name: 'S12 Pro', cat: 'iems',
    fixes: { sensitivity_db_mw: 102, impedance: 16 },
    native: 'db_mw', source: 'Letshuoer official', confidence: 'HIGH' },

  { brand: '7Hz', name: 'Timeless', cat: 'iems',
    fixes: { sensitivity_db_v: 104, impedance: 15 },
    native: 'db_v', source: 'ShenZhenAudio (14.8Ω)', confidence: 'MEDIUM' },

  { brand: '7Hz', name: 'Dioko', cat: 'iems',
    fixes: { sensitivity_db_v: 106, impedance: 16 },
    native: 'db_v', source: 'Linsoul', confidence: 'MEDIUM' },

  { brand: 'Kiwi Ears', name: 'Astral', cat: 'iems',
    fixes: { sensitivity_db_v: 105, impedance: 23 },
    native: 'db_v', source: 'Kiwi Ears official (23Ω, not 32)', confidence: 'HIGH' },

  { brand: 'Kiwi Ears', name: 'HBB PUNCH', cat: 'iems',
    fixes: { sensitivity_db_v: 98, impedance: 12 },
    native: 'db_v', source: 'Kiwi Ears official (12Ω, not 32)', confidence: 'HIGH' },

  { brand: 'Sony', name: 'Z1R', cat: 'iems',
    fixes: { sensitivity_db_mw: 103, impedance: 40 },
    native: 'db_mw', source: 'Same as IER-Z1R', confidence: 'HIGH' },
];


// ============================================================
// EXECUTION
// ============================================================

async function run() {
  const stats = { found: 0, notFound: 0, updated: 0, skipped: 0, errors: 0, impedanceFixed: 0 };

  console.log(`\n${'='.repeat(70)}`);
  console.log(EXECUTE
    ? '  EXECUTING: Sensitivity Data Import (Web-Verified)'
    : '  DRY RUN: Sensitivity Data Import (Web-Verified)');
  console.log(`  ${ALL_FIXES.length} entries to process`);
  console.log(`${'='.repeat(70)}\n`);

  let currentCat = '';
  for (let i = 0; i < ALL_FIXES.length; i++) {
    const f = ALL_FIXES[i];

    // Category header
    const catKey = `${f.cat}`;
    if (catKey !== currentCat) {
      currentCat = catKey;
      const label = { cans: 'HEADPHONES', iems: 'IEMS' };
      console.log(`\n--- ${label[f.cat] || f.cat.toUpperCase()} ---`);
    }

    // Find entry
    const { data, error } = await supabase
      .from('components')
      .select('id, brand, name, category, sensitivity_db_mw, sensitivity_db_v, impedance')
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

    // Build updates object
    const updates = {};

    // Set the native sensitivity value(s)
    if (f.fixes.sensitivity_db_mw !== undefined) {
      updates.sensitivity_db_mw = f.fixes.sensitivity_db_mw;
    }
    if (f.fixes.sensitivity_db_v !== undefined) {
      updates.sensitivity_db_v = f.fixes.sensitivity_db_v;
    }

    // Update impedance if provided (some corrections found)
    if (f.fixes.impedance !== undefined && f.fixes.impedance !== entry.impedance) {
      updates.impedance = f.fixes.impedance;
      stats.impedanceFixed++;
    }

    // Derive the missing format using impedance
    const z = f.fixes.impedance || entry.impedance;
    if (z && z > 0) {
      const factor = 10 * Math.log10(z / 1000);
      if (updates.sensitivity_db_mw && !updates.sensitivity_db_v && !f.fixes.sensitivity_db_v) {
        // dB/V = dB/mW - 10*log10(Z/1000)
        updates.sensitivity_db_v = Math.round((updates.sensitivity_db_mw - factor) * 10) / 10;
      }
      if (updates.sensitivity_db_v && !updates.sensitivity_db_mw && !f.fixes.sensitivity_db_mw) {
        // dB/mW = dB/V + 10*log10(Z/1000)
        updates.sensitivity_db_mw = Math.round((updates.sensitivity_db_v + factor) * 10) / 10;
      }
    }

    // Check if anything actually changes
    const changes = [];
    for (const [key, newVal] of Object.entries(updates)) {
      const oldVal = entry[key];
      if (oldVal !== newVal) {
        changes.push(`    ${key}: ${oldVal === null ? 'null' : oldVal} → ${newVal}`);
      }
    }

    if (changes.length === 0) {
      stats.skipped++;
      continue;
    }

    console.log(`\n  [${i + 1}] ${f.brand} ${f.name} [${f.confidence}]`);
    changes.forEach(c => console.log(c));
    console.log(`    📎 ${f.source}`);

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

  // Summary
  console.log(`\n${'='.repeat(70)}`);
  console.log(`  SUMMARY`);
  console.log(`${'='.repeat(70)}`);
  console.log(`  Entries found:          ${stats.found}`);
  console.log(`  Entries not found:      ${stats.notFound}`);
  console.log(`  Sensitivity added:      ${stats.updated}`);
  console.log(`  Impedance corrections:  ${stats.impedanceFixed}`);
  console.log(`  Already correct:        ${stats.skipped}`);
  console.log(`  Errors:                 ${stats.errors}`);
  if (!EXECUTE) {
    console.log(`\n  This was a DRY RUN. To apply, run:`);
    console.log(`  node scripts/fix-sensitivity-2026.js --execute`);
  }
  console.log('');
}

run().catch(console.error);
