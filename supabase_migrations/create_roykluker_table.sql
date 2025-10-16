-- Opprett tabell for røykluker
CREATE TABLE IF NOT EXISTS anleggsdata_roykluker (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  anlegg_id UUID NOT NULL REFERENCES anlegg(id) ON DELETE CASCADE,
  
  -- Identifikasjon
  internnummer TEXT,
  plassering TEXT,
  etasje TEXT,
  
  -- Teknisk info
  type TEXT,  -- Type røykluke (f.eks. Elektrisk, Pneumatisk, Manuell)
  produsent TEXT,
  modell TEXT,
  produksjonsaar INTEGER,
  
  -- Kontrolldata
  sist_kontrollert DATE,
  neste_kontroll DATE,
  status TEXT[] DEFAULT '{}',  -- Array av status (OK, Avvik, Ikke funnet, etc.)
  
  -- Tilleggsinformasjon
  merknad TEXT,
  kontrollert BOOLEAN DEFAULT false,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sist_oppdatert TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indekser for raskere søk
CREATE INDEX IF NOT EXISTS idx_roykluker_anlegg_id ON anleggsdata_roykluker(anlegg_id);
CREATE INDEX IF NOT EXISTS idx_roykluker_status ON anleggsdata_roykluker USING GIN(status);
CREATE INDEX IF NOT EXISTS idx_roykluker_kontrollert ON anleggsdata_roykluker(kontrollert);

-- RLS (Row Level Security) policies
ALTER TABLE anleggsdata_roykluker ENABLE ROW LEVEL SECURITY;

-- Policy for å lese data
CREATE POLICY "Alle kan lese røykluker" ON anleggsdata_roykluker
  FOR SELECT USING (true);

-- Policy for å sette inn data (kun autentiserte brukere)
CREATE POLICY "Autentiserte brukere kan sette inn røykluker" ON anleggsdata_roykluker
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy for å oppdatere data (kun autentiserte brukere)
CREATE POLICY "Autentiserte brukere kan oppdatere røykluker" ON anleggsdata_roykluker
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy for å slette data (kun autentiserte brukere)
CREATE POLICY "Autentiserte brukere kan slette røykluker" ON anleggsdata_roykluker
  FOR DELETE USING (auth.role() = 'authenticated');

-- Trigger for å oppdatere sist_oppdatert automatisk
CREATE OR REPLACE FUNCTION update_roykluker_sist_oppdatert()
RETURNS TRIGGER AS $$
BEGIN
  NEW.sist_oppdatert = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_roykluker_sist_oppdatert
  BEFORE UPDATE ON anleggsdata_roykluker
  FOR EACH ROW
  EXECUTE FUNCTION update_roykluker_sist_oppdatert();

-- Kommentar på tabellen
COMMENT ON TABLE anleggsdata_roykluker IS 'Tabell for registrering og kontroll av røykluker';
