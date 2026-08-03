-- scripts/asr-crawler/output/import-budget-dongles.sql
--
-- Seed missing ultra-budget portable DAC/amp dongles so low-budget
-- amplification routing (resolveAmplificationStrategy → dac_amp combo) has real
-- targets, and to close the "JCally absent from the catalogue" data gap.
--
-- Every price + power_output value was verified via WebSearch on 2026-08-03
-- against manufacturer/retailer + measurement sources (URLs per row). No value
-- is written from memory. Prices are integer USD (table column is integer).
--
-- DROPPED (could not verify to discipline): "CX-Pro CX31993" — a generic chipset
-- label, not a shoppable branded model, and the same CX31993 chip as JCally JM6
-- below (which we DID verify), so it would be a non-branded near-duplicate.
-- The plain JCally JM20 (non-Max) was also dropped in favour of the current,
-- widely-sold JM20 Max whose 195mW power figure is corroborated across sources.

-- Truthear SHIO — dual CS43198; 3.5mm SE + 4.4mm balanced, 2 gain modes.
--   price $69.99 (Amazon/HeadphoneZone); balanced power ~150mW/ch @ 32Ω.
--   sources: https://www.amazon.com/Fanmusic-Truthear-SHIO-Amplifier-Single-Ended/dp/B0BRSQFYM1
--            https://primeaudio.org/truthear-shio-review/ (150mWx2/32Ω)
INSERT INTO components (brand, name, category, price_new, price_used_min, price_used_max,
                        power_output, sound_signature, needs_amp, impedance)
VALUES ('Truthear', 'SHIO', 'dac_amp', 70, 50, 65, '150mW @ 32Ω balanced', 'neutral', false, NULL)
ON CONFLICT DO NOTHING;

-- JCally JM20 Max — dual-chip CS43131 + SGM8262; 3.5mm single-ended.
--   power 195mW @ 32Ω (in the Amazon product title + HiFiGo review + Linsoul);
--   market price ~$53 (Linsoul/Amazon/AliExpress).
--   sources: https://www.amazon.com/JM20MAX-Adapter-Upgraded-Headphone-Amplifier/dp/B0GDWLWYP9
--            https://hifigo.com/blogs/review/jcally-jm20-headphone-amp-review
--            https://www.linsoul.com/products/jcally-jm20max
INSERT INTO components (brand, name, category, price_new, price_used_min, price_used_max,
                        power_output, sound_signature, needs_amp, impedance)
VALUES ('JCally', 'JM20 Max', 'dac_amp', 53, 40, 50, '195mW @ 32Ω', 'neutral', false, NULL)
ON CONFLICT DO NOTHING;

-- JCally JM6 — CX31993 single-chip DAC/amp; 3.5mm single-ended.
--   price $12.99 (HiFiGo/Linsoul); output ~28mW @ 32Ω (measured on the same-chip
--   JM6E: 28.2mW@32Ω, head-fi showcase).
--   sources: https://hifigo.com/products/jcally-jm6
--            https://www.linsoul.com/products/jcally-jm6
--            https://www.head-fi.org/showcase/jcally-jm6e-cx31993-dac.28204/ (28.2mW@32Ω)
INSERT INTO components (brand, name, category, price_new, price_used_min, price_used_max,
                        power_output, sound_signature, needs_amp, impedance)
VALUES ('JCally', 'JM6', 'dac_amp', 13, 9, 12, '28mW @ 32Ω', 'neutral', false, NULL)
ON CONFLICT DO NOTHING;
