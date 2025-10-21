-- Legg til Row Level Security policies for alle hovedtabeller
-- Dette sikrer at autentiserte brukere kan jobbe med alle tabeller

-- ============================================
-- Drop existing policies if they exist
-- ============================================

-- anlegg
DROP POLICY IF EXISTS "Alle kan lese anlegg" ON anlegg;
DROP POLICY IF EXISTS "Autentiserte brukere kan sette inn anlegg" ON anlegg;
DROP POLICY IF EXISTS "Autentiserte brukere kan oppdatere anlegg" ON anlegg;
DROP POLICY IF EXISTS "Autentiserte brukere kan slette anlegg" ON anlegg;

-- anlegg_kontaktpersoner
DROP POLICY IF EXISTS "Alle kan lese anlegg_kontaktpersoner" ON anlegg_kontaktpersoner;
DROP POLICY IF EXISTS "Autentiserte brukere kan sette inn anlegg_kontaktpersoner" ON anlegg_kontaktpersoner;
DROP POLICY IF EXISTS "Autentiserte brukere kan oppdatere anlegg_kontaktpersoner" ON anlegg_kontaktpersoner;
DROP POLICY IF EXISTS "Autentiserte brukere kan slette anlegg_kontaktpersoner" ON anlegg_kontaktpersoner;

-- customer
DROP POLICY IF EXISTS "Alle kan lese customer" ON customer;
DROP POLICY IF EXISTS "Autentiserte brukere kan sette inn customer" ON customer;
DROP POLICY IF EXISTS "Autentiserte brukere kan oppdatere customer" ON customer;
DROP POLICY IF EXISTS "Autentiserte brukere kan slette customer" ON customer;

-- kontaktpersoner
DROP POLICY IF EXISTS "Alle kan lese kontaktpersoner" ON kontaktpersoner;
DROP POLICY IF EXISTS "Autentiserte brukere kan sette inn kontaktpersoner" ON kontaktpersoner;
DROP POLICY IF EXISTS "Autentiserte brukere kan oppdatere kontaktpersoner" ON kontaktpersoner;
DROP POLICY IF EXISTS "Autentiserte brukere kan slette kontaktpersoner" ON kontaktpersoner;

-- ============================================
-- RLS Policies for anlegg
-- ============================================

ALTER TABLE anlegg ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alle kan lese anlegg" ON anlegg
  FOR SELECT USING (true);

CREATE POLICY "Autentiserte brukere kan sette inn anlegg" ON anlegg
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autentiserte brukere kan oppdatere anlegg" ON anlegg
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autentiserte brukere kan slette anlegg" ON anlegg
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================
-- RLS Policies for anlegg_kontaktpersoner
-- ============================================

ALTER TABLE anlegg_kontaktpersoner ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alle kan lese anlegg_kontaktpersoner" ON anlegg_kontaktpersoner
  FOR SELECT USING (true);

CREATE POLICY "Autentiserte brukere kan sette inn anlegg_kontaktpersoner" ON anlegg_kontaktpersoner
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autentiserte brukere kan oppdatere anlegg_kontaktpersoner" ON anlegg_kontaktpersoner
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autentiserte brukere kan slette anlegg_kontaktpersoner" ON anlegg_kontaktpersoner
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================
-- RLS Policies for customer
-- ============================================

ALTER TABLE customer ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alle kan lese customer" ON customer
  FOR SELECT USING (true);

CREATE POLICY "Autentiserte brukere kan sette inn customer" ON customer
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autentiserte brukere kan oppdatere customer" ON customer
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autentiserte brukere kan slette customer" ON customer
  FOR DELETE USING (auth.uid() IS NOT NULL);

-- ============================================
-- RLS Policies for kontaktpersoner
-- ============================================

ALTER TABLE kontaktpersoner ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alle kan lese kontaktpersoner" ON kontaktpersoner
  FOR SELECT USING (true);

CREATE POLICY "Autentiserte brukere kan sette inn kontaktpersoner" ON kontaktpersoner
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Autentiserte brukere kan oppdatere kontaktpersoner" ON kontaktpersoner
  FOR UPDATE USING (auth.uid() IS NOT NULL);

CREATE POLICY "Autentiserte brukere kan slette kontaktpersoner" ON kontaktpersoner
  FOR DELETE USING (auth.uid() IS NOT NULL);
