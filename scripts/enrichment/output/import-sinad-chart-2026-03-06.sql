-- SINAD values extracted from ASR comprehensive DAC SINAD ranking chart
-- Source: audiosciencereview.com DAC SINAD rankings (bar chart image)
-- Only includes components that match our database exactly
-- Values are approximate readings from the bar chart

BEGIN;

-- Topping D70s — bar visible in "Excellent" zone, ~120 dB
UPDATE components SET asr_sinad = 120
WHERE brand = 'Topping' AND name = 'D70s' AND category = 'dac' AND asr_sinad IS NULL;

-- SMSL DO200 Pro — visible in "Excellent" zone, ~119 dB
UPDATE components SET asr_sinad = 119
WHERE brand = 'SMSL' AND name = 'DO200 Pro' AND category = 'dac' AND asr_sinad IS NULL;

-- SMSL D-6 — visible in "Excellent" zone, ~118 dB
UPDATE components SET asr_sinad = 118
WHERE brand = 'SMSL' AND name = 'D-6' AND category = 'dac' AND asr_sinad IS NULL;

-- SMSL DO300 — visible in "Excellent" zone, ~121 dB
UPDATE components SET asr_sinad = 121
WHERE brand = 'SMSL' AND name = 'DO300' AND category = 'dac' AND asr_sinad IS NULL;

-- Topping D10s — visible in "Excellent" zone, ~113 dB
UPDATE components SET asr_sinad = 113
WHERE brand = 'Topping' AND name = 'D10s' AND category = 'dac' AND asr_sinad IS NULL;

-- Topping DX3 Pro+ — visible in "Excellent" zone, ~116 dB
UPDATE components SET asr_sinad = 116
WHERE brand = 'Topping' AND name = 'DX3 Pro+' AND category = 'dac_amp' AND asr_sinad IS NULL;

-- Topping E70 Velvet — visible in "Excellent" zone, ~117 dB
UPDATE components SET asr_sinad = 117
WHERE brand = 'Topping' AND name = 'E70 Velvet' AND category = 'dac' AND asr_sinad IS NULL;

-- Gustard A18 — visible in "Excellent" zone, ~120 dB
UPDATE components SET asr_sinad = 120
WHERE brand = 'Gustard' AND name = 'A18' AND category = 'dac' AND asr_sinad IS NULL;

-- SMSL SU-9 Pro — visible in "Excellent" zone, ~117 dB
UPDATE components SET asr_sinad = 117
WHERE brand = 'SMSL' AND name = 'SU-9 Pro' AND category = 'dac' AND asr_sinad IS NULL;

-- RME ADI-2 Pro FS R — visible in "Excellent" zone, ~113 dB
UPDATE components SET asr_sinad = 113
WHERE brand = 'RME' AND name = 'ADI-2 Pro FS R' AND category = 'dac_amp' AND asr_sinad IS NULL;

-- Schiit Modi 3E — visible in "Very Good" zone, ~108 dB
UPDATE components SET asr_sinad = 108
WHERE brand = 'Schiit' AND name = 'Modi 3E' AND category = 'dac' AND asr_sinad IS NULL;

-- Schiit Bifrost 2 — visible in "Very Good" zone, ~105 dB
UPDATE components SET asr_sinad = 105
WHERE brand = 'Schiit' AND name = 'Bifrost 2' AND category = 'dac' AND asr_sinad IS NULL;

-- Schiit Yggdrasil — visible in "Very Good" zone, ~103 dB
UPDATE components SET asr_sinad = 103
WHERE brand = 'Schiit' AND name = 'Yggdrasil' AND category = 'dac' AND asr_sinad IS NULL;

-- Schiit Gungnir — visible near "Very Good"/"Fair" boundary, ~100 dB
UPDATE components SET asr_sinad = 100
WHERE brand = 'Schiit' AND name = 'Gungnir' AND category = 'dac' AND asr_sinad IS NULL;

