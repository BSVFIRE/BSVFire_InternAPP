-- Legg til RLS policies for anleggsdata_kontroll tabellen
-- Dette tillater autentiserte brukere å slette og oppdatere kontroller

-- Aktiver Row Level Security hvis ikke allerede aktivert
ALTER TABLE anleggsdata_kontroll ENABLE ROW LEVEL SECURITY;

-- Opprett policies hvis de ikke finnes

-- SELECT policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'anleggsdata_kontroll' 
    AND policyname = 'Autentiserte brukere kan se kontroller'
  ) THEN
    CREATE POLICY "Autentiserte brukere kan se kontroller"
      ON anleggsdata_kontroll FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

-- INSERT policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'anleggsdata_kontroll' 
    AND policyname = 'Autentiserte brukere kan opprette kontroller'
  ) THEN
    CREATE POLICY "Autentiserte brukere kan opprette kontroller"
      ON anleggsdata_kontroll FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- UPDATE policy
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'anleggsdata_kontroll' 
    AND policyname = 'Autentiserte brukere kan oppdatere kontroller'
  ) THEN
    CREATE POLICY "Autentiserte brukere kan oppdatere kontroller"
      ON anleggsdata_kontroll FOR UPDATE
      TO authenticated
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- DELETE policy (VIKTIG!)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'anleggsdata_kontroll' 
    AND policyname = 'Autentiserte brukere kan slette kontroller'
  ) THEN
    CREATE POLICY "Autentiserte brukere kan slette kontroller"
      ON anleggsdata_kontroll FOR DELETE
      TO authenticated
      USING (true);
  END IF;
END $$;

-- Bekreft at policies er opprettet
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'anleggsdata_kontroll'
ORDER BY cmd;
