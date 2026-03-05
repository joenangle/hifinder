-- Curated audio systems for landing page showcase
-- Pre-built system recommendations at various price points

CREATE TABLE curated_systems (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(10) NOT NULL,
  budget_tier INTEGER NOT NULL,
  component_ids UUID[] NOT NULL,
  rationale TEXT NOT NULL,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (category IN ('iems', 'cans')),
  CHECK (budget_tier IN (100, 250, 500, 1000))
);

CREATE INDEX idx_curated_systems_active ON curated_systems (is_active, category, display_order);

ALTER TABLE curated_systems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active curated systems"
  ON curated_systems FOR SELECT
  USING (is_active = true);

CREATE TRIGGER update_curated_systems_updated_at
  BEFORE UPDATE ON curated_systems
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE curated_systems IS 'Pre-built audio system recommendations shown on landing page';

-- Seed data: 4 over-ear systems + 4 IEM systems

-- Over-ear: $100 — Budget Desktop Starter
INSERT INTO curated_systems (name, description, category, budget_tier, component_ids, rationale, display_order)
VALUES (
  'Budget Desktop Starter',
  'Legendary bang-for-buck with a proper desktop setup',
  'cans', 100,
  ARRAY[
    'aac356c1-7efe-4e4b-aa68-78dbbf7ebfe5'::uuid,  -- Koss KSC75
    '71a454bc-7635-496d-8d35-6923becc86db'::uuid   -- Schiit Fulla E
  ],
  'The KSC75 punches absurdly above its price with Crinacle A tone grade. Paired with a Fulla E, you get a proper desktop setup under $100 that sounds better than most $200 setups.',
  1
);

-- Over-ear: $250 — The Sennheiser Classic
INSERT INTO curated_systems (name, description, category, budget_tier, component_ids, rationale, display_order)
VALUES (
  'The Sennheiser Classic',
  'The most recommended headphone in audiophile history',
  'cans', 250,
  ARRAY[
    '5462054f-3459-4088-97b6-5d21c1b005bb'::uuid,  -- Sennheiser HD650/HD6XX
    '5281fa68-ae02-4299-bec2-faa4ea3ffa7b'::uuid   -- Schiit Fulla 4
  ],
  'The HD6XX is the most recommended headphone in audiophile history — smooth, natural tonality with Crinacle A+ tone grade. The Fulla 4 provides clean power for the 300-ohm impedance. Iconic pairing.',
  2
);

-- Over-ear: $500 — Planar Magnetic Desktop
INSERT INTO curated_systems (name, description, category, budget_tier, component_ids, rationale, display_order)
VALUES (
  'Planar Magnetic Desktop',
  'Planar speed and detail with transparent electronics',
  'cans', 500,
  ARRAY[
    'a5179a0e-af89-408e-b95e-0ef0af45de7f'::uuid,  -- HiFiMAN Sundara
    'a51ded88-d49f-4f12-ac12-f01fc9c6c790'::uuid,  -- JDS Labs Atom DAC+
    '5bbdd531-2cd3-495c-8139-74ae2c4e1fc8'::uuid   -- JDS Labs Atom Amp+
  ],
  'The Sundara delivers planar magnetic speed and detail at a breakthrough price. The JDS Atom stack is the most transparent budget separates — SINAD 114/115 means the electronics won''t be the bottleneck.',
  3
);

-- Over-ear: $1000 — Endgame Desktop
INSERT INTO curated_systems (name, description, category, budget_tier, component_ids, rationale, display_order)
VALUES (
  'Endgame Desktop',
  'Summit-fi sound with a proven separates stack',
  'cans', 1000,
  ARRAY[
    'c1d24ce4-99e2-473c-b403-0a64efceadf0'::uuid,  -- HiFiMAN Ananda
    '0ace0ac2-4895-4481-a291-6ca68144835f'::uuid,  -- Schiit Modius
    '4f122532-f675-4046-b35b-e12bd79a00ec'::uuid   -- Schiit Asgard 3
  ],
  'The Ananda earns an S- tone grade from Crinacle — approaching summit-fi for the price of a mid-fi headphone. The Schiit Modius/Asgard stack is a proven desktop separates combo with plenty of power.',
  4
);

-- IEM: $100 — Pocket Reference
INSERT INTO curated_systems (name, description, category, budget_tier, component_ids, rationale, display_order)
VALUES (
  'Pocket Reference',
  'One of the best-tuned IEMs under $100, no amp needed',
  'iems', 100,
  ARRAY[
    'f2ff87b0-d073-4891-b5cb-566ca2f63286'::uuid,  -- Truthear HEXA
    '24e5990f-4979-43c3-9ec7-23fc239596c1'::uuid   -- Apple USB-C Dongle
  ],
  'The HEXA is one of the best-tuned IEMs under $100 — Crinacle gives it B+ rank and A+ tone. IEMs are efficient enough that the Apple dongle drives them perfectly. Plug into your phone and go.',
  1
);

-- IEM: $250 — Detail Seeker
INSERT INTO curated_systems (name, description, category, budget_tier, component_ids, rationale, display_order)
VALUES (
  'Detail Seeker',
  'Planar magnetic IEM with exceptional technical performance',
  'iems', 250,
  ARRAY[
    'c0f888d7-df19-4315-8217-cce8eff6e6d1'::uuid,  -- 7Hz Timeless
    'e01a658a-0c82-400d-9081-e3ab98babe66'::uuid   -- Moondrop Dawn Pro
  ],
  'The Timeless is a planar magnetic IEM with exceptional technical performance — Crinacle A rank. The Dawn Pro improves on the Apple dongle with better power delivery. Portable, detailed, and musical.',
  2
);

-- IEM: $500 — Tribrid Flagship
INSERT INTO curated_systems (name, description, category, budget_tier, component_ids, rationale, display_order)
VALUES (
  'Tribrid Flagship',
  'Tribrid IEM with Crinacle S tone grade, no amp needed',
  'iems', 500,
  ARRAY[
    'af7fcf30-e7e0-48db-beea-2c40c46579b8'::uuid,  -- Thieaudio Oracle
    '24e5990f-4979-43c3-9ec7-23fc239596c1'::uuid   -- Apple USB-C Dongle
  ],
  'The Oracle is a tribrid IEM (BA + dynamic + EST drivers) that earns an S tone grade from Crinacle. IEMs this efficient run beautifully from the Apple dongle — put the money where it matters.',
  3
);

-- IEM: $1000 — Summit Portable
INSERT INTO curated_systems (name, description, category, budget_tier, component_ids, rationale, display_order)
VALUES (
  'Summit Portable',
  'Summit-fi IEM with Crinacle S+ tone, portable endgame',
  'iems', 1000,
  ARRAY[
    '008f1cc8-5a5a-4f7d-8400-eddf069a8fed'::uuid,  -- Thieaudio Monarch Mk3
    '7cdedeca-89cd-4670-ba7c-4d817f7045c7'::uuid   -- Qudelix 5K
  ],
  'The Monarch Mk3 earns Crinacle''s highest tone grade (S+) and near-summit ranking (S-). The Qudelix 5K adds parametric EQ, balanced output, and Bluetooth. This is portable endgame.',
  4
);