-- Chord Qutest — visible in "Excellent" zone, ~115 dB
UPDATE components SET asr_sinad = 115
WHERE brand = 'Chord Electronics' AND name = 'Qutest' AND category = 'dac' AND asr_sinad IS NULL;

-- Chord Hugo 2 — visible in "Very Good" zone, ~110 dB
UPDATE components SET asr_sinad = 110
WHERE brand = 'Chord Electronics' AND name = 'Hugo 2' AND category = 'dac' AND asr_sinad IS NULL;

-- Chord DAVE — visible in "Excellent" zone, ~117 dB
UPDATE components SET asr_sinad = 117
WHERE brand = 'Chord Electronics' AND name = 'DAVE' AND category = 'dac' AND asr_sinad IS NULL;

-- Denafrips Pontus II — visible near "Very Good"/"Fair" boundary, ~98 dB
UPDATE components SET asr_sinad = 98
WHERE brand = 'Denafrips' AND name = 'Pontus II' AND category = 'dac' AND asr_sinad IS NULL;

-- Denafrips Venus II — visible in "Very Good" zone, ~104 dB
UPDATE components SET asr_sinad = 104
WHERE brand = 'Denafrips' AND name = 'Venus II' AND category = 'dac' AND asr_sinad IS NULL;

-- Denafrips Terminator II — visible in "Very Good" zone, ~107 dB
UPDATE components SET asr_sinad = 107
WHERE brand = 'Denafrips' AND name = 'Terminator II' AND category = 'dac' AND asr_sinad IS NULL;

-- Audio-GD R2R-11 — visible in "Fair" zone, ~85 dB
UPDATE components SET asr_sinad = 85
WHERE brand = 'Audio-GD' AND name = 'R2R-11' AND category = 'dac' AND asr_sinad IS NULL;

-- Musician Pegasus II — visible near "Fair" zone, ~92 dB
UPDATE components SET asr_sinad = 92
WHERE brand = 'Musician' AND name = 'Pegasus II' AND category = 'dac' AND asr_sinad IS NULL;

-- Holo Audio May KTE — visible in "Very Good" zone, ~106 dB
UPDATE components SET asr_sinad = 106
WHERE brand = 'Holo Audio' AND name = 'May KTE' AND category = 'dac' AND asr_sinad IS NULL;

-- Loxjie D40 Pro — visible in "Excellent" zone, ~116 dB
UPDATE components SET asr_sinad = 116
WHERE brand = 'Loxjie' AND name = 'D40 Pro' AND category = 'dac_amp' AND asr_sinad IS NULL;

-- FiiO K5 Pro ESS — visible in "Excellent" zone, ~114 dB
UPDATE components SET asr_sinad = 114
WHERE brand = 'FiiO' AND name = 'K5 Pro ESS' AND category = 'dac_amp' AND asr_sinad IS NULL;

-- iFi NEO iDSD — visible in "Very Good" zone, ~108 dB
UPDATE components SET asr_sinad = 108
WHERE brand = 'iFi' AND name = 'NEO iDSD' AND category = 'dac' AND asr_sinad IS NULL;

-- iFi Zen DAC 3 — visible in "Very Good" zone, ~110 dB
UPDATE components SET asr_sinad = 110
WHERE brand = 'iFi' AND name = 'Zen DAC 3' AND category = 'dac' AND asr_sinad IS NULL;

-- T+A DAC 200 — visible in "Excellent" zone, ~118 dB
UPDATE components SET asr_sinad = 118
WHERE brand = 'T+A' AND name = 'DAC 200' AND category = 'dac' AND asr_sinad IS NULL;

-- Mytek Brooklyn DAC+ — visible in "Excellent" zone, ~113 dB
UPDATE components SET asr_sinad = 113
WHERE brand = 'Mytek' AND name = 'Brooklyn DAC+' AND category = 'dac' AND asr_sinad IS NULL;

COMMIT;
