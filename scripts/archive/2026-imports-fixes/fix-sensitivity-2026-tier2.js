/**
 * fix-sensitivity-2026-tier2.js — Tier 2 sensitivity data for boutique/niche brands
 *
 * Compiled from 5 parallel research agents covering ~234 models.
 * Only HIGH and MEDIUM confidence entries included.
 * Skipped: electrostatics, TWS earbuds, brands with no published specs (Noble, FatFreq).
 *
 * Sensitivity format conventions (same as Tier 1):
 *   dB/V = dB/mW - 10*log10(Z/1000)
 *   dB/mW = dB/V + 10*log10(Z/1000)
 *
 * Usage:
 *   node scripts/fix-sensitivity-2026-tier2.js            # Dry run (preview)
 *   node scripts/fix-sensitivity-2026-tier2.js --execute   # Apply changes
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const EXECUTE = process.argv.includes('--execute');

// ============================================================
// ALL TIER 2 SENSITIVITY FIXES
// ============================================================

const ALL_FIXES = [

  // ======================== TIER 2 CANS ========================

  // --- Abyss (native: dB/mW) ---
  { brand: 'Abyss', name: 'AB-1266 Phi TC', cat: 'cans',
    fixes: { sensitivity_db_mw: 88, impedance: 46 },
    native: 'db_mw', source: 'Abyss official/Headphones.com', confidence: 'HIGH' },

  // --- Acoustic Research (native: dB/mW) ---
  { brand: 'Acoustic Research', name: 'AR-H1', cat: 'iems', // stored as IEM in DB, actually headphone
    fixes: { sensitivity_db_mw: 98, impedance: 35 },
    native: 'db_mw', source: 'SoundStage/Head-Fi', confidence: 'MEDIUM' },

  // --- Dan Clark Audio Aeon 2 Closed (stored as IEM in DB) ---
  { brand: 'Dan Clark Audio', name: 'Aeon 2 Closed', cat: 'iems',
    fixes: { sensitivity_db_mw: 92, impedance: 13 },
    native: 'db_mw', source: 'DCA product page/Headphonesty', confidence: 'MEDIUM' },

  // --- HEDDphone (stored as IEM in DB, actually headphone) ---
  { brand: 'HEDD', name: 'HEDDphone', cat: 'iems',
    fixes: { sensitivity_db_mw: 87, impedance: 42 },
    native: 'db_mw', source: 'HEDD official/Thomann', confidence: 'HIGH' },

  // --- Koss (native: dB/mW) ---
  { brand: 'Koss', name: 'KSC75', cat: 'cans',
    fixes: { sensitivity_db_mw: 101, impedance: 60 },
    native: 'db_mw', source: 'Koss official spec sheet', confidence: 'HIGH' },

  { brand: 'Koss', name: 'KPH30i', cat: 'cans',
    fixes: { sensitivity_db_mw: 101, impedance: 60 },
    native: 'db_mw', source: 'Koss official spec sheet', confidence: 'HIGH' },

  { brand: 'Koss', name: 'Porta Pro', cat: 'cans',
    fixes: { sensitivity_db_mw: 101, impedance: 60 },
    native: 'db_mw', source: 'Koss official spec sheet', confidence: 'HIGH' },

  // --- Kennerton (native: dB/mW) ---
  { brand: 'Kennerton', name: 'Gjallarhorn GH 50', cat: 'cans',
    fixes: { sensitivity_db_mw: 103, impedance: 50 },
    native: 'db_mw', source: 'Kennerton official', confidence: 'HIGH' },

  // --- Neumann (native: dB/V) ---
  { brand: 'Neumann', name: 'NDH 20', cat: 'cans',
    fixes: { sensitivity_db_v: 114, impedance: 150 },
    native: 'db_v', source: 'Neumann official', confidence: 'HIGH' },

  // --- Ollo Audio (native: dB/V) ---
  { brand: 'Ollo Audio', name: 'S5X', cat: 'cans',
    fixes: { sensitivity_db_v: 110, impedance: 32 },
    native: 'db_v', source: 'Ollo Audio official', confidence: 'HIGH' },

  // --- Philips (native: dB/mW approx) ---
  { brand: 'Philips', name: 'SHP9500', cat: 'cans',
    fixes: { sensitivity_db_mw: 101, impedance: 32 },
    native: 'db_mw', source: 'Amazon/Product page spec', confidence: 'MEDIUM' },

  { brand: 'Philips', name: 'X2HR', cat: 'cans',
    fixes: { sensitivity_db_mw: 100, impedance: 30 },
    native: 'db_mw', source: 'Amazon/Product page spec', confidence: 'MEDIUM' },

  // --- Sivga (native: dB/mW) ---
  { brand: 'Sivga', name: 'SV023', cat: 'cans',
    fixes: { sensitivity_db_mw: 107, impedance: 32 },
    native: 'db_mw', source: 'Sivga official', confidence: 'HIGH' },

  // --- Sash Tres (native: dB/V) ---
  { brand: 'Sash Tres', name: 'S3', cat: 'cans',
    fixes: { sensitivity_db_v: 106, impedance: 50 },
    native: 'db_v', source: 'Sash Audio official', confidence: 'MEDIUM' },

  // --- Meze Liric (native: dB/mW) ---
  { brand: 'Meze', name: 'Liric', cat: 'cans',
    fixes: { sensitivity_db_mw: 105, impedance: 30 },
    native: 'db_mw', source: 'Meze Audio official', confidence: 'HIGH' },

  // --- Meze Elite (native: dB/mW) ---
  { brand: 'Meze', name: 'Elite', cat: 'cans',
    fixes: { sensitivity_db_mw: 101, impedance: 32 },
    native: 'db_mw', source: 'Meze Audio official', confidence: 'HIGH' },

  // --- Sendy Audio (native: dB/mW) ---
  { brand: 'Sendy Audio', name: 'Aiva', cat: 'cans',
    fixes: { sensitivity_db_mw: 96, impedance: 32 },
    native: 'db_mw', source: 'Head-Fi/SoundStage', confidence: 'MEDIUM' },

  // --- Monolith/Monoprice (native: dB/mW) ---
  { brand: 'Monolith', name: 'M1570', cat: 'cans',
    fixes: { sensitivity_db_mw: 96, impedance: 56 },
    native: 'db_mw', source: 'Monoprice product page', confidence: 'HIGH' },

  // --- Final D8000 (stored as IEM in DB, actually headphone) ---
  { brand: 'Final', name: 'D8000', cat: 'iems',
    fixes: { sensitivity_db_mw: 98, impedance: 60 },
    native: 'db_mw', source: 'Final official', confidence: 'HIGH' },

  // ======================== 64 AUDIO IEMS (native: dB/mW) ========================

  { brand: '64 Audio', name: 'U12t', cat: 'iems',
    fixes: { sensitivity_db_mw: 108, impedance: 13 },
    native: 'db_mw', source: '64 Audio official', confidence: 'HIGH' },

  { brand: '64 Audio', name: 'Nio', cat: 'iems',
    fixes: { sensitivity_db_mw: 106, impedance: 6 },
    native: 'db_mw', source: '64 Audio official', confidence: 'HIGH' },

  { brand: '64 Audio', name: 'U18s', cat: 'iems',
    fixes: { sensitivity_db_mw: 105, impedance: 9 },
    native: 'db_mw', source: '64 Audio official', confidence: 'HIGH' },

  { brand: '64 Audio', name: 'A12t', cat: 'iems',
    fixes: { sensitivity_db_mw: 108, impedance: 13 },
    native: 'db_mw', source: '64 Audio official', confidence: 'HIGH' },

  { brand: '64 Audio', name: 'U6t', cat: 'iems',
    fixes: { sensitivity_db_mw: 109, impedance: 12 },
    native: 'db_mw', source: '64 Audio official', confidence: 'HIGH' },

  { brand: '64 Audio', name: 'U4s', cat: 'iems',
    fixes: { sensitivity_db_mw: 108, impedance: 10 },
    native: 'db_mw', source: '64 Audio official', confidence: 'HIGH' },

  { brand: '64 Audio', name: 'Fourte', cat: 'iems',
    fixes: { sensitivity_db_mw: 112, impedance: 13 },
    native: 'db_mw', source: '64 Audio official', confidence: 'HIGH' },

  { brand: '64 Audio', name: 'Tia Trio', cat: 'iems',
    fixes: { sensitivity_db_mw: 110, impedance: 6 },
    native: 'db_mw', source: '64 Audio official', confidence: 'HIGH' },

  { brand: '64 Audio', name: 'Volur', cat: 'iems',
    fixes: { sensitivity_db_mw: 103, impedance: 4 },
    native: 'db_mw', source: '64 Audio official', confidence: 'HIGH' },

  // ======================== DUNU IEMS (native: dB/mW convention) ========================

  { brand: 'DUNU', name: 'SA6 Ultra', cat: 'iems',
    fixes: { sensitivity_db_mw: 108, impedance: 10 },
    native: 'db_mw', source: 'DUNU official', confidence: 'HIGH' },

  { brand: 'DUNU', name: 'SA6 EST', cat: 'iems',
    fixes: { sensitivity_db_mw: 108, impedance: 12 },
    native: 'db_mw', source: 'DUNU official (confirms dB/mW convention)', confidence: 'HIGH' },

  { brand: 'DUNU', name: 'Vulkan', cat: 'iems',
    fixes: { sensitivity_db_mw: 110, impedance: 14 },
    native: 'db_mw', source: 'DUNU official', confidence: 'HIGH' },

  { brand: 'DUNU', name: 'Falcon Ultra', cat: 'iems',
    fixes: { sensitivity_db_mw: 108, impedance: 14 },
    native: 'db_mw', source: 'DUNU official', confidence: 'HIGH' },

  { brand: 'DUNU', name: 'EST 112', cat: 'iems',
    fixes: { sensitivity_db_mw: 106, impedance: 30 },
    native: 'db_mw', source: 'DUNU official', confidence: 'HIGH' },

  { brand: 'DUNU', name: 'Zen Pro', cat: 'iems',
    fixes: { sensitivity_db_mw: 110, impedance: 16 },
    native: 'db_mw', source: 'DUNU official', confidence: 'HIGH' },

  { brand: 'DUNU', name: 'Luna', cat: 'iems',
    fixes: { sensitivity_db_mw: 108, impedance: 16 },
    native: 'db_mw', source: 'DUNU official', confidence: 'HIGH' },

  { brand: 'DUNU', name: 'Kima Classic', cat: 'iems',
    fixes: { sensitivity_db_mw: 107, impedance: 32 },
    native: 'db_mw', source: 'DUNU official', confidence: 'HIGH' },

  // ======================== JVC IEMS (native: dB/mW) ========================

  { brand: 'JVC', name: 'HA-FDX1', cat: 'iems',
    fixes: { sensitivity_db_mw: 103, impedance: 16 },
    native: 'db_mw', source: 'JVC official', confidence: 'HIGH' },

  { brand: 'JVC', name: 'HA-FW01', cat: 'iems',
    fixes: { sensitivity_db_mw: 102, impedance: 16 },
    native: 'db_mw', source: 'JVC official', confidence: 'HIGH' },

  { brand: 'JVC', name: 'HA-FW10000', cat: 'iems',
    fixes: { sensitivity_db_mw: 100, impedance: 16 },
    native: 'db_mw', source: 'JVC official', confidence: 'HIGH' },

  // ======================== FIIO IEMS (native: dB/mW) ========================

  { brand: 'FiiO', name: 'FH7s', cat: 'iems',
    fixes: { sensitivity_db_mw: 106, impedance: 24 },
    native: 'db_mw', source: 'FiiO official', confidence: 'HIGH' },

  { brand: 'FiiO', name: 'FH15', cat: 'iems',
    fixes: { sensitivity_db_mw: 106, impedance: 14 },
    native: 'db_mw', source: 'FiiO official', confidence: 'HIGH' },

  { brand: 'FiiO', name: 'FA9', cat: 'iems',
    fixes: { sensitivity_db_mw: 113, impedance: 20 },
    native: 'db_mw', source: 'FiiO official', confidence: 'HIGH' },

  { brand: 'FiiO', name: 'FD7', cat: 'iems',
    fixes: { sensitivity_db_mw: 109, impedance: 50 },
    native: 'db_mw', source: 'FiiO official', confidence: 'HIGH' },

  { brand: 'FiiO', name: 'FH3', cat: 'iems',
    fixes: { sensitivity_db_mw: 106, impedance: 24 },
    native: 'db_mw', source: 'FiiO official', confidence: 'HIGH' },

  // ======================== ETYMOTIC IEMS (native: dB/mW) ========================

  { brand: 'Etymotic', name: 'ER4SR', cat: 'iems',
    fixes: { sensitivity_db_mw: 96, impedance: 45 },
    native: 'db_mw', source: 'Etymotic official', confidence: 'HIGH' },

  // ======================== SHURE IEMS (native: dB/mW) ========================

  { brand: 'Shure', name: 'SE846', cat: 'iems',
    fixes: { sensitivity_db_mw: 114, impedance: 9 },
    native: 'db_mw', source: 'Shure official', confidence: 'HIGH' },

  { brand: 'Shure', name: 'SE535', cat: 'iems',
    fixes: { sensitivity_db_mw: 119, impedance: 36 },
    native: 'db_mw', source: 'Shure official', confidence: 'HIGH' },

  { brand: 'Shure', name: 'SE215', cat: 'iems',
    fixes: { sensitivity_db_mw: 107, impedance: 17 },
    native: 'db_mw', source: 'Shure official', confidence: 'HIGH' },

  { brand: 'Shure', name: 'SE425', cat: 'iems',
    fixes: { sensitivity_db_mw: 109, impedance: 22 },
    native: 'db_mw', source: 'Shure official', confidence: 'HIGH' },

  { brand: 'Shure', name: 'KSE1500', cat: 'iems',
    fixes: { sensitivity_db_mw: 110, impedance: 29 },
    native: 'db_mw', source: 'Shure official (electrostatic, requires energizer)', confidence: 'MEDIUM' },

  // ======================== SENNHEISER IEMS (native: dB/V) ========================

  { brand: 'Sennheiser', name: 'IE 400 PRO', cat: 'iems',
    fixes: { sensitivity_db_v: 123, impedance: 16 },
    native: 'db_v', source: 'Sennheiser official', confidence: 'HIGH' },

  { brand: 'Sennheiser', name: 'IE 100 PRO', cat: 'iems',
    fixes: { sensitivity_db_v: 115, impedance: 20 },
    native: 'db_v', source: 'Sennheiser official', confidence: 'HIGH' },

  // ======================== AUDEZE IEMS (native: dB/mW) ========================

  { brand: 'Audeze', name: 'Euclid', cat: 'iems',
    fixes: { sensitivity_db_mw: 105, impedance: 12 },
    native: 'db_mw', source: 'Audeze official', confidence: 'HIGH' },

  { brand: 'Audeze', name: 'iSINE 20', cat: 'iems',
    fixes: { sensitivity_db_mw: 120, impedance: 16 },
    native: 'db_mw', source: 'Audeze official', confidence: 'HIGH' },

  { brand: 'Audeze', name: 'iSINE 10', cat: 'iems',
    fixes: { sensitivity_db_mw: 120, impedance: 16 },
    native: 'db_mw', source: 'Audeze official', confidence: 'HIGH' },

  { brand: 'Audeze', name: 'LCD-i3', cat: 'iems',
    fixes: { sensitivity_db_mw: 110, impedance: 22 },
    native: 'db_mw', source: 'Audeze official', confidence: 'HIGH' },

  // ======================== CHI-FI / MID-TIER IEMS ========================

  // --- 7Hz (native: dB/V for newer models) ---
  { brand: '7Hz', name: 'Eternal', cat: 'iems',
    fixes: { sensitivity_db_v: 104, impedance: 15 },
    native: 'db_v', source: 'Linsoul/official spec', confidence: 'MEDIUM' },

  { brand: '7Hz', name: 'Zero 2', cat: 'iems',
    fixes: { sensitivity_db_v: 105, impedance: 32 },
    native: 'db_v', source: 'Linsoul/official spec', confidence: 'MEDIUM' },

  // --- Tanchjim (native: dB/V) ---
  { brand: 'Tanchjim', name: 'Zero', cat: 'iems',
    fixes: { sensitivity_db_v: 119, impedance: 14 },
    native: 'db_v', source: 'Tanchjim official', confidence: 'HIGH' },

  { brand: 'Tanchjim', name: 'Hana 2021', cat: 'iems',
    fixes: { sensitivity_db_v: 110, impedance: 15 },
    native: 'db_v', source: 'Tanchjim official', confidence: 'HIGH' },

  { brand: 'Tanchjim', name: 'Ola', cat: 'iems',
    fixes: { sensitivity_db_v: 126, impedance: 16 },
    native: 'db_v', source: 'Tanchjim official', confidence: 'HIGH' },

  { brand: 'Tanchjim', name: 'Origin', cat: 'iems',
    fixes: { sensitivity_db_v: 115, impedance: 14 },
    native: 'db_v', source: 'Tanchjim official', confidence: 'HIGH' },

  { brand: 'Tanchjim', name: 'Kara', cat: 'iems',
    fixes: { sensitivity_db_v: 110, impedance: 12 },
    native: 'db_v', source: 'Tanchjim official', confidence: 'MEDIUM' },

  // --- Truthear (native: dB/Vrms) ---
  { brand: 'Truthear', name: 'ZERO', cat: 'iems',
    fixes: { sensitivity_db_v: 119, impedance: 18 },
    native: 'db_v', source: 'Truthear official', confidence: 'HIGH' },

  // --- LETSHUOER (native: dB/mW) ---
  { brand: 'LETSHUOER', name: 'EJ07', cat: 'iems',
    fixes: { sensitivity_db_mw: 102, impedance: 18 },
    native: 'db_mw', source: 'Letshuoer official', confidence: 'HIGH' },

  { brand: 'Letshuoer', name: 'EJ07M', cat: 'iems',
    fixes: { sensitivity_db_mw: 102, impedance: 18 },
    native: 'db_mw', source: 'Letshuoer official', confidence: 'HIGH' },

  { brand: 'Letshuoer', name: 'S12', cat: 'iems',
    fixes: { sensitivity_db_mw: 102, impedance: 16 },
    native: 'db_mw', source: 'Letshuoer official', confidence: 'HIGH' },

  // --- SIMGOT (native: dB/Vrms) ---
  { brand: 'SIMGOT', name: 'SUPERMIX4', cat: 'iems',
    fixes: { sensitivity_db_v: 126, impedance: 7 },
    native: 'db_v', source: 'SIMGOT official (7.2Ω, not 32)', confidence: 'HIGH' },

  { brand: 'Simgot', name: 'EM6L', cat: 'iems',
    fixes: { sensitivity_db_v: 126, impedance: 10 },
    native: 'db_v', source: 'SIMGOT official', confidence: 'HIGH' },

  // --- Softears (native: dB/Vrms) ---
  { brand: 'Softears', name: 'RSV', cat: 'iems',
    fixes: { sensitivity_db_v: 122, impedance: 8 },
    native: 'db_v', source: 'Softears official (8Ω, not 32)', confidence: 'HIGH' },

  { brand: 'Softears', name: 'Studio 4', cat: 'iems',
    fixes: { sensitivity_db_v: 120, impedance: 12 },
    native: 'db_v', source: 'Softears official (12Ω, not 32)', confidence: 'HIGH' },

  { brand: 'Softears', name: 'Volume', cat: 'iems',
    fixes: { sensitivity_db_v: 124, impedance: 6 },
    native: 'db_v', source: 'Softears official (5.7Ω)', confidence: 'HIGH' },

  { brand: 'Softears', name: 'Twilight', cat: 'iems',
    fixes: { sensitivity_db_v: 119, impedance: 14 },
    native: 'db_v', source: 'Softears official', confidence: 'HIGH' },

  // --- Kinera (native: dB/mW) ---
  { brand: 'Kinera', name: 'Celest Phoenixcall', cat: 'iems',
    fixes: { sensitivity_db_mw: 104, impedance: 28 },
    native: 'db_mw', source: 'HiFiGo/Kinera official', confidence: 'MEDIUM' },

  { brand: 'Kinera', name: 'Norn', cat: 'iems',
    fixes: { sensitivity_db_mw: 106, impedance: 22 },
    native: 'db_mw', source: 'Head-Fi/reviewer measurements', confidence: 'MEDIUM' },

  // --- XENNS (native: dB/mW approx) ---
  { brand: 'XENNS', name: 'Tea 2', cat: 'iems',
    fixes: { sensitivity_db_mw: 108, impedance: 14 },
    native: 'db_mw', source: 'HiFiGo/XENNS official', confidence: 'MEDIUM' },

  { brand: 'XENNS', name: 'Tea Pro', cat: 'iems',
    fixes: { sensitivity_db_mw: 108, impedance: 13 },
    native: 'db_mw', source: 'XENNS official (13Ω, not 32)', confidence: 'MEDIUM' },

  // --- ZIIGAAT (native: dB/V) ---
  { brand: 'ZIIGAAT', name: 'Doscinco', cat: 'iems',
    fixes: { sensitivity_db_v: 116, impedance: 12 },
    native: 'db_v', source: 'ZIIGAAT official (12Ω, not 32)', confidence: 'MEDIUM' },

  { brand: 'ZIIGAAT', name: 'Cincotres', cat: 'iems',
    fixes: { sensitivity_db_v: 108, impedance: 26 },
    native: 'db_v', source: 'ZIIGAAT official (26Ω, not 32)', confidence: 'MEDIUM' },

  // --- Yanyin (native: dB/V approx) ---
  { brand: 'Yanyin', name: 'Carmen', cat: 'iems',
    fixes: { sensitivity_db_v: 115, impedance: 10 },
    native: 'db_v', source: 'HiFiGo (10Ω, not 32)', confidence: 'MEDIUM' },

  { brand: 'Yanyin', name: 'Canon II', cat: 'iems',
    fixes: { sensitivity_db_v: 112, impedance: 14 },
    native: 'db_v', source: 'HiFiGo/official spec', confidence: 'MEDIUM' },

  // --- CrinEar (native: dB/V) ---
  { brand: 'CrinEar', name: 'Meta', cat: 'iems',
    fixes: { sensitivity_db_v: 118, impedance: 19 },
    native: 'db_v', source: 'CrinEar/HiFiGo (19Ω, not 32)', confidence: 'MEDIUM' },

  // --- Penon (native: dB/mW) ---
  { brand: 'Penon', name: 'Volt', cat: 'iems',
    fixes: { sensitivity_db_mw: 106, impedance: 22 },
    native: 'db_mw', source: 'Penon official', confidence: 'MEDIUM' },

  // --- TRI (native: dB/mW) ---
  { brand: 'TRI', name: 'Starsea', cat: 'iems',
    fixes: { sensitivity_db_mw: 110, impedance: 24 },
    native: 'db_mw', source: 'Linsoul/TRI official', confidence: 'MEDIUM' },

  // ======================== HIGH-END / BOUTIQUE IEMS ========================

  // --- Empire Ears (native: dB/mW) ---
  { brand: 'Empire Ears', name: 'Odin', cat: 'iems',
    fixes: { sensitivity_db_mw: 108, impedance: 3 },
    native: 'db_mw', source: 'Empire Ears official', confidence: 'HIGH' },

  { brand: 'Empire', name: 'Ears EVR', cat: 'iems', // DB has brand="Empire", name="Ears EVR"
    fixes: { sensitivity_db_mw: 105, impedance: 5 },
    native: 'db_mw', source: 'Empire Ears official', confidence: 'HIGH' },

  { brand: 'Empire Ears', name: 'Legend EVO', cat: 'iems',
    fixes: { sensitivity_db_mw: 100, impedance: 4 },
    native: 'db_mw', source: 'Empire Ears official', confidence: 'HIGH' },

  { brand: 'Empire Ears', name: 'Valkyrie MKII', cat: 'iems',
    fixes: { sensitivity_db_mw: 103, impedance: 5 },
    native: 'db_mw', source: 'Empire Ears official', confidence: 'HIGH' },

  { brand: 'Empire Ears', name: 'Hero', cat: 'iems',
    fixes: { sensitivity_db_mw: 105, impedance: 5 },
    native: 'db_mw', source: 'Empire Ears official', confidence: 'HIGH' },

  // --- qdc (native: dB/mW) ---
  { brand: 'qdc', name: 'Anole VX', cat: 'iems',
    fixes: { sensitivity_db_mw: 109, impedance: 25 },
    native: 'db_mw', source: 'qdc official', confidence: 'HIGH' },

  { brand: 'qdc', name: 'Dmagic 3D', cat: 'iems',
    fixes: { sensitivity_db_mw: 107, impedance: 16 },
    native: 'db_mw', source: 'qdc official', confidence: 'HIGH' },

  { brand: 'qdc', name: 'Tiger', cat: 'iems',
    fixes: { sensitivity_db_mw: 108, impedance: 10 },
    native: 'db_mw', source: 'qdc official', confidence: 'HIGH' },

  // --- Symphonium (native: dB/Vrms) ---
  { brand: 'Symphonium', name: 'Crimson', cat: 'iems',
    fixes: { sensitivity_db_v: 106, impedance: 6 },
    native: 'db_v', source: 'Symphonium official (6Ω, not 32)', confidence: 'HIGH' },

  { brand: 'Symphonium', name: 'Helios', cat: 'iems',
    fixes: { sensitivity_db_v: 110, impedance: 8 },
    native: 'db_v', source: 'Symphonium official (7.5Ω)', confidence: 'HIGH' },

  { brand: 'Symphonium', name: 'Titan', cat: 'iems',
    fixes: { sensitivity_db_v: 108, impedance: 8 },
    native: 'db_v', source: 'Symphonium official', confidence: 'HIGH' },

  { brand: 'Symphonium', name: 'Meteor', cat: 'iems',
    fixes: { sensitivity_db_v: 115, impedance: 5 },
    native: 'db_v', source: 'Symphonium official', confidence: 'HIGH' },

  // --- Unique Melody (native: dB/mW) ---
  { brand: 'Unique Melody', name: 'MEST MKII', cat: 'iems',
    fixes: { sensitivity_db_mw: 112, impedance: 14 },
    native: 'db_mw', source: 'Unique Melody official/MusicTeck', confidence: 'HIGH' },

  { brand: 'Unique Melody', name: 'MEST MKIII', cat: 'iems',
    fixes: { sensitivity_db_mw: 110, impedance: 8 },
    native: 'db_mw', source: 'Unique Melody official', confidence: 'HIGH' },

  { brand: 'Unique Melody', name: 'Multiverse Mentor', cat: 'iems',
    fixes: { sensitivity_db_mw: 112, impedance: 15 },
    native: 'db_mw', source: 'Unique Melody official', confidence: 'HIGH' },

  // --- Campfire Audio (native: dB/mW) ---
  { brand: 'Campfire Audio', name: 'Andromeda', cat: 'iems',
    fixes: { sensitivity_db_mw: 115, impedance: 12 },
    native: 'db_mw', source: 'Campfire Audio official', confidence: 'HIGH' },

  { brand: 'Campfire Audio', name: 'Andromeda 2020', cat: 'iems',
    fixes: { sensitivity_db_mw: 112, impedance: 12 },
    native: 'db_mw', source: 'Campfire Audio official', confidence: 'HIGH' },

  { brand: 'Campfire Audio', name: 'Solaris', cat: 'iems',
    fixes: { sensitivity_db_mw: 115, impedance: 10 },
    native: 'db_mw', source: 'Campfire Audio official', confidence: 'HIGH' },

  { brand: 'Campfire Audio', name: 'Ara', cat: 'iems',
    fixes: { sensitivity_db_mw: 94, impedance: 8 },
    native: 'db_mw', source: 'Campfire Audio (8.5Ω, low sensitivity confirmed by reviews)', confidence: 'HIGH' },

  { brand: 'Campfire Audio', name: 'Vega 2020', cat: 'iems',
    fixes: { sensitivity_db_mw: 105, impedance: 8 },
    native: 'db_mw', source: 'Campfire Audio official', confidence: 'HIGH' },

  { brand: 'Campfire Audio', name: 'Bonneville', cat: 'iems',
    fixes: { sensitivity_db_mw: 94, impedance: 10 },
    native: 'db_mw', source: 'Campfire Audio official', confidence: 'HIGH' },

  { brand: 'Campfire Audio', name: 'Holocene', cat: 'iems',
    fixes: { sensitivity_db_mw: 94, impedance: 16 },
    native: 'db_mw', source: 'Campfire Audio official', confidence: 'HIGH' },

  { brand: 'Campfire Audio', name: 'Trifecta', cat: 'iems',
    fixes: { sensitivity_db_mw: 97, impedance: 14 },
    native: 'db_mw', source: 'Campfire Audio official', confidence: 'HIGH' },

  // --- Final IEMs (native: dB/mW) ---
  { brand: 'Final', name: 'A8000', cat: 'iems',
    fixes: { sensitivity_db_mw: 102, impedance: 16 },
    native: 'db_mw', source: 'Final official', confidence: 'HIGH' },

  { brand: 'Final', name: 'B3', cat: 'iems',
    fixes: { sensitivity_db_mw: 108, impedance: 16 },
    native: 'db_mw', source: 'Final official', confidence: 'HIGH' },

  { brand: 'Final', name: 'E5000', cat: 'iems',
    fixes: { sensitivity_db_mw: 93, impedance: 14 },
    native: 'db_mw', source: 'Final official (hard to drive)', confidence: 'HIGH' },

  { brand: 'Final', name: 'E4000', cat: 'iems',
    fixes: { sensitivity_db_mw: 97, impedance: 15 },
    native: 'db_mw', source: 'Final official', confidence: 'HIGH' },

  { brand: 'Final', name: 'E3000', cat: 'iems',
    fixes: { sensitivity_db_mw: 100, impedance: 16 },
    native: 'db_mw', source: 'Final official', confidence: 'HIGH' },

  // --- ThieAudio IEMs (native: dB/V mostly) ---
  { brand: 'Thieaudio', name: 'Monarch Mk2', cat: 'iems',
    fixes: { sensitivity_db_v: 100, impedance: 36 },
    native: 'db_v', source: 'ThieAudio/Linsoul (36Ω)', confidence: 'MEDIUM' },

  { brand: 'Thieaudio', name: 'Clairvoyance', cat: 'iems',
    fixes: { sensitivity_db_mw: 100, impedance: 13 },
    native: 'db_mw', source: 'Linsoul/ThieAudio (13Ω, not 22)', confidence: 'MEDIUM' },

  { brand: 'Thieaudio', name: 'V16 Divinity', cat: 'iems',
    fixes: { sensitivity_db_v: 103, impedance: 22 },
    native: 'db_v', source: 'ThieAudio official', confidence: 'HIGH' },

  { brand: 'Thieaudio', name: 'Valhalla', cat: 'iems',
    fixes: { sensitivity_db_v: 102, impedance: 9 },
    native: 'db_v', source: 'ThieAudio official (9Ω, not 22)', confidence: 'HIGH' },

  { brand: 'Thieaudio', name: 'Ghost', cat: 'iems',
    fixes: { sensitivity_db_mw: 100, impedance: 32 },
    native: 'db_mw', source: 'ThieAudio/Linsoul', confidence: 'MEDIUM' },

  // --- Elysian (native: 100mV format, convert +20 for dB/V) ---
  { brand: 'Elysian', name: 'Annihilator 2023', cat: 'iems',
    fixes: { sensitivity_db_v: 125, impedance: 6 },
    native: 'db_v', source: 'Elysian official (105 dB/100mV + 20 = 125 dB/V, 5.5Ω)', confidence: 'HIGH' },

  { brand: 'Elysian', name: 'Pilgrim', cat: 'iems',
    fixes: { sensitivity_db_v: 120, impedance: 9 },
    native: 'db_v', source: 'Elysian official (100 dB/100mV + 20 = 120 dB/V, 9.4Ω)', confidence: 'HIGH' },

  // --- Vision Ears (native: dB/Vrms) ---
  { brand: 'Vision Ears', name: 'EXT', cat: 'iems',
    fixes: { sensitivity_db_v: 115, impedance: 18 },
    native: 'db_v', source: 'Vision Ears official', confidence: 'HIGH' },

  { brand: 'Vision Ears', name: 'Phonix', cat: 'iems',
    fixes: { sensitivity_db_v: 117, impedance: 16 },
    native: 'db_v', source: 'Vision Ears official', confidence: 'HIGH' },

  { brand: 'Vision Ears', name: 'Elysium', cat: 'iems',
    fixes: { sensitivity_db_v: 113, impedance: 22 },
    native: 'db_v', source: 'Vision Ears official', confidence: 'HIGH' },

  // --- Westone (native: dB/mW) ---
  { brand: 'Westone', name: 'MACH 20', cat: 'iems',
    fixes: { sensitivity_db_mw: 107, impedance: 19 },
    native: 'db_mw', source: 'Westone official', confidence: 'HIGH' },

  { brand: 'Westone', name: 'MACH 40', cat: 'iems',
    fixes: { sensitivity_db_mw: 107, impedance: 37 },
    native: 'db_mw', source: 'Westone official', confidence: 'HIGH' },

  { brand: 'Westone', name: 'MACH 60', cat: 'iems',
    fixes: { sensitivity_db_mw: 107, impedance: 56 },
    native: 'db_mw', source: 'Westone official', confidence: 'HIGH' },

  { brand: 'Westone', name: 'MACH 80', cat: 'iems',
    fixes: { sensitivity_db_mw: 107, impedance: 74 },
    native: 'db_mw', source: 'Westone official', confidence: 'HIGH' },

  // ======================== REMAINING IEMS ========================

  // --- Acoustune (native: dB/mW, consistently 110) ---
  { brand: 'Acoustune', name: 'HS1790TI', cat: 'iems',
    fixes: { sensitivity_db_mw: 110, impedance: 24 },
    native: 'db_mw', source: 'Acoustune official', confidence: 'HIGH' },

  { brand: 'Acoustune', name: 'HS1697TI', cat: 'iems',
    fixes: { sensitivity_db_mw: 110, impedance: 24 },
    native: 'db_mw', source: 'Acoustune official', confidence: 'HIGH' },

  { brand: 'Acoustune', name: 'HS1657CU', cat: 'iems',
    fixes: { sensitivity_db_mw: 110, impedance: 24 },
    native: 'db_mw', source: 'Acoustune official', confidence: 'HIGH' },

  // --- AKG IEMs (native: dB/V) ---
  { brand: 'AKG', name: 'N5005', cat: 'iems',
    fixes: { sensitivity_db_v: 116, impedance: 18 },
    native: 'db_v', source: 'AKG official', confidence: 'HIGH' },

  // --- Dita Audio (native: dB/mW) ---
  { brand: 'Dita Audio', name: 'Dream XLS', cat: 'iems',
    fixes: { sensitivity_db_mw: 102, impedance: 16 },
    native: 'db_mw', source: 'Dita Audio official', confidence: 'HIGH' },

  { brand: 'Dita Audio', name: 'Perpetua', cat: 'iems',
    fixes: { sensitivity_db_mw: 105, impedance: 16 },
    native: 'db_mw', source: 'Dita Audio official', confidence: 'HIGH' },

  { brand: 'Dita Audio', name: 'Fidelity', cat: 'iems',
    fixes: { sensitivity_db_mw: 106, impedance: 16 },
    native: 'db_mw', source: 'Dita Audio official', confidence: 'HIGH' },

  // --- Fearless (native: dB/mW) ---
  { brand: 'Fearless', name: 'S8 Freedom', cat: 'iems',
    fixes: { sensitivity_db_mw: 112, impedance: 16 },
    native: 'db_mw', source: 'Fearless/Linsoul', confidence: 'MEDIUM' },

  { brand: 'Fearless', name: 'Paladin', cat: 'iems',
    fixes: { sensitivity_db_mw: 109, impedance: 15 },
    native: 'db_mw', source: 'Fearless/Linsoul', confidence: 'MEDIUM' },

  // --- Subtonic (native: dB/Vrms) ---
  { brand: 'Subtonic', name: 'STORM', cat: 'iems',
    fixes: { sensitivity_db_v: 103, impedance: 6 },
    native: 'db_v', source: 'Subtonic official (6Ω, extremely hard to drive)', confidence: 'HIGH' },

  // --- UE (Ultimate Ears, native: dB/mW) ---
  { brand: 'Ultimate Ears', name: 'UE Reference Remastered', cat: 'iems',
    fixes: { sensitivity_db_mw: 114, impedance: 35 },
    native: 'db_mw', source: 'UE Pro official', confidence: 'HIGH' },

  { brand: 'Ultimate Ears', name: 'UE 18+ Pro', cat: 'iems',
    fixes: { sensitivity_db_mw: 114, impedance: 37 },
    native: 'db_mw', source: 'UE Pro official', confidence: 'HIGH' },

  // --- Moondrop IEMs not covered in Tier 1 ---
  { brand: 'Moondrop', name: 'Illumination', cat: 'iems',
    fixes: { sensitivity_db_v: 124, impedance: 25 },
    native: 'db_v', source: 'Moondrop official (dB/Vrms)', confidence: 'HIGH' },

  { brand: 'Moondrop', name: 'Blessing 3', cat: 'iems',
    fixes: { sensitivity_db_v: 119, impedance: 18 },
    native: 'db_v', source: 'Moondrop official', confidence: 'HIGH' },

  { brand: 'Moondrop', name: 'Blessing 2 Dusk', cat: 'iems',
    fixes: { sensitivity_db_v: 117, impedance: 22 },
    native: 'db_v', source: 'Moondrop official', confidence: 'HIGH' },

  { brand: 'Moondrop', name: 'May DSP', cat: 'iems',
    fixes: { sensitivity_db_v: 112, impedance: 32 },
    native: 'db_v', source: 'Moondrop official', confidence: 'MEDIUM' },

  { brand: 'Moondrop', name: 'Aria 2', cat: 'iems',
    fixes: { sensitivity_db_v: 122, impedance: 32 },
    native: 'db_v', source: 'Moondrop official', confidence: 'HIGH' },

  { brand: 'Moondrop', name: 'Aria Snow Edition', cat: 'iems',
    fixes: { sensitivity_db_v: 122, impedance: 32 },
    native: 'db_v', source: 'Moondrop official', confidence: 'HIGH' },

  { brand: 'Moondrop', name: 'Space Travel', cat: 'iems',
    fixes: { sensitivity_db_v: 120, impedance: 15 },
    native: 'db_v', source: 'Moondrop official', confidence: 'HIGH' },

  // --- KZ / CCA ---
  { brand: 'KZ', name: 'ZS10 Pro', cat: 'iems',
    fixes: { sensitivity_db_mw: 111, impedance: 30 },
    native: 'db_mw', source: 'KZ official/Amazon', confidence: 'MEDIUM' },

  { brand: 'KZ', name: 'ZAX', cat: 'iems',
    fixes: { sensitivity_db_mw: 108, impedance: 24 },
    native: 'db_mw', source: 'KZ official/Amazon', confidence: 'MEDIUM' },

  { brand: 'KZ', name: 'ZSN Pro X', cat: 'iems',
    fixes: { sensitivity_db_mw: 111, impedance: 22 },
    native: 'db_mw', source: 'KZ official/Amazon', confidence: 'MEDIUM' },

  { brand: 'CCA', name: 'CRA+', cat: 'iems',
    fixes: { sensitivity_db_mw: 110, impedance: 24 },
    native: 'db_mw', source: 'CCA official/Linsoul', confidence: 'MEDIUM' },

  // --- Tin HiFi (native: dB/mW) ---
  { brand: 'Tin HiFi', name: 'T2 Plus', cat: 'iems',
    fixes: { sensitivity_db_mw: 97, impedance: 22 },
    native: 'db_mw', source: 'Tin HiFi official/Linsoul', confidence: 'MEDIUM' },

  { brand: 'Tin HiFi', name: 'T3 Plus', cat: 'iems',
    fixes: { sensitivity_db_mw: 104, impedance: 22 },
    native: 'db_mw', source: 'Tin HiFi official/Linsoul', confidence: 'MEDIUM' },
];


// ============================================================
// EXECUTION (same pattern as Tier 1)
// ============================================================

async function run() {
  const stats = { found: 0, notFound: 0, updated: 0, skipped: 0, errors: 0, impedanceFixed: 0 };

  console.log(`\n${'='.repeat(70)}`);
  console.log(EXECUTE
    ? '  EXECUTING: Tier 2 Sensitivity Data Import (Boutique/Niche Brands)'
    : '  DRY RUN: Tier 2 Sensitivity Data Import (Boutique/Niche Brands)');
  console.log(`  ${ALL_FIXES.length} entries to process`);
  console.log(`${'='.repeat(70)}\n`);

  const notFoundList = [];

  for (let i = 0; i < ALL_FIXES.length; i++) {
    const f = ALL_FIXES[i];

    // Try exact match first (brand + name + category)
    let { data, error } = await supabase
      .from('components')
      .select('id, brand, name, category, sensitivity_db_mw, sensitivity_db_v, impedance')
      .eq('brand', f.brand)
      .eq('name', f.name)
      .eq('category', f.cat)
      .limit(1);

    // If not found, try ilike across both categories (handles brand casing & category errors)
    if ((!data || data.length === 0) && !error) {
      const { data: fuzzyData, error: fuzzyErr } = await supabase
        .from('components')
        .select('id, brand, name, category, sensitivity_db_mw, sensitivity_db_v, impedance')
        .ilike('brand', f.brand)
        .ilike('name', f.name)
        .in('category', ['cans', 'iems'])
        .limit(1);

      if (!fuzzyErr && fuzzyData && fuzzyData.length > 0) {
        data = fuzzyData;
      }
    }

    if (error || !data || data.length === 0) {
      notFoundList.push(`${f.brand} ${f.name} (${f.cat})`);
      stats.notFound++;
      continue;
    }

    stats.found++;
    const entry = data[0];

    // Build updates object
    const updates = {};

    // Set native sensitivity value(s)
    if (f.fixes.sensitivity_db_mw !== undefined) {
      updates.sensitivity_db_mw = f.fixes.sensitivity_db_mw;
    }
    if (f.fixes.sensitivity_db_v !== undefined) {
      updates.sensitivity_db_v = f.fixes.sensitivity_db_v;
    }

    // Update impedance if provided
    if (f.fixes.impedance !== undefined && f.fixes.impedance !== entry.impedance) {
      updates.impedance = f.fixes.impedance;
      stats.impedanceFixed++;
    }

    // Derive the missing format using impedance
    const z = f.fixes.impedance || entry.impedance;
    if (z && z > 0) {
      const factor = 10 * Math.log10(z / 1000);
      if (updates.sensitivity_db_mw && !updates.sensitivity_db_v && !f.fixes.sensitivity_db_v) {
        updates.sensitivity_db_v = Math.round((updates.sensitivity_db_mw - factor) * 10) / 10;
      }
      if (updates.sensitivity_db_v && !updates.sensitivity_db_mw && !f.fixes.sensitivity_db_mw) {
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

    console.log(`  [${i + 1}/${ALL_FIXES.length}] ${f.brand} ${f.name} (${entry.category}) [${f.confidence}]`);
    changes.forEach(c => console.log(c));
    console.log(`    src: ${f.source}`);

    if (EXECUTE) {
      const { error: updateErr } = await supabase
        .from('components')
        .update(updates)
        .eq('id', entry.id);

      if (updateErr) {
        console.log(`    ERROR: ${updateErr.message}`);
        stats.errors++;
      } else {
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

  if (notFoundList.length > 0) {
    console.log(`\n  --- Not Found in DB ---`);
    notFoundList.forEach(n => console.log(`    ${n}`));
  }

  if (!EXECUTE) {
    console.log(`\n  This was a DRY RUN. To apply, run:`);
    console.log(`  node scripts/fix-sensitivity-2026-tier2.js --execute`);
  }
  console.log('');
}

run().catch(console.error);
