-- Legg til kontroll_id kolonne i kontrollsjekkpunkter_brannalarm for å koble til anleggsdata_kontroll
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'kontrollsjekkpunkter_brannalarm' 
    AND column_name = 'kontroll_id'
  ) THEN
    ALTER TABLE kontrollsjekkpunkter_brannalarm 
    ADD COLUMN kontroll_id UUID REFERENCES anleggsdata_kontroll(id) ON DELETE CASCADE;
    
    COMMENT ON COLUMN kontrollsjekkpunkter_brannalarm.kontroll_id IS 'Referanse til spesifikk kontroll i anleggsdata_kontroll';
  END IF;
END $$;

-- Opprett indeks for kontroll_id
CREATE INDEX IF NOT EXISTS idx_kontrollsjekkpunkter_brannalarm_kontroll_id 
ON kontrollsjekkpunkter_brannalarm(kontroll_id);

-- Legg til flere kolonner som trengs for FG790 kontroll
DO $$ 
BEGIN
  -- AG-verdi kolonne
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'kontrollsjekkpunkter_brannalarm' 
    AND column_name = 'ag_verdi'
  ) THEN
    ALTER TABLE kontrollsjekkpunkter_brannalarm ADD COLUMN ag_verdi TEXT;
  END IF;

  -- Status kolonne (Kontrollert, Ikke aktuell, Ikke tilkomst)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'kontrollsjekkpunkter_brannalarm' 
    AND column_name = 'status'
  ) THEN
    ALTER TABLE kontrollsjekkpunkter_brannalarm ADD COLUMN status TEXT;
  END IF;

  -- Posisjon kolonne (POS.1, POS.2, POS.3)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'kontrollsjekkpunkter_brannalarm' 
    AND column_name = 'posisjon'
  ) THEN
    ALTER TABLE kontrollsjekkpunkter_brannalarm ADD COLUMN posisjon TEXT;
  END IF;

  -- Poeng trekk kolonne (for avvik)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'kontrollsjekkpunkter_brannalarm' 
    AND column_name = 'poeng_trekk'
  ) THEN
    ALTER TABLE kontrollsjekkpunkter_brannalarm ADD COLUMN poeng_trekk NUMERIC(5,2) DEFAULT 0;
  END IF;

  -- Antall avvik kolonne (for å kunne registrere flere avvik av samme type)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'kontrollsjekkpunkter_brannalarm' 
    AND column_name = 'antall_avvik'
  ) THEN
    ALTER TABLE kontrollsjekkpunkter_brannalarm ADD COLUMN antall_avvik INTEGER DEFAULT 1;
  END IF;
END $$;

-- Opprett indekser
CREATE INDEX IF NOT EXISTS idx_kontrollsjekkpunkter_brannalarm_anlegg_id 
ON kontrollsjekkpunkter_brannalarm(anlegg_id);

CREATE INDEX IF NOT EXISTS idx_kontrollsjekkpunkter_brannalarm_avvik_type 
ON kontrollsjekkpunkter_brannalarm(avvik_type);

CREATE INDEX IF NOT EXISTS idx_kontrollsjekkpunkter_brannalarm_posisjon 
ON kontrollsjekkpunkter_brannalarm(posisjon);

-- Aktiver Row Level Security hvis ikke allerede aktivert
ALTER TABLE kontrollsjekkpunkter_brannalarm ENABLE ROW LEVEL SECURITY;

-- Opprett policies hvis de ikke finnes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'kontrollsjekkpunkter_brannalarm' 
    AND policyname = 'Autentiserte brukere kan se FG790 kontrollpunkter'
  ) THEN
    CREATE POLICY "Autentiserte brukere kan se FG790 kontrollpunkter"
      ON kontrollsjekkpunkter_brannalarm FOR SELECT
      TO authenticated
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'kontrollsjekkpunkter_brannalarm' 
    AND policyname = 'Autentiserte brukere kan legge til FG790 kontrollpunkter'
  ) THEN
    CREATE POLICY "Autentiserte brukere kan legge til FG790 kontrollpunkter"
      ON kontrollsjekkpunkter_brannalarm FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'kontrollsjekkpunkter_brannalarm' 
    AND policyname = 'Autentiserte brukere kan oppdatere FG790 kontrollpunkter'
  ) THEN
    CREATE POLICY "Autentiserte brukere kan oppdatere FG790 kontrollpunkter"
      ON kontrollsjekkpunkter_brannalarm FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'kontrollsjekkpunkter_brannalarm' 
    AND policyname = 'Autentiserte brukere kan slette FG790 kontrollpunkter'
  ) THEN
    CREATE POLICY "Autentiserte brukere kan slette FG790 kontrollpunkter"
      ON kontrollsjekkpunkter_brannalarm FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Kommentarer
COMMENT ON TABLE kontrollsjekkpunkter_brannalarm IS 'Kontrollpunkter for FG790 kontroller';
COMMENT ON COLUMN kontrollsjekkpunkter_brannalarm.posisjon IS 'Posisjon: POS.1, POS.2, POS.3';
COMMENT ON COLUMN kontrollsjekkpunkter_brannalarm.kategori IS 'Kategori innenfor posisjonen';
COMMENT ON COLUMN kontrollsjekkpunkter_brannalarm.tittel IS 'Navn på kontrollpunktet';
COMMENT ON COLUMN kontrollsjekkpunkter_brannalarm.status IS 'Status: Kontrollert, Ikke aktuell, Ikke tilkomst';
COMMENT ON COLUMN kontrollsjekkpunkter_brannalarm.avvik_type IS 'Type avvik hvis det er registrert';
COMMENT ON COLUMN kontrollsjekkpunkter_brannalarm.feilkode IS 'Feilkode hvis relevant';
COMMENT ON COLUMN kontrollsjekkpunkter_brannalarm.ag_verdi IS 'AG-verdi for detektorer';
COMMENT ON COLUMN kontrollsjekkpunkter_brannalarm.kommentar IS 'Kommentar til kontrollpunktet';
COMMENT ON COLUMN kontrollsjekkpunkter_brannalarm.poeng_trekk IS 'Poeng trekk per avvik (støtter desimaltall)';
COMMENT ON COLUMN kontrollsjekkpunkter_brannalarm.antall_avvik IS 'Antall avvik av samme type (multipliseres med poeng_trekk)';
