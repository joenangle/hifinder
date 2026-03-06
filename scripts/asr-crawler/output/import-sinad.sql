-- ASR SINAD Import - 2026-03-05
-- Every value extracted via OCR from ASR measurement dashboard images.
-- Only exact DB matches included. Mismatched models (V281 vs V280, Bifrost vs Bifrost 2, etc.) excluded.
-- SINAD = best channel value, rounded to 1 decimal.

-- DACs (exact matches)
UPDATE components SET asr_sinad = 123.4, asr_review_url = 'https://www.audiosciencereview.com/forum/index.php?threads/topping-d90se-review-balanced-dac.24235/' WHERE brand = 'Topping' AND name = 'D90SE' AND category = 'dac' AND asr_sinad IS NULL;

UPDATE components SET asr_sinad = 123.9, asr_review_url = 'https://www.audiosciencereview.com/forum/index.php?threads/topping-d90-iii-sabre-dac-review.51493/' WHERE brand = 'Topping' AND name = 'D90 III Sabre' AND category = 'dac' AND asr_sinad IS NULL;

UPDATE components SET asr_sinad = 104.5, asr_review_url = 'https://www.audiosciencereview.com/forum/index.php?threads/denafrips-ares-ii-usb-r2r-dac-review.11166/' WHERE brand = 'Denafrips' AND name = 'Ares II' AND category = 'dac' AND asr_sinad IS NULL;

UPDATE components SET asr_sinad = 122.4, asr_review_url = 'https://www.audiosciencereview.com/forum/index.php?threads/gustard-x18-review-stereo-dac.28988/' WHERE brand = 'Gustard' AND name = 'X18' AND category = 'dac' AND asr_sinad IS NULL;

UPDATE components SET asr_sinad = 121.1, asr_review_url = 'https://www.audiosciencereview.com/forum/index.php?threads/loxjie-d50-review-stereo-dac.19528/' WHERE brand = 'Loxjie' AND name = 'D50' AND category = 'dac' AND asr_sinad IS NULL;

UPDATE components SET asr_sinad = 110.1, asr_review_url = 'https://www.audiosciencereview.com/forum/index.php?threads/jds-labs-atom-dac-review.14002/' WHERE brand = 'JDS Labs' AND name = 'Atom DAC 2' AND category = 'dac' AND asr_sinad IS NULL;

UPDATE components SET asr_sinad = 107.4, asr_review_url = 'https://www.audiosciencereview.com/forum/index.php?threads/weiss-dac501-streamer-and-dac-review.48377/' WHERE brand = 'Weiss' AND name = 'DAC501' AND category = 'dac' AND asr_sinad IS NULL;

-- Amps (exact matches)
UPDATE components SET asr_sinad = 103.8, asr_review_url = 'https://www.audiosciencereview.com/forum/index.php?threads/schiit-magni-3-and-heresy-headphone-amp-reviews.10311/' WHERE brand = 'Schiit' AND name = 'Magni 3+' AND category = 'amp' AND asr_sinad IS NULL;

UPDATE components SET asr_sinad = 79.6, asr_review_url = 'https://www.audiosciencereview.com/forum/index.php?threads/review-and-measurements-of-schiit-valhalla-2-headphone-amp.8357/' WHERE brand = 'Schiit' AND name = 'Valhalla 2' AND category = 'amp' AND asr_sinad IS NULL;

UPDATE components SET asr_sinad = 101.1, asr_review_url = 'https://www.audiosciencereview.com/forum/index.php?threads/rupert-neve-rnhp-headphone-amp-review.12040/' WHERE brand = 'Rupert Neve Designs' AND name = 'RNHP' AND category = 'amp' AND asr_sinad IS NULL;

UPDATE components SET asr_sinad = 99.1, asr_review_url = 'https://www.audiosciencereview.com/forum/index.php?threads/spl-phonitor-x-updated-review-dac-headphone-amp.27479/' WHERE brand = 'SPL' AND name = 'Phonitor SE' AND category = 'amp' AND asr_sinad IS NULL;

-- DAC/Amp Combos (exact matches)
UPDATE components SET asr_sinad = 122.3, asr_review_url = 'https://www.audiosciencereview.com/forum/index.php?threads/topping-dx5-review-dac-hp-amp.32179/' WHERE brand = 'Topping' AND name = 'DX5' AND category = 'dac_amp' AND asr_sinad IS NULL;

UPDATE components SET asr_sinad = 110.2, asr_review_url = 'https://www.audiosciencereview.com/forum/index.php?threads/chord-mojo-2-review-portable-dac-hp-amp.34160/' WHERE brand = 'Chord' AND name = 'Mojo 2' AND category = 'dac_amp' AND asr_sinad IS NULL;

UPDATE components SET asr_sinad = 98.0, asr_review_url = 'https://www.audiosciencereview.com/forum/index.php?threads/fiio-btr7-review-portable-dac-hp-amp.36620/' WHERE brand = 'FiiO' AND name = 'BTR7' AND category = 'dac_amp' AND asr_sinad IS NULL;

UPDATE components SET asr_sinad = 70.2, asr_review_url = 'https://www.audiosciencereview.com/forum/index.php?threads/ifi-hip-dac-review-dac-headphone-amp.25150/' WHERE brand = 'iFi' AND name = 'Hip DAC' AND category = 'dac_amp' AND asr_sinad IS NULL;

UPDATE components SET asr_sinad = 111.8, asr_review_url = 'https://www.audiosciencereview.com/forum/index.php?threads/jds-labs-element-iii-review-dac-amp.30485/' WHERE brand = 'JDS Labs' AND name = 'Element III' AND category = 'dac_amp' AND asr_sinad IS NULL;

UPDATE components SET asr_sinad = 118.0, asr_review_url = 'https://www.audiosciencereview.com/forum/index.php?threads/jds-labs-element-iv-dac-hp-amp-with-eq-review.59002/' WHERE brand = 'JDS Labs' AND name = 'Element IV' AND category = 'dac_amp' AND asr_sinad IS NULL;

UPDATE components SET asr_sinad = 62.2, asr_review_url = 'https://www.audiosciencereview.com/forum/index.php?threads/woo-audio-wa7-wa7tp-dac-and-headphone-amp-review.7028/' WHERE brand = 'Woo Audio' AND name = 'WA7 Fireflies' AND category = 'amp' AND asr_sinad IS NULL;

-- Review URL only (no SINAD - mismatched model versions, but URL still useful for reference)
-- These add the review URL but do NOT set SINAD since the exact model doesn't match.
-- Topping D70s: L7AudioLab measurement (121.7 dB) - not official ASR review
-- UPDATE components SET asr_review_url = 'https://www.audiosciencereview.com/forum/index.php?threads/measurements-of-topping-d70s-dual-4497-dac.18660/' WHERE brand = 'Topping' AND name = 'D70s' AND category = 'dac';
-- Musician Pegasus II: Review is of original Pegasus (98.4 dB)
-- Schiit Bifrost 2: Review is of original Bifrost (100.2 dB)
-- Violectric V280: Review is of V281 (100.3 dB)
-- iFi Zen DAC V3: Review is of original Zen DAC (90.1 dB)
-- Burson Soloist 3X GT: Review is of Soloist 3XP at medium gain (65.7 dB)
-- Schiit Yggdrasil: No SINAD dashboard found in review images
-- RME ADI-2 Pro FS R: Page returned no attachments
-- Mytek Brooklyn DAC+: No measurement dashboard image found
-- Hidizs S9 Pro: No measurement dashboard found
