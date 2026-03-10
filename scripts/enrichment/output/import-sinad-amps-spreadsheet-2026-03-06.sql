-- SINAD import from ASR amplifier spreadsheet (speaker/power amps, 5W into 4 ohms)
-- Cross-referenced against 32 HiFinder amps missing SINAD values
-- Date: 2026-03-06
--
-- Source spreadsheet contains speaker/power amplifier measurements only.
-- Most headphone amps in our database do not appear in this dataset.
--
-- Matches found: 1 of 32
-- Skipped (different product): Benchmark AHB2 (113 dB) -- speaker amp, NOT the HPA4 headphone amp
-- Skipped (not in missing list): Schiit Aegir (93 dB)

-- Schiit Ragnarok 2: 78 dB SINAD
-- NOTE: This measurement is from the speaker amplifier output at 5W into 4 ohms.
-- The Ragnarok 2 is a hybrid speaker/headphone amp. Headphone output SINAD may differ
-- from this speaker-output measurement. Treat as approximate.
UPDATE components
SET asr_sinad = 78
WHERE id = '6162e8bc-dbf2-4dec-9cb3-0c188df820f6'  -- Schiit Ragnarok 2
  AND asr_sinad IS NULL;
