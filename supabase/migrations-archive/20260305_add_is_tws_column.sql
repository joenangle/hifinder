-- Add is_tws flag to distinguish TWS earbuds from wired IEMs
ALTER TABLE components ADD COLUMN IF NOT EXISTS is_tws BOOLEAN DEFAULT FALSE;

-- Flag known TWS products
UPDATE components SET is_tws = TRUE WHERE name IN (
  'SoundSport Free',
  'AirPods Pro',
  'AirPods Pro 2',
  'Galaxy Buds',
  'Galaxy Buds+',
  'Galaxy Buds Pro',
  'Galaxy Buds2 Pro',
  'LIVE 300TWS'
);
