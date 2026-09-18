-- Fix Row Level Security policies for anlegg-tabellen og anlegg_kontaktpersoner-tabellen
-- Problemet var at auth.role() = 'authenticated' ikke fungerer som forventet
-- Vi må bruke auth.uid() IS NOT NULL for å sjekke om brukeren er autentisert

-- ============================================
-- Drop existing policies if they exist
-- ============================================

DROP POLICY IF EXISTS "Alle kan lese anlegg" ON anlegg;
DROP POLICY IF EXISTS "Autentiserte brukere kan sette inn anlegg" ON anlegg;
DROP POLICY IF EXISTS "Autentiserte brukere kan oppdatere anlegg" ON anlegg;
DROP POLICY IF EXISTS "Autentiserte brukere kan slette anlegg" ON anlegg;

DROP POLICY IF EXISTS "Alle kan lese anlegg_kontaktpersoner" ON anlegg_kontaktpersoner;
DROP POLICY IF EXISTS "Autentiserte brukere kan sette inn anlegg_kontaktpersoner" ON anlegg_kontaktpersoner;
DROP POLICY IF EXISTS "Autentiserte brukere kan oppdatere anlegg_kontaktpersoner" ON anlegg_kontaktpersoner;
DROP POLICY IF EXISTS "Autentiserte brukere kan slette anlegg_kontaktpersoner" ON anlegg_kontaktpersoner;

-- ============================================
-- RLS Policies for anlegg-tabellen
-- ============================================

-- Aktiver Row Level Security
ALTER TABLE anlegg ENABLE ROW LEVEL SECURITY;

-- Policy for å lese data (alle kan lese)
CREATE POLICY "Alle kan lese anlegg" ON anlegg
  FOR SELECT USING (true);

-- Policy for å sette inn data (kun autentiserte brukere)
CREATE POLICY "Autentiserte brukere kan sette inn anlegg" ON anlegg
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Policy for å oppdatere data (kun autentiserte brukere)
CREATE POLICY "Autentiserte brukere kan oppdatere anlegg" ON anlegg
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Policy for å slette data (kun autentiserte brukere)
CREATE POLICY "Autentiserte brukere kan slette anlegg" ON anlegg
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================
-- RLS Policies for anlegg_kontaktpersoner-tabellen
-- ============================================

-- Aktiver Row Level Security
ALTER TABLE anlegg_kontaktpersoner ENABLE ROW LEVEL SECURITY;

-- Policy for å lese data (alle kan lese)
CREATE POLICY "Alle kan lese anlegg_kontaktpersoner" ON anlegg_kontaktpersoner
  FOR SELECT USING (true);

-- Policy for å sette inn data (kun autentiserte brukere)
CREATE POLICY "Autentiserte brukere kan sette inn anlegg_kontaktpersoner" ON anlegg_kontaktpersoner
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Policy for å oppdatere data (kun autentiserte brukere)
CREATE POLICY "Autentiserte brukere kan oppdatere anlegg_kontaktpersoner" ON anlegg_kontaktpersoner
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- Policy for å slette data (kun autentiserte brukere)
CREATE POLICY "Autentiserte brukere kan slette anlegg_kontaktpersoner" ON anlegg_kontaktpersoner
  FOR DELETE USING (auth.uid() IS NOT NULL);
