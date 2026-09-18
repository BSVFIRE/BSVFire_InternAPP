-- Legg til Row Level Security policies for anlegg-tabellen og anlegg_kontaktpersoner-tabellen
-- Dette tillater autentiserte brukere å lese, opprette, oppdatere og slette anlegg og kontaktperson-koblinger

-- ============================================
-- RLS Policies for anlegg-tabellen
-- ============================================

-- Aktiver Row Level Security hvis ikke allerede aktivert
ALTER TABLE anlegg ENABLE ROW LEVEL SECURITY;

-- Policy for å lese data (alle kan lese)
CREATE POLICY "Alle kan lese anlegg" ON anlegg
  FOR SELECT USING (true);

-- Policy for å sette inn data (kun autentiserte brukere)
CREATE POLICY "Autentiserte brukere kan sette inn anlegg" ON anlegg
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy for å oppdatere data (kun autentiserte brukere)
CREATE POLICY "Autentiserte brukere kan oppdatere anlegg" ON anlegg
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy for å slette data (kun autentiserte brukere)
CREATE POLICY "Autentiserte brukere kan slette anlegg" ON anlegg
  FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================
-- RLS Policies for anlegg_kontaktpersoner-tabellen
-- ============================================

-- Aktiver Row Level Security hvis ikke allerede aktivert
ALTER TABLE anlegg_kontaktpersoner ENABLE ROW LEVEL SECURITY;

-- Policy for å lese data (alle kan lese)
CREATE POLICY "Alle kan lese anlegg_kontaktpersoner" ON anlegg_kontaktpersoner
  FOR SELECT USING (true);

-- Policy for å sette inn data (kun autentiserte brukere)
CREATE POLICY "Autentiserte brukere kan sette inn anlegg_kontaktpersoner" ON anlegg_kontaktpersoner
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy for å oppdatere data (kun autentiserte brukere)
CREATE POLICY "Autentiserte brukere kan oppdatere anlegg_kontaktpersoner" ON anlegg_kontaktpersoner
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Policy for å slette data (kun autentiserte brukere)
CREATE POLICY "Autentiserte brukere kan slette anlegg_kontaktpersoner" ON anlegg_kontaktpersoner
  FOR DELETE USING (auth.role() = 'authenticated');
