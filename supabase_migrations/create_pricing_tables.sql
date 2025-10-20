-- Drop existing tables if they exist
DROP TABLE IF EXISTS serviceavtale_priser CASCADE;
DROP TABLE IF EXISTS serviceavtale_tilbud_priser CASCADE;

-- Create pricing configuration table
CREATE TABLE serviceavtale_priser (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tjeneste_type TEXT NOT NULL, -- 'brannalarm', 'nodlys', 'slukkeutstyr', 'rokluker', 'eksternt'
  
  -- Minimum price
  minstepris DECIMAL(10,2) DEFAULT 0,
  
  -- Unit pricing tiers (JSON array of {min, max, price})
  enhetspriser JSONB DEFAULT '[]'::jsonb,
  
  -- Fixed prices
  rapport_pris DECIMAL(10,2) DEFAULT 0,
  sentralenhet_forste DECIMAL(10,2) DEFAULT 0,
  sentralenhet_ekstra DECIMAL(10,2) DEFAULT 0,
  
  -- For Slukkeuttsyr
  brannslukker_pris DECIMAL(10,2) DEFAULT 0,
  brannslange_pris DECIMAL(10,2) DEFAULT 0,
  
  -- For Eksternt
  paslag_prosent DECIMAL(5,2) DEFAULT 10.00,
  
  -- Metadata
  opprettet TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tjeneste_type)
);

-- Insert default pricing for Brannalarm
INSERT INTO serviceavtale_priser (
  tjeneste_type,
  minstepris,
  enhetspriser,
  rapport_pris,
  sentralenhet_forste,
  sentralenhet_ekstra
) VALUES (
  'brannalarm',
  4500.00,
  '[
    {"min": 0, "max": 50, "pris": 25},
    {"min": 51, "max": 100, "pris": 20},
    {"min": 101, "max": 200, "pris": 17},
    {"min": 201, "max": null, "pris": 12}
  ]'::jsonb,
  750.00,
  1200.00,
  600.00
);

-- Insert default pricing for Nødlys (same tier structure as Brannalarm)
INSERT INTO serviceavtale_priser (
  tjeneste_type,
  minstepris,
  enhetspriser,
  rapport_pris,
  sentralenhet_forste,
  sentralenhet_ekstra
) VALUES (
  'nodlys',
  4500.00,
  '[
    {"min": 0, "max": 50, "pris": 25},
    {"min": 51, "max": 100, "pris": 20},
    {"min": 101, "max": 200, "pris": 17},
    {"min": 201, "max": null, "pris": 12}
  ]'::jsonb,
  750.00,
  0,
  0
);

-- Insert default pricing for Slukkeuttsyr
INSERT INTO serviceavtale_priser (
  tjeneste_type,
  minstepris,
  rapport_pris,
  sentralenhet_forste,
  sentralenhet_ekstra,
  brannslukker_pris,
  brannslange_pris
) VALUES (
  'slukkeutstyr',
  0,
  750.00,
  0,
  0,
  110.00,
  175.00
);

-- Insert default pricing for Røykluker
INSERT INTO serviceavtale_priser (
  tjeneste_type,
  minstepris,
  enhetspriser,
  rapport_pris,
  sentralenhet_forste,
  sentralenhet_ekstra
) VALUES (
  'rokluker',
  0,
  '[
    {"min": 0, "max": 10, "pris": 350},
    {"min": 11, "max": 20, "pris": 300},
    {"min": 21, "max": 40, "pris": 250},
    {"min": 41, "max": null, "pris": 200}
  ]'::jsonb,
  750.00,
  950.00,
  0
);

-- Insert default pricing for Eksternt
INSERT INTO serviceavtale_priser (
  tjeneste_type,
  minstepris,
  paslag_prosent
) VALUES (
  'eksternt',
  0,
  10.00
);

-- Add columns to serviceavtale_tilbud for pricing details
ALTER TABLE serviceavtale_tilbud ADD COLUMN IF NOT EXISTS pris_detaljer JSONB DEFAULT '{}'::jsonb;
ALTER TABLE serviceavtale_tilbud ADD COLUMN IF NOT EXISTS total_pris DECIMAL(10,2) DEFAULT 0;
ALTER TABLE serviceavtale_tilbud ADD COLUMN IF NOT EXISTS rabatt_prosent DECIMAL(5,2) DEFAULT 0;

-- Create index
CREATE INDEX idx_serviceavtale_priser_tjeneste ON serviceavtale_priser(tjeneste_type);

-- Enable Row Level Security
ALTER TABLE serviceavtale_priser ENABLE ROW LEVEL SECURITY;

-- Policies for serviceavtale_priser
CREATE POLICY "Everyone can view pricing"
  ON serviceavtale_priser FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update pricing"
  ON serviceavtale_priser FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Add trigger to update timestamp
CREATE OR REPLACE FUNCTION update_serviceavtale_priser_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.sist_oppdatert = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_serviceavtale_priser_timestamp
  BEFORE UPDATE ON serviceavtale_priser
  FOR EACH ROW
  EXECUTE FUNCTION update_serviceavtale_priser_timestamp();

-- Add comment
COMMENT ON TABLE serviceavtale_priser IS 'Pricing configuration for service agreement offers';
