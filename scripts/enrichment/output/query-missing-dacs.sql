SELECT brand, name, category FROM components WHERE asr_sinad IS NULL AND category IN ('dac','dac_amp') ORDER BY brand, name;
