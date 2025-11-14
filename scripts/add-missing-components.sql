-- Missing Components Identified from Phase 2 Test
-- These components appear in used listings but don't exist in database

-- Audio-Technica ATH-M60x (between M50x and M70x)
INSERT INTO components (brand, name, category, price_new, price_used_min, price_used_max, sound_signature, driver_type, impedance, needs_amp)
VALUES (
  'Audio Technica',
  'ATH-M60x',
  'headphones',
  239, -- MSRP
  150, -- Estimated used min (63% of MSRP)
  190, -- Estimated used max (79% of MSRP)
  'neutral',
  'dynamic',
  38, -- 38 ohms
  false
)
ON CONFLICT (brand, name) DO NOTHING;

-- SMSL RAW-MDA 1 (DAC)
INSERT INTO components (brand, name, category, price_new, price_used_min, price_used_max, sound_signature)
VALUES (
  'SMSL',
  'RAW-MDA 1',
  'dac',
  199, -- MSRP
  135, -- Estimated used min
  165, -- Estimated used max
  'neutral'
)
ON CONFLICT (brand, name) DO NOTHING;

-- qdc Anole VX (High-end IEM)
INSERT INTO components (brand, name, category, price_new, price_used_min, price_used_max, sound_signature, driver_type, impedance, needs_amp)
VALUES (
  'qdc',
  'Anole VX',
  'iems',
  1899, -- MSRP
  1200, -- Estimated used min (63%)
  1500, -- Estimated used max (79%)
  'neutral',
  'hybrid',
  18, -- 18 ohms
  false
)
ON CONFLICT (brand, name) DO NOTHING;

-- Thieaudio Ghost (IEM)
INSERT INTO components (brand, name, category, price_new, price_used_min, price_used_max, sound_signature, driver_type, impedance, needs_amp)
VALUES (
  'Thieaudio',
  'Ghost',
  'iems',
  149, -- MSRP
  95, -- Estimated used min
  120, -- Estimated used max
  'neutral',
  'planar',
  14.8, -- 14.8 ohms
  false
)
ON CONFLICT (brand, name) DO NOTHING;

-- AKG K240 MKII (variant of K240 Studio - add as separate component)
INSERT INTO components (brand, name, category, price_new, price_used_min, price_used_max, sound_signature, driver_type, impedance, needs_amp)
VALUES (
  'AKG',
  'K240 MKII',
  'headphones',
  69, -- MSRP
  40, -- Estimated used min
  55, -- Estimated used max
  'neutral',
  'dynamic',
  55, -- 55 ohms
  false
)
ON CONFLICT (brand, name) DO NOTHING;

-- 64 Audio U4S (Custom IEM variant)
INSERT INTO components (brand, name, category, price_new, price_used_min, price_used_max, sound_signature, driver_type, impedance, needs_amp)
VALUES (
  '64 Audio',
  'U4S',
  'iems',
  899, -- MSRP
  550, -- Estimated used min
  700, -- Estimated used max
  'warm',
  'balanced armature',
  12.5, -- 12.5 ohms
  false
)
ON CONFLICT (brand, name) DO NOTHING;

-- Abyss Diana V2 (High-end planar)
INSERT INTO components (brand, name, category, price_new, price_used_min, price_used_max, sound_signature, driver_type, impedance, needs_amp)
VALUES (
  'Abyss',
  'Diana V2',
  'headphones',
  3195, -- MSRP
  2000, -- Estimated used min
  2500, -- Estimated used max
  'neutral',
  'planar magnetic',
  42, -- 42 ohms
  true -- High-end planars typically need good amplification
)
ON CONFLICT (brand, name) DO NOTHING;

-- MuseHiFi M5 Ultra (DAP/DAC)
INSERT INTO components (brand, name, category, price_new, price_used_min, price_used_max, sound_signature)
VALUES (
  'MuseHiFi',
  'M5 Ultra',
  'dac',
  379, -- MSRP
  240, -- Estimated used min
  300, -- Estimated used max
  'neutral'
)
ON CONFLICT (brand, name) DO NOTHING;

-- FiiO M11 Plus ESS (DAP)
INSERT INTO components (brand, name, category, price_new, price_used_min, price_used_max, sound_signature)
VALUES (
  'FiiO',
  'M11 Plus ESS',
  'dac',
  699, -- MSRP
  420, -- Estimated used min
  550, -- Estimated used max
  'neutral'
)
ON CONFLICT (brand, name) DO NOTHING;

-- Timsok TS-316 (IEM)
INSERT INTO components (brand, name, category, price_new, price_used_min, price_used_max, sound_signature, driver_type, impedance, needs_amp)
VALUES (
  'Timsok',
  'TS-316',
  'iems',
  49, -- MSRP
  30, -- Estimated used min
  40, -- Estimated used max
  'warm',
  'dynamic',
  16, -- 16 ohms
  false
)
ON CONFLICT (brand, name) DO NOTHING;

-- Add variation mappings to existing components
-- Note: Many variants (MKII, blanc, v2, etc.) are now handled by MODEL_VARIATIONS dictionary in matcher

-- Log results
SELECT 'Added missing components. Verify counts:' as message;
SELECT category, COUNT(*) as count
FROM components
WHERE brand IN ('Audio Technica', 'SMSL', 'qdc', 'Thieaudio', 'AKG', '64 Audio', 'Abyss', 'MuseHiFi', 'FiiO', 'Timsok')
GROUP BY category
ORDER BY category;
