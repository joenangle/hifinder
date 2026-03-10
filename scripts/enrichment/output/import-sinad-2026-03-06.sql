-- SINAD enrichment for amplifiers — 2026-03-06
-- Source: Audio Science Review (ASR) reviews
-- Method: WebSearch + WebFetch verification

-- ============================================================
-- EXACT MATCH WITH SINAD VALUE
-- ============================================================

-- Benchmark HPA4: SINAD 119 dB (Amir's review, noise-limited)
UPDATE components SET asr_sinad = 119, asr_review_url = 'https://www.audiosciencereview.com/forum/index.php?threads/review-and-measurements-of-benchmark-hpa4-headphone-amp-pre.8141/'
WHERE brand = 'Benchmark' AND name = 'HPA4' AND category = 'amp' AND asr_sinad IS NULL;

-- ============================================================
-- EXACT MATCH — URL ONLY (SINAD in dashboard image, not in text)
-- ============================================================

-- Bottlehead Crack OTL: ASR review exists (Crack = Crack OTL, same product)
-- SINAD value is embedded in measurement dashboard image, not stated in text
UPDATE components SET asr_review_url = 'https://www.audiosciencereview.com/forum/index.php?threads/bottlehead-crack-headphone-amplifier-kit-review.15714/'
WHERE brand = 'Bottlehead' AND name = 'Crack OTL' AND category = 'amp' AND asr_review_url IS NULL;

-- iFi Pro iCAN: ASR review exists (Amir's review)
-- SINAD value not explicitly stated in review text
UPDATE components SET asr_review_url = 'https://www.audiosciencereview.com/forum/index.php?threads/ifi-pro-ican-headphone-amplifier-review.12247/'
WHERE brand = 'iFi' AND name = 'Pro iCAN' AND category = 'amp' AND asr_review_url IS NULL;

-- Grace Design m900: ASR review exists (reviewed as DAC & Amp combo)
-- SINAD value not explicitly stated in review text
UPDATE components SET asr_review_url = 'https://www.audiosciencereview.com/forum/index.php?threads/review-and-measurements-of-grace-design-m900-dac-amp.6470/'
WHERE brand = 'Grace Design' AND name = 'm900' AND category = 'amp' AND asr_review_url IS NULL;

-- HeadAmp GS-X mini: Third-party measurements (GoldenSound) posted on ASR forum
-- Not an official Amir review; SINAD value not in thread text
UPDATE components SET asr_review_url = 'https://www.audiosciencereview.com/forum/index.php?threads/headamp-gs-x-mini-headphone-amplifier-measurements.27016/'
WHERE brand = 'HeadAmp' AND name = 'GS-X mini' AND category = 'amp' AND asr_review_url IS NULL;

-- ============================================================
-- NO ASR REVIEW FOUND (skipped — no update)
-- ============================================================
-- Aune S9c Pro: No ASR review
-- Burson Soloist 3X GT: ASR reviewed Soloist 3XP (different model, version mismatch)
-- Cayin HA-300: No ASR review
-- Enleum AMP-23R: No ASR review
-- Feliks Audio Euforia: No ASR review
-- Ferrum OOR: Forum discussion only, no formal review or measurements
-- Flux Lab Volot: Teardown thread only, no formal review
-- Geshelli Archel 3: No formal review (only expo first-look thread)
-- Geshelli Erish 2: No formal review
-- HeadAmp GS-X mk2: No ASR review (only Innerfidelity measurements discussed)
