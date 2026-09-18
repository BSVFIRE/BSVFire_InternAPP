-- ✅ TABELLER EKSISTERER ALLEREDE I DATABASEN
-- Denne filen er kun for dokumentasjon

-- anleggsdata_kontroll tabellen eksisterer allerede med følgende kolonner:
-- id, anlegg_id, kontrollor_id, dato, neste_kontroll, merknader, status, 
-- har_feil, har_utkoblinger, kontroll_status, rapport_type, osv.

-- Sjekk om kontroll_status kolonnen eksisterer, hvis ikke legg den til
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'anleggsdata_kontroll' 
    AND column_name = 'kontroll_status'
  ) THEN
    ALTER TABLE anleggsdata_kontroll ADD COLUMN kontroll_status TEXT DEFAULT 'utkast';
  END IF;
END $$;

-- Sjekk om rapport_type kolonnen eksisterer, hvis ikke legg den til
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'anleggsdata_kontroll' 
    AND column_name = 'rapport_type'
  ) THEN
    ALTER TABLE anleggsdata_kontroll ADD COLUMN rapport_type TEXT;
  END IF;
END $$;

-- Opprett indekser hvis de ikke finnes
CREATE INDEX IF NOT EXISTS idx_anleggsdata_kontroll_kontroll_status ON anleggsdata_kontroll(kontroll_status);
CREATE INDEX IF NOT EXISTS idx_anleggsdata_kontroll_rapport_type ON anleggsdata_kontroll(rapport_type);

-- Legg til kontroll_id kolonne i ns3960_kontrollpunkter hvis den ikke finnes
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ns3960_kontrollpunkter' 
    AND column_name = 'kontroll_id'
  ) THEN
    ALTER TABLE ns3960_kontrollpunkter ADD COLUMN kontroll_id UUID REFERENCES anleggsdata_kontroll(id) ON DELETE CASCADE;
    COMMENT ON COLUMN ns3960_kontrollpunkter.kontroll_id IS 'Referanse til spesifikk kontroll i anleggsdata_kontroll';
  END IF;
END $$;

-- Opprett indekser for ns3960_kontrollpunkter
CREATE INDEX IF NOT EXISTS idx_ns3960_kontrollpunkter_kontroll_id ON ns3960_kontrollpunkter(kontroll_id);
CREATE INDEX IF NOT EXISTS idx_ns3960_kontrollpunkter_anlegg_id ON ns3960_kontrollpunkter(anlegg_id);
CREATE INDEX IF NOT EXISTS idx_ns3960_kontrollpunkter_avvik ON ns3960_kontrollpunkter(avvik);

-- Aktiver Row Level Security for ns3960_kontrollpunkter
ALTER TABLE ns3960_kontrollpunkter ENABLE ROW LEVEL SECURITY;

-- Opprett policies for ns3960_kontrollpunkter
CREATE POLICY "Autentiserte brukere kan se NS3960 kontrollpunkter"
  ON ns3960_kontrollpunkter FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Autentiserte brukere kan legge til NS3960 kontrollpunkter"
  ON ns3960_kontrollpunkter FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Autentiserte brukere kan oppdatere NS3960 kontrollpunkter"
  ON ns3960_kontrollpunkter FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Autentiserte brukere kan slette NS3960 kontrollpunkter"
  ON ns3960_kontrollpunkter FOR DELETE
  TO authenticated
  USING (true);

-- Kommentarer
COMMENT ON TABLE anleggsdata_kontroll IS 'Lagrer kontroller (FG790 og NS3960) per anlegg';
COMMENT ON COLUMN anleggsdata_kontroll.kontroll_status IS 'Status: utkast, ferdig, sendt';
COMMENT ON COLUMN anleggsdata_kontroll.rapport_type IS 'Type kontroll: FG790 eller NS3960';
COMMENT ON COLUMN anleggsdata_kontroll.har_feil IS 'Om kontrollen har registrert feil/avvik';
COMMENT ON COLUMN anleggsdata_kontroll.har_utkoblinger IS 'Om kontrollen har registrert utkoblinger';

COMMENT ON TABLE ns3960_kontrollpunkter IS 'Kontrollpunkter for NS3960 kontroller';
COMMENT ON COLUMN ns3960_kontrollpunkter.kontrollpunkt_navn IS 'Navn på kontrollpunktet';
COMMENT ON COLUMN ns3960_kontrollpunkter.status IS 'Status: Kontrollert, Ikke aktuell, Ikke tilkomst';
COMMENT ON COLUMN ns3960_kontrollpunkter.avvik IS 'Om det er registrert avvik på dette punktet';
