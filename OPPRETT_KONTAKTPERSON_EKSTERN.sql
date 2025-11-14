-- Opprett tabell for eksterne kontaktpersoner
CREATE TABLE IF NOT EXISTS kontaktperson_ekstern (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  navn TEXT NOT NULL,
  firma TEXT,
  telefon TEXT,
  epost TEXT,
  ekstern_type TEXT,
  notater TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Legg til indekser for raskere søk
CREATE INDEX IF NOT EXISTS idx_kontaktperson_ekstern_navn ON kontaktperson_ekstern(navn);
CREATE INDEX IF NOT EXISTS idx_kontaktperson_ekstern_firma ON kontaktperson_ekstern(firma);
CREATE INDEX IF NOT EXISTS idx_kontaktperson_ekstern_type ON kontaktperson_ekstern(ekstern_type);

-- Legg til RLS (Row Level Security) policies
ALTER TABLE kontaktperson_ekstern ENABLE ROW LEVEL SECURITY;

-- Policy for å lese alle eksterne kontaktpersoner
CREATE POLICY "Alle kan lese eksterne kontaktpersoner"
  ON kontaktperson_ekstern
  FOR SELECT
  USING (true);

-- Policy for å opprette eksterne kontaktpersoner (kun autentiserte brukere)
CREATE POLICY "Autentiserte brukere kan opprette eksterne kontaktpersoner"
  ON kontaktperson_ekstern
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Policy for å oppdatere eksterne kontaktpersoner (kun autentiserte brukere)
CREATE POLICY "Autentiserte brukere kan oppdatere eksterne kontaktpersoner"
  ON kontaktperson_ekstern
  FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- Policy for å slette eksterne kontaktpersoner (kun autentiserte brukere)
CREATE POLICY "Autentiserte brukere kan slette eksterne kontaktpersoner"
  ON kontaktperson_ekstern
  FOR DELETE
  USING (auth.role() = 'authenticated');

-- Legg til trigger for å oppdatere updated_at automatisk
CREATE OR REPLACE FUNCTION update_kontaktperson_ekstern_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_kontaktperson_ekstern_updated_at
  BEFORE UPDATE ON kontaktperson_ekstern
  FOR EACH ROW
  EXECUTE FUNCTION update_kontaktperson_ekstern_updated_at();

-- Endre anlegg-tabellen til å bruke foreign key til kontaktperson_ekstern
-- Først, legg til ny kolonne
ALTER TABLE anlegg
ADD COLUMN IF NOT EXISTS ekstern_kontaktperson_id UUID REFERENCES kontaktperson_ekstern(id) ON DELETE SET NULL;

-- Legg til indeks
CREATE INDEX IF NOT EXISTS idx_anlegg_ekstern_kontaktperson_id ON anlegg(ekstern_kontaktperson_id);

-- Kommentarer for dokumentasjon
COMMENT ON TABLE kontaktperson_ekstern IS 'Tabell for eksterne kontaktpersoner som kan gjenbrukes på tvers av anlegg';
COMMENT ON COLUMN kontaktperson_ekstern.navn IS 'Navn på ekstern kontaktperson';
COMMENT ON COLUMN kontaktperson_ekstern.firma IS 'Firma som kontaktpersonen jobber for';
COMMENT ON COLUMN kontaktperson_ekstern.telefon IS 'Telefonnummer til kontaktpersonen';
COMMENT ON COLUMN kontaktperson_ekstern.epost IS 'E-postadresse til kontaktpersonen';
COMMENT ON COLUMN kontaktperson_ekstern.ekstern_type IS 'Type ekstern tjeneste (Sprinkler, Elektro, etc.)';
COMMENT ON COLUMN kontaktperson_ekstern.notater IS 'Interne notater om kontaktpersonen';
COMMENT ON COLUMN anlegg.ekstern_kontaktperson_id IS 'Referanse til ekstern kontaktperson fra kontaktperson_ekstern tabellen';
