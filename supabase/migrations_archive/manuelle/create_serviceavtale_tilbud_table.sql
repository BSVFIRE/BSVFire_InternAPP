-- Drop existing table if it exists (to ensure clean migration)
DROP TABLE IF EXISTS serviceavtale_tilbud CASCADE;

-- Create table for service agreement offers (Tilbud Serviceavtale)
CREATE TABLE serviceavtale_tilbud (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Customer and facility information
  kunde_id UUID,
  kunde_navn TEXT NOT NULL,
  kunde_organisasjonsnummer TEXT,
  anlegg_id UUID,
  anlegg_navn TEXT,
  
  -- Contact person
  kontaktperson_id UUID,
  kontaktperson_navn TEXT,
  kontaktperson_epost TEXT,
  kontaktperson_telefon TEXT,
  
  -- Services included in the offer
  tjeneste_brannalarm BOOLEAN DEFAULT false,
  tjeneste_nodlys BOOLEAN DEFAULT false,
  tjeneste_slukkeutstyr BOOLEAN DEFAULT false,
  tjeneste_rokluker BOOLEAN DEFAULT false,
  tjeneste_eksternt BOOLEAN DEFAULT false,
  
  -- Offer details
  tilbud_nummer TEXT,
  beskrivelse TEXT,
  notater TEXT,
  status TEXT DEFAULT 'utkast', -- utkast, sendt, godkjent, avvist
  
  -- Timestamps
  opprettet TIMESTAMPTZ DEFAULT NOW(),
  sist_oppdatert TIMESTAMPTZ,
  sendt_dato TIMESTAMPTZ,
  
  -- Created by user
  opprettet_av UUID
);

-- Add foreign key constraints (wrapped in DO block with exception handling)
DO $$ 
BEGIN
  -- Try to add foreign key to customer
  BEGIN
    ALTER TABLE serviceavtale_tilbud 
    ADD CONSTRAINT fk_serviceavtale_tilbud_kunde 
    FOREIGN KEY (kunde_id) REFERENCES customer(id) ON DELETE CASCADE;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not add customer foreign key: %', SQLERRM;
  END;

  -- Try to add foreign key to anlegg
  BEGIN
    ALTER TABLE serviceavtale_tilbud 
    ADD CONSTRAINT fk_serviceavtale_tilbud_anlegg 
    FOREIGN KEY (anlegg_id) REFERENCES anlegg(id) ON DELETE SET NULL;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not add anlegg foreign key: %', SQLERRM;
  END;

  -- Try to add foreign key to kontaktpersoner
  BEGIN
    ALTER TABLE serviceavtale_tilbud 
    ADD CONSTRAINT fk_serviceavtale_tilbud_kontaktperson 
    FOREIGN KEY (kontaktperson_id) REFERENCES kontaktpersoner(id) ON DELETE SET NULL;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not add kontaktperson foreign key: %', SQLERRM;
  END;

  -- Try to add foreign key to auth.users
  BEGIN
    ALTER TABLE serviceavtale_tilbud 
    ADD CONSTRAINT fk_serviceavtale_tilbud_opprettet_av 
    FOREIGN KEY (opprettet_av) REFERENCES auth.users(id) ON DELETE SET NULL;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Could not add auth.users foreign key: %', SQLERRM;
  END;
END $$;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_serviceavtale_tilbud_kunde ON serviceavtale_tilbud(kunde_id);
CREATE INDEX IF NOT EXISTS idx_serviceavtale_tilbud_anlegg ON serviceavtale_tilbud(anlegg_id);
CREATE INDEX IF NOT EXISTS idx_serviceavtale_tilbud_kontaktperson ON serviceavtale_tilbud(kontaktperson_id);
CREATE INDEX IF NOT EXISTS idx_serviceavtale_tilbud_status ON serviceavtale_tilbud(status);
CREATE INDEX IF NOT EXISTS idx_serviceavtale_tilbud_opprettet ON serviceavtale_tilbud(opprettet DESC);

-- Enable Row Level Security
ALTER TABLE serviceavtale_tilbud ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view all serviceavtale_tilbud"
  ON serviceavtale_tilbud FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert serviceavtale_tilbud"
  ON serviceavtale_tilbud FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update serviceavtale_tilbud"
  ON serviceavtale_tilbud FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can delete serviceavtale_tilbud"
  ON serviceavtale_tilbud FOR DELETE
  TO authenticated
  USING (true);

-- Add trigger to update sist_oppdatert
CREATE OR REPLACE FUNCTION update_serviceavtale_tilbud_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.sist_oppdatert = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_serviceavtale_tilbud_timestamp
  BEFORE UPDATE ON serviceavtale_tilbud
  FOR EACH ROW
  EXECUTE FUNCTION update_serviceavtale_tilbud_timestamp();

-- Add comment
COMMENT ON TABLE serviceavtale_tilbud IS 'Stores service agreement offers (Tilbud Serviceavtale) with customer, facility, and service selections';
